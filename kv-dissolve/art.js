var SLIDES=[
 {kind:"arch",word:"HOLIDAY",eyebrow:"Holiday Collection", t:["겨울을 밝히는","홀리데이 선물 제안"], sub:"선물하기 좋은 시즌 한정 아이템을 한자리에", period:"2026.11.14 — 12.31", bg:["#141a33","#3b1d3f"], glow:"#e7b765", ink:"#ffffff"},
 {kind:"sphere",word:"BEAUTY",eyebrow:"Beauty Week",       t:["뷰티 위크","최대 20% 혜택"], sub:"인기 브랜드 기프트 세트와 단독 구성", period:"2026.11.20 — 11.30", bg:["#f7d9d2","#e98f7e"], glow:"#fff4ee", ink:"#2a1a17"},
 {kind:"rings",word:"JEWELRY",eyebrow:"Fine Jewelry & Watch", t:["오래 남을 빛,","파인 주얼리 & 워치"], sub:"하이엔드 브랜드 신규 컬렉션 입고", period:"2026.11.10 — 12.07", bg:["#0f2a24","#1d4a3f"], glow:"#d9c08a", ink:"#ffffff"},
 {kind:"blocks",word:"LIVING",eyebrow:"Home & Living",      t:["계절이 머무는 집","리빙 페어"], sub:"패브릭·조명·테이블웨어 시즌 제안", period:"2026.11.21 — 12.04", bg:["#e8e2d4","#bcc4ad"], glow:"#fffaf0", ink:"#22251d"},
 {kind:"plates",word:"GOURMET",eyebrow:"Gourmet Market",     t:["연말 식탁을 위한","고메 마켓"], sub:"산지 직송 프리미엄 식재료와 와인", period:"2026.12.01 — 12.24", bg:["#5a2a10","#c46a22"], glow:"#ffd08a", ink:"#ffffff"}
];
/* ---------- seeded random ---------- */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var grainTile=(function(){var c=document.createElement("canvas");c.width=c.height=128;var x=c.getContext("2d"),d=x.createImageData(128,128),r=rng(7);for(var i=0;i<d.data.length;i+=4){var v=r()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}x.putImageData(d,0,0);return c})();

