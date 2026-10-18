/* Projects page: renders the card grid from PROJECTS (see data.js) */
const cardHTML = (p, i) => {
  const href = p.href || '#';
  const roles = `
    <span class="roles">
      ${p.roles.map(r => `<b>${r}</b>`).join('')}
    </span>
  `;
  const label = `
    <span class="name">${p.name}</span>
    <span class="go">${ARROW}</span>
    ${roles}
  `;

  // live card: the tile is a film that plays on hover (see bumps.js)
  if (p.demo === 'bumps') {
    return `
      <a class="card live" href="${href}">
        <div class="demo" aria-hidden="true"></div>
        ${label}
      </a>
    `;
  }

  return `
    <a class="card" href="${href}">
      ${artTile(p, i)}
      ${label}
    </a>
  `;
};

document.getElementById('grid').innerHTML = PROJECTS.map(cardHTML).join('');

document.querySelectorAll('.demo').forEach(el => {
  if (window.Bumps) {
    Bumps.mount(el, { mode: 'preview' });
  }
});

// placeholder links (href="#") should not jump to the top of the page
document.querySelectorAll('a[href="#"]').forEach(a => {
  a.addEventListener('click', e => e.preventDefault());
});
