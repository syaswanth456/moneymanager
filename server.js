const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { OAuth2Client } = require("google-auth-library");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static("public"));


/* GOOGLE LOGIN */
app.post("/auth/google", async (req, res) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: req.body.token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const p = ticket.getPayload();

    db.run(
      `INSERT OR IGNORE INTO users (id, email, name, picture)
       VALUES (?, ?, ?, ?)`,
      [p.sub, p.email, p.name, p.picture]
    );

    // Auto-create default accounts
    db.run(
      `INSERT OR IGNORE INTO accounts (user_id, name, type, balance)
       VALUES (?, 'Cash on Hand', 'cash', 0),
              (?, 'Bank Account', 'bank', 0)`,
      [p.sub, p.sub]
    );

    res.json({ userId: p.sub, name: p.name });
  } catch {
    res.status(401).json({ error: "Invalid Google Token" });
  }
});

/* WITHDRAW → CASH */
app.post("/withdraw", (req, res) => {
  const { userId, fromAccountId, amount } = req.body;

  db.serialize(() => {
    db.run(
      "UPDATE accounts SET balance = balance - ? WHERE id = ?",
      [amount, fromAccountId]
    );

    db.run(
      "UPDATE accounts SET balance = balance + ? WHERE user_id = ? AND type='cash'",
      [amount, userId]
    );

    db.run(
      "INSERT INTO cash_ledger (user_id, change, reason) VALUES (?, ?, ?)",
      [userId, amount, "Withdrawal"]
    );

    res.json({ success: true });
  });
});

/* GET ACCOUNTS */
app.get("/accounts/:userId", (req, res) => {
  db.all(
    "SELECT * FROM accounts WHERE user_id = ?",
    [req.params.userId],
    (err, rows) => res.json(rows)
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Money Manager v3 running"));
