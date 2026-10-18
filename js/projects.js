/* Projects page: renders the card grid from PROJECTS (see data.js) */
const cardHTML = (p, i) => {
  const href = p.href || '#';
  const roles = `<span class="roles">${p.roles
    .map(role => `<b>${role}</b>`)
    .join('')}</span>`;
  const label =
    `<span class="name">${p.name}</span>` +
    `<span class="go">${ARROW}</span>` +
    roles;

  if (p.video) {
    const poster = p.poster ? ` poster="${p.poster}"` : '';
    const video =
      `<video class="film" src="${p.video}"${poster} data-playback-rate="${p.playbackRate || 1}" ` +
      'autoplay muted loop playsinline preload="auto" aria-hidden="true" tabindex="-1"></video>';
    return `<a class="card live" href="${href}">${video}${label}</a>`;
  }

  return `<a class="card" href="${href}">${artTile(p, i)}${label}</a>`;
};

document.getElementById('grid').innerHTML = PROJECTS.map(cardHTML).join('');

const reduceMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
document.querySelectorAll('.card.live video').forEach(video => {
  video.playbackRate = Number(video.dataset.playbackRate) || 1;
  if (reduceMotion) {
    video.removeAttribute('autoplay');
    video.pause();
  } else {
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }, { threshold: .25 }).observe(video.closest('.card'));
  }
});

document.querySelectorAll('a[href="#"]').forEach(anchor => {
  anchor.addEventListener('click', event => event.preventDefault());
});
