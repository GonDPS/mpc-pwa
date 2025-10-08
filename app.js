// My Personal Counter – V20
// Cambios: grid mejorada (3 => 2+1), botón Back en detalle, botón Export (CSV), logging de incrementos.

const KEY = 'mpc.items.v5';
let items = [];
let mode = 'overview';
let current = null;

document.addEventListener('DOMContentLoaded', () => {
  items = load();
  bindUI();
  layout();
});

/* ---------- storage ---------- */
function load(){ try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function save(){ localStorage.setItem(KEY, JSON.stringify(items)); }

/* ---------- dates ---------- */
function nowParts(){ const d=new Date(); return { y:d.getFullYear(), m:d.getMonth(), d }; }
const ymKey = (y,m)=> `${y}-${String(m+1).padStart(2,'0')}`;
const monthName = (y,m)=> new Intl.DateTimeFormat('es-ES',{month:'long'}).format(new Date(y,m,1));
const cap = s => s ? s[0].toUpperCase()+s.slice(1) : s;

/* ---------- colors ---------- */
function hexToRgb(hex){ let s=hex.trim(); if(s.startsWith('#')) s=s.slice(1); if(s.length===3) s=s.split('').map(x=>x+x).join(''); const n=parseInt(s,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function rgbToHex({r,g,b}){const h=x=>x.toString(16).padStart(2,'0');return`#${h(r)}${h(g)}${h(b)}`;}
function rgbToHsl({r,g,b}){r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b);let h,s,l=(M+m)/2;if(M===m){h=s=0;}else{const d=M-m;s=l>0.5?d/(2-M-m):d/(M+m);switch(M){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;}h/=6;}return{h,s,l};}
function hslToRgb({h,s,l}){let r,g,b;if(s===0){r=g=b=l;}else{const H=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=H(p,q,h+1/3);g=H(p,q,h);b=H(p,q,h-1/3);}return{r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)};}
function dimColor(hex,f=0.25){ try{const h=rgbToHsl(hexToRgb(hex));h.l=Math.max(0,Math.min(1,h.l*f));return rgbToHex(hslToRgb(h));}catch{return'#333';} }
function ensureContrast(fgHex,bgHex,min=3.5){
  const L=({r,g,b})=>{const s=[r,g,b].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*s[0]+.7152*s[1]+.0722*s[2]};
  let fg=hexToRgb(fgHex), bg=hexToRgb(bgHex), tries=0;
  while(((Math.max(L(fg),L(bg))+.05)/(Math.min(L(fg),L(bg))+.05))<min && tries<6){
    fg={r:Math.max(0,fg.r*.8|0),g:Math.max(0,fg.g*.8|0),b:Math.max(0,fg.b*.8|0)}; tries++;
  }
  return rgbToHex(fg);
}
const PALETTE = ['#9fb4ff','#ffd166','#06d6a0','#ef476f','#ffe9a8','#a0e7e5','#bdb2ff','#ffc6ff','#ffd6a5','#caffbf'];
function nextColor(){
  const used = items.map(i => (i.color||'').toLowerCase());
  for (const c of PALETTE) if (!used.includes(c)) return c;
  const usedH = used.map(c => rgbToHsl(hexToRgb(c)).h);
  const golden = 0.61803398875; let h=(items.length*golden)%1;
  const dist=(a,b)=>{let d=Math.abs(a-b);return Math.min(d,1-d);};
  for(let i=0;i<24;i++){ if(usedH.every(u=>dist(h,u)>0.12)) break; h=(h+golden)%1; }
  return rgbToHex(hslToRgb({h,s:0.62,l:0.70}));
}

/* ---------- history ---------- */
function ensurePeriods(it){
  const {y,m}=nowParts();
  if(!it.monthStat||it.monthStat.year!==y||it.monthStat.month!==m) it.monthStat={year:y,month:m,count:0};
  if(!it.yearStat||it.yearStat.year!==y) it.yearStat={year:y,count:0};
  const k=ymKey(y,m);
  it.historyMonthly ||= {}; it.historyYearly ||= {};
  if(!(k in it.historyMonthly)) it.historyMonthly[k]=0;
  if(!(String(y) in it.historyYearly)) it.historyYearly[String(y)]=0;
}
function snapshot(it){
  return JSON.parse(JSON.stringify({
    count:it.count,monthStat:it.monthStat,yearStat:it.yearStat,
    historyMonthly:it.historyMonthly,historyYearly:it.historyYearly
  }));
}

/* ---------- icons ---------- */
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  info:  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm-1.25 4h2.5v7h-2.5v-7z",
  undo:  "M12 5v4l-4-4 4-4v4a7 7 0 1 1-7 7h2a5 5 0 1 0 5-5z",
  reset: "M12 5V2l5 5-5 5V9a5 5 0 1 0 5 5h2A7 7 0 1 1 12 5z",
  rename:"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  delete:"M6 7h12M10 7v10m4-10v10M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 7h14l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7z",
  back:  "M15 4l-8 8 8 8M7 12h16",            // flecha atrás
  dl:    "M12 3v10m0 0l-4-4m4 4l4-4M5 19h14" // descargar
};

