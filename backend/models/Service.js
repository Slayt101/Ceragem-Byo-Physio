const mongoose = require("mongoose");

const CATEGORIES = ["consultation", "therapy", "package", "remedy"];

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, required: true, enum: CATEGORIES },
    description: { type: String, trim: true, maxlength: 400 },
    // Price in USD. Leave null when the price is quoted after consultation.
    priceUSD: { type: Number, min: 0, default: null },
    // Text shown next to the price, e.g. "from" or "Quoted after consultation"
    priceNote: { type: String, trim: true, maxlength: 80 },
    durationMinutes: { type: Number, min: 0 },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);
module.exports = Service;
module.exports.CATEGORIES = CATEGORIES;
