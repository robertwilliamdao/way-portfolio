/* Play around — a globe of shots (WebGL2, no libraries).
   WayPlay.mount(root,{onBack,standalone}) builds the scene inside `root` and returns {canvas,start,step,resume,pause,dpr}.
   - Cards are flat billboards laid out on a sphere (Fibonacci), always facing the screen.
   - Depth: cards at the back are smaller, dimmer and blurrier.
   - Drag = trackball rotation with inertia; wheel / pinch / buttons = zoom; click = pop-up.
   - While rotating, every card gets a grid scramble (tiles jump, rescale and split RGB).
   - A post pass dithers + blurs + glitches whatever sits on the left / right screen edges (only run when a card is there).
   Cost control: render scale ≤1.5 (drops by itself on slow GPUs), post pass only on the two edge strips and only when
   needed, ~30fps while nothing moves, nothing at all while the pop-up is open. */
(function(){
  "use strict";
  var TEMPLATE='<canvas class="wp-gl"></canvas>'+
    '<div class="wp-bar wp-top"><a href="index.html" class="wp-back">Back</a></div>'+
    '<div class="wp-bar wp-bot"><span class="wp-hint">Kéo để xoay · Cuộn để zoom · Bấm vào shot để xem</span><span class="wp-cap">Play around</span>'+
    '<div class="wp-zoom"><button class="wp-zo" aria-label="Zoom out">−</button><button class="wp-zi" aria-label="Zoom in">+</button></div></div>'+
    '<div class="wp-lb"><img class="wp-lbimg" alt=""><div class="wp-lbcap"><b></b><span></span></div></div>';

  function mount(root,opt){
    opt=opt||{};
    var DATA=window.PLAY||[], N=DATA.length;
    if(!N) return null;
    root.innerHTML=TEMPLATE;
    var $=function(s){ return root.querySelector(s); };
    var cv=$(".wp-gl"), cap=$(".wp-cap"), lb=$(".wp-lb"), lbImg=$(".wp-lbimg"), lbCap=$(".wp-lbcap");
    var thumbOf=function(s){ return s.replace(/-r\.webp$/,"-r-640.webp"); }, bigOf=function(s){ return s.replace(/-r\.webp$/,"-r-1280.webp"); };
    var tUrl=function(d){ return d.thumb||thumbOf(d.src); }, bUrl=function(d){ return d.big||bigOf(d.src); };
    var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    var BG=[16/255,16/255,16/255];
    var noop=function(){};
    var lite=false, api={canvas:null,start:noop,step:noop,resume:noop,pause:noop,lite:noop,dpr:function(){ return 1; }};
    var gl=cv.getContext("webgl2",{alpha:false,antialias:false});
    $(".wp-back").addEventListener("click",function(e){ if(opt.onBack){ e.preventDefault(); opt.onBack(); } });

    /* No WebGL2: plain grid of the shots */
    if(!gl){
      cv.remove(); var g=document.createElement("div"); g.className="wp-fb";
      DATA.forEach(function(d){ var a=document.createElement("a"), im=new Image(); a.href=bUrl(d); a.target="_blank"; im.src=tUrl(d); im.alt=d.title||""; a.appendChild(im); g.appendChild(a); });
      root.appendChild(g); if(opt.standalone) root.classList.add("on"); return api;
    }

  /* ---------- shaders ---------- */
  var VS="#version 300 es\nuniform vec4 uRect;out vec2 vUv;void main(){vec2 p=vec2(float(gl_VertexID&1),float((gl_VertexID>>1)&1));vUv=vec2(p.x,1.-p.y);gl_Position=vec4((uRect.xy+p*uRect.zw)*2.-1.,0.,1.);}";
  var HASH="float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}";
  var FS_CARD="#version 300 es\nprecision highp float;in vec2 vUv;out vec4 o;"+
    "uniform sampler2D uTex;uniform vec2 uCrop,uOff,uG,uAsp;uniform float uScr,uSeed,uT,uBlur,uLod,uFog;uniform vec3 uBg;"+HASH+
    "vec3 tap(vec2 p){if(uBlur<.002)return texture(uTex,p).rgb;vec2 o=.7071*uBlur*uAsp;"+
    "return (textureLod(uTex,p,uLod).rgb+textureLod(uTex,p+o,uLod).rgb+textureLod(uTex,p-o,uLod).rgb+textureLod(uTex,p+vec2(o.x,-o.y),uLod).rgb+textureLod(uTex,p+vec2(-o.x,o.y),uLod).rgb)*.2;}"+
    "void main(){vec2 uv=vUv,ca=vec2(0.);float on=0.;"+
    "if(uScr>.002){vec2 cell=floor(uv*uG);float tq=floor(uT*14.);float r=h21(cell+uSeed*17.1+tq*3.7);on=step(1.-uScr*.9,r);"+
    "if(on>0.){vec2 cc=(cell+.5)/uG;vec2 j=vec2(h21(cell+tq+1.7+uSeed),h21(cell*1.3+tq+9.1+uSeed))-.5;float sc=.55+h21(cell+tq+3.3+uSeed)*1.1;"+
    "uv=cc+(uv-cc)/sc+j*.32*uScr;ca=j.yx*.014*uScr;}}"+
    "uv=clamp(uv,0.,1.);vec2 t=uOff+uv*uCrop;vec3 c;"+
    "if(on>0.)c=vec3(textureLod(uTex,t+ca,uLod).r,textureLod(uTex,t,uLod).g,textureLod(uTex,t-ca,uLod).b);else c=tap(t);"+
    "o=vec4(mix(uBg,c,uFog),1.);}";
  var FS_POST="#version 300 es\nprecision highp float;out vec4 o;uniform sampler2D uScene;uniform vec2 uRes;uniform float uT,uGl,uDpr;uniform vec3 uBg;"+HASH+
    "const float B[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);"+
    "float bayer(vec2 p){ivec2 i=ivec2(mod(p,4.));return (B[i.y*4+i.x]+.5)/16.;}"+
    "void main(){vec2 fc=gl_FragCoord.xy;float ex=abs(fc.x/uRes.x-.5)*2.;float e=smoothstep(.62,1.,ex);"+
    "if(e<=0.){o=vec4(texelFetch(uScene,ivec2(fc),0).rgb,1.);return;}"+
    "float cell=max(1.,floor(mix(1.,7.,e*e)+.5))*uDpr;vec2 cp=floor(fc/cell);"+
    "float tq=floor(uT*9.);float band=floor(fc.y/(uDpr*9.));float rr=h21(vec2(band,tq));"+
    "float slide=step(.9-.28*uGl,rr)*(h21(vec2(band+3.,tq))-.5)*.12*e;"+
    "vec2 suv=((cp+.5)*cell)/uRes+vec2(slide,0.);vec2 rad=vec2(e*e*18.*uDpr)/uRes;"+
    "vec3 c=texture(uScene,suv).rgb*.2;"+
    "for(int i=0;i<8;i++){float a=.785398*float(i);c+=texture(uScene,suv+vec2(cos(a),sin(a))*rad).rgb*.1;}"+
    "float lv=mix(255.,3.,smoothstep(0.,1.,pow(e,.6)));vec3 d=max(c-uBg,0.);c=uBg+floor(d*lv+bayer(cp))/lv;"+
    "float vis=step(bayer(floor(cp*.5)+2.),1.-e*e*.94);vis*=1.-step(.985,h21(cp+tq*3.1))*e;"+
    "o=vec4(min(mix(uBg,c,vis),1.),1.);}";
  function sh(t,s){ var x=gl.createShader(t); gl.shaderSource(x,s); gl.compileShader(x); if(!gl.getShaderParameter(x,gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(x)); return x; }
  function prog(fs){
    var p=gl.createProgram(); gl.attachShader(p,sh(gl.VERTEX_SHADER,VS)); gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    p.u={}; for(var i=0,n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i<n;i++){ var nm=gl.getActiveUniform(p,i).name; p.u[nm]=gl.getUniformLocation(p,nm); }
    return p;
  }
    var PC=prog(FS_CARD), PP=prog(FS_POST);

    /* ---------- size (render scale drops on its own when frames get slow) + scene framebuffer (only when the edge pass is needed) ---------- */
    var QS=[1.5,1.25,1], qi=0, W=0,H=0,Wd=0,Hd=0,dpr=1, fbo=null, ftex=null, fboW=0, fboH=0, needPost=false;
    function resize(){ W=innerWidth; H=innerHeight; dpr=Math.min(devicePixelRatio||1,QS[qi]); Wd=Math.round(W*dpr); Hd=Math.round(H*dpr); cv.width=Wd; cv.height=Hd; }
    function ensureFbo(){
      if(!fbo){ fbo=gl.createFramebuffer(); ftex=gl.createTexture(); }
      if(fboW===Wd&&fboH===Hd) return; fboW=Wd; fboH=Hd;
      gl.bindTexture(gl.TEXTURE_2D,ftex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,Wd,Hd,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,ftex,0);
    }
    addEventListener("resize",resize); resize(); ensureFbo();

  /* ---------- textures (shared by url) ---------- */
  var cache={};
  function texParams(mip){
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,mip?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  }
  function loadTex(url,cb){
    var t=cache[url]; if(t){ if(t.ready) cb(t); else t.cbs.push(cb); return t; }
    t=cache[url]={tex:gl.createTexture(),ready:false,cbs:[cb],w:1,h:1};
    gl.bindTexture(gl.TEXTURE_2D,t.tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([30,30,30,255])); texParams(false);
    var im=new Image(); im.decoding="async";
    im.onload=function(){
      gl.bindTexture(gl.TEXTURE_2D,t.tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im); gl.generateMipmap(gl.TEXTURE_2D); texParams(true);
      t.w=im.naturalWidth; t.h=im.naturalHeight; t.ready=true; t.cbs.forEach(function(f){ f(t); }); t.cbs=[];
    };
    im.src=url; return t;
  }

  /* ---------- cards on a sphere ---------- */
  var seed=7; function rnd(){ seed=(seed*16807)%2147483647; return seed/2147483647; }
  var T0=performance.now()/1000;
  var cards=DATA.map(function(d,i){
    var y=1-2*(i+.5)/N, r=Math.sqrt(Math.max(0,1-y*y)), th=i*2.399963;
    var p=[Math.cos(th)*r+(rnd()-.5)*.2, y+(rnd()-.5)*.2, Math.sin(th)*r+(rnd()-.5)*.2], l=Math.hypot(p[0],p[1],p[2]);
    var c={d:d,i:i,p:[p[0]/l,p[1]/l,p[2]/l],ar:d.ar||.8,crop:[1,1],off:[0,0],hv:0,hide:false,born:null,rect:{x:0,y:0,w:0,h:0},fog:1,seed:i*.731,lod:0};
    function setCrop(t){
      var nat=t?t.w/t.h:0, ar=d.ar||nat||.8, cx=1, cy=1; c.ar=ar;
      if(nat){ if(nat>ar) cx=ar/nat; else cy=nat/ar; }
      var pos=d.pos||[.5,.5]; c.crop=[cx,cy]; c.off=[pos[0]*(1-cx),pos[1]*(1-cy)]; c.texW=t?t.w:1;
    }
    c.tex=loadTex(tUrl(d),function(t){ setCrop(t); c.born=performance.now()/1000+i*.045; });
    setCrop(null); return c;
  });

  /* ---------- rotation (3x3, row-major) ---------- */
  var M=[1,0,0,0,1,0,0,0,1];
  function mul(a,b){ var o=[]; for(var r=0;r<3;r++) for(var c=0;c<3;c++) o.push(a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c]); return o; }
  function rot(ax,ay){   /* screen-space: ax about the vertical axis, ay about the horizontal axis */
    var c1=Math.cos(ax),s1=Math.sin(ax),c2=Math.cos(ay),s2=Math.sin(ay);
    M=mul([c1,0,s1,0,1,0,-s1,0,c1],mul([1,0,0,0,c2,-s2,0,s2,c2],M));
    var a=M, l=Math.hypot(a[0],a[1],a[2]); a[0]/=l;a[1]/=l;a[2]/=l;
    var d=a[0]*a[3]+a[1]*a[4]+a[2]*a[5]; a[3]-=d*a[0];a[4]-=d*a[1];a[5]-=d*a[2];
    l=Math.hypot(a[3],a[4],a[5]); a[3]/=l;a[4]/=l;a[5]/=l;
    a[6]=a[1]*a[5]-a[2]*a[4]; a[7]=a[2]*a[3]-a[0]*a[5]; a[8]=a[0]*a[4]-a[1]*a[3];
  }
  rot(.6,-.3);


    /* ---------- state ---------- */
    var Z=.6, zt=1, w={x:0,y:0}, pend={x:0,y:0}, dragging=false, moved=0, ptrs={}, pd=0, last=null;
    var mouse={x:-1e4,y:-1e4}, hovCard=null, lbOpen=false, cur=null, order=[], Rpx=1, e0=1, scrUser=0;
    var D=2.6, running=false, raf=0, lastT=performance.now(), lastRender=0, activeUntil=0, frozenAt=0, bad=0, warmup=0;
    function sstep(a,b,x){ x=Math.max(0,Math.min(1,(x-a)/(b-a))); return x*x*(3-2*x); }
    function clampZ(z){ return Math.max(.5,Math.min(4,z)); }
    function touch(){ activeUntil=performance.now()+700; }

    function project(){
      var nn=Math.max(N,4), base=Math.min(.30*H,.34*W), zl=.2*W+24, zr=.8*W-24;
      Rpx=base*Math.pow(nn/20,.25); e0=Rpx*.28*Math.min(1.5,Math.pow(20/nn,.25)); needPost=false;
      cards.forEach(function(c){
        var p=c.p, x=M[0]*p[0]+M[1]*p[1]+M[2]*p[2], y=M[3]*p[0]+M[4]*p[1]+M[5]*p[2], z=M[6]*p[0]+M[7]*p[1]+M[8]*p[2];
        var t=(z+1)/2, f=D/(D-z), s=f*Z, k=1+.07*c.hv;
        var cw=e0*Math.sqrt(c.ar), ch=e0/Math.sqrt(c.ar), m=Math.max(cw,ch)/(e0*1.35); if(m>1){ cw/=m; ch/=m; }
        cw*=s*k; ch*=s*k;
        var cx=W/2+x*Rpx*s, cy=H/2-y*Rpx*s;
        c.z=z; c.cx=cx; c.cy=cy; c.rect={x:cx-cw/2,y:cy-ch/2,w:cw,h:ch};
        if(!c.hide&&(c.rect.x<zl||c.rect.x+cw>zr)) needPost=true;          /* a card reaches the edge zones → the dither pass is needed */
        var fog=.42+.58*sstep(0,.88,t), bl=(1-sstep(.12,.72,t))*.055;
        c.fog=fog+(1-fog)*c.hv; c.blur=bl*(1-c.hv);
      });
      order=cards.slice().sort(function(a,b){ return a.z-b.z; });
    }
    function hit(px,py){
      for(var k=order.length-1;k>=0;k--){ var c=order[k], r=c.rect; if(px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h) return c; }
      return null;
    }

    /* ---------- per-frame update ---------- */
    function update(dt){
      if(!lbOpen){
        if(dragging){
          var K=1.2/(Rpx*Math.pow(Z,.7)), ax=pend.x*K, ay=pend.y*K; pend.x=pend.y=0; rot(ax,ay);
          var kk=1-Math.exp(-dt*18); w.x+=(ax/dt-w.x)*kk; w.y+=(ay/dt-w.y)*kk;
        } else {
          var dec=Math.exp(-dt*2.4); w.x*=dec; w.y*=dec; rot(w.x*dt,w.y*dt);
          var sp=Math.hypot(w.x,w.y);
          if(!reduce&&!hovCard) rot(.09*dt*(1-sstep(.02,.25,sp)),0);   /* slow idle drift */
        }
      }
      var speed=Math.hypot(w.x,w.y); scrUser=reduce?0:sstep(.15,1.6,speed);
      Z+=(zt-Z)*(1-Math.exp(-dt*8));
      project();
      var h=(dragging||lbOpen)?null:hit(mouse.x,mouse.y);
      if(h!==hovCard){ hovCard=h; cap.textContent=h?(h.d.title||""):"Play around"; cv.classList.toggle("hov",!!h); }
      cards.forEach(function(c){ c.hv+=((c===hovCard?1:0)-c.hv)*(1-Math.exp(-dt*12)); });
    }

    /* ---------- draw ---------- */
    function uniformsPost(u,tt){
      gl.uniform4f(u.uRect,0,0,1,1); gl.uniform2f(u.uRes,Wd,Hd); gl.uniform1f(u.uT,tt); gl.uniform1f(u.uGl,reduce?0:.15+.85*scrUser); gl.uniform1f(u.uDpr,dpr);
      gl.uniform3f(u.uBg,BG[0],BG[1],BG[2]); gl.uniform1i(u.uScene,0);
    }
    function draw(T){
      var tt=reduce?0:T, u;
      if(needPost){ ensureFbo(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); } else gl.bindFramebuffer(gl.FRAMEBUFFER,null);   /* no card near the edges → straight to the screen */
      gl.disable(gl.SCISSOR_TEST); gl.viewport(0,0,Wd,Hd); gl.clearColor(BG[0],BG[1],BG[2],1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(PC); u=PC.u; gl.uniform3f(u.uBg,BG[0],BG[1],BG[2]); gl.uniform1f(u.uT,tt); gl.uniform1i(u.uTex,0); gl.activeTexture(gl.TEXTURE0);
      var now=performance.now()/1000;
      order.forEach(function(c){
        if(c.hide) return;
        var r=c.rect, x0=Math.round(r.x*dpr), wd=Math.max(1,Math.round(r.w*dpr)), ht=Math.max(1,Math.round(r.h*dpr)), y0=Math.round(Hd-(r.y*dpr+ht));
        gl.uniform4f(u.uRect,x0/Wd,y0/Hd,wd/Wd,ht/Hd);
        var intro=lite||reduce?0:c.born===null?1:(Math.pow(Math.min(1,Math.max(0,1-(now-c.born)/1.3)),1.5));
        var short=Math.min(r.w,r.h), cols=Math.max(4,Math.round(r.w/(short/6))), rows=Math.max(4,Math.round(r.h/(short/6)));
        gl.uniform2f(u.uCrop,c.crop[0],c.crop[1]); gl.uniform2f(u.uOff,c.off[0],c.off[1]); gl.uniform2f(u.uG,cols,rows);
        gl.uniform2f(u.uAsp,1,r.w/r.h); gl.uniform1f(u.uScr,Math.max(scrUser,intro)); gl.uniform1f(u.uSeed,c.seed);
        gl.uniform1f(u.uBlur,c.blur); gl.uniform1f(u.uLod,Math.max(0,Math.log2(Math.max(1,c.blur*c.crop[0]*c.texW)))); gl.uniform1f(u.uFog,c.fog);
        gl.bindTexture(gl.TEXTURE_2D,c.tex.tex); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      });
      if(!needPost) return;
      /* edge pass: only the two strips go through the shader; the middle is a plain blit */
      var xl=Math.ceil(.2*Wd), xr=Math.floor(.8*Wd);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
      gl.blitFramebuffer(xl,0,xr,Hd,xl,0,xr,Hd,gl.COLOR_BUFFER_BIT,gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.useProgram(PP); uniformsPost(PP.u,tt); gl.bindTexture(gl.TEXTURE_2D,ftex);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0,0,xl,Hd); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      gl.scissor(xr,0,Wd-xr,Hd); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      gl.disable(gl.SCISSOR_TEST);
    }

    /* ---------- loop: one frame = step(); the owner either lets resume() run it or calls step() itself (the page transition does) ---------- */
    function introActive(now){ var s=now/1000; return cards.some(function(c){ return c.born===null||s-c.born<1.35; }); }
    function step(now,throttled){
      var dt=Math.max(.001,Math.min(.05,(now-lastT)/1000)); lastT=now;
      update(dt); draw(now/1000-T0); lastRender=now;
      if(throttled) return;
      if(warmup<20){ warmup++; return; }                                 /* render scale: 3 slow frames in a row means the GPU can't keep up */
      if(dt>.028){ if(++bad>40&&qi<QS.length-1){ qi++; bad=0; warmup=0; resize(); } } else if(bad>0) bad--;
    }
    function loop(now){
      if(!running) return; raf=requestAnimationFrame(loop);
      if(lbOpen&&now>frozenAt) return;                                    /* pop-up open: the globe behind it is not redrawn */
      var idle=!dragging&&now>activeUntil&&Math.hypot(w.x,w.y)<.02&&Math.abs(zt-Z)<.002&&!introActive(now);
      if(idle&&now-lastRender<30) return;                                 /* nothing is happening: ~30fps is plenty for the slow drift */
      step(now,idle||introActive(now));
    }
    function resume(){ if(running) return; running=true; lastT=performance.now(); raf=requestAnimationFrame(loop); }
    function pause(){ running=false; cancelAnimationFrame(raf); }
    function start(){ var t=performance.now()/1000; cards.forEach(function(c,i){ c.born=t+i*.045; }); Z=.6; zt=1; w.x=w.y=0; warmup=0; touch(); }   /* replay the intro */

    /* ---------- input ---------- */
    cv.addEventListener("pointerdown",function(e){
      if(lbOpen) return; touch(); ptrs[e.pointerId]=e; cv.setPointerCapture(e.pointerId);
      var k=Object.keys(ptrs);
      if(k.length===1){ dragging=true; moved=0; last=[e.clientX,e.clientY]; cv.classList.add("drag"); }
      else if(k.length===2) pd=Math.hypot(ptrs[k[0]].clientX-ptrs[k[1]].clientX,ptrs[k[0]].clientY-ptrs[k[1]].clientY);
    });
    cv.addEventListener("pointermove",function(e){
      mouse.x=e.clientX; mouse.y=e.clientY; touch();
      if(!ptrs[e.pointerId]) return; ptrs[e.pointerId]=e; var k=Object.keys(ptrs);
      if(k.length===2){ var d=Math.hypot(ptrs[k[0]].clientX-ptrs[k[1]].clientX,ptrs[k[0]].clientY-ptrs[k[1]].clientY); if(pd) zt=clampZ(zt*d/pd); pd=d; moved=99; return; }
      if(!dragging) return;
      var dx=e.clientX-last[0], dy=e.clientY-last[1]; last=[e.clientX,e.clientY]; moved+=Math.abs(dx)+Math.abs(dy); pend.x+=dx; pend.y+=dy;
    });
    function up(e){ delete ptrs[e.pointerId]; if(!Object.keys(ptrs).length){ dragging=false; pend.x=pend.y=0; cv.classList.remove("drag"); } pd=0; touch(); }
    cv.addEventListener("pointerup",function(e){
      var click=moved<6; up(e);
      if(click&&!lbOpen){ var c=hit(e.clientX,e.clientY); if(c) openLb(c); }
    });
    cv.addEventListener("pointercancel",up);
    cv.addEventListener("pointerleave",function(){ mouse.x=mouse.y=-1e4; touch(); });
    cv.addEventListener("wheel",function(e){
      e.preventDefault(); if(lbOpen) return; touch();
      var dy=e.deltaY*(e.deltaMode===1?16:1); zt=clampZ(zt*Math.exp(-dy*(e.ctrlKey?.01:.0016)));
    },{passive:false});
    $(".wp-zi").onclick=function(){ touch(); zt=clampZ(zt*1.3); }; $(".wp-zo").onclick=function(){ touch(); zt=clampZ(zt/1.3); };

    /* ---------- pop-up: the shot flies from the globe to the centre and back ---------- */
    function box(c){ var bw=Math.min(W*.88,H*.72*c.ar), bh=bw/c.ar; return {w:bw,h:bh,x:(W-bw)/2,y:(H-bh)/2-H*.03}; }
    function fly(r,b){ return "translate("+r.x+"px,"+r.y+"px) scale("+(r.w/b.w)+","+(r.h/b.h)+")"; }
    function openLb(c){
      if(lbOpen) return; lbOpen=true; cur=c; c.hide=true; w.x=w.y=0; frozenAt=performance.now()+150;
      var r=c.rect, b=box(c), pos=c.d.pos||[.5,.5];
      lbImg.style.transition="none"; lbImg.src=tUrl(c.d); lbImg.style.objectPosition=(pos[0]*100)+"% "+(pos[1]*100)+"%";
      lbImg.style.width=b.w+"px"; lbImg.style.height=b.h+"px"; lbImg.style.opacity=c.fog; lbImg.style.transform=fly(r,b);
      lbCap.querySelector("b").textContent=c.d.title||""; lbCap.querySelector("span").textContent=c.d.note||"";
      lb.classList.add("on"); void lbImg.offsetWidth; lbImg.style.transition=""; lb.classList.add("in");
      lbImg.style.opacity=1; lbImg.style.transform="translate("+b.x+"px,"+b.y+"px) scale(1)";
      var hi=new Image(); hi.onload=function(){ if(cur===c) lbImg.src=hi.src; }; hi.src=bUrl(c.d);
    }
    function closeLb(){
      if(!lbOpen||!cur) return; var c=cur, r=c.rect, b=box(c); lb.classList.remove("in");
      lbImg.style.opacity=c.fog; lbImg.style.transform=fly(r,b);
      setTimeout(function(){ c.hide=false; lbOpen=false; cur=null; step(performance.now(),true); lb.classList.remove("on"); },600);   /* redraw first, then drop the pop-up: no empty gap */
    }
    lb.addEventListener("click",closeLb);
    addEventListener("keydown",function(e){ if(e.key==="Escape") closeLb(); });

    api.lite=function(v){ lite=!!v; }; api.canvas=cv; api.start=start; api.step=step; api.resume=resume; api.pause=pause; api.dpr=function(){ return dpr; };
    if(opt.standalone){ root.classList.add("on"); resume(); }
    return api;
  }
  window.WayPlay={mount:mount};
})();
