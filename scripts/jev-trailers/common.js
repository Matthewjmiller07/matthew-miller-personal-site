// Shared by the Jev trailers: background, scene helpers, a data-viz canvas, and the preview loop.
const cv=document.getElementById('bg'),cx=cv.getContext('2d');
const vz=document.getElementById('viz'),vg=vz.getContext('2d');
let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const P=Array.from({length:160},()=>({x:rnd()*1080,y:rnd()*1920,v:20+rnd()*70,r:.8+rnd()*2.8,ph:rnd()*6.28,w:rnd()}));
const MOOD={g:[244,196,106],t:[95,216,230],n:[180,160,200],r:[255,77,94]};
const VIZ=[];   // (ctx, t, sceneIndex) => draws data on top of the background, under the text
function moodAt(t){for(let i=0;i<S.length;i++){const sc=S[i];if(t>=sc.start&&t<sc.start+sc.dur){
  const cur=MOOD[sc.mood],prev=i?MOOD[S[i-1].mood]:cur;const k=Math.min(1,(t-sc.start)/.6);const e=k*k*(3-2*k);
  return cur.map((v,j)=>prev[j]+(v-prev[j])*e);}}return MOOD.n;}
function sceneAt(t){for(let i=0;i<S.length;i++)if(t>=S[i].start&&t<S[i].start+S[i].dur)return i;return -1;}
function drawBG(t){
  const [r,g,b]=moodAt(t).map(Math.round);
  cx.fillStyle='#08070c';cx.fillRect(0,0,1080,1920);
  const gx=540+Math.sin(t*.5)*200,gy=960+Math.cos(t*.4)*300;
  let gr=cx.createRadialGradient(gx,gy,0,gx,gy,1300);
  gr.addColorStop(0,`rgba(${r},${g},${b},0.2)`);gr.addColorStop(.5,`rgba(${r},${g},${b},0.05)`);gr.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=gr;cx.fillRect(0,0,1080,1920);
  cx.save();cx.translate(540,960);cx.rotate(t*.08);cx.font='700 52px "Frank Ruhl Libre"';
  cx.fillStyle=`rgba(${r},${g},${b},0.06)`;const AL='אבגדהוזחטיכלמנסעפצקרשת';
  for(let i=0;i<40;i++){cx.save();cx.rotate(i/40*Math.PI*2);cx.fillText(AL[i%22],0,-480);cx.restore();}
  cx.restore();
  for(const p of P){const y=((p.y-t*p.v)%2020+2020)%2020-50;const x=p.x+Math.sin(t*.9+p.ph)*30;
    const a=.25+.4*Math.sin(t*2.5+p.ph*3)**2;cx.fillStyle=`rgba(${r},${g},${b},${a*(.4+p.w*.6)})`;cx.beginPath();cx.arc(x,y,p.r,0,7);cx.fill();}
  gr=cx.createRadialGradient(540,960,500,540,960,1300);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.8)');
  cx.fillStyle=gr;cx.fillRect(0,0,1080,1920);
  vg.clearRect(0,0,1080,1920);
  const sc=sceneAt(t);
  if(sc>=0){const fo=Math.min(1,(S[sc].start+S[sc].dur-t)/.15,(t-S[sc].start)/.15);vg.save();vg.globalAlpha=Math.max(0,fo);for(const f of VIZ){vg.save();f(vg,t,sc);vg.restore();}vg.restore();}
}
const slam=(a,sel,at)=>a(sel,at,.45,{o:0,s:2.2,b:25},{o:1,s:1,b:0},{ease:'expo'});
const FL='<div class="flash" id="fl"></div>';
const flash=(a,at=0)=>a('#fl',at,.35,{o:.55},{o:0},{ease:'out'});
const drift=(a,d)=>a('@',0,d,{s:1},{s:1.05},{ease:'lin'});
function finish(){
  window.TOTAL=T;window.SCENES=S.map(s=>({start:s.start,dur:s.dur,mood:s.mood}));window.renderAt=renderAt;
  if(!location.search.includes('render')){const t0=performance.now();const loop=()=>{renderAt(((performance.now()-t0)/1000)%T);requestAnimationFrame(loop)};document.fonts.ready.then(loop);}
}
