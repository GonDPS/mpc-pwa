// --- State & persistence (V3) ---
const KEY = 'mpc.items.v3';
let items = load();

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
      const {y, m, d} = nowParts();
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
const board = document.getElementById('board');
const fab = document.getElementById('fab');
const modal = document.getElementById('modal');
const nameInput = document.getElementById('nameInput');
const colorInput = document.getElementById('colorInput');
const addBtn = document.getElementById('addBtn');
const cancelBtn = document.getElementById('cancelBtn');

// --- Helpers ---
const uid = () => Math.random().toString(36).slice(2);
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

// Color helpers
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

    el.innerHTML = `
      <button class="undo" title="Deshacer">↩️</button>
      <button class="reset" title="Reset">⟲</button>
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

    // RESET
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

    // UNDO
    el.querySelector('.undo').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if (!it.lastChange) return alert('Nada que deshacer.');
      it.count = it.lastChange.count;
      it.monthStat = it.lastChange.month;
      it.yearStat  = it.lastChange.year;
      it.lastChange = null;
      save(); layout();
    });

    board.appendChild(el);
  };

  const W = w - pa
