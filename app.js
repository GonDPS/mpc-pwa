// --- State & persistence (V4: histórico + info modal) ---
const KEY = 'mpc.items.v4';
let items = [];

document.addEventListener('DOMContentLoaded', () => {
  items = load();
  bindUI();
  layout();
});

function nowParts() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth(), d };
}
const ymKey = (y,m)=> `${y}-${String(m+1).padStart(2,'0')}`;

function load(){
  const v = localStorage.getItem(KEY);
  if (v) { try { return JSON.parse(v) || []; } catch { /* ignore */ } }
  // migraciones antiguas
  const legacy = localStorage.getItem('mpc.items.v3') || localStorage.getItem('mpc.items.v2') || localStorage.getItem('mpc.items.v1');
  if (legacy) {
    try {
      const arr = JSON.parse(legacy) || [];
      const {y, m} = nowParts();
      const k = ymKey(y,m);
      return arr.map(it => ({
        id: it.id || Math.random().toString(36).slice(2),
        name: it.name,
        color: it.color,
        createdAt: it.createdAt || new Date().toISOString(),
        count: it.count || 0,
        monthStat: it.monthStat || { year: y, month: m, count: it.count || 0 },
        yearStat:  it.yearStat  || { year: y, count: it.count || 0 },
        historyMonthly: it.historyMonthly || { [k]: (it.count || 0) },
        historyYearly:  it.historyYearly  || { [String(y)]: (it.count || 0) },
        lastChange: null
      }));
    } catch { /* ignore */ }
  }
  return [];
}
function save(){ localStorage.setItem(KEY, JSON.stringify(items)); }

// --- UI refs ---
let board, fab, modal, nameInput, colorInput, addBtn, cancelBtn;
let infoModal, infoTitle, infoBody, infoClose;

function bindUI(){
  board = document.getElementById('board');
  fab = document.getElementById('fab');
  modal = document.getElementById('modal');
  nameInput = document.getElementById('nameInput');
  colorInput = document.getElementById('colorInput');
  addBtn = document.getElementById('addBtn');
  cancelBtn = document.getElementById('cancelBtn');

  infoModal = document.getElementById('infoModal');
  infoTitle = document.getElementById('infoTitle');
  infoBody  = document.getElementById('infoBody');
  infoClose = document.getElementById('infoClose');

  fab.onclick = openModal;
  cancelBtn.onclick = closeModal;
  addBtn.onclick = onAdd;
  infoClose.onclick = closeInfo;

  window.addEventListener('resize', ()=> layout());
  window.addEventListener('orientationchange', ()=> setTimeout(layout, 100));
}

function openModal(){ modal.classList.remove('hidden'); setTimeout(()=> nameInput.focus(), 50); }
function closeModal(){ modal.classList.add('hidden'); nameInput.value=''; colorInput.value='#9fb4ff'; }
function onAdd(){
  const {y,m,d} = nowParts();
  const k = ymKey(y,m);
  const name = (nameInput.value || 'Contador').trim();
  const color = colorInput.value || '#9fb4ff';
  items.push({
    id: Math.random().toString(36).slice(2),
    name, color,
    createdAt: d.toISOString(),
    count: 0, lastChange:null,
    monthStat: { year: y, month: m, count: 0 },
    yearStat:  { year: y, count: 0 },
    historyMonthly: { [k]: 0 },
    historyYearly:  { [String(y)]: 0 }
  });
  save(); closeModal(); layout();
}
function openInfo(it){
  infoTitle.textContent = it.name;
  infoBody.innerHTML = buildInfoHtml(it);
  infoModal.classList.remove('hidden');
}
function closeInfo(){ infoModal.classList.add('hidden'); }

// --- Helpers ---
function sorted() { return [...items].sort((a,b)=>b.count - a.count); }
function ensurePeriods(it) {
  const {y, m} = nowParts();
  if (!it.monthStat || it.monthStat.year !== y || it.monthStat.month !== m) {
    it.monthStat = { year: y, month: m, count: 0 };
  }
  if (!it.yearStat || it.yearStat.year !== y) {
    it.yearStat = { year: y, count: 0 };
  }
  // asegurar claves en históricos
  const k = ymKey(y,m);
  if (!it.historyMonthly) it.historyMonthly = {};
  if (!it.historyYearly) it.historyYearly = {};
  if (!(k in it.historyMonthly)) it.historyMonthly[k] = 0;
  if (!(String(y) in it.historyYearly)) it.historyYearly[String(y)] = 0;
}
const monthName = (y,m) =>
  new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(y, m, 1));

