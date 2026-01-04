const express = require("express");
const { OAuth2Client } = require("google-auth-library");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* 🔐 Google Client */
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ✅ EXPOSE SAFE CONFIG TO FRONTEND */
app.get("/config", (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID
  });
});

/* ✅ VERIFY GOOGLE LOGIN TOKEN */
app.post("/auth/google", async (req, res) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: req.body.token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    res.json({
      userId: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    });

  } catch (err) {
    res.status(401).json({ error: "Invalid Google Token" });
  }
});

/* ✅ HEALTH CHECK */
app.get("/health", (_, res) => res.send("OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
