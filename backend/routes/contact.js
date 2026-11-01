const express = require("express");
const rateLimit = require("express-rate-limit");
const Contact = require("../models/Contact");
const { notifyNewContact } = require("../utils/notifications");
const { contactRules, handleValidation } = require("../middleware/validation");

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please try again later or contact us on WhatsApp." },
});

// POST /api/contact  Save a message and alert the clinic
router.post("/", limiter, contactRules, handleValidation, async (req, res, next) => {
  try {
    const { name, phone, email, message } = req.body;
    const doc = await Contact.create({ name, phone, email, message });
    notifyNewContact(doc).catch((err) => console.error("[notify]", err.message));
    res.status(201).json({ ok: true, message: "Thank you. We will get back to you shortly." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
