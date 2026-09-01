/* script.js — Versión final con tipografía profesional, color picker, persistencia y extracción de paleta */

/* -----------------------------
   Config y datos
   ----------------------------- */
const STORAGE_KEY = 'rtech_brand_color';
const ALTURAS = {
  boca_techo: 2.60,
  boca_pared_alta: 2.20,
  llave_luz: 1.20,
  toma_cocina: 1.20,
  toma_bajo: 0.40
};
const SISTEMAS_ELECTRICOS = {
  monofasico: { conductores: [ { funcion:"Fase (L1)", color:"Marrón", colorHex:"#8B4513" }, { funcion:"Neutro (N)", color:"Celeste", colorHex:"#3B82F6" }, { funcion:"Protección (PE)", color:"Verde/Amarillo", colorHex:"#16A34A" } ] },
  bifasico: { conductores: [ { funcion:"Fase 1 (L1)", color:"Marrón", colorHex:"#8B4513" }, { funcion:"Fase 2 (L2)", color:"Negro", colorHex:"#111827" }, { funcion:"Neutro (N)", color:"Celeste", colorHex:"#3B82F6" }, { funcion:"Protección (PE)", color:"Verde/Amarillo", colorHex:"#16A34A" } ] },
  trifasico_tetrapolar: { conductores: [ { funcion:"Fase 1 (L1)", color:"Marrón", colorHex:"#8B4513" }, { funcion:"Fase 2 (L2)", color:"Negro", colorHex:"#111827" }, { funcion:"Fase 3 (L3)", color:"Rojo", colorHex:"#ef4444" }, { funcion:"Neutro (N)", color:"Celeste", colorHex:"#3B82F6" }, { funcion:"Protección (PE)", color:"Verde/Amarillo", colorHex:"#16A34A" } ] }
};
let memoriaPlano = [];

/* -----------------------------
   SVG helpers
   ----------------------------- */
