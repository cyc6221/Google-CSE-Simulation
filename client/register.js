// register.js
const resultDiv = document.getElementById("result");

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;

  try {
    const res = await fetch("http://localhost:8000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const msg = await res.text();
    resultDiv.innerText = "Register: " + msg;
  } catch (err) {
    resultDiv.innerText = "Register error: " + err.message;
  }
});
