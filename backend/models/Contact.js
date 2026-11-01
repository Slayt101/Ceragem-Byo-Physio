const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, minlength: 5, maxlength: 1000 },
    status: { type: String, enum: ["new", "replied", "closed"], default: "new" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);