/* ---------- DOM ---------- */
let board,fab,exportFab,modal,nameInput,colorInput,addBtn,cancelBtn;
let infoModal,infoTitle,infoBody,infoClose;
let detail,detailActions,detailTap,detailName,detailCount,detailMonth,detailYear,detailCreated;

function bindUI(){
  board=document.getElementById('board');
  fab=document.getElementById('fab');
  exportFab=document.getElementById('exportFab');
  modal=document.getElementById('modal');
  nameInput=document.getElementById('nameInput');
  colorInput=document.getElementById('colorInput');
  addBtn=document.getElementById('addBtn');
  cancelBtn=document.getElementById('cancelBtn');

  infoModal=document.getElementById('infoModal');
  infoTitle=document.getElementById('infoTitle');
  infoBody=document.getElementById('infoBody');
  infoClose=document.getElementById('infoClose');

  detail=document.getElementById('detail');
  detailActions=document.getElementById('detailActions');
  detailTap=document.getElementById('detailTap');
  detailName=document.getElementById('detailName');
  detailCount=document.getElementById('detailCount');
  detailMonth=document.getElementById('detailMonth');
  detailYear=document.getElementById('detailYear');
  detailCreated=document.getElementById('detailCreated');

  const onFab=(e)=>{ if(e){e.preventDefault();e.stopPropagation();} openModal(); };
  ['click','touchstart','touchend'].forEach(t=>fab.addEventListener(t,onFab,{passive:false}));
  document.addEventListener('click',(e)=>{const t=e.target; if(t && (t.id==='fab'||t.closest?.('#fab'))) onFab(e);},{capture:true});

  const onExport=(e)=>{ if(e){e.preventDefault();e.stopPropagation();} exportCSV(); };
  ['click','touchstart','touchend'].forEach(t=>exportFab.addEventListener(t,onExport,{passive:false}));

  cancelBtn.onclick=closeModal;
  addBtn.onclick=onAdd;
  infoClose.onclick=()=>infoModal.classList.add('hidden');

  window.addEventListener('resize', layout, {passive:true});
  window.addEventListener('orientationchange', ()=> setTimeout(layout,120), {passive:true});
}

/* ---------- create ---------- */
function openModal(){ try{ colorInput.value=nextColor(); }catch{} modal.classList.remove('hidden'); setTimeout(()=>nameInput?.focus(),50); }
function closeModal(){ modal.classList.add('hidden'); nameInput.value=''; }

function onAdd(){
  const {y,m,d}=nowParts();
  const k=ymKey(y,m);
  const name=(nameInput.value||'Contador').trim();
  const color=(colorInput.value||nextColor())||nextColor();
  items.push({
    id:Math.random().toString(36).slice(2),
    name,color,createdAt:d.toISOString(),
    count:0,lastChange:null,
    monthStat:{year:y,month:m,count:0},
    yearStat:{year:y,count:0},
    historyMonthly:{[k]:0},historyYearly:{[String(y)]:0},
    log:[] // para export
  });
  save(); closeModal(); layout();
}

