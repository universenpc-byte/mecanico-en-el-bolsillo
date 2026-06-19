const express = require('express');
const authMiddleware = require('../middleware/auth');

function createFavoritesRouter(db) {
  const router = express.Router();

  router.get('/', authMiddleware, (req, res) => {
    const favs = db.prepare(
      'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);
    res.json(favs);
  });

  router.post('/', authMiddleware, (req, res) => {
    const { type, content, code_ref, chat_id } = req.body;
    if (!type || !content) {
      return res.status(400).json({ error: 'Tipo y contenido son requeridos' });
    }

    const result = db.prepare(
      'INSERT INTO favorites (user_id, type, content, code_ref, chat_id) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, type, content, code_ref || '', chat_id || null);

    res.json({ id: result.lastInsertRowid, mensaje: 'Agregado a favoritos' });
  });

  router.delete('/:id', authMiddleware, (req, res) => {
    const fav = db.prepare(
      'SELECT id FROM favorites WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);
    if (!fav) return res.status(404).json({ error: 'Favorito no encontrado' });

    db.prepare('DELETE FROM favorites WHERE id = ?').run(req.params.id);
    res.json({ mensaje: 'Eliminado de favoritos' });
  });

  return router;
}

module.exports = createFavoritesRouter;
