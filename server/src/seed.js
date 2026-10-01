const { pool } = require('./db');
const store = require('./store');
const seedData = require('./seedData');

async function ensureSchema() {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

async function seedResource(resource, items) {
  const existing = await store.count(resource);
  if (existing > 0) return;
  for (const item of items) {
    await store.upsert(resource, String(item.id), item);
  }
  console.log(`[seed] ${resource}: ${items.length} registros inseridos`);
}

async function run() {
  await ensureSchema();
  for (const [resource, items] of Object.entries(seedData)) {
    await seedResource(resource, items);
  }
  console.log('[seed] concluído');
}

module.exports = { run };
