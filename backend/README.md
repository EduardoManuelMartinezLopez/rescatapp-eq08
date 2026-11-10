# RescatApp – Backend (API REST)

Node.js + Express + PostgreSQL. Autenticación con JWT (HS256) y contraseñas con bcrypt.

## Puesta en marcha
1. `cd backend`
2. `npm install`
3. Copia `.env.example` como `.env` y escribe tu contraseña de PostgreSQL y un `JWT_SECRET` propio.
4. Ejecuta `database/rescatapp_database.sql` en la base `rescatapp` (borra y recrea las tablas).
5. `npm run dev` → API en http://localhost:3000 (prueba: http://localhost:3000/api/health)

## Endpoints
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | /api/auth/register | público | Crear cuenta (donante o receptor; el receptor queda pendiente) |
| POST | /api/auth/login | público | Iniciar sesión |
| POST | /api/auth/google | público | Iniciar sesión / registrarse con Google |
| POST | /api/auth/forgot | público | Pedir enlace para restablecer contraseña |
| POST | /api/auth/reset | público | Restablecer contraseña con el token del enlace |
| GET / PATCH | /api/auth/me | autenticado | Ver / editar perfil |
| PATCH | /api/auth/password | autenticado | Cambiar contraseña |
| GET | /api/donations | autenticado | Donaciones disponibles (`?categoria=`, `?q=`) |
| GET | /api/donations/mine | donante | Mis donaciones |
| GET | /api/donations/:id/foto | público | Foto de la donación |
| POST | /api/donations/publish | donante | Publicar donación (con foto opcional) |
| DELETE | /api/donations/:id | donante | Retirar donación no reservada |
| POST | /api/reservations/book | receptor aprobado | Apartar (transacción, 409 si ya fue apartada) |
| GET | /api/reservations/mine | receptor | Mis reservas |
| PATCH | /api/reservations/:id/pickup | donante | Confirmar recolección |
| PATCH | /api/reservations/:id/cancel | receptor | Cancelar reserva |
| POST | /api/ratings | participante | Calificar tras la recolección (1 a 5) |
| GET | /api/ratings/user/:id | autenticado | Promedio y reseñas |
| GET | /api/notifications | autenticado | Mis notificaciones |
| PATCH | /api/notifications/read-all, /:id/read | autenticado | Marcar como leídas |
| GET | /api/impact/mine | autenticado | Impacto estimado (comidas, CO2e) |
| GET | /api/admin/metrics | admin | Indicadores reales + impacto |
| GET | /api/admin/organizations | admin | Receptores (`?estado=`) |
| PATCH | /api/admin/organizations/:id | admin | Aprobar / rechazar receptor |
| GET | /api/admin/donations | admin | Últimas donaciones |
| GET | /api/admin/reports/donations.csv | admin | Reporte descargable (`?desde=&hasta=`) |

## Pruebas
**Postman:** importar `postman/RescatApp.postman_collection.json` y ejecutarla con *Collection Runner* (con `DEV_SHOW_RESET_LINK=true` en `.env`).

**Automáticas (`npm test`):** usan una base aparte para no ensuciar la demo.
1. En pgAdmin crea la base `rescatapp_test` y ejecuta en ella `database/rescatapp_database.sql`.
2. `npm test`

## Recuperar contraseña
- Desarrollo: con `DEV_SHOW_RESET_LINK=true` el enlace se imprime en la terminal del backend y también se devuelve en la respuesta.
- Producción: poner `DEV_SHOW_RESET_LINK=false` y configurar `SMTP_*` (por ejemplo Gmail con "contraseña de aplicación").

## Iniciar sesión con Google
1. Google Cloud Console → crear proyecto → *APIs y servicios* → *Pantalla de consentimiento OAuth* (externo) → *Credenciales* → *ID de cliente de OAuth* (aplicación web).
2. Orígenes autorizados de JavaScript: `http://localhost:5173`.
3. Copiar el ID en `GOOGLE_CLIENT_ID` (backend, `.env`) y en `VITE_GOOGLE_CLIENT_ID` (frontend, `frontend/.env`).

## Impacto estimado
`src/utils/impacto.js`: 2.5 kg CO2e por kg (FAO, 2013: ≈3.3 Gt CO2e / ≈1.3 Gt de alimento desperdiciado) y 420 g por comida (WRAP). Son **estimaciones con promedios mundiales**, no mediciones propias.
