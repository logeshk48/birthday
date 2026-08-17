/* ============================================================
   HAPPY BIRTHDAY — a birthday film in four acts
   Vanilla canvas 2D for the tree + GSAP for the orchestration.

   ACT 1  a real recurve bow with a Cupid's arrow nocked — you
          DRAW the string down and RELEASE to fire (pointer drag,
          or keyboard). A softly beating heart waits above as the
          target.
   ACT 2  the arrow flies up and strikes the heart; the heart
          jolts, falls, and bursts into a flood of rose that
          swallows the frame (no cross-fade).
   ACT 3  a kinetic wish hinges up out of that colour, glyph by
          glyph, under cinema bars and a slow camera push.
   ACT 4  a gold light blooms, and the tree grows into one heart
          of lit blossoms with the hand-lettered wish.

   PERSONAL ACT 5
          Pavi's birthday photo + wishes + interactive ending.

   A GSAP master timeline runs the shot + Acts 2–3; at its end it
   starts the canvas tree (Act 4), which owns its own rAF and
   plays once, then holds — living, never looping.
   ============================================================ */

import gsap from 'gsap';

/* ============================================================
   GSAP DRAWN PLUGIN
   ============================================================ */

/* the pen-stroke plugin: a `drawn` 0..1 property for the underline */
gsap.registerPlugin({
  name: 'drawn',

  init(target, value) {
    const len = target.getTotalLength();

    target.style.strokeDasharray = len;

    this.target = target;
    this.len = len;
    this.value = value;
  },

  render(ratio, data) {
    data.target.style.strokeDashoffset =
      data.len * (1 - data.value * ratio);
  },
});


/* ============================================================
   DOM HELPERS
   ============================================================ */

const $ = (id) => document.getElementById(id);


/* ============================================================
   MAIN DOM REFERENCES
   ============================================================ */

const canvas = $('tree');
const ctx = canvas.getContext('2d');

const wishEl = $('wish');

const hero        = $('hero');
const eyebrow     = $('eyebrow');
const hint        = $('hint');
const motes       = $('motes');
const target      = $('target');
const targetHeart = $('targetHeart');
const heartGlow   = target.querySelector('.heart__glow');
const aim         = $('aim');

const archery = $('archery');
const bow     = $('bow');
const arrow   = $('arrow');
const strL    = $('strL');
const strR    = $('strR');
const serving = $('serving');

const flood    = $('flood');
const field    = $('field');
const camera   = $('camera');
const fgrid    = $('fgrid');
const kEyebrow = $('kEyebrow');
const kSub     = $('kSub');
const barTop   = $('barTop');
const barBot   = $('barBot');

const uline = $('uline').querySelector('.uline__path');

const bloom = $('bloom');

const replay = $('replay');


/* ============================================================
   PERSONAL BIRTHDAY DOM
   ============================================================ */

const memory = $('memory');
const makeWish = $('makeWish');
const finalMessage = $('finalMessage');


/* ============================================================
   SETTINGS
   ============================================================ */

const reduceMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isRecord =
  new URLSearchParams(location.search).has('record');


/* ============================================================
   SOUND — a tiny Web Audio synth driven by the cue() system
   ============================================================

   No audio files: every sound is generated in the browser, so
   there is nothing to host and nothing to license. It listens
   to the same nine cue points the film already fires.
   ============================================================ */

const Sound = (() => {
  const KEY = 'bday:muted';

  let ac = null;
  let master = null;
  let padGain = null;
  let padOn = false;
  let noiseBuf = null;
  let padNodes = [];

  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

  const VOL = 0.85;

  function boot() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0.0001 : VOL;
    master.connect(ac.destination);
    return ac;
  }

  function resume() {
    const c = boot();
    if (c && c.state === 'suspended') {
      const p = c.resume();
      /* Chrome rejects this if there was no gesture yet. That is
         expected, not an error -- the unlock listeners below will
         catch the first real one. Swallow it so it does not show
         up in the console as an unhandled rejection. */
      if (p && p.catch) p.catch(() => {});
    }
    return c;
  }


  /*
     One-time unlock. The film fires cues from GSAP timers, which
     do not count as user activation, so without this the very
     first cue would try to start audio from a timer callback and
     be refused. Any real interaction anywhere unlocks it.
  */

  let unlocked = false;

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    resume();
    ['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
      document.removeEventListener(ev, unlock, true)
    );
  }

  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
    document.addEventListener(ev, unlock, true)
  );

  function env(g, t0, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  function blip(o1) {
    const c = boot(); if (!c) return;
    const {
      f = 440, to = null, dur = 0.3, type = 'sine',
      vol = 0.25, attack = 0.008, delay = 0, detune = 0,
    } = o1;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.detune.value = detune;
    o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    env(g, t0, attack, dur, vol);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.12);
  }

  function noiseSrc() {
    const c = boot(); if (!c) return null;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 1.5), c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    return s;
  }

  function swish(o1) {
    const c = boot(); if (!c) return;
    const { dur = 0.5, from = 400, to = 3000, vol = 0.2, delay = 0, q = 4 } = o1;
    const t0 = c.currentTime + delay;
    const s = noiseSrc(); if (!s) return;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(from, t0);
    bp.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = c.createGain();
    env(g, t0, 0.03, dur, vol);
    s.connect(bp); bp.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.12);
  }

  function run(notes, step, vol) {
    step = step || 0.12;
    vol = vol || 0.16;
    notes.forEach((n, i) => {
      blip({ f: n, dur: 1.1, type: 'triangle', vol, attack: 0.004, delay: i * step });
      blip({ f: n * 2, dur: 0.55, type: 'sine', vol: vol * 0.35, delay: i * step });
    });
  }

  function startPad() {
    const c = boot(); if (!c || padOn) return;
    padOn = true;
    padGain = c.createGain();
    padGain.gain.value = 0.0001;
    padGain.connect(master);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 850;
    lp.connect(padGain);
    [110, 164.81, 277.18, 329.63].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = i > 1 ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.value = 0.1 / (i + 1);
      o.connect(g); g.connect(lp);
      o.start();
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 0.05 + i * 0.017;
      lg.gain.value = 3;
      lfo.connect(lg); lg.connect(o.detune);
      lfo.start();
      padNodes.push(o, lfo);
    });
    padGain.gain.exponentialRampToValueAtTime(0.3, c.currentTime + 5);
  }

  function stopPad() {
    if (!padGain || !ac) return;
    const t0 = ac.currentTime;
    padGain.gain.setTargetAtTime(0.0001, t0, 0.4);
    /* actually stop the oscillators once faded, or every replay
       would stack another four of them running forever */
    const dying = padNodes;
    padNodes = [];
    dying.forEach((n) => {
      try { n.stop(t0 + 1.6); } catch (e) {}
    });
    padOn = false;
    padGain = null;
  }

  const CUES = {
    draw() {
      swish({ dur: 0.75, from: 180, to: 800, vol: 0.05, q: 9 });
      blip({ f: 70, to: 118, dur: 0.75, type: 'sine', vol: 0.07 });
    },
    release() {
      blip({ f: 950, to: 170, dur: 0.16, type: 'triangle', vol: 0.28 });
    },
    whoosh() {
      swish({ dur: 0.4, from: 550, to: 4200, vol: 0.2, q: 2 });
    },
    hit() {
      blip({ f: 220, to: 55, dur: 0.55, type: 'sine', vol: 0.42 });
      swish({ dur: 0.28, from: 3200, to: 320, vol: 0.16, q: 1 });
      startPad();
    },
    flood() {
      run([523.25, 659.25, 783.99], 0.075, 0.12);
      blip({ f: 130.81, to: 65.41, dur: 1.4, type: 'sine', vol: 0.2 });
    },
    wish() {
      run([659.25, 783.99, 987.77], 0.12, 0.15);
    },
    wish2() {
      run([783.99, 987.77, 1174.66, 1318.51], 0.1, 0.14);
    },
    bloom() {
      run([880, 1108.73, 1318.51, 1760], 0.085, 0.15);
      blip({ f: 87.31, to: 174.61, dur: 2.2, type: 'sine', vol: 0.14 });
    },
    grow() {
      blip({ f: 98, to: 196, dur: 2.6, type: 'sine', vol: 0.13 });
      run([440, 554.37, 659.25, 880], 0.22, 0.09);
    },
    magic() {
      run([1318.51, 1567.98, 1760, 2093], 0.065, 0.12);
    },
  };

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
    if (master && ac) {
      master.gain.setTargetAtTime(muted ? 0.0001 : VOL, ac.currentTime, 0.12);
    }
  }

  /* pull the whole mix down while a story video plays,
     so the drone and the clip do not fight */
  function duck(on) {
    if (!master || !ac || muted) return;
    master.gain.setTargetAtTime(
      on ? 0.05 : VOL, ac.currentTime, 0.25
    );
  }

  /* park the audio clock while the tab is hidden */
  function suspend() {
    if (ac && ac.state === 'running') ac.suspend();
  }

  function wake() {
    if (ac && ac.state === 'suspended' && !muted) ac.resume();
  }

  return {
    resume,
    setMuted,
    stopPad,
    suspend,
    wake,
    duck,
    isMuted: () => muted,
    play(name) {
      const f = CUES[name];
      if (!f) return;
      /* nothing to play into until the page has been touched */
      if (!unlocked && !ac) return;
      resume();
      f();
    },
  };
})();


/* ============================================================
   RECORDER CUE SYSTEM
   ============================================================ */

/*
   The page stays muted, but it timestamps every beat the film
   crosses. The offline sound synth can use these exact moments.
*/

if (isRecord) {
  window.bdayCues = [];
}

let recT0 = 0;

function cue(name) {
  if (isRecord && recT0) {
    window.bdayCues.push({
      cue: name,
      t: (performance.now() - recT0) / 1000,
    });
  }


  /* every beat of the film also plays its note */

  Sound.play(name);
}


/* ============================================================
   MATH HELPERS
   ============================================================ */

const rand = (a, b) =>
  a + Math.random() * (b - a);

const pick = (a) =>
  a[(Math.random() * a.length) | 0];

const clamp = (v, a, b) =>
  v < a ? a : v > b ? b : v;

const clamp01 = (v) =>
  v < 0 ? 0 : v > 1 ? 1 : v;

