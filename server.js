import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

/* PUBLIC CONFIG (SAFE) */
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

/* GOOGLE / EMAIL LOGIN FINALIZATION */
app.post('/api/auth/google/complete', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Missing token' });

    // 🔹 IMPORTANT:
    // This must be IDEMPOTENT
    // If user already initialized → do nothing
    // Example: create Cash / Bank accounts if not exist

    res.json({ ok: true });
  } catch (err) {
    console.error('Init error:', err);
    res.status(500).json({ message: 'Init failed' });
  }
});

// Fallback
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
