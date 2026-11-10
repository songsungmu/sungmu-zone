const fs=require('fs');const path=require('path');
const tpl=fs.readFileSync(path.join(__dirname,'template.html'),'utf8');
const art=fs.readFileSync(path.join(__dirname,'art.js'),'utf8');
const links=JSON.parse(fs.readFileSync(path.join(__dirname,'links.json'),'utf8'));
const TABS=[['A','A 크로스페이드'],['B','B 라이트 스윕'],['C','C 블러 디졸브']];
const V={
A:{r:'css',dur:1200,ease:'inOutSine',textAt:.4,textDur:.7,en:'Soft Crossfade',ko:'소프트 크로스페이드',
 lead:'새 비주얼이 이전 비주얼 위로 겹쳐지며 서서히 떠오르고, 동시에 아주 느리게 줌아웃합니다. 브랜드 톤을 해치지 않는 가장 정석적인 디졸브입니다.',
 steps:['<b>0 → 1200ms</b> 다음 비주얼 opacity 0 → 1 (이전 비주얼은 아래에 그대로 유지해 중간에 어두워지지 않음)','<b>0 → 6.8s</b> 다음 비주얼 scale 1.06 → 1.00, 자동 재생 간격 동안 계속 천천히 움직임','<b>480ms~</b> 카피가 아래에서 위로 12px 페이드업, 줄마다 80ms 간격'],
 rows:[['전환 시간','1200ms'],['이징','<code>cubic-bezier(.45,0,.25,1)</code>'],['이미지 모션','scale 1.06 → 1, 6.8s ease-out'],['카피 등장','fade-up 12px, 80ms stagger'],['구현','CSS opacity / transform 만 사용'],['성능','가장 가벼움, 모든 브라우저 지원']],
 css:`.stage canvas.kb{animation:kb var(--kb,6800ms) cubic-bezier(.2,.6,.3,1) forwards}
@keyframes kb{from{transform:scale(1.06)}to{transform:scale(1)}}
.copy.in > *,.copy.in h2 .ln{animation:fu var(--td,840ms) cubic-bezier(.2,.7,.2,1) both}
.copy.in h2{animation:none}
.copy.in .eyebrow{animation-delay:0ms}.copy.in h2 .ln:nth-child(1){animation-delay:80ms}.copy.in h2 .ln:nth-child(2){animation-delay:160ms}.copy.in .sub{animation-delay:240ms}.copy.in .period{animation-delay:320ms}
@keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`},
B:{r:'gl',dur:1600,ease:'inOutCubic',textAt:.4,textDur:.65,en:'Light Sweep Dissolve',ko:'라이트 스윕 디졸브',
 lead:'다음 비주얼이 왼쪽에서 오른쪽으로 비스듬히, 넓고 흐린 경계를 따라 빛이 스치듯 넘어옵니다. 두 비주얼이 서로 반대로 아주 조금 흘러 공간감이 생깁니다.',
 steps:['<b>사선 마스크</b> 약 20° 기울어진 그라디언트에 낮은 노이즈를 더해 경계가 직선처럼 보이지 않게 함','<b>0 → 1600ms</b> 페더 폭 0.45로 화면 절반 가까이를 걸쳐 부드럽게 섞임','<b>패럴랙스</b> 이전 비주얼은 왼쪽으로 1.2%, 다음 비주얼은 오른쪽 2%에서 제자리로 이동','<b>640ms~</b> 카피가 왼쪽에서 12px 미끄러지며 페이드인'],
 rows:[['전환 시간','1600ms'],['이징','easeInOutCubic'],['마스크','사선 그라디언트(20°) + 노이즈 0.12, soft edge 0.45'],['이미지 모션','from −1.2% / to +2% → 0 (가로)'],['카피 등장','fade + translateX 12px, 90ms stagger'],['구현','WebGL fragment shader (미지원 시 A로 대체)']],
 css:`.copy.in > *{animation:sl var(--td,1040ms) cubic-bezier(.22,.7,.25,1) both}
.copy.in h2{animation-delay:90ms}.copy.in .sub{animation-delay:180ms}.copy.in .period{animation-delay:270ms}
@keyframes sl{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}`},
C:{r:'blur',dur:1500,ease:'',textAt:.4,textDur:.7,en:'Blur Dissolve',ko:'블러 디졸브',
 lead:'이전 비주얼은 흐려지며 살짝 앞으로 다가오고, 다음 비주얼은 흐린 상태에서 선명해지며 나타납니다. iOS 모달처럼 초점이 옮겨 가는 깊이감을 줍니다.',
 steps:['<b>0 → 1200ms</b> 이전 비주얼 blur 0 → 16px, scale 1 → 1.06','<b>225 → 1500ms</b> 다음 비주얼 opacity 0 → 1, blur 20px → 0, scale 1.08 → 1','<b>겹침</b> 다음 비주얼이 위에서 덮기 때문에 중간에 화면이 어두워지지 않음','<b>600ms~</b> 카피도 blur 8px → 0으로 선명해지며 페이드인'],
 rows:[['전환 시간','1500ms'],['사라짐','blur 16px · scale 1.06, <code>cubic-bezier(.4,0,.6,1)</code>'],['나타남','blur 20px → 0 · scale 1.08 → 1, <code>cubic-bezier(.25,.1,.25,1)</code>'],['카피 등장','blur 8px → 0 + fade, 90ms stagger'],['구현','CSS filter + Web Animations API'],['성능','blur는 GPU 사용, 저사양 모바일은 반경 축소 권장']],
 css:`.copy.in > *{animation:bi var(--td,1050ms) cubic-bezier(.25,.1,.25,1) both}
.copy.in h2{animation-delay:90ms}.copy.in .sub{animation-delay:180ms}.copy.in .period{animation-delay:270ms}
@keyframes bi{from{opacity:0;filter:blur(8px);transform:scale(1.02)}to{opacity:1;filter:blur(0);transform:none}}`}
};
for(const id of Object.keys(V)){const v=V[id];
 const tabs=TABS.map(([k,l])=>'<a href="'+(links[k]||'#')+'"'+(k===id?' aria-current="page"':'')+'>'+l+'</a>').join('');
 const out=tpl.split('{{ID}}').join(id).split('{{DUR}}').join(String(v.dur))
 .split('{{TEXT_CSS}}').join(v.css).split('{{TABS}}').join(tabs).split('{{ART}}').join(art)
 .split('{{NAME_EN}}').join(v.en).split('{{NAME_KO}}').join(v.ko).split('{{LEAD}}').join(v.lead)
 .split('{{STEPS}}').join(v.steps.map(s=>'<li>'+s+'</li>').join(''))
 .split('{{SPEC_ROWS}}').join(v.rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join(''))
 .split('{{VCONF}}').join(JSON.stringify({id,r:v.r,dur:v.dur,ease:v.ease||'inOutSine',textAt:v.textAt,textDur:v.textDur}));
 fs.writeFileSync(path.join(__dirname,'variant-'+id.toLowerCase()+'.html'),out);}
