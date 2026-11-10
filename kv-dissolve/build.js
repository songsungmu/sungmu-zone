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
B:{dur:1600,ease:'inOutSine',textAt:.45,textDur:.55,en:'Grain Dissolve',ko:'그레인 디졸브',
 lead:'노이즈 맵을 기준으로 이전 비주얼이 입자 단위로 부서지고, 그 틈으로 다음 비주얼이 번져 나옵니다. 경계선에 옅은 빛이 남아 필름이 타들어가는 듯한 질감을 줍니다.',
 steps:['<b>노이즈 마스크</b> 저주파 fbm 노이즈(덩어리) 70% + 2px 그레인 30%를 합성','<b>0 → 1600ms</b> 임계값이 0 → 1로 이동하며, 값이 낮은 픽셀부터 다음 비주얼로 바뀜','<b>경계 글로우</b> 전환 경계 부근만 밝기 +12%','<b>720ms~</b> 카피가 줄 단위 마스크 안에서 아래→위로 밀려 올라옴'],
 rows:[['전환 시간','1600ms'],['이징','easeInOutSine'],['마스크','fbm(uv × 3.2) + grain(2px), soft edge 0.07'],['카피 등장','line mask reveal, 90ms stagger'],['구현','WebGL fragment shader (미지원 시 A로 대체)'],['성능','GPU 1 pass, 모바일 60fps']],
 css:`.copy h2 .ln{overflow:hidden;padding-bottom:.06em}
.copy h2 .lt{display:inline-block}
.copy.in .lt{animation:up var(--td,880ms) cubic-bezier(.16,.84,.24,1) both}
.copy.in h2 .ln:nth-child(2) .lt{animation-delay:90ms}
.copy.in .eyebrow,.copy.in .sub,.copy.in .period{animation:fd var(--td,880ms) ease both}
.copy.in .sub{animation-delay:200ms}.copy.in .period{animation-delay:280ms}
@keyframes up{from{transform:translateY(105%)}to{transform:none}}
@keyframes fd{from{opacity:0}to{opacity:1}}`},
C:{dur:1400,ease:'inOutCubic',textAt:.5,textDur:.65,en:'Luma Blur Dissolve',ko:'루마 블러 디졸브',
 lead:'다음 비주얼의 밝은 영역부터 먼저 스며들고, 전환 한가운데에서 블러와 미세한 물결 왜곡이 최대가 됩니다. 이미지가 녹아들며 바뀌는 몽환적인 무드입니다.',
 steps:['<b>루마 마스크</b> 다음 비주얼의 밝기(luma)가 높은 픽셀일수록 먼저 전환','<b>블러 · 왜곡</b> sin(π·t) 곡선으로 중간 지점에서 블러 반경과 노이즈 왜곡이 최대','<b>0 → 1400ms</b> 다음 비주얼 scale 1.07 → 1.00','<b>700ms~</b> 카피가 블러 10px → 0, 자간이 넓은 상태에서 좁혀지며 등장'],
 rows:[['전환 시간','1400ms'],['이징','easeInOutCubic'],['블러','radial 17-tap, 최대 1.4% (화면 대비)'],['왜곡','fbm displacement, 최대 7%'],['카피 등장','blur 10px → 0, letter-spacing .12em → 기본'],['구현','WebGL fragment shader (미지원 시 A로 대체)']],
 css:`.copy.in > *{animation:bi var(--td,910ms) cubic-bezier(.2,.7,.2,1) both}
.copy.in h2{animation-delay:60ms}.copy.in .sub{animation-delay:160ms}.copy.in .period{animation-delay:240ms}
@keyframes bi{from{opacity:0;filter:blur(10px);letter-spacing:.12em}to{opacity:1;filter:blur(0)}}
.copy.in h2{letter-spacing:-.02em}`}
};
for(const id of ['A','B','C']){const v=V[id];
 let out=tpl.split('{{ID}}').join(id).split('{{DUR}}').join(String(v.dur))
 .replace('{{TEXT_CSS}}',v.css).replace('{{NAME_EN}}',v.en).replace('{{NAME_KO}}',v.ko).replace('{{LEAD}}',v.lead)
 .replace('{{STEPS}}',v.steps.map(s=>'<li>'+s+'</li>').join(''))
 .replace('{{SPEC_ROWS}}',v.rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join(''))
 .replace('{{VCONF}}',JSON.stringify({id,dur:v.dur,ease:v.ease,textAt:v.textAt,textDur:v.textDur}));
 for(const k of ['A','B','C']){out=out.replace('{{LINK_'+k+'}}',links[k]||'#').replace('{{CUR_'+k+'}}',k===id?'aria-current="page"':'')}
 fs.writeFileSync(path.join(__dirname,'variant-'+id.toLowerCase()+'.html'),out);}
