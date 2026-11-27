/* Модельдер: жалпы көмекші функциялар */
/* ---------- жалпы көмекші функциялар ---------- */
const $ = id => document.getElementById(id);
let COL = {};
function readColors(){
  const s = getComputedStyle(document.documentElement);
  ["bg","panel","ink","muted","line","accent","hot","cold","dye","sim-bg","particle","accent-soft"].forEach(k=>COL[k]=s.getPropertyValue("--"+k).trim());
}
readColors();
export {readColors};
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",readColors);
new MutationObserver(readColors).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});

function prep(cv){
  const W = +cv.getAttribute("width"), H = +cv.getAttribute("height");
  const dpr = Math.min(2, window.devicePixelRatio||1);
  cv.width = W*dpr; cv.height = H*dpr;
  cv.style.aspectRatio = W+" / "+H;
  const ctx = cv.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx, W, H};
}
const fmt = (x,d=0) => x.toLocaleString("kk-KZ",{minimumFractionDigits:d,maximumFractionDigits:d});
function gauss(){ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
const R = 8.314;

/* екі өлшемді серпімді соқтығысу (массалары әртүрлі) */
function collide2D(ps, onHit){
  const n = ps.length;
  for(let i=0;i<n;i++){
    const a = ps[i];
    for(let j=i+1;j<n;j++){
      const b = ps[j];
      const dx=b.x-a.x, dy=b.y-a.y, rr=a.r+b.r;
      if(dx>rr||dx<-rr||dy>rr||dy<-rr) continue;
      const d2=dx*dx+dy*dy;
      if(d2>=rr*rr||d2===0) continue;
      const d=Math.sqrt(d2), nx=dx/d, ny=dy/d;
      const vn=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
      const ov=(rr-d), ma=a.m, mb=b.m, mt=ma+mb;
      a.x-=nx*ov*mb/mt; a.y-=ny*ov*mb/mt; b.x+=nx*ov*ma/mt; b.y+=ny*ov*ma/mt;
      if(vn<=0) continue;
      const J=2*vn/mt;
      a.vx-=J*mb*nx; a.vy-=J*mb*ny; b.vx+=J*ma*nx; b.vy+=J*ma*ny;
      if(onHit) onHit(a,b);
    }
  }
}
function walls2D(p, x0,y0,x1,y1){
  let h=0;
  if(p.x<x0+p.r){p.x=x0+p.r; if(p.vx<0){p.vx=-p.vx; h+=2*p.m*p.vx;}}
  if(p.x>x1-p.r){p.x=x1-p.r; if(p.vx>0){h+=2*p.m*p.vx; p.vx=-p.vx;}}
  if(p.y<y0+p.r){p.y=y0+p.r; if(p.vy<0){p.vy=-p.vy; h+=2*p.m*p.vy;}}
  if(p.y>y1-p.r){p.y=y1-p.r; if(p.vy>0){h+=2*p.m*p.vy; p.vy=-p.vy;}}
  return h;
}
function axes(ctx, L, T, Wd, Ht, xr, yr, xlab, ylab){
  ctx.strokeStyle=COL.line; ctx.lineWidth=1; ctx.fillStyle=COL.muted;
  ctx.font="11px "+getComputedStyle(document.body).getPropertyValue("--f-mono");
  ctx.textAlign="center"; ctx.textBaseline="top";
  const nx=xr.ticks, ny=yr.ticks;
  for(let i=0;i<=nx;i++){ const v=xr.min+(xr.max-xr.min)*i/nx, x=L+Wd*i/nx;
    ctx.beginPath(); ctx.moveTo(x,T); ctx.lineTo(x,T+Ht); ctx.globalAlpha=i?0.5:1; ctx.stroke(); ctx.globalAlpha=1;
    ctx.fillText(xr.f(v), x, T+Ht+5); }
  ctx.textAlign="right"; ctx.textBaseline="middle";
  for(let i=0;i<=ny;i++){ const v=yr.min+(yr.max-yr.min)*i/ny, y=T+Ht-Ht*i/ny;
    ctx.beginPath(); ctx.moveTo(L,y); ctx.lineTo(L+Wd,y); ctx.globalAlpha=i?0.5:1; ctx.stroke(); ctx.globalAlpha=1;
    ctx.fillText(yr.f(v), L-6, y); }
  ctx.textAlign="right"; ctx.textBaseline="bottom"; ctx.fillText(xlab, L+Wd, T+Ht-3);
  ctx.textAlign="left"; ctx.textBaseline="top"; ctx.fillText(ylab, L+4, T+2);
}

export function mountMaxwell(){
  const box = prep($("mxBox")), hist = prep($("mxHist"));
  const N=260, r=7, BW=box.W, BH=box.H, BD=120, U0=2.2;
  let T=300, M=28, paused=false, ps=[];
  const vrmsReal=(T,M)=>Math.sqrt(3*R*T/(M/1000));
  const K = vrmsReal(300,28)/U0;            // (м/с) / (px/кадр)
  const NB=34, FR=50; let ring=[], ri=0;
  function simRms(){ return vrmsReal(T,M)/K; }
  function init(sameSpeed){
    ps=[]; const u=simRms();
    for(let i=0;i<N;i++){
      let vx,vy,vz;
      if(sameSpeed){ vx=gauss();vy=gauss();vz=gauss(); const s=Math.hypot(vx,vy,vz); vx*=u/s; vy*=u/s; vz*=u/s; }
      else { const s=u/Math.sqrt(3); vx=gauss()*s; vy=gauss()*s; vz=gauss()*s; }
      ps.push({x:r+Math.random()*(BW-2*r), y:r+Math.random()*(BH-2*r), z:r+Math.random()*(BD-2*r), vx,vy,vz});
    }
    ring=[]; ri=0;
  }
  function rescale(f){ for(const p of ps){p.vx*=f;p.vy*=f;p.vz*=f;} ring=[]; ri=0; }
  function step(){
    let vmax=0; for(const p of ps){ const s=Math.abs(p.vx)+Math.abs(p.vy)+Math.abs(p.vz); if(s>vmax)vmax=s; }
    const sub=Math.max(1,Math.ceil(vmax/(r*0.9))), dt=1/sub;
    for(let k=0;k<sub;k++){
      for(const p of ps){
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
        if(p.x<r){p.x=r;p.vx=Math.abs(p.vx);} else if(p.x>BW-r){p.x=BW-r;p.vx=-Math.abs(p.vx);}
        if(p.y<r){p.y=r;p.vy=Math.abs(p.vy);} else if(p.y>BH-r){p.y=BH-r;p.vy=-Math.abs(p.vy);}
        if(p.z<r){p.z=r;p.vz=Math.abs(p.vz);} else if(p.z>BD-r){p.z=BD-r;p.vz=-Math.abs(p.vz);}
      }
      const d0=2*r, d02=d0*d0;
      for(let i=0;i<N;i++){ const a=ps[i];
        for(let j=i+1;j<N;j++){ const b=ps[j];
          const dx=b.x-a.x; if(dx>d0||dx<-d0) continue;
          const dy=b.y-a.y; if(dy>d0||dy<-d0) continue;
          const dz=b.z-a.z; const d2=dx*dx+dy*dy+dz*dz;
          if(d2>=d02||d2===0) continue;
          const d=Math.sqrt(d2), nx=dx/d, ny=dy/d, nz=dz/d;
          const vn=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny+(a.vz-b.vz)*nz;
          if(vn<=0) continue;
          a.vx-=vn*nx; a.vy-=vn*ny; a.vz-=vn*nz; b.vx+=vn*nx; b.vy+=vn*ny; b.vz+=vn*nz;
        }
      }
    }
  }
  function vAxisMax(){ return Math.max(1500, Math.ceil(3.4*Math.sqrt(2*R*T/(M/1000))/500)*500); }
  function f(v,T,M){ const m=M/1000, a=m/(2*R*T); return 4*Math.PI*Math.pow(a/Math.PI,1.5)*v*v*Math.exp(-a*v*v); }
  function sample(){
    const vm=vAxisMax(), bins=new Float64Array(NB);
    let sum=0;
    for(const p of ps){ const v=Math.hypot(p.vx,p.vy,p.vz)*K; sum+=v; const b=Math.floor(v/vm*NB); if(b>=0&&b<NB) bins[b]++; }
    ring[ri%FR]=bins; ri++;
    return sum/N;
  }
  let meanSim=0;
  function drawBox(){
    const {ctx,W,H}=box;
    ctx.fillStyle=COL["sim-bg"]; ctx.fillRect(0,0,W,H);
    const order=ps.map((p,i)=>i).sort((a,b)=>ps[a].z-ps[b].z);
    for(const i of order){ const p=ps[i]; const k=0.55+0.45*(p.z/BD);
      ctx.globalAlpha=0.35+0.65*k; ctx.fillStyle = i===0?COL.hot:COL.accent;
      ctx.beginPath(); ctx.arc(p.x,p.y,(i===0?r+2:r)*(0.75+0.45*k),0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha=1;
    const p=ps[0]; ctx.strokeStyle=COL.hot; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(p.x,p.y,r+7,0,Math.PI*2); ctx.stroke();
  }
  function drawHist(){
    const {ctx,W,H}=hist; ctx.fillStyle=COL["sim-bg"]; ctx.fillRect(0,0,W,H);
    const L=52,Tp=26,Wd=W-L-16,Ht=H-Tp-30, vm=vAxisMax(), bw=vm/NB;
    const acc=new Float64Array(NB); const nf=Math.min(ring.length,FR);
    for(let k=0;k<nf;k++){ const b=ring[k]; for(let i=0;i<NB;i++) acc[i]+=b[i]; }
    const dens=[...acc].map(c=>nf? c/(N*nf*bw):0);
    let fmax=f(Math.sqrt(2*R*T/(M/1000)),T,M);
    fmax=Math.max(fmax, ...dens, (T!==300||M!==28)?f(Math.sqrt(2*R*300/0.028),300,28):0)*1.12;
    const xs=v=>L+v/vm*Wd, ys=y=>Tp+Ht-y/fmax*Ht;
    axes(ctx,L,Tp,Wd,Ht,{min:0,max:vm,ticks:5,f:v=>fmt(v)},{min:0,max:fmax,ticks:4,f:v=>(v*1000).toFixed(1)},"v, м/с","f(v)·10⁻³, с/м");
    ctx.fillStyle=COL.accent; ctx.globalAlpha=0.55;
    for(let i=0;i<NB;i++){ const x=xs(i*bw), w=Wd/NB-1.5, y=ys(dens[i]); ctx.fillRect(x+0.75,y,w,Tp+Ht-y); }
    ctx.globalAlpha=1;
    const curve=(TT,MM,color,dash)=>{ ctx.strokeStyle=color; ctx.lineWidth=2; ctx.setLineDash(dash); ctx.beginPath();
      for(let i=0;i<=200;i++){ const v=vm*i/200, x=xs(v), y=ys(f(v,TT,MM)); i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.stroke(); ctx.setLineDash([]); };
    if(T!==300||M!==28) curve(300,28,COL.muted,[5,4]);
    curve(T,M,COL.hot,[]);
    const vp=Math.sqrt(2*R*T/(M/1000));
    ctx.strokeStyle=COL.ink; ctx.lineWidth=1; ctx.setLineDash([2,3]);
    ctx.beginPath(); ctx.moveTo(xs(vp),Tp); ctx.lineTo(xs(vp),Tp+Ht); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=COL.ink; ctx.textAlign="left"; ctx.textBaseline="top"; ctx.fillText("vы",xs(vp)+4,Tp+2);
  }
  function readouts(){
    const m=M/1000;
    $("mxVp").textContent=fmt(Math.sqrt(2*R*T/m))+" м/с";
    $("mxVa").textContent=fmt(Math.sqrt(8*R*T/(Math.PI*m)))+" м/с";
    $("mxVaM").textContent=fmt(meanSim)+" м/с";
    $("mxVr").textContent=fmt(Math.sqrt(3*R*T/m))+" м/с";
    const p=ps[0]; $("mxOne").textContent=fmt(Math.hypot(p.vx,p.vy,p.vz)*K)+" м/с";
  }
  let fc=0;
  function frame(){ if(!paused){ step(); meanSim=sample(); } drawBox(); drawHist(); if(fc++%6===0) readouts(); }
  $("mxT").addEventListener("input",e=>{ const nT=+e.target.value; rescale(Math.sqrt(nT/T)); T=nT; $("mxTo").textContent=nT+" К"; });
  $("mxGas").addEventListener("change",e=>{ const nM=+e.target.value; rescale(Math.sqrt(M/nM)); M=nM; });
  $("mxSame").addEventListener("click",()=>init(true));
  $("mxPause").addEventListener("click",e=>{ paused=!paused; e.target.textContent=paused?"Жалғастыру":"Тоқтату"; });
  init(true);
  return {frame};
}
export function mountBrown(){
  const box=prep($("brBox")), gr=prep($("brGraph"));
  const W=box.W, H=box.H, N=320, r=2.6, BIG=18;
  let T=300, Mb=40, ps=[], big, trail=[], hist=[], hits=0, hitRate=0, t=0, start;
  const u=()=>1.7*Math.sqrt(T/300);
  function init(){
    ps=[]; big={x:W/2,y:H/2,vx:0,vy:0,r:BIG,m:Mb,big:true}; ps.push(big);
    const s=u()/Math.SQRT2;
    while(ps.length<N+1){ const x=r+Math.random()*(W-2*r), y=r+Math.random()*(H-2*r);
      if(Math.hypot(x-big.x,y-big.y)<BIG+r+2) continue;
      ps.push({x,y,vx:gauss()*s,vy:gauss()*s,r,m:1}); }
    trail=[{x:big.x,y:big.y}]; hist=[]; t=0; start={x:big.x,y:big.y};
  }
  function rescale(f){ for(const p of ps){ if(!p.big){p.vx*=f;p.vy*=f;} } }
  function step(){
    let vmax=0; for(const p of ps){ const s=Math.abs(p.vx)+Math.abs(p.vy); if(s>vmax) vmax=s; }
    const sub=Math.max(1,Math.ceil(vmax/(r*0.9))), dt=1/sub;
    for(let k=0;k<sub;k++){
      for(const p of ps){ p.x+=p.vx*dt; p.y+=p.vy*dt; walls2D(p,0,0,W,H); }
      collide2D(ps,(a,b)=>{ if(a.big||b.big) hits++; });
    }
    t++; if(t%2===0){ trail.push({x:big.x,y:big.y}); if(trail.length>4000) trail.shift(); }
    if(t%60===0){ hitRate=hits; hits=0; }
    hist.push(Math.hypot(big.x-start.x,big.y-start.y)); if(hist.length>1200) hist.shift();
  }
  function draw(){
    const {ctx}=box; const hide=$("brHide").checked;
    ctx.fillStyle=COL["sim-bg"]; ctx.fillRect(0,0,W,H);
    if($("brTrail").checked && trail.length>1){ ctx.strokeStyle=COL.hot; ctx.lineWidth=1.4; ctx.globalAlpha=0.8; ctx.beginPath();
      trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.stroke(); ctx.globalAlpha=1; }
    if(!hide){ ctx.fillStyle=COL.particle; for(let i=1;i<ps.length;i++){ const p=ps[i]; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); } }
    const g=ctx.createRadialGradient(big.x-5,big.y-6,2,big.x,big.y,BIG);
    g.addColorStop(0,COL.hot); g.addColorStop(1,COL.dye);
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(big.x,big.y,BIG,0,Math.PI*2); ctx.fill();
    if(hide){ const rg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.32,W/2,H/2,Math.max(W,H)*0.62);
      rg.addColorStop(0,"rgba(0,0,0,0)"); rg.addColorStop(1,"rgba(0,0,0,0.55)"); ctx.fillStyle=rg; ctx.fillRect(0,0,W,H); }
    $("brTag").textContent= hide? "Микроскоп астындағы көрініс":"Сұйықтағы бөлшек · 2D модель";
    const G=gr.ctx, L=46, Tp=22, Wd=gr.W-L-14, Ht=gr.H-Tp-26; G.fillStyle=COL["sim-bg"]; G.fillRect(0,0,gr.W,gr.H);
    const ymax=Math.max(40,Math.ceil(Math.max(0,...hist)/40)*40);
    axes(G,L,Tp,Wd,Ht,{min:0,max:20,ticks:4,f:v=>fmt(v)},{min:0,max:ymax,ticks:2,f:v=>fmt(v)},"t, с","r, шартты бірлік");
    G.strokeStyle=COL.hot; G.lineWidth=1.8; G.beginPath();
    hist.forEach((v,i)=>{ const x=L+i/1200*Wd, y=Tp+Ht-v/ymax*Ht; i?G.lineTo(x,y):G.moveTo(x,y); }); G.stroke();
    if(t%6===0){ $("brDist").textContent=fmt(Math.hypot(big.x-start.x,big.y-start.y))+" бірлік"; $("brHits").textContent=fmt(hitRate); }
  }
  $("brT").addEventListener("input",e=>{ const n=+e.target.value; rescale(Math.sqrt(n/T)); T=n; $("brTo").textContent=n+" К"; });
  $("brM").addEventListener("input",e=>{ Mb=+e.target.value; big.m=Mb; $("brMo").textContent=Mb+" m₀"; });
  $("brReset").addEventListener("click",init);
  $("brClear").addEventListener("click",()=>{ trail=[{x:big.x,y:big.y}]; hist=[]; start={x:big.x,y:big.y}; });
  init();
  return {frame(){ step(); draw(); }};
}
export function mountGas(){
  const box=prep($("gsBox")), gr=prep($("gsGraph"));
  const X0=16, Y0=30, HH=box.H-46, Lref=300, u0=2.0, Nref=150, r=3.2;
  let N=150, T=300, V=1.0, L=Lref, Ltarget=Lref, ps=[], pEMA=0, hitsEMA=0, recs=[], proc="T", axesMode="pV", isoRef=null;
  const C = 100/(Nref*u0*u0/2/(Lref*HH));      // кПа / (модель бірлігі)
  const theoryP=()=>100*(N/Nref)*(T/300)/V;
  function add(n){ const s=u0*Math.sqrt(T/300)/Math.SQRT2;
    for(let i=0;i<n;i++) ps.push({x:X0+r+Math.random()*(L-2*r), y:Y0+r+Math.random()*(HH-2*r), vx:gauss()*s, vy:gauss()*s, r, m:1}); }
  function setN(n){ if(n>ps.length) add(n-ps.length); else ps.length=n; N=n; }
  function thermostat(){ let ke=0; for(const p of ps) ke+=p.vx*p.vx+p.vy*p.vy; const target=ps.length*u0*u0*(T/300);
    if(ke>0){ const f=Math.sqrt(target/ke); for(const p of ps){p.vx*=f;p.vy*=f;} } }
  function step(){
    Ltarget=Lref*V; L+= (Ltarget-L)*0.12; if(Math.abs(L-Ltarget)<0.05) L=Ltarget;
    let vmax=0; for(const p of ps){ const s=Math.abs(p.vx)+Math.abs(p.vy); if(s>vmax) vmax=s; }
    const sub=Math.max(1,Math.ceil(vmax/(r*1.5))), dt=1/sub; let imp=0, hits=0;
    for(let k=0;k<sub;k++) for(const p of ps){ p.x+=p.vx*dt; p.y+=p.vy*dt; const h=walls2D(p,X0,Y0,X0+L,Y0+HH); if(h){imp+=h;hits++;} }
    thermostat();
    const pInst = imp/(2*(L+HH-4*r))*C*((L-2*r)*(HH-2*r))/(L*HH);
    const a=0.006; pEMA = pEMA? pEMA+(pInst-pEMA)*a : theoryP(); hitsEMA = hitsEMA? hitsEMA+(hits*60-hitsEMA)*a : hits*60;
  }
  function drawBox(){
    const {ctx,W,H}=box; ctx.fillStyle=COL["sim-bg"]; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=COL.ink; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(X0+L,Y0); ctx.lineTo(X0,Y0); ctx.lineTo(X0,Y0+HH); ctx.lineTo(X0+L,Y0+HH); ctx.stroke();
    const warm = (T-100)/500;
    ctx.fillStyle = warm>0.5?COL.hot:COL.accent; ctx.globalAlpha=0.85;
    for(const p of ps){ ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha=1;
    ctx.fillStyle=COL.muted; ctx.fillRect(X0+L,Y0-6,10,HH+12);
    ctx.fillRect(X0+L+10,Y0+HH/2-5,W-(X0+L+10),10);
    ctx.fillStyle=COL.ink; ctx.font="12px "+getComputedStyle(document.body).getPropertyValue("--f-mono"); ctx.textAlign="left"; ctx.textBaseline="top";
  }
  function ranges(){
    const pts=recs.concat([{p:pEMA,V,T}]);
    const pmax=Math.max(200,Math.ceil(Math.max(...pts.map(q=>q.p),theoryP())*1.15/100)*100);
    return {p:{min:0,max:pmax,ticks:4,f:v=>fmt(v)}, V:{min:0,max:2,ticks:4,f:v=>fmt(v,1)}, T:{min:0,max:700,ticks:7,f:v=>fmt(v)}};
  }
  function drawGraph(){
    const {ctx,W,H}=gr; ctx.fillStyle=COL["sim-bg"]; ctx.fillRect(0,0,W,H);
    const Lm=52,Tp=24,Wd=W-Lm-16,Ht=H-Tp-30, rg=ranges();
    const [xk,yk] = axesMode==="pV"?["V","p"]:axesMode==="VT"?["T","V"]:["T","p"];
    const lab={p:"p, кПа",V:"V, л",T:"T, К"};
    axes(ctx,Lm,Tp,Wd,Ht,rg[xk],rg[yk],lab[xk],lab[yk]);
    const xs=v=>Lm+(v-rg[xk].min)/(rg[xk].max-rg[xk].min)*Wd, ys=v=>Tp+Ht-(v-rg[yk].min)/(rg[yk].max-rg[yk].min)*Ht;
    ctx.save(); ctx.beginPath(); ctx.rect(Lm,Tp,Wd,Ht); ctx.clip();
    // теориялық сызық: ағымдағы күй арқылы өтетін изосызық
    ctx.strokeStyle=COL.hot; ctx.lineWidth=2; ctx.setLineDash([6,4]); ctx.beginPath();
    const nRT = 100*(N/Nref)/300; // p·V = nRT·T (кПа·л)
    for(let i=0;i<=200;i++){
      let x,y;
      if(axesMode==="pV"){ x=0.2+1.8*i/200; y=nRT*T/x; }
      else if(axesMode==="VT"){ x=700*i/200; y=nRT*x/theoryP(); }
      else { x=700*i/200; y=nRT*x/V; }
      i?ctx.lineTo(xs(x),ys(y)):ctx.moveTo(xs(x),ys(y));
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=COL.accent;
    recs.forEach(q=>{ ctx.beginPath(); ctx.arc(xs(q[xk]),ys(q[yk]),4.5,0,Math.PI*2); ctx.fill(); });
    const cur={p:pEMA,V,T}; ctx.strokeStyle=COL.ink; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(xs(cur[xk]),ys(cur[yk]),6,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  function table(){
    const tb=$("gsTable").querySelector("tbody"); tb.innerHTML="";
    recs.forEach((q,i)=>{ const tr=document.createElement("tr");
      [i+1, fmt(q.p,1), fmt(q.V,2), fmt(q.T), fmt(q.p*q.V,1), fmt(q.p/q.T,3), fmt(q.V/q.T*1000,2)+"·10⁻³"].forEach(v=>{ const td=document.createElement("td"); td.textContent=v; tr.appendChild(td); });
      tb.appendChild(tr); });
    $("gsEmpty").hidden = recs.length>0;
  }
  function syncUI(){
    $("gsV").disabled = proc==="V" || proc==="p";
    $("gsT").disabled = proc==="T";
    $("gsN").disabled = proc!=="free";
    $("gsVo").textContent=fmt(V,2)+" л"; $("gsTo").textContent=fmt(Math.round(T))+" К"; $("gsNo").textContent=N;
    $("gsV").value=V; $("gsT").value=T;
    $("gsGTag").textContent={pV:"p–V диаграммасы",VT:"V–T диаграммасы",pT:"p–T диаграммасы"}[axesMode];
  }
  $("gsProc").addEventListener("change",e=>{ proc=e.target.value; isoRef={V,T,p:theoryP()}; if(proc==="T") axesMode="pV"; if(proc==="V") axesMode="pT"; if(proc==="p") axesMode="VT"; $("gsAxes").value=axesMode; syncUI(); });
  $("gsAxes").addEventListener("change",e=>{ axesMode=e.target.value; syncUI(); });
  $("gsV").addEventListener("input",e=>{ V=+e.target.value; syncUI(); });
  $("gsT").addEventListener("input",e=>{ const nT=+e.target.value;
    if(proc==="p"){ const want=V*nT/T, nV=Math.min(1.8,Math.max(0.5,want)); T = (nV===want)? nT : T*nV/V; V=nV; }
    else T=nT;
    syncUI(); });
  $("gsN").addEventListener("input",e=>{ setN(+e.target.value); syncUI(); });
  $("gsRec").addEventListener("click",()=>{ recs.push({p:pEMA,V,T}); table(); });
  $("gsClr").addEventListener("click",()=>{ recs=[]; table(); });
  add(N); syncUI(); table();
  let fc=0;
  return {frame(){ step(); drawBox(); drawGraph();
    if(fc++%6===0){ $("gsP").textContent=fmt(pEMA,1)+" кПа"; $("gsPt").textContent=fmt(theoryP(),1)+" кПа"; $("gsHits").textContent=fmt(hitsEMA); } }};
}
export function mountDiffusion(){
  const box=prep($("dfBox")), gr=prep($("dfGraph"));
  const W=box.W, H=box.H, gap=14, BWd=(W-gap*3)/2, Y0=28, BHt=H-40, r=3.6, NS=330, ND=60;
  let T1=280, T2=370, paused=false, t=0;
  const boxes=[{x0:gap,T:()=>T1,ps:[],hist:[],col:"cold"},{x0:gap*2+BWd,T:()=>T2,ps:[],hist:[],col:"hot"}];
  const u=TT=>0.8*Math.sqrt(TT/300);
  function fill(b){
    b.ps=[]; const s=u(b.T())/Math.SQRT2, cx=b.x0+BWd/2, cy=Y0+BHt/2;
    for(let i=0;i<ND;i++){ const a=Math.random()*Math.PI*2, d=Math.sqrt(Math.random())*22;
      b.ps.push({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d,vx:gauss()*s,vy:gauss()*s,r,m:1,dye:true}); }
    let tries=0;
    while(b.ps.length<NS+ND && tries<20000){ tries++;
      const x=b.x0+r+Math.random()*(BWd-2*r), y=Y0+r+Math.random()*(BHt-2*r);
      if(Math.hypot(x-cx,y-cy)<28) continue;
      b.ps.push({x,y,vx:gauss()*s,vy:gauss()*s,r,m:1,dye:false}); }
    b.hist=[];
  }
  function reset(){ boxes.forEach(fill); t=0; }
  function rescale(b,f){ for(const p of b.ps){p.vx*=f;p.vy*=f;} }
  function spread(b){ const cx=b.x0+BWd/2, cy=Y0+BHt/2; let s=0,n=0; for(const p of b.ps) if(p.dye){ s+=(p.x-cx)**2+(p.y-cy)**2; n++; } return Math.sqrt(s/n); }
  /* Стокс–Эйнштейн: D ~ T/η(T); судың тұтқырлығы η = A·10^(B/(T−C)) */
  const eta=TT=>2.414e-5*Math.pow(10,247.8/(TT-140));
  const Dsim=TT=>0.5*(TT/eta(TT))/(280/eta(280));   // px²/кадр, 280 К-де 0,5
  function step(){
    for(const b of boxes){
      const sd=Math.sqrt(2*Dsim(b.T()));
      for(const p of b.ps){
        p.x+=gauss()*sd; p.y+=gauss()*sd;
        if(p.x<b.x0+r) p.x=2*(b.x0+r)-p.x; if(p.x>b.x0+BWd-r) p.x=2*(b.x0+BWd-r)-p.x;
        if(p.y<Y0+r) p.y=2*(Y0+r)-p.y; if(p.y>Y0+BHt-r) p.y=2*(Y0+BHt-r)-p.y;
      }
      if(t%3===0){ b.hist.push(spread(b)); if(b.hist.length>800) b.hist.shift(); }
    }
    t++;
  }
  function draw(){
    const {ctx}=box; ctx.fillStyle=COL.bg; ctx.fillRect(0,0,W,H);
    const showS=$("dfSolv").checked;
    const mono=getComputedStyle(document.body).getPropertyValue("--f-mono");
    boxes.forEach((b,i)=>{
      ctx.fillStyle=COL["sim-bg"]; ctx.fillRect(b.x0,Y0,BWd,BHt);
      ctx.strokeStyle=COL[b.col]; ctx.lineWidth=2; ctx.strokeRect(b.x0,Y0,BWd,BHt);
      for(const p of b.ps){ if(!p.dye && !showS) continue;
        ctx.fillStyle=p.dye?COL.dye:COL.particle; ctx.globalAlpha=p.dye?1:0.55;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.dye?r+0.6:r,0,Math.PI*2); ctx.fill(); }
      ctx.globalAlpha=1; ctx.fillStyle=COL[b.col]; ctx.font="600 12px "+mono; ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.fillText((i?"Ыстық су  ":"Суық су  ")+b.T()+" К", b.x0+8, Y0+6);
    });
    const G=gr.ctx, L=46, Tp=22, Wd=gr.W-L-14, Ht=gr.H-Tp-28; G.fillStyle=COL["sim-bg"]; G.fillRect(0,0,gr.W,gr.H);
    const tmax=40, ymax=120;
    axes(G,L,Tp,Wd,Ht,{min:0,max:tmax,ticks:6,f:v=>fmt(v)},{min:0,max:ymax,ticks:3,f:v=>fmt(v)},"t, с","радиус, бірлік");
    boxes.forEach(b=>{ G.strokeStyle=COL[b.col]; G.lineWidth=2; G.beginPath();
      b.hist.forEach((v,i)=>{ const x=L+(i*3/60)/tmax*Wd, y=Tp+Ht-Math.min(v,ymax)/ymax*Ht; i?G.lineTo(x,y):G.moveTo(x,y); }); G.stroke(); });
    if(t%6===0){ $("dfTime").textContent=fmt(t/60,1)+" с"; $("dfR1").textContent=fmt(spread(boxes[0]))+" бірлік"; $("dfR2").textContent=fmt(spread(boxes[1]))+" бірлік"; $("dfD").textContent=fmt(Dsim(T2)/Dsim(T1),1)+" есе"; }
  }
  $("dfT1").addEventListener("input",e=>{ const n=+e.target.value; rescale(boxes[0],Math.sqrt(n/T1)); T1=n; $("dfT1o").textContent=n+" К"; });
  $("dfT2").addEventListener("input",e=>{ const n=+e.target.value; rescale(boxes[1],Math.sqrt(n/T2)); T2=n; $("dfT2o").textContent=n+" К"; });
  $("dfReset").addEventListener("click",reset);
  $("dfPause").addEventListener("click",e=>{ paused=!paused; e.target.textContent=paused?"Жалғастыру":"Тоқтату"; });
  reset();
  return {frame(){ if(!paused && t<tmaxFrames()) step(); draw(); }};
  function tmaxFrames(){ return 40*60; }
}

export { prep, axes, COL, fmt, gauss, $, R };