const lerp = (a, b, t) =>
  a + (b - a) * t;

const easeOutCubic = (t) =>
  1 - Math.pow(1 - t, 3);

const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return (
    1 +
    c3 * Math.pow(t - 1, 3) +
    c1 * Math.pow(t - 1, 2)
  );
};


function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);

  const r = clamp(
    (n >> 16) + amt,
    0,
    255
  );

  const g = clamp(
    ((n >> 8) & 255) + amt,
    0,
    255
  );

  const b = clamp(
    (n & 255) + amt,
    0,
    255
  );

  return `rgb(${r | 0},${g | 0},${b | 0})`;
}


/* ============================================================
   TREE ENGINE — ACT 4
   ============================================================ */

const BLOSSOM = [
  {
    c0: '#ffe1ec',
    c1: '#ff80aa',
  },

  {
    c0: '#ffd0e0',
    c1: '#f4577f',
  },

  {
    c0: '#ffc4d2',
    c1: '#e23b67',
  },

  {
    c0: '#ffd9c4',
    c1: '#ff8a5b',
  },

  {
    c0: '#ffeec2',
    c1: '#f6b13e',
  },

  {
    c0: '#ffd2e6',
    c1: '#e84d9a',
  },
];


/* ============================================================
   TREE TIMELINE
   ============================================================ */

const T = {
  trunkStart: 0.10,
  branchSpan: 1.80,
  bloomT0: 1.25,
  bloomSpan: 2.00,
  petalT0: 2.45,
  noteStart: 0.45,
  done: 4.60,
};


const SS = 168;


/* ============================================================
   HEART SHAPE
   ============================================================ */

function heartShape(c, x, top, w, h) {
  c.beginPath();

  c.moveTo(
    x,
    top + h * 0.28
  );

  c.bezierCurveTo(
    x,
    top,
    x - w * 0.5,
    top,
    x - w * 0.5,
    top + h * 0.28
  );

  c.bezierCurveTo(
    x - w * 0.5,
    top + h * 0.60,
    x - w * 0.16,
    top + h * 0.80,
    x,
    top + h
  );

  c.bezierCurveTo(
    x + w * 0.16,
    top + h * 0.80,
    x + w * 0.5,
    top + h * 0.60,
    x + w * 0.5,
    top + h * 0.28
  );

  c.bezierCurveTo(
    x + w * 0.5,
    top,
    x,
    top,
    x,
    top + h * 0.28
  );

  c.closePath();
}


/* ============================================================
   BLOSSOM SPRITE
   ============================================================ */

function makeBlossom({ c0, c1 }, soft) {
  const cv = document.createElement('canvas');

  cv.width = cv.height = SS;

  const c = cv.getContext('2d');

  const w = SS * 0.62;
  const h = SS * 0.58;
  const x = SS / 2;
  const top = SS * 0.17;


  /* shadow */
  c.save();

  c.shadowColor =
    'rgba(150,38,72,0.32)';

  c.shadowBlur =
    SS * 0.085;

  c.shadowOffsetY =
    SS * 0.05;

  c.fillStyle = c1;

  heartShape(
    c,
    x,
    top,
    w,
    h
  );

  c.fill();

  c.restore();


  /* main gradient */

  const g =
    c.createRadialGradient(
      x - w * 0.20,
      top + h * 0.20,
      h * 0.04,
      x,
      top + h * 0.42,
      h * 0.92
    );

  g.addColorStop(0, c0);
  g.addColorStop(0.55, c1);
  g.addColorStop(1, shade(c1, -26));


  heartShape(
    c,
    x,
    top,
    w,
    h
  );

  c.fillStyle = g;

  c.fill();


  /* lower shading + highlight */

  c.save();

  heartShape(
    c,
    x,
    top,
    w,
    h
  );

  c.clip();

  const g2 =
    c.createLinearGradient(
      0,
      top,
      0,
      top + h
    );

  g2.addColorStop(
    0,
    'rgba(255,255,255,0)'
  );

  g2.addColorStop(
    0.65,
    'rgba(110,16,46,0)'
  );

  g2.addColorStop(
    1,
    'rgba(110,16,46,0.26)'
  );

  c.fillStyle = g2;

  c.fillRect(
    0,
    0,
    SS,
    SS
  );

  c.globalAlpha = 0.55;

  c.fillStyle = '#ffffff';

  c.beginPath();

  c.ellipse(
    x - w * 0.15,
    top + h * 0.24,
    w * 0.17,
    h * 0.11,
    -0.5,
    0,
    Math.PI * 2
  );

  c.fill();

  c.restore();


  if (!soft) {
    return cv;
  }


  /* soft version */

  const cv2 =
    document.createElement('canvas');

  cv2.width =
    cv2.height =
    SS;

  const c2 =
    cv2.getContext('2d');

  c2.filter =
    'blur(2.6px)';

  c2.drawImage(
    cv,
    0,
    0
  );

  c2.filter = 'none';

  c2.globalCompositeOperation =
    'source-atop';

  c2.globalAlpha = 0.42;

  c2.fillStyle =
    '#fff3ea';

  c2.fillRect(
    0,
    0,
    SS,
    SS
  );

  return cv2;
}


/* ============================================================
   BOKEH
   ============================================================ */

function makeBokeh(rgb) {
  const S = 128;

  const cv =
    document.createElement('canvas');

  cv.width =
    cv.height =
    S;

  const c =
    cv.getContext('2d');

  const g =
    c.createRadialGradient(
      S / 2,
      S / 2,
      0,
      S / 2,
      S / 2,
      S / 2
    );

  g.addColorStop(
    0,
    `rgba(${rgb},0.9)`
  );

  g.addColorStop(
    0.45,
    `rgba(${rgb},0.22)`
  );

  g.addColorStop(
    1,
    `rgba(${rgb},0)`
  );

  c.fillStyle = g;

  c.fillRect(
    0,
    0,
    S,
    S
  );

  return cv;
}


/* ============================================================
   SPARKLE
   ============================================================ */

function makeSparkle() {
  const S = 64;

  const cv =
    document.createElement('canvas');

  cv.width =
    cv.height =
    S;

  const c =
    cv.getContext('2d');

  const m = S / 2;

  const g =
    c.createRadialGradient(
      m,
      m,
      0,
      m,
      m,
      m
    );

  g.addColorStop(
    0,
    'rgba(255,255,255,0.95)'
  );

  g.addColorStop(
    0.25,
    'rgba(255,236,200,0.5)'
  );

  g.addColorStop(
    1,
    'rgba(255,236,200,0)'
  );

  c.fillStyle = g;

  c.beginPath();

  c.arc(
    m,
    m,
    m,
    0,
    6.2832
  );

  c.fill();

  c.fillStyle =
    'rgba(255,255,255,0.95)';

  c.translate(
    m,
    m
  );

  for (let k = 0; k < 2; k++) {
    c.beginPath();

    c.moveTo(
      0,
      -m
    );

    c.quadraticCurveTo(
      0,
      0,
      m,
      0
    );

    c.quadraticCurveTo(
      0,
      0,
      0,
      m
    );

    c.quadraticCurveTo(
      0,
      0,
      -m,
      0
    );

    c.quadraticCurveTo(
      0,
      0,
      0,
      -m
    );

    c.fill();

    c.rotate(
      Math.PI / 4
    );

    c.scale(
      0.5,
      0.5
    );
  }

  return cv;
}


/* ============================================================
   SPRITES
   ============================================================ */

let SPR = {
  crisp: [],
  soft: [],
};

let BOKEH = [];

let SPARKLE = null;


function buildSprites() {
  SPR = {
    crisp:
      BLOSSOM.map(
        (b) =>
          makeBlossom(
            b,
            false
          )
      ),

    soft:
      BLOSSOM.map(
        (b) =>
          makeBlossom(
            b,
            true
          )
      ),
  };


  BOKEH = [
    makeBokeh(
      '255,224,188'
    ),

    makeBokeh(
      '255,196,214'
    ),

    makeBokeh(
      '255,238,210'
    ),
  ];


  SPARKLE =
    makeSparkle();
}


/* ============================================================
   DRAW SPRITE
   ============================================================ */

function drawSprite(
  sprite,
  x,
  y,
  size,
  rot,
  alpha
) {
  ctx.save();

  ctx.translate(
    x,
    y
  );

  if (rot) {
    ctx.rotate(rot);
  }

  ctx.globalAlpha =
    alpha;

  ctx.drawImage(
    sprite,
    -size * 0.5,
    -size * 0.47,
    size,
    size
  );

  ctx.restore();
}


/* ============================================================
   HEART POLYGON
   ============================================================ */

let heartPoly = null;


function buildHeartPoly() {
  const raw = [];

  let minX = 1e9;
  let maxX = -1e9;

  let minY = 1e9;
  let maxY = -1e9;


  for (
    let i = 0;
    i <= 160;
    i++
  ) {
    const t =
      (i / 160) *
      Math.PI *
      2;

    const x =
      16 *
      Math.pow(
        Math.sin(t),
        3
      );

    const y =
      13 *
        Math.cos(t) -
      5 *
        Math.cos(2 * t) -
      2 *
        Math.cos(3 * t) -
      Math.cos(4 * t);


    raw.push([
      x,
      y,
    ]);


    if (x < minX)
      minX = x;

    if (x > maxX)
      maxX = x;

    if (y < minY)
      minY = y;

    if (y > maxY)
      maxY = y;
  }


  const midX =
    (minX + maxX) / 2;

  const midY =
    (minY + maxY) / 2;

  const hw =
    (maxX - minX) / 2;

  const hh =
    (maxY - minY) / 2;


  heartPoly =
    raw.map(
      ([x, y]) => [
        (x - midX) / hw,
        (y - midY) / hh,
      ]
    );
}


function pointInPoly(x, y) {
  let inside = false;

  const p =
    heartPoly;


  for (
    let i = 0,
    j = p.length - 1;

    i < p.length;

    j = i++
  ) {
    const xi = p[i][0];
    const yi = p[i][1];

    const xj = p[j][0];
    const yj = p[j][1];


    if (
      ((yi > y) !== (yj > y)) &&
      (
        x <
        ((xj - xi) *
          (y - yi)) /
          (yj - yi) +
          xi
      )
    ) {
      inside = !inside;
    }
  }


  return inside;
}


