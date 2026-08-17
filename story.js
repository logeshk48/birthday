/* ============================================================
   THE STORY — ENGINE
   ============================================================

   Builds the three memory pages from story.data.js.

   You should not need to edit this file. To change the story,
   edit story.data.js instead.

   Loading is deliberately simple: this file announces itself
   the moment it runs, and birthday.js checks for that. There
   is no dynamic import and no promise to lose.
   ============================================================ */

import {
  PAGE_ONE,
  PAGE_TWO,
  PAGE_THREE,
  FINALE,
} from './story.data.js';


/* Announce immediately, before anything else can throw. */

window.bdayHasStory = true;


const reduceMotion =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;


const BASE =
  (import.meta.env &&
    import.meta.env.BASE_URL) ||
  '/';


function asset(path) {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return (
    BASE +
    String(path).replace(/^\/+/, '')
  );
}


function el(tag, cls, text) {
  const n = document.createElement(tag);

  if (cls) {
    n.className = cls;
  }

  if (text !== undefined) {
    n.textContent = text;
  }

  return n;
}


/* ============================================================
   TEXT BLOCKS
   ============================================================ */

function addBlocks(blocks, host) {

  (blocks || []).forEach((b) => {

    let n;

    if (b.note !== undefined) {

      n = el('div', 'st__note');

      n.appendChild(
        el('span', 'st__noteDot')
      );

      n.appendChild(
        el('span', 'st__noteText', b.note)
      );

    } else if (b.small !== undefined) {

      n = el('p', 'st__small', b.small);

    } else {

      n = el(
        'p',
        'st__p',
        b.p !== undefined ? b.p : String(b)
      );
    }

    n.classList.add('st__rise');

    host.appendChild(n);
  });
}


/* ============================================================
   MEDIA
   ============================================================ */

function placeholder(wrap) {
  wrap.classList.add('st__m--empty');

  wrap.innerHTML = '';

  wrap.appendChild(
    el('span', 'st__ph', '📷')
  );
}


function makeImage(src, alt, ratioClass) {

  const wrap = el(
    'div',
    'st__m ' + (ratioClass || '')
  );

  if (!src) {
    placeholder(wrap);
    return wrap;
  }

  const img = el('img', 'st__img');

  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  img.alt = alt || '';
  img.dataset.src = asset(src);

  img.addEventListener('error', () => {
    placeholder(wrap);
  });

  wrap.appendChild(img);

  return wrap;
}


function makeVideo(src, ratioClass) {

  const wrap = el(
    'div',
    'st__m st__m--video ' + (ratioClass || '')
  );

  if (!src) {
    placeholder(wrap);
    return wrap;
  }

  const v = document.createElement('video');

  v.className = 'st__video';

  /* muted + playsinline, or iOS refuses to
     play inline and yanks it fullscreen */

  v.muted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.loop = true;
  v.controls = false;
  v.preload = 'none';

  v.dataset.src = asset(src);

  v.addEventListener('error', () => {
    placeholder(wrap);
  });

  wrap.appendChild(v);


  const btn = el('button', 'st__vBtn');

  btn.type = 'button';

  btn.setAttribute(
    'aria-label',
    'Play with sound'
  );

  btn.appendChild(
    el('span', 'st__vIcon', '▶')
  );


  btn.addEventListener('click', () => {

    if (v.paused) {
      v.play().catch(() => {});
    }

    if (v.muted) {

      /* only one clip has sound at a time */

      root
        .querySelectorAll('video')
        .forEach((o) => {
          if (o !== v) {
            o.muted = true;
          }
        });

      root
        .querySelectorAll('.st__vBtn')
        .forEach((b) => {
          if (b !== btn) {
            b.classList.remove('is-playing');
          }
        });

      v.muted = false;

      btn.classList.add('is-playing');

      duck(true);

    } else {

      v.muted = true;

      btn.classList.remove('is-playing');

      duck(false);
    }
  });


  wrap.appendChild(btn);

  return wrap;
}


function duck(on) {
  window.dispatchEvent(
    new CustomEvent('bday:duck', {
      detail: { on: !!on },
    })
  );
}


/* ============================================================
   THE NEXT BUTTON
   ============================================================ */

/*
   Scrolling still works normally. This is for the people who
   would otherwise stop at the bottom of a page and assume that
   was the end of it.
*/

