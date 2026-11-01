const crypto = require("crypto");
const mongoose = require("mongoose");

// These must match the options in the booking form on contact.html
const CONCERNS = [
  "Back pain",
  "Arthritis",
  "Joint stiffness",
  "Poor circulation",
  "Stress",
  "Insomnia",
  "Not sure, need a consultation",
];
const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no-show"];

function newReference() {
  return "CP-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, default: newReference, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    concern: { type: String, required: true, enum: CONCERNS },
    preferredDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    preferredTime: { type: String, default: "any" }, // "any" or "08:00" ... "16:00"
    message: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: STATUSES, default: "pending" },
    source: { type: String, default: "website" },
  },
  { timestamps: true }
);

bookingSchema.index({ preferredDate: 1, preferredTime: 1, status: 1 });
bookingSchema.index({ phone: 1, preferredDate: 1 });

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
module.exports.CONCERNS = CONCERNS;
module.exports.STATUSES = STATUSES;
