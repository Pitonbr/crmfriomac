const { pool } = require('./db');

async function list(resource) {
  const { rows } = await pool.query('SELECT data FROM store WHERE resource = $1 ORDER BY updated_at ASC', [resource]);
  return rows.map(r => r.data);
}

async function get(resource, id) {
  const { rows } = await pool.query('SELECT data FROM store WHERE resource = $1 AND id = $2', [resource, id]);
  return rows[0] ? rows[0].data : null;
}

async function upsert(resource, id, data) {
  await pool.query(
    `INSERT INTO store (resource, id, data, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (resource, id) DO UPDATE SET data = $3, updated_at = now()`,
    [resource, id, data]
  );
  return data;
}

async function remove(resource, id) {
  await pool.query('DELETE FROM store WHERE resource = $1 AND id = $2', [resource, id]);
}

async function count(resource) {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM store WHERE resource = $1', [resource]);
  return rows[0].n;
}

module.exports = { list, get, upsert, remove, count };
