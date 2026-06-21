const express = require('express');

function createHistoryRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const chats = db.prepare(
      'SELECT id, titulo, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC'
    ).all(req.userId);
    res.json(chats);
  });

  router.get('/:chatId', (req, res) => {
    const chat = db.prepare(
      'SELECT id, titulo, created_at, updated_at FROM chats WHERE id = ? AND user_id = ?'
    ).get(req.params.chatId, req.userId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

    const messages = db.prepare(
      'SELECT role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC'
    ).all(req.params.chatId);

    res.json({ ...chat, messages });
  });

  router.delete('/:chatId', (req, res) => {
    const chat = db.prepare(
      'SELECT id FROM chats WHERE id = ? AND user_id = ?'
    ).get(req.params.chatId, req.userId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

    db.prepare('DELETE FROM messages WHERE chat_id = ?').run(req.params.chatId);
    db.prepare('DELETE FROM chats WHERE id = ?').run(req.params.chatId);
    res.json({ mensaje: 'Chat eliminado' });
  });

  return router;
}

module.exports = createHistoryRouter;
