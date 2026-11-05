/* Radial grid-scramble wipe between pages (home → Playground).
   - Click a link with [data-wipe]: a ring of scrambling grid cells expands from the centre of the screen;
     wherever the ring has passed, the page is gone (dark). Then we navigate.
   - On the Playground (body[data-wipe-in]) the same ring runs the other way and opens up the scene.
   Inside the ring each cell flickers between a fragment of the work images (displaced + rescaled, like the
   card grid-split), a dark cell, a beige spark, or nothing. Plain canvas 2D, no libraries. */
(function(){
  "use strict";
  var DARK="#101010", BEIGE="rgba(255,250,238,.92)", BAND=.36;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches, cvs=null, busy=false;
  function hash(n){ var x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }
  function ease(t){ return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; }
  function ready(s){ return s.img.complete&&s.img.naturalWidth>0; }
  function clean(){ if(cvs){ cvs.remove(); cvs=null; } busy=false; }

  /* o: {dir:"out"|"in", imgs:[{img,x,y,w,h,pos}|{img}], dur:sec, done:fn} */
  function wipe(o){
    var dir=o.dir||"out", dur=(o.dur||1.2)*1000, src=o.imgs||[];
    var W=innerWidth, H=innerHeight, dpr=Math.min(devicePixelRatio||1,2);
    var cs=Math.max(34,Math.round(Math.hypot(W,H)/42)), cols=2*Math.ceil((W/cs-1)/2)+1, rows=2*Math.ceil((H/cs-1)/2)+1;   /* odd → a cell sits exactly at the centre */
    var ox=Math.round(W/2-cols*cs/2), oy=Math.round(H/2-rows*cs/2), R=Math.hypot(W/2,H/2)+cs*.5, n=cols*rows;
    var D=new Float32Array(n), Hh=new Float32Array(n), S=new Int16Array(n);
    for(var j=0,k=0;j<rows;j++) for(var i=0;i<cols;i++,k++){
      var cx=ox+i*cs+cs/2, cy=oy+j*cs+cs/2; D[k]=Math.hypot(cx-W/2,cy-H/2)/R; Hh[k]=hash(k+1.3); S[k]=-1;
      for(var q=0;q<src.length;q++){ var s=src[q]; if(s.w&&cx>=s.x&&cx<=s.x+s.w&&cy>=s.y&&cy<=s.y+s.h){ S[k]=q; break; } }   /* which card image sits under this cell */
    }
    var cv=cvs=document.createElement("canvas"); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
    cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;z-index:2147483000;display:block;touch-action:none;pointer-events:"+(dir==="out"?"auto":"none");
    if(dir==="out"){ cv.addEventListener("wheel",function(e){ e.preventDefault(); },{passive:false}); cv.addEventListener("touchmove",function(e){ e.preventDefault(); },{passive:false}); }
    var ctx=cv.getContext("2d"); ctx.scale(dpr,dpr); document.body.appendChild(cv);

    function frag(k,x,y,tq,pool){
      var r3=hash(k*1.9+tq*6.7), r4=hash(k*8.3+tq*4.1), r5=hash(k*2.1+tq*3.3), s=S[k]>=0?src[S[k]]:null, im, fw, fh, u0, v0;
      if(s&&ready(s)){    /* over a card image: show that image's pixels, displaced and rescaled */
        im=s.img; var ia=im.naturalWidth/im.naturalHeight, rr=s.w/s.h, cx0=1, cy0=1; if(ia>rr) cx0=rr/ia; else cy0=ia/rr;
        var pos=s.pos||[.5,.5], sc=.55+r3*1.1; fw=(cs/s.w)*cx0/sc; fh=(cs/s.h)*cy0/sc;
        u0=pos[0]*(1-cx0)+((x+cs/2-s.x)/s.w)*cx0-fw/2+(r4-.5)*.5*cx0; v0=pos[1]*(1-cy0)+((y+cs/2-s.y)/s.h)*cy0-fh/2+(r5-.5)*.5*cy0;
      } else {            /* anywhere else: a random chunk of a random image */
        if(!pool.length) return false; var p=pool[Math.floor(hash(k*4.4+tq*1.1)*pool.length)]; im=p.img;
        var ib=im.naturalWidth/im.naturalHeight; fw=.1+.22*r3; fh=fw*ib; if(fh>1){ fh=1; fw=1/ib; } u0=r4*(1-fw); v0=r5*(1-fh);
      }
      var W2=cs/fw, H2=cs/fh;     /* whole image scaled so that the wanted region lands exactly in the cell (no source-rect maths, so srcset is safe) */
      ctx.save(); ctx.beginPath(); ctx.rect(x,y,cs,cs); ctx.clip(); ctx.drawImage(im,x-u0*W2,y-v0*H2,W2,H2); ctx.restore(); return true;
    }
    function draw(now,f){
      ctx.clearRect(0,0,W,H); var pool=src.filter(ready);
      for(var k=0;k<n;k++){
        var u=(f-D[k])/BAND, v=dir==="out"?u:1-u;      /* v: 0 = page still there, 1 = fully dark */
        if(v<=0) continue;
        var x=ox+(k%cols)*cs, y=oy+((k/cols)|0)*cs;
        if(v>=1){ ctx.fillStyle=DARK; ctx.fillRect(x,y,cs,cs); continue; }
        var tq=Math.floor(now/70+Hh[k]*6), r=hash(k*7.31+tq*1.7);                   /* each cell re-rolls ~14x per second */
        if(r>.12+.88*Math.pow(v,1.3)) continue;                                      /* not covered this tick: the page shows through */
        var r2=hash(k*3.7+tq*9.1);
        if(r2<.86-.8*v&&frag(k,x,y,tq,pool)) continue;
        ctx.fillStyle=(v<.22&&r2>.93)?BEIGE:DARK; ctx.fillRect(x,y,cs,cs);
      }
    }
    var t0=performance.now(); draw(t0,dir==="out"?.04:1+BAND);
    (function tick(now){
      if(cvs!==cv) return;
      var t=Math.min(1,(now-t0)/dur), f=.04+ease(t)*(1+BAND-.04);
      draw(now,f);
      if(t<1) requestAnimationFrame(tick);
      else { if(dir==="in") clean(); if(o.done) o.done(); }
    })(t0);
  }
  window.wayWipe=wipe;

  /* ---------- home → Playground ---------- */
  function collect(){   /* the card images currently on screen, with their on-screen rects */
    var out=[];
    [].forEach.call(document.querySelectorAll(".project .media img"),function(im){
      var r=im.getBoundingClientRect();
      if(!im.complete||!im.naturalWidth||r.width<2||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth) return;
      var op=(getComputedStyle(im).objectPosition||"50% 50%").split(" ");
      out.push({img:im,x:r.left,y:r.top,w:r.width,h:r.height,pos:[parseFloat(op[0])/100,parseFloat(op[1]||"50%")/100]});
    });
    return out;
  }
  function enter(url){
    if(busy) return; busy=true;
    var go=window.WAY_GO||function(u){ location.href=u; };      /* WAY_GO: hook used by the single-file demo */
    if(reduce){ go(url); return; }
    try{ sessionStorage.setItem("way-wipe","1"); }catch(e){}
    wipe({dir:"out",imgs:collect(),done:function(){ go(url); }});
  }
  document.addEventListener("click",function(e){
    var a=e.target.closest&&e.target.closest("a[data-wipe]");
    if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    e.preventDefault(); enter(a.href);
  });
  var pf={};   /* warm the next page while the pointer is over the link, so navigation is instant when the ring ends */
  function prefetch(a){
    if(pf[a.href]) return; pf[a.href]=1;
    (a.getAttribute("data-prefetch")||a.getAttribute("href")).split(/\s+/).filter(Boolean).forEach(function(h){ var l=document.createElement("link"); l.rel="prefetch"; l.href=h; document.head.appendChild(l); });
  }
  ["pointerover","focusin","touchstart"].forEach(function(ev){
    document.addEventListener(ev,function(e){ var a=e.target.closest&&e.target.closest("a[data-wipe]"); if(a) prefetch(a); },{passive:true,capture:true});
  });
  addEventListener("pageshow",function(e){ if(e.persisted) clean(); });   /* back button (bfcache): never leave the dark cover on the home */

  /* ---------- arrival on the Playground ---------- */
  var arrived=false; try{ arrived=sessionStorage.getItem("way-wipe")==="1"; sessionStorage.removeItem("way-wipe"); }catch(e){}
  if(document.body.hasAttribute("data-wipe-in")){
    if(arrived||window.WAY_WIPE_IN){
      if(reduce) document.documentElement.classList.remove("entering");
      else {
        var imgs=(window.PLAY||[]).slice(0,8).map(function(d){ var im=new Image(); im.src=d.thumb||(d.src||"").replace(/-r\.webp$/,"-r-640.webp"); return {img:im}; });
        wipe({dir:"in",imgs:imgs,dur:1.05}); document.documentElement.classList.remove("entering");
      }
    } else document.documentElement.classList.remove("entering");
  }
})();
