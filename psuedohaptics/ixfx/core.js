export function continuously(fn) {
  let running = false;

  const tick = () => {
    if (!running) return;
    fn();
    requestAnimationFrame(tick);
  };

  return {
    start() {
      if (running) return;
      running = true;
      requestAnimationFrame(tick);
    },
    stop() {
      running = false;
    }
  };
}
