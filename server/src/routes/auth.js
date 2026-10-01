const express = require('express');
const store = require('../store');

const router = express.Router();

// Autenticação simples (sem hash), espelhando o comportamento atual do front-end.
router.post('/login', async (req, res) => {
  const { identifier, senha } = req.body || {};
  const id = (identifier || '').toLowerCase().trim();
  const users = await store.list('users');
  const user = users.find(u =>
    u.ativo &&
    ((u.email || '').toLowerCase() === id || (u.login || '').toLowerCase() === id) &&
    u.senha === senha
  );
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  res.json(user);
});

module.exports = router;
