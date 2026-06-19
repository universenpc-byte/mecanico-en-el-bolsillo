const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

function createAuthRouter(db) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    try {
      const { email, password, nombre } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(400).json({ error: 'Este email ya esta registrado' });
      }

      const hash = await bcrypt.hash(password, 10);
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, nombre) VALUES (?, ?, ?)'
      ).run(email, hash, nombre || '');

      const token = jwt.sign(
        { id: result.lastInsertRowid, email },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        token,
        user: { id: result.lastInsertRowid, email, nombre: nombre || '' }
      });
    } catch (err) {
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          vehiculo_marca: user.vehiculo_marca,
          vehiculo_modelo: user.vehiculo_modelo,
          vehiculo_ano: user.vehiculo_ano
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  router.get('/profile', authMiddleware, (req, res) => {
    const user = db.prepare(
      'SELECT id, email, nombre, vehiculo_marca, vehiculo_modelo, vehiculo_ano, created_at FROM users WHERE id = ?'
    ).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  });

  router.put('/profile', authMiddleware, (req, res) => {
    const { nombre, vehiculo_marca, vehiculo_modelo, vehiculo_ano } = req.body;
    db.prepare(
      'UPDATE users SET nombre = ?, vehiculo_marca = ?, vehiculo_modelo = ?, vehiculo_ano = ? WHERE id = ?'
    ).run(nombre || '', vehiculo_marca || '', vehiculo_modelo || '', vehiculo_ano || 0, req.user.id);
    res.json({ mensaje: 'Perfil actualizado' });
  });

  return router;
}

module.exports = createAuthRouter;
