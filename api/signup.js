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

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    /* Attempt to create user */
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    /* 🔴 USER ALREADY EXISTS */
    if (error && error.message.includes('already been registered')) {
      return res.status(409).json({
        message: 'User already exists. Please sign in.'
      });
    }

    /* 🔴 OTHER SUPABASE ERRORS */
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        message: 'Failed to create user'
      });
    }

    const userId = data.id;

    /* Seed default accounts */
    const { error: rpcError } = await supabase.rpc(
      'create_default_accounts',
      { p_user_id: userId }
    );

    if (rpcError) {
      console.error('Account seeding error:', rpcError);
      return res.status(500).json({
        message: 'User created but failed to initialize accounts'
      });
    }

    return res.status(201).json({
      success: true,
      userId
    });

  } catch (err) {
    console.error('Signup crash:', err);
    return res.status(500).json({
      message: 'Unexpected server error'
    });
  }
});

module.exports = router;