/* ============================================================
   TREE STATE
   ============================================================ */

let W = 0;
let H = 0;
let dpr = 1;

let cx = 0;
let cy = 0;
let rx = 0;
let ry = 0;
let groundY = 0;

let branches = [];
let hearts = [];
let petals = [];
let rested = [];
let orbs = [];
let floaters = [];
let twinkles = [];

let bgGrad = null;
let glowGrad = null;
let groundGrad = null;


const quad = (
  b,
  t
) => {
  const m = 1 - t;

  const a = m * m;
  const k = 2 * m * t;
  const d = t * t;

  return {
    x:
      a * b.x1 +
      k * b.cx +
      d * b.x2,

    y:
      a * b.y1 +
      k * b.cy +
      d * b.y2,
  };
};


function barkGrad(
  x1,
  y1,
  x2,
  y2,
  depth
) {
  const g =
    ctx.createLinearGradient(
      x1,
      y1,
      x2,
      y2
    );

  g.addColorStop(
    0,
    `hsl(348 26% ${26 + depth * 3}%)`
  );

  g.addColorStop(
    1,
    `hsl(346 24% ${40 + depth * 5}%)`
  );

  return g;
}


/* ============================================================
   BUILD TREE SCENE
   ============================================================ */

function buildScene() {
  branches = [];
  hearts = [];
  petals = [];
  rested = [];
  twinkles = [];
  orbs = [];
  floaters = [];


  buildHeartPoly();


  const wide =
    W / H > 1.2;


  cx =
    W *
    (wide ? 0.57 : 0.5);

  cy =
    H *
    (wide ? 0.37 : 0.38);


  ry =
    Math.min(
      H * 0.33,
      W * 0.30
    );

  rx =
    ry * 1.16;


  groundY =
    H * 0.93;


  /* background */

  bgGrad =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );

  bgGrad.addColorStop(
    0,
    '#fff3e9'
  );

  bgGrad.addColorStop(
    0.46,
    '#ffe7d6'
  );

  bgGrad.addColorStop(
    0.78,
    '#fcd9c4'
  );

  bgGrad.addColorStop(
    1,
    '#f3c4b5'
  );


  /* glow */

  glowGrad =
    ctx.createRadialGradient(
      cx,
      cy,
      ry * 0.1,
      cx,
      cy,
      ry * 1.55
    );

  glowGrad.addColorStop(
    0,
    'rgba(255,219,170,0.6)'
  );

  glowGrad.addColorStop(
    0.5,
    'rgba(255,170,150,0.2)'
  );

  glowGrad.addColorStop(
    1,
    'rgba(255,170,150,0)'
  );


  /* ground */

  groundGrad =
    ctx.createRadialGradient(
      cx,
      H * 1.02,
      ry * 0.2,
      cx,
      H * 1.02,
      ry * 1.6
    );

  groundGrad.addColorStop(
    0,
    'rgba(255,205,165,0.5)'
  );

  groundGrad.addColorStop(
    1,
    'rgba(255,205,165,0)'
  );


  /* bokeh orbs */

  for (
    let i = 0;
    i < 11;
    i++
  ) {
    orbs.push({
      x: rand(0, W),

      y: rand(0, H),

      r: rand(
        W * 0.05,
        W * 0.17
      ),

      vy: rand(
        -6,
        -16
      ),

      drift: rand(
        -0.3,
        0.3
      ),

      phase: rand(
        0,
        6.28
      ),

      alpha: rand(
        0.05,
        0.13
      ),

      sprite:
        pick(BOKEH),
    });
  }


  /* floating blossoms */

  const FN =
    wide ? 18 : 15;


  for (
    let i = 0;
    i < FN;
    i++
  ) {
    const depth =
      Math.random();


    floaters.push({
      x: rand(0, W),

      y: rand(
        -H * 0.1,
        H * 1.1
      ),

      depth,

      idx:
        (Math.random() *
          BLOSSOM.length) |
        0,

      box:
        lerp(
          Math.min(W, H) *
            0.025,

          Math.min(W, H) *
            0.075,

          depth
        ),

      vy:
        lerp(
          7,
          20,
          depth
        ),

      sway:
        rand(8, 22),

      phase:
        rand(0, 6.28),

      rot:
        rand(-0.4, 0.4),

      vrot:
        rand(-0.5, 0.5),

      baseA:
        lerp(
          0.16,
          0.5,
          depth
        ),

      soft:
        depth < 0.45,
    });
  }


  /* ==========================================================
     TREE BRANCH GENERATION
     ========================================================== */

  const baseX = cx;
  const baseY = H * 1.0;

  const trunkTopY =
    cy + ry * 0.62;

  const trunkW =
    Math.max(
      9,
      W * 0.024
    );

  const limbLen =
    ry * 0.6;


  const insidePx =
    (
      x,
      y,
      m = 0.9
    ) =>
      pointInPoly(
        (x - cx) /
          (rx * m),

        (cy - y) /
          (ry * m)
      );


  function addBranch(
    x,
    y,
    ang,
    len,
    w0,
    depth,
    t0
  ) {
    let ex =
      x +
      Math.cos(ang) *
        len;

    let ey =
      y +
      Math.sin(ang) *
        len;

    let clipped =
      false;


    if (!insidePx(ex, ey)) {
      let lo = 0;
      let hi = 1;


      for (
        let k = 0;
        k < 12;
        k++
      ) {
        const mid =
          (lo + hi) / 2;


        if (
          insidePx(
            x +
              Math.cos(ang) *
                len *
                mid,

            y +
              Math.sin(ang) *
                len *
                mid
          )
        ) {
          lo = mid;
        } else {
          hi = mid;
        }
      }


      ex =
        x +
        Math.cos(ang) *
          len *
          lo;

      ey =
        y +
        Math.sin(ang) *
          len *
          lo;

      clipped = true;
    }


    const mx =
      (x + ex) / 2;

    const my =
      (y + ey) / 2;

    const perp =
      ang + Math.PI / 2;

    const bend =
      rand(-1, 1) *
      len *
      0.12;

    const w1 =
      w0 * 0.66;


    branches.push({
      x1: x,
      y1: y,

      cx:
        mx +
        Math.cos(perp) *
          bend,

      cy:
        my +
        Math.sin(perp) *
          bend,

      x2: ex,
      y2: ey,

      w0,
      w1,

      t0,

      dur:
        Math.max(
          0.14,
          0.32 -
            depth *
              0.03
        ),

      depth,

      grad:
        barkGrad(
          x,
          y,
          ex,
          ey,
          depth
        ),
    });


    return {
      ex,
      ey,
      w1,
      clipped,
    };
  }


  function grow(
    x,
    y,
    ang,
    len,
    w,
    depth,
    t0
  ) {
    const r =
      addBranch(
        x,
        y,
        ang,
        len,
        w,
        depth,
        t0
      );


    if (
      r.clipped ||
      depth >= 6 ||
      len < ry * 0.06
    ) {
      return;
    }


    const childT0 =
      t0 +
      (0.32 -
        depth * 0.03) *
        0.6;


    const n =
      Math.random() < 0.55
        ? 2
        : 3;


    for (
      let i = 0;
      i < n;
      i++
    ) {
      const spread =
        0.6 *
          (
            i -
            (n - 1) / 2
          ) +
        rand(
          -0.22,
          0.22
        );

      const lift =
        -0.06 +
        rand(
          -0.05,
          0.05
        );


      grow(
        r.ex,
        r.ey,

        ang +
          spread +
          lift,

        len *
          rand(
            0.74,
            0.84
          ),

        r.w1,

        depth + 1,

        childT0 +
          i * 0.03
      );
    }
  }


  /* trunk */

  addBranch(
    baseX,
    baseY,

    -Math.PI / 2,

    baseY -
      trunkTopY,

    trunkW,

    0,

    T.trunkStart
  );


  branches[0].dur =
    0.55;


  /* main limbs */

  const limbT0 =
    T.trunkStart +
    0.36;

  const L = 3;


  for (
    let i = 0;
    i < L;
    i++
  ) {
    const ang =
      -Math.PI / 2 +
      0.62 *
        (
          i -
          (L - 1) / 2
        ) +
      rand(
        -0.12,
        0.12
      );


    grow(
      baseX,
      trunkTopY,

      ang,

      limbLen,

      trunkW * 0.7,

      1,

      limbT0 +
        i * 0.05
    );
  }


  /* normalize branch timing */

  const maxT0 =
    branches.reduce(
      (m, b) =>
        Math.max(
          m,
          b.t0 +
            b.dur
        ),
      0
    );


  const sc =
    (T.branchSpan -
      T.trunkStart) /
    (maxT0 -
      T.trunkStart);


  for (
    const b of branches
  ) {
    b.t0 =
      T.trunkStart +
      (b.t0 -
        T.trunkStart) *
        sc;
  }


  /* ==========================================================
     HEART BLOSSOMS
     ========================================================== */

  const COUNT =
    Math.round(
      clamp(
        (rx * ry) / 56,
        250,
        440
      )
    );


  const baseBox =
    clamp(
      Math.min(W, H) *
        0.115,

      30,
      74
    );


  let guard = 0;


  while (
    hearts.length <
      COUNT &&
    guard <
      COUNT * 50
  ) {
    guard++;


    const u =
      rand(
        -1.06,
        1.06
      );

    const v =
      rand(
        -1.06,
        1.06
      );


    if (
      !pointInPoly(
        u,
        v
      )
    ) {
      continue;
    }


    const x =
      cx +
      u * rx;

    const y =
      cy -
      v * ry;


    const d =
      clamp01(
        Math.hypot(
          u,
          v + 1
        ) / 2.4
      );


    const t0 =
      T.bloomT0 +
      d *
        (
          T.bloomSpan *
          0.82
        ) +
      rand(
        0,
        T.bloomSpan *
          0.18
      );


    const soft =
      Math.random() <
      0.42;


    hearts.push({
      x,
      y,

      idx:
        (Math.random() *
          BLOSSOM.length) |
        0,

      soft,

      box:
        baseBox *
        (
          soft
            ? rand(
                0.6,
                0.85
              )
            : rand(
                0.78,
                1.12
              )
        ),

      rot:
        rand(
          -0.55,
          0.55
        ),

      sway:
        rand(
          0,
          6.28
        ),

      t0,
    });
  }


  hearts.sort(
    (a, b) =>
      a.soft === b.soft
        ? a.y - b.y
        : a.soft
          ? -1
          : 1
  );
}


