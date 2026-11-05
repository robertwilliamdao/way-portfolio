/* Home ⇄ Playground: ONE radial grid-scramble.
   The Playground (assets/js/play.js) is mounted over the home page and warmed up in the background, so the home stays alive
   underneath (Back never reloads it) and nothing heavy happens at click time.
   A ring of grid cells expands from the centre of the screen: outside the ring = home, inside = the live globe.
   The globe is drawn into the ring's own canvas cell by cell (no iframe, no clip-path, no extra compositing layers).
   Cells in the ring flicker between the two and are covered by scrambled fragments of the work images (home pieces on the
   outer side, globe pieces on the inner side). Back = the same ring played in reverse. */
(function(){
  "use strict";
  var DARK="#101010", BEIGE="rgba(255,250,238,.92)", BAND=.4, F0=.04, FMAX=1+BAND, DUR=1.25;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var play=null, root=null, warming=false, waiters=[], inPlay=false, busy=false, cvs=null, hist=false, pend=null, srcs={}, lite=false;   /* lite: switched on by itself when frames come out slow */
  function hash(n){ var x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }
  function ease(t){ return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; }
  var css=document.createElement("style");   /* while in the Playground the home underneath is not painted; the home's grain is the one noise layer for the whole journey: always on top, never hidden */
  css.textContent="html.in-play body>*:not(#wayPlay):not(canvas[data-way]):not(.grain){visibility:hidden}.grain{z-index:2147483001}";
  document.head.appendChild(css);
  function lock(){ var sb=innerWidth-document.documentElement.clientWidth; document.documentElement.style.overflow="hidden"; document.body.style.paddingRight=sb+"px"; }
  function unlock(){ document.documentElement.style.overflow=""; document.body.style.paddingRight=""; }

  /* ---------- fragment sources: small decoded bitmaps (cheap to draw, no big-image decode at click time) ---------- */
  function makeSource(url){
    if(!url||srcs[url]) return; var rec=srcs[url]={bm:null,w:0,h:0}, im=new Image(); im.decoding="async";
    im.onload=function(){
      var fin=function(b){ rec.bm=b; rec.w=b.width||im.naturalWidth; rec.h=b.height||im.naturalHeight; };
      if(window.createImageBitmap) createImageBitmap(im,{resizeWidth:Math.min(640,im.naturalWidth),resizeQuality:"medium"}).then(fin,function(){ fin(im); }); else fin(im);
    };
    im.src=url;
  }
  function thumbUrl(d){ return d.thumb||(d.src||"").replace(/-r\.webp$/,"-r-640.webp"); }
  function prepSources(){
    [].forEach.call(document.querySelectorAll(".project .media img"),function(el){ if(el.complete&&el.naturalWidth) makeSource(el.currentSrc||el.src); });
    (window.PLAY||[]).slice(0,8).forEach(function(d){ makeSource(thumbUrl(d)); });
  }
  function collect(){   /* the card images currently on screen (with their on-screen rects) whose bitmaps are ready */
    var out=[];
    [].forEach.call(document.querySelectorAll(".project .media img"),function(im){
      var r=im.getBoundingClientRect(), s=srcs[im.currentSrc||im.src];
      if(!s||!s.bm||r.width<2||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth) return;
      var op=(getComputedStyle(im).objectPosition||"50% 50%").split(" ");
      out.push({s:s,x:r.left,y:r.top,w:r.width,h:r.height,pos:[parseFloat(op[0])/100,parseFloat(op[1]||"50%")/100]});
    });
    return out;
  }

  /* ---------- warm-up: load + mount the Playground (shaders, textures) in the background, paused ---------- */
  function warm(cb){
    if(play){ if(cb) cb(); return; }
    if(cb) waiters.push(cb);
    if(warming) return; warming=true;
    var done=function(){
      if(/[?&]preview=1/.test(location.search)&&window.PLAY){   /* builder preview: unsaved shots + their unsaved images */
        try{
          var pv=JSON.parse(localStorage.getItem("way-preview")||"null"), m=(pv&&pv.map)||{};
          if(pv&&pv.play){ window.PLAY=pv.play.filter(function(d){ return d.src; }); window.PLAY.forEach(function(d){ var p=d.src; d.thumb=m[p.replace(/-r\.webp$/,"-r-640.webp")]||m[p]||d.thumb; d.big=m[p.replace(/-r\.webp$/,"-r-1280.webp")]||m[p]||d.big; }); }
        }catch(e){}
      }
      if(window.WayPlay&&window.PLAY){
        root=document.getElementById("wayPlay"); if(!root){ root=document.createElement("div"); root.id="wayPlay"; document.body.appendChild(root); }
        play=window.WayPlay.mount(root,{onBack:back});
      }
      prepSources(); var w=waiters; waiters=[]; w.forEach(function(f){ f(); });
    };
    if(!document.getElementById("wayPlayCss")){ var l=document.createElement("link"); l.rel="stylesheet"; l.href="assets/css/play.css"; l.id="wayPlayCss"; document.head.appendChild(l); }
    var list=[["data/play.js",function(){ return !!window.PLAY; }],["assets/js/play.js",function(){ return !!window.WayPlay; }]];
    (function next(){
      var it=list.shift(); if(!it) return done();
      if(it[1]()) return next();
      var s=document.createElement("script"); s.src=it[0]; s.onload=next; s.onerror=done; document.head.appendChild(s);
    })();
  }

  (function placeLink(){
    var a=document.querySelector("a[data-wipe]"), mq=matchMedia("(max-width:800px)"); if(!a) return;
    var home=document.createComment("playground-link"); a.parentNode.insertBefore(home,a);   /* marker: where the link lives on desktop */
    function place(){
      if(mq.matches){ var col=document.querySelector(".m-nav-col"); if(col) col.appendChild(a); }
      else if(home.parentNode) home.parentNode.insertBefore(a,home.nextSibling);
    }
    place(); if(mq.addEventListener) mq.addEventListener("change",place); else mq.addListener(place);
  })();

  /* ---------- the ring. dir "in": home → Playground. dir "out": Playground → home (same ring, reversed) ---------- */
  function run(dir,done){
    var imgs=collect(), W=innerWidth, H=innerHeight, dpr=play&&play.canvas?play.dpr():Math.min(devicePixelRatio||1,1.5), gc=play&&play.canvas;
    var cs=Math.max(34,Math.round(Math.hypot(W,H)/42)), cols=2*Math.ceil((W/cs-1)/2)+1, rows=2*Math.ceil((H/cs-1)/2)+1;   /* odd → a cell sits exactly at the centre */
    var ox=Math.round(W/2-cols*cs/2), oy=Math.round(H/2-rows*cs/2), R=Math.hypot(W/2,H/2)+cs*.5, n=cols*rows;
    var D=new Float32Array(n), Hh=new Float32Array(n), S=new Int16Array(n), base=new Uint8Array(n);
    for(var j=0,k=0;j<rows;j++) for(var i=0;i<cols;i++,k++){
      var cx=ox+i*cs+cs/2, cy=oy+j*cs+cs/2; D[k]=Math.hypot(cx-W/2,cy-H/2)/R; Hh[k]=hash(k+1.3); S[k]=-1;
      for(var q=0;q<imgs.length;q++){ var s=imgs[q]; if(cx>=s.x&&cx<=s.x+s.w&&cy>=s.y&&cy<=s.y+s.h){ S[k]=q; break; } }   /* which card image sits under this cell */
    }
    var homeAll=imgs.map(function(e){ return e.s; }), globeAll=(window.PLAY||[]).slice(0,8).map(function(d){ return srcs[thumbUrl(d)]; }).filter(function(s){ return s&&s.bm; });
    var cv=cvs=document.createElement("canvas"); cv.setAttribute("data-way","1"); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
    cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;z-index:2147483000;display:block;touch-action:none";
    cv.addEventListener("wheel",function(e){ e.preventDefault(); },{passive:false}); cv.addEventListener("touchmove",function(e){ e.preventDefault(); },{passive:false});
    var ctx=cv.getContext("2d"); ctx.scale(dpr,dpr); document.body.appendChild(cv);
    if(lite&&play) play.lite(true);

    function frag(k,x,y,tq,u){
      var r3=hash(k*1.9+tq*6.7), r4=hash(k*8.3+tq*4.1), r5=hash(k*2.1+tq*3.3), fromGlobe=hash(k*2.9+tq*5.3)<u*1.1-.05;   /* inner side of the ring → globe pieces */
      var e=!fromGlobe&&S[k]>=0?imgs[S[k]]:null, s, fw, fh, u0, v0;
      if(e){              /* over a card image: that image's own pixels, displaced and rescaled */
        s=e.s; var ia=s.w/s.h, rr=e.w/e.h, cx0=1, cy0=1; if(ia>rr) cx0=rr/ia; else cy0=ia/rr; var sc=.55+r3*1.1;
        fw=Math.min(1,(cs/e.w)*cx0/sc); fh=Math.min(1,(cs/e.h)*cy0/sc);
        u0=e.pos[0]*(1-cx0)+((x+cs/2-e.x)/e.w)*cx0-fw/2+(r4-.5)*.5*cx0; v0=e.pos[1]*(1-cy0)+((y+cs/2-e.y)/e.h)*cy0-fh/2+(r5-.5)*.5*cy0;
      } else {            /* anywhere else: a random chunk of a random image */
        var P=fromGlobe&&globeAll.length?globeAll:homeAll; if(!P.length) return false;
        s=P[Math.floor(hash(k*4.4+tq*1.1)*P.length)]; var ib=s.w/s.h; fw=.1+.22*r3; fh=fw*ib; if(fh>1){ fh=1; fw=1/ib; } u0=r4*(1-fw); v0=r5*(1-fh);
      }
      u0=Math.max(0,Math.min(1-fw,u0)); v0=Math.max(0,Math.min(1-fh,v0));
      ctx.drawImage(s.bm,u0*s.w,v0*s.h,fw*s.w,fh*s.h,x,y,cs,cs); return true;
    }
    function globe(){   /* the cells that show the Playground: rows of consecutive cells copied from the globe's canvas */
      if(!gc) return;
      var kx=gc.width/W, ky=gc.height/H;
      for(var j=0;j<rows;j++){
        var y0=Math.max(0,oy+j*cs), y1=Math.min(H,oy+(j+1)*cs), st=-1; if(y1<=y0) continue;
        for(var i=0;i<=cols;i++){
          var on=i<cols&&base[j*cols+i]===1;
          if(on&&st<0) st=i;
          if(!on&&st>=0){
            var x0=Math.max(0,ox+st*cs), x1=Math.min(W,ox+i*cs); st=-1;
            if(x1>x0) ctx.drawImage(gc,x0*kx,y0*ky,(x1-x0)*kx,(y1-y0)*ky,x0,y0,x1-x0,y1-y0);
          }
        }
      }
    }
    function paint(now,f){
      ctx.clearRect(0,0,W,H);
      for(var k=0;k<n;k++){            /* 1) which cells show the Playground */
        var u=(f-D[k])/BAND;
        if(u<=0) base[k]=0; else if(u>=1) base[k]=1;
        else base[k]=hash(k*7.31+Math.floor(now/70+Hh[k]*6)*1.7)<u*u*(3-2*u)?1:0;   /* in the ring: flickers between home (0) and Playground (1), ~14x per second */
      }
      globe();
      for(var m=0;m<n;m++){            /* 2) fragments / dark cells / sparks on top, only inside the ring */
        var v=(f-D[m])/BAND; if(v<=0||v>=1) continue;
        var tq=Math.floor(now/70+Hh[m]*6), ro=hash(m*3.7+tq*9.1), po=.55*Math.sin(Math.PI*Math.pow(v,.8));   /* chance of being covered: peaks mid-ring */
        if(ro>=po) continue;
        var x=ox+(m%cols)*cs, y=oy+((m/cols)|0)*cs, qq=ro/po;
        if(qq<.66&&!lite&&frag(m,x,y,tq,v)) continue;
        ctx.fillStyle=qq>.86?BEIGE:DARK; ctx.fillRect(x,y,cs,cs);
      }
    }
    var t0=performance.now(), first=true, prev=t0, slow=0;
    (function tick(now){
      var t=Math.min(1,(now-t0)/(DUR*1000)), e=ease(t), f=dir==="in"?F0+e*(FMAX-F0):FMAX-e*(FMAX-F0);
      if(!lite&&now>t0+120){ slow=(now-prev>45)?slow+1:Math.max(0,slow-1); if(slow>=6){ lite=true; if(play) play.lite(true); } }   /* under ~22fps: drop the fancy parts */
      prev=now;
      if(play) play.step(now,true);                     /* the ring drives the globe's frame, then copies it (no render-scale changes mid-ring) */
      paint(now,f);
      if(first){ first=false; if(dir==="out") root.classList.remove("on"); }   /* the ring now shows the whole globe: swap the live canvas out */
      if(t<1) requestAnimationFrame(tick);
      else { if(dir==="in"&&play) play.step(performance.now(),true); cv.remove(); if(cvs===cv) cvs=null; done(); }
    })(t0);
  }

  /* ---------- enter / leave ---------- */
  function pushHist(){ try{ history.pushState({way:"play"},"","#playground"); hist=true; }catch(e){} }
  function enter(fromPop){
    if(busy||inPlay) return; busy=true;
    if(!play){ warm(function(){ busy=false; if(play) enter(fromPop); else location.href="play.html"; }); return; }   /* not warmed yet (or failed): load it now */
    if(!fromPop) pushHist();
    prepSources(); play.start();
    var fin=function(){
      root.classList.add("on"); lock(); document.documentElement.classList.add("in-play"); play.resume();
      inPlay=true; busy=false; settle();
    };
    if(reduce) fin(); else run("in",fin);
  }
  function leave(){
    if(busy||!inPlay) return; busy=true;
    document.documentElement.classList.remove("in-play"); play.pause();
    var fin=function(){ unlock(); inPlay=false; busy=false; settle(); };
    if(reduce){ root.classList.remove("on"); fin(); return; }
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ run("out",fin); }); });   /* let the home repaint first, under the live globe */
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
    if(inPlay&&!(e.state&&e.state.way==="play")){ hist=false; leave(); }
    else if(!inPlay&&e.state&&e.state.way==="play"){ hist=true; enter(true); }
  });
  document.addEventListener("click",function(e){
    var a=e.target.closest&&e.target.closest("a[data-wipe]");
    if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    e.preventDefault(); enter();
  });
  ["pointerover","focusin","touchstart"].forEach(function(ev){   /* the pointer is on the link: warm up now if the idle warm-up has not happened yet */
    document.addEventListener(ev,function(e){ if(!play&&e.target.closest&&e.target.closest("a[data-wipe]")) warm(); },{passive:true,capture:true});
  });
  (function idleWarm(){   /* warm up in the background a few seconds after the home has loaded (its own intro runs first) */
    var go=function(){ (window.requestIdleCallback||function(f){ setTimeout(f,200); })(function(){ warm(); },{timeout:4000}); };
    if(document.readyState==="complete") setTimeout(go,4500); else addEventListener("load",function(){ setTimeout(go,4500); });
  })();
  addEventListener("pageshow",function(e){ if(e.persisted&&cvs&&!busy){ cvs.remove(); cvs=null; } });
})();
