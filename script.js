// =============================================================
// ELAINE'S 18TH BIRTHDAY DEBUT — script.js
// "Eighteen Years of Moonlight"
// =============================================================

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isMobile = () => window.innerWidth < 700;
const isLowEnd = () => {
  // Only use hardware signals the browser actually exposes. Treating an
  // unavailable value as a low-end signal made capable browsers needlessly
  // use the reduced experience.
  const cores = Number(navigator.hardwareConcurrency);
  const mem = Number(navigator.deviceMemory);
  const saveData = navigator.connection && navigator.connection.saveData;
  return Boolean(saveData) ||
    (Number.isFinite(cores) && cores > 0 && cores <= 4) ||
    (Number.isFinite(mem) && mem > 0 && mem <= 4);
};
const prefersReduced = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// how many burst butterflies will be handed over to the main-site field
let burstCarry = 0;

// -------------------------------------------------------------
// The invitation always starts from the envelope: on refresh, when the
// browser is reopened, and when returning with the Back button.
// -------------------------------------------------------------
try {
  // don't let the browser restore an old scroll position on reload
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
} catch (e) { /* ignore */ }

// Back/forward can bring a page back from the browser's memory (bfcache) in its
// finished state, skipping the intro. When that happens, reload it fresh.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('gate-active');
  if (isLowEnd()) document.body.classList.add('low-end');
  window.scrollTo(0, 0);

  initIntroGate();
  initNav();
  initScrollSpy();
  initAmbientSparkles();
  initParallax();
  buildTraditions();
  initCountdown();
  initReveal();
  initBackToTop();
});

// =============================================================
// BUTTERFLIES — SVG with flapping wings + smooth wandering flight
// =============================================================
const BF_COLORS = [
  ['#B79BD6', '#8266B0'], // lavender
  ['#F3B6D3', '#D67FB0'], // pink
  ['#F0CE8A', '#D9A441'], // gold
  ['#9FB0E8', '#6F82CC'], // periwinkle
  ['#D9C2F2', '#A57FD6'], // lilac
  ['#FFFFFF', '#CDB8EE']  // white
];