/* ============================================================
   TREE BACKGROUND
   ============================================================ */

function drawBackground() {
  ctx.globalAlpha = 1;

  ctx.fillStyle =
    bgGrad;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  ctx.save();

  ctx.globalCompositeOperation =
    'lighter';

  ctx.globalAlpha = 1;

  ctx.fillStyle =
    groundGrad;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  ctx.restore();
}


/* ============================================================
   GOD RAYS
   ============================================================ */

function drawGodRays(
  t,
  intensity
) {
  if (intensity <= 0) {
    return;
  }


  ctx.save();

  ctx.globalCompositeOperation =
    'lighter';


  const ox = cx;

  const oy =
    cy -
    ry * 0.35;


  const R =
    Math.hypot(
      W,
      H
    ) * 1.1;


  const rays = 9;

  const sweep =
    Math.sin(
      t * 0.07
    ) * 0.18;


  for (
    let i = 0;
    i < rays;
    i++
  ) {
    const a =
      -Math.PI / 2 +
      sweep +
      (
        i -
        (rays - 1) / 2
      ) *
        0.2;


    const hw =
      0.035 +
      0.02 *
        (
          0.5 +
          0.5 *
            Math.sin(
              t * 0.5 +
              i * 1.7
            )
        );


    const a1 =
      a - hw;

    const a2 =
      a + hw;


    const g =
      ctx.createLinearGradient(
        ox,
        oy,

        ox +
          Math.cos(a) *
            R,

        oy +
          Math.sin(a) *
            R
      );


    g.addColorStop(
      0,
      `rgba(255,232,190,${0.10 * intensity})`
    );

    g.addColorStop(
      0.5,
      `rgba(255,214,170,${0.05 * intensity})`
    );

    g.addColorStop(
      1,
      'rgba(255,214,170,0)'
    );


    ctx.fillStyle = g;

    ctx.beginPath();

    ctx.moveTo(
      ox,
      oy
    );

    ctx.lineTo(
      ox +
        Math.cos(a1) *
          R,

      oy +
        Math.sin(a1) *
          R
    );

    ctx.lineTo(
      ox +
        Math.cos(a2) *
          R,

      oy +
        Math.sin(a2) *
          R
    );

    ctx.closePath();

    ctx.fill();
  }


  ctx.restore();
}


/* ============================================================
   TREE GLOW
   ============================================================ */

function drawGlow(t) {
  const gi =
    clamp01(
      (t - T.bloomT0) /
      (T.bloomSpan * 0.9)
    );


  if (gi <= 0) {
    return;
  }


  ctx.save();

  ctx.globalAlpha =
    gi;

  ctx.globalCompositeOperation =
    'lighter';

  ctx.fillStyle =
    glowGrad;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  ctx.restore();
}


/* ============================================================
   BOKEH
   ============================================================ */

function drawBokeh(
  t,
  dt
) {
  ctx.save();

  ctx.globalCompositeOperation =
    'lighter';


  for (
    const o of orbs
  ) {
    o.y +=
      o.vy * dt;

    o.x +=
      Math.sin(
        t * 0.3 +
        o.phase
      ) *
      o.drift;


    if (
      o.y <
      -o.r
    ) {
      o.y =
        H + o.r;

      o.x =
        rand(
          0,
          W
        );
    }


    ctx.globalAlpha =
      o.alpha;


    ctx.drawImage(
      o.sprite,

      o.x - o.r,
      o.y - o.r,

      o.r * 2,
      o.r * 2
    );
  }


  ctx.restore();
}


/* ============================================================
   FLOATING BLOSSOMS
   ============================================================ */

function drawFloaters(
  t,
  dt,
  front
) {
  const appear =
    clamp01(
      (t - 0.2) /
      1.4
    );


  if (appear <= 0) {
    return;
  }


  for (
    const f of floaters
  ) {
    if (
      (f.depth >= 0.6) !==
      front
    ) {
      continue;
    }


    f.y -=
      f.vy * dt;


    f.x +=
      Math.sin(
        t * 0.5 +
        f.phase
      ) *
      f.sway *
      dt;


    f.rot +=
      f.vrot * dt;


    if (
      f.y <
      -f.box
    ) {
      f.y =
        H + f.box;

      f.x =
        rand(
          0,
          W
        );
    }


    drawSprite(
      (
        f.soft
          ? SPR.soft
          : SPR.crisp
      )[f.idx],

      f.x,
      f.y,

      f.box,
      f.rot,

      f.baseA *
        appear
    );
  }
}


/* ============================================================
   BRANCHES
   ============================================================ */

function drawBranches(t) {
  ctx.lineCap =
    'round';

  ctx.lineJoin =
    'round';


  for (
    const b of branches
  ) {
    const f =
      clamp01(
        (t - b.t0) /
        b.dur
      );


    if (f <= 0) {
      continue;
    }


    const e =
      easeOutCubic(f);


    ctx.strokeStyle =
      b.grad;


    const steps = 12;

    const last =
      Math.max(
        1,
        Math.ceil(
          steps * e
        )
      );


    let prev =
      quad(
        b,
        0
      );


    for (
      let i = 1;
      i <= last;
      i++
    ) {
      const tt =
        Math.min(
          e,
          i / steps
        );


      const p =
        quad(
          b,
          tt
        );


      ctx.lineWidth =
        lerp(
          b.w0,
          b.w1,
          tt
        );


      ctx.beginPath();

      ctx.moveTo(
        prev.x,
        prev.y
      );

      ctx.lineTo(
        p.x,
        p.y
      );

      ctx.stroke();


      prev = p;
    }
  }
}


/* ============================================================
   TREE HEARTS
   ============================================================ */

function drawHearts(t) {
  const breathe =
    1 +
    Math.sin(
      t * 0.8
    ) *
      0.012;


  for (
    const h of hearts
  ) {
    const p =
      clamp01(
        (t - h.t0) /
        0.6
      );


    if (p <= 0) {
      continue;
    }


    const scale =
      Math.max(
        0,
        easeOutBack(p)
      );


    let alpha =
      clamp01(
        p * 1.7
      );


    if (h.soft) {
      alpha *= 0.8;
    }


    const settled =
      clamp01(
        (
          t -
          h.t0 -
          0.6
        ) /
        0.7
      );


    const sway =
      settled *
      Math.sin(
        t * 1.5 +
        h.sway
      ) *
      (h.box * 0.05);


    const rise =
      (
        1 -
        easeOutCubic(p)
      ) *
      h.box *
      0.45;


    const hx =
      cx +
      (
        h.x -
        cx
      ) *
        breathe +
      sway;


    const hy =
      cy +
      (
        h.y -
        cy
      ) *
        breathe -
      rise;


    drawSprite(
      (
        h.soft
          ? SPR.soft
          : SPR.crisp
      )[h.idx],

      hx,
      hy,

      h.box *
        scale,

      h.rot +
        sway *
          0.012,

      alpha
    );
  }
}


/* ============================================================
   TWINKLES
   ============================================================ */

function updateTwinkles(
  t,
  dt
) {
  const active =
    t >
    T.bloomT0 +
      T.bloomSpan *
        0.45;


  if (
    active &&
    twinkles.length < 9 &&
    Math.random() < 0.5
  ) {
    const h =
      hearts[
        (Math.random() *
          hearts.length) |
          0
      ];


    if (h) {
      twinkles.push({
        x: h.x,
        y: h.y,

        size:
          rand(
            0.6,
            1.3
          ) *
          (
            Math.min(
              W,
              H
            ) *
            0.05
          ),

        age: 0,

        life:
          rand(
            0.7,
            1.2
          ),

        rot:
          rand(
            0,
            6.28
          ),
      });
    }
  }


  ctx.save();

  ctx.globalCompositeOperation =
    'lighter';


  for (
    let i =
      twinkles.length - 1;

    i >= 0;

    i--
  ) {
    const s =
      twinkles[i];


    s.age +=
      dt;


    const k =
      s.age /
      s.life;


    if (k >= 1) {
      twinkles.splice(
        i,
        1
      );

      continue;
    }


    const a =
      Math.sin(
        k * Math.PI
      );


    drawSprite(
      SPARKLE,

      s.x,
      s.y,

      s.size *
        (
          0.6 +
          0.4 * a
        ),

      s.rot +
        k * 1.2,

      a
    );
  }


  ctx.restore();
}


/* ============================================================
   PETALS
   ============================================================ */

function spawnPetal() {
  const h =
    hearts[
      (Math.random() *
        hearts.length) |
        0
    ];


  if (!h) {
    return;
  }


  petals.push({
    x:
      h.x +
      rand(
        -8,
        8
      ),

    y:
      h.y +
      rand(
        -8,
        8
      ),

    vy:
      rand(
        14,
        30
      ),

    vx:
      rand(
        -8,
        8
      ),

    sway:
      rand(
        0.6,
        1.4
      ),

    phase:
      rand(
        0,
        6.28
      ),

    box:
      h.box *
      rand(
        0.34,
        0.6
      ),

    idx:
      h.idx,

    rot:
      rand(
        0,
        6.28
      ),

    vrot:
      rand(
        -1.4,
        1.4
      ),

    age: 0,

    land:
      groundY +
      rand(
        -6,
        H * 0.05
      ),
  });
}


function drawPetals(
  t,
  dt
) {
  for (
    let i =
      petals.length - 1;

    i >= 0;

    i--
  ) {
    const p =
      petals[i];


    p.age +=
      dt;


    p.vy +=
      8 * dt;


    p.x +=
      (
        p.vx +
        Math.sin(
          t * p.sway +
          p.phase
        ) *
          16
      ) *
      dt;


    p.y +=
      p.vy * dt;


    p.rot +=
      p.vrot * dt;


    if (
      p.y >=
      p.land
    ) {
      rested.push({
        x:
          clamp(
            p.x,
            6,
            W - 6
          ),

        y:
          p.land,

        box:
          p.box,

        idx:
          p.idx,

        rot:
          p.rot,

        a:
          rand(
            0.7,
            0.95
          ),
      });


      if (
        rested.length >
        90
      ) {
        rested.shift();
      }


      petals.splice(
        i,
        1
      );


      continue;
    }


    const a =
      p.age < 0.3
        ? p.age / 0.3
        : 1;


    drawSprite(
      SPR.crisp[p.idx],

      p.x,
      p.y,

      p.box,
      p.rot,

      a
    );
  }
}


