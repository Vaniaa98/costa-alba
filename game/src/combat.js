// Combat: pistol (mouse aim) + melee, enemies with health, damage to the player.
import * as THREE from 'three';
import { CFG } from './config.js';
import { makePersonMesh } from './player.js';

export function createCombat(scene, rng) {
  const enemies = [];
  const tracers = [];
  const tracerGeo = new THREE.BoxGeometry(0.08, 0.08, 1.6);
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe14d });
  let cooldown = 0;
  return {
    enemies, mag: 12, reserve: 72, // real ammo: the HUD shows PISTOL mag / reserve
    spawnEnemy(x, z, hp = CFG.enemyHealth) {
      const mesh = makePersonMesh(0x3a3f46, 0x1a1a1a);
      mesh.position.set(x, 0, z); scene.add(mesh);
      const e = { mesh, x, z, heading: 0, health: hp, alive: true, shootTimer: rng.range(0.5, 1.5) };
      enemies.push(e);
      return e;
    },
    clearEnemies() {
      for (const e of enemies) scene.remove(e.mesh);
      enemies.length = 0;
    },
    // Fire the pistol from `from` toward ground point `to`. Returns the enemy hit (or null).
    shoot(from, to, effects, audio) {
      if (cooldown > 0) return null;
      cooldown = CFG.pistolRate;
      // Ammo: one round per shot; the mag reloads instantly from reserve, and the
      // reserve never runs dry (arcade) — so the playtest can never stall on reload.
      this.mag--;
      if (this.mag <= 0) {
        this.reserve = this.reserve <= 12 ? 72 : this.reserve - 12;
        this.mag = 12;
      }
      const dx = to.x - from.x, dz = to.z - from.z;
      const dist = Math.hypot(dx, dz);
      const dir = { x: dx / (dist || 1), z: dz / (dist || 1) };
      // tracer
      const t = new THREE.Mesh(tracerGeo, tracerMat);
      t.position.set(from.x + dir.x * dist / 2, 1.3, from.z + dir.z * dist / 2);
      t.rotation.y = Math.atan2(dir.x, dir.z);
      t.scale.z = dist;
      scene.add(t); tracers.push({ mesh: t, life: 0.08 });
      if (audio) audio.shot();
      // hit test: nearest enemy within 1.2 of the ray
      let best = null, bd = 1.2;
      for (const e of enemies) {
        if (!e.alive) continue;
        const ex = e.x - from.x, ez = e.z - from.z;
        const along = ex * dir.x + ez * dir.z;
        if (along < 0 || along > Math.min(dist, CFG.pistolRange)) continue;
        const perp = Math.abs(ex * dir.z - ez * dir.x);
        if (perp < bd) { bd = perp; best = e; }
      }
      if (best) {
        best.health -= CFG.pistolDamage;
        if (effects) effects.burst(best.x, 1.4, best.z, 0xff4444, 10);
        if (audio) audio.hit();
        if (best.health <= 0) {
          best.alive = false;
          best.mesh.visible = false;
          if (effects) effects.burst(best.x, 1, best.z, 0xff2222, 22);
        }
      }
      return best;
    },
    melee(from, heading, effects, audio) {
      const fx = Math.sin(heading), fz = Math.cos(heading);
      let hit = null;
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - from.x, dz = e.z - from.z;
        const d = Math.hypot(dx, dz);
        if (d < CFG.meleeRange && (dx * fx + dz * fz) > 0) {
          e.health -= CFG.meleeDamage;
          if (e.health <= 0) { e.alive = false; e.mesh.visible = false; }
          hit = e;
          if (effects) effects.burst(e.x, 1.4, e.z, 0xffaa33, 8);
          break;
        }
      }
      if (audio) audio.hit();
      return hit;
    },
    update(dt, player, effects) {
      cooldown = Math.max(0, cooldown - dt);
      // tracers fade
      for (let i = tracers.length - 1; i >= 0; i--) {
        tracers[i].life -= dt;
        if (tracers[i].life <= 0) { scene.remove(tracers[i].mesh); tracers.splice(i, 1); }
      }
      // enemies: walk at the player and shoot
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = player.x - e.x, dz = player.z - e.z;
        const dist = Math.hypot(dx, dz);
        e.heading = Math.atan2(dx, dz);
        if (dist > 14) {
          e.x += Math.sin(e.heading) * 3.2 * dt;
          e.z += Math.cos(e.heading) * 3.2 * dt;
        } else {
          e.shootTimer -= dt;
          if (e.shootTimer <= 0) {
            e.shootTimer = rng.range(1.2, 2.2);
            if (dist < 30 && Math.random() < 0.6) {
              player.health -= 6;
              if (effects) effects.burst(player.x, 1.4, player.z, 0xff6666, 6);
            }
          }
        }
        e.mesh.position.set(e.x, 0, e.z);
        e.mesh.rotation.y = e.heading;
      }
    },
  };
}
