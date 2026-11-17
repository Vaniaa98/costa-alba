// Save / load via localStorage. Key: costa-alba-save-v1.
const KEY = 'costa-alba-save-v1';
export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}
export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      v: 1, money: G.progression.state.money, mission: G.missions.state.index,
      owned: G.progression.state.owned, packages: G.progression.state.packages,
      fares: G.progression.state.faresDone, deliveries: G.progression.state.deliveriesDone,
      x: p.x, z: p.z, health: p.health, clock: G.clockMinutes,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.v === 1 ? d : null;
  } catch { return null; }
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
