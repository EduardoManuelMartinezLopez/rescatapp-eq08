require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { noEncontrada, manejarErrores } = require('./middleware/errores');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env. Copia .env.example como .env y llénalo.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
// 700 kb: lo suficiente para una foto pequeña (máx. 400 KB) codificada en base64
app.use(express.json({ limit: '700kb' }));

app.get('/api/health', (req, res) => res.json({ estado: 'ok', servicio: 'RescatApp API' }));
app.use('/api/auth', require('./routes/auth'));

app.use(noEncontrada);
app.use(manejarErrores);

module.exports = app;
