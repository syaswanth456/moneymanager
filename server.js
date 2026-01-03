require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');

const signup = require('./api/signup');
const login = require('./api/login');

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(helmet());
app.use(cors({
  origin: true,          // lock this to your frontend URL later
  credentials: true
}));
app.use(bodyParser.json());

/* ---------- STATIC FRONTEND ---------- */
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- API ROUTES ---------- */
app.use('/api/signup', signup);
app.use('/api/login', login);

/* ---------- HEALTH CHECK ---------- */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* ---------- SPA FALLBACK ---------- */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

/* ---------- START ---------- */
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`✅ FinFlow API running on port ${PORT}`);
});
