/* Two behaviours that keep the page feeling alive:
   - the diagonal marquee carousel behind the Player Profile section
   - fade in / fade out reveals for each section block */
(function () {
  'use strict';

  var reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
   * Diagonal marquee carousel
   * ------------------------------------------------------------------ */

  var CARDS = [
    './assets/8.png',
    './assets/project_1.png',
    './assets/3.png',
    './assets/5.png',
    './assets/project_2.jpeg',
    './assets/7.png',
    './assets/4.png',
    './assets/6.png'
  ];

  // Alternating directions and slightly offset speeds, as in the reference.
  var ROWS = [
    { speed: 130, dir: -1, reversed: false },
    { speed: 112, dir: 1, reversed: true },
    { speed: 146, dir: -1, reversed: false },
    { speed: 122, dir: 1, reversed: true }
  ];

  var STAGE_VW = 2.4; // matches .marquee__stage { width: 240vw }
  var MAX_PASSES = 3;

  var stage = document.querySelector('[data-marquee]');

  function buildCard(src) {
    var figure = document.createElement('figure');
    figure.className = 'marquee__card';
    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    figure.appendChild(img);
    return figure;
  }

  function build() {
    if (!stage) return;
    stage.textContent = '';
    var minWidth = window.innerWidth * STAGE_VW;

    ROWS.forEach(function (row) {
      var srcs = row.reversed ? CARDS.slice().reverse() : CARDS.slice();

      var rowEl = document.createElement('div');
      rowEl.className = 'marquee__row';
      rowEl.dataset.dir = String(row.dir);

      var track = document.createElement('div');
      track.className = 'marquee__track';
      track.style.setProperty('--speed', row.speed + 's');
      if (reduce) track.style.animation = 'none';

      var set = document.createElement('div');
      set.className = 'marquee__set';
      track.appendChild(set);
      rowEl.appendChild(track);
      stage.appendChild(rowEl);

      // The set has to be in the document before it can be measured, otherwise
      // offsetWidth is 0 and the carousel would leave visible gaps on wide screens.
      var passes = 0;
      do {
        srcs.forEach(function (src) {
          set.appendChild(buildCard(src));
        });
        passes += 1;
      } while (set.offsetWidth < minWidth && passes < MAX_PASSES);

      // Second identical half: translating the track by 50% then moves it by
      // exactly one set width, so the loop is seamless.
      track.appendChild(set.cloneNode(true));
    });
  }

  build();

  var rebuildTimer = null;
  var lastWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - lastWidth) < 160) return;
    lastWidth = window.innerWidth;
    window.clearTimeout(rebuildTimer);
    rebuildTimer = window.setTimeout(build, 250);
  });

  /* ------------------------------------------------------------------ *
   * Section reveals
   * ------------------------------------------------------------------ */

  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  // Pause the carousel and the floating tiles once the section leaves the
  // viewport, so they cost nothing while other sections are being read.
  var about = document.getElementById('about');
  if (about && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          about.classList.toggle('is-offscreen', !entry.isIntersecting);
        });
      },
      { rootMargin: '120px 0px 120px 0px', threshold: 0 }
    ).observe(about);
  }

  function show(el) {
    el.classList.add('is-visible');
  }

  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(show);
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) show(entry.target);
        else entry.target.classList.remove('is-visible');
      });
    },
    // The bottom margin is POSITIVE on purpose. It extends the detection area
    // below the fold, which does two things: blocks start fading in just before
    // they scroll into view, and - crucially - an element sitting in the last
    // few pixels of the document still counts as visible. A negative margin
    // here left the footer permanently hidden at the bottom of the page.
    { rootMargin: '0px 0px 12% 0px', threshold: 0 }
  );

  reveals.forEach(function (el) {
    observer.observe(el);
  });
})();
