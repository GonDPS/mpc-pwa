// --- State & persistence (V3.1) ---
const KEY = 'mpc.items.v3';
let items = [];

document.addEventListener('DOMContentLoaded', () => {
  // Carga segura
  items = load();
  bindUI();
  layout();
});

function nowParts() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth(), d };
}

function load(){
  const v3 = localStorage.getItem(KEY);
  if (v3) { try { return JSON.parse(v3) || []; } catch { /* ignore */ } }
  const legacy = localStorage.getItem('mpc.items.v2') || localStorage.getItem('mpc.items.v1');
  if (legacy) {
    try {
      const arr = JSON.parse(legacy) || [];
      const {y, m} = nowParts();
      return arr.map(it => ({
        id: it.id || Math.random().toString(36).slice(2),
        name: it.name,
        color: it.color,
        count: it.count || 0,
        lastChange: null,
        createdAt: new Date().toISOString(),
        monthStat: { year: y, month: m, count: it.count || 0 },
        yearStat:  { year: y, count: it.count || 0 }
      }));
    } catch { /* ignore */ }
  }
  return [];
}
function save(){ localStorage.setItem(KEY, JSON.stringify(items)); }

// --- UI refs ---
let board, fab, modal, nameInput, colorInput, addBtn, cancelBtn;

function bindUI(){
  board = document.getElementById('board');
  fab = document.getElementById('fab');
  modal = document.getElementById('modal');
  nameInput = document.getElementById('nameInput');
  colorInput = document.getElementById('colorInput');
  addBtn = document.getElementById('addBtn');
  cancelBtn = document.getElementById('cancelBtn');

  // Aseguramos los listeners (y los reponemos si el SW recarga assets)
  fab.onclick = openModal;
  cancelBtn.onclick = closeModal;
  addBtn.onclick = onAdd;

  window.addEventListener('resize', ()=> layout());
  window.addEventListener('orientationchange', ()=> setTimeout(layout, 100));
}

function openModal(){
  modal.classList.remove('hidden');
  setTimeout(()=> nameInput.focus(), 50);
}
function closeModal(){
  modal.classList.add('hidden');
  nameInput.value = '';
  colorInput.value = '#9fb4ff';
}
function onAdd(){
  const {y,m,d} = nowParts();
  const name = (nameInput.value || 'Contador').trim();
  const color = colorInput.value || '#9fb4ff';
  items.push({
    id: Math.random().toString(36).slice(2),
    name, color,
    createdAt: d.toISOString(),
    count: 0, lastChange:null,
    monthStat: { year: y, month: m, count: 0 },
    yearStat:  { year: y, count: 0 }
  });
  save(); closeModal(); layout();
}

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
}
const monthName = (y,m) =>
  new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(y, m, 1));

// Color helpers (para iconos monocromo más oscuros)
function hexToRgb(hex){ let s=hex.trim(); if(s.startsWith('#')) s=s.slice(1);
  if(s.length===3) s=s.split('').map(x=>x+x).join('');
  const n=parseInt(s,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function rgbToHsl({r,g,b}){ r/=255; g/=255; b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2; if(max===min){h=s=0;} else {const d=max-min;
  s=l>0.5?d/(2-max-min):d/(max+min); switch(max){case r:h=(g-b)/d+(g<b?6:0);break;
  case g:h=(b-r)/d+2;break; case b:h=(r-g)/d+4;break;} h/=6;} return {h,s,l}; }
function hslToRgb({h,s,l}){let r,g,b;if(s===0){r=g=b=l;} else{const hue2rgb=(p,q,t)=>{
  if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;
  if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};const q=l<0.5?l*(1+s):l+s-l*s;
  const p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);}
  return {r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)}; }
function rgbToHex({r,g,b}){const h=x=>x.toString(16).padStart(2,'0');return`#${h(r)}${h(g)}${h(b)}`;}
function dimColor(hex, factor=0.4){ try{const hsl=rgbToHsl(hexToRgb(hex));hsl.l=Math.max(0,Math.min(1,hsl.l*factor));
  return rgbToHex(hslToRgb(hsl));}catch{return'#555';}}

// SVG icon helpers
const svg = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
const ICON = {
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
    const dim = dimColor(it.color, 0.4);
    const created = new Date(it.createdAt || Date.now());
    const createdStr = created.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });

    // Actions bar
    el.innerHTML = `
      <div class="actions" style="--icon-color:${dim}">
        <div class="left-actions">
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
      <div class="sub month">${mes}: ${it.monthStat.count}</div>
      <div class="sub year">${it.yearStat.year}: ${it.yearStat.count}</div>
      <div class="created" style="color:${dim}">Creado: ${createdStr}</div>
    `;

    // Click para sumar
    el.addEventListener('click', () => {
      ensurePeriods(it);
      it.lastChange = {count: it.count, month: {...it.monthStat}, year: {...it.yearStat}};
      it.count += 1;
      it.monthStat.count += 1;
      it.yearStat.count += 1;
      save(); layout();
    }, {passive:true});

    // Acciones (no propagan)
    el.querySelector('.reset').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const ok = confirm(`Resetear "${it.name}"?`);
      if (!ok) return;
      const {y,m} = nowParts();
      it.lastChange = {count: it.count, month: {...it.monthStat}, year: {...it.yearStat}};
      it.count = 0;
      it.monthStat = { year: y, month: m, count: 0 };
      it.yearStat  = { year: y, count: 0 };
      save(); layout();
    });

    el.querySelector('.undo').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if (!it.lastChange) return alert('Nada que deshacer.');
      it.count = it.lastChange.count;
      it.monthStat = it.lastChange.month;
      it.yearStat  = it.lastChange.year;
      it.lastChange = null;
      save(); layout();
    });

    el.querySelector('.rename').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const nuevo = prompt('Nuevo nombre:', it.name);
      if (!nuevo) return;
      it.lastChange = null; // cambio de nombre no afecta contadores
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
    const minW = 140, minH = 170; // algo más alto por barra acciones
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
