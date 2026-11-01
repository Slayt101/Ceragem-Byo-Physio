const express = require("express");
const Service = require("../models/Service");
const { serviceRules, handleValidation } = require("../middleware/validation");

const router = express.Router();

// GET /api/services  or  /api/services?category=therapy
router.get("/", serviceRules, handleValidation, async (req, res, next) => {
  try {
    const filter = { active: true };
    if (req.query.category) filter.category = req.query.category;
    const services = await Service.find(filter).sort({ order: 1, name: 1 }).select("-__v -createdAt -updatedAt").lean();
    res.set("Cache-Control", "public, max-age=300");
    res.json({ count: services.length, services });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