function butterflyMarkup(c1, c2) {
  return `<svg class="bf-svg" viewBox="0 0 100 80" aria-hidden="true">
    <g class="bf-wing">
      <path d="M50 38 C40 8 6 2 5 24 C4 38 30 44 50 42Z" fill="${c1}"/>
      <path d="M50 43 C32 46 12 52 17 68 C24 79 44 68 50 47Z" fill="${c2}"/>
      <circle cx="24" cy="24" r="5" fill="#fff" opacity=".55"/>
      <circle cx="28" cy="62" r="3.4" fill="#fff" opacity=".5"/>
    </g>
    <g class="bf-wing">
      <path d="M50 38 C60 8 94 2 95 24 C96 38 70 44 50 42Z" fill="${c1}"/>
      <path d="M50 43 C68 46 88 52 83 68 C76 79 56 68 50 47Z" fill="${c2}"/>
      <circle cx="76" cy="24" r="5" fill="#fff" opacity=".55"/>
      <circle cx="72" cy="62" r="3.4" fill="#fff" opacity=".5"/>
    </g>
    <ellipse cx="50" cy="44" rx="2.4" ry="15" fill="#3a2a5a"/>
    <path d="M49 30 C46 20 42 16 38 14 M51 30 C54 20 58 16 62 14" stroke="#3a2a5a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function createButterfly(size) {
  const [c1, c2] = BF_COLORS[Math.floor(Math.random() * BF_COLORS.length)];
  const el = document.createElement('span');
  el.className = 'bf';
  el.style.setProperty('--s', size.toFixed(1) + 'px');
  el.style.setProperty('--flap', rand(0.2, 0.42).toFixed(2) + 's');
  el.style.setProperty('--bob', rand(0.9, 1.6).toFixed(2) + 's');
  el.style.setProperty('--o', rand(0.75, 0.96).toFixed(2));
  el.innerHTML = '<span class="bf-body">' + butterflyMarkup(c1, c2) + '</span>';
  return el;
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) =>
    0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

// heading (degrees, 0 = up) from a point toward the middle of the screen, with jitter
function headingToCenter(p) {
  const h = Math.atan2(window.innerWidth / 2 - p.x, -(window.innerHeight / 2 - p.y)) * 180 / Math.PI;
  return h + rand(-60, 60);
}

// Endless, curvy wandering. Each leg starts where the last one ended, and the
// butterfly turns to face the direction it is flying.
function wander(el, start, startAngle, opts) {
  opts = opts || {};
  let pos = start;
  let ang = startAngle || 0; // how the butterfly is currently facing
  let dir = ang;             // direction it is actually travelling

  function next() {
    if (!el.isConnected) return;
    const W = window.innerWidth, H = window.innerHeight;
    const speed = opts.speed || rand(40, 72); // px per second

    // Keep flights inside a margin box. The first target lies ahead of the
    // butterfly so each leg continues in the direction it is already flying;
    // near a wall it steers back toward the middle instead of snapping around.
    const M = 60;
    const rad = (dir * Math.PI) / 180;
    let f = { x: Math.sin(rad), y: -Math.cos(rad) };
    const ahead = rand(140, 260);
    const tx = pos.x + f.x * ahead;
    const ty = pos.y + f.y * ahead;
    if (tx < M || tx > W - M || ty < M || ty > H - M) {
      const vx = W / 2 - pos.x;
      const vy = H / 2 - pos.y;
      const vl = Math.hypot(vx, vy) || 1;
      const bx = f.x * 0.5 + (vx / vl) * 0.5;
      const by = f.y * 0.5 + (vy / vl) * 0.5;
      const bl = Math.hypot(bx, by);
      f = bl > 0.15 ? { x: bx / bl, y: by / bl } : { x: vx / vl, y: vy / vl };
    }
    const phantom = { x: pos.x - f.x * 100, y: pos.y - f.y * 100 };
    const first = {
      x: clamp(pos.x + f.x * ahead, M, W - M),
      y: clamp(pos.y + f.y * ahead, M, H - M)
    };

    const ctrl = [phantom, pos, first];
    let prev = first;
    for (let i = 0; i < 4; i++) {
      const p = {
        x: clamp(prev.x + rand(-W * 0.4, W * 0.4), M, W - M),
        y: clamp(prev.y + rand(-H * 0.35, H * 0.35), M, H - M)
      };
      ctrl.push(p);
      prev = p;
    }

    const pts = [pos];
    const S = 6;
    for (let i = 1; i < ctrl.length - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)];
      const p1 = ctrl[i];
      const p2 = ctrl[i + 1];
      const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      for (let s = 1; s <= S; s++) pts.push(catmull(p0, p1, p2, p3, s / S));
    }

    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    const total = cum[cum.length - 1] || 1;

    // Orientation follows the travel direction but can only rotate so fast,
    // which stops the butterfly flipping around at tight bends.
    const MAX_TURN = 55;
    let a = ang;
    let trueLast = dir;
    const frames = pts.map((p, i) => {
      if (i > 0 && i < pts.length) {
        const q = pts[Math.min(i + 1, pts.length - 1)];
        const src = i < pts.length - 1 ? p : pts[i - 1];
        const dst = i < pts.length - 1 ? q : p;
        if (Math.hypot(dst.x - src.x, dst.y - src.y) > 0.01) {
          let h = Math.atan2(dst.x - src.x, -(dst.y - src.y)) * 180 / Math.PI;
          while (h - a > 180) h -= 360;
          while (h - a < -180) h += 360;
          trueLast = h;
          a += clamp(h - a, -MAX_TURN, MAX_TURN);
        }
      }
      return {
        transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${a.toFixed(1)}deg)`,
        offset: cum[i] / total
      };
    });
    frames[0].offset = 0;
    frames[frames.length - 1].offset = 1;

    const anim = el.animate(frames, {
      duration: (total / speed) * 1000,
      easing: 'linear',
      fill: 'forwards'
    });
    const old = el._anim;
    el._anim = anim;
    if (old) old.cancel();

    anim.onfinish = () => {
      pos = pts[pts.length - 1];
      ang = a;
      dir = trueLast;
      next();
    };
  }

  next();
}

// ---------- butterflies fluttering on the intro screens ----------
function spawnIntroButterflies(container) {
  if (!container || prefersReduced()) return;
  const n = isLowEnd() ? 3 : (isMobile() ? 4 : 6);
  for (let i = 0; i < n; i++) {
    const el = createButterfly(isMobile() ? rand(24, 36) : rand(28, 46));
    container.appendChild(el);
    const start = { x: rand(80, window.innerWidth - 80), y: rand(80, window.innerHeight - 80) };
    wander(el, start, headingToCenter(start), { speed: rand(34, 58) });
  }
}

