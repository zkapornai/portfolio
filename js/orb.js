/* Home hero: point cloud that morphs  Idea (sphere) -> Structure (grid) -> Craft (knot).
   Needs three.js (loaded before this file). Click the orb to change shape. */
(function () {
  if (!window.THREE) {
    return;
  }
  const T = THREE;
  const N = 4913; // 17 * 17 * 17 points
  const box = document.getElementById('orb');
  const cv = box.querySelector('canvas');
  const cap = document.getElementById('cap');
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  const R = new T.WebGLRenderer({
    canvas: cv,
    alpha: true,
    antialias: true
  });
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  const S = new T.Scene();
  const C = new T.PerspectiveCamera(35, 1, .1, 50);
  C.position.z = 8;

  const sphere = () => {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const y = 1 - 2 * (i + .5) / N;
      const r = Math.sqrt(1 - y * y);
      const t = i * 2.39996;
      a.set([
        Math.cos(t) * r * 1.5,
        y * 1.5,
        Math.sin(t) * r * 1.5
      ], i * 3);
    }
    return a;
  };

  const cube = () => {
    const a = new Float32Array(N * 3);
    let i = 0;
    for (let x = 0; x < 17; x++) {
      for (let y = 0; y < 17; y++) {
        for (let z = 0; z < 17; z++) {
          a.set([
            (x / 16 - .5) * 2.7,
            (y / 16 - .5) * 2.7,
            (z / 16 - .5) * 2.7
          ], 3 * i++);
        }
      }
    }
    return a;
  };

  const knot = () => {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = i / N * Math.PI * 2;
      const r = Math.cos(3 * u) + 2;
      const j = () => (Math.random() - .5) * .38;
      a.set([
        r * Math.cos(2 * u) * .62 + j(),
        r * Math.sin(2 * u) * .62 + j(),
        -Math.sin(3 * u) * .62 + j()
      ], i * 3);
    }
    return a;
  };

  const shapes = [sphere(), cube(), knot()];
  const names = ['Idea', 'Structure', 'Craft'];

  // start scattered, speeds differ per point so the morph looks organic; ~8% of points are green (#3f6a38)
  const pos = new Float32Array(N * 3);
  const speed = new Float32Array(N);
  const col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos.set([
      (Math.random() - .5) * 14,
      (Math.random() - .5) * 14,
      (Math.random() - .5) * 10
    ], i * 3);
    speed[i] = .35 + Math.random() * .9;
    col.set(
      Math.random() < .08 ? [.247, .416, .22] : [.05, .065, .055],
      i * 3
    );
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('color', new T.BufferAttribute(col, 3));

  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const g = sprite.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(16, 16, 15, 0, 7);
  g.fill();
  const mat = new T.PointsMaterial({
    size: .036,
    vertexColors: true,
    map: new T.CanvasTexture(sprite),
    transparent: true,
    depthWrite: false,
    opacity: .9
  });
  const pts = new T.Points(geo, mat);
  pts.frustumCulled = false;
  const G = new T.Group();
  G.add(pts);
  S.add(G);

  const size = () => {
    const w = box.clientWidth || 1;
    R.setSize(w, w, false);
  };
  addEventListener('resize', size);
  size();

  // only render while the orb is on screen
  let visible = true;
  new IntersectionObserver(e => {
    visible = e[0].isIntersecting;
    if (visible) {
      size();
    }
  }).observe(box);

  let i = 0;
  let spin = 0;
  let mx = 0;
  let my = 0;
  let last = performance.now();
  let switched = last;
  const next = n => {
    i = n % 3;
    cap.textContent = names[i];
    switched = performance.now();
  };
  box.addEventListener('click', () => {
    next(i + 1);
  });
  addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth - .5;
    my = e.clientY / innerHeight - .5;
  }, {
    passive: true
  });

  (function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) {
      last = now;
      return;
    }
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    if (!reduce && now - switched > 4200) {
      next(i + 1);
    }
    const target = shapes[i];
    const k = dt * (reduce ? 9 : 2.4);
    for (let n = 0; n < N; n++) {
      const f = Math.min(1, speed[n] * k);
      const j = n * 3;
      pos[j] += (target[j] - pos[j]) * f;
      pos[j + 1] += (target[j + 1] - pos[j + 1]) * f;
      pos[j + 2] += (target[j + 2] - pos[j + 2]) * f;
    }
    geo.attributes.position.needsUpdate = true;
    if (!reduce) {
      spin += dt * .25;
    }
    G.rotation.set(.35 + my * .3, spin + mx * .5, 0);
    R.render(S, C);
  })(last);
})();
