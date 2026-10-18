// @ts-check
/*
 * Triangle bumps
 *
 * A triangular lattice with a cosine-shaped bump on every crosspoint.
 * You drag an orange ball that hangs on a stiff rope from your cursor.
 *   - Moving up a bump, the bump pushes back, so the ball lags behind the cursor.
 *   - Moving down the far side, it pushes forward, so the ball surges ahead.
 *   - Crossing a bump off-centre pushes the ball sideways as well.
 *
 * Structure follows the ixfx demos: settings, immutable state, update(), use(), setup().
 */

/**
 * Runs fn on every frame. It uses ixfx's continuously() when the page's import
 * map can find ixfx, and falls back to requestAnimationFrame when it can't, so
 * the sketch keeps working if you move it to a different folder.
 * @param {() => void} fn
 */
async function startLoop(fn) {
  try {
    // @ts-ignore  the editor can't always resolve the import map
    const { continuously } = await import('@ixfx/core.js');
    continuously(fn).start();
    console.info('loop: ixfx continuously');
  } catch (error) {
    console.info('loop: ixfx not found from this folder, using requestAnimationFrame');
    const tick = () => {
      fn();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

/**
 * @typedef Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef Ball
 * @property {Point} position
 * @property {Point} velocity
 */

/**
 * How the bumps are drawn. Press H to cycle through them.
 * This only changes the looks. The force is always the same round cosine bump.
 * @typedef {'hexagons' | 'circles' | 'hidden'} Look
 */

/** @type {Look[]} */
const LOOKS = ['hexagons', 'circles', 'hidden'];

/**
 * @typedef {Readonly<{
 *  ball: Ball,
 *  cursor: Point | undefined,
 *  previousCursor: Point | undefined,
 *  lastFrameAt: number,
 *  look: Look
 * }>} State
 */

/**
 * The numbers the physics needs. Kept apart from the DOM elements so the
 * physics functions can be tested without a page.
 * @typedef PhysicsSettings
 * @property {number} pitch Distance between neighbouring crosspoints
 * @property {number} bumpRadius Where a bump reaches zero. Clamped to pitch/2
 * @property {number} bumpStrength Bump height. Bigger = more resistance
 * @property {number} ropeStiffness Bigger = tighter rope
 * @property {number} ropeDamping Rope damping ratio. About 0.7-1 is calm
 * @property {number} friction Drag on the ball while you hold it
 * @property {number} maxSubstep Longest physics step in seconds
 */

const SQRT3_2 = Math.sqrt(3) / 2;

/** @type {PhysicsSettings} */
const physics = {
  // GRID CELL SIZE: pitch is the spacing between crosspoints, bumpRadius is the
  // size of each bump / hexagon (hexagons are 2 * bumpRadius flat to flat).
  // bumpRadius is capped at pitch / 2, which makes the hexagons touch.
  // Change both together to scale the grid.
  // The bump force scales with bumpStrength / bumpRadius, so scale
  // bumpStrength by the same factor to keep the same feel.
  pitch: 130,
  bumpRadius: 55,
  bumpStrength: 900000,
  ropeStiffness: 900,
  ropeDamping: 0.8,
  friction: 0.3,
  maxSubstep: 1 / 480
};

const settings = Object.freeze({
  physics: Object.freeze(physics),
  ballRadius: 25,              // POINTER CIRCLE SIZE (radius in pixels)
  hexColour: '#000',          // fill of the hexagons
  gradientStops: 10,          // smoothness of the circle look
  ballEl: /** @type {HTMLElement} */(document.querySelector('#ball')),
  ropeEl: /** @type {HTMLElement} */(document.querySelector('#rope')),
  gridEl: /** @type {HTMLElement} */(document.querySelector('#grid'))
});

/** @type State */
let state = Object.freeze({
  ball: {
    position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    velocity: { x: 0, y: 0 }
  },
  cursor: undefined,
  previousCursor: undefined,
  lastFrameAt: performance.now(),
  look: 'hexagons'
});

/*
-------------------------
THE BUMP FIELD (pure functions, no DOM)
-------------------------
*/

/**
 * Finds the crosspoint nearest to (x, y).
 * Crosspoints sit at (i*pitch + j*pitch/2, j*pitch*sqrt(3)/2): every other row
 * is shifted by half a pitch, so each point has six equally distant neighbours.
 * @param {number} x
 * @param {number} y
 * @param {number} pitch
 * @param {Point} out Written to and returned
 * @returns {Point}
 */
function nearestCrosspoint(x, y, pitch, out) {
  const rowHeight = pitch * SQRT3_2;
  const j = y / rowHeight;
  const i = (x - j * pitch / 2) / pitch;
  const i0 = Math.floor(i);
  const j0 = Math.floor(j);
  let best = Infinity;

  // The nearest crosspoint is always one of the four corners of the
  // lattice cell that contains the point
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

/** @param {PhysicsSettings} s */
const effectiveRadius = (s) => Math.min(s.bumpRadius, s.pitch / 2);

/** Reused by bumpSlope so it doesn't allocate on every call */
const scratchCentre = { x: 0, y: 0 };

/**
 * The slope of the bump at (x, y). It points uphill, towards the crosspoint.
 * The bump height is h(d) = H * (1 + cos(pi * d / R)) / 2 for distance d from
 * the crosspoint, and 0 once d >= R.
 * The force on the ball is the negative of this slope: it pushes you down the bump.
 * @param {number} x
 * @param {number} y
 * @param {PhysicsSettings} s
 * @param {Point} out Written to and returned
 * @returns {Point}
 */
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

  // derivative of h(d) with respect to d, then spread along (dx, dy)/d
  const slope = -s.bumpStrength * Math.PI / (2 * radius) * Math.sin(Math.PI * d / radius);
  out.x = slope * dx / d;
  out.y = slope * dy / d;
  return out;
}

/*
-------------------------
THE BALL (pure: returns a new ball, never changes the old one)
Unit mass. Forces:
  rope      k * (cursor - ball) + c * (cursorVelocity - ballVelocity)
  bump      -slope
  friction  -f * velocity
The rope damps the velocity relative to the cursor, so dragging over flat
ground gives no constant lag. Only the bumps cause lag and surge.
-------------------------
*/

/**
 * @param {Ball} ball
 * @param {Point | undefined} from Cursor at the previous frame (undefined = not held)
 * @param {Point | undefined} to Cursor now (undefined = not held)
 * @param {number} frameDt Seconds since the previous frame
 * @param {PhysicsSettings} s
 * @returns {Ball}
 */
function stepBall(ball, from, to, frameDt, s) {
  frameDt = Math.min(Math.max(frameDt, 0), 0.05);
  if (frameDt === 0) return ball;

  const held = from !== undefined && to !== undefined;

  // Not being dragged: the ball stays exactly where it is. The bumps only act
  // while you hold it, so nothing slides or bounces after you let go.
  if (!held) {
    if (ball.velocity.x === 0 && ball.velocity.y === 0) return ball;
    return { position: ball.position, velocity: { x: 0, y: 0 } };
  }

  const steps = Math.max(1, Math.ceil(frameDt / s.maxSubstep));
  const dt = frameDt / steps;
  const k = s.ropeStiffness;
  const c = 2 * s.ropeDamping * Math.sqrt(k);
  const friction = s.friction;
  const cursorVx = (to.x - from.x) / frameDt;
  const cursorVy = (to.y - from.y) / frameDt;

  let { x, y } = ball.position;
  let { x: vx, y: vy } = ball.velocity;
  const slope = { x: 0, y: 0 };

  for (let step = 1; step <= steps; step++) {
    bumpSlope(x, y, s, slope);
    let ax = -slope.x - friction * vx;
    let ay = -slope.y - friction * vy;

    // the cursor moves in a straight line between the two frames
    const t = step / steps;
    const targetX = from.x + (to.x - from.x) * t;
    const targetY = from.y + (to.y - from.y) * t;
    ax += k * (targetX - x) + c * (cursorVx - vx);
    ay += k * (targetY - y) + c * (cursorVy - vy);

    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
  }

  return { position: { x, y }, velocity: { x: vx, y: vy } };
}

/*
-------------------------
STATE
-------------------------
*/

/** @param {Partial<State>} s */
function saveState(s) {
  state = Object.freeze({ ...state, ...s });
}

function update() {
  const now = performance.now();
  const dt = (now - state.lastFrameAt) / 1000;
  const { cursor, previousCursor } = state;

  const ball = stepBall(state.ball, previousCursor, cursor, dt, settings.physics);
  saveState({ ball, previousCursor: cursor, lastFrameAt: now });
}

/*
-------------------------
USE: reads the state and moves the elements
-------------------------
*/

function use() {
  const { ball, cursor, look } = state;
  const { ballEl, ropeEl, gridEl, ballRadius } = settings;

  if (gridEl.dataset.look !== look) gridEl.dataset.look = look;

  ballEl.style.transform = `translate(${ball.position.x - ballRadius}px, ${ball.position.y - ballRadius}px)`;
  ballEl.classList.toggle('dragging', cursor !== undefined);

  if (cursor === undefined) {
    ropeEl.style.display = 'none';
    return;
  }

  const dx = cursor.x - ball.position.x;
  const dy = cursor.y - ball.position.y;
  ropeEl.style.display = 'block';
  ropeEl.style.width = `${Math.hypot(dx, dy)}px`;
  ropeEl.style.transform = `translate(${ball.position.x}px, ${ball.position.y}px) rotate(${Math.atan2(dy, dx)}rad)`;
}

/*
-------------------------
THE GRID (DOM: one element per crosspoint, only for looks)
The physics never reads these elements.
-------------------------
*/

/**
 * A radial gradient whose darkness follows the same cosine as the bump,
 * so what you see is the force field you feel.
 */
function bumpGradient() {
  const { gradientStops } = settings;
  const stops = [];
  for (let n = 0; n <= gradientStops; n++) {
    const r = n / gradientStops;
    const alpha = (1 + Math.cos(Math.PI * r)) / 2;
    stops.push(`rgba(0,0,0,${alpha.toFixed(3)}) ${(r * 100).toFixed(1)}%`);
  }
  return `radial-gradient(circle closest-side, ${stops.join(', ')})`;
}

function buildGrid() {
  const { gridEl, physics: s } = settings;
  const radius = effectiveRadius(s);
  // Pointy-top hexagon with flat sides facing the six neighbours. Its flat-to-flat
  // width is 2 * radius, so the bump (radius) just reaches the middle of each flat side.
  const hexHeight = radius * 4 / Math.sqrt(3);
  const margin = hexHeight / 2;
  const rowHeight = s.pitch * SQRT3_2;
  const width = window.innerWidth;
  const height = window.innerHeight;

  gridEl.replaceChildren();
  gridEl.style.setProperty('--bump-gradient', bumpGradient());
  gridEl.style.setProperty('--hex-colour', settings.hexColour);

  const fragment = document.createDocumentFragment();
  const rowStart = Math.floor(-margin / rowHeight) - 1;
  const rowEnd = Math.ceil((height + margin) / rowHeight) + 1;

  for (let j = rowStart; j <= rowEnd; j++) {
    const shift = j * s.pitch / 2;
    const colStart = Math.floor((-margin - shift) / s.pitch) - 1;
    const colEnd = Math.ceil((width + margin - shift) / s.pitch) + 1;

    for (let i = colStart; i <= colEnd; i++) {
      const cx = i * s.pitch + shift;
      const cy = j * rowHeight;
      const bump = document.createElement('div');
      bump.className = 'bump';
      bump.style.width = `${radius * 2}px`;
      bump.style.height = `${hexHeight}px`;
      bump.style.transform = `translate(${cx - radius}px, ${cy - hexHeight / 2}px)`;
      fragment.append(bump);
    }
  }

  gridEl.append(fragment);
}

/*
-------------------------
POINTER
-------------------------
*/

/** @param {PointerEvent} event */
function onPointerDown(event) {
  if (event.button !== 0) return;
  const p = { x: event.clientX, y: event.clientY };
  settings.ballEl.setPointerCapture(event.pointerId);
  saveState({ cursor: p, previousCursor: p });
}

/** @param {PointerEvent} event */
function onPointerMove(event) {
  if (state.cursor === undefined) return;
  saveState({ cursor: { x: event.clientX, y: event.clientY } });
}

function onPointerUp() {
  if (state.cursor === undefined) return;
  saveState({ cursor: undefined });
}

/** @param {KeyboardEvent} event */
function onKeyDown(event) {
  if (event.key !== 'h' && event.key !== 'H') return;
  const next = LOOKS[(LOOKS.indexOf(state.look) + 1) % LOOKS.length];
  saveState({ look: next });
}

function setup() {
  const { ballEl, ballRadius } = settings;
  ballEl.style.width = ballEl.style.height = `${ballRadius * 2}px`;

  buildGrid();
  window.addEventListener('resize', buildGrid);

  ballEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('blur', onPointerUp);
  window.addEventListener('keydown', onKeyDown);

  startLoop(() => {
    update();
    use();
  });
}

setup();