function buildInfoHtml(it){
  // Meses: ordenar desc por clave YYYY-MM
  const months = Object.entries(it.historyMonthly || {})
    .map(([k,v]) => ({ key:k, y: +k.split('-')[0], m: +k.split('-')[1]-1, v }))
    .sort((a,b)=> (a.y!==b.y ? b.y-a.y : b.m-a.m));
  // Años desc
  const years = Object.entries(it.historyYearly || {})
    .map(([k,v]) => ({ y:+k, v }))
    .sort((a,b)=> b.y-a.y);

  const monthLines = months.map(o => `<li>${capitalize(monthName(o.y,o.m))}: ${o.v}</li>`).join('') || '<li>—</li>';
  const yearLines  = years.map(o => `<li>${o.y}: ${o.v}</li>`).join('') || '<li>—</li>';

  return `
    <div>
      <h3>Por mes</h3>
      <ul>${monthLines}</ul>
    </div>
    <div>
      <h3>Por año</h3>
      <ul>${yearLines}</ul>
    </div>
  `;
}
const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// ---- Color helpers ----
function hexToRgb(hex){ let s=hex.trim(); if(s.startsWith('#')) s=s.slice(1); if(s.length===3) s=s.split('').map(x=>x+x).join(''); const n=parseInt(s,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function rgbToHex({r,g,b}){const h=x=>x.toString(16).padStart(2,'0');return`#${h(r)}${h(g)}${h(b)}`;}
function rgbToHsl({r,g,b}){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;if(max===min){h=s=0;}else{const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;}h/=6;}return{h,s,l};}
function hslToRgb({h,s,l}){let r,g,b;if(s===0){r=g=b=l;}else{const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);}return{r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)};}
function dimColor(hex, factor=0.25){ try{const hsl=rgbToHsl(hexToRgb(hex));hsl.l=Math.max(0,Math.min(1,hsl.l*factor));return rgbToHex(hslToRgb(hsl));}catch{return'#333';} }
function relLum({r,g,b}){ const srgb=[r,g,b].map(v=>{v/=255;return v<=0.03928? v/12.92: Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*srgb[0]+0.7152*srgb[1]+0.0722*srgb[2]; }
function contrastRatio(rgb1,rgb2){ const L1=relLum(rgb1), L2=relLum(rgb2); const max=Math.max(L1,L2), min=Math.min(L1,L2); return (max+0.05)/(min+0.05); }
function ensureContrast(fgHex, bgHex, min=3.5){ let rgb=hexToRgb(fgHex); const bg=hexToRgb(bgHex); let tries=0; while(contrastRatio(rgb,bg)<min && tries<6){ rgb={r:Math.max(0,Math.round(rgb.r*0.8)),g:Math.max(0,Math.round(rgb.g*0.8)),b:Math.max(0,Math.round(rgb.b*0.8))}; tries++; } return rgbToHex(rgb); }

// SVG helpers
const svg = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
const ICON = {
  info:  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm-1.25 4h2.5v7h-2.5v-7z",
  undo:  "M12 5v4l-4-4 4-4v4a7 7 0 1 1-7 7h2a5 5 0 1 0 5-5z",
  reset: "M12 5V2l5 5-5 5V9a5 5 0 1 0 5 5h2A7 7 0 1 1 12 5z",
  rename:"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  delete:"M6 7h12M10 7v10m4-10v10M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 7h14l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7z"
};

// --- Layout & rendering ---
function layout(){
  board.innerHTML = '';
  const w = board.clientWidth;
  const h = board.clientHeight;
  const pad = 8;
  const arr = sorted();

  const place = (it, x,y, ww,hh) => {
    const el = document.createElement('div');
    el.className = 'tile';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${ww}px`;
    el.style.height = `${hh}px`;
    el.style.background = it.color;

    ensurePeriods(it);

    const mes = monthName(it.monthStat.year, it.monthStat.month);
    const created = new Date(it.createdAt || Date.now());
    const createdStr = created.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });

    // Colores de iconos/anillo
    const iconColor = ensureContrast(dimColor(it.color, 0.25), '#ffffff', 4.0);
    const ring = 'rgba(255,255,255,.98)';
    const bg = 'rgba(255,255,255,.98)';

    el.innerHTML = `
      <div class="actions" style="--icon-color:${iconColor}; --icon-bg:${bg}; --icon-ring:${ring}">
        <div class="left-actions">
          <button class="icon-btn info" title="Información">${svg(ICON.info)}</button>
          <button class="icon-btn undo" title="Deshacer">${svg(ICON.undo)}</button>
          <button class="icon-btn rename" title="Renombrar">${svg(ICON.rename)}</button>
          <button class="icon-btn del" title="Eliminar">${svg(ICON.delete)}</button>
        </div>
        <div class="right-actions">
          <button class="icon-btn reset" title="Reset">${svg(ICON.reset)}</button>
        </div>
      </div>
      <div class="name">${it.name}</div>
      <div class="count">${it.count}</div>
      <div class="sub month">${capitalize(mes)}: ${it.monthStat.count}</div>
      <div class="sub year">${it.yearStat.year}: ${it.yearStat.count}</div>
      <div class="created" style="color:${ensureContrast(dimColor(it.color,0.35), it.color, 3.5)}">Creado: ${createdStr}</div>
    `;

    // Click para sumar
    el.addEventListener('click', () => {
      ensurePeriods(it);
      // snapshot completo para UNDO
      it.lastChange = JSON.parse(JSON.stringify({
        count: it.count,
        monthStat: it.monthStat,
        yearStat: it.yearStat,
        historyMonthly: it.historyMonthly,
        historyYearly: it.historyYearly
      }));
      // aplicar incremento
      const {y, m} = nowParts();
      const k = ymKey(y,m);
      it.count += 1;
      it.monthStat.count += 1;
      it.yearStat.count += 1;
      it.historyMonthly[k] = (it.historyMonthly[k]||0) + 1;
      it.historyYearly[String(y)] = (it.historyYearly[String(y)]||0) + 1;

      save(); layout();
    }, {passive:true});

    // Acciones (stop propagation)
    el.querySelector('.info').addEventListener('click', (ev)=>{ ev.stopPropagation(); openInfo(it); });

    el.querySelector('.reset').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const ok = confirm(`Resetear "${it.name}"?`);
      if (!ok) return;
      ensurePeriods(it);
      it.lastChange = JSON.parse(JSON.stringify({
        count: it.count,
        monthStat: it.monthStat,
        yearStat: it.yearStat,
        historyMonthly: it.historyMonthly,
        historyYearly: it.historyYearly
      }));
      const {y,m} = nowParts();
      it.count = 0;
      it.monthStat = { year: y, month: m, count: 0 };
      it.yearStat  = { year: y, count: 0 };
      // Nota: no tocamos históricos
      save(); layout();
    });

    el.querySelector('.undo').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if (!it.lastChange) return alert('Nada que deshacer.');
      const s = it.lastChange;
      it.count = s.count;
      it.monthStat = s.monthStat;
      it.yearStat  = s.yearStat;
      it.historyMonthly = s.historyMonthly;
      it.historyYearly  = s.historyYearly;
      it.lastChange = null;
      save(); layout();
    });

    el.querySelector('.rename').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const nuevo = prompt('Nuevo nombre:', it.name);
      if (!nuevo) return;
      it.name = nuevo.trim();
      save(); layout();
    });

    el.querySelector('.del').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const ok = confirm(`¿Eliminar "${it.name}"? Esta acción no se puede deshacer.`);
      if (!ok) return;
      items = items.filter(x => x.id !== it.id);
      save(); layout();
    });

    board.appendChild(el);
  };

  const W = w - pad*2;
  const H = h - pad*2;
  const X0 = pad, Y0 = pad;
  if (arr.length === 0) return;

  if (arr.length === 1){
    place(arr[0], X0, Y0, W, H);
  } else if (arr.length === 2){
    const wHalf = (W - pad)/2;
    place(arr[0], X0, Y0, wHalf, H);
    place(arr[1], X0 + wHalf + pad, Y0, wHalf, H);
  } else if (arr.length === 3){
    const topH = (H - pad) * 0.45;
    const botH = H - pad - topH;
    const wHalf = (W - pad)/2;
    place(arr[1], X0, Y0, wHalf, topH);
    place(arr[2], X0 + wHalf + pad, Y0, wHalf, topH);
    place(arr[0], X0, Y0 + topH + pad, W, botH);
  } else {
    const minW = 140, minH = 172;
    const cols = Math.max(2, Math.floor(W / (minW + pad)));
    const rows = Math.ceil(arr.length / cols);
    const cellW = (W - pad*(cols-1)) / cols;
    const cellH = Math.max(minH, (H - pad*(rows-1)) / rows);
    arr.forEach((it, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = X0 + c*(cellW + pad);
      const y = Y0 + r*(cellH + pad);
      place(it, x, y, cellW, cellH);
    });
  }
}