function svgColorDot(hex, size = 36) {
  const uid = Math.random().toString(36).slice(2,8);
  const fid = `f${hex.replace('#','')}-${uid}`;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img">
      <defs>
        <filter id="${fid}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.12"/>
        </filter>
      </defs>
      <circle cx="12" cy="12" r="9" fill="${hex}" stroke="#ffffff" stroke-width="1.5" filter="url(#${fid})"/>
    </svg>
  `;
}
function svgTrash(size = 16) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" role="img">
    <path d="M3 6h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 11v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14 11v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 6l1-2h4l1 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* -----------------------------
   Utilidades
   ----------------------------- */
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function formatoMetros(value) { return Number.isFinite(value) ? value.toFixed(2) : '0.00'; }

/* -----------------------------
   Lógica principal (tramos)
   ----------------------------- */
function agregarTramo() {
  const idInput = document.getElementById('identificador');
  const distanciaInput = document.getElementById('distancia');

  const identificador = idInput ? idInput.value.trim() : '';
  const sistemaKey = (document.getElementById('sistema') || {}).value || 'monofasico';
  const distancia2D = Number(distanciaInput ? distanciaInput.value : NaN);
  const bocaInicio = (document.getElementById('boca_inicio') || {}).value || null;
  const bocaFin = (document.getElementById('boca_fin') || {}).value || null;

  if (!identificador) { alert("Por favor ingrese un nombre para el tramo."); return; }
  if (!Number.isFinite(distancia2D) || distancia2D <= 0) { alert("Ingrese una distancia válida (> 0)."); return; }

  const hInicio = Number.isFinite(ALTURAS[bocaInicio]) ? ALTURAS[bocaInicio] : 0;
  const hFin = Number.isFinite(ALTURAS[bocaFin]) ? ALTURAS[bocaFin] : 0;
  let distanciaVertical = Math.abs(hInicio - hFin);
  if (distanciaVertical === 0 && bocaInicio === bocaFin) distanciaVertical = 0.50;

  const longitudCaneria = Math.sqrt(Math.pow(distancia2D, 2) + Math.pow(distanciaVertical, 2));
  const longitudCaneriaRounded = Math.round(longitudCaneria * 100) / 100;
  const factorDesperdicio = 1.15;
  const metrosPorConductor = Math.ceil(longitudCaneriaRounded * factorDesperdicio);

  const nuevoTramo = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    nombre: identificador,
    sistema: sistemaKey,
    bocaInicio: bocaInicio,
    bocaFin: bocaFin,
    alturaInicio: hInicio,
    alturaFin: hFin,
    distanciaPlano: distancia2D,
    metrosCaneria: longitudCaneriaRounded,
    metrosCableIndividual: metrosPorConductor
  };

  memoriaPlano.push(nuevoTramo);
  if (idInput) idInput.value = "";
  if (distanciaInput) distanciaInput.value = "";
  renderizarPlano();
}

function eliminarTramo(id) {
  const idNum = Number(id);
  if (!confirm('¿Eliminar este tramo?')) return;
  memoriaPlano = memoriaPlano.filter(tramo => Number(tramo.id) !== idNum);
  renderizarPlano();
}

function renderizarPlano() {
  const estadoVacio = document.getElementById('estado-vacio');
  const tablaContenedor = document.getElementById('tabla-tramos-contenedor');
  const tablaCuerpo = document.getElementById('lista-tramos-tabla');
  const consolidadoContenedor = document.getElementById('consolidado-materiales');
  const tarjetasTotales = document.getElementById('tarjetas-totales');
  const btnPdf = document.getElementById('btn-pdf');

  if (!tablaCuerpo || !tarjetasTotales) return;

  if (memoriaPlano.length === 0) {
    if (estadoVacio) estadoVacio.classList.remove('hidden');
    if (tablaContenedor) tablaContenedor.classList.add('hidden');
    if (consolidadoContenedor) consolidadoContenedor.classList.add('hidden');
    if (btnPdf) btnPdf.classList.add('hidden');
    tablaCuerpo.innerHTML = '';
    tarjetasTotales.innerHTML = '';
    return;
  }

  if (estadoVacio) estadoVacio.classList.add('hidden');
  if (tablaContenedor) tablaContenedor.classList.remove('hidden');
  if (consolidadoContenedor) consolidadoContenedor.classList.remove('hidden');
  if (btnPdf) btnPdf.classList.remove('hidden');

  tablaCuerpo.innerHTML = "";
  const sistemaNombres = { monofasico: "Monofásico", bifasico: "Bifásico", trifasico_tetrapolar: "Trifásico Tetrapolar" };

  memoriaPlano.forEach(tramo => {
    const nombreEsc = escapeHtml(tramo.nombre);
    const sistemaEsc = escapeHtml(sistemaNombres[tramo.sistema] || tramo.sistema);
    const metrosCan = formatoMetros(tramo.metrosCaneria);
    const id = tramo.id;

    const botonEliminar = `
      <button onclick="eliminarTramo(${id})" class="text-rose-500 hover:text-rose-700 font-medium text-xs bg-rose-50 px-2 py-1 rounded-md transition cursor-pointer inline-flex items-center gap-2 icon-accent">
        ${svgTrash(14)} <span class="sr-only">Eliminar tramo</span>
      </button>`;

    tablaCuerpo.innerHTML += `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
        <td class="px-4 py-3 font-semibold text-slate-800">${nombreEsc}
          <div class="text-xs text-slate-400 mt-1">Origen: ${escapeHtml(tramo.bocaInicio || '-') } (${formatoMetros(tramo.alturaInicio)} m) → Destino: ${escapeHtml(tramo.bocaFin || '-')} (${formatoMetros(tramo.alturaFin)} m)</div>
        </td>
        <td class="px-4 py-3 text-xs text-slate-500">${sistemaEsc}</td>
        <td class="px-4 py-3 text-center font-mono font-bold">${metrosCan} m</td>
        <td class="px-4 py-3 text-right">${botonEliminar}</td>
      </tr>
    `;
  });

  // Consolidado por color
  const acumuloCables = {};
  memoriaPlano.forEach(tramo => {
    const sistemaDef = SISTEMAS_ELECTRICOS[tramo.sistema];
    if (!sistemaDef || !Array.isArray(sistemaDef.conductores)) return;
    sistemaDef.conductores.forEach(c => {
      const clave = `${c.color}__${c.funcion}__${c.colorHex}`;
      if (!acumuloCables[clave]) acumuloCables[clave] = 0;
      acumuloCables[clave] += tramo.metrosCableIndividual;
    });
  });

  tarjetasTotales.innerHTML = "";
  const claves = Object.keys(acumuloCables);
  if (claves.length === 0) {
    tarjetasTotales.innerHTML = '<p class="text-sm text-slate-500">No hay materiales calculados.</p>';
    return;
  }

  claves.sort((a,b) => acumuloCables[b] - acumuloCables[a]);
  claves.forEach(clave => {
    const totalMetros = acumuloCables[clave];
    const [color, funcion, colorHex] = clave.split('__');
    const iconSvg = svgColorDot(colorHex || '#3B82F6', 40);

    tarjetasTotales.innerHTML += `
      <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl total-card">
        <div class="flex items-center gap-3">
          <div class="icono-tarjeta">${iconSvg}</div>
          <div>
            <p class="text-sm font-bold text-slate-800">${escapeHtml(funcion)}</p>
            <p class="text-xs text-slate-400 font-medium">Color Reglamentario: ${escapeHtml(color)}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-lg kpi">${escapeHtml(String(totalMetros))} m</span>
        </div>
      </div>
    `;
  });
}

/* -----------------------------
   Export PDF
   ----------------------------- */
function exportarPDF() {
  const elemento = document.getElementById('area-reporte');
  const btn = document.getElementById('btn-pdf');
  if (!elemento) return;
  if (btn) btn.classList.add('hidden');

  const opciones = {
    margin: 0.5,
    filename: `Presupuesto-Cables-AEA-${new Date().toISOString().slice(0,10)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  try {
    html2pdf().set(opciones).from(elemento).save().then(() => {
      if (btn) btn.classList.remove('hidden');
    }).catch(err => {
      console.error('Error exportando PDF:', err);
      if (btn) btn.classList.remove('hidden');
      alert('Error al generar el PDF. Revisa la consola para más detalles.');
    });
  } catch (err) {
    console.error('html2pdf no está disponible o hubo excepción:', err);
    if (btn) btn.classList.remove('hidden');
    alert('No se pudo generar el PDF (html2pdf no cargado).');
  }
}

/* -----------------------------
   Theme / Color helpers
   ----------------------------- */
function setThemeFromHex(hex) {
  try {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const h = hsl.h, s = Math.min(0.92, hsl.s * 1.02);
    const brand700 = hslToHex(h, Math.max(0, s * 0.95), Math.max(0, Math.min(1, hsl.l * 0.88)));
    const brand800 = hslToHex(h, Math.max(0, s * 1.0), Math.max(0, Math.min(1, hsl.l * 0.6)));
    const accent = hex;

    const root = document.documentElement;
    root.style.setProperty('--brand-700', brand700);
    root.style.setProperty('--brand-800', brand800);
    root.style.setProperty('--accent', accent);

    // también actualizar color del color picker si existe
    const picker = document.getElementById('brand-color-picker');
    if (picker) picker.value = accent;
  } catch (err) {
    console.error('setThemeFromHex error:', err);
  }
}
function rgbToHex(r,g,b){ return "#"+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
function hexToRgb(hex){ const m = hex.replace('#',''); return { r: parseInt(m.substring(0,2),16), g: parseInt(m.substring(2,4),16), b: parseInt(m.substring(4,6),16) }; }
function rgbToHsl(r,g,b){ r/=255; g/=255; b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0,s=0,l=(max+min)/2; if (max!==min){ const d=max-min; s = l>0.5? d/(2-max-min): d/(max+min); switch(max){case r: h=(g-b)/d + (g<b?6:0); break; case g: h=(b-r)/d + 2; break; case b: h=(r-g)/d + 4; break;} h/=6;} return {h:s? h:0,s:s,l:l}; }
function hslToHex(h,s,l){ const rgb = hslToRgb(h,s,l); return rgbToHex(Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b)); }
function hslToRgb(h,s,l){ let r,g,b; if (s===0) { r=g=b=l*255; return {r,g,b}; } function hue2rgb(p,q,t){ if (t<0) t+=1; if (t>1) t-=1; if (t<1/6) return p+(q-p)*6*t; if (t<1/2) return q; if (t<2/3) return p+(q-p)*(2/3-t)*6; return p; } const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q; r = hue2rgb(p,q,h + 1/3); g = hue2rgb(p,q,h); b = hue2rgb(p,q,h - 1/3); return { r: r*255, g: g*255, b: b*255 }; }
function setThemeFromRgb(r,g,b){ setThemeFromHex(rgbToHex(r,g,b)); }

/* Extract color from inline SVG (preferred) or <img> */
function applyThemeFromLogo(options = {}) {
  const inlineSvgWrapper = document.getElementById('brand-logo-inline');
  const img = document.getElementById('brand-logo');
  if (options.forceColor) { setThemeFromHex(options.forceColor); return; }

  if (inlineSvgWrapper) {
    const svgElement = inlineSvgWrapper.querySelector('svg');
    if (svgElement) {
      try {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svg64 = encodeURIComponent(svgString);
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + svg64;
        const image = new Image();
        image.onload = () => extractAndApply(image);
        image.onerror = (e) => {
          console.error('No se pudo cargar la imagen SVG serializada:', e);
          // fallback: no aplicar
        };
        image.src = dataUrl;
        return;
      } catch (err) {
        console.error('Error serializando SVG inline:', err);
      }
    }
  }

  if (img) {
    if (!img.complete) img.addEventListener('load', () => extractAndApply(img));
    else extractAndApply(img);
    return;
  }

  // fallback: no hacer nada
  return;

  function extractAndApply(image) {
    try {
      const w = 20, h = 20;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0,0,w,h);
      ctx.drawImage(image, 0, 0, w, h);
      const data = ctx.getImageData(0,0,w,h).data;

      const counts = {};
      for (let i=0;i<data.length;i+=4){
        const r=data[i], g=data[i+1], b=data[i+2], a=data[i+3];
        if (a < 16) continue;
        if (r < 20 && g < 20 && b < 20) continue;
        if (r > 235 && g > 235 && b > 235) continue;
        const key = ((r >> 4) << 16) | ((g >> 4) << 8) | (b >> 4);
        counts[key] = (counts[key] || 0) + 1;
      }

      let bestKey = null, bestCount = 0;
      for (const k in counts) if (counts[k] > bestCount) { bestCount = counts[k]; bestKey = Number(k); }

      if (!bestKey) {
        let rSum=0,gSum=0,bSum=0,cnt=0;
        for (let i=0;i<data.length;i+=4){
          const a=data[i+3]; if (a<16) continue;
          rSum+=data[i]; gSum+=data[i+1]; bSum+=data[i+2]; cnt++;
        }
        if (cnt>0) { setThemeFromRgb(Math.round(rSum/cnt), Math.round(gSum/cnt), Math.round(bSum/cnt)); return; }
        return;
      }

      const rBucket = (bestKey >> 16) & 0xFF, gBucket = (bestKey >> 8) & 0xFF, bBucket = bestKey & 0xFF;
      setThemeFromRgb(rBucket * 17, gBucket * 17, bBucket * 17);
    } catch (err) {
      console.error('Error extrayendo color del logo:', err);
    }
  }
}

