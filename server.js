import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* PUBLIC CONFIG */
app.get('/api/config', (_, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

/* POST-AUTH INITIALIZATION (SAFE & IDEMPOTENT) */
app.post('/api/auth/init', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    // ✅ DO NOT FAIL if user already exists
    // Example logic (pseudo):
    // if (!accountsExist(userId)) createCashAndBank(userId)

    res.json({ ok: true });
  } catch (e) {
    console.error('Auth init error:', e);
    res.status(500).json({ message: 'Initialization failed' });
  }
});

/* SPA FALLBACK */
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