function drawRested() {
  for (
    const r of rested
  ) {
    drawSprite(
      SPR.crisp[r.idx],

      r.x,
      r.y,

      r.box,
      r.rot,

      r.a
    );
  }
}


/* ============================================================
   ORIGINAL WISH
   ============================================================ */

function showWish(on) {
  wishEl.classList.toggle(
    'is-in',
    on
  );
}


/* ============================================================
   PERSONAL ACT 5
   ============================================================ */

let memoryTimer = 0;


/*
   Hide Pavi's photo section.
*/

function hideMemory() {
  if (memoryTimer) {
    clearTimeout(
      memoryTimer
    );

    memoryTimer = 0;
  }


  memory.classList.remove(
    'is-visible'
  );


  memory.setAttribute(
    'aria-hidden',
    'true'
  );
}


/*
   Reveal Pavi's photo after the tree finishes.
*/

function revealMemory(
  delay = 1000
) {
  if (memoryTimer) {
    clearTimeout(
      memoryTimer
    );
  }


  memoryTimer =
    setTimeout(() => {
      memory.classList.add(
        'is-visible'
      );

      memory.setAttribute(
        'aria-hidden',
        'false'
      );

      memoryTimer = 0;
    }, delay);
}


/*
   Remove any birthday particles
   when replaying.
*/

function removeBirthdayParticles() {
  document
    .querySelectorAll(
      '.birthday-particle'
    )
    .forEach(
      (el) =>
        el.remove()
    );
}


/*
   Create floating hearts
   and sparkles for the
   "Make a wish" button.
*/

function createBirthdayMagic() {
  for (
    let i = 0;
    i < 45;
    i++
  ) {
    const particle =
      document.createElement(
        'span'
      );


    particle.className =
      'birthday-particle';


    particle.textContent =
      Math.random() > 0.5
        ? '✦'
        : '♡';


    particle.style.left =
      `${
        50 +
        (
          Math.random() -
          0.5
        ) *
          25
      }%`;


    particle.style.top =
      `${
        50 +
        (
          Math.random() -
          0.5
        ) *
          20
      }%`;


    particle.style.setProperty(
      '--x',

      `${
        (
          Math.random() -
          0.5
        ) *
        500
      }px`
    );


    particle.style.setProperty(
      '--y',

      `${
        (
          Math.random() -
          0.5
        ) *
        500
      }px`
    );


    document.body.appendChild(
      particle
    );


    setTimeout(
      () =>
        particle.remove(),

      2200
    );
  }
}


/* ============================================================
   MAKE A WISH BUTTON
   ============================================================ */

makeWish.addEventListener(
  'click',
  () => {
    makeWish.disabled =
      true;


    const label =
      makeWish.querySelector(
        '.memory__buttonLabel'
      );


    if (label) {
      label.textContent =
        'Opening… ✨';
    } else {
      makeWish.textContent =
        'Opening… ✨';
    }


    cue('magic');


    createBirthdayMagic();


    setTimeout(() => {

      /*
         Hand over to the memory chapters. story.js listens for
         this. If that file is missing or failed to load, nothing
         listens and we fall back to the original final card, so
         the film is never left with a dead button.
      */

      /*
         Ask the story pages to open. If story.js loaded, it is
         already listening and will take the screen.
      */

      window.dispatchEvent(
        new CustomEvent(
          'bday:story'
        )
      );


      /*
         If it never loaded, nothing listened and the flag stays
         down -- so fall back to the original card rather than
         leaving her on a dead button. If it is merely still
         loading, leave a note it will pick up when it arrives.
      */

      if (window.bdayStoryOpen) {
        return;
      }


      if (window.bdayHasStory) {

        window.bdayStoryPending = true;

        return;
      }


      finalMessage.classList.add(
        'show'
      );


      finalMessage.setAttribute(
        'aria-hidden',
        'false'
      );
    }, 1000);
  }
);


/* ============================================================
   FINAL MESSAGE
   ============================================================ */

finalMessage.addEventListener(
  'click',
  () => {
    finalMessage.classList.remove(
      'show'
    );


    finalMessage.setAttribute(
      'aria-hidden',
      'true'
    );
  }
);


/* ============================================================
   TREE ANIMATION STATE
   ============================================================ */

let treeStartT = 0;
let treeLastT = 0;
let treeRAF = 0;
let lastPetal = 0;
let replayArmed = false;


window.bdayDone = false;


/* ============================================================
   TREE FRAME
   ============================================================ */

function treeFrame(now) {

  if (!treeStartT) {
    treeStartT = now;
    treeLastT = now;
  }


  const t =
    (now -
      treeStartT) /
    1000;


  const dt =
    Math.min(
      0.05,
      (now -
        treeLastT) /
        1000
    );


  treeLastT =
    now;


  const rays =
    clamp01(
      (t -
        T.bloomT0) /
        T.bloomSpan
    );


  drawBackground();

  drawGodRays(
    t,
    rays
  );

  drawGlow(t);

  drawBokeh(
    t,
    dt
  );

  drawFloaters(
    t,
    dt,
    false
  );

  drawBranches(t);

  drawHearts(t);

  updateTwinkles(
    t,
    dt
  );


  if (
    t >
      T.petalT0 &&
    now -
      lastPetal >
      150
  ) {
    spawnPetal();
    spawnPetal();

    lastPetal =
      now;
  }


  drawPetals(
    t,
    dt
  );

  drawRested();


  drawFloaters(
    t,
    dt,
    true
  );


  /* Original cinematic wish */

  showWish(
    t >= T.noteStart
  );


  /*
     When the heart-tree finishes,
     reveal Pavi's personal section.
  */

  if (
    !window.bdayDone &&
    t >= T.done
  ) {
    window.bdayDone =
      true;


    revealMemory(
      900
    );
  }


  /*
     Give the user a little more
     time to see the tree before
     showing the replay button.
  */

  if (
    !replayArmed &&
    t >=
      T.done + 3.2
  ) {
    replayArmed =
      true;

    armReplay();
  }


  treeRAF =
    requestAnimationFrame(
      treeFrame
    );
}


/* ============================================================
   START TREE
   ============================================================ */

function treeStart() {
  treeStartT = 0;
  treeLastT = 0;
  lastPetal = 0;
  replayArmed = false;

  window.bdayDone =
    false;


  cue('grow');


  buildScene();


  if (!treeRAF) {
    treeRAF =
      requestAnimationFrame(
        treeFrame
      );
  }
}


/* ============================================================
   STOP TREE
   ============================================================ */

function treeStop() {
  if (treeRAF) {
    cancelAnimationFrame(
      treeRAF
    );

    treeRAF = 0;
  }


  ctx.clearRect(
    0,
    0,
    W,
    H
  );
}


/* ============================================================
   REDUCED MOTION FINAL TREE
   ============================================================ */

function drawFinal() {
  buildScene();


  drawBackground();

  drawGodRays(
    0,
    1
  );

  drawGlow(
    T.done
  );

  drawBokeh(
    0,
    0
  );

  drawFloaters(
    99,
    0,
    false
  );


  drawBranches(
    99
  );

  drawHearts(
    99
  );


  for (
    let i = 0;
    i < 40;
    i++
  ) {
    const h =
      hearts[
        (Math.random() *
          hearts.length) |
          0
      ];


    if (h) {
      rested.push({
        x:
          clamp(
            h.x +
              rand(
                -W * 0.3,
                W * 0.3
              ),

            6,
            W - 6
          ),

        y:
          groundY +
          rand(
            -6,
            H * 0.05
          ),

        box:
          h.box *
          0.5,

        idx:
          h.idx,

        rot:
          rand(
            0,
            6.28
          ),

        a: 0.85,
      });
    }
  }


  drawRested();


  drawFloaters(
    99,
    0,
    true
  );


  showWish(
    true
  );


  window.bdayDone =
    true;


  revealMemory(
    900
  );
}


/* ============================================================
   ACTS 1–3 — GSAP
   ============================================================ */


/*
   The two headline words become per-glyph spans
   so each hinges up on its own.
*/

function splitWord(el) {
  const chars =
    [...el.textContent];


  el.textContent = '';


  return chars.map(
    (c) => {
      const s =
        document.createElement(
          'span'
        );


      s.className =
        'hl__ch';


      s.textContent =
        c === ' '
          ? ' '
          : c;


      el.appendChild(
        s
      );


      return s;
    }
  );
}


const line1Chars =
  splitWord(
    $('wLine1')
  );


const line2Chars =
  splitWord(
    $('wLine2')
  );


const kChars = [
  ...line1Chars,
  ...line2Chars,
];


/* ============================================================
   DRIFTING LIGHT MOTES
   ============================================================ */

function buildMotes() {
  motes.innerHTML = '';


  for (
    let i = 0;
    i < 12;
    i++
  ) {
    const m =
      document.createElement(
        'span'
      );


    m.className =
      'mote';


    const s =
      rand(
        4,
        12
      );


    m.style.width =
      `${s}px`;

    m.style.height =
      `${s}px`;


    m.style.left =
      `${rand(4, 96)}%`;


    m.style.top =
      `${rand(10, 96)}%`;


    motes.appendChild(
      m
    );


    gsap.set(
      m,
      {
        opacity:
          rand(
            0.25,
            0.7
          ),
      }
    );


    gsap.to(
      m,
      {
        y:
          -rand(
            40,
            140
          ),

        x:
          rand(
            -30,
            30
          ),

        duration:
          rand(
            7,
            14
          ),

        repeat: -1,

        yoyo: true,

        ease:
          'sine.inOut',

        delay:
          -rand(
            0,
            8
          ),
      }
    );


    gsap.to(
      m,
      {
        opacity:
          rand(
            0.1,
            0.5
          ),

        duration:
          rand(
            2.5,
            5
          ),

        repeat: -1,

        yoyo: true,

        ease:
          'sine.inOut',
      }
    );
  }
}


