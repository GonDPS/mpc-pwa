// My Personal Counter – V17
// Overview: SOLO tarjetas (nombre + total). Detalle: pantalla completa con botones.

const KEY = 'mpc.items.v4';
let items = [];
let mode = 'overview';           // 'overview' | 'detail'
let current = null;              // item en detalle

document.addEventListener('DOMContentLoaded', () => {
  items = load();
  bindUI();
  layout();
});

/* ---------- Persistencia ---------- */
function load(){ try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function save(){ localStorage.setItem(KEY, JSON.stringify(items)); }

/* ---------- Fechas ---------- */
function nowParts(){ const d=new Date(); return { y:d.getFullYear(), m:d.getMonth(), d }; }
const ymKey = (y,m)=> `${y}-${String(m+1).padStart(2,'0')}`;
const monthName = (y,m)=> new Intl.DateTimeFormat('es-ES',{month:'long'}).format(new Date(y,m,1));
const cap = s => s ? s[0].toUpperCase()+s.slice(1) : s;

/* ---------- Colores ---------- */
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
  const used = items.map(i => i.color.toLowerCase());
  for (const c of PALETTE) if (!used.includes(c)) return c;
  // generar HSL separado de los usados
  const usedH = used.map(c => rgbToHsl(hexToRgb(c)).h);
  const golden = 0.61803398875;
  let h = (items.length * golden) % 1;
  const dist = (a,b)=>{ let d=Math.abs(a-b); return Math.min(d,1-d); };
  for (let i=0;i<24;i++){ if (usedH.every(u=>dist(h,u)>0.12)) break; h=(h+golden)%1; }
  const s=0.62,l=0.70;
  return rgbToHex(hslToRgb({h,s,l}));
}

/* ---------- Histórico ---------- */
function ensurePeriods(it){
  const {y,m} = nowParts();
  if (!it.monthStat || it.monthStat.year!==y || it.monthStat.month!==m) it.monthStat={year:y,month:m,count:0};
  if (!it.yearStat  || it.yearStat.year!==y) it.yearStat={year:y,count:0};
  const k = ymKey(y,m);
  if (!it.historyMonthly) it.historyMonthly={};
  if (!it.historyYearly)  it.historyYearly={};
  if (!(k in it.historyMonthly)) it.historyMonthly[k]=0;
  if (!(String(y) in it.historyYearly))
