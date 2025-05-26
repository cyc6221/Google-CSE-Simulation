const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

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
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const userPath = path.join(USER_DIR, username);

  if (fs.existsSync(userPath)) {
    return res.status(409).send('Username already exists');
  }

  fs.mkdirSync(userPath);

  fs.writeFileSync(path.join(userPath, 'password.txt'), password);

  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  fs.writeFileSync(path.join(userPath, 'public.pem'), publicKey.export({ type: 'pkcs1', format: 'pem' }));
  fs.writeFileSync(path.join(userPath, 'private.pem'), privateKey.export({ type: 'pkcs1', format: 'pem' }));

  res.send('User registered successfully');
});

// === Login ===
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const userPath = path.join(USER_DIR, username);

  if (!fs.existsSync(userPath)) return res.status(404).send('User not found');

  const saved = fs.readFileSync(path.join(userPath, 'password.txt'), 'utf-8');
  if (saved !== password) return res.status(401).send('Invalid password');

  res.send('Login successful');
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
  console.log('🚀 CSE Simulation Server with Auth running on http://localhost:8000');
});
