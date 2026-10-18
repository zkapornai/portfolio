/* Home page: three full-screen projects with scroll-scrubbed animation */
const reduceMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;

// 1. Render the first three projects (see data.js)
// A project with `landingVideo` plays that film in step with the scroll (the video is never "played",
// scrolling sets its time). With reduced motion, or if the video can't load, the still image is used.
const panelHTML = (p, i) => (p.landingVideo && !reduceMotion)
  ? `<video class="art lv" src="${p.landingVideo}" muted playsinline preload="auto" aria-hidden="true" style="width:100%;height:100%;object-fit:cover;display:block"></video>`
  : artTile({ img: p.landing || p.img }, i);

document.getElementById('projs').innerHTML = PROJECTS.slice(0, 3).map((p, i) =>
  `<section class="proj"><div class="stage">
    <div class="panel">${panelHTML(p, i)}</div>
    <h2 class="ttl">${p.name.split(' ').map((w, k) => `<span><i style="--k:${k}">${w}</i></span>`).join('')}</h2>
    <span class="cnt">${i + 1} / 3</span>
    <div class="info">
      <p>${p.desc || ''}</p>
      <div class="rl">${p.roles.map(r => `<b>${r}</b>`).join('')}</div>
      <div class="btns"><a class="btn p" href="${p.href || 'projects.html'}">View project</a></div>
    </div>
  </div></section>`
).join('');

// If a film fails to load, fall back to the still image
document.querySelectorAll('.proj video').forEach((v, k) => {
  const p = PROJECTS[[...document.querySelectorAll('.proj')].indexOf(v.closest('.proj'))];
  v.addEventListener('error', () => { v.parentElement.innerHTML = artTile({ img: p.landing || p.img }, k); });
  // Phones only allow seeking a video that has been started once: start it muted and stop it right away.
  const prime = () => v.play().then(() => v.pause()).catch(() => {});
  v.addEventListener('loadeddata', prime, { once: true });
  addEventListener('pointerdown', prime, { once: true });
});

// 2. Scroll scrub. The animation only starts when a project reaches the top of the
//    screen, so the intro stays calm. Three CSS variables drive everything:
//    --a  panel grows from a small rounded card to full screen
//    --b  title slides up line by line
//    --c  glass info card fades in
//    The film (if any) runs from the first scroll to 85% of the pinned scroll, then holds its last frame.
const sections = [...document.querySelectorAll('.proj')];
const clamp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
const ease = t => t * t * (3 - 2 * t);

function scrub() {
  if (reduceMotion) return; // reduced motion: show the final state, no scrubbing
  sections.forEach(s => {
    const r = s.getBoundingClientRect();
    const p = clamp(-r.top, 0, r.height - innerHeight); // 0..1 progress inside the section
    const st = s.firstElementChild.style;
    st.setProperty('--a', ease(clamp(p, 0, .4)));
    st.setProperty('--b', ease(clamp(p, .12, .5)));
    st.setProperty('--c', ease(clamp(p, .45, .75)));
    const v = s.querySelector('video');
    if (v && v.duration && !v.seeking) {
      const t = clamp(p, 0, .85) * v.duration * 0.999; // stay just inside the last frame
      if (Math.abs(v.currentTime - t) > 0.012) v.currentTime = t;
    }
  });
}

let ticking = false;
addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; scrub(); }); }
}, { passive: true });
addEventListener('resize', scrub);
// Once a film knows its length, put it on the right frame.
document.querySelectorAll('.proj video').forEach(v => v.addEventListener('loadedmetadata', scrub));
scrub();