// client/login.js
const resultDiv = document.getElementById("result");

// document.getElementById("register-form").addEventListener("submit", async (e) => {
//   e.preventDefault();
//   const username = document.getElementById("register-username").value;
//   const password = document.getElementById("register-password").value;

//   const res = await fetch("http://localhost:8000/register", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ username, password })
//   });

//   const msg = await res.text();
//   resultDiv.innerText = "Register: " + msg;
// });

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  const res = await fetch("http://localhost:8000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const msg = await res.text();
  if (res.ok) {
    // 將登入的 username 存到 localStorage，再跳轉回 index.html
    // localStorage.setItem("username", username);
    sessionStorage.setItem("username", username);
    window.location.href = "index.html";
  } else {
    resultDiv.innerText = "Login failed: " + msg;
  }
});

  window.onload = () => {
    fetchAndRenderUsers();
  
    document.getElementById("refreshUsersBtn").onclick = () => {
      fetchAndRenderUsers();
    };
  };
  
  async function fetchAndRenderUsers() {
    try {
      const res = await fetch("http://localhost:8000/users");
      const users = await res.json();
  
      const list = document.getElementById("userList");
      list.innerHTML = "";
  
      if (users.length === 0) {
        list.innerHTML = "<tr><td colspan='2'><em>No users registered yet.</em></td></tr>";
        return;
      }
  
      for (const user of users) {
        const tr = document.createElement("tr");
        
        // username
        const tdName = document.createElement("td");
        tdName.textContent = user;
        
        // Fill in
        const tdFill = document.createElement("td");
        const fillBtn = document.createElement("button");
        fillBtn.textContent = "Fill in";
        fillBtn.onclick = () => {
          document.getElementById("login-username").value = user;
        };
        tdFill.appendChild(fillBtn);
        
        // Delete
        const tdDelete = document.createElement("td");
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = async () => {
          if (!confirm(`Are you sure you want to delete user "${user}"?`)) return;
          const res = await fetch(`http://localhost:8000/users/${user}`, {
            method: "DELETE"
          });
          const msg = await res.text();
          alert(msg);
          fetchAndRenderUsers();
        };
        tdDelete.appendChild(deleteBtn);
      
        tr.appendChild(tdName);
        tr.appendChild(tdFill);
        tr.appendChild(tdDelete);
        list.appendChild(tr);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      const list = document.getElementById("userList");
      list.innerHTML = "<tr><td colspan='2'><em>Error loading users.</em></td></tr>";
    }
  }
  