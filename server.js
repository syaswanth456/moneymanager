const express = require("express");
const { OAuth2Client } = require("google-auth-library");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

/* expose client id safely */
app.get("/config", (req, res) => {
  res.json({ googleClientId: CLIENT_ID });
});

/* verify google token */
app.post("/auth/google", async (req, res) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: req.body.token,
      audience: CLIENT_ID
    });

    const p = ticket.getPayload();

    res.json({
      id: p.sub,
      name: p.name,
      email: p.email
    });
  } catch (e) {
    res.status(401).json({ error: "Invalid Google token" });
  }
});

app.get("/health", (_, res) => res.send("OK"));

app.listen(process.env.PORT || 3000);
