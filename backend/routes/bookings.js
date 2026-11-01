const express = require("express");
const rateLimit = require("express-rate-limit");
const Booking = require("../models/Booking");
const { SLOTS, MAX_PER_SLOT, isOpenDay } = require("../utils/schedule");
const { notifyNewBooking } = require("../utils/notifications");
const { bookingRules, availabilityRules, referenceRules, cancelRules, handleValidation } = require("../middleware/validation");

const router = express.Router();
const ACTIVE = ["pending", "confirmed"];

// 5 new bookings per hour per visitor by default
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.BOOKING_RATE_LIMIT || "5", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many booking requests. Please try again later or book on WhatsApp." },
});
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});

const last7 = (p) => String(p).replace(/\D/g, "").slice(-7);

// POST /api/bookings  Create a booking
router.post("/", createLimiter, bookingRules, handleValidation, async (req, res, next) => {
  try {
    const { name, phone, email, concern, preferredDate, message } = req.body;
    const preferredTime = req.body.preferredTime || "any";

    // Same phone number already has an open booking that day
    const duplicate = await Booking.findOne({ phone, preferredDate, status: { $in: ACTIVE } }).lean();
    if (duplicate) {
      return res.status(409).json({ error: `You already have a booking for ${preferredDate} (reference ${duplicate.reference}). Please WhatsApp us to change it.` });
    }
    // Chosen hour is full
    if (preferredTime !== "any") {
      const taken = await Booking.countDocuments({ preferredDate, preferredTime, status: { $in: ACTIVE } });
      if (taken >= MAX_PER_SLOT) {
        return res.status(409).json({ error: "That time is fully booked. Please choose another time." });
      }
    }

    const booking = await Booking.create({ name, phone, email, concern, preferredDate, preferredTime, message });
    notifyNewBooking(booking).catch((err) => console.error("[notify]", err.message));

    res.status(201).json({
      ok: true,
      reference: booking.reference,
      message: "Your booking request has been received. We will contact you shortly to confirm.",
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/availability?date=YYYY-MM-DD  Open hours and spaces left
router.get("/availability", lookupLimiter, availabilityRules, handleValidation, async (req, res, next) => {
  try {
    const date = req.query.date;
    if (!isOpenDay(date)) return res.json({ date, open: false, slots: [] });
    const counts = await Booking.aggregate([
      { $match: { preferredDate: date, status: { $in: ACTIVE }, preferredTime: { $in: SLOTS } } },
      { $group: { _id: "$preferredTime", n: { $sum: 1 } } },
    ]);
    const used = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.json({
      date,
      open: true,
      slots: SLOTS.map((time) => ({ time, remaining: Math.max(0, MAX_PER_SLOT - (used[time] || 0)) })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:reference  Booking status (no personal details returned)
router.get("/:reference", lookupLimiter, referenceRules, handleValidation, async (req, res, next) => {
  try {
    const b = await Booking.findOne({ reference: req.params.reference })
      .select("reference status preferredDate preferredTime concern -_id").lean();
    if (!b) return res.status(404).json({ error: "Booking not found." });
    res.json(b);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/bookings/:reference?phone=...  Cancel (phone must match the booking)
router.delete("/:reference", lookupLimiter, cancelRules, handleValidation, async (req, res, next) => {
  try {
    const b = await Booking.findOne({ reference: req.params.reference });
    if (!b || last7(b.phone) !== last7(req.query.phone)) {
      return res.status(404).json({ error: "Booking not found. Check the reference and phone number." });
    }
    if (b.status === "cancelled") return res.json({ ok: true, status: "cancelled" });
    if (["completed", "no-show"].includes(b.status)) {
      return res.status(409).json({ error: "This booking can no longer be cancelled." });
    }
    b.status = "cancelled";
    await b.save();
    res.json({ ok: true, status: "cancelled" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
