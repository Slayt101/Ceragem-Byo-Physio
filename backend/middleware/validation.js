/* Input validation. Every field is checked on the server, whatever the browser did.
   Names and phone numbers are restricted to safe characters. Free text is length
   limited and stripped of control characters. Anything shown in an email is
   HTML-escaped in utils/notifications.js. */
const { body, query, param, validationResult } = require("express-validator");
const { CONCERNS } = require("../models/Booking");
const { CATEGORIES } = require("../models/Service");
const { SLOTS, todayLocal, isValidDateString, addDays, isOpenDay } = require("../utils/schedule");

const NAME_RE = /^[\p{L}\p{M}'’ .-]{2,80}$/u;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const REFERENCE_RE = /^CP-[0-9A-F]{6}$/;

const cleanText = (v) => (typeof v === "string" ? v.replace(CONTROL_CHARS, "").trim() : v);

const name = () =>
  body("name").customSanitizer(cleanText).matches(NAME_RE)
    .withMessage("Please enter your name (letters only, 2 to 80 characters).");

const phone = (required = true) => {
  const chain = body("phone");
  if (!required) chain.optional({ values: "falsy" });
  return chain.customSanitizer(cleanText).matches(PHONE_RE)
    .custom((v) => v.replace(/\D/g, "").length >= 7 && v.replace(/\D/g, "").length <= 15)
    .withMessage("Please enter a valid phone number, for example +263 77 422 1490.");
};

const email = () =>
  body("email").optional({ values: "falsy" }).customSanitizer(cleanText).isEmail().isLength({ max: 120 })
    .withMessage("Please enter a valid email address.").bail().customSanitizer((v) => v.toLowerCase());

const bookingRules = [
  name(),
  phone(true),
  email(),
  body("concern").isIn(CONCERNS).withMessage("Please choose what is troubling you."),
  body("preferredDate").custom((v) => {
    if (!isValidDateString(v)) throw new Error("Please choose a valid date.");
    const today = todayLocal();
    if (v < today) throw new Error("Please choose today or a future date.");
    if (v > addDays(today, 180)) throw new Error("Please choose a date within the next 6 months.");
    if (!isOpenDay(v)) throw new Error("We are closed on Sundays. Please choose Monday to Saturday.");
    return true;
  }),
  body("preferredTime").optional({ values: "falsy" }).isIn(["any", ...SLOTS])
    .withMessage("Please choose a time within our opening hours."),
  body("message").optional({ values: "falsy" }).customSanitizer(cleanText).isLength({ max: 500 })
    .withMessage("Notes can be up to 500 characters."),
];

const contactRules = [
  name(),
  phone(false),
  email(),
  body("message").customSanitizer(cleanText).isLength({ min: 5, max: 1000 })
    .withMessage("Please write a message of 5 to 1000 characters."),
  body().custom((_, { req }) => {
    if (!req.body.phone && !req.body.email) throw new Error("Please give a phone number or an email so we can reply.");
    return true;
  }),
];

const availabilityRules = [
  query("date").custom((v) => {
    if (!isValidDateString(v)) throw new Error("Please give a date as YYYY-MM-DD.");
    return true;
  }),
];

const referenceRules = [
  param("reference").customSanitizer((v) => String(v).toUpperCase()).matches(REFERENCE_RE)
    .withMessage("That booking reference is not valid."),
];

const cancelRules = [
  ...referenceRules,
  query("phone").customSanitizer(cleanText).matches(PHONE_RE)
    .withMessage("Please give the phone number used for the booking."),
];

const serviceRules = [
  query("category").optional({ values: "falsy" }).isIn(CATEGORIES)
    .withMessage("Category must be one of: " + CATEGORIES.join(", ") + "."),
];

function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return res.status(400).json({ error: errors[0].message, errors });
}

module.exports = {
  bookingRules, contactRules, availabilityRules, referenceRules, cancelRules, serviceRules, handleValidation,
};
