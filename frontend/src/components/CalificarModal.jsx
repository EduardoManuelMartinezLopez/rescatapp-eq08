import { useState } from 'react';
import { api } from '../api.js';
import { Alerta, Icon, Modal } from './ui.jsx';

// Ventana para calificar de 1 a 5 estrellas tras una recolección completada
export default function CalificarModal({ reserva, a, onCerrar, onListo }) {
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!estrellas) return setError('Elige de 1 a 5 estrellas.');
    setEnviando(true); setError('');
    try {
      await api('/ratings', { method: 'POST', body: { id_reserva: reserva, estrellas, comentario } });
      onListo();
    } catch (e) { setError(e.message); setEnviando(false); }
  }

  return (
    <Modal titulo="Califica la experiencia" onCerrar={onCerrar}>
      <p className="text-sm text-on-surface-variant">¿Cómo fue tu experiencia con <b>{a}</b>?</p>
      <div className="flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} estrellas`} onMouseEnter={() => setHover(n)} onClick={() => setEstrellas(n)}
            className="w-12 h-12 grid place-items-center transition active:scale-90">
            <Icon name="star" className={`!text-[40px] ${(hover || estrellas) >= n ? 'text-secondary' : 'text-outline-variant'}`} />
          </button>
        ))}
      </div>
      <textarea className="input !py-3" rows={3} maxLength={300} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentario (opcional)" />
      <Alerta>{error}</Alerta>
      <button className="btn-primary w-full" onClick={enviar} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar calificación'}</button>
    </Modal>
  );
}