/* ---------- placeholder art ---------- */
function rgba(hex,a){var n=parseInt(hex.slice(1),16);return"rgba("+(n>>16&255)+","+(n>>8&255)+","+(n&255)+","+a+")"}
function drawArt(cv,w,h,s,idx){
  cv.width=w;cv.height=h;var x=cv.getContext("2d"),r=rng(idx*97+3);
  var land=w>=h*1.1, u=land?h:w*1.05;
  var cx=land?w*0.68:w*0.5, cy=land?h*0.5:h*0.36, R=u*0.38;
  var g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,s.bg[0]);g.addColorStop(1,s.bg[1]);x.fillStyle=g;x.fillRect(0,0,w,h);
  var rg=x.createRadialGradient(cx+R*.5,cy-R*.6,0,cx+R*.5,cy-R*.6,R*2.6);rg.addColorStop(0,rgba(s.glow,.55));rg.addColorStop(1,rgba(s.glow,0));x.fillStyle=rg;x.fillRect(0,0,w,h);
  function circ(px,py,rr,c0,c1,hx,hy){var q=x.createRadialGradient(px+rr*(hx||-.35),py+rr*(hy||-.4),rr*.05,px,py,rr);q.addColorStop(0,c0);q.addColorStop(1,c1);x.fillStyle=q;x.beginPath();x.arc(px,py,rr,0,7);x.fill()}
  function shadow(px,py,rw,a){var q=x.createRadialGradient(px,py,0,px,py,rw);q.addColorStop(0,"rgba(0,0,0,"+a+")");q.addColorStop(1,"rgba(0,0,0,0)");x.save();x.translate(px,py);x.scale(1,.22);x.translate(-px,-py);x.fillStyle=q;x.beginPath();x.arc(px,py,rw,0,7);x.fill();x.restore()}
  if(s.kind==="arch"){
    var aw=R*1.25, ah=R*2.1, ax=cx-aw/2, ay=cy-ah/2+R*.1;
    function arch(px,py,ww,hh){x.beginPath();x.moveTo(px,py+hh);x.lineTo(px,py+ww/2);x.arc(px+ww/2,py+ww/2,ww/2,Math.PI,0);x.lineTo(px+ww,py+hh);x.closePath()}
    var ag=x.createLinearGradient(ax,ay,ax+aw,ay+ah);ag.addColorStop(0,"#f6d998");ag.addColorStop(.5,"#b8873e");ag.addColorStop(1,"#6d4a1d");x.fillStyle=ag;arch(ax,ay,aw,ah);x.fill();
    var ig=x.createLinearGradient(0,ay,0,ay+ah);ig.addColorStop(0,"#2a1f48");ig.addColorStop(1,"#120f22");x.fillStyle=ig;arch(ax+aw*.08,ay+aw*.08,aw*.84,ah-aw*.08);x.fill();
    circ(cx-R*.05,cy+R*.25,R*.32,"#ffe6b0","#9a5d1c");circ(cx+R*.75,cy+R*.62,R*.2,"#ffc0c8","#7a1f3a");circ(cx-R*.95,cy+R*.7,R*.16,"#f3f3ff","#5d6a9c");
    x.strokeStyle="rgba(246,217,152,.7)";x.lineWidth=Math.max(1,u*.002);x.beginPath();x.moveTo(cx-R*.05,ay+aw*.08);x.lineTo(cx-R*.05,cy-R*.07);x.stroke();
    for(var i=0;i<70;i++){var sx=r()*w,sy=r()*h*.9,sr=r()*u*.004+.5;x.fillStyle="rgba(255,236,190,"+(r()*.7+.2)+")";x.beginPath();x.arc(sx,sy,sr,0,7);x.fill()}
  }else if(s.kind==="sphere"){
    shadow(cx,cy+R*.95,R*1.1,.22);
    circ(cx,cy,R*.95,"#fff7f3","#d96a5a",-.4,-.45);
    circ(cx-R*1.05,cy+R*.55,R*.36,"#ffffff","#e7a596");
    var bx=cx+R*.75,by=cy-R*.1,bw=R*.42,bh=R*1.05;
    var bg2=x.createLinearGradient(bx,0,bx+bw,0);bg2.addColorStop(0,"rgba(255,255,255,.85)");bg2.addColorStop(.35,"rgba(255,220,210,.55)");bg2.addColorStop(1,"rgba(190,90,80,.7)");
    x.fillStyle=bg2;x.beginPath();x.roundRect(bx,by,bw,bh,bw*.18);x.fill();
    x.fillStyle="#2a1a17";x.beginPath();x.roundRect(bx+bw*.22,by-bh*.24,bw*.56,bh*.26,bw*.06);x.fill();
    shadow(bx+bw/2,by+bh,bw*.9,.25);
  }else if(s.kind==="rings"){
    x.lineWidth=Math.max(1,u*.0025);
    for(var k=0;k<7;k++){x.strokeStyle="rgba(217,192,138,"+(.75-k*.09)+")";x.beginPath();x.ellipse(cx,cy+R*.15,R*(.55+k*.2),R*(.2+k*.07),-.25,0,7);x.stroke()}
    var gw=R*.7, gy=cy-R*.25;
    var facets=[[0,-1,"#e9fff7"],[1,-.25,"#8fe0c9"],[.55,1,"#2f8f78"],[-.55,1,"#1d6b59"],[-1,-.25,"#5cc2a7"]];
    for(var f=0;f<facets.length;f++){var a=facets[f],b=facets[(f+1)%facets.length];x.fillStyle=a[2];x.beginPath();x.moveTo(cx,gy);x.lineTo(cx+a[0]*gw,gy+a[1]*gw);x.lineTo(cx+b[0]*gw,gy+b[1]*gw);x.closePath();x.fill()}
    x.fillStyle="rgba(255,255,255,.5)";x.beginPath();x.moveTo(cx,gy-gw);x.lineTo(cx+gw*.35,gy-gw*.35);x.lineTo(cx,gy);x.closePath();x.fill();
    circ(cx+R*1.15,cy+R*.6,R*.12,"#fffbe8","#b08a3e");
  }else if(s.kind==="blocks"){
    var base=cy+R*.95;
    circ(cx+R*.7,cy-R*.65,R*.48,"#fffaf0","#f0c98a",-.2,-.2);
    var blocks=[[-1.1,.9,.75,"#8c9a78"],[-.35,1.45,.6,"#d9cbb0"],[.25,.65,1.05,"#5d6b52"],[.55,1.15,.42,"#b58e62"]];
    for(var j=0;j<blocks.length;j++){var b2=blocks[j],bx2=cx+b2[0]*R,bh2=b2[1]*R,bw2=b2[2]*R;shadow(bx2+bw2/2,base,bw2*.8,.18);x.fillStyle=b2[3];x.fillRect(bx2,base-bh2,bw2,bh2);x.fillStyle="rgba(255,255,255,.18)";x.fillRect(bx2,base-bh2,bw2*.12,bh2)}
    x.strokeStyle="rgba(34,37,29,.35)";x.lineWidth=Math.max(1,u*.0018);x.beginPath();x.moveTo(cx-R*1.6,base);x.lineTo(cx+R*1.6,base);x.stroke();
  }else{
    var plates=[[-.45,.15,.85],[.55,-.15,.7],[.25,.75,.5]];
    for(var p=0;p<plates.length;p++){var q=plates[p],px=cx+q[0]*R,py=cy+q[1]*R,pr=q[2]*R;shadow(px+pr*.15,py+pr*.9,pr*1.1,.3);circ(px,py,pr,"#fff8ec","#d9c9ac",-.3,-.3);circ(px,py,pr*.72,"#fffdf7","#efe4cf",.2,.2)}
    circ(cx-R*.55,cy+R*.05,R*.28,"#ffb36b","#b23a12");circ(cx-R*.25,cy+R*.3,R*.14,"#ffe08a","#c9861c");circ(cx+R*.55,cy-R*.18,R*.3,"#9c1f2f","#3e0a14",-.4,-.5);
    x.fillStyle="#3b6b2a";x.beginPath();x.ellipse(cx+R*.35,cy+R*.75,R*.22,R*.09,-.6,0,7);x.fill();
  }
  // legibility veil
  var vg=land?x.createLinearGradient(0,0,w*.6,0):x.createLinearGradient(0,h,0,h*.4);
  vg.addColorStop(0,rgba(s.bg[0],.75));vg.addColorStop(1,rgba(s.bg[0],0));x.fillStyle=vg;x.fillRect(0,0,w,h);
  x.globalAlpha=.06;x.globalCompositeOperation="overlay";x.fillStyle=x.createPattern(grainTile,"repeat");x.fillRect(0,0,w,h);x.globalAlpha=1;x.globalCompositeOperation="source-over";
}

