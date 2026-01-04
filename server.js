import express from "express";
import axios from "axios";
import session from "express-session";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* SESSION */
app.use(
  session({
    secret: "money-manager-secret",
    resave: false,
    saveUninitialized: false
  })
);

/* SUPABASE */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   GOOGLE OAUTH (REDIRECT)
========================= */
app.get("/auth/google", (req, res) => {
  const redirectUri = `${process.env.BASE_URL}/auth/google/callback`;

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "consent"
    });

  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  const redirectUri = `${process.env.BASE_URL}/auth/google/callback`;
  const code = req.query.code;

  try {
    /* Exchange code */
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

    /* Get profile */
    const userRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenRes.data.access_token}`
        }
      }
    );

    const g = userRes.data;

    /* UPSERT USER */
    const { data: user } = await supabase
      .from("app_users")
      .upsert(
        {
          google_sub: g.sub,
          email: g.email,
          name: g.name,
          picture: g.picture
        },
        { onConflict: "google_sub" }
      )
      .select()
      .single();

    /* DEFAULT ACCOUNTS */
    const { data: accs } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id);

    if (!accs || accs.length === 0) {
      await supabase.from("accounts").insert([
        { user_id: user.id, name: "Cash on Hand", type: "cash", balance: 0 },
        { user_id: user.id, name: "Bank Account", type: "bank", balance: 0 }
      ]);
    }

    req.session.user = user;
    res.redirect("/");
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).send("Auth failed");
  }
});

/* =========================
   AUTH MIDDLEWARE
========================= */
function auth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

/* =========================
   APIs
========================= */

/* ME */
app.get("/api/me", auth, (req, res) => {
  res.json(req.session.user);
});

/* ACCOUNTS */
app.get("/api/accounts", auth, async (req, res) => {
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", req.session.user.id)
    .order("id");
  res.json(data);
});

/* WITHDRAW → CASH */
app.post("/api/withdraw", auth, async (req, res) => {
  const { fromAccountId, amount } = req.body;
  const uid = req.session.user.id;

  const { data: fromAcc } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", fromAccountId)
    .single();

  if (fromAcc.balance < amount)
    return res.status(400).json({ error: "Insufficient balance" });

  const { data: cashAcc } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", uid)
    .eq("type", "cash")
    .single();

  await supabase.from("accounts").update({
    balance: fromAcc.balance - amount
  }).eq("id", fromAcc.id);

  await supabase.from("accounts").update({
    balance: cashAcc.balance + amount
  }).eq("id", cashAcc.id);

  res.json({ success: true });
});

/* EXPENSE */
app.post("/api/expense", auth, async (req, res) => {
  const { accountId, amount } = req.body;

  const { data: acc } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (acc.balance < amount)
    return res.status(400).json({ error: "Insufficient balance" });

  await supabase.from("accounts").update({
    balance: acc.balance - amount
  }).eq("id", acc.id);

  res.json({ success: true });
});

/* LOGOUT */
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.listen(process.env.PORT || 3000);
