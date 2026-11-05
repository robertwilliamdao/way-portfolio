/* Play around: infinite wrapped canvas seen through a "globe" — items squeeze, shrink and tilt toward the left/right edges */
(function(){
  var DATA=window.PLAY||[], stage=document.getElementById("stage"), N=DATA.length;
  if(!N) return;
  var WW=2300, WH=1600, W=innerWidth, H=innerHeight;
  var cam={x:0,y:0,z:1}, vx=0, vy=0, lbOpen=false;
  /* deterministic scatter: jittered grid over the wrapped world */
  var seed=11; function rnd(){ seed=(seed*16807)%2147483647; return seed/2147483647; }
  var cols=Math.ceil(Math.sqrt(N*WW/WH)), rows=Math.ceil(N/cols), cw=WW/cols, ch=WH/rows;
  var thumb=function(s){ return s.replace(/-r\.webp$/,"-r-640.webp"); }, big=function(s){ return s.replace(/-r\.webp$/,"-r-1280.webp"); };
  var items=DATA.map(function(d,i){
    var w=170+rnd()*110, ar=[1.78,1.25,.8,1][i%4], el=document.createElement("div"); el.className="it";
    var im=new Image(); im.src=thumb(d.src); im.alt=d.title||""; im.decoding="async"; el.appendChild(im);
    el.style.width=w+"px"; el.style.height=(w/ar)+"px"; stage.appendChild(el);
    var it={d:d,el:el,w:w,h:w/ar,x:(i%cols+.2+rnd()*.6)*cw,y:(Math.floor(i/cols)+.2+rnd()*.6)*ch};
    im.onload=function(){ if(im.naturalWidth){ it.h=w*im.naturalHeight/im.naturalWidth; el.style.height=it.h+"px"; kick(); } };
    return it;
  });
  function wrap(v,s){ return ((v+s/2)%s+s)%s-s/2; }
  function render(){
    var R=W*.62, Ry=H*1.25, z=cam.z;
    for(var i=0;i<N;i++){
      var it=items[i], dx=wrap(it.x-cam.x,WW)*z, dy=wrap(it.y-cam.y,WH)*z;
      var ax=dx/R, ay=dy/Ry, lim=1.45;
      if(Math.abs(ax)>lim||Math.abs(ay)>lim){ it.el.style.visibility="hidden"; continue; }
      var cx=Math.cos(ax), cy=Math.cos(ay), sx=Math.sin(ax)*R, sy=Math.sin(ay)*Ry;
      var s=z*(.35+.65*cx)*(.8+.2*cy);
      it.el.style.visibility="visible";
      it.el.style.opacity=Math.max(0,Math.min(1,(cx-.05)*2.2));
      it.el.style.zIndex=Math.round(cx*100);
      it.el.style.transform="translate3d("+(W/2+sx-it.w/2)+"px,"+(H/2+sy-it.h/2)+"px,0) rotateY("+(-ax*.85)+"rad) scale("+s+")";
    }
  }
  var raf=0;
  function tick(){
    raf=0;
    if(!lbOpen&&!drag){ cam.x+=vx/cam.z; cam.y+=vy/cam.z; vx*=.93; vy*=.93; if(Math.abs(vx)<.02&&Math.abs(vy)<.02) vx=vy=0; }
    render(); if(vx||vy||drag) raf=requestAnimationFrame(tick);
  }
  function kick(){ if(!raf) raf=requestAnimationFrame(tick); }
  function zoomTo(z){ cam.z=Math.max(.45,Math.min(1.8,z)); kick(); }
  /* drag (mouse/touch) + pinch */
  var drag=false, moved=0, last=null, ptrs={}, pd=0;
  stage.addEventListener("pointerdown",function(e){
    if(lbOpen) return; ptrs[e.pointerId]=e; stage.setPointerCapture(e.pointerId);
    var k=Object.keys(ptrs); if(k.length===1){ drag=true; moved=0; last=[e.clientX,e.clientY]; vx=vy=0; stage.classList.add("drag"); kick(); }
    else if(k.length===2){ pd=Math.hypot(ptrs[k[0]].clientX-ptrs[k[1]].clientX,ptrs[k[0]].clientY-ptrs[k[1]].clientY); }
  });
  stage.addEventListener("pointermove",function(e){
    if(!ptrs[e.pointerId]) return; ptrs[e.pointerId]=e; var k=Object.keys(ptrs);
    if(k.length===2){ var d=Math.hypot(ptrs[k[0]].clientX-ptrs[k[1]].clientX,ptrs[k[0]].clientY-ptrs[k[1]].clientY); if(pd) zoomTo(cam.z*d/pd); pd=d; moved=99; return; }
    if(!drag) return; var dx=e.clientX-last[0], dy=e.clientY-last[1]; last=[e.clientX,e.clientY]; moved+=Math.abs(dx)+Math.abs(dy);
    vx=-dx*.9; vy=-dy*.9; cam.x+=-dx/cam.z; cam.y+=-dy/cam.z; kick();
  });
  function up(e){ delete ptrs[e.pointerId]; if(!Object.keys(ptrs).length){ drag=false; stage.classList.remove("drag"); kick(); } pd=0; }
  stage.addEventListener("pointerup",function(e){
    var wasClick=moved<6; up(e);
    if(wasClick){ var t=document.elementFromPoint(e.clientX,e.clientY), el=t&&t.closest(".it"); if(el) openLb(items.filter(function(i){ return i.el===el; })[0]); }
  });
  stage.addEventListener("pointercancel",up);
  stage.addEventListener("wheel",function(e){
    e.preventDefault(); if(lbOpen) return;
    if(e.ctrlKey||e.metaKey) zoomTo(cam.z*Math.exp(-e.deltaY*.01));
    else { cam.x+=e.deltaX/cam.z; cam.y+=e.deltaY/cam.z; vx=e.deltaX*.15; vy=e.deltaY*.15; kick(); }
  },{passive:false});
  document.getElementById("zi").onclick=function(){ zoomTo(cam.z*1.25); };
  document.getElementById("zo").onclick=function(){ zoomTo(cam.z/1.25); };
  addEventListener("resize",function(){ W=innerWidth; H=innerHeight; kick(); });
  /* lightbox: the shot flies from where it sits to the centre of the screen, and back */
  var lb=document.getElementById("lb"), lbImg=document.getElementById("lbImg"), cap=document.getElementById("lbCap"), cur=null;
  function fit(it){ var s=Math.min(W*.88/it.w,H*.74/it.h); return {w:it.w*s,h:it.h*s,x:(W-it.w*s)/2,y:(H-it.h*s)/2-H*.03}; }
  function place(r,box){ lbImg.style.width=box.w+"px"; lbImg.style.height=box.h+"px"; }
  function openLb(it){
    if(!it||lbOpen) return; lbOpen=true; cur=it; vx=vy=0;
    var r=it.el.getBoundingClientRect(), box=fit(it);
    lbImg.src=thumb(it.d.src); lbImg.style.width=box.w+"px"; lbImg.style.height=box.h+"px";
    cap.querySelector("b").textContent=it.d.title||""; cap.querySelector("span").textContent=it.d.note||"";
    lbImg.style.transition="none";
    lbImg.style.transform="translate("+r.left+"px,"+r.top+"px) scale("+(r.width/box.w)+","+(r.height/box.h)+")";
    lb.classList.add("on"); it.el.style.visibility="hidden"; void lbImg.offsetWidth;
    lbImg.style.transition=""; lb.classList.add("in");
    lbImg.style.transform="translate("+box.x+"px,"+box.y+"px) scale(1)";
    var hi=new Image(); hi.onload=function(){ if(cur===it) lbImg.src=hi.src; }; hi.src=big(it.d.src);
  }
  function closeLb(){
    if(!lbOpen) return; var it=cur; lb.classList.remove("in");
    var r=it.el.getBoundingClientRect(), box=fit(it);
    it.el.style.visibility="visible";
    lbImg.style.transform="translate("+r.left+"px,"+r.top+"px) scale("+(r.width/box.w)+","+(r.height/box.h)+")";
    setTimeout(function(){ lb.classList.remove("on"); lbOpen=false; cur=null; kick(); },600);
  }
  lb.addEventListener("click",closeLb);
  addEventListener("keydown",function(e){ if(e.key==="Escape") closeLb(); });
  render(); kick();
})();
