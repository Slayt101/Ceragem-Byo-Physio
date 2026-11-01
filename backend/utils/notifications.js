/* Email alerts for new bookings and messages.
   Two ways to send (the first one that is set up is used):
     1. Resend (RESEND_API_KEY). Sends over HTTPS, so it works on Render's free plan.
     2. SMTP (SMTP_HOST). Works locally or on a paid host. Render's free plan blocks SMTP ports.
   With neither set, alerts are only written to the log.
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

async function sendWithResend(mail) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json",
      "User-Agent": "ceragem-physio/1.0",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Ceragem Physio <onboarding@resend.dev>",
      to: Array.isArray(mail.to) ? mail.to : [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      reply_to: mail.replyTo || undefined,
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
}

async function send(mail) {
  try {
    if (process.env.RESEND_API_KEY) {
      await sendWithResend(mail);
      console.log("[notify] Email sent via Resend to", mail.to);
      return true;
    }
    const t = getTransporter();
    if (!t) {
      console.log("[notify] Email is OFF (no RESEND_API_KEY or SMTP_HOST). Skipped:", mail.subject);
      return false;
    }
    await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, ...mail });
    console.log("[notify] Email sent via SMTP to", mail.to);
    return true;
  } catch (err) {
    console.error("[notify] Email FAILED:", err.message);
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