/* ============================================================
   BOW GEOMETRY
   ============================================================ */

/*
   The rig lives lower-left and is rotated so its local
   "up" axis points at the heart.

   The draw + arrow math all live in the rig's LOCAL space.
*/

const tip = $('tip');


let svgScale = 1;
let arrowBaseX = 0;
let arrowBaseY = 0;

let maxDraw = 120;
let curDraw = 0;


let pullUX = 0;
let pullUY = 1;


const REST_NOCK = 96;

const nockProxy = {
  val: REST_NOCK,
};


/* ============================================================
   APPLY NOCK
   ============================================================ */

function applyNock() {
  const y =
    nockProxy.val;


  strL.setAttribute(
    'y2',
    y
  );

  strR.setAttribute(
    'y2',
    y
  );

  serving.setAttribute(
    'cy',
    y
  );
}


/* ============================================================
   REFRESH BOW RIG
   ============================================================ */

function refreshRig() {

  const gripX =
    W * 0.24;

  const gripY =
    H * 0.76;


  const heartX =
    W * 0.5;

  const heartY =
    H * 0.33;


  /*
     rotation so local "up" maps
     to grip → heart direction
  */

  const aimRad =
    Math.atan2(
      heartX - gripX,
      gripY - heartY
    );


  pullUX =
    -Math.sin(
      aimRad
    );

  pullUY =
    Math.cos(
      aimRad
    );


  /*
     Neutralize rig transform
     before measuring.
  */

  nockProxy.val =
    REST_NOCK;

  applyNock();


  gsap.set(
    archery,
    {
      rotation: 0,
      scale: 1,
      x: 0,
      y: 0,
    }
  );


  archery.style.left =
    '0px';

  archery.style.top =
    '0px';


  gsap.set(
    arrow,
    {
      x: 0,
      y: 0,
    }
  );


  const aR =
    archery.getBoundingClientRect();

  const bR =
    bow.getBoundingClientRect();

  const sR =
    serving.getBoundingClientRect();

  const rR =
    arrow.getBoundingClientRect();


  svgScale =
    bR.width / 460;


  const gripLX =
    (
      bR.left -
      aR.left
    ) +
    0.5 *
      bR.width;


  const gripLY =
    (
      bR.top -
      aR.top
    ) +
    (
      240 /
      300
    ) *
      bR.height;


  const nockLX =
    (
      sR.left -
      aR.left
    ) +
    0.5 *
      sR.width;


  const nockLY =
    (
      sR.top -
      aR.top
    ) +
    0.5 *
      sR.height;


  arrowBaseX =
    nockLX -
    (
      (
        rR.left -
        aR.left
      ) +
      0.5 *
        rR.width
    );


  arrowBaseY =
    nockLY -
    (
      (
        rR.top -
        aR.top
      ) +
      (
        205 /
        220
      ) *
        rR.height
    );


  /*
     Anchor grip and rotate.
  */

  archery.style.left =
    (
      gripX -
      gripLX
    ) +
    'px';


  archery.style.top =
    (
      gripY -
      gripLY
    ) +
    'px';


  gsap.set(
    archery,
    {
      transformOrigin:
        `${gripLX}px ${gripLY}px`,

      rotation:
        aimRad *
        180 /
        Math.PI,
    }
  );


  gsap.set(
    arrow,
    {
      x:
        arrowBaseX,

      y:
        arrowBaseY,
    }
  );


  maxDraw =
    Math.min(
      bR.height * 0.72,
      H * 0.16,
      132
    );


  curDraw = 0;
}


/* ============================================================
   DRAW BOW
   ============================================================ */

function setDraw(d) {
  curDraw =
    clamp(
      d,
      0,
      maxDraw
    );


  gsap.set(
    arrow,
    {
      x:
        arrowBaseX,

      y:
        arrowBaseY +
        curDraw,
    }
  );


  nockProxy.val =
    REST_NOCK +
    curDraw /
      svgScale;


  applyNock();


  gsap.set(
    aim,
    {
      opacity:
        0.55 *
        (
          curDraw /
          maxDraw
        ),
    }
  );
}


/* ============================================================
   HEART BEAT
   ============================================================ */

let beatTL = null;


function startBeat() {

  gsap.set(
    targetHeart,
    {
      scale: 1,
    }
  );


  gsap.set(
    heartGlow,
    {
      scale: 1,
      opacity: 0.7,
    }
  );


  beatTL =
    gsap.timeline({
      repeat: -1,
      repeatDelay: 0.5,
    });


  beatTL

    .to(
      targetHeart,
      {
        scale: 1.07,
        duration: 0.13,
        ease:
          'power2.out',
      },
      0
    )

    .to(
      heartGlow,
      {
        scale: 1.15,
        opacity: 0.9,
        duration: 0.13,
        ease:
          'power2.out',
      },
      0
    )

    .to(
      targetHeart,
      {
        scale: 1.0,
        duration: 0.2,
        ease:
          'power2.in',
      },
      0.13
    )

    .to(
      targetHeart,
      {
        scale: 1.05,
        duration: 0.12,
        ease:
          'power2.out',
      },
      0.3
    )

    .to(
      targetHeart,
      {
        scale: 1.0,
        duration: 0.5,
        ease:
          'power2.inOut',
      },
      0.42
    )

    .to(
      heartGlow,
      {
        scale: 1.0,
        opacity: 0.7,
        duration: 0.7,
        ease:
          'power2.inOut',
      },
      0.3
    );
}


function stopBeat() {
  if (beatTL) {
    beatTL.kill();

    beatTL = null;
  }


  gsap.set(
    targetHeart,
    {
      scale: 1,
    }
  );
}


/* ============================================================
   ARROW IMPACT PARTICLES
   ============================================================ */

function miniHeartSVG(fill) {
  return `
    <svg
      viewBox="0 0 24 22"
      width="100%"
      height="100%"
    >
      <path
        d="M12 20C5.5 15 1.5 11.4 1.5 6.9 1.5 3.6 4 1.5 7 1.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.5 2.1 5.5 5.4C23.5 11.4 19.5 15 12 20Z"
        fill="${fill}"
      />
    </svg>
  `;
}


function burstHearts() {

  const r =
    target.getBoundingClientRect();

  const hr =
    hero.getBoundingClientRect();


  const ox =
    r.left -
    hr.left +
    r.width / 2;


  const oy =
    r.top -
    hr.top +
    r.height *
      0.42;


  const cols = [
    '#ff6f97',
    '#ffb14e',
    '#ff8fae',
    '#ffd36a',
    '#e23b67',
  ];


  const frag =
    document.createDocumentFragment();


  const nodes = [];


  for (
    let i = 0;
    i < 12;
    i++
  ) {
    const heart =
      i < 8;


    const el =
      document.createElement(
        'span'
      );


    el.className =
      'burst';


    const s =
      heart
        ? rand(
            12,
            22
          )
        : rand(
            4,
            8
          );


    el.style.cssText =
      `
        position:absolute;
        left:${ox}px;
        top:${oy}px;
        width:${s}px;
        height:${s}px;
        margin:${-s / 2}px 0 0 ${-s / 2}px;
        pointer-events:none;
        z-index:4;
      `;


    if (heart) {
      el.innerHTML =
        miniHeartSVG(
          pick(cols)
        );
    } else {
      el.style.borderRadius =
        '50%';

      el.style.background =
        'radial-gradient(circle,#fff,rgba(255,210,150,0) 70%)';
    }


    frag.appendChild(
      el
    );


    nodes.push({
      el,
      heart,
    });
  }


  hero.appendChild(
    frag
  );


  nodes.forEach(
    ({
      el,
      heart,
    }) => {
      const ang =
        rand(
          -Math.PI,
          0
        );


      const dist =
        rand(
          heart
            ? 70
            : 40,

          heart
            ? 190
            : 120
        );


      gsap.to(
        el,
        {
          x:
            Math.cos(
              ang
            ) *
            dist,

          y:
            Math.sin(
              ang
            ) *
              dist -
            rand(
              10,
              50
            ),

          rotation:
            rand(
              -120,
              120
            ),

          scale:
            heart
              ? rand(
                  0.7,
                  1.2
                )
              : rand(
                  0.4,
                  1
                ),

          duration:
            rand(
              0.7,
              1.15
            ),

          ease:
            'power2.out',
        }
      );


      gsap.to(
        el,
        {
          opacity: 0,

          duration: 0.5,

          delay:
            rand(
              0.35,
              0.6
            ),

          ease:
            'power1.in',

          onComplete:
            () =>
              el.remove(),
        }
      );
    }
  );
}


/* ============================================================
   SHOT GEOMETRY
   ============================================================ */

function shotGeom() {

  const tipR =
    tip.getBoundingClientRect();

  const tRect =
    target.getBoundingClientRect();


  const tipX =
    tipR.left +
    tipR.width / 2;

  const tipY =
    tipR.top +
    tipR.height / 2;


  const tcx =
    tRect.left +
    tRect.width / 2;

  const tcy =
    tRect.top +
    tRect.height / 2;


  const flightDist =
    Math.hypot(
      tcx - tipX,
      tcy - tipY
    );


  const fallPx =
    Math.min(
      H * 0.26,

      H -
        tcy -
        tRect.height *
          0.4
    );


  const impactX =
    tcx;

  const impactY =
    tcy +
    fallPx;


  const distC =
    Math.hypot(
      Math.max(
        impactX,
        W - impactX
      ),

      Math.max(
        impactY,
        H - impactY
      )
    );


  const reach =
    Math.hypot(
      W / 2,
      H / 2
    );


  return {
    arrowStartY:
      arrowBaseY +
      curDraw,

    arrowFlyY:
      arrowBaseY +
      curDraw -
      flightDist,

    drawnNock:
      REST_NOCK +
      curDraw /
        svgScale,

    fallPx,

    fx:
      impactX -
      W / 2,

    fy:
      impactY -
      H / 2,

    floodScale:
      (
        distC *
        1.12
      ) /
      70,

    bloomScale:
      (
        reach *
        1.2
      ) /
      30,
  };
}


/* ============================================================
   MASTER FILM TIMELINE
   ============================================================ */