function addNext(host, label) {

  if (!label) {
    return;
  }

  const b = el('button', 'st__next st__rise', label);

  b.type = 'button';

  b.addEventListener('click', () => {

    const page = b.closest('.st__page');

    const nextPage =
      page && page.nextElementSibling;

    if (nextPage) {
      nextPage.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  });

  host.appendChild(b);
}


/* ============================================================
   A THREE PHOTO SPLIT
   ============================================================ */

function buildSplit(photos) {

  const split = el('div', 'st__split st__rise');

  (photos || [])
    .slice(0, 3)
    .forEach((p, i) => {

      const cell = makeImage(
        p.src,
        p.alt,
        'st__m--fill'
      );

      cell.classList.add(
        'st__splitCell',
        'st__splitCell--' + (i + 1)
      );

      split.appendChild(cell);
    });

  return split;
}


/* ============================================================
   PAGE 1 — two photos, two stories
   ============================================================ */

function buildPageOne(d) {

  const sec = el('section', 'st__page');

  const inner = el('div', 'st__inner');


  if (d.kicker) {
    inner.appendChild(
      el('p', 'st__kicker st__rise', d.kicker)
    );
  }

  if (d.title) {
    inner.appendChild(
      el('h2', 'st__title st__rise', d.title)
    );
  }


  (d.parts || []).forEach((part, i) => {

    const blk = el('div', 'st__part');

    if (i > 0) {
      blk.appendChild(
        el('span', 'st__divider st__rise')
      );
    }

    if (part.heading) {
      blk.appendChild(
        el('h3', 'st__sub st__rise', part.heading)
      );
    }

    const m = part.media || {};

    const media =
      m.type === 'video'
        ? makeVideo(m.src, 'st__m--tall')
        : makeImage(m.src, m.alt, 'st__m--portrait');

    media.classList.add('st__rise');

    blk.appendChild(media);

    addBlocks(part.blocks, blk);

    inner.appendChild(blk);
  });


  addNext(inner, d.next);


  sec.appendChild(inner);

  return sec;
}


/* ============================================================
   PAGE 2 — the videos
   ============================================================ */

function buildPageTwo(d) {

  const sec = el('section', 'st__page');

  const inner = el('div', 'st__inner');


  if (d.kicker) {
    inner.appendChild(
      el('p', 'st__kicker st__rise', d.kicker)
    );
  }

  if (d.title) {
    inner.appendChild(
      el('h2', 'st__title st__rise', d.title)
    );
  }

  addBlocks(d.intro, inner);


  const grid = el('div', 'st__grid');

  (d.clips || []).forEach((c) => {

    const cell = el('figure', 'st__cell st__rise');

    cell.appendChild(
      makeVideo(c.src, 'st__m--tall')
    );

    if (c.caption) {
      cell.appendChild(
        el('figcaption', 'st__cap', c.caption)
      );
    }

    grid.appendChild(cell);
  });

  inner.appendChild(grid);

  addBlocks(d.outro, inner);


  addNext(inner, d.next);


  sec.appendChild(inner);

  return sec;
}


/* ============================================================
   PAGE 3 — the three photos
   ============================================================ */

function buildPageThree(d) {

  const sec = el('section', 'st__page');

  const inner = el('div', 'st__inner');


  if (d.kicker) {
    inner.appendChild(
      el('p', 'st__kicker st__rise', d.kicker)
    );
  }

  if (d.title) {
    inner.appendChild(
      el('h2', 'st__title st__rise', d.title)
    );
  }


  if ((d.photos || []).length) {
    inner.appendChild(
      buildSplit(d.photos)
    );
  }


  addBlocks(d.blocks, inner);

  addNext(inner, d.next);


  sec.appendChild(inner);

  return sec;
}


/* ============================================================
   PAGE 4 — the wish
   ============================================================ */

function buildFinale(d) {

  const sec = el(
    'section',
    'st__page st__page--finale'
  );

  const inner = el('div', 'st__inner');


  if (d.eyebrow) {
    const e = el('p', 'st__fEyebrow st__rise');
    e.appendChild(el('span', '', d.eyebrow));
    inner.appendChild(e);
  }


  inner.appendChild(
    el(
      'h2',
      'st__fTitle st__rise',
      d.title || 'Happy Birthday'
    )
  );

  if (d.name) {
    inner.appendChild(
      el('p', 'st__fName st__rise', d.name)
    );
  }

  addBlocks(d.blocks, inner);

  if (d.signoff) {
    inner.appendChild(
      el('p', 'st__signoff st__rise', d.signoff)
    );
  }


  const close = el(
    'button',
    'st__close st__rise',
    d.close || 'Back to the tree'
  );

  close.type = 'button';

  close.addEventListener('click', hideStory);

  inner.appendChild(close);


  sec.appendChild(inner);

  return sec;
}


/* ============================================================
   MOUNT
   ============================================================ */

const root = el('div', 'story');

root.id = 'story';

root.setAttribute('aria-hidden', 'true');

root.inert = true;


const bar = el('div', 'story__bar');

const fill = el('div', 'story__fill');

bar.appendChild(fill);


const scroller = el('div', 'story__scroll');

scroller.appendChild(buildPageOne(PAGE_ONE));
scroller.appendChild(buildPageTwo(PAGE_TWO));
scroller.appendChild(buildPageThree(PAGE_THREE));
scroller.appendChild(buildFinale(FINALE));


const hint = el('div', 'story__hint');

hint.appendChild(el('span', '', 'scroll'));
hint.appendChild(el('i'));


root.appendChild(bar);
root.appendChild(scroller);
root.appendChild(hint);

document.body.appendChild(root);


/* ============================================================
   REVEAL ON SCROLL
   ============================================================ */

let riseIO = null;


function armRise() {

  if (reduceMotion) {
    root
      .querySelectorAll('.st__rise')
      .forEach((n) => n.classList.add('is-in'));

    return;
  }


  if (riseIO) {
    riseIO.disconnect();
  }


  riseIO = new IntersectionObserver(
    (entries) => {

      entries.forEach((en) => {

        if (!en.isIntersecting) {
          return;
        }

        const n = en.target;

        const page = n.closest('.st__page');

        let delay = 0;

        if (page) {
          const sibs = [
            ...page.querySelectorAll('.st__rise'),
          ];

          delay = Math.min(sibs.indexOf(n), 6) * 80;
        }

        setTimeout(
          () => n.classList.add('is-in'),
          delay
        );

        riseIO.unobserve(n);
      });
    },
    {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1,
    }
  );


  root
    .querySelectorAll('.st__rise')
    .forEach((n) => riseIO.observe(n));
}


armRise();


/* ============================================================
   LAZY MEDIA — nothing downloads until it is close
   ============================================================ */

const mediaIO = new IntersectionObserver(
  (entries) => {

    entries.forEach((en) => {

      if (!en.isIntersecting) {
        return;
      }

      const n = en.target;

      if (n.dataset.src && !n.src) {
        n.src = n.dataset.src;
      }

      if (n.tagName === 'VIDEO') {
        n.preload = 'metadata';
        n.load();
      }

      mediaIO.unobserve(n);
    });
  },
  {
    rootMargin: '500px 0px',
  }
);


root
  .querySelectorAll('img[data-src], video[data-src]')
  .forEach((n) => mediaIO.observe(n));


/* ============================================================
   PLAY ONLY WHAT IS ON SCREEN
   ============================================================ */

const playIO = new IntersectionObserver(
  (entries) => {

    entries.forEach((en) => {

      const v = en.target;

      if (en.isIntersecting) {

        if (v.src) {
          v.play().catch(() => {});
        }

        return;
      }

      v.pause();

      if (!v.muted) {

        v.muted = true;

        const b =
          v.parentElement &&
          v.parentElement.querySelector('.st__vBtn');

        if (b) {
          b.classList.remove('is-playing');
        }

        duck(false);
      }
    });
  },
  {
    threshold: 0.35,
  }
);


root
  .querySelectorAll('video')
  .forEach((v) => playIO.observe(v));


/* ============================================================
   PROGRESS BAR
   ============================================================ */

let barRAF = 0;


scroller.addEventListener(
  'scroll',
  () => {

    if (barRAF) {
      return;
    }

    barRAF = requestAnimationFrame(() => {

      barRAF = 0;

      const max =
        scroller.scrollHeight -
        scroller.clientHeight;

      const p =
        max > 0 ? scroller.scrollTop / max : 0;

      fill.style.transform = `scaleX(${p})`;

      root.classList.toggle(
        'is-scrolled',
        scroller.scrollTop > 40
      );
    });
  },
  { passive: true }
);


/* ============================================================
   SHOW / HIDE
   ============================================================ */

let shown = false;


function showStory() {

  if (shown) {
    return;
  }

  shown = true;

  window.bdayStoryOpen = true;

  scroller.scrollTop = 0;

  fill.style.transform = 'scaleX(0)';

  root.classList.remove('is-scrolled');

  root.setAttribute('aria-hidden', 'false');

  root.inert = false;

  root.classList.add('is-open');

  document.body.classList.add('story-open');
}


function hideStory() {

  if (!shown) {
    return;
  }

  shown = false;

  window.bdayStoryOpen = false;


  /*
     Move focus out BEFORE hiding. Setting aria-hidden on an
     ancestor of the focused element is invalid -- the browser
     refuses it and logs a warning -- because a screen reader
     user would be left focused on something that claims not to
     exist. `inert` then takes the whole subtree out of the tab
     order properly.
  */

  if (root.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  root.inert = true;

  root.classList.remove('is-open');

  root.setAttribute('aria-hidden', 'true');

  document.body.classList.remove('story-open');


  root
    .querySelectorAll('video')
    .forEach((v) => {
      v.pause();
      v.muted = true;
    });

  root
    .querySelectorAll('.st__vBtn')
    .forEach((b) => b.classList.remove('is-playing'));

  duck(false);

  window.dispatchEvent(
    new CustomEvent('bday:storyend')
  );
}


/* ============================================================
   HOOKS
   ============================================================ */

window.addEventListener('bday:story', showStory);


window.addEventListener('bday:reset', () => {

  hideStory();

  if (!reduceMotion) {
    root
      .querySelectorAll('.st__rise')
      .forEach((n) => n.classList.remove('is-in'));

    armRise();
  }
});


document.addEventListener('keydown', (e) => {

  if (shown && e.key === 'Escape') {
    hideStory();
  }
});


/* If the wish was tapped before this file finished loading,
   birthday.js leaves a flag. Honour it. */

if (window.bdayStoryPending) {
  window.bdayStoryPending = false;
  showStory();
}