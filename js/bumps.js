/*
  "Triangle bumps": the playable game on the Felt Interfaces project page.

  The physics is ported 1:1 from the original sketch (Skwtch55/script.js): a triangular
  lattice with a cosine-shaped bump on every crosspoint, and a ball hanging on a stiff
  rope from your cursor. Going up a bump the ball lags, going down it surges ahead.

  Bumps.mount(el)   drops the game into an element. Drag the ball.
  Bumps.SCENES      the five grids (pitch, strength and look) you can switch between.

  The same physics (without the DOM) is used by tools/ to render the film on the project card.
  Differences from the original: the grid is drawn on one canvas, everything scales to the
  element size, the loop only runs while you drag, and ixfx isn't needed.
*/
(function () {
  const SQRT3_2 = Math.sqrt(3) / 2;
  const BALL_COLOUR = '#3f6a38'; // site accent. Original sketch: '#f69936'
  const HEX_COLOUR = '#0d110f';
  const HEX_RGB = '13,17,15'; // original: '#000'

  /* ---------- pure physics (same as the original) ---------- */

  function nearestCrosspoint(x, y, pitch, out) {
    const rowHeight = pitch * SQRT3_2;
    const j = y / rowHeight;
    const i = (x - j * pitch / 2) / pitch;
    const i0 = Math.floor(i);
    const j0 = Math.floor(j);
    let best = Infinity;
    for (let dj = 0; dj <= 1; dj++) {
      for (let di = 0; di <= 1; di++) {
        const jj = j0 + dj;
        const cx = (i0 + di) * pitch + jj * pitch / 2;
        const cy = jj * rowHeight;
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d < best) {
          best = d;
          out.x = cx;
          out.y = cy;
        }
      }
    }
    return out;
  }

  const effectiveRadius = s => Math.min(s.bumpRadius, s.pitch / 2);
  const scratchCentre = { x: 0, y: 0 };

  function bumpSlope(x, y, s, out) {
    const radius = effectiveRadius(s);
    nearestCrosspoint(x, y, s.pitch, scratchCentre);
    const dx = x - scratchCentre.x;
    const dy = y - scratchCentre.y;
    const d = Math.hypot(dx, dy);
    if (d >= radius || d < 1e-9) {
      out.x = 0;
      out.y = 0;
      return out;
    }
    const slope = -s.bumpStrength * Math.PI / (2 * radius) * Math.sin(Math.PI * d / radius);
    out.x = slope * dx / d;
    out.y = slope * dy / d;
    return out;
  }

  function stepBall(ball, from, to, frameDt, s) {
    frameDt = Math.min(Math.max(frameDt, 0), 0.05);
    if (frameDt === 0) {
      return ball;
    }
    if (from === undefined || to === undefined) { // not held: stay exactly where it is
      if (ball.velocity.x === 0 && ball.velocity.y === 0) {
        return ball;
      }
      return { position: ball.position, velocity: { x: 0, y: 0 } };
    }
    const steps = Math.max(1, Math.ceil(frameDt / s.maxSubstep));
    const dt = frameDt / steps;
    const k = s.ropeStiffness;
    const c = 2 * s.ropeDamping * Math.sqrt(k);
    const cvx = (to.x - from.x) / frameDt;
    const cvy = (to.y - from.y) / frameDt;
    let { x, y } = ball.position;
    let { x: vx, y: vy } = ball.velocity;
    const slope = { x: 0, y: 0 };
    for (let step = 1; step <= steps; step++) {
      bumpSlope(x, y, s, slope);
      const t = step / steps;
      const ax = -slope.x - s.friction * vx + k * (from.x + (to.x - from.x) * t - x) + c * (cvx - vx);
      const ay = -slope.y - s.friction * vy + k * (from.y + (to.y - from.y) * t - y) + c * (cvy - vy);
      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;
    }
    return { position: { x, y }, velocity: { x: vx, y: vy } };
  }

  /* The original is tuned for pitch 130 px. For another pitch, lengths scale by f and
     bump strength by f*f, which keeps the same motion, just smaller. `str` is a multiplier. */
  function physicsFor(pitch, str) {
    const f = pitch / 130;
    return {
      pitch,
      bumpRadius: 55 * f,
      bumpStrength: 900000 * f * f * (str || 1),
      ropeStiffness: 900,
      ropeDamping: 0.8,
      friction: 0.3,
      maxSubstep: 1 / 480
    };
  }

  /* ---------- the five grids ---------- */

  const SCENES = [
    { name: 'Hexagons', pitch: 1, str: 1, look: 'hexagons' },
    { name: 'Soft circles', pitch: 1.25, str: 1, look: 'circles' },
    { name: 'Cliffs', pitch: 1.7, str: 3, look: 'hexagons' },
    { name: 'Sandpaper', pitch: .6, str: .7, look: 'hexagons' },
    { name: 'Invisible', pitch: 1, str: 1.4, look: 'hidden' }
  ];

  /* ---------- the game ---------- */

  function mount(root) {
    root.classList.add('game');
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    const ballEl = document.createElement('div');
    ballEl.className = 'ball';
    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = 'Drag the ball';
    root.append(cv, ballEl, hint);

    let W = 0;
    let H = 0;
    let dpr = 1;
    let base = 130;
    let ballR = 25;
    let sceneIdx = 0;
    let s = physicsFor(130);
    let look = 'hexagons';
    let sprite = null;
    let ball = null;
    let cursor;
    let prev;
    let last = 0;
    let raf = 0;

    const clampBall = () => {
      ball.position.x = Math.min(W - ballR, Math.max(ballR, ball.position.x));
      ball.position.y = Math.min(H - ballR, Math.max(ballR, ball.position.y));
    };

    function applyScene(i) {
      sceneIdx = i;
      const sc = SCENES[i];
      s = physicsFor(base * sc.pitch, sc.str);
      look = sc.look;
      sprite = null;
      if (look === 'circles') { // radial gradient whose darkness follows the bump profile
        const R = effectiveRadius(s);
        const size = Math.max(2, Math.ceil(2 * R * dpr));
        sprite = document.createElement('canvas');
        sprite.width = sprite.height = size;
        const g = sprite.getContext('2d');
        const grad = g.createRadialGradient(
          size / 2,
          size / 2,
          0,
          size / 2,
          size / 2,
          size / 2
        );
        for (let n = 0; n <= 10; n++) {
          const alpha = ((1 + Math.cos(Math.PI * n / 10)) / 2).toFixed(3);
          grad.addColorStop(n / 10, `rgba(${HEX_RGB},${alpha})`);
        }
        g.fillStyle = grad;
        g.fillRect(0, 0, size, size);
      }
    }

    function eachPoint(cb) {
      const rowH = s.pitch * SQRT3_2;
      for (let j = -1; j <= Math.ceil(H / rowH) + 1; j++) {
        const shift = j * s.pitch / 2;
        const firstColumn = Math.floor((-shift - s.pitch) / s.pitch);
        const lastColumn = Math.ceil((W - shift + s.pitch) / s.pitch);
        for (let i = firstColumn; i <= lastColumn; i++) {
          cb(i * s.pitch + shift, j * rowH);
        }
      }
    }

    function layout() {
      W = root.clientWidth;
      H = root.clientHeight;
      if (!W || !H) {
        return;
      }
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      base = W < 700 ? 90 : 130;
      ballR = 25 * base / 130;
      ballEl.style.width = ballEl.style.height = ballR * 2 + 'px';
      applyScene(sceneIdx);
      if (!ball) {
        ball = { position: { x: W / 2, y: H * .5 }, velocity: { x: 0, y: 0 } };
        hint.style.transform = `translate(${W / 2}px, ${H * .5 + ballR + 10}px) translateX(-50%)`;
      }
      clampBall();
      draw();
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      if (look !== 'hidden') {
        const R = effectiveRadius(s);
        if (look === 'hexagons') {
          const hh = 2 * R / Math.sqrt(3); // pointy-top hexagon, flat sides facing the six neighbours
          ctx.fillStyle = HEX_COLOUR;
          ctx.beginPath();
          eachPoint((cx, cy) => {
            ctx.moveTo(cx, cy - hh);
            ctx.lineTo(cx + R, cy - hh / 2);
            ctx.lineTo(cx + R, cy + hh / 2);
            ctx.lineTo(cx, cy + hh);
            ctx.lineTo(cx - R, cy + hh / 2);
            ctx.lineTo(cx - R, cy - hh / 2);
            ctx.closePath();
          });
          ctx.fill();
        } else if (sprite) {
          eachPoint((cx, cy) => ctx.drawImage(sprite, cx - R, cy - R, 2 * R, 2 * R));
        }
      }
      if (cursor) { // the rope (white outline so it reads over the black bumps)
        ctx.lineCap = 'round';
        for (const [colour, width] of [['#fff', 4.5], [BALL_COLOUR, 2]]) {
          ctx.strokeStyle = colour;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(ball.position.x, ball.position.y);
          ctx.lineTo(cursor.x, cursor.y);
          ctx.stroke();
        }
      }
      ballEl.style.transform = `translate(${ball.position.x - ballR}px, ${ball.position.y - ballR}px)`;
    }

    const toLocal = e => {
      const rect = root.getBoundingClientRect();
      return {
        x: Math.min(W - ballR, Math.max(ballR, e.clientX - rect.left)),
        y: Math.min(H - ballR, Math.max(ballR, e.clientY - rect.top))
      };
    };

    function tick(now) {
      ball = stepBall(ball, prev, cursor, (now - last) / 1000, s);
      prev = cursor;
      last = now;
      draw();
      raf = cursor ? requestAnimationFrame(tick) : 0;
    }

    function release() {
      if (!cursor) {
        return;
      }
      cursor = undefined;
      prev = undefined;
      ballEl.classList.remove('dragging');
      cancelAnimationFrame(raf);
      raf = 0;
      ball = stepBall(ball, undefined, undefined, 0.016, s); // stop dead, like the original
      draw();
    }

    ballEl.addEventListener('pointerdown', e => {
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      ballEl.setPointerCapture(e.pointerId);
      cursor = toLocal(e);
      prev = cursor;
      ballEl.classList.add('dragging');
      hint.remove();
      last = performance.now();
      raf = requestAnimationFrame(tick);
    });
    ballEl.addEventListener('pointermove', e => {
      if (cursor) {
        cursor = toLocal(e);
      }
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(eventName => {
      ballEl.addEventListener(eventName, release);
    });

    new ResizeObserver(layout).observe(root);
    layout();

    return {
      scene: () => sceneIdx,
      setScene(i) {
        applyScene(i);
        clampBall();
        draw();
      }
    };
  }

  window.Bumps = { SCENES, nearestCrosspoint, bumpSlope, stepBall, physicsFor, mount };
})();