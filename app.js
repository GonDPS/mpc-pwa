// --- State & persistence ---
const KEY = 'mpc.items.v1';
let items = load();

function load(){
  try{ return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch(e){ return []; }
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
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

// Sort by count desc
function sorted() { return [...items].sort((a,b)=>b.count - a.count); }

// Layout rules as requested:
// 1 item: full screen
// 2 items: vertical split half/half
// 3 items: two on top, biggest at bottom spanning full width
// 4+: uniform grid (no microscopic tiles), adaptive min 140px height/width
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
    el.innerHTML = `<div class="name">${it.name}</div><div class="count">${it.count}</div>`;
    el.addEventListener('click', () => {
      it.count += 1; save(); layout();
    }, {passive:true});
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
    // biggest goes bottom (arr[0])
    place(arr[1], X0, Y0, wHalf, topH);
    place(arr[2], X0 + wHalf + pad, Y0, wHalf, topH);
    place(arr[0], X0, Y0 + topH + pad, W, botH);
  } else {
    // Grid uniform
    // choose cols by width; ensure min tile size
    const minW = 140, minH = 120;
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

// --- Add flow ---
function openModal(){
  modal.classList.remove('hidden');
  setTimeout(()=> nameInput.focus(), 50);
}
function closeModal(){
  modal.classList.add('hidden');
  nameInput.value = '';
  colorInput.value = '#9fb4ff';
}
fab.addEventListener('click', openModal);
cancelBtn.addEventListener('click', closeModal);
addBtn.addEventListener('click', ()=>{
  const name = (nameInput.value || 'Contador').trim();
  const color = colorInput.value || '#9fb4ff';
  items.push({ id: uid(), name, color, count: 0 });
  save(); closeModal(); layout();
});

// --- Resize / orientation ---
window.addEventListener('resize', ()=> layout());
window.addEventListener('orientationchange', ()=> setTimeout(layout, 100));

// First paint
layout();
