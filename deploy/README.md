# Despliegue en AWS EC2 (Ubuntu 24.04)

Archivos de esta carpeta:
- `nginx.conf`: sitio de nginx (interfaz + proxy de `/api` al puerto 3000).
- `ecosystem.config.js`: configuración de PM2 para la API.
- `actualizar.sh`: baja la última versión de GitHub, recompila la interfaz y reinicia la API.
- `respaldo_bd.sh`: respaldo comprimido de PostgreSQL con retención de 14 días.

## Primera instalación
1. Instancia EC2 con Ubuntu 24.04, IP elástica y puertos 22, 80 y 443 abiertos.
2. `sudo apt install -y nginx postgresql git` y Node.js 20; `sudo npm i -g pm2`. Con 2 GB de RAM conviene crear 2 GB de swap antes de compilar la interfaz.
3. Clonar el repositorio, crear usuario y base en PostgreSQL y cargar `database/rescatapp_database.sql`.
4. Crear `backend/.env` a partir de `backend/.env.example` con valores de producción (ver abajo).
5. `cd frontend && npm install && npm run build` y copiar `dist/` a `/var/www/rescatapp`.
6. `cd backend && npm install --omit=dev && pm2 start ../deploy/ecosystem.config.js && pm2 save && pm2 startup`.
7. Copiar `nginx.conf` (cambiando `TU_DOMINIO`), activar el sitio y ejecutar `sudo certbot --nginx -d TU_DOMINIO`.

## Valores de producción en `backend/.env`
```
JWT_SECRET=<cadena larga y aleatoria propia>
FRONTEND_URL=https://TU_DOMINIO   # en producción: https://rescatapp.online
DEV_SHOW_RESET_LINK=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<cuenta de Gmail>
SMTP_PASS=<contraseña de aplicación de 16 caracteres>
SMTP_FROM=RescatApp <cuenta de Gmail>
GOOGLE_CLIENT_ID=<ID de cliente de Google>
```
Y en `frontend/.env` (antes de compilar): `VITE_GOOGLE_CLIENT_ID=<el mismo ID>`.

## Al cambiar de dominio
1. Apuntar el registro DNS tipo A del dominio nuevo a la IP elástica.
2. Cambiar `server_name` en nginx y ejecutar de nuevo certbot para el dominio nuevo.
3. Actualizar `FRONTEND_URL` en `backend/.env` (también controla CORS) y reiniciar PM2.
4. En Google Cloud Console agregar el dominio nuevo a los orígenes de JavaScript autorizados del ID de cliente OAuth.

## Comprobaciones
- `curl https://TU_DOMINIO/api/health`
- `cd backend && npm run correo:probar -- tucorreo@gmail.com` (verifica el SMTP)

## Usuarios de demostración
El script SQL crea usuarios de demostración con una contraseña conocida (está escrita en el propio script). En el servidor público hay que **cambiar la contraseña del administrador** (o eliminar esos usuarios) después de cargar la base.
