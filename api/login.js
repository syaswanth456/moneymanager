const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;

    const response = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ email, password })
      }
    );

    const data = await response.json();
    if (!response.ok) return res.status(401).json(data);

    res.json(data);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
