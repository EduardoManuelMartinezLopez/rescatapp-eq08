import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alerta, Campo, Cargando, Icon } from '../components/ui.jsx';
import SelectorUbicacion from '../components/SelectorUbicacion.jsx';
import { CATEGORIAS, armarHorario, hoyISO, inputFecha, leerHorario } from '../utils.js';

// Reduce la foto en el navegador (máx. 800 px, JPEG) para que pese poco (el servidor acepta hasta 400 KB)
function reducirFoto(archivo) {
  return new Promise((ok, fallo) => {
    if (!/^image\//.test(archivo.type)) return fallo(new Error('Elige un archivo de imagen.'));
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let lado = 800, calidad = 0.82, data = '';
      for (let i = 0; i < 6; i++) {
        const esc = Math.min(1, lado / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        data = c.toDataURL('image/jpeg', calidad);
        if (data.length * 0.75 < 380 * 1024) return ok(data);
        lado *= 0.8; calidad -= 0.08;
      }
      fallo(new Error('La foto es demasiado pesada. Prueba con otra.'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); fallo(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
function horarioInicial() {
  const a = new Date(Date.now() + 3600000); a.setMinutes(0, 0, 0);
  return { dia: hoyISO(), desde: hhmm(a), hasta: hhmm(new Date(a.getTime() + 3600000)) };
}
const enHoras = (h) => inputFecha(new Date(Date.now() + h * 3600000));

export default function NuevaDonacion() {
  const { id } = useParams();            // si hay id, se está EDITANDO una donación ya publicada
  const editando = !!id;
  const { usuario } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ titulo: '', descripcion: '', categoria: CATEGORIAS[0], kilos: '', fecha_caducidad: enHoras(6), acepta_buena_fe: editando });
  const [dir, setDir] = useState(usuario.direccion || '');
  const [punto, setPunto] = useState(null);
  const [hor, setHor] = useState(horarioInicial());
  const [foto, setFoto] = useState('');
  const [fotoActual, setFotoActual] = useState(false); // la donación ya tenía foto
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [cargando, setCargando] = useState(editando);
  const [error, setError] = useState('');
  const [malo, setMalo] = useState(''); // campo con problema: titulo | kilos | caducidad | horario | direccion
  const [enviando, setEnviando] = useState(false);
  const inputFoto = useRef(null);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setMalo(''); };
  // Marca el campo con problema, lleva la pantalla hasta él y le da el foco
  function fallar(campo, msg) {
    setMalo(campo); setError(msg);
    const el = document.getElementById(`f-${campo}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => (el.matches('input,select,textarea') ? el : el.querySelector('input'))?.focus({ preventScroll: true }), 350);
    }
  }
  const rojo = (c) => (malo === c ? '!border-error ring-2 ring-error/30' : '');
  const msgCampo = (c) => (malo === c && error ? <p className="text-sm text-error font-semibold mt-1 flex gap-1"><Icon name="error" className="!text-[18px]" />{error}</p> : null);

  useEffect(() => {
    if (!editando) return;
    api('/donations/mine').then((d) => {
      const x = d.donaciones.find((q) => String(q.id_donacion) === String(id));
      if (!x) return setError('No encontré esa donación.');
      if (x.estado !== 'publicada') return setError('Esta donación ya no se puede editar porque fue reservada, recogida o venció.');
      setF({ titulo: x.titulo, descripcion: x.descripcion || '', categoria: x.categoria, kilos: String(x.kilos), fecha_caducidad: inputFecha(x.fecha_caducidad), acepta_buena_fe: true });
      setDir(x.direccion); setPunto([Number(x.latitud), Number(x.longitud)]);
      const h = leerHorario(x.horario_recoleccion); if (h) setHor(h);
      setFotoActual(!!x.tiene_foto);
      setCargando(false);
    }).catch((e) => setError(e.message));
  }, [editando, id]);

  async function elegirFoto(e) {
    const a = e.target.files?.[0]; if (!a) return;
    try { setFoto(await reducirFoto(a)); setQuitarFoto(false); setError(''); } catch (err) { setError(err.message); }
    e.target.value = '';
  }

  async function enviar(e) {
    e.preventDefault(); setError(''); setMalo('');
    // Se revisa en el orden en que aparecen los campos y se lleva a la persona al primero que esté mal
    if (f.titulo.trim().length < 3) return fallar('titulo', 'Escribe el título del alimento (mínimo 3 letras).');
    if (!(Number(f.kilos) > 0)) return fallar('kilos', 'Escribe cuántos kilos aproximados hay (mayor que 0).');
    const cad = new Date(f.fecha_caducidad);
    if (!f.fecha_caducidad || Number.isNaN(cad.getTime()) || cad.getTime() <= Date.now()) return fallar('caducidad', 'La fecha de caducidad debe ser posterior a este momento.');
    if (!hor.dia || !hor.desde || !hor.hasta) return fallar('horario', 'Completa el día y las horas de recolección.');
    if (hor.hasta <= hor.desde) return fallar('horario', 'La hora final de recolección debe ser posterior a la hora inicial.');
    if (new Date(`${hor.dia}T${hor.hasta}`).getTime() > cad.getTime()) return fallar('horario', 'La ventana de recolección debe terminar antes de que caduque el alimento.');
    if (dir.trim().length < 5) return fallar('direccion', 'Escribe la dirección de recolección.');
    if (!punto) return fallar('direccion', 'Marca el punto en el mapa: busca la dirección o toca el mapa.');
    setEnviando(true);
    const body = {
      ...f, kilos: Number(f.kilos), direccion: dir, latitud: punto[0], longitud: punto[1],
      horario_recoleccion: armarHorario(hor.dia, hor.desde, hor.hasta), fecha_caducidad: cad.toISOString(), acepta_buena_fe: true,
      ...(foto ? { foto } : {}), ...(editando && quitarFoto && !foto ? { quitar_foto: true } : {}),
    };
    try {
      await api(editando ? `/donations/${id}` : '/donations/publish', { method: editando ? 'PATCH' : 'POST', body });
      nav('/mis-donaciones');
    } catch (err) {
      const txt = [err.message, ...(err.detalles || [])].join(' ');
      const campo = /t[ií]tulo/i.test(txt) ? 'titulo' : /kilos/i.test(txt) ? 'kilos' : /caducidad/i.test(txt) ? 'caducidad' : /direcci|latitud|longitud/i.test(txt) ? 'direccion' : '';
      if (campo) fallar(campo, (err.detalles && err.detalles[0]) || err.message); else setError(err.message);
    }
    finally { setEnviando(false); }
  }

  if (cargando && !error) return <Cargando filas={2} />;
  if (cargando) return <Alerta>{error}</Alerta>;
  const mostrarActual = editando && fotoActual && !quitarFoto && !foto;

  return (
    <form onSubmit={enviar} className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">{editando ? 'Editar donación' : 'Nueva donación'}</h1>
        <p className="text-on-surface-variant">{editando ? 'Corrige lo que necesites. Solo se puede editar mientras nadie la haya apartado.' : 'Comparte tus excedentes con comedores y albergues de la comunidad.'}</p>
      </div>
      {!malo && <Alerta>{error}</Alerta>}

      <div className="card p-5 space-y-4">
        <Campo etiqueta="Título del alimento *"><input id="f-titulo" className={`input ${rojo('titulo')}`} required minLength={3} maxLength={120} value={f.titulo} onChange={set('titulo')} placeholder="Ej. Pan dulce y bolillo del día" />{msgCampo('titulo')}</Campo>
        <Campo etiqueta="Descripción y estado"><textarea className="input !py-3" rows={3} maxLength={500} value={f.descripcion} onChange={set('descripcion')} placeholder="Elaborado hoy, empacado higiénicamente…" /></Campo>
        <div className="grid sm:grid-cols-2 gap-4">
          <Campo etiqueta="Categoría *"><select className="input" value={f.categoria} onChange={set('categoria')}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></Campo>
          <Campo etiqueta="Cantidad aproximada (kg) *"><input id="f-kilos" className={`input ${rojo('kilos')}`} type="number" required min="0.1" max="5000" step="0.1" inputMode="decimal" value={f.kilos} onChange={set('kilos')} />{msgCampo('kilos')}</Campo>
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <p className="text-sm font-semibold">Foto del alimento (opcional)</p>
        <p className="text-xs text-on-surface-variant -mt-2">Es opcional, pero ayuda a las organizaciones a ver el estado del alimento. No incluyas personas.</p>
        {foto || mostrarActual ? (
          <div className="relative animate-pop">
            <img src={foto || `/api/donations/${id}/foto`} alt="Vista previa" className="w-full h-48 object-cover rounded-xl" />
            <button type="button" onClick={() => { setFoto(''); if (fotoActual) setQuitarFoto(true); }} className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/60 text-white grid place-items-center" aria-label="Quitar foto"><Icon name="close" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => inputFoto.current?.click()} className="w-full h-32 rounded-xl border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-low grid place-items-center text-on-surface-variant transition">
            <span className="flex flex-col items-center"><Icon name="add_a_photo" className="text-4xl" />Tomar o elegir foto</span>
          </button>
        )}
        <input ref={inputFoto} type="file" accept="image/*" className="hidden" onChange={elegirFoto} />
      </div>

      <div className="card p-5 space-y-4">
        <div className="rounded-xl bg-secondary-container/25 p-3 text-sm flex gap-2"><Icon name="warning" className="text-secondary" />
          <span><b>Fecha y hora de caducidad (obligatoria).</b> Las organizaciones priorizan recoger lo que vence antes.</span></div>
        <Campo etiqueta="Caduca el *">
          <input id="f-caducidad" className={`input ${rojo('caducidad')}`} type="datetime-local" required min={inputFecha(new Date())} value={f.fecha_caducidad} onChange={set('fecha_caducidad')} />{msgCampo('caducidad')}
        </Campo>
        <div className="flex gap-2 flex-wrap -mt-2">
          {[['En 3 h', 3], ['En 6 h', 6], ['En 12 h', 12], ['Mañana', 24]].map(([t, h]) => (
            <button key={t} type="button" className="px-3 min-h-[36px] rounded-full border border-outline-variant text-sm font-semibold hover:bg-surface-container" onClick={() => setF({ ...f, fecha_caducidad: enHoras(h) })}>{t}</button>
          ))}
        </div>
        <fieldset id="f-horario" className={`space-y-2 rounded-xl ${malo === 'horario' ? 'ring-2 ring-error/40 p-2' : ''}`}>
          <legend className="text-sm font-semibold">Horario de recolección *</legend>
          <div className="grid grid-cols-3 gap-3">
            <label className="block col-span-3 sm:col-span-1"><span className="block text-xs text-on-surface-variant mb-1">Día</span>
              <input className="input" type="date" required min={hoyISO()} value={hor.dia} onChange={(e) => setHor({ ...hor, dia: e.target.value })} /></label>
            <label className="block"><span className="block text-xs text-on-surface-variant mb-1">Desde</span>
              <input className="input" type="time" required value={hor.desde} onChange={(e) => setHor({ ...hor, desde: e.target.value })} /></label>
            <label className="block"><span className="block text-xs text-on-surface-variant mb-1">Hasta</span>
              <input className="input" type="time" required value={hor.hasta} onChange={(e) => setHor({ ...hor, hasta: e.target.value })} /></label>
          </div>
          {msgCampo('horario') || <p className="text-xs text-on-surface-variant">La ventana debe terminar antes de que caduque el alimento.</p>}
        </fieldset>
      </div>

      <div id="f-direccion" className={`card p-5 space-y-2 ${malo === 'direccion' ? '!border-error ring-2 ring-error/30' : ''}`}>
        <p className="text-sm font-semibold">Dirección de recolección *</p>
        <SelectorUbicacion direccion={dir} onDireccion={setDir} punto={punto} onPunto={setPunto} />
        {msgCampo('direccion')}
      </div>

      {!editando && (
        <label className="card p-5 flex gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 w-6 h-6 accent-primary" checked={f.acepta_buena_fe} onChange={(e) => setF({ ...f, acepta_buena_fe: e.target.checked })} required />
          <span className="text-sm"><b>Declaración de buena fe.</b> Declaro que el alimento está en condiciones aptas para consumo humano y que lo dono sin costo. Entiendo que RescatApp no garantiza su inocuidad ni transporta alimentos.</span>
        </label>
      )}
      <div className="flex gap-3">
        {editando && <button type="button" className="btn-ghost" onClick={() => nav('/mis-donaciones')}>Cancelar</button>}
        <button className="btn-primary flex-1" disabled={enviando}><Icon name={editando ? 'save' : 'cloud_upload'} />{enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Publicar donación'}</button>
      </div>
    </form>
  );
}
