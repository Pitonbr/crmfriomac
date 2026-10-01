const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const store = require('../store');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/* Importação em lote de leads a partir de planilha Excel (.xlsx) ou JSON.
   Preparado para receber dados de um banco pré-existente ou planilha,
   usando as mesmas colunas já usadas em LEADS_BASE (js/data.js). */
router.post('/leads', upload.single('file'), async (req, res) => {
  let rows;
  try {
    if (req.file) {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else if (Array.isArray(req.body)) {
      rows = req.body;
    } else {
      return res.status(400).json({ error: 'file_or_json_array_required' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'invalid_file', details: e.message });
  }

  const saved = [];
  for (const row of rows) {
    const id = String(row.id || row.ID || `${Date.now()}_${saved.length}`);
    const lead = {
      id,
      dataAbertura: row.dataAbertura || row.DataAbertura || '',
      projeto: row.projeto || row.Projeto || '',
      cliente: row.cliente || row.Cliente || '',
      nomFantasia: row.nomFantasia || row.NomeFantasia || '',
      nomeCliente: row.nomeCliente || row.NomeCliente || '',
      tel: row.tel || row.Telefone || '',
      email: row.email || row.Email || '',
      vendedor: row.vendedor || row.Vendedor || '',
      valor: Number(row.valor || row.Valor || 0),
      diasAberto: Number(row.diasAberto || 0),
      status: row.status || row.Status || 'EM ABERTO',
      canal: row.canal || row.Canal || '',
      etapa: row.etapa || row.Etapa || 'novo_lead',
      obs: row.obs || row.Observacao || '',
      mes: row.mes || '',
      prioridade: row.prioridade || 'média',
      tags: row.tags ? String(row.tags).split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    await store.upsert('leads', id, lead);
    saved.push(lead);
  }

  res.status(201).json({ imported: saved.length, leads: saved });
});

module.exports = router;