// ---------- butterflies over the whole main site: 15 desktop / 7 mobile ----------
function populateField() {
  const field = $('butterflyField');
  if (!field) return;
  field.innerHTML = '';

  const mobile = isMobile();
  const lowEnd = isLowEnd();
  // Keep a visible animated trio even in the lightweight experience.
  const total = lowEnd ? (mobile ? 3 : 4) : (mobile ? 7 : 15);
  const count = Math.max(0, total - burstCarry);
  burstCarry = 0;

  for (let i = 0; i < count; i++) {
    const el = createButterfly(mobile ? rand(24, 36) : rand(28, 46));
    field.appendChild(el);
    const start = { x: rand(80, window.innerWidth - 80), y: rand(80, window.innerHeight - 80) };
    if (prefersReduced()) {
      el.style.transform = `translate(${start.x}px, ${start.y}px)`;
    } else {
      wander(el, start, headingToCenter(start));
    }
  }
}

function startButterflyField() {
  const field = $('butterflyField');
  if (!field) return;
  populateField();
  // wait two frames so the opacity transition actually plays
  requestAnimationFrame(() => requestAnimationFrame(() => field.classList.add('on')));

  // Rebuild if the window crosses the mobile breakpoint. This is registered
  // once; the intro may be revealed only once, but keeping the guard avoids
  // multiplying resize handlers if this function is reused.
  if (field.dataset.started) return;
  field.dataset.started = 'true';
  let timer = null;
  let wasMobile = isMobile();
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (isMobile() !== wasMobile) {
        wasMobile = isMobile();
        burstCarry = 0;
        populateField();
      }
    }, 300);
  });
}

// =============================================================
// PURPLE LILY (top-down bloom, drawn in SVG)
// =============================================================
function lilyMarkup(uid) {
  const petal = `<g class="pet-shape">
      <path d="M0 0 C-17 -24 -21 -64 0 -94 C21 -64 17 -24 0 0Z" fill="url(#PGRAD)"/>
      <path d="M0 -10 L0 -74" stroke="rgba(255,255,255,.4)" stroke-width="1.6" stroke-linecap="round" fill="none"/>
      <g fill="#3A1B5E" opacity=".5">
        <circle cx="-4" cy="-30" r="1.5"/><circle cx="5" cy="-38" r="1.4"/>
        <circle cx="-5" cy="-48" r="1.3"/><circle cx="4" cy="-24" r="1.2"/>
        <circle cx="2" cy="-56" r="1.2"/>
      </g>
    </g>`;

  const outer = [0, 120, 240]
    .map(a => `<g class="pet pet-out" transform="rotate(${a})">${petal.replace('PGRAD', 'lilyOut' + uid)}</g>`)
    .join('');
  const inner = [60, 180, 300]
    .map(a => `<g class="pet pet-in" transform="rotate(${a})">${petal.replace('PGRAD', 'lilyIn' + uid)}</g>`)
    .join('');
  const stamens = [20, 80, 140, 200, 260, 320]
    .map(a => `<g transform="rotate(${a})">
        <path d="M0 0 C2 -14 6 -26 4 -40" stroke="#F3D089" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <ellipse cx="4" cy="-42" rx="2.6" ry="4.4" fill="#E7B65C"/>
      </g>`)
    .join('');

  return `<span class="lily-glow"></span>
    <svg class="lily-svg" viewBox="-100 -100 200 200" aria-hidden="true">
      <defs>
        <linearGradient id="lilyOut${uid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="-94">
          <stop offset="0" stop-color="#4B2374"/><stop offset=".45" stop-color="#7B4BB0"/><stop offset="1" stop-color="#C9A9EE"/>
        </linearGradient>
        <linearGradient id="lilyIn${uid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="-94">
          <stop offset="0" stop-color="#6A3B9A"/><stop offset=".5" stop-color="#9A6FD0"/><stop offset="1" stop-color="#E5D3FA"/>
        </linearGradient>
      </defs>
      ${outer}${inner}
      <g class="lily-stamens">${stamens}</g>
      <circle r="8" fill="#F6E3A7"/>
      <circle r="3.6" fill="#E7B65C"/>
    </svg>`;
}

