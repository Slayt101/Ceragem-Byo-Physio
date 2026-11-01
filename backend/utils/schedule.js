/* Opening hours and date helpers. Dates are plain "YYYY-MM-DD" strings, so
   there are no time zone surprises. The clinic is in Africa/Harare (UTC+2). */
const TZ = "Africa/Harare";
const OPEN_HOUR = parseInt(process.env.OPEN_HOUR || "8", 10);
const CLOSE_HOUR = parseInt(process.env.CLOSE_HOUR || "17", 10);
const MAX_PER_SLOT = parseInt(process.env.MAX_PER_SLOT || "2", 10);

// One slot per hour, for example "08:00" ... "16:00"
const SLOTS = [];
for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
  SLOTS.push(String(h).padStart(2, "0") + ":00");
}

function todayLocal() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function isValidDateString(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}

function addDays(s, n) {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Sunday is the only closed day
function isOpenDay(s) {
  return new Date(s + "T00:00:00Z").getUTCDay() !== 0;
}

module.exports = { TZ, SLOTS, MAX_PER_SLOT, todayLocal, isValidDateString, addDays, isOpenDay };
