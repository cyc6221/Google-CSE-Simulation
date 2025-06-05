const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

// === Setup folders ===
const BASE_DIR = path.join(__dirname, 'data');
const USER_DIR = path.join(BASE_DIR, 'users');
const FILE_DIR = path.join(BASE_DIR, 'encrypted');

[BASE_DIR, USER_DIR, FILE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// === Clean encrypted files on startup ===
fs.readdirSync(FILE_DIR).forEach(file => {
  fs.unlinkSync(path.join(FILE_DIR, file));
});

// === Register ===
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const userPath = path.join(USER_DIR, username);
  
    if (fs.existsSync(userPath)) {
      return res.status(409).send('Username already exists');
    }
    fs.mkdirSync(userPath, { recursive: true });
  
    // === 1. 密碼雜湊儲存（bcrypt）
    const hashedPassword = await bcrypt.hash(password, 10);
    fs.writeFileSync(path.join(userPath, 'password.txt'), hashedPassword);
  
    // === 2. 產生 RSA 金鑰對
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
  
    fs.writeFileSync(path.join(userPath, 'public.pem'), publicKey.export({ type: 'pkcs1', format: 'pem' }));
  
    // === 3. 產生 AES 金鑰（對稱金鑰，用來加密私鑰與TOTP）
    const aesKey = crypto.randomBytes(32); // AES-256
    const iv = crypto.randomBytes(12);     // GCM 需要 12 bytes IV
  
    // === 4. 加密 RSA 私鑰
    const privatePem = privateKey.export({ type: 'pkcs1', format: 'pem' });
    const cipher1 = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    let encryptedPrivate = cipher1.update(privatePem, 'utf8', 'base64');
    encryptedPrivate += cipher1.final('base64');
    const tag1 = cipher1.getAuthTag().toString('base64');
  
    fs.writeFileSync(path.join(userPath, 'private_key.json'), JSON.stringify({
      iv: iv.toString('base64'),
      tag: tag1,
      ciphertext: encryptedPrivate
    }));
  
    // === 5. 產生 TOTP 种子並加密儲存
    const totpSecret = speakeasy.generateSecret({ name: `CSE-Simulator (${username})` });
    const cipher2 = crypto.createCipheriv('aes-256-gcm', aesKey, iv); // 用同一把 aesKey（可也用不同 key）
    let encryptedTotp = cipher2.update(totpSecret.base32, 'utf8', 'base64');
    encryptedTotp += cipher2.final('base64');
    const tag2 = cipher2.getAuthTag().toString('base64');
  
    fs.writeFileSync(path.join(userPath, 'totp.json'), JSON.stringify({
      iv: iv.toString('base64'),
      tag: tag2,
      ciphertext: encryptedTotp
    }));
  
    // === 6. QR Code 傳給前端
    const qrDataURL = await qrcode.toDataURL(totpSecret.otpauth_url);
  
    // ✅ 你也可以把 aesKey 用 KMS wrap 後儲存起來
    fs.writeFileSync(path.join(userPath, 'aes.key'), aesKey.toString('base64'));  // demo only，正式環境不要這樣做
  
    res.json({
      message: 'User registered successfully',
      secret: totpSecret.base32,
      qr: qrDataURL
    });
  });
  
// === Login ===
app.post('/login', async (req, res) => {
    const { username, password, totp } = req.body;
    const userPath = path.join(USER_DIR, username);
  
    // Check if user exists
    if (!fs.existsSync(userPath)) return res.status(404).send('User not found');
  
    // === 1. Verify password using bcrypt ===
    const storedHash = fs.readFileSync(path.join(userPath, 'password.txt'), 'utf-8');
    const valid = await bcrypt.compare(password, storedHash);
    if (!valid) return res.status(401).send('Invalid password');
  
    // === 2. Decrypt TOTP seed from totp.json ===
    const totpPath = path.join(userPath, 'totp.json');
    if (!fs.existsSync(totpPath)) return res.status(500).send('TOTP not set');
  
    const encrypted = JSON.parse(fs.readFileSync(totpPath, 'utf-8'));
  
    // Load AES key from file (in real scenarios, this should be handled by KMS)
    const aesKey = Buffer.from(fs.readFileSync(path.join(userPath, 'aes.key'), 'utf-8'), 'base64');
    const iv = Buffer.from(encrypted.iv, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');
    const ciphertext = encrypted.ciphertext;
  
    try {
      // Decrypt the TOTP secret using AES-256-GCM
      const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8'); // decrypted is the base32 TOTP secret
  
      // === 3. Verify the provided TOTP code ===
      const verified = speakeasy.totp.verify({
        secret: decrypted,
        encoding: 'base32',
        token: totp,
        window: 1
      });
  
      if (!verified) return res.status(403).send('Invalid TOTP code');
  
      res.send('Login successful');
    } catch (err) {
      console.error("Decryption failed:", err);
      return res.status(500).send('Failed to decrypt TOTP');
    }
  });
  
// === Upload encrypted message ===
app.post('/upload', (req, res) => {
  const fileId = uuidv4();
  const filePath = path.join(FILE_DIR, `${fileId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(req.body));
  console.log(`Stored encrypted file as ${fileId}`);
  res.send({ status: 'uploaded', fileId });
});

// === Retrieve file ===
app.get('/file/:fileId', (req, res) => {
  const filePath = path.join(FILE_DIR, `${req.params.fileId}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).send({ error: 'File not found' });

  const content = fs.readFileSync(filePath);
  res.send(JSON.parse(content));
});

// === Public file list ===
app.get('/public', (req, res) => {
  const files = fs.readdirSync(FILE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const content = JSON.parse(fs.readFileSync(path.join(FILE_DIR, f)));
      return {
        fileId: f.replace('.json', ''),
        fileName: content.fileName || 'Untitled'
      };
    });
  res.send(files);
});

// === List the users ===
app.get("/users", (req, res) => {
  const userDirs = fs.readdirSync(USER_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  res.send(userDirs);
});

// === Delete the user ===
app.delete("/users/:username", (req, res) => {
  const username = req.params.username;
  const userPath = path.join(USER_DIR, username);

  if (!fs.existsSync(userPath)) {
    return res.status(404).send("User not found");
  }

  fs.rmSync(userPath, { recursive: true, force: true });
  res.send("User deleted");
});

// === Start server ===
app.listen(8000, () => {
  console.log('🚀 CSE Simulation Server with TOTP 2FA running on http://localhost:8000');
});
