// PM2: mantiene la API en ejecución. Uso (desde la carpeta backend):  pm2 start ../deploy/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rescatapp-api',
    script: 'src/server.js',
    cwd: __dirname + '/../backend',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '400M',
  }],
};
