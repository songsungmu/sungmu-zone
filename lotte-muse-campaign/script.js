/*
 * 캠페인 일정 설정
 * 실제 일정이 재확인되면 아래 두 날짜만 수정하면 전체 페이지(카운트다운, 자동 단계 전환,
 * "다음 이야기" 날짜 표기)에 반영됩니다. 시간대는 KST(+09:00) 기준입니다.
 */
const SCHEDULE = {
  phase1012: new Date("2026-10-12T00:00:00+09:00"),
  phase1021: new Date("2026-10-21T00:00:00+09:00"),
};

/*
 * 단계별 배경 자산 경로. 아래 파일이 assets/ 폴더에 존재하면 자동으로 플레이스홀더 대신
 * 사용됩니다(영상 우선, 없으면 이미지, 둘 다 없으면 플레이스홀더 유지). 자산이 도착하는 대로
 * 파일만 교체/추가하면 되고 코드 수정은 필요 없습니다.
 */
const ASSETS = {
  teaser: { video: "assets/video/teaser.mp4", image: "assets/images/teaser-bg.jpg" },
  phase1012: { video: "assets/video/phase-1012.mp4", image: "assets/images/phase-1012.jpg" },
  phase1021: { video: "assets/video/phase-1021.mp4", image: "assets/images/phase-1021.jpg" },
};

const STORY_IMAGE = "assets/images/story.jpg";

const body = document.body;
const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
if (isTouch) body.classList.add("is-touch");

/* ---------------- 호기심 유발 게이트 ---------------- */
document.documentElement.style.overflow = "hidden";
const gate = document.getElementById("gate");

function openGate() {
  if (!gate || gate.classList.contains("is-open")) return;
  gate.classList.add("is-open");
  document.documentElement.style.overflow = "";
  setTimeout(() => gate.classList.add("is-hidden"), 1200);
}

if (gate) {
  gate.addEventListener("click", openGate);
  gate.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter" || e.key === " ") openGate();
    }
  );
  window.addEventListener("wheel", openGate, { once: true, passive: true });
  window.addEventListener("touchmove", openGate, { once: true, passive: true });
} else {
  document.documentElement.style.overflow = "";
}

/* ---------------- 스크램블 텍스트(디코딩되는 느낌의 리빌) ---------------- */
function scrambleText(el, duration = 900) {
  if (!el) return;
  const finalText = el.textContent;
  const hangulPool = () => String.fromCharCode(0xac00 + Math.floor(Math.random() * 11172));
  const latinPool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const start = performance.now();
  function frame(now) {
    const progress = Math.min(1, (now - start) / duration);
    const revealCount = Math.floor(progress * finalText.length);
    let out = "";
    for (let i = 0; i < finalText.length; i++) {
      const ch = finalText[i];
      if (i < revealCount || ch === " " || ch === "\n") {
        out += ch;
      } else if (/[a-zA-Z0-9]/.test(ch)) {
        out += latinPool[Math.floor(Math.random() * latinPool.length)];
      } else {
        out += hangulPool();
      }
    }
    el.textContent = out;
    if (progress < 1) requestAnimationFrame(frame);
    else el.textContent = finalText;
  }
  requestAnimationFrame(frame);
}

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  scrambleText(document.getElementById("gate-eyebrow"));
  scrambleText(document.getElementById("gate-cue"), 700);
}

/* ---------------- 단계(phase) 결정 ---------------- */
function resolvePhaseFromDate(now = new Date()) {
  if (now >= SCHEDULE.phase1021) return "phase1021";
  if (now >= SCHEDULE.phase1012) return "phase1012";
  return "teaser";
}

const VALID_PHASES = ["teaser", "phase1012", "phase1021"];

function getPhase() {
  const params = new URLSearchParams(location.search);
  const override = params.get("phase") || localStorage.getItem("lotte-muse-phase-override");
  if (VALID_PHASES.includes(override)) return override;
  return resolvePhaseFromDate();
}

function applyPhase(phase) {
  body.setAttribute("data-phase", phase);
  const badge = document.getElementById("phase-badge");
  const labels = { teaser: "TEASER", phase1012: "10.12", phase1021: "10.21" };
  if (badge) badge.textContent = labels[phase] || "";
  loadHeroAsset(phase);
}

applyPhase(getPhase());

/* ---------------- "다음 이야기" 날짜 표기 ---------------- */
const nextDateLabel = document.getElementById("next-date-label");
if (nextDateLabel) {
  const d = SCHEDULE.phase1021;
  const formatted = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  nextDateLabel.textContent = formatted;
}

/* ---------------- 카운트다운 ---------------- */
function startCountdown(el, target) {
  if (!el) return;
  const nums = {
    d: el.querySelector('[data-unit="d"]'),
    h: el.querySelector('[data-unit="h"]'),
    m: el.querySelector('[data-unit="m"]'),
    s: el.querySelector('[data-unit="s"]'),
  };
  function tick() {
    const diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (nums.d) nums.d.textContent = String(d).padStart(2, "0");
    if (nums.h) nums.h.textContent = String(h).padStart(2, "0");
    if (nums.m) nums.m.textContent = String(m).padStart(2, "0");
    if (nums.s) nums.s.textContent = String(s).padStart(2, "0");
    if (diff <= 0) clearInterval(timer);
  }
  tick();
  const timer = setInterval(tick, 1000);
}

