const express = require('express');
const path = require('path');
const fs = require('fs');

function createCodesRouter() {
  const router = express.Router();

  let codesData = [];
  const dataPath = path.join(__dirname, '..', 'data', 'obd', 'codes.json');

  function loadCodes() {
    try {
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf-8');
        codesData = JSON.parse(raw);
        console.log(`Cargados ${codesData.length} codigos OBD`);
      }
    } catch (err) {
      console.error('Error cargando codigos OBD:', err.message);
      codesData = [];
    }
  }

  loadCodes();

  router.get('/', (req, res) => {
    const { q, category, page = 1, limit = 20 } = req.query;
    let results = [...codesData];

    if (q) {
      const query = q.toUpperCase();
      results = results.filter(c =>
        c.code.toUpperCase().includes(query) ||
        (c.description && c.description.toUpperCase().includes(query)) ||
        (c.titulo && c.titulo.toUpperCase().includes(query))
      );
    }

    if (category) {
      const cat = category.toUpperCase();
      results = results.filter(c => c.code && c.code[0] === cat);
    }

    const total = results.length;
    const start = (page - 1) * limit;
    const paged = results.slice(start, start + parseInt(limit));

    res.json({ total, page: parseInt(page), limit: parseInt(limit), data: paged });
  });

  router.get('/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const found = codesData.find(c => c.code && c.code.toUpperCase() === code);
    if (!found) return res.status(404).json({ error: 'Codigo no encontrado' });
    res.json(found);
  });

  return router;
}

module.exports = createCodesRouter;
