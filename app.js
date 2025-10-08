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
  s=l>0.5?d/(
