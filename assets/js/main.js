(function(){
  /* ---------- Clock, GMT+7 ---------- */
  var hH=document.getElementById("hHour"),hM=document.getElementById("hMin"),hS=document.getElementById("hSec");
  function clock(){
    var t=new Date(Date.now()+7*3600e3);
    var s=t.getUTCSeconds()+t.getUTCMilliseconds()/1000, m=t.getUTCMinutes()+s/60, h=(t.getUTCHours()%12)+m/60;
    hS.setAttribute("transform","rotate("+(s*6)+" 50.5 50.5)");
    hM.setAttribute("transform","rotate("+(m*6)+" 50.5 50.5)");
    hH.setAttribute("transform","rotate("+(h*30)+" 50.5 50.5)");
    requestAnimationFrame(clock);
  }
  clock();

  /* ---------- Glitch on contact links ---------- */
  document.querySelectorAll("[data-link]").forEach(function(a){
    a.addEventListener("click",function(e){ if(a.getAttribute("href")==="#") e.preventDefault(); });
  });

  /* ---------- Back to top + arrow wave ---------- */
  var toTop=document.getElementById("toTop");
  function goTop(){ window.scrollTo({top:0,behavior:"smooth"}); }
  toTop.addEventListener("click",function(e){ if(!e.target.closest(".colorwrap")&&!e.target.closest("#cpop")) goTop(); });
  toTop.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); goTop(); } });

  var SCR_CH="01/\\_+-.:";
  /* ---------- Works: cards rendered from data/works.js (window.WORKS) ---------- */
  var WORKS=window.WORKS||[];
  function asset(p){ return (window.ASSET_MAP&&window.ASSET_MAP[p])||p; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function isVideo(p){ return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(p||""); }
  (function renderCards(){
    var html=WORKS.map(function(w,i){
      return '<a class="project" href="#'+esc(w.id||("work-"+(i+1)))+'" data-i="'+i+'" data-view="'+esc(w.view||"")+'">'+
        '<div class="media"><img src="'+esc(asset(w.cover))+'" alt="'+esc(w.title)+' preview"'+(w.coverPosition?' style="object-position:'+esc(w.coverPosition)+'"':'')+'>'+
        '<div class="cells"></div><span class="vp">view project</span></div>'+
        '<div class="details"><div class="label"><span class="type">'+esc(w.type)+'</span><h2 class="ptitle" style="font-weight:500">'+esc(w.title)+'</h2></div>'+
        '<div class="desc"><div class="pills">'+(w.services||[]).map(function(s){ return '<span class="pill">'+esc(s)+'</span>'; }).join("")+'</div>'+
        '<p class="dim">'+esc(w.summary)+'</p></div></div></a>';
    }).join("");
    document.getElementById("toTop").insertAdjacentHTML("beforebegin",html);
  })();

  /* Safety net: never leave the loader up if something fails */
  setTimeout(function(){ var l=document.getElementById("loader"); if(l&&l.isConnected&&!window.wayLoaderRunning){ l.remove(); document.documentElement.classList.remove("loading"); } },2500);
  if(!window.gsap){ var l0=document.getElementById("loader"); if(l0) l0.remove(); document.documentElement.classList.remove("loading"); return; }
  gsap.registerPlugin(ScrambleTextPlugin,SplitText);
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Social links: scramble text on hover */
  document.querySelectorAll(".glitch").forEach(function(el){
    var label=el.getAttribute("data-text"), busy=null;
    el.addEventListener("mouseenter",function(){
      if(busy) busy.kill();
      el.style.width=el.getBoundingClientRect().width+"px";
      busy=gsap.to(el,{duration:.7,scrambleText:{text:label,chars:"01/\\_+-.:",revealDelay:.15,speed:.6},
        onComplete:function(){ el.style.width=""; busy=null; }});
    });
  });

  var arrows=gsap.utils.toArray(".end .arw svg");
  /* Back-to-top arrows: dim at rest; on hover a soft, slow random flicker */
  var DIMA=.2, rnd0=gsap.utils.random, hot=false;
  gsap.set(arrows,{opacity:DIMA});
  function blink(a){
    if(!hot) return;
    var tl=gsap.timeline({onComplete:function(){ blink(a); }});
    tl.to({},{duration:rnd0(.15,.9)});
    var n=rnd0(1,2,1);
    for(var k=0;k<n;k++){
      tl.to(a,{opacity:rnd0(.55,.8),duration:rnd0(.06,.12),ease:"none"})
        .to(a,{opacity:DIMA,duration:rnd0(.18,.35),ease:"power1.out"},"+="+rnd0(.05,.15));
    }
    a._tl=tl;
  }
  /* flicker only while the pointer is on the arrow part of the row, not on the Color button */
  function arrowsOn(){
    if(hot) return;
    if(reduce){ hot=true; gsap.to(arrows,{opacity:.7,duration:.3}); return; }
    hot=true; arrows.forEach(function(a){ if(a._tl) a._tl.kill(); blink(a); });
  }
  function arrowsOff(){
    if(!hot) return;
    hot=false; arrows.forEach(function(a){ if(a._tl) a._tl.kill(); }); gsap.to(arrows,{opacity:DIMA,duration:.4});
  }
  toTop.addEventListener("mouseover",function(e){ if(e.target.closest(".colorwrap")) arrowsOff(); else arrowsOn(); });
  toTop.addEventListener("mouseleave",arrowsOff);

  /* ---------- Shared scramble (same feel as the social links) ---------- */
  function scramble(el,text,dur){
    if(el._scr) el._scr.kill();
    var w=el.getBoundingClientRect().width, inl=getComputedStyle(el).display==="inline";
    if(inl) el.style.display="inline-block";
    el.style.width=w+"px"; el.style.whiteSpace="nowrap"; el.style.overflow="visible";
    el._scr=gsap.to(el,{duration:dur||.7,scrambleText:{text:text,chars:"01/\\_+-.:",revealDelay:.15,speed:.6},
      onComplete:function(){ el.style.width=""; el.style.whiteSpace=""; el.style.overflow=""; if(inl) el.style.display=""; el._scr=null; }});
  }

  /* ---------- Profile: swap faces with the scramble text effect ---------- */
  var prof=document.getElementById("profile"), faceA=prof.querySelector(".face.a"), faceB=prof.querySelector(".face.b");
  [faceA,faceB].forEach(function(f){ f.querySelectorAll("[data-s]").forEach(function(s){ s._txt=s.textContent; }); });
  function swapFace(toB){
    var inEl=toB?faceB:faceA, outEl=toB?faceA:faceB;
    outEl.querySelectorAll("[data-s]").forEach(function(s){ if(s._scr){ s._scr.kill(); s._scr=null; } s.textContent=s._txt; s.style.width=""; s.style.whiteSpace=""; s.style.overflow=""; s.style.display=""; });
    gsap.set(outEl,{opacity:0}); gsap.set(inEl,{opacity:1});
    inEl.querySelectorAll("[data-s]").forEach(function(s){ scramble(s,s._txt,.6); });
    faceA.setAttribute("aria-hidden",toB?"true":"false"); faceB.setAttribute("aria-hidden",toB?"false":"true");
  }
  function lockProf(){ var r=prof.getBoundingClientRect(); prof.style.width=r.width+"px"; prof.style.height=r.height+"px"; }
  window.addEventListener("resize",function(){ prof.style.width=""; prof.style.height=""; });
  prof.addEventListener("mouseenter",function(){ if(!prof.style.width) lockProf(); swapFace(true); });
  prof.addEventListener("mouseleave",function(){ swapFace(false); });


  /* ---------- Project hover: grid split ---------- */
  var openCard=null, busy=false;
  var cards=gsap.utils.toArray(".project");
  var rnd=gsap.utils.random;
  cards.forEach(function(card){
    var media=card.querySelector(".media"), img=media.querySelector("img"),
        vp=media.querySelector(".vp"), grid=media.querySelector(".cells");
    var vx,vy;

    /* Grid split: drawn on one canvas, 12x7 tiles; each tile's image shifts/stretches near the cursor */
    var COLS=12, ROWS=7;
    var cv=document.createElement("canvas"); grid.innerHTML=""; grid.appendChild(cv);
    var ctx=cv.getContext("2d"), tiles=cv;
    var geo=null, T=[], active=false, mx=-1e4, my=-1e4, ticking=false;

    function layout(){
      var cw=media.clientWidth, ch=media.clientHeight, dpr=Math.min(window.devicePixelRatio||1,2);
      var nw=img.naturalWidth||cw, nh=img.naturalHeight||ch, s=Math.max(cw/nw,ch/nh), dw=nw*s, dh=nh*s;
      var pos=(getComputedStyle(img).objectPosition||"50% 50%").split(" ");
      var px=parseFloat(pos[0])/100, py=parseFloat(pos[1]||"50%")/100;
      geo={cw:cw,ch:ch,nw:nw,nh:nh,dw:dw,dh:dh,ox:(cw-dw)*px,oy:(ch-dh)*py};
      cv.width=Math.round(cw*dpr); cv.height=Math.round(ch*dpr); cv.style.width=cw+"px"; cv.style.height=ch+"px";
      T=[];
      for(var r=0;r<ROWS;r++){
        for(var c=0;c<COLS;c++){
          var X0=Math.round(c*cv.width/COLS), X1=Math.round((c+1)*cv.width/COLS);
          var Y0=Math.round(r*cv.height/ROWS), Y1=Math.round((r+1)*cv.height/ROWS);
          var l=X0/dpr, tp=Y0/dpr, w=(X1-X0)/dpr, h=(Y1-Y0)/dpr;
          T.push({X:X0,Y:Y0,Wd:X1-X0,Hd:Y1-Y0,l:l,tp:tp,w:w,h:h,cx:l+w/2,cy:tp+h/2,dx:0,dy:0,sx:1,sy:1});
        }
      }
    }
    function roll(){
      T.forEach(function(t){
        var big=Math.random()<.55;
        t.rx=rnd(-1,1); t.ry=rnd(-1,1); t.rs=rnd(.05,big?.9:.3); t.rsy=rnd(.05,big?.7:.2); t.amp=big?1:.5;
        t.dx=0; t.dy=0; t.sx=1; t.sy=1; t.prevInf=0; t.scrUntil=0; t.scr=false;
      });
    }
    function draw(){
      var kx=geo.nw/geo.dw, ky=geo.nh/geo.dh;
      for(var k=0;k<T.length;k++){
        var t=T[k], sx=t.scr?t.jsx:t.sx, sy=t.scr?t.jsy:t.sy, ddx=t.scr?t.jx:t.dx, ddy=t.scr?t.jy:t.dy;
        var qw=t.w/sx, qh=t.h/sy;
        var qx=t.cx-(t.w/2+ddx)/sx, qy=t.cy-(t.h/2+ddy)/sy;
        qx=Math.min(geo.ox+geo.dw-qw,Math.max(geo.ox,qx));
        qy=Math.min(geo.oy+geo.dh-qh,Math.max(geo.oy,qy));
        ctx.drawImage(img,(qx-geo.ox)*kx,(qy-geo.oy)*ky,qw*kx,qh*ky,t.X,t.Y,t.Wd,t.Hd);
      }
    }
    var scrChars=0;
    function now(){ return performance.now()/1000; }
    function burst(t,len){ t.scrUntil=Math.max(t.scrUntil||0,now()+len); t.nextJump=0; }
    function frame(){
      var R=geo.cw/COLS*3, settled=true, n=now();
      for(var k=0;k<T.length;k++){
        var t=T[k], inf=0;
        if(active){ var d=Math.hypot(t.cx-mx,t.cy-my); inf=Math.max(0,1-d/R); inf=inf*inf*(3-2*inf); }
        if(active&&inf>.45&&(t.prevInf||0)<=.45&&Math.random()<.6) burst(t,rnd(.15,.3));
        t.prevInf=inf;
        var tdx=t.rx*t.w*.65*t.amp*inf, tdy=t.ry*t.h*.55*t.amp*inf, tsx=1+t.rs*.7*inf, tsy=1+t.rsy*.7*inf;
        t.dx+=(tdx-t.dx)*.09; t.dy+=(tdy-t.dy)*.09; t.sx+=(tsx-t.sx)*.09; t.sy+=(tsy-t.sy)*.09;
        t.scr=n<(t.scrUntil||0);
        if(t.scr){
          settled=false;
          if(n>=(t.nextJump||0)){
            t.jx=rnd(-1,1)*t.w*.5; t.jy=rnd(-1,1)*t.h*.4; t.jsx=rnd(1,1.3); t.jsy=rnd(1,1.25);
            t.nextJump=n+rnd(.09,.16);
          }
        }
        if(Math.abs(t.dx)>.05||Math.abs(t.dy)>.05||t.sx>1.0005||t.sy>1.0005) settled=false;
      }
      draw();
      if(!active&&settled){ stop(); gsap.set(img,{opacity:1}); gsap.set(cv,{opacity:0}); }
    }
    function start(){ if(!ticking){ gsap.ticker.add(frame); ticking=true; } }
    function stop(){ if(ticking){ gsap.ticker.remove(frame); ticking=false; } }
    var rT; window.addEventListener("resize",function(){ clearTimeout(rT); rT=setTimeout(function(){ geo=null; },150); });
    function local(e){ var r=media.getBoundingClientRect(); return {x:gsap.utils.clamp(0,r.width,e.clientX-r.left),y:gsap.utils.clamp(0,r.height,e.clientY-r.top),r:r}; }
    function followers(x,y){
      gsap.set(vp,{left:0,top:0,xPercent:0,yPercent:0,x:x+14,y:y-24});
      vx=gsap.quickTo(vp,"x",{duration:.45,ease:"power3"}); vy=gsap.quickTo(vp,"y",{duration:.45,ease:"power3"});
    }

    function reset(){
      stop(); active=false;
      gsap.killTweensOf([img,vp,tiles]);
      gsap.set(vp,{clearProps:"all"}); vp.textContent="view project";
      gsap.set(tiles,{opacity:0}); gsap.set(img,{scale:1,opacity:1});
      vx=null;
    }
    card._reset=reset;
    card._soft=function(){
      stop(); active=false;
      gsap.killTweensOf([img,vp]);
      gsap.set(cv,{opacity:0}); gsap.set(img,{opacity:1});
      gsap.to(vp,{opacity:0,duration:.25});
    };

    card.addEventListener("mouseenter",function(e){
      if(openCard||busy||isMobile()) return;
      reset();
      var p=local(e);
      if(!geo||geo.cw!==media.clientWidth) layout();
      roll(); mx=p.x; my=p.y; active=true;
      T.forEach(function(t){ if(Math.random()<.7) burst(t,rnd(.15,.6)); t.prevInf=1; });
      draw(); gsap.set(cv,{opacity:1}); gsap.set(img,{opacity:0});
      start();
      followers(p.x,p.y); gsap.set(vp,{opacity:1});
      gsap.to(vp,{duration:.7,scrambleText:{text:"view project",chars:SCR_CH,revealDelay:.15,speed:.6}});
    });
    card.addEventListener("mousemove",function(e){
      if(openCard||busy||isMobile()) return;
      var p=local(e);
      if(vx){ vx(p.x+14); vy(p.y-24); }
      mx=p.x; my=p.y;
    });
    card.addEventListener("mouseleave",function(){
      if(openCard||busy||isMobile()) return;
      active=false; T.forEach(function(t){ if(t.prevInf>.2) burst(t,rnd(.05,.2)); });
      gsap.to(vp,{opacity:0,duration:.25});
    });
    card.addEventListener("click",function(e){ e.preventDefault(); openProject(card); });
  });

/* ---------- Colour theme: any background, text picks the stronger contrast ---------- */
  var theme={bgRGB:[16,16,16]};
  var LIGHT="#fffaee", DARK="#101010";
  function hexRGB(h){ h=h.replace("#",""); return [0,2,4].map(function(i){ return parseInt(h.substr(i,2),16); }); }
  function lum(c){ return c.map(function(v){ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }).reduce(function(s,v,i){ return s+v*[.2126,.7152,.0722][i]; },0); }
  function ratio(a,b){ var x=lum(a),y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
  var root=document.documentElement, colorWrap=document.getElementById("colorWrap"), colorBtn=document.getElementById("colorBtn");
  var cp=document.getElementById("cpop"), cpField=document.getElementById("cpField"), cpHue=document.getElementById("cpHue"),
      cpCross=cp.querySelector(".cp-cross"), cpH=cp.querySelector(".cp-h"), cpV=cp.querySelector(".cp-v"), cpKnob=cp.querySelector(".cp-knob"),
      cpHex=document.getElementById("cpHex"), cpRead=document.getElementById("cpRead"), cpRatio=document.getElementById("cpRatio"),
      cpTitle=cp.querySelector(".cp-title"), cpSw=[].slice.call(cp.querySelectorAll(".cp-sw"));
  var hsv={h:0,s:0,v:.063}, cur=DARK;

  function rgbHex(c){ return "#"+c.map(function(v){ return ("0"+Math.round(v).toString(16)).slice(-2); }).join(""); }
  function hsvRgb(h,s,v){ var f=function(n){ var k=(n+h/60)%6; return v-v*s*Math.max(0,Math.min(k,4-k,1)); }; return [f(5)*255,f(3)*255,f(1)*255]; }
  function rgbHsv(c){ var r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0;
    if(d){ h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4; h*=60; if(h<0)h+=360; }
    return {h:h,s:mx?d/mx:0,v:mx}; }
  function pad(n,l){ return ("000"+Math.round(n)).slice(-l); }

  function applyTheme(hex,save){
    var bg=hexRGB(hex), fg=ratio(bg,hexRGB(LIGHT))>=ratio(bg,hexRGB(DARK))?LIGHT:DARK;
    theme.bgRGB=bg; cur=hex.toLowerCase();
    root.style.setProperty("--charcoal",hex); root.style.setProperty("--beige",fg);
    var r=ratio(bg,hexRGB(fg));
    cpRatio.textContent=(r>=7?"AAA ":r>=4.5?"AA ":"AA large ")+r.toFixed(1)+":1";
    cpSw.forEach(function(s){ s.setAttribute("aria-pressed",s.dataset.c.toLowerCase()===cur?"true":"false"); });
    if(save){ try{ localStorage.setItem("way-bg",hex); }catch(e){} }
  }
  function paintUI(){
    var hueRGB=hsvRgb(hsv.h,1,1);
    cpField.style.setProperty("--hue",rgbHex(hueRGB));
    var x=hsv.s*100, y=(1-hsv.v)*100;
    cpCross.style.left=x+"%"; cpCross.style.top=y+"%"; cpH.style.top=y+"%"; cpV.style.left=x+"%";
    cpKnob.style.left=(hsv.h/360*100)+"%";
    cpRead.textContent="H "+pad(hsv.h,3)+"  S "+pad(hsv.s*100,3)+"  B "+pad(hsv.v*100,3);
  }
  function fromHSV(save){ var hex=rgbHex(hsvRgb(hsv.h,hsv.s,hsv.v)); applyTheme(hex,save); if(document.activeElement!==cpHex) cpHex.value=hex.slice(1).toUpperCase(); paintUI(); }
  function setHex(hex,save){ hsv=rgbHsv(hexRGB(hex)); applyTheme(hex,save); cpHex.value=hex.slice(1).toUpperCase(); paintUI(); }

  try{ var savedBg=localStorage.getItem("way-bg"); if(savedBg&&/^#[0-9a-f]{6}$/i.test(savedBg)) setHex(savedBg,false); else setHex(DARK,false); }catch(e){ setHex(DARK,false); }

  function drag(el,onMove){
    el.addEventListener("pointerdown",function(e){
      e.preventDefault(); el.setPointerCapture(e.pointerId); onMove(e);
      var mv=function(ev){ onMove(ev); }, up=function(){ el.removeEventListener("pointermove",mv); el.removeEventListener("pointerup",up); fromHSV(true); };
      el.addEventListener("pointermove",mv); el.addEventListener("pointerup",up);
    });
  }
  drag(cpField,function(e){ var r=cpField.getBoundingClientRect(); hsv.s=gsap.utils.clamp(0,1,(e.clientX-r.left)/r.width); hsv.v=1-gsap.utils.clamp(0,1,(e.clientY-r.top)/r.height); fromHSV(false); });
  drag(cpHue,function(e){ var r=cpHue.getBoundingClientRect(); hsv.h=gsap.utils.clamp(0,359.9,(e.clientX-r.left)/r.width*360); fromHSV(false); });
  cpSw.forEach(function(s){ s.addEventListener("click",function(){ setHex(s.dataset.c,true); }); });
  cpHex.addEventListener("input",function(){ var v=cpHex.value.replace(/[^0-9a-f]/gi,"").slice(0,6); cpHex.value=v.toUpperCase(); if(v.length===6) setHex("#"+v.toLowerCase(),true); });
  cp.querySelector(".cp-reset").addEventListener("click",function(){ setHex(DARK,true); scramble(cpTitle,"Colour",.5); });

  /* Open / close the picker next to the button */
  var cpOpen=false;
  function placePop(){
    var b=colorBtn.getBoundingClientRect(), w=cp.offsetWidth, h=cp.offsetHeight, vw=document.documentElement.clientWidth, gap=12;
    var left=Math.min(vw-w-20,Math.max(20,b.right-w)), up=b.top>h+gap+20;
    cp.style.left=left+"px"; cp.style.top=(up?b.top-h-gap:b.bottom+gap)+"px";
    cp.dataset.dir=up?"up":"down";
  }
  function openPicker(){
    if(cpOpen) return; cpOpen=true; cp.hidden=false; placePop(); paintUI();
    colorBtn.setAttribute("aria-expanded","true");
    var up=cp.dataset.dir==="up";
    gsap.fromTo(cp,{clipPath:up?"inset(100% 0% 0% 0%)":"inset(0% 0% 100% 0%)",y:up?8:-8},
                   {clipPath:"inset(0% 0% 0% 0%)",y:0,duration:.55,ease:"expo.out"});
    scramble(cpTitle,"Colour",.6); scramble(cpRead,cpRead.textContent,.6);
  }
  function closePicker(){
    if(!cpOpen) return; cpOpen=false; colorBtn.setAttribute("aria-expanded","false");
    var up=cp.dataset.dir==="up";
    gsap.to(cp,{clipPath:up?"inset(100% 0% 0% 0%)":"inset(0% 0% 100% 0%)",duration:.35,ease:"power3.in",onComplete:function(){ if(!cpOpen) cp.hidden=true; }});
  }
  colorBtn.addEventListener("click",function(e){ e.stopPropagation(); cpOpen?closePicker():openPicker(); });
  document.addEventListener("pointerdown",function(e){ if(cpOpen&&!cp.contains(e.target)&&!colorBtn.contains(e.target)) closePicker(); });
  document.addEventListener("keydown",function(e){ if(e.key==="Escape") closePicker(); });
  window.addEventListener("resize",function(){ if(cpOpen) placePop(); });
  colorBtn.addEventListener("mouseenter",function(){ var lb=colorBtn.querySelector(".lb"); scramble(lb,"Color",.6); });
  document.getElementById("slotD").appendChild(colorWrap);

  /* ---------- Project pop-up ---------- */
  var overlay=document.getElementById("overlay"), panel=document.getElementById("panel"), heroImg=document.getElementById("heroImg"),
      heroBox=panel.querySelector(".p-hero"), sw=[],
      closeBox=document.querySelector(".close-label"), closeText=document.getElementById("closeText");
  var cardImgs=cards.map(function(c){ return c.querySelector(".media img"); });
  function dim(a){ var c=theme.bgRGB; return "rgba("+c[0]+","+c[1]+","+c[2]+","+a+")"; }

  /* Decode the first cover into the hero slot ahead of time */
  if(cardImgs[0]){ heroImg.decoding="async"; heroImg.src=cardImgs[0].src; if(heroImg.decode) heroImg.decode().catch(function(){}); }

  /* ---------- Work detail renderer (blocks from data/works.js) ---------- */
  function mediaTag(src,cls,eager){
    var a=esc(asset(src)), c=cls?' class="'+cls+'"':'';
    if(isVideo(src)) return '<video'+c+' src="'+a+'" muted loop playsinline autoplay preload="metadata"></video>';
    return '<img'+c+' src="'+a+'" alt=""'+(eager?'':' loading="lazy"')+' decoding="async">';
  }
  function frameHTML(f){
    var st='aspect-ratio:'+esc(f.aspect||"16/9")+';'+(f.color?'background:'+esc(f.color)+';':'');
    var h='<div class="g" style="'+st+'">';
    if(f.bg) h+=mediaTag(f.bg,"bg");
    if(f.shade) h+='<span class="shade2" style="opacity:'+(+f.shade)+'"></span>';
    (f.items||[]).forEach(function(it){
      var tl=it.anchor==="tl";
      h+='<span class="in'+(tl?' tl':'')+'" style="left:'+(+it.x)+'%;top:'+(+it.y)+'%;width:'+(+it.w)+'%;aspect-ratio:'+esc(it.aspect||"16/9")+'">'+mediaTag(it.src)+'</span>';
    });
    return h+'</div>';
  }
  function blockHTML(bk){
    if(bk.type==="text") return '<div class="p-grid p-numbered"><span class="p-num" aria-hidden="true"></span><div class="p-desc p-r"><span class="k">'+esc(bk.label)+'</span><p>'+esc(bk.text)+'</p></div></div>';
    if(bk.type==="row") return '<div class="g-row" style="grid-template-columns:repeat('+(bk.cells||[]).length+',minmax(0,1fr))">'+(bk.cells||[]).map(frameHTML).join("")+'</div>';
    return frameHTML(bk);   /* "media" and "frame" */
  }
  function renderDetail(w){
    var n=heroBox.nextSibling; while(n){ var x=n.nextSibling; panel.removeChild(n); n=x; }
    var det=[["Client",w.client],["Role",w.role],["Year",w.year]].filter(function(d){ return d[1]; })
      .map(function(d){ return '<div class="p-detail"><span class="k">'+d[0]+'</span><span>'+esc(d[1])+'</span></div>'; }).join("");
    if((w.services||[]).length) det+='<div class="p-detail tags"><span class="k">Service</span><div class="pills">'+w.services.map(function(s){ return '<span class="pill dark">'+esc(s)+'</span>'; }).join("")+'</div></div>';
    var h='<div class="p-grid"><div class="p-info"><h2 class="p-title">'+esc(w.title)+'</h2><div class="p-details">'+det+'</div>'+
      (w.view?'<a class="p-view" href="'+esc(w.view)+'" target="_blank" rel="noopener"><span class="lb">View work</span></a>':'')+'</div>'+
      '<div class="p-descs">'+(w.descriptions||[]).map(function(d){ return '<div class="p-desc"><span class="k">'+esc(d.label)+'</span><p>'+esc(d.text)+'</p></div>'; }).join("")+'</div></div>';
    h+=(w.blocks||[]).map(blockHTML).join("");
    panel.insertAdjacentHTML("beforeend",h);
    var pv=panel.querySelector(".p-view");
    if(pv) pv.addEventListener("mouseenter",function(){ scramble(pv.querySelector(".lb"),"View work",.6); });
  }
  function lock(){ var sb=window.innerWidth-document.documentElement.clientWidth; document.documentElement.style.overflow="hidden"; document.body.style.paddingRight=sb+"px"; }
  function unlock(){ document.documentElement.style.overflow=""; document.body.style.paddingRight=""; }
  function stopWheel(e){ if(busy) e.preventDefault(); }
  window.addEventListener("wheel",stopWheel,{passive:false});
  window.addEventListener("touchmove",stopWheel,{passive:false});

  /* A copy of the image sits at the destination and is animated with transforms only (GPU) */
  /* The card's own <img> flies (no copy to decode), moved with transforms only */
  function fromRect(from,to){ return {x:from.left-to.left,y:from.top-to.top,scaleX:from.width/to.width,scaleY:from.height/to.height,transformOrigin:"0 0"}; }
  function pin(im,at){ im.classList.add("flying"); im.style.left=at.left+"px"; im.style.top=at.top+"px"; im.style.width=at.width+"px"; im.style.height=at.height+"px"; }
  function unpin(im){ im.classList.remove("flying"); im.style.left=im.style.top=im.style.width=im.style.height=""; gsap.set(im,{clearProps:"transform,transformOrigin"}); }

  /* fill per-project bits of the pop-up */
  function fillProject(card){ var w=WORKS[+card.dataset.i]; if(w) renderDetail(w); }
  function openProject(card){
    if(busy||openCard) return;
    fillProject(card);
    if(isMobile()){
      busy=true; openCard=card;
      var mi=card.querySelector(".media img");
      heroImg.style.objectPosition=getComputedStyle(mi).objectPosition; if(heroImg.src!==mi.src) heroImg.src=mi.src; heroImg.style.opacity=1;
      document.getElementById("mBarTitle").textContent=card.querySelector(".ptitle").textContent;
      mOpen(overlay,function(){ busy=false; });
      return;
    }
    busy=true; openCard=card;
    var media=card.querySelector(".media"), cimg=media.querySelector("img"), from=media.getBoundingClientRect();
    card._soft();
    heroImg.style.opacity=0; heroImg.style.objectPosition=getComputedStyle(cimg).objectPosition;
    if(heroImg.src!==cimg.src) heroImg.src=cimg.src;
    var heroReady=heroImg.decode?heroImg.decode().catch(function(){}):Promise.resolve();
    lock();
    overlay.classList.add("open","busy"); overlay.scrollTop=0;
    gsap.set(panel,{y:0}); var to=heroBox.getBoundingClientRect();
    gsap.set(panel,{y:window.innerHeight,opacity:1});
    gsap.killTweensOf(cimg); gsap.set(cimg,{clearProps:"transform",opacity:1});
    pin(cimg,to); gsap.set(cimg,fromRect(from,to));
    gsap.to(sw,{autoAlpha:0,duration:.3});
    gsap.timeline({onComplete:function(){
        heroReady.then(function(){
          heroImg.style.opacity=1;
          requestAnimationFrame(function(){ unpin(cimg); gsap.set(cimg,{opacity:0}); overlay.classList.remove("busy"); busy=false; });
        });
      }})
      .to(overlay,{backgroundColor:dim(.8),duration:1,ease:"power2.out"},0)
      .to(panel,{y:0,duration:1.2,ease:"power4.out"},0)
      .to(cimg,{x:0,y:0,scaleX:1,scaleY:1,duration:1.2,ease:"power4.out"},0);
  }
  function closeProject(){
    if(busy||!openCard) return;
    if(overlay.classList.contains("m")){ busy=true; mClose(overlay,function(){ openCard=null; busy=false; }); return; }
    busy=true;
    hideClose();
    overlay.classList.add("busy");
    var st=overlay.scrollTop, vh=window.innerHeight, maxSt=Math.max(1,overlay.scrollHeight-overlay.clientHeight);
    var card=openCard, media=card.querySelector(".media"), cimg=media.querySelector("img"), to=media.getBoundingClientRect();
    /* Image leaves at the same moment as the pop-up; if the hero is scrolled out of view it starts just past the screen edge */
    var hr=heroImg.getBoundingClientRect(), from={left:hr.left,top:hr.top,width:hr.width,height:hr.height};
    if(hr.bottom<0) from.top=-hr.height*1.02; else if(hr.top>vh) from.top=vh*1.02;
    /* Past halfway: the pop-up exits upwards through what is left below. Otherwise it slides down through what was scrolled.
       Either way, the longer the trip, the longer it takes — and the image uses the same duration. */
    var upward=st/maxSt>.5, endY, D;
    if(upward){
      var pb=panel.getBoundingClientRect().bottom;
      endY=-pb; D=.65+Math.min(.85,Math.max(0,pb-vh)/5000);
    } else {
      overlay.scrollTop=0; gsap.set(panel,{y:-st});
      endY=vh; D=.65+Math.min(.85,st/5000);
    }
    pin(cimg,to); gsap.set(cimg,fromRect(from,to)); gsap.set(cimg,{opacity:1});
    heroImg.style.opacity=0;
    gsap.timeline({onComplete:function(){
        unpin(cimg);
        overlay.classList.remove("open","busy"); overlay.scrollTop=0; gsap.set(panel,{y:0,opacity:1}); gsap.set(overlay,{backgroundColor:dim(0)});
        unlock(); openCard=null; busy=false; gsap.to(sw,{autoAlpha:1,duration:.3});
      }})
      .to(panel,{y:endY,duration:D,ease:st>40?"power2.in":"power3.in"},0)
      .to(cimg,{x:0,y:0,scaleX:1,scaleY:1,duration:D,ease:"power3.inOut"},0)
      .to(overlay,{backgroundColor:dim(0),duration:.45,ease:"power2.inOut"},Math.max(.25,D-.45));
  }

  /* ---------- Contact pop-up ---------- */
  var cOverlay=document.getElementById("cOverlay"), cPanel=document.getElementById("cPanel"), cOpen=false;
  var cImg=document.getElementById("cImg"), cCv=document.getElementById("cCanvas"), cCtx=cCv.getContext("2d");
  /* Portrait: placeholder until the real photo arrives. src = image element, cx/cy/size = square crop as fractions of the photo */
  var PORTRAIT={img:document.getElementById("portraitImg"),cx:.5,cy:.5,size:1};
  if(PORTRAIT.img.decode) PORTRAIT.img.decode().catch(function(){});

  /* Ordered dither, same settings as the Figma effect: Bayer 16x16, 2 levels, mono, contrast 2, brightness 160%, pixel 4 */
  function bayer(n){ if(n===1) return [[0]]; var s=bayer(n/2),m=n/2,o=[]; for(var y=0;y<n;y++){ o[y]=[]; for(var x=0;x<n;x++){ var q=(y<m?(x<m?0:2):(x<m?3:1)); o[y][x]=s[y%m][x%m]*4+q; } } return o; }
  var B16=bayer(16);
  var dith=document.createElement("canvas"), dctx=dith.getContext("2d"), portraitBox=null;
  function buildDither(){
    var dpr=Math.min(window.devicePixelRatio||1,2), w=cImg.clientWidth, h=cImg.clientHeight;
    cCv.width=dith.width=Math.round(w*dpr); cCv.height=dith.height=Math.round(h*dpr);
    var S, x0, y0;
    if(isMobile()){ var u=w/366; S=360*u; x0=(w-S)/2-3*u; y0=h-S+3*u; }
    else { S=w*518/446.5*.85*1.4; x0=(w-S)/2; y0=Math.max(h-S+S*12/518,-S*.02); }
    var ps=Math.max(2,4*w/446.5)/.8, n=Math.ceil(S/ps);   /* dither cells 25% larger = about 20% less detail */
    var src=PORTRAIT.img, nw=src.naturalWidth, nh=src.naturalHeight, side=Math.min(nw,nh)*PORTRAIT.size;
    var sx=Math.max(0,Math.min(nw-side,nw*PORTRAIT.cx-side/2)), sy=Math.max(0,Math.min(nh-side,nh*PORTRAIT.cy-side/2));
    var small=document.createElement("canvas"); small.width=small.height=n; var sctx=small.getContext("2d");
    sctx.drawImage(src,sx,sy,side,side,0,0,n,n);
    var id=sctx.getImageData(0,0,n,n), d=id.data;
    var fg=hexRGB(getComputedStyle(root).getPropertyValue("--beige").trim()||"#fffaee");
    for(var y=0;y<n;y++) for(var x=0;x<n;x++){
      var i=(y*n+x)*4, l=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255;
      var c=Math.min(1,Math.max(0,(l-.5)*2+.5+.3)), t=(B16[y%16][x%16]+.5)/256;
      if(d[i+3]>=128&&c+t>=1){ d[i]=fg[0]; d[i+1]=fg[1]; d[i+2]=fg[2]; d[i+3]=255; } else d[i+3]=0;
    }
    sctx.putImageData(id,0,0);
    dctx.clearRect(0,0,dith.width,dith.height); dctx.imageSmoothingEnabled=false;
    dctx.drawImage(small,0,0,n,n,x0*dpr,y0*dpr,S*dpr,S*dpr);

    portraitBox={x:Math.max(0,x0*dpr),y:Math.max(0,y0*dpr),w:Math.min(dith.width,S*dpr),h:Math.min(dith.height,S*dpr)};
    initTiles();
  }

  /* Scramble tiles over the dithered portrait (same language as the loader and the grid split) */
  var CT=[], CCOLS=10, CROWS=12, cLoop=false;
  function initTiles(){
    CT=[];
    for(var r=0;r<CROWS;r++) for(var c=0;c<CCOLS;c++){
      var X0=Math.round(c*cCv.width/CCOLS), X1=Math.round((c+1)*cCv.width/CCOLS), Y0=Math.round(r*cCv.height/CROWS), Y1=Math.round((r+1)*cCv.height/CROWS);
      CT.push({c:c,r:r,X:X0,Y:Y0,W:X1-X0,H:Y1-Y0,onAt:0,lockAt:0,scrUntil:0,next:0,fx:0,fy:0,peek:0});
    }
  }
  function nowS(){ return performance.now()/1000; }
  function drawPortrait(){
    var n=nowS(), busyT=false;
    cCtx.clearRect(0,0,cCv.width,cCv.height);
    for(var k=0;k<CT.length;k++){
      var t=CT[k];
      if(n<t.onAt){ busyT=true; continue; }
      var scr=n<t.lockAt||n<t.scrUntil;
      if(scr){
        busyT=true;
        if(n>=t.next){ t.fx=portraitBox.x+Math.random()*Math.max(1,portraitBox.w-t.W); t.fy=portraitBox.y+Math.random()*Math.max(1,portraitBox.h-t.H); t.next=n+.06+Math.random()*.05; }
        cCtx.drawImage(dith,t.fx,t.fy,t.W,t.H,t.X,t.Y,t.W,t.H);
      } else cCtx.drawImage(dith,t.X,t.Y,t.W,t.H,t.X,t.Y,t.W,t.H);
    }
    if(busyT) requestAnimationFrame(drawPortrait); else cLoop=false;
  }
  function kick(){ if(!cLoop){ cLoop=true; requestAnimationFrame(drawPortrait); } }
  function revealPortrait(delay,dur){
    var t0=nowS()+delay;
    CT.forEach(function(t){
      t.onAt=t0+((t.c/CCOLS)*.35+(1-t.r/CROWS)*.1+Math.random()*.15)*dur;
      t.lockAt=t.onAt+(.25+Math.random()*.3)*dur; t.scrUntil=0; t.next=0;
    });
    kick();
  }
  cImg.addEventListener("mousemove",function(e){
    if(!cOpen||busy) return;
    var r=cImg.getBoundingClientRect(), mx=(e.clientX-r.left)/r.width*cCv.width, my=(e.clientY-r.top)/r.height*cCv.height, n=nowS();
    var R=cCv.width/CCOLS*1.5;
    CT.forEach(function(t){
      var d=Math.hypot(t.X+t.W/2-mx,t.Y+t.H/2-my);
      if(d<R&&n>=t.scrUntil+.15&&Math.random()<.5){ t.scrUntil=n+.12+Math.random()*.25; t.next=0; }
    });
    kick();
  });

  /* Keep the portrait's proportions: redraw the dither whenever the frame changes size, instead of stretching the canvas */
  var cRT=null;
  window.addEventListener("resize",function(){
    if(!cOpen) return;
    clearTimeout(cRT);
    cRT=setTimeout(function(){ buildDither(); kick(); },80);
  });
  if(window.ResizeObserver){
    var lastW=0,lastH=0;
    new ResizeObserver(function(){
      if(!cOpen) return;
      var w=cImg.clientWidth,h=cImg.clientHeight;
      if(Math.abs(w-lastW)<1&&Math.abs(h-lastH)<1) return; lastW=w; lastH=h;
      clearTimeout(cRT); cRT=setTimeout(function(){ buildDither(); kick(); },80);
    }).observe(cImg);
  }

  function openContact(){
    if(busy||openCard||cOpen) return;
    if(isMobile()){
      busy=true; cOpen=true;
      mOpen(cOverlay,function(){ busy=false; });
      buildDither(); CT.forEach(function(t){ t.onAt=1e9; }); cCtx.clearRect(0,0,cCv.width,cCv.height);
      revealPortrait(.35,1.1);
      return;
    }
    busy=true; cOpen=true;
    lock();
    cOverlay.classList.add("open","busy"); cOverlay.scrollTop=0;
    buildDither(); CT.forEach(function(t){ t.onAt=1e9; }); cCtx.clearRect(0,0,cCv.width,cCv.height);
    gsap.set(cPanel,{y:window.innerHeight});
    gsap.to(sw,{autoAlpha:0,duration:.3});
    revealPortrait(.45,1.1);
    gsap.timeline({onComplete:function(){ cOverlay.classList.remove("busy"); busy=false; }})
      .to(cOverlay,{backgroundColor:dim(.8),duration:1,ease:"power2.out"},0)
      .to(cPanel,{y:0,duration:1.2,ease:"power4.out"},0);
  }
  function closeContact(){
    if(busy||!cOpen) return;
    if(cOverlay.classList.contains("m")){ busy=true; closeDD(); mClose(cOverlay,function(){ cOpen=false; busy=false; if(sent) resetForm(); }); return; }
    busy=true;
    hideClose(); closeDD();
    cOverlay.classList.add("busy");
    gsap.timeline({onComplete:function(){
        cOverlay.classList.remove("open","busy"); gsap.set(cPanel,{y:0}); gsap.set(cOverlay,{backgroundColor:dim(0)});
        unlock(); cOpen=false; busy=false; gsap.to(sw,{autoAlpha:1,duration:.3});
        if(sent) resetForm();
      }})
      .to(cPanel,{y:window.innerHeight,duration:.65,ease:"power3.in"},0)
      .to(cOverlay,{backgroundColor:dim(0),duration:.45,ease:"power2.inOut"},.25);
  }
  document.getElementById("contactBtn").addEventListener("click",openContact);
  cOverlay.addEventListener("mousemove",function(e){
    if(!cOpen||busy){ hideClose(); return; }
    if(cPanel.contains(e.target)) hideClose(); else showClose(e.clientX,e.clientY);
  });
  cOverlay.addEventListener("mouseleave",hideClose);
  cOverlay.addEventListener("click",function(e){ if(!cPanel.contains(e.target)) closeContact(); });
  document.addEventListener("keydown",function(e){ if(e.key==="Escape"){ if(ddOpen) closeDD(); else closeContact(); } });

  /* Copy e-mail */
  var cMail=document.getElementById("cMail"), mailTxt=cMail.textContent, mailT=null;
  function copyText(s){
    if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(s).catch(fallback);
    fallback(); return Promise.resolve();
    function fallback(){ var ta=document.createElement("textarea"); ta.value=s; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); try{ document.execCommand("copy"); }catch(e){} ta.remove(); }
  }
  cMail.addEventListener("click",function(){
    copyText(cMail.dataset.email);
    clearTimeout(mailT); scramble(cMail,"Copied to clipboard",.5);
    mailT=setTimeout(function(){ scramble(cMail,mailTxt,.6); },1600);
  });

  /* Service dropdown */
  var dd=document.getElementById("fService"), ddBtn=document.getElementById("ddBtn"), ddVal=document.getElementById("ddVal"),
      ddInput=document.getElementById("ddInput"), ddItems=[].slice.call(dd.querySelectorAll("li")), ddOpen=false;
  var chev=dd.querySelector(".chev"), chevTl=null;
  /* The arrow doesn't rotate: it flickers through random orientations, then lands flipped — like the text scramble */
  function chevTo(up){
    if(chevTl) chevTl.kill(); chevTl=gsap.timeline();
    var angles=[0,90,180,270];
    for(var i=0;i<6;i++) chevTl.set(chev,{rotation:angles[Math.floor(Math.random()*4)]},i*.05);
    chevTl.set(chev,{rotation:up?180:0},.3);
  }
  function openDD(){ ddOpen=true; dd.classList.add("open"); chevTo(true); ddBtn.setAttribute("aria-expanded","true"); (ddItems.filter(function(l){ return l.getAttribute("aria-selected")==="true"; })[0]||ddItems[0]).focus({preventScroll:true}); }
  function closeDD(){ if(!ddOpen) return; ddOpen=false; dd.classList.remove("open"); chevTo(false); ddBtn.setAttribute("aria-expanded","false"); }
  ddBtn.addEventListener("click",function(){ ddOpen?closeDD():openDD(); });
  ddItems.forEach(function(li,i){
    li.addEventListener("click",function(){ pick(li); });
    li.addEventListener("keydown",function(e){
      if(e.key==="ArrowDown"){ e.preventDefault(); ddItems[Math.min(ddItems.length-1,i+1)].focus(); }
      else if(e.key==="ArrowUp"){ e.preventDefault(); ddItems[Math.max(0,i-1)].focus(); }
      else if(e.key==="Enter"||e.key===" "){ e.preventDefault(); pick(li); }
      else if(e.key==="Tab"){ closeDD(); }
    });
  });
  /* Several services can be picked; the field lists them in menu order ("Presentation, Website") */
  function pick(li){
    li.setAttribute("aria-selected",li.getAttribute("aria-selected")==="true"?"false":"true");
    var chosen=ddItems.filter(function(x){ return x.getAttribute("aria-selected")==="true"; }).map(function(x){ return x.textContent; });
    ddInput.value=chosen.join(", ");
    dd.classList.toggle("has",chosen.length>0);
    if(chosen.length) dd.classList.remove("invalid");
    scramble(ddVal,chosen.length?chosen.join(", "):"Select service*",.45);
  }
  document.addEventListener("pointerdown",function(e){ if(ddOpen&&!dd.contains(e.target)) closeDD(); });

  /* Success: every text in the form scrambles away, then the globe and the thank-you note scramble in */
  var cDone=document.getElementById("cDone"), cGlobe=document.getElementById("cGlobe");
  cGlobe.appendChild(document.querySelector(".profile .globe svg").cloneNode(true));
  function scrambleOut(el,dur){
    var w=el.getBoundingClientRect().width; el.style.minWidth=w+"px";
    return gsap.to(el,{duration:dur||.5,scrambleText:{text:" ",chars:"01/\\_+-.:",speed:.8}});
  }
  function showSuccess(){
    closeDD();
    /* keep the pop-up exactly the same size while the texts scramble away */
    cPanel.style.height=cPanel.getBoundingClientRect().height+"px";
    var outs=[cTitle,cForm.querySelector(".c-sub .dim"),cMail,ddVal,cSendLb];
    outs.forEach(function(el,i){ gsap.delayedCall(i*.04,function(){ scrambleOut(el,.5); }); });
    cForm.querySelectorAll("input,textarea").forEach(function(f){ f.dataset.ph=f.placeholder; f.placeholder=""; });
    gsap.to(cForm.querySelectorAll(".c-head,.c-fields,.c-actions"),{autoAlpha:0,duration:.35,delay:.45,ease:"power2.in"});
    var parts=[].slice.call(cDone.querySelectorAll("[data-t]"));
    parts.forEach(function(s){ s.textContent=""; });
    gsap.delayedCall(.75,function(){
      cDone.classList.add("on");
      gsap.to(cGlobe,{opacity:1,duration:.01});
      gsap.fromTo(cGlobe,{clipPath:"inset(0% 100% 0% 0%)"},{clipPath:"inset(0% 0% 0% 0%)",duration:.4,ease:"steps(5)"});
      parts.forEach(function(s,i){ gsap.to(s,{duration:.7,delay:.1+i*.08,scrambleText:{text:s.dataset.t,chars:"01/\\_+-.:",revealDelay:.15,speed:.6}}); });
    });
  }

  /* After a successful send, the next opening shows a fresh form */
  function resetForm(){
    sent=false; cForm.reset(); cPanel.style.height="";
    [[cTitle,"Got a project in mind?"],[cForm.querySelector(".c-sub .dim"),"Fill out the form below or contact via"],[cMail,mailTxt],[ddVal,"Select service*"],[cSendLb,"Let’s talk"]]
      .forEach(function(p){ gsap.killTweensOf(p[0]); p[0].textContent=p[1]; p[0].style.minWidth=""; });
    cForm.querySelectorAll("input,textarea").forEach(function(f){ if(f.dataset.ph!==undefined) f.placeholder=f.dataset.ph; });
    ddInput.value=""; dd.classList.remove("has","invalid"); fEmail.classList.remove("invalid");
    ddItems.forEach(function(x){ x.setAttribute("aria-selected","false"); });
    gsap.set(cForm.querySelectorAll(".c-head,.c-fields,.c-actions"),{autoAlpha:1}); cStatus.textContent="";
    cDone.classList.remove("on"); gsap.set(cGlobe,{opacity:0});
    cDone.querySelectorAll("[data-t]").forEach(function(s){ gsap.killTweensOf(s); s.textContent=s.dataset.t; });
  }

  function isEmail(v){ return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,24}$/i.test(v.trim()); }

  /* Form delivery: Web3Forms e-mails every submission to the studio inbox */
  var W3F_KEY="1a4a5bca-b97f-4567-a63c-1d9b38957744", sending=false, cStatus=document.getElementById("cStatus");
  function fail(){
    scramble(cSendLb,"Let’s talk",.5);
    cStatus.textContent=""; scramble(cStatus,"Couldn’t send. Try again or copy the email above.",.6);
  }

  /* Submit: e-mail and service required */
  var cForm=document.getElementById("cForm"), fEmail=document.getElementById("fEmail"), emailIn=cForm.elements.email,
      cSend=document.getElementById("cSend"), cSendLb=cSend.querySelector(".lb"), cTitle=document.getElementById("cTitle"), sent=false;
  /* scramble back to the real label, never to whatever half-scrambled text is on screen */
  cSend.addEventListener("mouseenter",function(){ if(!sent) scramble(cSendLb,sending?"Sending…":"Let’s talk",.6); });
  emailIn.addEventListener("input",function(){ if(fEmail.classList.contains("invalid")&&isEmail(emailIn.value)) fEmail.classList.remove("invalid"); });
  emailIn.addEventListener("blur",function(){ if(emailIn.value&&!isEmail(emailIn.value)){ fEmail.querySelector(".err").textContent="invalid email"; fEmail.classList.add("invalid"); } });
  cForm.addEventListener("submit",function(e){
    e.preventDefault();
    if(sent||sending) return;
    var okEmail=isEmail(emailIn.value), okService=!!ddInput.value;
    fEmail.classList.toggle("invalid",!okEmail); dd.classList.toggle("invalid",!okService);
    fEmail.querySelector(".err").textContent=emailIn.value?"invalid email":"required";
    if(!okEmail||!okService){ (okEmail?ddBtn:emailIn).focus(); return; }
    var f=cForm.elements, name=(f.first.value+" "+f.last.value).trim();
    if(f.botcheck.checked) return;                      /* bots fill the hidden box; people never see it */
    sending=true; cStatus.textContent=""; scramble(cSendLb,"Sending…",.4);
    fetch("https://api.web3forms.com/submit",{
      method:"POST", headers:{"Content-Type":"application/json","Accept":"application/json"},
      body:JSON.stringify({
        access_key:W3F_KEY,
        subject:"New project · "+ddInput.value+(name?" · "+name:""),
        from_name:"Collected Works",
        name:name||"(no name)", email:emailIn.value, service:ddInput.value, message:f.msg.value||"(no description)",
        botcheck:false
      })
    }).then(function(r){ return r.json().catch(function(){ return {success:false}; }); })
      .then(function(res){
        sending=false;
        if(res&&res.success){ sent=true; showSuccess(); }
        else fail();
      })
      .catch(function(){ sending=false; fail(); });
  });

  /* ---------- CV pop-up ---------- */
  var vOverlay=document.getElementById("vOverlay"), vPanel=document.getElementById("vPanel"), vOpen=false;
  function openCV(){
    if(busy||openCard||cOpen||vOpen) return;
    if(isMobile()){ busy=true; vOpen=true; mOpen(vOverlay,function(){ busy=false; }); return; }
    busy=true; vOpen=true;
    lock();
    vOverlay.classList.add("open","busy"); vOverlay.scrollTop=0;
    gsap.set(vPanel,{y:window.innerHeight});
    gsap.to(sw,{autoAlpha:0,duration:.3});
    gsap.timeline({onComplete:function(){ vOverlay.classList.remove("busy"); busy=false; }})
      .to(vOverlay,{backgroundColor:dim(.8),duration:1,ease:"power2.out"},0)
      .to(vPanel,{y:0,duration:1.2,ease:"power4.out"},0);
  }
  function closeCV(){
    if(busy||!vOpen) return;
    if(vOverlay.classList.contains("m")){ busy=true; mClose(vOverlay,function(){ vOpen=false; busy=false; }); return; }
    busy=true;
    hideClose();
    vOverlay.classList.add("busy");
    /* like the work pop-up: past halfway it leaves upwards, otherwise downwards; longer trips take longer */
    var st=vOverlay.scrollTop, vh=window.innerHeight, maxSt=Math.max(1,vOverlay.scrollHeight-vOverlay.clientHeight), endY, D;
    if(st/maxSt>.5){ var pb=vPanel.getBoundingClientRect().bottom; endY=-pb; D=.65+Math.min(.85,Math.max(0,pb-vh)/5000); }
    else { vOverlay.scrollTop=0; gsap.set(vPanel,{y:-st}); endY=vh; D=.65+Math.min(.85,st/5000); }
    gsap.timeline({onComplete:function(){
        vOverlay.classList.remove("open","busy"); vOverlay.scrollTop=0; gsap.set(vPanel,{y:0}); gsap.set(vOverlay,{backgroundColor:dim(0)});
        unlock(); vOpen=false; busy=false; gsap.to(sw,{autoAlpha:1,duration:.3});
      }})
      .to(vPanel,{y:endY,duration:D,ease:st>40?"power2.in":"power3.in"},0)
      .to(vOverlay,{backgroundColor:dim(0),duration:.45,ease:"power2.inOut"},Math.max(.25,D-.45));
  }
  document.getElementById("cvBtn").addEventListener("click",function(e){ e.preventDefault(); openCV(); });
  vOverlay.addEventListener("mousemove",function(e){
    if(!vOpen||busy){ hideClose(); return; }
    if(vPanel.contains(e.target)) hideClose(); else showClose(e.clientX,e.clientY);
  });
  vOverlay.addEventListener("mouseleave",hideClose);
  vOverlay.addEventListener("click",function(e){ if(!vPanel.contains(e.target)) closeCV(); });
  document.addEventListener("keydown",function(e){ if(e.key==="Escape") closeCV(); });

  /* Download the PDF: a normal download link; the single-file preview carries an inline copy */
  var vDl=document.getElementById("vDl"), vDlLb=vDl.querySelector(".lb");
  vDl.addEventListener("mouseenter",function(){ scramble(vDlLb,"Download CV",.6); });
  vDl.addEventListener("click",function(e){
    var inline=document.getElementById("cvPdf");
    if(!inline) return;                       /* real host: let the link download assets/cv.pdf */
    e.preventDefault();
    var bin=atob(inline.textContent.trim()), arr=new Uint8Array(bin.length);
    for(var k=0;k<bin.length;k++) arr[k]=bin.charCodeAt(k);
    var blob=new Blob([arr],{type:"application/pdf"}), name=vDl.getAttribute("download");
    function plain(){ var u=URL.createObjectURL(blob), a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },4000); }
    if(window.claude&&window.claude.use) window.claude.use("downloads").then(function(dl){ dl?dl.save({filename:name,data:blob}).catch(function(){}):plain(); }).catch(plain);
    else plain();
  });

  /* ================= Mobile ================= */
  var mq=window.matchMedia("(max-width:800px)");
  function isMobile(){ return mq.matches; }
  var slotM=document.getElementById("slotM"), slotD=document.getElementById("slotD");
  function placeColorBtn(){ (isMobile()?document.getElementById("slotN"):slotD).appendChild(colorWrap); }
  placeColorBtn();
  if(mq.addEventListener) mq.addEventListener("change",placeColorBtn); else mq.addListener(placeColorBtn);

  /* One fixed more/less control for every mobile layer: it never slides, it scrambles */
  var mToggle=document.getElementById("mToggle"), toggleOn=false;
  function anyLayer(){ return navOpen||cOpen||vOpen||(openCard&&overlay.classList.contains("m")); }
  function layerOpened(){
    if(toggleOn) return; toggleOn=true;
    var atTop=mMore.getBoundingClientRect().top>=0&&window.scrollY<5;
    mToggle.textContent="more"; mToggle.classList.add("on"); mMore.classList.add("away");
    if(!atTop) gsap.fromTo(mToggle,{autoAlpha:0},{autoAlpha:1,duration:.25});
    else gsap.set(mToggle,{autoAlpha:1});
    gsap.to(mToggle,{duration:.45,scrambleText:{text:"less",chars:SCR_CH,speed:.6}});
  }
  function layerClosed(){
    if(anyLayer()||!toggleOn) return; toggleOn=false;
    gsap.to(mToggle,{duration:.45,scrambleText:{text:"more",chars:SCR_CH,speed:.6},onComplete:function(){
      if(toggleOn) return;
      mToggle.classList.remove("on"); mMore.classList.remove("away"); gsap.set(mToggle,{clearProps:"opacity,visibility"});
    }});
  }
  mToggle.addEventListener("click",function(){
    if(busy) return;
    if(vOpen&&vOverlay.classList.contains("m")) closeCV();
    else if(cOpen&&cOverlay.classList.contains("m")) closeContact();
    else if(openCard&&overlay.classList.contains("m")) closeProject();
    else if(navOpen) closeNav();
  });

  /* Pop-ups on mobile slide in from the right */
  function mOpen(ov,done){
    lock(); ov.classList.add("open","busy","m"); ov.scrollTop=0; layerOpened();
    gsap.fromTo(ov,{xPercent:100},{xPercent:0,duration:.8,ease:"power4.out",onComplete:function(){ ov.classList.remove("busy"); if(done) done(); }});
  }
  function mClose(ov,done){
    ov.classList.add("busy");
    gsap.to(ov,{xPercent:100,duration:.55,ease:"power3.in",onComplete:function(){
      ov.classList.remove("open","busy","m"); gsap.set(ov,{xPercent:0}); ov.scrollTop=0; unlock(); if(done) done(); layerClosed();
    }});
  }
  document.querySelectorAll("[data-close]").forEach(function(b){
    b.addEventListener("click",function(e){
      e.stopPropagation();
      var k=b.dataset.close; if(k==="project") closeProject(); else if(k==="contact") closeContact(); else if(k==="cv") closeCV();
    });
  });

  /* "more" menu: on mobile the clock, links and about block live in their own layer, which slides in from the right */
  var leftEl=document.querySelector(".left"), mMore=document.getElementById("mMore"), mNav=document.getElementById("mNav"), navOpen=false;
  var navParts=[leftEl.querySelector(".clockwrap"),leftEl.querySelector(".contact"),leftEl.querySelector(".about")];
  var homes=navParts.map(function(el){ var m=document.createComment("nav-home"); el.parentNode.insertBefore(m,el); return m; });
  function placeNav(){
    if(isMobile()) navParts.forEach(function(el){ mNav.appendChild(el); });
    else navParts.forEach(function(el,i){ homes[i].parentNode.insertBefore(el,homes[i].nextSibling); });
  }
  placeNav();
  function openNav(){
    if(busy||navOpen) return; busy=true; navOpen=true;
    mMore.setAttribute("aria-expanded","true");
    lock(); mNav.classList.add("open"); gsap.set(colorWrap,{autoAlpha:1}); layerOpened();
    gsap.fromTo(mNav,{xPercent:100},{xPercent:0,duration:.8,ease:"power4.out",onComplete:function(){ busy=false; }});
  }
  function closeNav(){
    if(busy||!navOpen) return; busy=true;
    mMore.setAttribute("aria-expanded","false");
    if(typeof closePicker==="function") closePicker();
    gsap.to(mNav,{xPercent:100,duration:.55,ease:"power3.in",onComplete:function(){
      mNav.classList.remove("open"); gsap.set(mNav,{xPercent:0}); unlock(); navOpen=false; busy=false; layerClosed();
    }});
  }
  mMore.addEventListener("click",openNav);
  function onMq(){
    if(!isMobile()&&navOpen){ mNav.classList.remove("open"); gsap.set(mNav,{xPercent:0}); navOpen=false; unlock(); }
    placeNav();
  }
  if(mq.addEventListener) mq.addEventListener("change",onMq); else mq.addListener(onMq);

  /* Warm-up: lay out and paint the pop-up once while invisible, so the first open has no first-paint cost */
  (window.requestIdleCallback||function(f){ setTimeout(f,900); })(function(){
    if(openCard) return;
    overlay.style.opacity="0"; overlay.style.pointerEvents="none"; overlay.classList.add("open");
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      if(!openCard) overlay.classList.remove("open");
      overlay.style.opacity=""; overlay.style.pointerEvents="";
    }); });
  });

  var closeShown=false;
  function showClose(x,y){
    gsap.set(closeBox,{x:x,y:y,xPercent:-50,yPercent:-50});
    if(closeShown) return; closeShown=true;
    gsap.to(closeBox,{opacity:1,duration:.15});
    scramble(closeText,"close",.6);
  }
  function hideClose(){ if(!closeShown) return; closeShown=false; gsap.to(closeBox,{opacity:0,duration:.15}); }
  overlay.addEventListener("mousemove",function(e){
    if(!openCard||busy){ hideClose(); return; }
    if(panel.contains(e.target)) hideClose(); else showClose(e.clientX,e.clientY);
  });
  overlay.addEventListener("mouseleave",hideClose);
  overlay.addEventListener("click",function(e){ if(!panel.contains(e.target)) closeProject(); });
  document.addEventListener("keydown",function(e){ if(e.key==="Escape") closeProject(); });



  /* ---------- Intro: everything else appears after the loader (A = line stagger, B = scramble like the social links) ---------- */
  function textEls(scope,sel){ return [].slice.call(scope.querySelectorAll(sel)); }
  var groups=[];
  /* left column, in reading order */
  groups.push({root:document.querySelector(".left"),items:[
    {el:document.querySelector("h1"),t:"text"},
    {el:document.getElementById("clock"),t:"box"},
    {els:textEls(document,".contact .glitch"),t:"word"},
    {el:document.getElementById("profile"),t:"profile"},
    {el:document.querySelector(".bio"),t:"text"}
  ]});
  /* each project card */
  cards.forEach(function(c,ci){
    /* only the first 2 works animate in with the page; everything further down is simply there when you scroll to it */
    if(ci>=2) return;
    groups.push({root:c,items:[
      {el:c.querySelector(".type"),t:"word"},
      {el:c.querySelector(".ptitle"),t:"text"},
      {els:textEls(c,".desc .pill"),t:"pill"},
      {els:textEls(c,".desc p"),t:"text"}
    ]});
  });
  
  function each(it,f){ (it.els||[it.el]).forEach(function(el){ if(el) f(el); }); }
  /* Hide everything up front (the loader covers the page, so nothing flashes) */
  function prep(){
    groups.forEach(function(g){ g.items.forEach(function(it){ each(it,function(el){
      if(it.t==="box"){ gsap.set(el,{autoAlpha:0,y:12}); return; }
      if(it.t==="profile"){ gsap.set(el,{autoAlpha:0}); return; }
      if(it.t==="pill"){ el._txt=el.textContent; gsap.set(el,{autoAlpha:0}); return; }
      el._split=SplitText.create(el,{type:"lines"});
      gsap.set(el._split.lines,{autoAlpha:0});
    }); }); });
  }
  function revealGroup(g,delay){
    if(g.done) return; g.done=true;
    var t=delay||0;
    g.items.forEach(function(it){
      each(it,function(el){
        if(it.t==="box"){ gsap.to(el,{autoAlpha:1,y:0,duration:.9,ease:"power2.out",delay:t,stagger:.05}); t+=.04; return; }
        if(it.t==="pill"){
          gsap.set(el,{autoAlpha:1,delay:t}); gsap.delayedCall(t,function(){ scramble(el,el._txt,.6); });
          t+=.05; return;
        }
        if(it.t==="profile"){
          gsap.to(el,{autoAlpha:1,duration:.5,delay:t});
          el.querySelectorAll(".face.a [data-s]").forEach(function(s){ gsap.delayedCall(t,function(){ scramble(s,s._txt,.7); }); });
          t+=.06; return;
        }
        var sp=el._split; if(!sp) return;
          sp.lines.forEach(function(ln,i){
            var txt=ln.textContent;
            gsap.set(ln,{autoAlpha:1,delay:t+i*.05});
            gsap.to(ln,{duration:Math.min(1.1,.5+txt.length*.008),delay:t+i*.05,
              scrambleText:{text:txt,chars:SCR_CH,revealDelay:.15,speed:.6},
              onComplete:i===sp.lines.length-1?function(){ sp.revert(); el._split=null; }:null});
          });
          t+=.06+sp.lines.length*.04;
      });
    });
  }
  var introStarted=false;
  function startIntro(){
    if(introStarted) return; introStarted=true;
    /* everything that animates does so right away (even off-screen), so nothing is left waiting for a scroll */
    var d=0;
    groups.forEach(function(g){ revealGroup(g,d); d+=.12; });
  }
  if(!reduce) prep();


  /* Tile scramble used by the loader in the scramble intro */
  function scrambleReveal(im,box,dur,z){
    var COLS=10, ROWS=6, dpr=Math.min(window.devicePixelRatio||1,2);
    var cv=document.createElement("canvas"), ctx=cv.getContext("2d");
    cv.width=Math.round(box.width*dpr); cv.height=Math.round(box.height*dpr);
    cv.style.cssText="position:fixed;pointer-events:none;left:"+box.left+"px;top:"+box.top+"px;width:"+box.width+"px;height:"+box.height+"px;z-index:"+z;
    document.body.appendChild(cv);
    var nw=im.naturalWidth, nh=im.naturalHeight, s=Math.max(box.width/nw,box.height/nh);
    var pos=(getComputedStyle(im).objectPosition||"50% 50%").split(" "), px=parseFloat(pos[0])/100, py=parseFloat(pos[1]||"50%")/100;
    var vw=box.width/s, vh=box.height/s, ox=(nw-vw)*px, oy=(nh-vh)*py, tw=vw/COLS, th=vh/ROWS;
    var tiles=[];
    for(var r=0;r<ROWS;r++) for(var c=0;c<COLS;c++){
      var X0=Math.round(c*cv.width/COLS), X1=Math.round((c+1)*cv.width/COLS), Y0=Math.round(r*cv.height/ROWS), Y1=Math.round((r+1)*cv.height/ROWS);
      /* like scrambleText: tiles switch on in a loose left-to-right sweep, flicker through random fragments, then lock */
      var on=(c/COLS)*.35+Math.random()*.15, lock=on+.25+Math.random()*.3;
      tiles.push({c:c,r:r,X:X0,Y:Y0,W:X1-X0,H:Y1-Y0,on:on,lock:Math.min(.98,lock),next:0,fx:0,fy:0});
    }
    var t0=performance.now();
    function frame(now){
      var p=(now-t0)/1000/dur;
      ctx.clearRect(0,0,cv.width,cv.height);
      for(var k=0;k<tiles.length;k++){
        var tl=tiles[k];
        if(p<tl.on) continue;
        var sx,sy;
        if(p>=tl.lock){ sx=ox+tl.c*tw; sy=oy+tl.r*th; }
        else {
          if(now>=tl.next){ tl.fx=Math.random()*(nw-tw); tl.fy=Math.random()*(nh-th); tl.next=now+60+Math.random()*50; }
          sx=tl.fx; sy=tl.fy;
        }
        ctx.drawImage(im,sx,sy,tw,th,tl.X,tl.Y,tl.W,tl.H);
      }
      if(p<1) requestAnimationFrame(frame);
      else { gsap.set(im,{clipPath:"inset(0% 0% 0% 0%)"}); requestAnimationFrame(function(){ cv.remove(); }); }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Loader ---------- */
  (function(){
    var L=document.getElementById("loader"), box=L.querySelector(".ld-box"), bgL=L.querySelector(".ld-bg");
    function done(){ L.remove(); document.documentElement.classList.remove("loading"); }
    if(reduce){ done(); return; }
    window.wayLoaderRunning=true;
    if("scrollRestoration" in history) history.scrollRestoration="manual";
    window.scrollTo(0,0); lock(); busy=true;
    gsap.set(sw,{autoAlpha:0});
    var imgs=cardImgs.slice(), N=imgs.length;
    var decoded=Promise.all(imgs.map(function(im){ return im.decode?im.decode().catch(function(){}):null; }));
    Promise.race([decoded,new Promise(function(r){ setTimeout(r,6000); })]).then(function(){
      var b=box.getBoundingClientRect();
      imgs.forEach(function(im,i){
        var to=im.closest(".media").getBoundingClientRect();
        pin(im,to); im.style.zIndex=51+i*2;
        gsap.set(im,fromRect(b,to)); gsap.set(im,{clipPath:"inset(100% 0% 0% 0%)",opacity:1});
      });
      document.documentElement.classList.remove("loading");
      /* Every work is shown; past ~5 works the rhythm tightens so the whole loader never exceeds 4s */
      var FIXED=.15+.6+.2+1.15, CAP=4, k=N>1?Math.min(1,(CAP-FIXED)/((N-1)*(.35+.07))):1;
      var STEP=.35*k, FLYGAP=.07*k, REVEAL=.6*Math.max(.5,k);
      var tl=gsap.timeline({onComplete:function(){
        imgs.forEach(function(im){ unpin(im); im.style.zIndex=""; gsap.set(im,{clearProps:"clipPath"}); });
        L.remove(); unlock(); busy=false; window.wayLoaderRunning=false;
        gsap.to(sw,{autoAlpha:1,duration:.4});
      }});
      /* 1. Reveal each work in turn with a bottom-up crop mask */
      /* each work appears as tiles of random image fragments that lock into place, like the text scramble */
      imgs.forEach(function(im,i){
        tl.add(function(){ scrambleReveal(im,b,REVEAL,51+i*2+1); },.15+i*STEP);
        tl.to({},{duration:REVEAL},.15+i*STEP);
      });
      /* 2. All scale up and slide to where their cards sit; top of the stack leaves first */
      tl.addLabel("fly","+=.2");
      tl.add(startIntro,"fly+=.35");
      tl.to(bgL,{opacity:0,duration:.8,ease:"power2.inOut"},"fly+=.15");
      for(var i=N-1;i>=0;i--){ tl.to(imgs[i],{x:0,y:0,scaleX:1,scaleY:1,duration:1.15,ease:"power4.inOut"},"fly+="+((N-1-i)*FLYGAP)); }
    });
  })();
})();
