// Keyboard + mouse input. Held keys + one-shot pressed flags (cleared each tick).
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  let mouseX = 0, mouseY = 0, mouseDown = false, mouseClicked = false;
  let enabled = true;
  const down = (e) => {
    if (!enabled) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
  };
  const up = (e) => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); };
  const mousemove = (e) => { mouseX = e.clientX; mouseY = e.clientY; };
  const mousedown = (e) => { if (e.button === 0) { mouseDown = true; mouseClicked = true; } };
  const mouseup = (e) => { if (e.button === 0) mouseDown = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('mousemove', mousemove);
  window.addEventListener('mousedown', mousedown);
  window.addEventListener('mouseup', mouseup);
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });
  return {
    keys, pressed,
    get mouse() { return { x: mouseX, y: mouseY, down: mouseDown, clicked: mouseClicked }; },
    // Query helpers (WASD + arrows).
    axis() {
      let x = 0, y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y += 1;
      if (keys.has('s') || keys.has('ArrowDown')) y -= 1;
      return { x, y };
    },
    run() { return keys.has('Shift'); },
    endTick() { pressed.clear(); mouseClicked = false; },
    setEnabled(v) { enabled = v; if (!v) { keys.clear(); mouseDown = false; } },
  };
}
