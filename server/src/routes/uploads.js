const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../db');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname || '');
    cb(null, `${id}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file_required' });
  const id = path.parse(req.file.filename).name;
  await pool.query(
    'INSERT INTO uploads (id, filename, original_name, mime_type) VALUES ($1,$2,$3,$4)',
    [id, req.file.filename, req.file.originalname, req.file.mimetype]
  );
  res.status(201).json({
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/api/uploads/${req.file.filename}`,
  });
});

router.get('/:filename', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'uploads', req.params.filename));
});

module.exports = router;
