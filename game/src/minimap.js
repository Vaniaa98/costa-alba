// Canvas minimap: roads, sea, player arrow, traffic, police, mission marker.
import { CFG } from './config.js';

export function createMinimap() {
  const canvas = document.createElement('canvas');
  canvas.id = 'minimap'; canvas.width = 190; canvas.height = 190;
  document.getElementById('hud').appendChild(canvas);
  const g = canvas.getContext('2d');
  const S = 190, half = CFG.city / 2;
  const toMap = (x, z) => [S / 2 + (x / half) * (S / 2 - 4), S / 2 + (z / half) * (S / 2 - 4)];
  return {
    draw(G) {
      g.clearRect(0, 0, S, S);
      g.fillStyle = 'rgba(20,30,40,0.82)'; g.fillRect(0, 0, S, S);
      // sea + sand (south edge)
      const [, seaY] = toMap(0, CFG.seaZ);
      g.fillStyle = '#2e7fa8'; g.fillRect(0, seaY, S, S - seaY);
      g.fillStyle = '#e8d29a'; g.fillRect(0, seaY - 4, S, 4);
      // roads
      g.strokeStyle = '#5a6270'; g.lineWidth = 4;
      for (let v = -half; v <= half; v += CFG.block) {
        const [x1, y1] = toMap(v, -half), [x2, y2] = toMap(v, half);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        const [x3, y3] = toMap(-half, v), [x4, y4] = toMap(half, v);
        g.beginPath(); g.moveTo(x3, y3); g.lineTo(x4, y4); g.stroke();
      }
      // blocks — coloured by district (like a real city map, not a grey grid)
      for (let x = -half + 30; x < half; x += 60) for (let z = -half + 30; z < 170; z += 60) {
        const [bx, bz] = toMap(x, z);
        let col = 'rgba(120,140,110,0.5)';
        if (z > 130) col = 'rgba(232,201,138,0.65)'; // beachfront sand
        else if (x < -80 && z < 60) col = 'rgba(224,168,120,0.55)'; // market
        else if (Math.abs(x) < 110 && Math.abs(z) < 100) col = 'rgba(184,196,201,0.55)'; // downtown
        g.fillStyle = col; g.fillRect(bx - 8, bz - 8, 16, 16);
      }
      const dot = (x, z, color, r = 3) => { const [mx, my] = toMap(x, z); g.fillStyle = color; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill(); };
      // mission / activity target
      const mt = G.missions.state.target() || G.progression.activityTarget();
      if (mt) {
        const [mx, my] = toMap(mt.x, mt.z);
        g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(mx, my, 5 + Math.sin(G.time * 4) * 1.5, 0, 7); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(mx, my, 7, 0, 7); g.stroke();
      }
      // traffic
      for (const c of G.traffic.cars) dot(c.x, c.z, '#cfd8dc', 2.5);
      // police
      for (const c of G.police.cars) dot(c.x, c.z, '#ff4444', 3.5);
      for (const c of G.police.cops) dot(c.x, c.z, '#ff8888', 2.5);
      // player arrow
      const p = G.player;
      const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
      const [mx, my] = toMap(px, pz);
      const heading = p.car ? p.car.heading : p.heading;
      g.save(); g.translate(mx, my); g.rotate(Math.PI - heading);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill();
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2);
      g.fillStyle = '#fff'; g.font = 'bold 11px sans-serif'; g.fillText('N', S / 2 - 4, 12);
    },
  };
}
