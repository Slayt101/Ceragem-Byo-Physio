# Ceragem Physio Website

A modern, responsive website for Ceragem Physio Bulawayo with booking management.

## Quick Start

### Option 1: Frontend Only (Static)

1. Open `index.html` in your browser, or
2. Use a local server:
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```

The booking form still works in this mode: it falls back to WhatsApp.

### Option 2: Full Stack (with Backend)

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```
3. Start MongoDB (local, or use MongoDB Atlas and paste its address into `MONGODB_URI`).
4. Seed the database (optional):
   ```bash
   npm run seed
   ```
5. Start the server:
   ```bash
   npm run dev    # Development with nodemon
   npm start      # Production
   ```
6. Open the website:
   - With the default settings the backend also serves the website: open http://localhost:3000
   - Or serve the root folder with any static server (the form talks to `http://localhost:3000`)
   - Or open `index.html` directly (the booking form falls back to WhatsApp if the backend is off)

## How to Use Locally

```bash
# Extract the ZIP file
unzip ceragem-physio-complete.zip
cd ceragem-physio-complete

# Frontend only
npx serve .

# Full stack
cd backend
npm install
cp .env.example .env     # edit MONGODB_URI
npm run dev
```

### Test the booking form

1. Open http://localhost:3000 (or the port shown)
2. Go to the Contact page
3. Fill out the booking form
4. Submit. It tries the API first, then falls back to WhatsApp.

You can also test the API directly:

```bash
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client","phone":"+263 77 000 0000","concern":"Back pain","preferredDate":"2026-11-10"}'
```

## Deployment

### Frontend (Netlify/Vercel)
1. Connect your repository
2. Set build directory to root (no build command needed)
3. Open `js/config.js` and set `API_BASE` to your backend address, e.g. `"https://ceragem-api.onrender.com"`
4. Deploy

### Backend (Railway/Render/Heroku)
1. Connect your repository
2. Set root directory to `backend`
3. Build command `npm install`, start command `npm start`
4. Add environment variables from `.env.example`. Set `NODE_ENV=production`, `SERVE_FRONTEND=false`, and `CORS_ORIGINS` to your website address (for example `https://www.yourdomain.com`)
5. Deploy and check `https://your-backend/api/health`

If the website and backend share one domain, leave `API_BASE` empty.

### Database (MongoDB Atlas)
1. Create a free cluster at mongodb.com/atlas
2. Create a database user
3. Whitelist your IP (or 0.0.0.0/0 for all)
4. Copy the connection string to `MONGODB_URI`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/availability?date=YYYY-MM-DD` | Check available slots |
| GET | `/api/bookings/:reference` | Get booking status (reference looks like `CP-1A2B3C`) |
| DELETE | `/api/bookings/:reference?phone=...` | Cancel booking (phone must match) |
| POST | `/api/contact` | Submit contact form |
| GET | `/api/services` | Get all services |
| GET | `/api/services?category=therapy` | Filter by category (`consultation`, `therapy`, `package`, `remedy`) |

## Customization

- **Colors:** Edit `css/style.css` `:root` variables
- **Phone/WhatsApp:** Search for `263774221490` in all files
- **Prices:** Edit `backend/config/seed.js` and re-run `npm run seed`. Only the consultation price (from $20) is set. The other services say "Quoted after consultation" until you add prices. The prices shown on `pricing.html` are plain HTML, so edit that page too.
- **Opening hours and capacity:** `OPEN_HOUR`, `CLOSE_HOUR`, `MAX_PER_SLOT` in `backend/.env`
- **Address:** Update in `contact.html` and the footer sections
- **Photos:** Put photos in `images/` and change the `src` in the HTML. Keep each under 200 KB.
- **Email alerts:** Fill in the `SMTP_` settings in `backend/.env`. Without them, bookings are still saved and logged.

## Security Features

- Helmet.js security headers (including a Content Security Policy)
- CORS protection (only addresses in `CORS_ORIGINS` may call the API)
- Rate limiting (100 requests per 15 minutes in general, 5 bookings per hour per visitor)
- Input validation and sanitization on every field
- MongoDB injection protection
- XSS protection (restricted characters on names and phone numbers, output escaped in emails)
- Booking lookups return no personal details, and cancelling needs the booking phone number
- Request size limited to 10 KB
- `.env` is never committed or served

Before going live: use a strong database password, set `NODE_ENV=production`, set `CORS_ORIGINS` to your real domain, and run `npm audit`.

## File Structure

```
ceragem-physio/
├── index.html
├── technology.html
├── remedies.html
├── pricing.html
├── contact.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   └── main.js
├── images/
│   └── [SVG files]
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── seed.js
│   ├── models/
│   │   ├── Booking.js
│   │   ├── Contact.js
│   │   └── Service.js
│   ├── routes/
│   │   ├── bookings.js
│   │   ├── contact.js
│   │   └── services.js
│   ├── middleware/
│   │   └── validation.js
│   └── utils/
│       ├── notifications.js
│       └── schedule.js
├── .gitignore
└── README.md
```

## Support

For issues or questions, contact: ceragemphysio@gmail.com