startCountdown(document.getElementById("countdown-teaser"), SCHEDULE.phase1012);

/* ---------------- 자산 자동 감지(영상 → 이미지 → 플레이스홀더) ---------------- */
function assetExists(url) {
  return fetch(url, { method: "HEAD" }).then((res) => res.ok).catch(() => false);
}

async function loadHeroAsset(phase) {
  const config = ASSETS[phase];
  const video = document.getElementById("hero-video");
  const placeholder = document.getElementById("hero-placeholder");
  if (!config || !video || !placeholder) return;

  video.hidden = true;
  video.removeAttribute("src");
  placeholder.style.display = "flex";

  if (config.video && (await assetExists(config.video))) {
    video.src = config.video;
    video.hidden = false;
    placeholder.style.display = "none";
    return;
  }
  if (config.image && (await assetExists(config.image))) {
    placeholder.style.backgroundImage = `url("${config.image}")`;
    placeholder.style.backgroundSize = "cover";
    placeholder.style.backgroundPosition = "center";
    placeholder.querySelector(".placeholder-label").style.display = "none";
  }
}

function applyBackgroundIfExists(el, path) {
  if (!el || !path) return Promise.resolve(false);
  return assetExists(path).then((ok) => {
    if (ok) {
      el.style.backgroundImage = `url("${path}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      const label = el.querySelector(".placeholder-label");
      if (label) label.style.display = "none";
      const illustration = el.querySelector(".frame-illustration");
      if (illustration) illustration.style.display = "none";
    }
    return ok;
  });
}

applyBackgroundIfExists(document.querySelector(".story-placeholder"), STORY_IMAGE);

document.querySelectorAll(".frame-inner[data-asset]").forEach((el) => {
  applyBackgroundIfExists(el, el.getAttribute("data-asset"));
});

/* ---------------- 프리로더 ---------------- */
const preloader = document.getElementById("preloader");
window.addEventListener("load", () => {
  setTimeout(() => preloader && preloader.classList.add("is-done"), 900);
});

/* ---------------- 커스텀 커서 ---------------- */
if (!isTouch) {
  const cursor = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  let ringX = 0, ringY = 0, targetX = 0, targetY = 0;

  window.addEventListener("mousemove", (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    dot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
  });

  function animateRing() {
    ringX += (targetX - ringX) * 0.18;
    ringY += (targetY - ringY) * 0.18;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.querySelectorAll('[data-cursor="link"]').forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-active"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
  });
}

/* ---------------- 스크롤 리빌 ---------------- */
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = entry.target.getAttribute("data-reveal-delay");
        if (delay) entry.target.style.setProperty("--reveal-delay", delay);
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
);
revealEls.forEach((el) => io.observe(el));

/* ---------------- 마우스 패럴랙스(히어로) ---------------- */
if (!isTouch) {
  const heroBg = document.getElementById("hero-bg");
  const hero = document.getElementById("hero");
  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    heroBg.style.transform = `scale(1.08) translate(${x * -14}px, ${y * -14}px)`;
  });
  hero.addEventListener("mouseleave", () => {
    heroBg.style.transform = "scale(1.05) translate(0, 0)";
  });

  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    hero.style.setProperty("--my", `${e.clientY - rect.top}px`);
  });
}

/* ---------------- 갤러리 프레임 마우스 틸트 ---------------- */
if (!isTouch) {
  document.querySelectorAll(".gallery-frame").forEach((frame) => {
    const inner = frame.querySelector(".frame-inner");
    if (!inner) return;
    frame.addEventListener("mousemove", (e) => {
      const rect = frame.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      inner.style.transform = `scale(1.08) rotateX(${y * -6}deg) rotateY(${x * 6}deg)`;
    });
    frame.addEventListener("mouseleave", () => {
      inner.style.transform = "";
    });
  });
}

/* ---------------- 알림 신청 폼(프론트엔드 UI만 — 실제 수집 엔드포인트는 백엔드 확정 후 연결) ---------------- */
const notifyForm = document.getElementById("notify-form");
const notifyMsg = document.getElementById("notify-msg");
if (notifyForm) {
  notifyForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("notify-email").value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      notifyMsg.textContent = "올바른 이메일 주소를 입력해 주세요.";
      notifyMsg.classList.remove("is-success");
      return;
    }
    notifyMsg.textContent = "감사합니다. 가장 먼저 소식을 전해드릴게요.";
    notifyMsg.classList.add("is-success");
    notifyForm.reset();
  });
}

/* ---------------- 내부 검수용 단계 전환 패널 (?dev=1) ---------------- */
if (new URLSearchParams(location.search).get("dev") === "1") {
  const panel = document.getElementById("dev-panel");
  panel.hidden = false;
  panel.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-set-phase");
      if (value === "auto") {
        localStorage.removeItem("lotte-muse-phase-override");
      } else {
        localStorage.setItem("lotte-muse-phase-override", value);
      }
      applyPhase(getPhase());
    });
  });
}
