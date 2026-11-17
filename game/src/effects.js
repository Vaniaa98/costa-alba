// Particles (burst, smoke, sparks), skid marks, explosions.
import * as THREE from 'three';

export function createEffects(scene) {
  const pool = [];
  const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  for (let i = 0; i < 120; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    m.visible = false; scene.add(m);
    pool.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0 });
  }
  let cursor = 0;
  const skids = [];
  const skidMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.55 });
  const skidGeo = new THREE.PlaneGeometry(0.5, 2.2);
  function spawn(x, y, z, color, vx, vy, vz, life) {
    const p = pool[cursor]; cursor = (cursor + 1) % pool.length;
    p.mesh.visible = true; p.mesh.material.color.setHex(color);
    p.mesh.position.set(x, y, z);
    p.vx = vx; p.vy = vy; p.vz = vz; p.life = life;
  }
  return {
    burst(x, y, z, color, n = 12) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
        spawn(x, y, z, color, Math.cos(a) * sp, 2 + Math.random() * 5, Math.sin(a) * sp, 0.5 + Math.random() * 0.4);
      }
    },
    smoke(x, y, z) { spawn(x, y, z, 0x888888, (Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2, 1.2); },
    explosion(x, y, z) {
      this.burst(x, y + 1, z, 0xff8800, 30);
      this.burst(x, y + 1, z, 0xffdd33, 18);
      this.burst(x, y + 1, z, 0x666666, 14);
      const flash = new THREE.PointLight(0xffaa33, 60, 40);
      flash.position.set(x, y + 3, z); scene.add(flash);
      setTimeout(() => scene.remove(flash), 180);
    },
    skid(x, z, heading) {
      if (skids.length > 60) { const old = skids.shift(); scene.remove(old); }
      const m = new THREE.Mesh(skidGeo, skidMat);
      m.rotation.x = -Math.PI / 2; m.rotation.z = -heading;
      m.position.set(x, 0.03, z); scene.add(m); skids.push(m);
    },
    update(dt) {
      for (const p of pool) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { p.mesh.visible = false; continue; }
        p.vy -= 9 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y = Math.max(0.15, p.mesh.position.y + p.vy * dt);
        p.mesh.position.z += p.vz * dt;
        p.mesh.material.opacity = Math.min(1, p.life * 2);
      }
    },
  };
}
