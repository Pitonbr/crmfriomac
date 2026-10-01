const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const resourceRouter = require('./resourceRouter');
const seed = require('./seed');

const RESOURCES = [
  'users', 'leads', 'reps', 'clientes', 'comissoes', 'entregas',
  'orcamentos', 'campanhas', 'mensagens', 'auditLog', 'resetRequests',
  'comunicados', 'solicitacoesMkt', 'repositorioMkt', 'stages', 'kpis',
];

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'error', details: e.message });
  }
});

for (const resource of RESOURCES) {
  app.use(`/api/${resource}`, resourceRouter(resource));
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/config', require('./routes/config'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/import', require('./routes/import'));

const PORT = process.env.PORT || 3000;

async function start() {
  // Aguarda o Postgres ficar disponível (o container pode subir antes do banco estar pronto).
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (e) {
      console.log(`[boot] aguardando postgres... (${attempt}/20)`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  await seed.run();
  app.listen(PORT, () => console.log(`[api] rodando na porta ${PORT}`));
}

start();
