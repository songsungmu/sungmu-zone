const fs=require('fs');const path=require('path');
const tpl=fs.readFileSync(path.join(__dirname,'template.html'),'utf8');
const links=JSON.parse(fs.readFileSync(path.join(__dirname,'links.json'),'utf8'));
const V={
A:{dur:1200,ease:'inOutSine',textAt:.4,textDur:.7,en:'Soft Crossfade',ko:'소프트 크로스페이드',
 lead:'새 비주얼이 이전 비주얼 위로 겹쳐지며 서서히 떠오르고, 동시에 아주 느리게 줌아웃합니다. 브랜드 톤을 해치지 않는 가장 정석적인 디졸브입니다.',
 steps:['<b>0 → 1200ms</b> 다음 비주얼 opacity 0 → 1 (이전 비주얼은 아래에 그대로 유지해 중간에 어두워지지 않음)','<b>0 → 6.8s</b> 다음 비주얼 scale 1.06 → 1.00, 자동 재생 간격 동안 계속 천천히 움직임','<b>480ms~</b> 카피가 아래에서 위로 12px 페이드업, 줄마다 80ms 간격'],
 rows:[['전환 시간','1200ms'],['이징','<code>cubic-bezier(.45,0,.25,1)</code>'],['이미지 모션','scale 1.06 → 1, 6.8s ease-out'],['카피 등장','fade-up 12px, 80ms stagger'],['구현','CSS opacity / transform 만 사용'],['성능','가장 가벼움, 모든 브라우저 지원']],
 css:`.stage canvas.kb{animation:kb var(--kb,6800ms) cubic-bezier(.2,.6,.3,1) forwards}
@keyframes kb{from{transform:scale(1.06)}to{transform:scale(1)}}
.copy.in > *,.copy.in h2 .ln{animation:fu var(--td,840ms) cubic-bezier(.2,.7,.2,1) both}
.copy.in h2{animation:none}
.copy.in .eyebrow{animation-delay:0ms}.copy.in h2 .ln:nth-child(1){animation-delay:80ms}.copy.in h2 .ln:nth-child(2){animation-delay:160ms}.copy.in .sub{animation-delay:240ms}.copy.in .period{animation-delay:320ms}
@keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`},
B:{dur:1800,ease:'inOutSine',textAt:.35,textDur:.6,en:'Cloud Dissolve',ko:'클라우드 디졸브',
 lead:'크고 부드러운 구름 모양 마스크를 따라 다음 비주얼이 안개처럼 번져 나옵니다. 경계를 넓게 풀어 입자감 없이 매끈하게 섞이며, 다음 비주얼은 아주 살짝 줌아웃합니다.',
 steps:['<b>구름 마스크</b> 저주파 노이즈 한 겹(fbm × 1.3)만 사용해 덩어리가 크고 경계가 부드러움','<b>0 → 1800ms</b> 마스크 임계값 이동, 페더 폭 0.32로 넓게 블렌딩','<b>0 → 1800ms</b> 다음 비주얼 scale 1.035 → 1.00','<b>630ms~</b> 카피가 8px 아래에서 천천히 페이드업, 줄마다 100ms 간격'],
 rows:[['전환 시간','1800ms'],['이징','easeInOutSine'],['마스크','fbm(uv × 1.3), soft edge 0.32'],['이미지 모션','scale 1.035 → 1'],['카피 등장','fade-up 8px, 100ms stagger'],['구현','WebGL fragment shader (미지원 시 A로 대체)']],
 css:`.copy.in > *,.copy.in h2 .ln{animation:fu var(--td,1080ms) cubic-bezier(.25,.6,.3,1) both}
.copy.in h2{animation:none}
.copy.in h2 .ln:nth-child(1){animation-delay:100ms}.copy.in h2 .ln:nth-child(2){animation-delay:200ms}.copy.in .sub{animation-delay:300ms}.copy.in .period{animation-delay:400ms}
@keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`},
C:{dur:1600,ease:'inOutCubic',textAt:.4,textDur:.65,en:'Light Sweep Dissolve',ko:'라이트 스윕 디졸브',
 lead:'다음 비주얼이 왼쪽에서 오른쪽으로 비스듬히, 넓고 흐린 경계를 따라 빛이 스치듯 넘어옵니다. 두 비주얼이 서로 반대로 아주 조금 흘러 공간감이 생깁니다.',
 steps:['<b>사선 마스크</b> 약 20° 기울어진 그라디언트에 낮은 노이즈를 더해 경계가 직선처럼 보이지 않게 함','<b>0 → 1600ms</b> 페더 폭 0.45로 화면 절반 가까이를 걸쳐 부드럽게 섞임','<b>패럴랙스</b> 이전 비주얼은 왼쪽으로 1.2%, 다음 비주얼은 오른쪽 2%에서 제자리로 이동','<b>640ms~</b> 카피가 왼쪽에서 12px 미끄러지며 페이드인'],
 rows:[['전환 시간','1600ms'],['이징','easeInOutCubic'],['마스크','사선 그라디언트(20°) + 노이즈 0.12, soft edge 0.45'],['이미지 모션','from −1.2% / to +2% → 0 (가로)'],['카피 등장','fade + translateX 12px, 90ms stagger'],['구현','WebGL fragment shader (미지원 시 A로 대체)']],
 css:`.copy.in > *{animation:sl var(--td,1040ms) cubic-bezier(.22,.7,.25,1) both}
.copy.in h2{animation-delay:90ms}.copy.in .sub{animation-delay:180ms}.copy.in .period{animation-delay:270ms}
@keyframes sl{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}`}
};
for(const id of ['A','B','C']){const v=V[id];
 let out=tpl.split('{{ID}}').join(id).split('{{DUR}}').join(String(v.dur))
 .replace('{{TEXT_CSS}}',v.css).replace('{{NAME_EN}}',v.en).replace('{{NAME_KO}}',v.ko).replace('{{LEAD}}',v.lead)
 .replace('{{STEPS}}',v.steps.map(s=>'<li>'+s+'</li>').join(''))
 .replace('{{SPEC_ROWS}}',v.rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join(''))
 .replace('{{VCONF}}',JSON.stringify({id,dur:v.dur,ease:v.ease,textAt:v.textAt,textDur:v.textDur}));
 for(const k of ['A','B','C']){out=out.replace('{{LINK_'+k+'}}',links[k]||'#').replace('{{CUR_'+k+'}}',k===id?'aria-current="page"':'')}
 fs.writeFileSync(path.join(__dirname,'variant-'+id.toLowerCase()+'.html'),out);}
