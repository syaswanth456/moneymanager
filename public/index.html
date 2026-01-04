fetch("/config")
  .then(r => r.json())
  .then(cfg => {
    google.accounts.id.initialize({
      client_id: cfg.googleClientId,
      callback: onLogin
    });

    google.accounts.id.renderButton(
      document.getElementById("google-btn"),
      { theme: "outline", size: "large" }
    );
  });

function onLogin(res) {
  fetch("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: res.credential })
  })
  .then(r => r.json())
  .then(u => {
    document.getElementById("status").innerText =
      "Logged in as " + u.name;
  });
}
