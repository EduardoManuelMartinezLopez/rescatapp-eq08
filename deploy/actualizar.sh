#!/usr/bin/env bash
# Actualiza el sitio en el servidor con la última versión de GitHub.
# Uso (en el servidor, desde la raíz del repositorio):  bash deploy/actualizar.sh
set -euo pipefail
git pull
( cd backend && npm install --omit=dev )
( cd frontend && npm install && npm run build )
sudo rsync -a --delete frontend/dist/ /var/www/rescatapp/
pm2 restart rescatapp-api
curl -fsS http://127.0.0.1:3000/api/health && echo " <- API en línea"
