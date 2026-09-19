/* Frosted Glass Gooey Gravity Nav
   The active indicator is a liquid blob driven by spring physics. Lagging
   "trail" shapes merge with it through the SVG goo filter, so the indicator
   visibly stretches and settles into place instead of snapping. */
(function () {
  'use strict';

  var nav = document.getElementById('gnav');
  if (!nav) return;

  var pill = nav.querySelector('.gnav__pill');
  var goo = nav.querySelector('.gnav__goo');
  var blob = nav.querySelector('.gnav__blob');
  var trails = Array.prototype.slice.call(nav.querySelectorAll('.gnav__trail'));
  var links = Array.prototype.slice.call(nav.querySelectorAll('.gnav__link'));

  var sections = links
    .map(function (link) {
      var href = link.getAttribute('href') || '';
      return href.charAt(0) === '#' ? document.querySelector(href) : null;
    })
    .filter(Boolean);

  var reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function makeSpring(k, d) {
    return { x: 0, v: 0, target: 0, k: k, d: d };
  }

  // Low stiffness + firm damping reads as weight: the blob falls into place
  // and settles rather than sliding linearly.
  var sX = makeSpring(0.15, 0.78);
  var sW = makeSpring(0.19, 0.72);
  var sY = makeSpring(0.13, 0.7);
  var trailX = [makeSpring(0.1, 0.84), makeSpring(0.072, 0.86), makeSpring(0.05, 0.88)];
  var trailW = [makeSpring(0.13, 0.82), makeSpring(0.1, 0.84), makeSpring(0.075, 0.86)];

  var metrics = [];
  var activeIndex = Math.max(
    0,
    links.findIndex(function (l) {
      return l.classList.contains('is-active');
    })
  );
  var focusIndex = activeIndex;
  var running = false;
  var dropFrom = 0;

  function measure() {
    if (!links.length) return;
    var base = goo.getBoundingClientRect();
    metrics = links.map(function (link) {
      var r = link.getBoundingClientRect();
      return { x: r.left - base.left, w: r.width };
    });
  }

  function integrate(s) {
    s.v = (s.v + (s.target - s.x) * s.k) * s.d;
    s.x += s.v;
  }

  function snap() {
    if (!metrics.length) return;
    var m = metrics[focusIndex] || metrics[activeIndex];
    sX.x = sX.target = m.x;
    sX.v = 0;
    sW.x = sW.target = m.w;
    sW.v = 0;
    sY.x = sY.target = 0;
    sY.v = 0;
    trailX.forEach(function (t) {
      t.x = t.target = m.x;
      t.v = 0;
    });
    trailW.forEach(function (t, i) {
      t.x = t.target = m.w * (0.86 - i * 0.09);
      t.v = 0;
    });
    paint();
  }

  function paint() {
    blob.style.width = sW.x.toFixed(2) + 'px';
    blob.style.transform =
      'translate3d(' + sX.x.toFixed(2) + 'px,' + sY.x.toFixed(2) + 'px,0)';
    trails.forEach(function (t, i) {
      t.style.width = trailW[i].x.toFixed(2) + 'px';
      t.style.transform =
        'translate3d(' + trailX[i].x.toFixed(2) + 'px,' + sY.x.toFixed(2) + 'px,0)';
    });
  }

  function allSettled() {
    if (Math.abs(sX.target - sX.x) > 0.2 || Math.abs(sX.v) > 0.2) return false;
    if (Math.abs(sW.target - sW.x) > 0.3 || Math.abs(sW.v) > 0.3) return false;
    if (Math.abs(sY.x) > 0.15 || Math.abs(sY.v) > 0.15) return false;
    for (var i = 0; i < trailX.length; i += 1) {
      if (Math.abs(trailX[i].target - trailX[i].x) > 0.5 || Math.abs(trailX[i].v) > 0.5) {
        return false;
      }
      if (Math.abs(trailW[i].target - trailW[i].x) > 0.6 || Math.abs(trailW[i].v) > 0.6) {
        return false;
      }
    }
    return true;
  }

  function tick() {
    var m = metrics[focusIndex];
    if (!m) {
      running = false;
      return;
    }

    sX.target = m.x;
    sW.target = m.w;
    sY.target = 0;

    integrate(sX);
    integrate(sW);
    integrate(sY);

    trailX.forEach(function (t) {
      t.target = m.x;
      integrate(t);
    });
    trailW.forEach(function (t, i) {
      t.target = m.w * (0.86 - i * 0.09);
      integrate(t);
    });

    paint();
    goo.classList.remove('is-hidden');

    if (allSettled()) {
      running = false;
      return;
    }
    window.requestAnimationFrame(tick);
  }

  function start() {
    if (!metrics.length) return;
    if (reduce) {
      snap();
      goo.classList.remove('is-hidden');
      return;
    }
    if (running) return;
    running = true;
    window.requestAnimationFrame(tick);
  }

  function setFocus(i, animate) {
    if (i < 0 || i >= links.length) return;
    focusIndex = i;
    if (animate === false) snap();
    else start();
  }

  function setActive(i) {
    if (i < 0 || i >= links.length) return;
    activeIndex = i;
    links.forEach(function (link, idx) {
      var on = idx === i;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    setFocus(i);
  }

  links.forEach(function (link, i) {
    link.addEventListener('mouseenter', function () {
      setFocus(i);
    });
    link.addEventListener('focus', function () {
      setFocus(i);
    });
    link.addEventListener('click', function () {
      setActive(i);
    });
  });

  pill.addEventListener('mouseleave', function () {
    setFocus(activeIndex);
  });

  if ('IntersectionObserver' in window && sections.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var i = sections.indexOf(entry.target);
          if (i !== -1 && i !== activeIndex) setActive(i);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach(function (section) {
      io.observe(section);
    });
  }

  var scrollState = false;
  function onScroll() {
    var next = window.scrollY > 8;
    if (next !== scrollState) {
      scrollState = next;
      nav.classList.toggle('is-scrolled', next);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var resizeTimer = null;
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      measure();
      snap();
    }, 120);
  }
  window.addEventListener('resize', onResize);

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      measure();
      snap();
    }).observe(pill);
  }

  function init() {
    measure();
    snap();
    if (!reduce) {
      sY.x = -20;
      sY.v = 0;
      dropFrom = 1;
      start();
    }
    goo.classList.remove('is-hidden');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
  window.addEventListener('load', function () {
    measure();
    if (!dropFrom) snap();
  });
})();
