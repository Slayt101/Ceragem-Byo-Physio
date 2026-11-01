/* Where the booking form sends bookings.
   - Testing on your computer: leave this file alone. It uses http://localhost:3000
   - Website and backend on the SAME domain: leave API_BASE empty ("").
   - Backend hosted somewhere else (for example Render): put its address here,
     with no trailing slash, e.g. "https://ceragem-api.onrender.com".
   If the backend cannot be reached, the form falls back to WhatsApp automatically. */
window.CERAGEM_CONFIG = {
  API_BASE: "",
  LOCAL_API: "http://localhost:3000"
};
