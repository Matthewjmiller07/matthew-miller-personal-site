import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
const FPS=30;const [W,NW]=process.argv.slice(2).map(Number);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.goto('file://'+process.cwd()+'/video.html?render');await p.evaluate(()=>document.fonts.ready);
const T=await p.evaluate(()=>window.TOTAL);const N=Math.ceil(T*FPS);
const a=Math.floor(N*W/NW),z=Math.floor(N*(W+1)/NW);
const ff=spawn('ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-',
 '-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p',`part${W}.mp4`],{stdio:['pipe','inherit','inherit']});
const t0=Date.now();
for(let i=a;i<z;i++){
  await p.evaluate(t=>renderAt(t),i/FPS);
  const buf=await p.screenshot({type:'jpeg',quality:90});
  if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
  if((i-a)%200==0)console.log(W,i-a,'/',z-a,((Date.now()-t0)/1000).toFixed(0)+'s');
}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log(W,'done');