/* ---------- layout (grid mejorada) ---------- */
function layout(){ (mode==='overview') ? renderOverview() : renderDetail(); }

function renderOverview(){
  modal?.classList.add('hidden'); infoModal?.classList.add('hidden'); detail?.classList.add('hidden');
  fab.style.display='block'; exportFab.style.display='block';
  board.innerHTML='';

  const pad=8, W=board.clientWidth-pad*2, H=board.clientHeight-pad*2, X0=pad, Y0=pad;
  const arr=[...items].sort((a,b)=>b.count-a.count);
  if(arr.length===0) return;

  let n=arr.length, cols;
  // lógica móvil → 2 cols cuando hay 4+; caso 3 especial 2+1
  if (W < 520) {
    if (n <= 2) cols = 1;
    else cols = 2;   // 3 o más
  } else {
    cols = Math.min(3, Math.max(1, Math.floor(W / 360)));
    if (cols < 2 && n >= 3) cols = 2;
  }

  // altura por filas estimadas (case 3 tratado abajo)
  let rows = Math.ceil(n / cols);
  let cellW = (W - pad*(cols-1)) / cols;
  let cellH = (H - pad*(rows-1)) / rows;

  arr.forEach((it, i) => {
    const el=document.createElement('div');
    el.className='tile';

    // Layout especial 3 -> 2 arriba + 1 abajo a ancho completo
    if (n===3 && cols===2) {
      if (i<2) { // dos primeras
        const r=0, c=i;
        el.style.left=`${X0 + c*(cellW+pad)}px`;
        el.style.top =`${Y0 + r*(cellH+pad)}px`;
        el.style.width =`${cellW}px`;
        el.style.height=`${cellH}px`;
      } else { // la tercera ocupa todo
        const fullH = (H - pad*(2-1)) / 2; // dos filas
        el.style.left = `${X0}px`;
        el.style.top  = `${Y0 + fullH + pad}px`;
        el.style.width= `${W}px`;
        el.style.height=`${fullH}px`;
      }
    } else {
      const r = Math.floor(i / cols), c = i % cols;
      el.style.left  = `${X0 + c*(cellW+pad)}px`;
      el.style.top   = `${Y0 + r*(cellH+pad)}px`;
      el.style.width = `${cellW}px`;
      el.style.height= `${cellH}px`;
    }

    el.style.background=it.color;
    el.innerHTML=`<div class="center"><div class="name">${it.name}</div><div class="count">${it.count}</div></div>`;
    el.addEventListener('click',()=>openDetail(it),{passive:true});
    board.appendChild(el);
  });
}

/* ---------- detail ---------- */
function openDetail(it){ current=it; mode='detail'; renderDetail(); }
function renderDetail(){
  if(!current){ mode='overview'; return renderOverview(); }
  fab.style.display='none'; exportFab.style.display='none';
  detail.classList.remove('hidden');

  const it=current; ensurePeriods(it);
  detail.style.background=it.color;
  const iconColor=ensureContrast(dimColor(it.color,0.25),'#ffffff',4.0);
  detailActions.style.setProperty('--icon-color',iconColor);
  detailActions.style.setProperty('--icon-bg','rgba(255,255,255,.98)');
  detailActions.style.setProperty('--icon-ring','rgba(255,255,255,.98)');

  const q=s=>detailActions.querySelector(s);
  q('.info').innerHTML   = svg(ICON.info);
  q('.undo').innerHTML   = svg(ICON.undo);
  q('.rename').innerHTML = svg(ICON.rename);
  q('.del').innerHTML    = svg(ICON.delete);
  q('.reset').innerHTML  = svg(ICON.reset);
  q('.back').innerHTML   = svg(ICON.back);

  const mes=cap(monthName(it.monthStat.year,it.monthStat.month));
  const createdStr=new Date(it.createdAt||Date.now()).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
  detailName.textContent=it.name;
  detailCount.textContent=it.count;
  detailMonth.textContent=`${mes}: ${it.monthStat.count}`;
  detailYear.textContent =`${it.yearStat.year}: ${it.yearStat.count}`;
  detailCreated.textContent=`Creado: ${createdStr}`;

  q('.info').onclick =(e)=>{e.stopPropagation();openInfo(it);};
  q('.reset').onclick=(e)=>{e.stopPropagation();doReset(it);};
  q('.undo').onclick =(e)=>{e.stopPropagation();doUndo(it);};
  q('.rename').onclick=(e)=>{e.stopPropagation();doRename(it);};
  q('.del').onclick  =(e)=>{e.stopPropagation();doDelete(it);};
  q('.back').onclick =(e)=>{e.stopPropagation();mode='overview';renderOverview();};

  detailTap.onclick=()=>{
    doIncrement(it);
    mode='overview';
    renderOverview();
  };
}

