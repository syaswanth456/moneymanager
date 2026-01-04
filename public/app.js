const status = document.getElementById("status");

/* 🔐 FETCH ENV FROM BACKEND */
fetch("/config")
  .then(res => res.json())
  .then(cfg => {

    google.accounts.id.initialize({
      client_id: cfg.googleClientId,
      callback: handleLogin
    });

    google.accounts.id.renderButton(
      document.getElementById("google-btn"),
      {
        theme: "outline",
        size: "large",
        shape: "pill"
      }
    );
  });

/* ✅ HANDLE LOGIN RESPONSE */
function handleLogin(response) {
  fetch("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: response.credential })
  })
  .then(res => res.json())
  .then(user => {
    status.innerText = `Logged in as ${user.name}`;
  })
  .catch(() => {
    status.innerText = "Login failed";
  });
}
