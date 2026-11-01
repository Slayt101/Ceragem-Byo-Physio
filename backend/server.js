require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const mongoose = require("mongoose");

const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1); // behind Render / Railway / Nginx
app.disable("x-powered-by");

/* ---------- security headers ---------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        frameSrc: ["https://maps.google.com", "https://www.google.com"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
  })
);

/* ---------- CORS: only your own website may call the API ---------- */
const allowed = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // same-origin, curl, server to server
      if (allowed.includes(origin)) return cb(null, true);
      if (!isProd && (origin === "null" || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) return cb(null, true);
      return cb(null, false); // no CORS headers, the browser blocks it
    },
    methods: ["GET", "POST", "DELETE"],
    maxAge: 86400,
  })
);

app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(mongoSanitize()); // strips $ and . keys that could inject Mongo operators

/* ---------- API ---------- */
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 100, skip: (req) => req.path === "/health", standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests. Please try again later." } }));

app.get("/api/health", (req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ ok: db, db, uptime: Math.round(process.uptime()) });
});
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/services", require("./routes/services"));
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

/* ---------- optional: serve the website from this same server ---------- */
const SITE = path.join(__dirname, "..");
if (process.env.SERVE_FRONTEND !== "false" && fs.existsSync(path.join(SITE, "index.html"))) {
  // Only these folders and pages are public. backend/ and .env are never served.
  ["css", "js", "images"].forEach((d) => app.use("/" + d, express.static(path.join(SITE, d), { maxAge: isProd ? "7d" : 0 })));
  ["index", "technology", "remedies", "pricing", "contact"].forEach((p) => {
    const file = path.join(SITE, p + ".html");
    app.get(p === "index" ? ["/", "/index.html"] : "/" + p + ".html", (req, res) => res.sendFile(file));
  });
}

/* ---------- errors (never leak details) ---------- */
app.use((req, res) => res.status(404).send("Page not found"));
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid request." });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request too large." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again or use WhatsApp." });
});

/* ---------- start ---------- */
async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
  const server = app.listen(PORT, () => console.log(`Ceragem Physio running on port ${PORT}`));
  const stop = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

if (require.main === module) start();
module.exports = app;
