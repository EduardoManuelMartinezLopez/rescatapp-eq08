// Genera CSV seguro para Excel (con BOM y protección contra "inyección de fórmulas").
function celda(v) {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function aCsv(columnas, filas) {
  const enc = columnas.map((c) => celda(c.titulo)).join(',');
  const cuerpo = filas.map((f) => columnas.map((c) => celda(f[c.campo])).join(',')).join('\r\n');
  return '﻿' + enc + '\r\n' + cuerpo + (filas.length ? '\r\n' : '');
}
module.exports = { aCsv, celda };
