#!/usr/bin/env bash
# Copia de seguridad de la base de datos. Uso:  bash deploy/respaldo_bd.sh
# Programar cada día a las 3:00 con:  crontab -e   y agregar la línea:
#   0 3 * * * /ruta/al/repositorio/deploy/respaldo_bd.sh
set -euo pipefail
DESTINO="${HOME}/respaldos"; mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/rescatapp_$(date +%Y%m%d_%H%M).sql.gz"
pg_dump -U "${DB_USER:-postgres}" -h localhost "${DB_NAME:-rescatapp}" | gzip > "$ARCHIVO"
find "$DESTINO" -name 'rescatapp_*.sql.gz' -mtime +14 -delete   # conserva 14 días
echo "Respaldo creado: $ARCHIVO"
