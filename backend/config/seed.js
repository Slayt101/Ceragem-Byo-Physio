/* Fills the database with the clinic's services.  Run:  npm run seed
   Edit the prices below, then run it again (it replaces the services list).

   priceUSD: a number, or null when the price is quoted after consultation.
   Only the consultation price is confirmed: from $20. Add the others when ready. */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Service = require("../models/Service");

const QUOTED = "Quoted after consultation";

const conditions = [
  ["back-pain", "Back pain", "Lower and upper back pain, stiffness and tension."],
  ["arthritis", "Arthritis", "Aching, swollen or stiff joints that slow you down."],
  ["joint-stiffness", "Joint stiffness", "Morning stiffness and limited movement."],
  ["poor-circulation", "Poor circulation", "Cold hands and feet, heavy or tired legs."],
  ["stress", "Stress", "Tight shoulders, tension and a busy mind."],
  ["insomnia", "Insomnia", "Trouble falling or staying asleep."],
];

const services = [
  {
    slug: "doctor-consultation",
    name: "Doctor's consultation with Dr Jeramu Mabuza Ncube",
    category: "consultation",
    description: "Talk through what is troubling you and leave with a clear plan.",
    priceUSD: 20,
    priceNote: "from",
  },
  {
    slug: "ceragem-thermal-session",
    name: "Ceragem thermal therapy session",
    category: "therapy",
    description: "Automated session of deep warmth, spine rollers and acupressure.",
    durationMinutes: 40,
    priceUSD: null,
    priceNote: QUOTED,
  },
  ...conditions.map(([slug, label, description]) => ({
    slug: `${slug}-plan`,
    name: `${label} plan`,
    category: "package",
    description: description + " Thermal sessions and herbal support.",
    priceUSD: null,
    priceNote: QUOTED,
  })),
  {
    slug: "herbal-consultation",
    name: "Herbal consultation",
    category: "remedy",
    description: "A private conversation about your health and the remedies you already use.",
    priceUSD: null,
    priceNote: QUOTED,
  },
  {
    slug: "home-remedy-kit",
    name: "Home remedy kit",
    category: "remedy",
    description: "Herbal blends with written instructions to continue your plan at home.",
    priceUSD: null,
    priceNote: "Price depends on the blend",
  },
].map((s, i) => ({ ...s, order: i }));

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set. Copy .env.example to .env first.");
  await mongoose.connect(process.env.MONGODB_URI);
  await Service.deleteMany({});
  const docs = await Service.insertMany(services);
  console.log(`Seeded ${docs.length} services.`);
}

run()
  .catch((err) => { console.error("Seed failed:", err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
