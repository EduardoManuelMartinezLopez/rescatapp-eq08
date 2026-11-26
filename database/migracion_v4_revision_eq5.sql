-- Migración v4 (revisión del Equipo 5). Se puede ejecutar sobre la base ya existente SIN borrar datos.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sesion_desde TIMESTAMPTZ;
