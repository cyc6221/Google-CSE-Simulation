// Reconstructed server/index.js with persistent CSE storage, auto-clean, and /public listing
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// ✅ Auto clean on startup
fs.readdirSync(dataDir).forEach(file => {
  fs.unlinkSync(path.join(dataDir, file));
});

app.post('/upload', (req, res) => {
  const fileId = uuidv4();
  const filePath = path.join(dataDir, `${fileId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(req.body));
  console.log(`Stored encrypted file as ${fileId}`);
  res.send({ status: 'uploaded', fileId });
});

app.get('/file/:fileId', (req, res) => {
  const filePath = path.join(dataDir, `${req.params.fileId}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).send({ error: 'File not found' });
  const raw = fs.readFileSync(filePath);
  res.send(JSON.parse(raw));
});

// ✅ /public listing endpoint
app.get('/public', (req, res) => {
  const entries = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json'))
    .map(file => {
      const content = JSON.parse(fs.readFileSync(path.join(dataDir, file)));
      return {
        fileId: file.replace('.json', ''),
        fileName: content.fileName || 'Untitled'
      };
    });
  res.send(entries);
});

app.listen(8000, () => console.log('CSE Simulation Server running on port 8000'));
