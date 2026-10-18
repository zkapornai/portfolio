(() => {
  const glowSurfaces = document.querySelectorAll('.hero, .page');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    glowSurfaces.forEach(surface => {
      let frame = 0;
      let targetX = 76;
      let targetY = surface.classList.contains('page') ? 20 : 43;
      let currentX = targetX;
      let currentY = targetY;

      const update = () => {
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;
        surface.style.setProperty('--glow-x', `${currentX}%`);
        surface.style.setProperty('--glow-y', `${currentY}%`);

        if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
          frame = requestAnimationFrame(update);
        } else {
          frame = 0;
        }
      };

      surface.addEventListener('pointermove', event => {
        const bounds = surface.getBoundingClientRect();
        targetX = ((event.clientX - bounds.left) / bounds.width) * 100;
        targetY = ((event.clientY - bounds.top) / bounds.height) * 100;
        if (!frame) frame = requestAnimationFrame(update);
      });

      surface.addEventListener('pointerleave', () => {
        targetX = 76;
        targetY = surface.classList.contains('page') ? 20 : 43;
        if (!frame) frame = requestAnimationFrame(update);
      });
    });
  }
})();
