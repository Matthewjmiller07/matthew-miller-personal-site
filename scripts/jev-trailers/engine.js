const S=[];let T=0;
const E={lin:t=>t,out:t=>1-Math.pow(1-t,3),in:t=>t*t*t,io:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
 expo:t=>t>=1?1:1-Math.pow(2,-10*t),back:t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)}};
const DEF={o:1,x:0,y:0,s:1,sx:1,r:0,b:0,c:1,cl:1,g:0};
function scene(dur,mood,html,setup){
  const el=document.createElement('div');el.className='scene';el.innerHTML=html;stage.appendChild(el);
  const sc={el,start:T,dur,mood,items:new Map()};
  const a=(sel,at,d,from,to,opt={})=>{
    const els=sel==='@'?[el]:[...el.querySelectorAll(sel)];
    els.forEach((e,i)=>{
      const st=at+(opt.stagger||0)*i;
      if(!sc.items.has(e))sc.items.set(e,{});
      const it=sc.items.get(e);
      for(const k of new Set([...Object.keys(from),...Object.keys(to)])){
        (it[k]=it[k]||[]).push({at:st,d,f:from[k]??DEF[k],t:to[k]??DEF[k],e:E[opt.ease||'out']});
        it[k].sort((p,q)=>p.at-q.at);
      }
    });
  };
  // common helpers
  a.in=(sel,at,opt={})=>a(sel,at,opt.d||.9,{o:0,y:opt.y??40,b:opt.b??10,s:opt.s??1},{o:1,y:0,b:0,s:1},opt);
  a.out=(sel,at,opt={})=>a(sel,at,opt.d||.5,{o:1},{o:0,y:opt.y??-20},{ease:'in',...opt});
  a.wipe=(sel,at,opt={})=>a(sel,at,opt.d||1.1,{c:0,o:1},{c:1,o:1},{ease:'io',...opt});
  a.wipel=(sel,at,opt={})=>a(sel,at,opt.d||1.1,{cl:0,o:1},{cl:1,o:1},{ease:'io',...opt});
  a.glow=(sel,at,opt={})=>a(sel,at,opt.d||.6,{g:0},{g:1},opt);
  setup&&setup(a);
  S.push(sc);T+=dur;
}
function val(list,lt){
  if(lt<list[0].at)return list[0].f;
  let cur=list[0];for(const k of list)if(k.at<=lt)cur=k;
  const p=Math.min(1,Math.max(0,(lt-cur.at)/cur.d));return cur.f+(cur.t-cur.f)*cur.e(p);
}
function renderAt(t){
  for(const sc of S){
    const lt=t-sc.start;const on=lt>=0&&lt<sc.dur;
    sc.el.style.display=on?'block':'none';if(!on)continue;
    const fo=Math.min(1,(sc.dur-lt)/.15);
    sc.el.style.opacity=fo;
    for(const [e,it] of sc.items){
      const v={...DEF};for(const k in it)v[k]=val(it[k],lt);
      e.style.opacity=v.o;
      e.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.s}) scaleX(${v.sx}) rotate(${v.r}deg)`;
      e.style.filter=v.b>0.05?`blur(${v.b}px)`:'none';
      if(it.c)e.style.clipPath=`inset(-20% -20% -20% ${(1-v.c)*100}%)`;
      if(it.cl)e.style.clipPath=`inset(-20% ${(1-v.cl)*100}% -20% -20%)`;
      if(it.g)e.style.setProperty('--g',v.g);
    }
  }
  drawBG(t);
}
