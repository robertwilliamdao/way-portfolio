/* Home ⇄ Playground: ONE radial grid-scramble.
   The Playground is an iframe laid over the home page (the home stays alive underneath, so Back never reloads it).
   A ring of grid cells expands from the centre of the screen: outside the ring = home, inside = Playground
   (the iframe is revealed through a clip-path made of the cells). Cells in the ring flicker between the two and
   are covered by scrambled fragments of the work images (home pieces on the outer side, globe pieces on the inner side).
   Back = the same ring played in reverse. Plain canvas 2D + clip-path, no libraries. */
(function(){
  "use strict";
  var DARK="#101010", BEIGE="rgba(255,250,238,.92)", BAND=.4, F0=.04, FMAX=1+BAND, DUR=1.25;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var frame=null, loaded=false, inPlay=false, busy=false, cvs=null, hist=false, playImgs=null, playLoading=false, pend=null;
  function hash(n){ var x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }
  function ease(t){ return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; }
  function ready(s){ return s.img.complete&&s.img.naturalWidth>0; }
  var css=document.createElement("style");   /* while in the Playground the home underneath is not painted */
  css.textContent="html.in-play body>*:not(iframe[data-way]):not(canvas[data-way]){visibility:hidden}";
  document.head.appendChild(css);
  function lock(){ var sb=innerWidth-document.documentElement.clientWidth; document.documentElement.style.overflow="hidden"; document.body.style.paddingRight=sb+"px"; }
  function unlock(){ document.documentElement.style.overflow=""; document.body.style.paddingRight=""; }

  /* ---------- sources for the scrambled fragments ---------- */
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
  function playData(){   /* thumbnails of the globe: used for fragments, and warms the cache for the iframe */
    if(playImgs||playLoading) return;
    var mk=function(){ playImgs=(window.PLAY||[]).slice(0,8).map(function(d){ var im=new Image(); im.src=d.thumb||(d.src||"").replace(/-r\.webp$/,"-r-640.webp"); return {img:im}; }); };
    if(window.PLAY){ mk(); return; }
    playLoading=true; var s=document.createElement("script"); s.src="data/play.js"; s.onload=mk; document.head.appendChild(s);
  }

  /* ---------- the ring. dir "in": home → Playground. dir "out": Playground → home (same ring, reversed) ---------- */
  function run(dir,done){
    var imgs=collect(), W=innerWidth, H=innerHeight, dpr=Math.min(devicePixelRatio||1,2);
    var cs=Math.max(34,Math.round(Math.hypot(W,H)/42)), cols=2*Math.ceil((W/cs-1)/2)+1, rows=2*Math.ceil((H/cs-1)/2)+1;   /* odd → a cell sits exactly at the centre */
    var ox=Math.round(W/2-cols*cs/2), oy=Math.round(H/2-rows*cs/2), R=Math.hypot(W/2,H/2)+cs*.5, n=cols*rows;
    var D=new Float32Array(n), Hh=new Float32Array(n), S=new Int16Array(n), base=new Uint8Array(n);
    for(var j=0,k=0;j<rows;j++) for(var i=0;i<cols;i++,k++){
      var cx=ox+i*cs+cs/2, cy=oy+j*cs+cs/2; D[k]=Math.hypot(cx-W/2,cy-H/2)/R; Hh[k]=hash(k+1.3); S[k]=-1;
      for(var q=0;q<imgs.length;q++){ var s=imgs[q]; if(cx>=s.x&&cx<=s.x+s.w&&cy>=s.y&&cy<=s.y+s.h){ S[k]=q; break; } }   /* which card image sits under this cell */
    }
    var cv=cvs=document.createElement("canvas"); cv.setAttribute("data-way","1"); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
    cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;z-index:2147483000;display:block;touch-action:none";
    cv.addEventListener("wheel",function(e){ e.preventDefault(); },{passive:false}); cv.addEventListener("touchmove",function(e){ e.preventDefault(); },{passive:false});
    var ctx=cv.getContext("2d"); ctx.scale(dpr,dpr); document.body.appendChild(cv);
    var pool=[], ppool=[];

    function frag(k,x,y,tq,u){
      var r3=hash(k*1.9+tq*6.7), r4=hash(k*8.3+tq*4.1), r5=hash(k*2.1+tq*3.3), fromGlobe=hash(k*2.9+tq*5.3)<u*1.1-.05;   /* inner side of the ring → globe pieces */
      var im, fw, fh, u0, v0, s=!fromGlobe&&S[k]>=0?imgs[S[k]]:null;
      if(s&&ready(s)){    /* over a card image: that image's own pixels, displaced and rescaled */
        im=s.img; var ia=im.naturalWidth/im.naturalHeight, rr=s.w/s.h, cx0=1, cy0=1; if(ia>rr) cx0=rr/ia; else cy0=ia/rr;
        var pos=s.pos, sc=.55+r3*1.1; fw=(cs/s.w)*cx0/sc; fh=(cs/s.h)*cy0/sc;
        u0=pos[0]*(1-cx0)+((x+cs/2-s.x)/s.w)*cx0-fw/2+(r4-.5)*.5*cx0; v0=pos[1]*(1-cy0)+((y+cs/2-s.y)/s.h)*cy0-fh/2+(r5-.5)*.5*cy0;
      } else {            /* anywhere else: a random chunk of a random image */
        var P=fromGlobe&&ppool.length?ppool:pool; if(!P.length) return false;
        im=P[Math.floor(hash(k*4.4+tq*1.1)*P.length)].img; var ib=im.naturalWidth/im.naturalHeight; fw=.1+.22*r3; fh=fw*ib; if(fh>1){ fh=1; fw=1/ib; } u0=r4*(1-fw); v0=r5*(1-fh);
      }
      var W2=cs/fw, H2=cs/fh;   /* whole image scaled so the wanted region lands exactly in the cell (no source-rect maths, so srcset is safe) */
      ctx.save(); ctx.beginPath(); ctx.rect(x,y,cs,cs); ctx.clip(); ctx.drawImage(im,x-u0*W2,y-v0*H2,W2,H2); ctx.restore(); return true;
    }
    function clipOf(){   /* the cells that show the Playground, as one path (runs of cells per row) */
      var d="";
      for(var j=0;j<rows;j++){
        var y=oy+j*cs, st=-1;
        for(var i=0;i<=cols;i++){
          var on=i<cols&&base[j*cols+i]===1;
          if(on&&st<0) st=i;
          if(!on&&st>=0){ var w=(i-st)*cs; d+="M"+(ox+st*cs)+" "+y+"h"+w+"v"+cs+"h-"+w+"z"; st=-1; }
        }
      }
      return d?'path("'+d+'")':"inset(50%)";
    }
    function paint(now,f){
      pool=imgs.filter(ready); ppool=(playImgs||[]).filter(ready); ctx.clearRect(0,0,W,H);
      for(var k=0;k<n;k++){
        var u=(f-D[k])/BAND;
        if(u<=0){ base[k]=0; continue; }
        if(u>=1){ base[k]=1; continue; }
        var tq=Math.floor(now/70+Hh[k]*6);                                    /* each cell re-rolls ~14x per second */
        base[k]=hash(k*7.31+tq*1.7)<u*u*(3-2*u)?1:0;                          /* flickers between home (0) and Playground (1) */
        var ro=hash(k*3.7+tq*9.1), po=.55*Math.sin(Math.PI*Math.pow(u,.8));   /* chance of being covered: peaks mid-ring */
        if(ro>=po) continue;
        var x=ox+(k%cols)*cs, y=oy+((k/cols)|0)*cs, qq=ro/po;
        if(qq<.66&&frag(k,x,y,tq,u)) continue;
        ctx.fillStyle=qq>.86?BEIGE:DARK; ctx.fillRect(x,y,cs,cs);
      }
      frame.style.clipPath=clipOf();
    }
    var t0=performance.now();
    (function tick(now){
      var t=Math.min(1,(now-t0)/(DUR*1000)), e=ease(t), f=dir==="in"?F0+e*(FMAX-F0):FMAX-e*(FMAX-F0);
      paint(now,f);
      if(t<1) requestAnimationFrame(tick);
      else { cv.remove(); if(cvs===cv) cvs=null; done(); }
    })(t0);
  }

  /* ---------- enter / leave ---------- */
  function ensureFrame(){
    if(frame) return frame;
    frame=document.createElement("iframe"); frame.title="Playground"; frame.setAttribute("data-way","1");
    frame.style.cssText="position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147482000;background:#101010;color-scheme:dark;visibility:hidden;clip-path:inset(50%)";
    frame.onload=function(){ loaded=true; };
    /*PLAYSRC*/frame.src="play.html?embed=1";
    document.body.appendChild(frame); return frame;
  }
  function pushHist(){ try{ history.pushState({way:"play"},"","#playground"); hist=true; }catch(e){} }
  function enter(fromPop){
    if(busy||inPlay) return; busy=true; playData();
    var fr=ensureFrame(), again=loaded&&fr.style.display==="none";
    fr.style.display="block"; fr.style.visibility="visible"; fr.style.pointerEvents="none";
    if(again){ try{ fr.contentWindow.postMessage({way:"start"},"*"); }catch(e){} }   /* replay the globe's intro */
    if(!fromPop) pushHist();
    lock();
    var fin=function(){
      fr.style.clipPath="none"; fr.style.pointerEvents="auto"; document.documentElement.classList.add("in-play"); inPlay=true; busy=false;
      try{ fr.contentWindow.focus(); }catch(e){}
      settle();
    };
    if(reduce) fin(); else run("in",fin);
  }
  function leave(){
    if(busy||!inPlay) return; busy=true;
    document.documentElement.classList.remove("in-play"); frame.style.pointerEvents="none";
    var fin=function(){ frame.style.display="none"; frame.style.visibility="hidden"; frame.style.clipPath="inset(50%)"; unlock(); inPlay=false; busy=false; settle(); };
    if(reduce) fin(); else run("out",fin);
  }
  function settle(){   /* a browser Back/Forward that arrived while the ring was running */
    var p=pend; pend=null;
    if(p==="leave"&&inPlay) leave(); else if(p==="enter"&&!inPlay) enter(true);
  }
  function back(){   /* Back button in the Playground */
    if(hist){ hist=false; try{ history.back(); setTimeout(function(){ if(inPlay&&!busy) leave(); },500); return; }catch(e){} }
    leave();
  }
  addEventListener("popstate",function(e){   /* browser Back / Forward */
    if(busy){ pend=e.state&&e.state.way==="play"?"enter":"leave"; return; }
    if(inPlay&&!busy&&!(e.state&&e.state.way==="play")){ hist=false; leave(); }
    else if(!inPlay&&!busy&&e.state&&e.state.way==="play"){ hist=true; enter(true); }
  });
  addEventListener("message",function(e){ if(frame&&e.source===frame.contentWindow&&e.data&&e.data.way==="back") back(); });
  document.addEventListener("click",function(e){
    var a=e.target.closest&&e.target.closest("a[data-wipe]");
    if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    e.preventDefault(); enter();
  });
  var pf={};   /* warm the Playground while the pointer is over the link, so it is ready when the ring starts */
  function prefetch(a){
    if(pf[a.href]) return; pf[a.href]=1; playData();
    (a.getAttribute("data-prefetch")||"").split(/\s+/).filter(Boolean).forEach(function(h){ var l=document.createElement("link"); l.rel="prefetch"; l.href=h; document.head.appendChild(l); });
  }
  ["pointerover","focusin","touchstart"].forEach(function(ev){
    document.addEventListener(ev,function(e){ var a=e.target.closest&&e.target.closest("a[data-wipe]"); if(a) prefetch(a); },{passive:true,capture:true});
  });
  addEventListener("pageshow",function(e){ if(e.persisted&&cvs&&!busy){ cvs.remove(); cvs=null; } });
})();
