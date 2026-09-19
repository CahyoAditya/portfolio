/* Hero field — an interactive repulsion grid, in three.js.
 *
 * The reference is Ion Drimba's "Interactive Repulsion Effect" (Codrops): a
 * camera pointed straight down at a floor of small shapes, and a raycaster that
 * projects the pointer onto that floor. Cells near the projection rise, swell
 * and tumble, then settle back. This is an independent implementation of the
 * same idea, re-themed for the page and re-costed for a background layer:
 *
 *   - three.js is vendored locally (assets/vendor/three.min.js) and requested
 *     only after load + idle, so its ~650 kB never competes with the hero
 *     portrait for bandwidth during first paint
 *   - one shared geometry, one material per cell, no tween library: per frame
 *     the work is a few hundred float writes rather than scene graph churn
 *   - the loop stops while the hero is off screen or the tab is hidden
 *   - prefers-reduced-motion, a missing WebGL context, or a failed library
 *     fetch all mean the field is never built — the CSS aura is the fallback
 */
(function () {
  'use strict';

  var canvas = document.querySelector('[data-particles]');
  if (!canvas) return;

  var reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !hasWebGL()) return;

  var VENDOR = './assets/vendor/three.min.js';

  // Must match --bg in style.css. The canvas is deliberately opaque: a
  // transparent WebGL layer is composited inconsistently (and in some capture
  // paths not at all), so the field paints its own dark backdrop and the CSS
  // aura is stacked on top instead.
  var BG = 0x06060c;

  /* Tuning. Distances are world units; VIEW_H is the slice of floor the camera
     frames, and every other size is expressed against it. */
  var FOV = 24; // narrow, so the view stays close to the reference's flatness
  var VIEW_H = 21;
  var SPACING = 4.6; // centre-to-centre distance between cells
  var UNIT = 0.6; // rounded-box edge at rest
  var CORNER = 0.17;
  var SEGMENTS = 4;
  var REST_Y = UNIT / 2; // rests on the floor rather than half sunk into it
  var LIFT = 3.4; // height at point-blank range
  var REACH = 8; // how far the pointer's influence extends
  var IDLE = 0.2; // resting undulation, so the grid is never dead
  var EASE = 0.16; // approach per 60 fps frame
  var GLOW = 0.02; // emissive at rest; the rise does the rest
  var HUE_A = 0x6a53ff; // brand purple
  var HUE_B = 0xc21e76; // brand pink

  var THREE = null;
  var renderer = null;
  var scene = null;
  var camera = null;
  var group = null;
  var floor = null;
  var sun = null;
  var raycaster = null;
  var plane = null;
  var hit = null;
  var ndc = null;
  var box = null;
  var colorA = null;
  var colorB = null;
  var cells = [];
  var cols = 0;
  var rows = 0;
  var viewW = 0;
  var running = false;
  var raf = 0;
  var last = 0;
  var resized = 0;
  var hasPointer = false;
  var started = false;

  function hasWebGL() {
    try {
      var probe = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (probe.getContext('webgl2') ||
          probe.getContext('webgl') ||
          probe.getContext('experimental-webgl'))
      );
    } catch (error) {
      return false;
    }
  }

  /* A box with its edges rounded off: tessellate a cube, pull every vertex back
     inside a smaller cube, then push it out again along the resulting direction
     by the corner radius. One geometry serves every cell.

     Note the Buffer names: the vendored revision (r123, the one the reference
     effect is pinned to) still exports the old non-buffer Geometry class under
     the plain names, and that class has no vertex attributes to edit. */
  function roundedBox(size, radius, segments) {
    var geometry = new THREE.BoxBufferGeometry(size, size, size, segments, segments, segments);
    var position = geometry.attributes.position;
    var inner = size / 2 - radius;
    var vertex = new THREE.Vector3();
    var clamped = new THREE.Vector3();

    for (var i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i);
      clamped.set(
        Math.max(-inner, Math.min(inner, vertex.x)),
        Math.max(-inner, Math.min(inner, vertex.y)),
        Math.max(-inner, Math.min(inner, vertex.z))
      );
      vertex.sub(clamped).normalize().multiplyScalar(radius).add(clamped);
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  function cellMaterial(t) {
    var color = colorA.clone().lerp(colorB, t);
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color.clone(),
      emissiveIntensity: GLOW,
      // There is no environment map on the page, so a shiny metal would simply
      // read as black. Matte plus a glow carries the shape instead.
      metalness: 0.05,
      roughness: 0.38
    });
  }

  // Enough cells to fill the frame, plus a margin of two so that resizing and
  // the perspective's own reach never expose the edge of the grid.
  function counts(aspect) {
    return [
      Math.ceil((VIEW_H * aspect) / SPACING) + 2,
      Math.ceil(VIEW_H / SPACING) + 2
    ];
  }

  function buildGrid(aspect) {
    var wanted = counts(aspect);
    cols = wanted[0];
    rows = wanted[1];
    viewW = VIEW_H * aspect;

    while (cells.length) {
      var stale = cells.pop();
      group.remove(stale);
      stale.material.dispose();
    }

    for (var row = 0; row < rows; row += 1) {
      // Alternating row lengths, each centred, give the brick offset that the
      // reference achieves by nudging its short rows sideways.
      var rowCols = row % 2 === 0 ? cols : cols - 1;
      var rowZ = (row - (rows - 1) / 2) * SPACING;

      for (var col = 0; col < rowCols; col += 1) {
        var cellX = (col - (rowCols - 1) / 2) * SPACING;
        var mix = cols > 1 ? col / (cols - 1) : 0;
        if (rows > 1) mix = (mix + row / (rows - 1)) * 0.5;

        var mesh = new THREE.Mesh(box, cellMaterial(mix));
        mesh.position.set(cellX, REST_Y, rowZ);
        mesh.rotation.y = (Math.random() - 0.5) * 0.24;
        mesh.castShadow = true;
        mesh.userData = {
          x: cellX,
          z: rowZ,
          y: 0,
          spin: mesh.rotation.y,
          // Offset the resting wave per cell so it reads as a drift, not a pulse.
          phase: (cellX + rowZ) * 0.42
        };

        group.add(mesh);
        cells.push(mesh);
      }
    }

    // Keep the shadow camera over the whole grid, otherwise lifted cells near
    // the edge of the hero lose their shadow.
    var span = Math.max(viewW, VIEW_H) * 0.8;
    sun.shadow.camera.left = -span;
    sun.shadow.camera.right = span;
    sun.shadow.camera.top = span;
    sun.shadow.camera.bottom = -span;
    sun.shadow.camera.updateProjectionMatrix();

    // Only shadowed pixels are ever drawn, so an oversized floor costs nothing
    // while guaranteeing a landing spot for every cell.
    floor.scale.set(viewW * 6, VIEW_H * 6, 1);
  }

  function build() {
    var rect = canvas.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width));
    var height = Math.max(1, Math.round(rect.height));
    var aspect = width / height;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        // Multisampling is wasted work once the device already has 2x pixels.
        antialias: (window.devicePixelRatio || 1) < 2
      });
    } catch (error) {
      renderer = null;
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(BG, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);

    var cameraDistance = VIEW_H / 2 / Math.tan((FOV / 2) * Math.PI / 180);
    camera = new THREE.PerspectiveCamera(FOV, aspect, 1, cameraDistance * 3);
    camera.position.set(0, cameraDistance, 0);
    camera.rotation.x = -Math.PI / 2;
    camera.updateMatrixWorld();

    // Kept low on purpose: the hero already carries a big name and a portrait,
    // so the floor of cells has to stay quiet until the pointer wakes it up.
    scene.add(new THREE.AmbientLight(0xffffff, 0.11));

    sun = new THREE.DirectionalLight(0xffffff, 0.22);
    sun.position.set(6, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.bias = -0.0009;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = cameraDistance * 3;
    scene.add(sun);

    // Brand-coloured rims, so raised cells catch the gradient the page is built
    // from instead of reading as grey plastic.
    var rimA = new THREE.PointLight(HUE_A, 0.75, 34, 2);
    rimA.position.set(-11, 7, -6);
    scene.add(rimA);

    var rimB = new THREE.PointLight(HUE_B, 0.75, 34, 2);
    rimB.position.set(11, 6, 7);
    scene.add(rimB);

    floor = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(1, 1),
      new THREE.ShadowMaterial({ opacity: 0.5 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    group = new THREE.Object3D();
    scene.add(group);

    box = roundedBox(UNIT, CORNER, SEGMENTS);
    colorA = new THREE.Color(HUE_A);
    colorB = new THREE.Color(HUE_B);

    raycaster = new THREE.Raycaster();
    plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    hit = new THREE.Vector3();
    ndc = new THREE.Vector2();

    buildGrid(aspect);
    renderer.render(scene, camera); // a resting frame, before any pointer arrives

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Only burn frames while the hero is actually on screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) start();
            else stop();
          });
        },
        { threshold: 0 }
      ).observe(canvas);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });
  }

  function step(now) {
    // A backgrounded tab must not let cells teleport when it returns.
    var elapsed = Math.min(now - last, 50);
    last = now;
    var ease = 1 - Math.pow(1 - EASE, elapsed / 16.667);

    // Project the pointer onto the floor once per frame, not once per cell.
    var pointerX = 1e6;
    var pointerZ = 1e6;
    if (hasPointer) {
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, hit)) {
        pointerX = hit.x;
        pointerZ = hit.z;
      }
    }

    var reachSq = REACH * REACH;

    for (var i = 0; i < cells.length; i += 1) {
      var cell = cells[i];
      var data = cell.userData;

      var target = IDLE * (0.5 + 0.5 * Math.sin(now * 0.0011 + data.phase));

      var dx = pointerX - data.x;
      var dz = pointerZ - data.z;
      var distanceSq = dx * dx + dz * dz;
      if (distanceSq < reachSq) {
        // Squared falloff: a tight core, a soft skirt.
        var closeness = 1 - Math.sqrt(distanceSq) / REACH;
        target += LIFT * closeness * closeness;
      }

      data.y += (target - data.y) * ease;

      var rise = Math.min(data.y / LIFT, 1.25);
      cell.position.y = REST_Y + data.y;
      cell.scale.setScalar(1 + rise * 2);
      cell.rotation.x = rise * 0.55;
      cell.rotation.z = -rise * 0.4;
      cell.rotation.y = data.spin + rise * 0.7;
      cell.material.emissiveIntensity = GLOW + rise * 1.25;
    }

    renderer.render(scene, camera);
  }

  function loop(now) {
    raf = 0;
    step(now);
    if (running) raf = window.requestAnimationFrame(loop);
  }

  function start() {
    if (running || !renderer) return;
    running = true;
    last = window.performance.now();
    raf = window.requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function onPointerMove(event) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    hasPointer = true;
  }

  function onResize() {
    window.clearTimeout(resized);
    resized = window.setTimeout(applySize, 180);
  }

  function applySize() {
    if (!renderer) return;

    var rect = canvas.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width));
    var height = Math.max(1, Math.round(rect.height));
    var aspect = width / height;

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);

    var wanted = counts(aspect);
    if (wanted[0] !== cols || wanted[1] !== rows) buildGrid(aspect);

    renderer.render(scene, camera);
  }

  function init(three) {
    if (started) return;
    started = true;
    THREE = three;
    build();
  }

  function loadLibrary() {
    if (window.THREE) {
      init(window.THREE);
      return;
    }

    var script = document.createElement('script');
    script.src = VENDOR;
    script.async = true;
    script.onload = function () {
      if (window.THREE) init(window.THREE);
    };
    // On failure the hero keeps the aura it already has.
    document.head.appendChild(script);
  }

  function queue() {
    // Wait until the page has painted and gone quiet: the hero portrait and the
    // fonts are what matter on first view, not a background layer.
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadLibrary, { timeout: 2500 });
    } else {
      window.setTimeout(loadLibrary, 300);
    }
  }

  if (document.readyState === 'complete') queue();
  else window.addEventListener('load', queue, { once: true });
})();
