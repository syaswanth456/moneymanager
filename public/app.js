let USER_ID = null;

function handleLogin(response) {
  fetch("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: response.credential })
  })
  .then(r => r.json())
  .then(data => {
    USER_ID = data.userId;
    document.getElementById("user").innerText =
      "Logged in as " + data.name;
  });
}

function loadAccounts() {
  fetch(`/accounts/${USER_ID}`)
    .then(r => r.json())
    .then(data => {
      document.getElementById("output").innerText =
        JSON.stringify(data, null, 2);
    });
}
