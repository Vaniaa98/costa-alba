// Wanted system 0-5 stars + police cars + foot cops that chase and arrest.
import * as THREE from 'three';
import { CFG, CARS } from './config.js';
import { createCar, makeHelicopter } from './vehicles.js';
import { makePersonMesh } from './player.js';

export function createPolice(scene, rng, colliders) {
  return {
    wanted: 0, lastCrime: -999, cars: [], cops: [], heli: null,
    spawnTimer: 0,
    // Light bar: both colours stay lit (a still frame shows red AND blue);
    // the glow halos pulse alternately so it flashes in motion.
    flashLights(time) {
      const phase = Math.floor(time * 4) % 2 === 0;
      for (const car of this.cars) {
        const lb = car.mesh.userData.lightBar;
        if (!lb) continue;
        lb.redGlow.material.opacity = phase ? 0.95 : 0.35;
        lb.blueGlow.material.opacity = phase ? 0.35 : 0.95;
      }
    },
    spawnHeli(player) {
      if (this.heli) return this.heli;
      const mesh = makeHelicopter();
      scene.add(mesh);
      this.heli = { mesh, x: player.x + 18, z: player.z - 30, y: 26, heading: 0 };
      return this.heli;
    },
    removeHeli() {
      if (!this.heli) return;
      scene.remove(this.heli.mesh);
      this.heli = null;
    },
    addWanted(n, time) {
      this.wanted = Math.min(5, this.wanted + n);
      this.lastCrime = time;
    },
    spawnCar(x, z, heading) {
      const def = CARS.find((c) => c.id === 'police');
      const car = createCar(def, x, z, heading);
      car.isPolice = true; car.speed = 10;
      scene.add(car.mesh); this.cars.push(car);
      return car;
    },
    spawnCop(x, z) {
      const mesh = makePersonMesh(0x1a2a4a, 0x1a2a4a);
      mesh.position.set(x, 0, z); scene.add(mesh);
      const cop = { mesh, x, z, heading: 0, catchTime: 0, speed: CFG.copSpeed };
      this.cops.push(cop);
      return cop;
    },
    update(dt, time, player, city, effects, audio) {
      // wanted decay when quiet
      if (this.wanted > 0 && time - this.lastCrime > CFG.wantedDecay) {
        this.wanted--; this.lastCrime = time;
      }
      this.flashLights(time);
      // Helicopter overhead at 3+ stars (the GTA signature) — hovers above the
      // player, rotor spinning, searchlight sweeping. Gone when the heat is off.
      const px0 = player.car ? player.car.x : player.x;
      const pz0 = player.car ? player.car.z : player.z;
      if (this.wanted >= 3) {
        const h = this.spawnHeli(player);
        h.heading += dt * 0.25;
        h.x += ((px0 + 16) - h.x) * Math.min(1, dt * 0.7);
        h.z += ((pz0 - 26) - h.z) * Math.min(1, dt * 0.7);
        h.y = 26 + Math.sin(time * 1.4) * 1.5;
        h.mesh.position.set(h.x, h.y, h.z);
        h.mesh.rotation.y = h.heading;
        h.mesh.userData.rotor.rotation.y += dt * 22;
        h.mesh.userData.tailRotor.rotation.x += dt * 30;
      } else if (this.heli) this.removeHeli();
      // desired force scales with stars
      const wantCars = this.wanted === 0 ? 0 : this.wanted <= 1 ? 1 : this.wanted <= 2 ? 2 : this.wanted <= 3 ? 2 : this.wanted <= 4 ? 3 : 4;
      const wantCops = this.wanted <= 2 ? 0 : this.wanted <= 3 ? 1 : this.wanted <= 4 ? 2 : 3;
      this.spawnTimer -= dt;
      if (this.cars.length < wantCars && this.spawnTimer <= 0) {
        this.spawnTimer = 2;
        const a = rng.range(0, Math.PI * 2);
        const x = player.x + Math.sin(a) * 55, z = player.z + Math.cos(a) * 55;
        this.spawnCar(Math.max(-230, Math.min(230, x)), Math.max(-230, Math.min(200, z)), a);
      }
      if (this.cops.length < wantCops && player.onFoot && this.spawnTimer <= 0) {
        this.spawnTimer = 2;
        const a = rng.range(0, Math.PI * 2);
        this.spawnCop(player.x + Math.sin(a) * 25, player.z + Math.cos(a) * 25);
      }
      // police cars: pursuit steering toward the player, ram on contact
      const px = player.car ? player.car.x : player.x;
      const pz = player.car ? player.car.z : player.z;
      for (let i = this.cars.length - 1; i >= 0; i--) {
        const car = this.cars[i];
        const dx = px - car.x, dz = pz - car.z;
        const dist = Math.hypot(dx, dz);
        if (this.wanted === 0 || dist > 160) {
          // give up: drive away and despawn
          car.heading += Math.PI * dt * 0.2;
          car.speed = Math.min(car.speed + 10 * dt, 20);
          car.x += Math.sin(car.heading) * car.speed * dt;
          car.z += Math.cos(car.heading) * car.speed * dt;
          if (dist > 180) { scene.remove(car.mesh); this.cars.splice(i, 1); continue; }
        } else {
          const want = Math.atan2(dx, dz);
          let dh = want - car.heading;
          while (dh > Math.PI) dh -= Math.PI * 2;
          while (dh < -Math.PI) dh += Math.PI * 2;
          car.heading += Math.max(-2.4, Math.min(2.4, dh)) * dt;
          car.speed = Math.min(car.speed + 22 * dt, CFG.policeCarSpeed);
          car.x += Math.sin(car.heading) * car.speed * dt;
          car.z += Math.cos(car.heading) * car.speed * dt;
          if (dist < 3.4) {
            // ram!
            if (player.car) {
              player.car.health -= 14 * dt * 10;
              player.car.speed *= 0.6;
              if (effects) effects.burst(car.x, 1, car.z, 0xffaa33, 8);
              if (audio) audio.crash();
              if (player.car.health <= 0) player.car.crashed = true;
            }
          }
        }
        car.mesh.position.set(car.x, 0, car.z);
        car.mesh.rotation.y = car.heading;
        const spin = car.speed * dt * 2.4;
        for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
      }
      // foot cops: run at the player, arrest on contact
      for (let i = this.cops.length - 1; i >= 0; i--) {
        const cop = this.cops[i];
        const dx = player.x - cop.x, dz = player.z - cop.z;
        const dist = Math.hypot(dx, dz);
        if (this.wanted === 0 || !player.onFoot || dist > 90) {
          scene.remove(cop.mesh); this.cops.splice(i, 1); continue;
        }
        cop.heading = Math.atan2(dx, dz);
        cop.x += Math.sin(cop.heading) * cop.speed * dt;
        cop.z += Math.cos(cop.heading) * cop.speed * dt;
        cop.mesh.position.set(cop.x, 0, cop.z);
        cop.mesh.rotation.y = cop.heading;
        if (dist < CFG.copCatch) {
          cop.catchTime += dt;
          if (cop.catchTime > CFG.copCatchTime) player.busted = true;
        } else cop.catchTime = 0;
      }
      if (audio) audio.siren(this.wanted > 0, time);
    },
  };
}
