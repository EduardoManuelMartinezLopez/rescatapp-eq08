-- Migración v3 (confirmación de correo). Se puede ejecutar sobre la base ya existente SIN borrar datos.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo_verificado BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE usuarios SET correo_verificado = TRUE WHERE correo_verificado = FALSE; -- las cuentas existentes se dan por confirmadas
CREATE TABLE IF NOT EXISTS verificaciones_correo (
    id_verificacion SERIAL PRIMARY KEY,
    id_usuario      INTEGER  NOT NULL REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    token_hash      CHAR(64) NOT NULL UNIQUE,
    expira          TIMESTAMPTZ NOT NULL,
    usado           BOOLEAN  NOT NULL DEFAULT FALSE,
    creado          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
