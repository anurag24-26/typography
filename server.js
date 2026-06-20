require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const { APP_PASSWORD, JWT_SECRET, MONGODB_URI, PORT } = process.env;

if (!APP_PASSWORD || !JWT_SECRET || !MONGODB_URI) {
  console.error('Missing required env vars. Check your .env file.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ---- Schema ----
const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true }, // text content
  createdAt: { type: Date, default: Date.now },
});
const FileModel = mongoose.model('File', fileSchema);

// ---- Auth middleware ----
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ---- Routes ----

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password !== APP_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  const token = jwt.sign({ ok: true }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// List files (just names + ids + date, not full content)
app.get('/api/files', auth, async (req, res) => {
  const files = await FileModel.find({}, { content: 0 }).sort({ createdAt: -1 });
  res.json(files);
});

// Get single file (with content)
app.get('/api/files/:id', auth, async (req, res) => {
  const file = await FileModel.findById(req.params.id);
  if (!file) return res.status(404).json({ error: 'Not found' });
  res.json(file);
});

// Create / save new text file
app.post('/api/files', auth, async (req, res) => {
  const { name, content } = req.body;
  if (!name || content === undefined) {
    return res.status(400).json({ error: 'name and content are required' });
  }
  const file = await FileModel.create({ name, content });
  res.json(file);
});

// Delete a file
app.delete('/api/files/:id', auth, async (req, res) => {
  await FileModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

const port = PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));