let filmTL = null;


function buildFilm(m) {

  const t =
    gsap.timeline({
      paused: true,

      onComplete: () => {

        gsap.set(
          field,
          {
            autoAlpha: 0,
          }
        );


        treeStart();


        /*
           Fade the white bloom promptly
           so the tree appears naturally.
        */

        gsap.to(
          bloom,
          {
            autoAlpha: 0,

            duration:
              1.15,

            ease:
              'power2.out',
          }
        );
      },
    });


  /* ==========================================================
     RESET — t=0
     ========================================================== */

  t

    .set(
      target,
      {
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
      }
    )

    .set(
      arrow,
      {
        opacity: 1,
        x: arrowBaseX,
        y: m.arrowStartY,
        scaleY: 1,
      }
    )

    .set(
      [flood, bloom],
      {
        autoAlpha: 0,
        scale: 0.001,
        x: 0,
        y: 0,
      }
    )

    .set(
      flood,
      {
        x: m.fx,
        y: m.fy,
      }
    )

    .set(
      field,
      {
        autoAlpha: 0,
      }
    )

    .set(
      '.blob',
      {
        opacity: 0,
      }
    )

    .set(
      camera,
      {
        scale: 1,
        yPercent: 0,
      }
    )

    .set(
      fgrid,
      {
        xPercent: 0,
        yPercent: 0,
      }
    )

    .set(
      barTop,
      {
        yPercent: -100,
      }
    )

    .set(
      barBot,
      {
        yPercent: 100,
      }
    )

    .set(
      kEyebrow,
      {
        opacity: 0,
        y: 12,
      }
    )

    .set(
      kSub,
      {
        opacity: 0,
        y: 12,
      }
    )

    .set(
      kChars,
      {
        transformPerspective: 620,
        transformOrigin:
          '50% 100%',
        yPercent: 135,
        rotationX: -82,
      }
    )

    .set(
      uline,
      {
        drawn: 0,
      }
    );


  /* ==========================================================
     ARROW SHOT
     ========================================================== */

  t

    .fromTo(
      nockProxy,

      {
        val:
          m.drawnNock,
      },

      {
        val:
          REST_NOCK,

        duration:
          0.5,

        ease:
          'elastic.out(1,0.34)',

        onUpdate:
          applyNock,
      },

      0
    )

    .to(
      arrow,
      {
        y:
          m.arrowFlyY,

        duration:
          0.26,

        ease:
          'power2.in',
      },

      0
    )

    .to(
      arrow,
      {
        scaleY: 1.16,

        duration:
          0.14,

        ease:
          'power2.in',
      },

      0
    )

    .to(
      arrow,
      {
        scaleY: 1.0,

        duration:
          0.1,

        ease:
          'power1.out',
      },

      0.16
    )

    .to(
      aim,
      {
        opacity: 0,

        duration:
          0.18,
      },

      0
    )

    .to(
      [eyebrow, hint],
      {
        opacity: 0,

        duration:
          0.2,

        ease:
          'power1.out',
      },

      0
    );


  /* ==========================================================
     HEART STRIKE
     ========================================================== */

  t

    .add(
      burstHearts,
      0.26
    )

    .to(
      target,
      {
        x: 7,
        y: -9,

        duration:
          0.06,

        ease:
          'power2.out',
      },

      0.26
    )

    .to(
      target,
      {
        x: 0,
        y: 0,

        duration:
          0.32,

        ease:
          'power2.out',
      },

      0.32
    )

    .to(
      target,
      {
        scale: 1.14,

        duration:
          0.06,

        ease:
          'power2.out',
      },

      0.26
    )

    .to(
      target,
      {
        scale: 1.0,

        duration:
          0.26,

        ease:
          'power2.inOut',
      },

      0.32
    )

    .to(
      arrow,
      {
        rotation: '+=4',

        duration:
          0.05,

        yoyo: true,

        repeat: 4,

        ease:
          'sine.inOut',
      },

      0.27
    )

    .set(
      arrow,
      {
        rotation: 0,
      },

      0.52
    )

    .to(
      arrow,
      {
        opacity: 0,

        duration:
          0.16,

        ease:
          'power1.out',
      },

      0.56
    );


  /* ==========================================================
     FALL + ROSE FLOOD
     ========================================================== */

  t

    .to(
      target,
      {
        y:
          m.fallPx,

        scaleX: 0.84,
        scaleY: 1.3,

        duration:
          0.34,

        ease:
          'power1.in',
      },

      0.64
    )

    .to(
      target,
      {
        scaleX: 1.4,
        scaleY: 0.6,

        duration:
          0.07,

        ease:
          'power2.out',
      },

      0.98
    )

    .set(
      flood,
      {
        autoAlpha: 1,
      },

      1.00
    )

    .fromTo(
      flood,

      {
        scale:
          0.02,
      },

      {
        scale:
          m.floodScale,

        duration:
          0.34,

        ease:
          'power2.in',
      },

      1.00
    )

    .to(
      target,
      {
        opacity: 0,

        duration:
          0.12,

        ease:
          'power1.out',
      },

      1.06
    );


  /* ==========================================================
     ROSE FIELD
     ========================================================== */

  t

    .set(
      field,
      {
        autoAlpha: 1,
      },

      1.32
    )

    .set(
      hero,
      {
        autoAlpha: 0,
      },

      1.33
    )

    .to(
      '.blob',
      {
        opacity: 1,

        duration:
          0.6,

        ease:
          'power2.out',
      },

      1.34
    )

    .set(
      flood,
      {
        autoAlpha: 0,
      },

      1.36
    );


  /* ==========================================================
     CAMERA PUSH
     ========================================================== */

  t

    .fromTo(
      camera,

      {
        scale: 1.0,
        yPercent: 0,
      },

      {
        scale: 1.07,
        yPercent: -1.3,

        duration:
          2.6,

        ease:
          'none',
      },

      1.38
    )

    .fromTo(
      fgrid,

      {
        xPercent: 0,
        yPercent: 0,
      },

      {
        xPercent: -1.5,
        yPercent: -1.0,

        duration:
          2.6,

        ease:
          'none',
      },

      1.38
    );


  /* ==========================================================
     RECORDING CUES
     ========================================================== */

  t

    .call(
      cue,
      ['hit'],
      0.26
    )

    .call(
      cue,
      ['flood'],
      1.00
    )

    .call(
      cue,
      ['wish'],
      1.68
    )

    .call(
      cue,
      ['wish2'],
      2.06
    )

    .call(
      cue,
      ['bloom'],
      3.42
    );


  /* ==========================================================
     CINEMA BARS
     ========================================================== */

  t

    .to(
      barTop,
      {
        yPercent: 0,

        duration:
          0.6,

        ease:
          'power2.out',
      },

      1.5
    )

    .to(
      barBot,
      {
        yPercent: 0,

        duration:
          0.6,

        ease:
          'power2.out',
      },

      1.5
    );


  /* ==========================================================
     KINETIC WISH
     ========================================================== */

  t

    .to(
      kEyebrow,
      {
        opacity: 1,
        y: 0,

        duration:
          0.45,

        ease:
          'power3.out',
      },

      1.54
    )

    .to(
      line1Chars,
      {
        yPercent: 0,
        rotationX: 0,

        duration:
          0.55,

        ease:
          'power3.out',

        stagger:
          0.033,
      },

      1.68
    )

    .to(
      line2Chars,
      {
        yPercent: 0,
        rotationX: 0,

        duration:
          0.55,

        ease:
          'power3.out',

        stagger:
          0.033,
      },

      2.06
    )

    .to(
      uline,
      {
        drawn: 1,

        duration:
          0.45,

        ease:
          'power2.inOut',
      },

      2.54
    )

    .to(
      kSub,
      {
        opacity: 1,
        y: 0,

        duration:
          0.45,

        ease:
          'power3.out',
      },

      2.74
    );


  /* ==========================================================
     HANDOFF BLOOM
     ========================================================== */

  t

    .to(
      barTop,
      {
        yPercent: -100,

        duration:
          0.5,

        ease:
          'power2.in',
      },

      3.32
    )

    .to(
      barBot,
      {
        yPercent: 100,

        duration:
          0.5,

        ease:
          'power2.in',
      },

      3.32
    )

    .set(
      bloom,
      {
        autoAlpha: 1,
      },

      3.42
    )

    .fromTo(
      bloom,

      {
        scale:
          0.02,
      },

      {
        scale:
          m.bloomScale,

        duration:
          0.58,

        ease:
          'power2.in',
      },

      3.42
    );


  return t;
}


/* ============================================================
   DRAW / RELEASE INTERACTION
   ============================================================ */

let played = false;

let drawing = false;

let startPX = 0;
let startPY = 0;
let startDraw = 0;


/* ============================================================
   FIRE ARROW
   ============================================================ */

function fire() {
  if (played) {
    return;
  }


  played = true;

  drawing = false;


  stopBeat();


  cue('release');
  cue('whoosh');


  filmTL =
    buildFilm(
      shotGeom()
    );


  filmTL.play(0);
}


/* ============================================================
   SPRING BOW BACK
   ============================================================ */

function springBack() {
  const from =
    curDraw;


  gsap.to(
    {
      d: from,
    },

    {
      d: 0,

      duration:
        0.55,

      ease:
        'elastic.out(1,0.4)',

      onUpdate() {
        setDraw(
          this.targets()[0].d
        );
      },
    }
  );
}


/* ============================================================
   AUTOMATIC FIRE
   ============================================================ */

function autoFire() {
  if (played) {
    return;
  }


  recT0 =
    performance.now();


  cue('draw');


  gsap.to(
    {
      d: curDraw,
    },

    {
      d:
        maxDraw *
        0.94,

      duration:
        0.62,

      ease:
        'power2.inOut',

      onUpdate() {
        setDraw(
          this.targets()[0].d
        );
      },

      onComplete:
        () =>
          gsap.delayedCall(
            0.16,
            fire
          ),
    }
  );
}


/* ============================================================
   POINTER DOWN
   ============================================================ */

