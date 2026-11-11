// Globo terráqueo animado en <canvas>, sin librerías. Puntos de tierra (mapa muy simplificado),
// líneas de latitud/longitud, un marcador pulsante en Oaxaca y arcos que simbolizan la red de donaciones.
//   estados: 'reposo' (gira lento) | 'cargando' (gira rápido, arcos intensos) | 'listo' (se detiene mirando a Oaxaca)
const RAD = Math.PI / 180;
const OAXACA = { lat: 17.06, lon: -96.72 };
const NODOS = [ // ciudades de la red (solo decorativo)
  { lat: 19.43, lon: -99.13 }, { lat: 20.66, lon: -103.35 }, { lat: 25.67, lon: -100.31 }, { lat: 19.17, lon: -96.13 },
  { lat: 16.75, lon: -93.11 }, { lat: 21.16, lon: -86.85 }, { lat: 40.4, lon: -3.7 }, { lat: -34.6, lon: -58.4 },
  { lat: 4.7, lon: -74.07 }, { lat: 34.05, lon: -118.24 },
];
// Contornos MUY aproximados de los continentes [lon, lat]. Solo sirven para dibujar puntos.
const TIERRA = [
  [[-168,66],[-160,70],[-140,70],[-120,72],[-95,72],[-80,73],[-62,60],[-56,52],[-66,45],[-70,42],[-76,35],[-81,31],[-80,25],[-84,30],[-90,29],[-97,26],[-97,21],[-92,18.5],[-87,21],[-88,16],[-83,10],[-80,8],[-84,9],[-88,13],[-95,16],[-105,20],[-110,24],[-113,31],[-117,32],[-124,40],[-124,48],[-135,58],[-148,60],[-158,57]],
  [[-80,9],[-72,12],[-62,10],[-52,5],[-50,0],[-35,-6],[-38,-14],[-41,-22],[-48,-26],[-58,-35],[-65,-41],[-66,-47],[-70,-54],[-74,-50],[-73,-40],[-71,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0],[-77,8]],
  [[-10,36],[-9,43],[-1,46],[-5,48],[2,51],[8,54],[10,58],[5,62],[15,69],[30,71],[60,69],[80,73],[110,77],[140,72],[170,70],[180,66],[165,60],[155,57],[142,52],[135,43],[129,35],[122,40],[122,30],[110,21],[106,10],[100,13],[104,2],[98,8],[92,22],[80,15],[77,8],[72,20],[67,25],[57,25],[50,30],[56,25],[43,13],[35,28],[36,36],[28,41],[24,38],[20,40],[12,44],[16,38],[8,44],[3,43],[-5,36]],
  [[-17,21],[-10,30],[-5,36],[10,37],[20,33],[32,31],[35,28],[43,12],[51,11],[40,-3],[40,-15],[35,-25],[27,-34],[18,-34],[12,-18],[9,-1],[9,4],[-8,4],[-17,14]],
  [[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[131,-31],[115,-34]],
  [[-55,60],[-45,60],[-20,70],[-20,82],[-60,82],[-72,76]],
];

function dentro(lon, lat, poli) { // ray casting
  let d = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i], [xj, yj] = poli[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
const esTierra = (lon, lat) => TIERRA.some((p) => dentro(lon, lat, p));

function vec(lat, lon) { return [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)]; }
function slerp(a, b, t) {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const w = Math.acos(dot), s = Math.sin(w) || 1e-6;
  const k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

export function crearGlobo(canvas, opciones = {}) {
  const ctx = canvas.getContext('2d');
  const reducir = opciones.reducirMovimiento ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Puntos de tierra (rejilla de Fibonacci filtrada)
  const puntos = [];
  const N = 11000;
  for (let i = 0; i < N; i++) {
    const lat = Math.asin(1 - (2 * (i + 0.5)) / N) / RAD;
    const lon = ((i * 137.508) % 360) - 180;
    if (esTierra(lon, lat)) puntos.push({ lat, lon });
  }
  const o = vec(OAXACA.lat, OAXACA.lon);
  const destinos = NODOS.map((n) => ({ ...n, v: vec(n.lat, n.lon) }));

  let rot = (OAXACA.lon * -1 + 70) * RAD, tilt = 18 * RAD; // empieza girado
  let estado = opciones.estado || 'reposo', velocidad = 0.25, t0 = performance.now(), raf = 0, w = 0, h = 0, dpr = 1;
  const objetivoRot = -OAXACA.lon * RAD, objetivoTilt = OAXACA.lat * RAD;

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { medir(); if (reducir) dibujar(performance.now()); }) : null;
  ro?.observe(canvas); medir();
    const reiniciar = () => {
    if (document.hidden) return;
    medir();
    if (reducir) { dibujar(performance.now()); return; }
    cancelAnimationFrame(raf); previo = performance.now(); raf = requestAnimationFrame(bucle);
  };
  document.addEventListener('visibilitychange', reiniciar);
  window.addEventListener('pageshow', reiniciar);
  window.addEventListener('orientationchange', reiniciar);

  function proy(v, R, cx, cy, elev = 1) {
    const l = rot; // rotación en longitud
    const x1 = v[0] * Math.cos(l) + v[2] * Math.sin(l), z1 = -v[0] * Math.sin(l) + v[2] * Math.cos(l), y1 = v[1];
    const y2 = y1 * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = y1 * Math.sin(tilt) + z1 * Math.cos(tilt);
    return { x: cx + R * elev * x1, y: cy - R * elev * y2, z: z2 };
  }

  function dibujar(ahora) {
    if (!w || !h) { medir(); if (!w || !h) return; }
    const t = (ahora - t0) / 1000;
    const R = Math.min(w, h) * 0.4, cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    // halo y esfera
    const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.45);
    halo.addColorStop(0, 'rgba(46,204,113,0.28)'); halo.addColorStop(1, 'rgba(46,204,113,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.45, 0, 7); ctx.fill();
    const esf = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    esf.addColorStop(0, '#16604a'); esf.addColorStop(1, '#06281f');
    ctx.fillStyle = esf; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(110,255,170,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();

    // retícula de latitudes y longitudes (solo lado visible)
    ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(160,255,205,0.16)';
    const traza = (fn, desde, hasta, paso) => {
      let abierto = false; ctx.beginPath();
      for (let a = desde; a <= hasta; a += paso) {
        const p = proy(fn(a), R, cx, cy);
        if (p.z > 0) { abierto ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); abierto = true; } else abierto = false;
      }
      ctx.stroke();
    };
    for (let lat = -60; lat <= 60; lat += 30) traza((a) => vec(lat, a), -180, 180, 4);
    for (let lon = -180; lon < 180; lon += 30) traza((a) => vec(a, lon), -90, 90, 4);

    // puntos de tierra
    for (const p of puntos) {
      const q = proy(vec(p.lat, p.lon), R, cx, cy);
      if (q.z <= 0) continue;
      ctx.fillStyle = `rgba(120,255,175,${0.25 + 0.7 * q.z})`;
      ctx.fillRect(q.x - 0.8, q.y - 0.8, 1.6, 1.6);
    }

    // arcos desde Oaxaca con un punto viajero
    const veloz = estado === 'cargando' ? 2.6 : 0.5;
    destinos.forEach((d, i) => {
      ctx.beginPath(); let abierto = false;
      for (let k = 0; k <= 40; k++) {
        const s = k / 40, v = slerp(o, d.v, s), base = proy(v, R, cx, cy), p = proy(v, R, cx, cy, 1 + 0.22 * Math.sin(Math.PI * s));
        if (base.z > 0.04) { abierto ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); abierto = true; } else abierto = false;
      }
      ctx.strokeStyle = estado === 'cargando' ? 'rgba(255,190,110,0.55)' : 'rgba(255,190,110,0.28)'; ctx.lineWidth = 1; ctx.stroke();
      const s = ((t * veloz * 0.35 + i * 0.37) % 1), vv = slerp(o, d.v, s), pv = proy(vv, R, cx, cy, 1 + 0.22 * Math.sin(Math.PI * s));
      if (proy(vv, R, cx, cy).z > 0.04) { ctx.fillStyle = '#ffd9a8'; ctx.beginPath(); ctx.arc(pv.x, pv.y, 2.2, 0, 7); ctx.fill(); }
      const pn = proy(d.v, R, cx, cy);
      if (pn.z > 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pn.x, pn.y, 2.4, 0, 7); ctx.fill(); }
    });

    // Oaxaca: marcador con ondas
    const po = proy(o, R, cx, cy);
    if (po.z > 0) {
      for (let k = 0; k < 3; k++) {
        const f = ((t * (estado === 'cargando' ? 1.6 : 0.7) + k / 3) % 1);
        ctx.strokeStyle = `rgba(255,170,70,${0.8 * (1 - f)})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(po.x, po.y, 4 + f * 26, 0, 7); ctx.stroke();
      }
      ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.arc(po.x, po.y, 5.5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '600 13px Inter, system-ui, sans-serif'; ctx.fillText('Oaxaca', po.x + 12, po.y - 10);
    }
  }

  let previo = performance.now();
  function bucle(ahora) {
    const dt = Math.max(0, Math.min(0.05, (ahora - previo) / 1000)); previo = ahora;
    if (estado === 'listo') { // se acerca suavemente a Oaxaca
      const k = 1 - Math.pow(0.002, dt);
      let dr = ((objetivoRot - rot + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      rot += dr * k; tilt += (objetivoTilt - tilt) * k;
    } else {
      const meta = estado === 'cargando' ? 2.4 : 0.22;
      velocidad += (meta - velocidad) * (1 - Math.pow(0.05, dt));
      rot += velocidad * dt;
    }
    dibujar(ahora);
    raf = requestAnimationFrame(bucle);
  }
  if (reducir) { rot = objetivoRot; tilt = objetivoTilt; dibujar(performance.now()); }
  else raf = requestAnimationFrame(bucle);

  return {
    setEstado(e) { estado = e; if (reducir) { rot = objetivoRot; tilt = objetivoTilt; dibujar(performance.now()); } },
    destruir() { cancelAnimationFrame(raf); ro?.disconnect(); document.removeEventListener('visibilitychange', reiniciar); window.removeEventListener('pageshow', reiniciar); window.removeEventListener('orientationchange', reiniciar); },
    _fijar(r, tl) { rot = r; tilt = tl; dibujar(performance.now()); }, // para pruebas
  };
}
