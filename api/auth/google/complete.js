const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Missing access token' });
    }

    // Verify token with Supabase
    const { data: { user }, error } =
      await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const userId = user.id;

    // Create default accounts if not exist (idempotent)
    await supabaseAdmin.rpc('create_default_accounts', {
      p_user_id: userId
    });

    return res.json({
      success: true,
      userId
    });

  } catch (err) {
    console.error('Google auth finalize error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