// =============================================================
// INTRO GATE — envelope -> letter -> LILY BLOOM -> main site
// =============================================================
function initIntroGate() {
  const gate = $('introGate');
  const envelopeStage = $('introEnvelopeStage');
  const letterStage = $('introLetterStage');
  const envelopeButton = $('envelopeButton');
  const lilyButton = $('lilyButton');
  const lilyMount = $('lilyMount');
  const letterCard = $('letterCard');
  const introBf = $('introButterflies');
  const bloomLayer = $('bloomLayer');
  const siteWrap = $('siteWrap');
  const bgMusic = $('bgMusic');

  if (!gate || !envelopeButton || !lilyButton || !lilyMount) return;

  lilyMount.innerHTML = lilyMarkup('A');
  spawnIntroButterflies(introBf);

  // Stage 1 -> Stage 2: open the envelope
  envelopeButton.addEventListener('click', () => {
    if (envelopeButton.classList.contains('opening')) return;
    envelopeButton.classList.add('opening');
    setTimeout(() => {
      envelopeStage.hidden = true;
      letterStage.hidden = false;
      letterStage.classList.add('stage-settling');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => letterStage.classList.remove('stage-settling'));
    });
}, 550);
  });

  // Stage 2 -> transition -> main site: touch the lily
  lilyButton.addEventListener('click', () => {
    if (lilyButton.dataset.transitionStarted) return;
    lilyButton.dataset.transitionStarted = 'true';
    lilyButton.disabled = true;

    // music starts on this real click, which satisfies autoplay rules
    if (bgMusic) {
      bgMusic.volume = 0.55;
      bgMusic.play().catch(() => {});
    }

    if (prefersReduced() || !document.body.animate) {
      simpleReveal();
    } else {
      bloomTransition();
    }
  });

  function finishGate() {
    if (gate.isConnected) gate.remove();
    document.body.classList.remove('gate-active');
    window.scrollTo(0, 0);
    setTimeout(() => siteWrap.classList.remove('site-entering'), 3000);
  }

  // gentle fallback for reduced-motion / very old browsers
  function simpleReveal() {
    siteWrap.hidden = false;
    startButterflyField();
    const fade = gate.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
    fade.onfinish = finishGate;
  }

  // ------------------------------------------------------------------
  // The main event: the lily lifts out of the letter, blooms in the
  // middle of the screen, bursts into petals + butterflies, and a ring
  // of golden light opens from its heart to reveal the site.
  // ------------------------------------------------------------------
    function bloomTransition() {
    const rect = lilyMount.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // 1) bloom open right where it sits — no floating, no scaling to huge size
    const svg = lilyMount.querySelector('.lily-svg');
    if (svg) svg.classList.add('bloom');

    letterCard.animate(
      [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 1, transform: 'translateY(0) scale(1.03)', offset: 0.5 },
        { opacity: 0, transform: 'translateY(-6px) scale(0.98)' }
      ],
      { duration: 650, easing: 'ease-in-out', fill: 'forwards' }
    );
    if (introBf) introBf.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });

    // 2) a quick burst of sparkles right at the lily's own position
    setTimeout(() => dissolveSparkles(cx, cy), 280);

    // 3) screen fades to reveal the site, shortly after the sparkles start
    setTimeout(() => reveal(cx, cy), 650);
  }

  // small sparkle dissolve in place of the old petal burst — quick, no
  // travel distance, just the lily's own light scattering away
  function dissolveSparkles(cx, cy) {
    const mobile = isMobile();
    const count = mobile ? 14 : 24;
    for (let i = 0; i < count; i++) {
      const d = document.createElement('span');
      d.className = 'pollen';
      const s = rand(4, 8);
      d.style.width = d.style.height = s + 'px';
      d.style.left = cx + 'px';
      d.style.top = cy + 'px';
      bloomLayer.appendChild(d);
      const ang = rand(0, Math.PI * 2);
      const dist = rand(40, 140);
      d.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
          { transform: `translate(-50%, -50%) translate(${Math.cos(ang) * dist * 0.6}px, ${Math.sin(ang) * dist * 0.6}px) scale(1)`, opacity: 1, offset: 0.4 },
          { transform: `translate(-50%, -50%) translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist - 20}px) scale(0.3)`, opacity: 0 }
        ],
        { duration: rand(500, 850), delay: rand(0, 120), easing: 'ease-out', fill: 'both' }
      ).onfinish = () => d.remove();
    }

    const bn = mobile ? 3 : 6;
    burstCarry = bn;
    for (let i = 0; i < bn; i++) {
      burstButterfly(cx, cy, i, bn, window.innerWidth, window.innerHeight, mobile);
    }
  }

  function burst(cx, cy) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const mobile = isMobile();

    // soft flash of light
    const flash = document.createElement('div');
    flash.className = 'bloom-flash';
    flash.style.left = cx + 'px';
    flash.style.top = cy + 'px';
    bloomLayer.appendChild(flash);
    flash.animate(
      [
        { transform: 'scale(0.1)', opacity: 0.95 },
        { transform: 'scale(6)', opacity: 0 }
      ],
      { duration: 1400, easing: 'ease-out' }
    ).onfinish = () => flash.remove();

    // two expanding shimmer rings
    [0, 220].forEach((delay) => {
      const ring = document.createElement('div');
      ring.className = 'bloom-ring';
      ring.style.left = cx + 'px';
      ring.style.top = cy + 'px';
      bloomLayer.appendChild(ring);
      ring.animate(
        [
          { transform: 'scale(0.2)', opacity: 0.9 },
          { transform: `scale(${Math.max(W, H) / 60})`, opacity: 0 }
        ],
        { duration: 1500, delay, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'both' }
      ).onfinish = () => ring.remove();
    });

    // lily petals swirling outward
      const petalFills = [
      'linear-gradient(#EADCFB, #B99CE8)',
      'linear-gradient(#F8E3F0, #E6A8CC)',
      'linear-gradient(#FFFFFF, #D9C3F5)',
      'linear-gradient(#E3CBEF, #9C7BD6)'
    ];
    const petalCount = mobile ? 16 : 28;
    for (let i = 0; i < petalCount; i++) {
      const p = document.createElement('span');
      p.className = 'petal-particle';
      const w = rand(9, 17);
      p.style.width = w + 'px';
      p.style.height = w * rand(1.7, 2.3) + 'px';
      p.style.background = petalFills[Math.floor(Math.random() * petalFills.length)];
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      bloomLayer.appendChild(p);

      const ang = rand(0, Math.PI * 2);
      const dist = rand(140, Math.min(W, H) * 0.75 + 160);
      const tx = Math.cos(ang) * dist;
      const ty = Math.sin(ang) * dist + rand(20, 140); // a little gravity
      const rot = rand(-540, 540);
      p.animate(
        [
          { transform: 'translate(-50%, -50%) translate(0px, 0px) rotate(0deg) scale(0.2)', opacity: 0 },
          {
            transform: `translate(-50%, -50%) translate(${tx * 0.12}px, ${ty * 0.12}px) rotate(${rot * 0.12}deg) scale(1)`,
            opacity: 1,
            offset: 0.12
          },
          { transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(0.9)`, opacity: 0 }
        ],
        { duration: rand(1700, 3000), delay: rand(0, 250), easing: 'cubic-bezier(0.15, 0.6, 0.3, 1)', fill: 'both' }
      ).onfinish = () => p.remove();
    }

    // golden pollen sparkles
    for (let i = 0; i < (mobile ? 10 : 16); i++) {
      const d = document.createElement('span');
      d.className = 'pollen';
      const s = rand(4, 7);
      d.style.width = d.style.height = s + 'px';
      d.style.left = cx + 'px';
      d.style.top = cy + 'px';
      bloomLayer.appendChild(d);
      const ang = rand(0, Math.PI * 2);
      const dist = rand(60, 260);
      d.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
          { transform: `translate(-50%, -50%) translate(${Math.cos(ang) * dist * 0.5}px, ${Math.sin(ang) * dist * 0.5}px) scale(1)`, opacity: 1, offset: 0.35 },
          { transform: `translate(-50%, -50%) translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist - 30}px) scale(0.4)`, opacity: 0 }
        ],
        { duration: rand(800, 1400), delay: rand(0, 200), easing: 'ease-out', fill: 'both' }
      ).onfinish = () => d.remove();
    }

    // butterflies emerge from the heart of the flower...
    const bn = mobile ? 5 : 9;
    burstCarry = bn; // ...and stay on to flutter around the main site
    for (let i = 0; i < bn; i++) {
      burstButterfly(cx, cy, i, bn, W, H, mobile);
    }
  }

  function burstButterfly(cx, cy, i, bn, W, H, mobile) {
    const size = mobile ? rand(30, 44) : rand(38, 58);
    const el = createButterfly(size);
    bloomLayer.appendChild(el);

    const theta = (i / bn) * Math.PI * 2 + rand(-0.3, 0.3);
    const R = Math.min(W, H) * rand(0.32, 0.5) + rand(80, 200);
    const amp = rand(30, 90);
    const freq = rand(1.2, 2.4);
    const N = 14;

    const pts = [];
    for (let k = 0; k < N; k++) {
      const t = k / (N - 1);
      const r = R * (1 - Math.pow(1 - t, 2)); // ease-out radius
      const lat = amp * Math.sin(t * Math.PI * freq);
      pts.push({
        x: clamp(cx + Math.cos(theta) * r - Math.sin(theta) * lat, 30, W - 30),
        y: clamp(cy + Math.sin(theta) * r + Math.cos(theta) * lat, 30, H - 30)
      });
    }

    let a = (Math.atan2(pts[1].x - pts[0].x, -(pts[1].y - pts[0].y)) * 180) / Math.PI;
    const frames = pts.map((p, k) => {
      if (k > 0 && k < N - 1) {
        const q = pts[k + 1];
        if (Math.hypot(q.x - p.x, q.y - p.y) > 0.01) {
          let h = (Math.atan2(q.x - p.x, -(q.y - p.y)) * 180) / Math.PI;
          while (h - a > 180) h -= 360;
          while (h - a < -180) h += 360;
          a = h;
        }
      }
      const s = k === 0 ? 0.25 : k < 3 ? 0.25 + (k / 3) * 0.75 : 1;
      return {
        transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${a.toFixed(1)}deg) scale(${s.toFixed(2)})`,
        opacity: k === 0 ? 0 : 1,
        offset: k / (N - 1)
      };
    });

    const last = pts[N - 1];
    const finalAngle = a;
    const anim = el.animate(frames, {
      duration: rand(2600, 3800),
      delay: rand(0, 350),
      easing: 'cubic-bezier(0.25, 0.6, 0.35, 1)',
      fill: 'both'
    });

      anim.onfinish = () => {
        const field = $('butterflyField');
        const total = isMobile() ? 7 : 15;
        const stay = field && field.children.length < total;
        el.style.opacity = '0';
        setTimeout(() => {
        el.remove();
        if (stay) {
          el.style.opacity = '';
          field.appendChild(el);
          wander(el, { x: last.x, y: last.y }, finalAngle);
        }
      }, 50);
    };
  }

  function reveal(cx, cy) {
    const W = window.innerWidth;
    const H = window.innerHeight;

    siteWrap.hidden = false;
    siteWrap.classList.add('site-entering');
    startButterflyField();

    const ring = document.createElement('div');
    ring.className = 'iris-ring';
    bloomLayer.appendChild(ring);

    const soft = 130;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + soft + 20;
    const dur = 1700;
    const t0 = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
      const r = e * maxR;

      const mask = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${r}px, #000 ${r + soft}px)`;
      gate.style.webkitMaskImage = mask;
      gate.style.maskImage = mask;

      const rr = r + soft * 0.35;
      ring.style.left = cx + 'px';
      ring.style.top = cy + 'px';
      ring.style.width = rr * 2 + 'px';
      ring.style.height = rr * 2 + 'px';
      ring.style.opacity = String(1 - Math.max(0, (t - 0.7) / 0.3));

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        ring.remove();
        finishGate();
      }
    }
    requestAnimationFrame(frame);
  }

  // Allow keyboard activation as a safety net
  [envelopeButton, lilyButton].forEach((btn) => {
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
}

// =============================================================
// MAIN SITE (everything after the intro)
// =============================================================

// -------------------------------------------------------------
// the names for the eighteen traditions.
// Replace 'Name Here' with real names. Leave a slot as 'Name Here'
// (or delete it) and the placeholder stays. Order = order shown.
// -------------------------------------------------------------
const TRADITIONS = {
  candles: {
    title: '18 Candles',
    tagline: 'Eighteen people who’ve been a steady light in Elaine’s life, each lighting a candle in that person’s honor.',
    names: [
      'Rhea Diamsay', 'Leigh Anne Bangcaray', 'Arian Bangcaray', 'Ryza Nuqui', 'Saira Joy Nuqui', 'Kristine Chloe Rullan',
      'Audrey Miller', 'Gwyneth Anne Mendoza', 'Achelle Beltran', 'Dian Bangcaray', 'Jamaica Dela Cruz', 'Darlene Maribojoc',
      'Sherry Ann Nuqui', 'Asheen Dela Cruz', 'Chelsea Zeta', 'Ofemia Miller', 'Amelia Cawigan', 'Krisna Cawigan'
    ]
  },
  roses: {
    title: '18 Roses',
    tagline: 'Eighteen roses from eighteen people close to her, each one handed over with a wish for what’s next.',
    names: [
      'Ivan Bangcaray', 'Raven Dave Falalimpa', 'Ian Bangcaray', 'Ronel Montoya', 'Renz Erwin Nuqui', 'Tristan Kyle Valenzuela',
      'Clarence Viray', 'Ramil Diamsay', 'Jorous Cawigan', 'Mark Ian Mendoza', 'Kevin Jay Maribojoc', 'Joshua Cawigan',
      'Willington Nuqui', 'Carlo Nuqui', 'Redd Bansil', 'Mateo Cawigan', 'Andy Cawigan', 'Alaine Cawigan'
    ]
  },
  treasures: {
    title: '18 Treasures',
    tagline: 'Eighteen small gifts standing in for the advice behind them — practical stuff for the years ahead.',
    names: [
      'Charmie Nuqui', 'Myca Lua', 'Jaymar Guinto', 'Karen David ', 'Jelline Manalasan', 'Paula Jane Ochoa',
      'Katherine Nuqui', 'Janelle Manalasan', 'Remy Juliana Delazo', 'Marianelle Orado', 'Clariza Ducut', 'Aishia Ross Mangalindan',
      'Rhian Esquilla', 'Frinzes Jhea A. Alipater', 'Anne Loraine Ibo', 'Alziea Hapin', 'Christine Cawigan', 'Sazzy Princess Magistrado'
    ]
  },
  shots: {
    title: '18 Shots',
    tagline: 'Eighteen rounds with the friends who show up for exactly this kind of thing.',
    names: [
      'Ricky Rullan', 'Yves Alfonso', 'Kevin Nuqui', 'Joseph Valenzuela', 'Mico Jay Mendoza', 'Jazzfer Payumo',
      'Rommel Diamsay', 'Dante Bangcaray', 'Jaime Ibo', 'Christian Paul Falalimpa', 'Alvin Bordeos', 'Billy Nuqui',
      'Mhat Miller', 'Renz Erwin Nuqui', 'Prince Jacob', 'Raymond Mendoza', 'Daniel Peligro', 'Leo Bangcaray'
    ]
  },
  bills: {
    title: '18 Blue Bills',
    tagline: 'Eighteen bills, each one a small blessing for whatever Elaine builds next.',
    names: [
      'Gloria Reyes', 'Joyce Bansil', 'Mitchy Faith', 'Rexine Alfonso', 'Jhoan Rullan', 'Jimmy Nuqui',
      'Emil Cabales', 'Jenny Manalansan', 'Lethisia Manuel', 'Bryan Maglalang', 'Julliane Peñaranda', 'Janice Mallari',
      'Zorina Valenzuela', 'Maricris Marunoc', 'Emmanuel Dabu', 'Michelle Anne Guballo', 'Cecil Falalimpa', 'Lhery David'
    ]
  },
  balloons: {
    title: '18 Balloons',
    tagline: 'Eighteen balloons, each carrying a wish or a dream for the years ahead.',
    names: [
      'Ashley Bangcaray ', 'Aethan Rullan', 'Nathan Rullan', 'Jeoff Andrei Mendoza', 'Arain Ibo', 'Kyre Peñaranda',
      'Kalel David', 'Nathaniel Nuqui', 'Cindy Ochoa', 'Angeline Mosones', 'Angela Mosones', 'Ivan Manzon', 'Nigel Manzon',
      'Kyle Mungcal', 'Jaydee Payumo', 'Uno Ambit', 'Rafael Laurence Tolen', 'Zafira Molly Macaspag'
    ]
  }
};

// ✏️ EDIT HERE — the date and time the countdown counts down to.
// October 17, 2026 at 6:00 PM (Philippine time, UTC+8).
const EVENT_DATE = '2026-10-17T18:00:00+08:00';

// =============================================================
// NAV
// =============================================================
function initNav() {
  const toggle = $('navToggle');
  const links = $('navLinks');
  if (!toggle || !links) return;

  const setOpen = (open) => {
    links.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!links.classList.contains('open'));
  });
  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('click', (e) => {
    if (!links.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

// highlight the nav link of the section currently on screen
function initScrollSpy() {
  const links = [...document.querySelectorAll('#navLinks a')];
  if (!links.length || !('IntersectionObserver' in window)) return;

  const map = new Map();
  links.forEach((a) => {
    const id = (a.getAttribute('href') || '').replace('#', '');
    const sec = id && document.getElementById(id);
    if (sec) map.set(sec, a);
  });

  const setActive = (link) => links.forEach((a) => a.classList.toggle('active', a === link));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(map.get(entry.target));
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  map.forEach((_, sec) => io.observe(sec));

  // no link is active while the hero is on screen
  const hero = $('hero');
  if (hero) {
    new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && en.intersectionRatio > 0.55 && setActive(null)),
      { threshold: [0.55] }
    ).observe(hero);
  }
}

// =============================================================
// AMBIENT GOLD SPARKLES DRIFTING UPWARD
// =============================================================
function initAmbientSparkles() {
  const layer = $('ambientSparkles');
  if (!layer) return;
  const count = isLowEnd() ? (isMobile() ? 2 : 4) : (isMobile() ? 10 : 18);

  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span');
    dot.className = 'drift';
    dot.style.left = Math.random() * 100 + 'vw';
    dot.style.animationDuration = 10 + Math.random() * 14 + 's';
    dot.style.animationDelay = Math.random() * 14 + 's';
    layer.appendChild(dot);
  }
}

