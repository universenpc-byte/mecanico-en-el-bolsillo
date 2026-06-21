require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

const db = initDatabase();

const DEFAULT_USER_ID = 1;

const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(DEFAULT_USER_ID);
if (!existing) {
  db.prepare('INSERT OR IGNORE INTO users (id, email, nombre) VALUES (?, ?, ?)').run(1, 'usuario@app.com', 'Usuario');
}
console.log('Base de datos inicializada');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  req.userId = DEFAULT_USER_ID;
  next();
});

const createChatRouter = require('./routes/chat');
const createCodesRouter = require('./routes/codes');
const createFavoritesRouter = require('./routes/favorites');
const createHistoryRouter = require('./routes/history');

app.use('/api/chat', createChatRouter(db));
app.use('/api/codes', createCodesRouter());
app.use('/api/favorites', createFavoritesRouter(db));
app.use('/api/history', createHistoryRouter(db));

app.get('/api/tips', (req, res) => {
  const tips = [
    { titulo: 'Aceite del motor', consejo: 'Cambia el aceite cada 5,000-7,500 km o segun el manual de tu vehiculo.' },
    { titulo: 'Neumaticos', consejo: 'Revisa la presion de los neumaticos una vez al mes. Una presion incorrecta reduce la vida util y aumenta el consumo.' },
    { titulo: 'Frenos', consejo: 'Si escuchas chirridos al frenar, lleva tu vehiculo aRevision lo antes posible.' },
    { titulo: 'Refrigerante', consejo: 'Nunca abras el radiador con el motor caliente. Espera a que se enfrie completamente.' },
    { titulo: 'Filtros', consejo: 'Cambia el filtro de aire cada 15,000-20,000 km para mantener el rendimiento del motor.' },
    { titulo: 'Luces', consejo: 'Revisa todas las luces de tu vehiculo cada semana. Una luz quemada puede causarte una multa.' },
    { titulo: 'Bateria', consejo: 'La vida util promedio de una bateria es de 3-5 anos. Lleva tu vehiculo aRevision si tiene mas de 4 anhos.' },
    { titulo: 'Correas', consejo: 'La correa de distribucion debe cambiarse segun el manual. Si se rompe, puede causar danyos graves al motor.' },
    { titulo: 'Transmision', consejo: 'Cambia el liquido de transmision cada 60,000-100,000 km para mantener cambios suaves.' },
    { titulo: 'Clima', consejo: 'Usa el aire acondicionado periodicamente, incluso en invierno, para mantener el compresor en buen estado.' }
  ];
  const randomTips = tips.sort(() => Math.random() - 0.5).slice(0, 3);
  res.json(randomTips);
});

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Mecanico en el Bolsillo corriendo en http://localhost:${PORT}`);
});
