const express = require('express');

function createFavoritesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const favs = db.prepare(
      'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.userId);
    res.json(favs);
  });

  router.post('/', (req, res) => {
    const { type, content, code_ref, chat_id } = req.body;
    if (!type || !content) {
      return res.status(400).json({ error: 'Tipo y contenido son requeridos' });
    }

    const result = db.prepare(
      'INSERT INTO favorites (user_id, type, content, code_ref, chat_id) VALUES (?, ?, ?, ?, ?)'
    ).run(req.userId, type, content, code_ref || '', chat_id || null);

    res.json({ id: result.lastInsertRowid, mensaje: 'Agregado a favoritos' });
  });

  router.delete('/:id', (req, res) => {
    const fav = db.prepare(
      'SELECT id FROM favorites WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);
    if (!fav) return res.status(404).json({ error: 'Favorito no encontrado' });

    db.prepare('DELETE FROM favorites WHERE id = ?').run(req.params.id);
    res.json({ mensaje: 'Eliminado de favoritos' });
  });

  return router;
}

module.exports = createFavoritesRouter;