archery.addEventListener(
  'pointerdown',
  (e) => {
    if (played) {
      return;
    }


    /*
       Browsers only allow audio to start inside a real
       user gesture. This is the earliest one we get.
    */

    Sound.resume();


    drawing = true;


    try {
      archery.setPointerCapture(
        e.pointerId
      );
    } catch (_) {}


    startPX =
      e.clientX;

    startPY =
      e.clientY;

    startDraw =
      curDraw;


    e.preventDefault();
  }
);


/* ============================================================
   POINTER MOVE
   ============================================================ */

archery.addEventListener(
  'pointermove',
  (e) => {
    if (!drawing) {
      return;
    }


    /*
       Project drag onto pull-back axis.
    */

    const proj =
      (
        e.clientX -
        startPX
      ) *
        pullUX +

      (
        e.clientY -
        startPY
      ) *
        pullUY;


    setDraw(
      startDraw +
      proj
    );
  }
);


/* ============================================================
   END DRAW
   ============================================================ */

function endDraw() {
  if (!drawing) {
    return;
  }


  drawing = false;


  if (
    curDraw >
    maxDraw *
      0.26
  ) {
    fire();
  } else {
    springBack();
  }
}


archery.addEventListener(
  'pointerup',
  endDraw
);


archery.addEventListener(
  'pointercancel',
  endDraw
);


/* ============================================================
   KEYBOARD
   ============================================================ */

archery.addEventListener(
  'keydown',
  (e) => {
    if (played) {
      return;
    }


    if (
      e.key === 'Enter' ||
      e.key === ' '
    ) {
      e.preventDefault();

      autoFire();
    }
  }
);


/* ============================================================
   BOOT ACT 1
   ============================================================ */

function enter() {

  gsap.set(
    hero,
    {
      autoAlpha: 1,
    }
  );


  refreshRig();


  setDraw(0);


  gsap.set(
    [eyebrow, hint],
    {
      opacity: 0,
      y: 14,
    }
  );


  gsap.set(
    target,
    {
      opacity: 0,

      y: 10,

      scaleX: 0.9,

      scaleY: 0.9,
    }
  );


  gsap.set(
    archery,
    {
      opacity: 0,

      scale: 0.85,
    }
  );


  gsap.set(
    heartGlow,
    {
      opacity: 0,

      scale: 1,
    }
  );


  gsap.set(
    arrow,
    {
      opacity: 1,
    }
  );


  const tl =
    gsap.timeline({
      onComplete:
        startBeat,
    });


  tl

    .to(
      target,
      {
        opacity: 1,

        y: 0,

        scaleX: 1,

        scaleY: 1,

        duration:
          0.8,

        ease:
          'power3.out',
      },

      0.1
    )

    .to(
      heartGlow,
      {
        opacity: 0.7,

        duration:
          0.8,

        ease:
          'power2.out',
      },

      0.2
    )

    .to(
      archery,
      {
        opacity: 1,

        scale: 1,

        duration:
          0.8,

        ease:
          'power3.out',
      },

      0.28
    )

    .to(
      eyebrow,
      {
        opacity: 1,

        y: 0,

        duration:
          0.7,

        ease:
          'power3.out',
      },

      0.4
    )

    .to(
      hint,
      {
        opacity: 1,

        y: 0,

        duration:
          0.7,

        ease:
          'power3.out',
      },

      0.7
    );
}


/* ============================================================
   REPLAY
   ============================================================ */

function armReplay() {
  replay.hidden =
    false;


  requestAnimationFrame(
    () =>
      replay.classList.add(
        'is-shown'
      )
  );
}


/* ============================================================
   RESET EVERYTHING
   ============================================================ */

function resetAll() {

  /*
     Stop canvas tree.
  */

  treeStop();


  /*
     Fade the ambient drone so it
     never stacks on replay.
  */

  Sound.stopPad();


  /*
     Close and rearm the memory chapters.
  */

  window.dispatchEvent(
    new CustomEvent(
      'bday:reset'
    )
  );


  /*
     Hide personal photo.
  */

  hideMemory();


  /*
     Remove final particles.
  */

  removeBirthdayParticles();


  /*
     Hide final message.
  */

  finalMessage.classList.remove(
    'show'
  );


  finalMessage.setAttribute(
    'aria-hidden',
    'true'
  );


  /*
     Reset wish button.
  */

  makeWish.disabled =
    false;


  const wishLabel =
    makeWish.querySelector(
      '.memory__buttonLabel'
    );


  if (wishLabel) {
    wishLabel.textContent =
      'Open your gift ✨';
  } else {
    makeWish.textContent =
      'Open your gift ✨';
  }


  /*
     Reset original wish.
  */

  showWish(false);


  window.bdayDone =
    false;


  replayArmed =
    false;


  replay.classList.remove(
    'is-shown'
  );


  replay.hidden =
    true;


  /*
     Reset master timeline.
  */

  if (filmTL) {
    filmTL.pause(0);
  }


  gsap.set(
    [flood, bloom],
    {
      autoAlpha: 0,
    }
  );


  gsap.set(
    field,
    {
      autoAlpha: 0,
    }
  );


  gsap.set(
    arrow,
    {
      opacity: 1,

      scaleY: 1,
    }
  );


  played =
    false;


  /*
     Start again.
  */

  enter();
}


/* ============================================================
   SIZING
   ============================================================ */

function resize() {

  /*
     Cap the backing store. Phones commonly report 3, which is
     four times the fragment work of 1x across a full-screen
     canvas of blurred sprites and god rays -- for no visible
     gain at that pixel density.
  */

  dpr =
    Math.min(
      window.devicePixelRatio ||
        1,

      window.innerWidth < 520
        ? 1.75
        : 2
    );


  W =
    canvas.clientWidth;


  H =
    canvas.clientHeight;


  canvas.width =
    Math.round(
      W * dpr
    );


  canvas.height =
    Math.round(
      H * dpr
    );


  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );


  buildSprites();

  buildScene();


  if (reduceMotion) {

    drawFinal();

    return;
  }


  if (
    played &&
    filmTL
  ) {

    const at =
      filmTL.time();


    const active =
      filmTL.isActive();


    filmTL =
      buildFilm(
        shotGeom()
      );


    filmTL.pause(
      at
    );


    if (active) {
      filmTL.play(
        at
      );
    }

  } else {

    refreshRig();

    setDraw(0);
  }
}


/* ============================================================
   RESIZE LISTENER
   ============================================================ */

let resizeRAF = 0;

let lastVW =
  window.innerWidth;

let lastVH =
  window.innerHeight;


window.addEventListener(
  'resize',
  () => {

    const vw =
      window.innerWidth;

    const vh =
      window.innerHeight;


    /*
       On mobile, hiding or showing the URL bar fires resize with
       a height-only change. resize() rebuilds every sprite, the
       whole scene AND the film timeline -- far too expensive to
       run for a scrolling toolbar, and visible as a hitch. Only
       a width change or a large height change is a real one.
    */

    if (
      vw === lastVW &&
      Math.abs(vh - lastVH) < 120
    ) {
      lastVH = vh;

      return;
    }


    lastVW = vw;
    lastVH = vh;


    if (resizeRAF) {
      return;
    }


    resizeRAF =
      requestAnimationFrame(
        () => {

          resizeRAF = 0;

          resize();
        }
      );
  }
);


/* ============================================================
   TAB VISIBILITY
   ============================================================ */

/*
   Browsers throttle rAF when the tab is hidden, but GSAP keeps
   ticking on its own clock -- so the canvas and the timeline
   drift apart while she is in another app. Park everything, and
   shift the tree's start time forward by exactly the gap so it
   resumes where it left off rather than restarting its growth.
*/

let hiddenAt = 0;

let wasFilmActive = false;


document.addEventListener(
  'visibilitychange',
  () => {

    if (document.hidden) {

      hiddenAt =
        performance.now();


      if (
        filmTL &&
        filmTL.isActive()
      ) {
        wasFilmActive = true;

        filmTL.pause();
      }


      if (treeRAF) {
        cancelAnimationFrame(
          treeRAF
        );

        treeRAF = 0;
      }


      Sound.suspend();

      return;
    }


    const gap =
      performance.now() -
      hiddenAt;


    if (treeStartT) {
      treeStartT += gap;
      treeLastT  += gap;
    }


    if (
      wasFilmActive &&
      filmTL
    ) {
      wasFilmActive = false;

      filmTL.resume();
    }


    if (
      !treeRAF &&
      treeStartT
    ) {
      treeRAF =
        requestAnimationFrame(
          treeFrame
        );
    }


    Sound.wake();
  }
);


/* ============================================================
   INITIALIZE
   ============================================================ */

resize();


/* ============================================================
   BOOT
   ============================================================ */

if (reduceMotion) {

  drawFinal();

} else {

  buildMotes();


  document.fonts &&
    document.fonts.ready.then(
      () => {
        refreshRig();

        setDraw(0);
      }
    );


  enter();


  replay.addEventListener(
    'click',
    resetAll
  );
}


/* ============================================================
   RECORDING HOOK
   ============================================================ */

if (isRecord) {

  window.bdayAPI = {

    start() {
      autoFire();
    },

    replay() {
      resetAll();
    },

  };
}


/* ============================================================
   SOUND TOGGLE
   ============================================================ */

const soundBtn = $('soundBtn');


if (soundBtn) {

  soundBtn.setAttribute(
    'aria-pressed',

    Sound.isMuted()
      ? 'true'
      : 'false'
  );


  soundBtn.addEventListener(
    'click',
    () => {

      const next =
        !Sound.isMuted();


      Sound.setMuted(next);


      soundBtn.setAttribute(
        'aria-pressed',

        next
          ? 'true'
          : 'false'
      );


      /*
         Unmuting is itself a gesture, so it is
         a valid moment to wake the context.
      */

      if (!next) {
        Sound.resume();
      }
    }
  );
}


/* ============================================================
   STORY BRIDGE
   ============================================================ */

/*
   story.js is an optional companion module. These listeners are
   harmless if it never loads.
*/

window.addEventListener(
  'bday:duck',
  (e) => {

    Sound.duck(
      !!(
        e.detail &&
        e.detail.on
      )
    );
  }
);


window.addEventListener(
  'bday:storyend',
  () => {

    /*
       She closed the chapters. Offer the replay
       again so the film is never a dead end.
    */

    if (!replayArmed) {
      replayArmed = true;

      armReplay();
    }
  }
);