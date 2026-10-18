/* Felt Interfaces project page: the real game. Drag the ball; pick a grid or press H. */
const game = Bumps.mount(document.getElementById('demo'), { mode: 'game' });
const picker = document.getElementById('picker');

picker.innerHTML = Bumps.SCENES
  .map((scene, index) => `<button class="btn" data-i="${index}">${scene.name}</button>`)
  .join('');

function pick(i) {
  game.setScene(i);
  picker.querySelectorAll('button').forEach((button, index) => {
    button.setAttribute('aria-pressed', index === i);
    button.classList.toggle('p', index === i);
  });
}
picker.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button) {
    pick(+button.dataset.i);
  }
});

addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'h' && !event.metaKey && !event.ctrlKey) {
    pick((game.scene() + 1) % Bumps.SCENES.length);
  }
});

pick(0);

// disciplines come from the project data
const me = PROJECTS.find(p => p.name === 'Felt Interfaces');
if (me) {
  document.getElementById('roles').innerHTML = me.roles
    .map(role => `<li>${role}</li>`)
    .join('');
}
