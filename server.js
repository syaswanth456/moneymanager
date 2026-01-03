require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const signup = require('./api/signup');
const login = require('./api/login');

const app = express();

/* ================================
   SECURITY (CSP FIXED FOR SUPABASE)
   ================================ */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        /* Allow Supabase JS from CDN */
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // needed for inline script in login.html
          "https://cdn.jsdelivr.net"
        ],

        /* Styles (inline + Google Fonts) */
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],

        /* Fonts */
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],

        /* API calls */
        connectSrc: [
          "'self'",
          "https://*.supabase.co"
        ],

        /* Images (Google avatars, icons) */
        imgSrc: [
          "'self'",
          "data:",
          "https://*.googleusercontent.com"
        ],

        /* OAuth redirects */
        frameSrc: [
          "https://accounts.google.com"
        ]
      }
    }
  })
);

/* ================================
   MIDDLEWARE
   ================================ */
app.use(cors({
  origin: true,       // 🔒 lock this to your domain later
  credentials: true
}));

app.use(bodyParser.json());

/* ================================
   STATIC FRONTEND
   ================================ */
app.use(express.static(path.join(__dirname, 'public')));

/* ================================
   API ROUTES
   ================================ */
app.use('/api/signup', signup);
app.use('/api/login', login);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* ================================
   SPA FALLBACK
   ================================ */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

/* ================================
   START SERVER
   ================================ */
const PORT = process.env.PORT || 8787;

app.listen(PORT, () => {
  console.log(`✅ FinFlow running on port ${PORT}`);
});
