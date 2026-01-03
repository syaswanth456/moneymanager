require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const signup = require('./api/signup');
const login = require('./api/login');
const googleComplete = require('./api/auth/google/complete');

const app = express();

/* ================================
   SECURITY (CSP CONFIGURED)
   ================================ */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        connectSrc: [
          "'self'",
          "https://*.supabase.co"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://*.googleusercontent.com"
        ],
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
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());

/* ================================
   STATIC FILES
   ================================ */
app.use(express.static(path.join(__dirname, 'public')));

/* ================================
   CONFIG API (SAFE ENV EXPOSURE)
   ================================ */
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

/* ================================
   API ROUTES
   ================================ */
app.use('/api/signup', signup);
app.use('/api/login', login);
app.use('/api/auth/google/complete', googleComplete);

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
