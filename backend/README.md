# RescatApp – API (backend)

API REST en Node.js + Express con PostgreSQL.

## Cómo correrla
1. `npm install`
2. Copiar `.env.example` como `.env` y llenar los valores (contraseña de PostgreSQL y un `JWT_SECRET` largo).
3. Tener creada la base `rescatapp` con el script de `database/`.
4. `npm start` (o `npm run dev`). La API queda en `http://localhost:3000`.

## Endpoints disponibles en este Sprint
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | /api/health | público | Comprueba que la API responde |
| POST | /api/auth/register | público | Registrar un donante o receptor |
| POST | /api/auth/login | público | Iniciar sesión (devuelve el token JWT) |
| GET | /api/auth/me | autenticado | Datos del usuario con sesión |