// =============================================================
// PARALLAX — the hero moon, lanterns and hills drift as you scroll
// =============================================================
function initParallax() {
  const garden = document.querySelector('.hero-garden');
  if (!garden || prefersReduced() || isLowEnd()) return;

  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < window.innerHeight * 1.3) garden.style.setProperty('--sy', y.toFixed(0));
        ticking = false;
      });
    },
    { passive: true }
  );
}

// =============================================================
// THE EIGHTEEN — tabbed traditions
// =============================================================
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildTraditions() {
  const tabsWrap = $('tradTabs');
  const panel = $('tradPanel');
  if (!tabsWrap || !panel) return;
  const tabs = [...tabsWrap.querySelectorAll('.trad-tab')];

  function render(key, animate) {
    const t = TRADITIONS[key];
    if (!t) return;
    const btn = tabs.find((b) => b.dataset.key === key);
    const iconSvg = btn ? btn.querySelector('svg').outerHTML : '';

    const items = [];
    for (let i = 0; i < 18; i++) {
      const raw = (t.names[i] || '').trim();
      const blank = !raw || raw === 'Name Here';
      items.push(
        `<li class="orb" style="--i:${i}"><span class="orb-n">${String(i + 1).padStart(2, '0')}</span>` +
          `<span class="orb-name${blank ? ' is-blank' : ''}">${blank ? 'Name Here' : escapeHtml(raw)}</span></li>`
      );
    }

    panel.dataset.key = key;
    panel.setAttribute('aria-labelledby', 'tab-' + key);
    panel.innerHTML =
      `<div class="trad-head"><span class="trad-icon">${iconSvg}</span>` +
      `<div><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.tagline)}</p></div></div>` +
      `<ol class="orbs">${items.join('')}</ol>`;

    if (animate) {
      panel.style.animation = 'none';
      void panel.offsetWidth;
      panel.style.animation = '';
    }
  }

  function select(btn, focus) {
    tabs.forEach((b) => {
      const on = b === btn;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    render(btn.dataset.key, true);
    if (focus) btn.focus();
    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  tabs.forEach((btn, i) => {
    btn.addEventListener('click', () => select(btn, false));
    btn.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) {
        e.preventDefault();
        select(n, true);
      }
    });
  });

  render(tabs[0].dataset.key, false);
}