/* ---------- actions ---------- */
function doIncrement(it){
  ensurePeriods(it);
  it.lastChange=snapshot(it);
  const {y,m}=nowParts(); const k=ymKey(y,m);
  it.count+=1; it.monthStat.count+=1; it.yearStat.count+=1;
  it.historyMonthly[k]=(it.historyMonthly[k]||0)+1;
  it.historyYearly[String(y)]=(it.historyYearly[String(y)]||0)+1;

  // log para export
  it.log ||= [];
  it.log.push({ ts: new Date().toISOString(), countAfter: it.count });

  save();
}
function doReset(it){
  if(!confirm(`Resetear "${it.name}"?`)) return;
  ensurePeriods(it); it.lastChange=snapshot(it);
  const {y,m}=nowParts(); it.count=0; it.monthStat={year:y,month:m,count:0}; it.yearStat={year:y,count:0};
  save(); renderDetail();
}
function doUndo(it){
  if(!it.lastChange){ alert('Nada que deshacer.'); return; }
  const s=it.lastChange;
  it.count=s.count; it.monthStat=s.monthStat; it.yearStat=s.yearStat;
  it.historyMonthly=s.historyMonthly; it.historyYearly=s.historyYearly;
  it.lastChange=null; save();
  mode='overview'; renderOverview();
}
function doRename(it){
  const nuevo=prompt('Nuevo nombre:', it.name);
  if(!nuevo) return; it.name=nuevo.trim(); save(); renderDetail();
}
function doDelete(it){
  if(!confirm(`¿Eliminar "${it.name}"?`)) return;
  items=items.filter(x=>x.id!==it.id); save(); mode='overview'; renderOverview();
}

/* ---------- info ---------- */
function openInfo(it){
  infoTitle.textContent = it.name;
  const months=Object.entries(it.historyMonthly||{}).map(([k,v])=>({k,y:+k.split('-')[0],m:+k.split('-')[1]-1,v})).sort((a,b)=> (a.y!==b.y?b.y-a.y:b.m-a.m));
  const years=Object.entries(it.historyYearly||{}).map(([k,v])=>({y:+k,v})).sort((a,b)=> b.y-a.y);
  const mHtml=months.map(o=>`<li>${cap(monthName(o.y,o.m))}: ${o.v}</li>`).join('')||'<li>—</li>';
  const yHtml=years.map(o=>`<li>${o.y}: ${o.v}</li>`).join('')||'<li>—</li>';
  infoBody.innerHTML=`<div><h3>Por mes</h3><ul>${mHtml}</ul></div><div><h3>Por año</h3><ul>${yHtml}</ul></div>`;
  infoModal.classList.remove('hidden');
}

/* ---------- export CSV ---------- */
function exportCSV(){
  const rows = [];
  rows.push(['id','name','timestamp','year','month','day','hour','minute','countAfter']);
  items.forEach(it=>{
    (it.log||[]).forEach(entry=>{
      const d = new Date(entry.ts);
      rows.push([
        it.id,
        it.name.replaceAll('"','""'),
        entry.ts,
        d.getFullYear(),
        d.getMonth()+1,
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        entry.countAfter
      ]);
    });
  });
  const csv = rows.map(r => r.map(v => (typeof v === 'string' && v.includes(',')) ? `"${v}"` : v).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `mpc_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}