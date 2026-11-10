// Conexión a PostgreSQL mediante un "pool" (conjunto de conexiones reutilizables)
require('dotenv').config();
const { Pool, types } = require('pg');

// pg devuelve NUMERIC y BIGINT como texto; los convertimos a número
types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC
types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT (COUNT)

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'rescatapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
