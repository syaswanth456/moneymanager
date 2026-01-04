import express from "express";
import axios from "axios";
import session from "express-session";

const app = express();
app.use(express.static("public"));

app.use(
  session({
    secret: "money-manager-secret",
    resave: false,
    saveUninitialized: false
  })
);

/* STEP 1: Redirect to Google */
app.get("/auth/google", (req, res) => {
  const redirectUri = `${process.env.BASE_URL}/auth/google/callback`;

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent"
    });

  res.redirect(url);
});

/* STEP 2: Google callback */
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  const redirectUri = `${process.env.BASE_URL}/auth/google/callback`;

  try {
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const userRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenRes.data.access_token}`
        }
      }
    );

    req.session.user = userRes.data;
    res.redirect("/");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Google Auth Failed");
  }
});

/* USER INFO */
app.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  res.json(req.session.user);
});

/* LOGOUT */
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);

