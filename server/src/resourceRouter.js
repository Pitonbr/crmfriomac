const express = require('express');
const store = require('./store');

/* Router CRUD genérico para um recurso (coleção) guardado como JSONB.
   Mantém o mesmo formato de dados usado hoje pelo FriomacData no front-end:
   cada registro é um objeto com campo "id". */
function resourceRouter(resource) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    res.json(await store.list(resource));
  });

  router.get('/:id', async (req, res) => {
    const item = await store.get(resource, req.params.id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    res.json(item);
  });

  router.post('/', async (req, res) => {
    const data = req.body;
    if (!data || !data.id) return res.status(400).json({ error: 'id_required' });
    const saved = await store.upsert(resource, String(data.id), data);
    res.status(201).json(saved);
  });

  router.put('/:id', async (req, res) => {
    const data = { ...req.body, id: req.params.id };
    const saved = await store.upsert(resource, req.params.id, data);
    res.json(saved);
  });

  router.delete('/:id', async (req, res) => {
    await store.remove(resource, req.params.id);
    res.status(204).end();
  });

  return router;
}

module.exports = resourceRouter;
