const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ 使用 Node.js 內建 crypto 產生 RSA 金鑰
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// ✅ 註冊使用者公鑰（保留你原本的功能）
const keys = {};
app.post('/register', (req, res) => {
  const { userId, publicKey } = req.body;
  keys[userId] = publicKey;
  console.log(`🔐 Registered key for ${userId}`);
  res.send({ status: 'ok' });
});

// ✅ 查詢使用者公鑰
app.get('/publicKey/:userId', (req, res) => {
  const key = keys[req.params.userId];
  if (!key) return res.status(404).send('Key not found');
  res.send({ publicKey: key });
});

// ✅ 提供 KMS 公鑰（前端用來加密 AES key）
app.get('/kms/pubkey', (req, res) => {
  res.send({ publicKey });
});

// ✅ 解封裝 AES 金鑰
app.post('/kms/decrypt', (req, res) => {
  try {
    const { encryptedKey } = req.body;
    const buffer = Buffer.from(encryptedKey, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );
    res.send({ aesKey: decrypted.toString('base64') });
  } catch (err) {
    console.error('❌ Decryption error:', err);
    res.status(400).send({ error: 'Invalid encrypted key' });
  }
});

app.listen(7000, () => console.log('KMS running on port 7000'));
