/* Email alerts for new bookings and messages.
   Email is optional: with no SMTP_HOST set, alerts are only written to the log.
   Notifications never throw, so a mail problem can never lose a booking. */
const nodemailer = require("nodemailer");

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let transporter = null;
function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

// "077 422 1490" -> "263774221490" so the WhatsApp link opens the right chat
function whatsappLink(phone) {
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "263" + digits.slice(1);
  return "https://wa.me/" + digits;
}

async function send(mail) {
  const t = getTransporter();
  if (!t) {
    console.log("[notify] Email not configured. Skipped:", mail.subject);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, ...mail });
    return true;
  } catch (err) {
    console.error("[notify] Email failed:", err.message);
    return false;
  }
}

const OWNER = () => process.env.NOTIFY_EMAIL || "ceragemphysio@gmail.com";

async function notifyNewBooking(b) {
  console.log(`[booking] ${b.reference} ${b.preferredDate} ${b.preferredTime} ${b.concern}`);
  const rows = [
    ["Reference", b.reference], ["Name", b.name], ["Phone", b.phone], ["Email", b.email || "-"],
    ["Concern", b.concern], ["Date", b.preferredDate], ["Time", b.preferredTime], ["Notes", b.message || "-"],
  ];
  await send({
    to: OWNER(),
    replyTo: b.email || undefined,
    subject: `New booking ${b.reference}: ${b.name}, ${b.preferredDate}`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nWhatsApp the client: ${whatsappLink(b.phone)}`,
    html: "<table cellpadding='6'>" + rows.map(([k, v]) => `<tr><th align='left'>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("") +
      `</table><p><a href="${esc(whatsappLink(b.phone))}">WhatsApp the client</a></p>`,
  });
  if (b.email) {
    await send({
      to: b.email,
      subject: `We received your booking request (${b.reference})`,
      text: `Hello ${b.name},\n\nThank you for choosing Ceragem Physio. We received your request for ${b.preferredDate} and will contact you shortly to confirm.\n\nReference: ${b.reference}\nPhone / WhatsApp: +263 77 422 1490\n144 Fort Street, Between 13th & 14th Avenue, Bulawayo\n`,
    });
  }
}

async function notifyNewContact(c) {
  console.log(`[contact] message from ${c.name}`);
  const contact = c.phone ? `${c.phone} (${whatsappLink(c.phone)})` : c.email;
  await send({
    to: OWNER(),
    replyTo: c.email || undefined,
    subject: `New message from ${c.name}`,
    text: `Name: ${c.name}\nContact: ${contact}\n\n${c.message}`,
    html: `<p><b>${esc(c.name)}</b><br>${esc(contact)}</p><p>${esc(c.message).replace(/\n/g, "<br>")}</p>`,
  });
}

module.exports = { notifyNewBooking, notifyNewContact, whatsappLink };
