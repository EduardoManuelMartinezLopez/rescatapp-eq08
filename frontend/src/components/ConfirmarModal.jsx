import { useState } from 'react';
import { Modal } from './ui.jsx';

// Ventana de confirmación propia de la app (reemplaza el cuadro feo del navegador)
export default function ConfirmarModal({ titulo, texto, textoBoton = 'Confirmar', peligro = false, onConfirmar, onCerrar }) {
  const [enviando, setEnviando] = useState(false);
  async function ok() { setEnviando(true); try { await onConfirmar(); } finally { onCerrar(); } }
  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>
      <p className="text-on-surface-variant">{texto}</p>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={onCerrar} disabled={enviando}>Volver</button>
        <button className={peligro ? 'btn-danger' : 'btn-primary'} onClick={ok} disabled={enviando}>{enviando ? 'Un momento…' : textoBoton}</button>
      </div>
    </Modal>
  );
}