/* -----------------------------
   Footer datetime
   ----------------------------- */
function updateFooterDatetime() {
  const el = document.getElementById('footer-datetime');
  if (!el) return;
  const now = new Date();
  const options = { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false };
  el.textContent = now.toLocaleString('es-AR', options);
}

/* -----------------------------
   Color picker UI + persistencia
   ----------------------------- */
function initColorControls() {
  const picker = document.getElementById('brand-color-picker');
  const btnApply = document.getElementById('btn-apply-color');
  const btnReset = document.getElementById('btn-reset-color');

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    if (picker) picker.value = saved;
    setThemeFromHex(saved);
  } else {
    // si no hay guardado, extraer del logo
    applyThemeFromLogo();
  }

  if (btnApply && picker) {
    btnApply.addEventListener('click', () => {
      const hex = picker.value;
      setThemeFromHex(hex);
      localStorage.setItem(STORAGE_KEY, hex);
    });
  }
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      applyThemeFromLogo();
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#00E5FF';
      if (picker) picker.value = (accent.trim() || '#00E5FF');
    });
  }
}

/* -----------------------------
   Inicialización
   ----------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-calculo');
  if (form) form.addEventListener('submit', (e) => { e.preventDefault(); agregarTramo(); });

  initColorControls();

  updateFooterDatetime();
  setInterval(updateFooterDatetime, 1000);

  renderizarPlano();
});