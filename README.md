# RescatApp

Plataforma web para rescatar excedentes de alimentos en Oaxaca de Juárez (ODS 2 y ODS 12). Conecta **donantes** (negocios), **receptores** (comedores y bancos de alimentos validados) y **administradores**.

Proyecto integrador – Gestión de Proyectos de Software – Instituto Tecnológico de Oaxaca – Equipo 8.

## Estructura
| Carpeta | Contenido |
|---|---|
| `database/` | Script SQL de PostgreSQL (tablas, restricciones, datos de demostración) |
| `backend/` | API REST (Node.js + Express) |
| `docs/` | Diseño de interfaces y documentación |

## Base de datos
1. Crear la base `rescatapp` en PostgreSQL.
2. Ejecutar `database/rescatapp_database.sql`.

## Estado del proyecto
En desarrollo por Sprints (cronograma del 26 de octubre al 30 de noviembre de 2026).
- Sprint 0: diseño de interfaces y modelo de datos.
- Sprint 1: servidor con registro e inicio de sesión (JWT y roles).
- Siguientes: donaciones y reservas (Sprint 2), interfaz (Sprint 3), pruebas y despliegue (Sprint 4).
