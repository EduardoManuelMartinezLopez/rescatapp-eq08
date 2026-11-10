const app = require('./app');
const pool = require('./db');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await pool.query('SELECT 1'); // comprueba la conexión a PostgreSQL
    console.log('✔ Conectado a PostgreSQL');
  } catch (err) {
    console.error('✘ No se pudo conectar a PostgreSQL. Revisa tu archivo .env:', err.message);
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`✔ API de RescatApp en http://localhost:${PORT}`));
})();
