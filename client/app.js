// Rebuilt client app.js with public file list and auto-clear server storage
// (() => {
  // const urlParams = new URLSearchParams(window.location.search);
  // const userId = urlParams.get("user") || "userA";
  // document.getElementById("whoami").innerText = userId;

(() => {
  // const userId = localStorage.getItem("username");
  const userId = sessionStorage.getItem("username");

  // 如果未登入就跳轉回登入頁
  if (!userId) {
    alert("Please login first.");
    window.location.href = "login.html";
    return;
  }

  document.getElementById("whoami").innerText = userId;
  
  // const groupUsers = ["userA", "userB", "userC"];
  let latestDecryptedText = "";

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode(...bytes));
  }

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  let myKeyPair = null;
  window.onload = async () => {
    myKeyPair = await generateRSAKeyPair();
    await registerPublicKey(userId, myKeyPair.publicKey);
    renderRecipientCheckboxes();
    loadFileHistory();
    clearFileHistory();
    loadPublicFiles();
    setInterval(loadPublicFiles, 5000);
  };

  function loadFileHistory() {
    const list = JSON.parse(localStorage.getItem(`${userId}_fileHistory`) || "[]");
    const box = document.getElementById("historyList");
    box.innerHTML = list.length ? "" : "<em>No history yet.</em>";
    for (const entry of list) {
      const div = document.createElement("div");
      div.className = "history-item";
      const fileId = entry.fileId || entry;
      const name = entry.fileName || "(unknown)";
      const p = document.createElement("p");
      p.innerHTML = `<strong>${name}</strong><br><code>${fileId}</code>`;
      const btn = document.createElement("button");
      btn.textContent = "Use File ID";
      btn.onclick = () => {
        document.getElementById("fileIdInput").value = fileId;
      };
      div.appendChild(p);
      div.appendChild(btn);
      box.appendChild(div);
    }
  }

  function loadPublicFiles() {
    fetch("http://localhost:8000/public")
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById("publicList");
        container.innerHTML = data.length ? "" : "<em>No public files</em>";
        for (const item of data) {
          const div = document.createElement("div");
          const p = document.createElement("p");
          p.innerHTML = `<strong>${item.fileName}</strong><br><code>${item.fileId}</code>`;
          const btn = document.createElement("button");
          btn.textContent = "Use File ID";
          btn.onclick = () => {
            document.getElementById("fileIdInput").value = item.fileId;
          };
          div.appendChild(p);
          div.appendChild(btn);
          container.appendChild(div);
        }
      });
  }

  function addToFileHistory(fileId, fileName) {
    const key = `${userId}_fileHistory`;
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    const exists = list.some(item => typeof item === 'object' ? item.fileId === fileId : item === fileId);
    if (!exists) {
      list.push({ fileId, fileName });
      localStorage.setItem(key, JSON.stringify(list));
    }
    loadFileHistory();
  }

  // window.clearFileHistory = function () {
  //   if (confirm("Clear your file history?")) {
  //     localStorage.removeItem(`${userId}_fileHistory`);
  //     loadFileHistory();
  //   }
  // };

  function clearFileHistory() {
    localStorage.removeItem(`${userId}_fileHistory`);
  }


  // function renderRecipientCheckboxes() {
  //   const users = ["userA", "userB", "userC"];
  //   const container = document.getElementById("recipientCheckboxes");
  //   container.innerHTML = "";
  //   for (const user of users) {
  //     const label = document.createElement("label");
  //     const box = document.createElement("input");
  //     box.type = "checkbox";
  //     box.value = user;
  //     box.checked = user === userId; // 預設自己勾選
  //     label.appendChild(box);
  //     label.append(` ${user} `);
  //     container.appendChild(label);
  //   }
  // }

  // function renderRecipientCheckboxes() {
  //   const users = ["userA", "userB", "userC"];
  //   const container = document.getElementById("recipientCheckboxes");
  //   container.innerHTML = "";

  //   const selectAllBtn = document.createElement("button");
  //   selectAllBtn.textContent = "Select All";
  //   selectAllBtn.onclick = () => {
  //     container.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = true);
  //   };
  //   container.appendChild(selectAllBtn);

  //   container.appendChild(document.createElement("br"));

  //   for (const user of users) {
  //     const label = document.createElement("label");
  //     const box = document.createElement("input");
  //     box.type = "checkbox";
  //     box.value = user;
  //     box.checked = user === userId; // 預設自己勾選
  //     label.appendChild(box);
  //     label.append(` ${user} `);
  //     container.appendChild(label);
  //     container.appendChild(document.createElement("br"));
  //   }
  // }

  async function renderRecipientCheckboxes() {
    const container = document.getElementById("recipientCheckboxes");
    container.innerHTML = "";
  
    // 從後端取得所有註冊的使用者
    const res = await fetch("http://localhost:8000/users");
    const users = await res.json();
  
    // 新增「全選」按鈕
    const selectAllBtn = document.createElement("button");
    selectAllBtn.textContent = "Select All";
    selectAllBtn.onclick = () => {
      container.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = true);
    };
    container.appendChild(selectAllBtn);
    container.appendChild(document.createElement("br"));
  
    // 建立使用者清單 checkbox
    for (const user of users) {
      const label = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.value = user;
      box.checked = user === userId; // 自己預設勾選
      label.appendChild(box);
      label.append(` ${user} `);
      container.appendChild(label);
      container.appendChild(document.createElement("br"));
    }
  }

  async function generateRSAKeyPair() {
    const keyPair = await crypto.subtle.generateKey({
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const exportedPriv = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const pem = btoa(String.fromCharCode(...new Uint8Array(exportedPriv)));
    // localStorage.setItem(
    //   `${userId}PrivateKey`,
    //   `-----BEGIN PRIVATE KEY-----\n${pem.match(/.{1,64}/g).join("\n")}\n-----END PRIVATE KEY-----`
    // );
    sessionStorage.setItem(
      `${userId}PrivateKey`,
      `-----BEGIN PRIVATE KEY-----\n${pem.match(/.{1,64}/g).join("\n")}\n-----END PRIVATE KEY-----`
    );
    return keyPair;
  }

  async function registerPublicKey(userId, publicKey) {
    const exported = await crypto.subtle.exportKey("spki", publicKey);
    const pem = btoa(String.fromCharCode(...new Uint8Array(exported)));
    await fetch("http://localhost:7000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, publicKey: pem })
    });
  }

  window.encryptAndUpload = async function () {
    const fileInput = document.getElementById("fileInput").files[0];
    if (!fileInput) return alert("Please choose a file first.");

    const selectedUsers = Array.from(document.querySelectorAll("#recipientCheckboxes input:checked")).map(cb => cb.value);
    if (selectedUsers.length === 0) return alert("Please select at least one user to share with.");

    const fileText = await fileInput.text();
    const encoded = new TextEncoder().encode(fileText);
    const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);
    const rawAes = await crypto.subtle.exportKey("raw", aesKey);

    const encryptedKeys = {};
    // const selectedUsers = Array.from(document.querySelectorAll("#recipientCheckboxes input:checked")).map(cb => cb.value);
    for (const user of selectedUsers) {
      try {
        const res = await fetch(`http://localhost:7000/publicKey/${user}`);
        if (!res.ok) continue;
        const { publicKey: pubPem } = await res.json();
        const cleanPem = pubPem.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\n/g, '').trim();
        const binaryDer = Uint8Array.from(atob(cleanPem), c => c.charCodeAt(0));
        const imported = await crypto.subtle.importKey("spki", binaryDer, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
        const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, imported, rawAes);
        encryptedKeys[user] = arrayBufferToBase64(encrypted);
      } catch (err) {
        console.warn(`Failed to encrypt for ${user}`, err);
      }
    }

    const payload = {
      sender: userId,
      fileName: fileInput.name,
      iv: arrayBufferToBase64(iv),
      encryptedData: arrayBufferToBase64(ciphertext),
      encryptedKeys
    };

    const uploadRes = await fetch("http://localhost:8000/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await uploadRes.json();
    document.getElementById("uploadResult").innerText = `Upload success. File ID: ${result.fileId}`;
    document.getElementById("encryptedContent").innerText = payload.encryptedData;
    addToFileHistory(result.fileId, fileInput.name);
    loadPublicFiles();
  };

  window.downloadAndDecrypt = async function () {
    try {
      const fileId = document.getElementById("fileIdInput").value.trim();
      if (!fileId) return alert("Please enter file ID.");

      const res = await fetch(`http://localhost:8000/file/${fileId}`);
      if (!res.ok) return alert("File not found.");

      const { encryptedData, iv, encryptedKeys } = await res.json();
      const encryptedKey = encryptedKeys[userId];
      if (!encryptedKey) return alert("You are not authorized to decrypt this file.");

      // const privateKeyPem = localStorage.getItem(`${userId}PrivateKey`);
      const privateKeyPem = sessionStorage.getItem(`${userId}PrivateKey`);
      const binary = Uint8Array.from(atob(privateKeyPem.replace(/-----[^-]+-----|\n/g, '')), c => c.charCodeAt(0));
      const privateKey = await crypto.subtle.importKey("pkcs8", binary.buffer, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);

      const aesRaw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, base64ToArrayBuffer(encryptedKey));
      const aesKey = await crypto.subtle.importKey("raw", aesRaw, "AES-GCM", false, ["decrypt"]);
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(iv)) }, aesKey, base64ToArrayBuffer(encryptedData));

      const decoded = new TextDecoder().decode(plaintext);
      latestDecryptedText = decoded;
      document.getElementById("decryptedContent").innerText = decoded;
      alert("Decryption successful!");

    } catch (err) {
      alert("Decryption failed: " + err.message);
      console.error("Full error:", err);
    }
  };

  window.downloadFile = function () {
    if (!latestDecryptedText) return alert("No decrypted content to download.");
    const blob = new Blob([latestDecryptedText], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "decrypted_file.txt";
    link.click();
  };
})();
