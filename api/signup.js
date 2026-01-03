const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email & password required' });

    /* Create user */
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) throw error;

    const userId = data.id;

    /* Seed default accounts */
    const { error: rpcError } = await supabase.rpc(
      'create_default_accounts',
      { p_user_id: userId }
    );

    if (rpcError) throw rpcError;

    res.status(201).json({
      success: true,
      userId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