// =============================================================
// COUNTDOWN (with glowing progress rings)
// =============================================================
function initCountdown() {
  const target = new Date(EVENT_DATE).getTime();

  const elDays = $('cdDays');
  const elHours = $('cdHours');
  const elMinutes = $('cdMinutes');
  const elSeconds = $('cdSeconds');
  if (!elDays) return;

  const cells = {
    d: $('cdCellDays'),
    h: $('cdCellHours'),
    m: $('cdCellMinutes'),
    s: $('cdCellSeconds')
  };
  const ring = (cell, p) => cell && cell.style.setProperty('--p', clamp(p, 0, 1).toFixed(4));

  function tick() {
    const diff = target - Date.now();

    if (diff <= 0) {
      [elDays, elHours, elMinutes, elSeconds].forEach((el) => (el.textContent = '00'));
      Object.values(cells).forEach((c) => ring(c, 1));
      note.textContent = 'It’s today! 🎉';
      clearInterval(timer);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    elDays.textContent = String(days).padStart(2, '0');
    elHours.textContent = String(hours).padStart(2, '0');
    elMinutes.textContent = String(minutes).padStart(2, '0');
    elSeconds.textContent = String(seconds).padStart(2, '0');

    ring(cells.d, days / 60);
    ring(cells.h, hours / 24);
    ring(cells.m, minutes / 60);
    ring(cells.s, seconds / 60);
  }

  tick();
  const timer = setInterval(tick, 1000);
}

// =============================================================
// REVEAL ON SCROLL — soft fade-up for anything marked data-reveal
// =============================================================
function initReveal() {
  const targets = [...document.querySelectorAll('[data-reveal]')];
  targets.forEach((t) => t.classList.add('reveal'));

  if (!('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('in'));
    return;
  }

  // stagger siblings that enter together (info cards, etc.)
  const observer = new IntersectionObserver(
    (entries) => {
      let n = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty('--rd', n * 0.09 + 's');
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
        n++;
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  );

  targets.forEach((t) => observer.observe(t));
}

// =============================================================
// BACK TO TOP
// =============================================================
function initBackToTop() {
  const btn = $('backToTop');
  if (!btn) return;

  const toggleVisibility = () => {
    btn.classList.toggle('visible', window.scrollY > window.innerHeight * 0.6);
  };

  window.addEventListener('scroll', toggleVisibility, { passive: true });
  toggleVisibility();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
