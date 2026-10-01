const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.get('/:key', async (req, res) => {
  const { rows } = await pool.query('SELECT value FROM app_config WHERE key = $1', [req.params.key]);
  res.json(rows[0] ? rows[0].value : null);
});

router.put('/:key', async (req, res) => {
  await pool.query(
    `INSERT INTO app_config (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [req.params.key, req.body]
  );
  res.json(req.body);
});

module.exports = router;
