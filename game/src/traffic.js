// Traffic AI (cars loop the street grid) + pedestrians (sidewalks, react to danger).
import * as THREE from 'three';
import { CFG, PAL } from './config.js';
import { createCar, driveCar } from './vehicles.js';

export function createTraffic(scene, city, rng, colliders) {
  const cars = [];
  const peds = [];
  const streets = [];
  for (let v = -city.half; v <= city.half; v += CFG.block) streets.push(v);
  const defs = [
    { id: 't1', name: 'Sedan', kind: 'sedan', color: 0x2e6fd2, price: 0, top: 16, accel: 10 },
    { id: 't2', name: 'Hatch', kind: 'sedan', color: 0xe8e8e8, price: 0, top: 15, accel: 10 },
    { id: 't3', name: 'Van', kind: 'truck', color: 0x8a4fd2, price: 0, top: 14, accel: 9 },
  ];
  // Traffic cars: pick a street, drive along it, turn at intersections, loop.
  for (let i = 0; i < 14; i++) {
    const def = rng.pick(defs);
    const axis = rng.chance(0.5) ? 'x' : 'z';
    const at = rng.pick(streets);
    const along = rng.range(-220, 220);
    const car = createCar(def, axis === 'x' ? along : at, axis === 'x' ? at : along,
      axis === 'x' ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI));
    car.speed = rng.range(8, 14);
    car.axis = axis; car.at = at; car.dir = rng.chance(0.5) ? 1 : -1;
    car.wait = 0;
    scene.add(car.mesh); cars.push(car);
  }
  // Pedestrians: capsule people walking the sidewalks.
  const pedGeo = new THREE.CapsuleGeometry(0.45, 1.0, 3, 8);
  const pedColors = [0xd23b2e, 0x2e6fd2, 0xf2c230, 0x27a35c, 0x8a4fd2, 0xe07b39, 0xe8e8e8];
  for (let i = 0; i < 22; i++) {
    const mesh = new THREE.Mesh(pedGeo, new THREE.MeshLambertMaterial({ color: rng.pick(pedColors) }));
    const x = rng.range(-220, 220), z = rng.range(-220, 190);
    mesh.position.set(x, 1.0, z); mesh.castShadow = true; scene.add(mesh);
    peds.push({
      mesh, x, z, heading: rng.range(0, Math.PI * 2), speed: rng.range(1.2, 2.4),
      panic: 0, alive: true, wait: rng.range(0, 3),
    });
  }
  function nearestRoad(x, z) {
    let best = null, bd = 1e9;
    for (const r of city.roads) {
      const d = r.axis === 'x' ? Math.abs(z - r.at) : Math.abs(x - r.at);
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }
  return {
    cars, peds,
    update(dt, player, dangerPos, time) {
      // --- traffic cars ---
      for (const car of cars) {
        if (car.driver === 'player') continue; // stolen: player drives it
        if (car.wait > 0) { car.wait -= dt; continue; }
        // steer along current street; at an intersection, sometimes turn (no teleport:
        // keep position, the new street is the grid line through the current spot)
        const atEnd = car.axis === 'x'
          ? (car.dir > 0 ? car.x > city.half - 20 : car.x < -city.half + 20)
          : (car.dir > 0 ? car.z > city.half - 20 : car.z < -city.half + 20);
        if (atEnd || rng.chance(dt * 0.05)) {
          if (car.axis === 'x') {
            car.axis = 'z';
            car.at = Math.round(car.x / CFG.block) * CFG.block;
            car.heading = rng.chance(0.5) ? 0 : Math.PI;
          } else {
            car.axis = 'x';
            car.at = Math.round(car.z / CFG.block) * CFG.block;
            car.heading = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
          }
          car.dir = 1;
        }
        // drive straight along the street line
        const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
        let nx = car.x + fx * car.speed * dt, nz = car.z + fz * car.speed * dt;
        // stop for the player car ahead (crude)
        if (player && player.car) {
          const dx = player.car.x - car.x, dz = player.car.z - car.z;
          if (dx * dx + dz * dz < 64 && Math.abs(fx * dx + fz * dz) > 0) { car.wait = 0.6; continue; }
        }
        // stay in bounds
        if (Math.abs(nx) > city.half - 8 || Math.abs(nz) > city.half - 8) { car.heading += Math.PI; continue; }
        car.x = nx; car.z = nz;
        car.mesh.position.set(car.x, 0, car.z);
        car.mesh.rotation.y = car.heading;
        const spin = car.speed * dt * 2.4;
        for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
      }
      // --- pedestrians ---
      for (const p of peds) {
        if (!p.alive) continue;
        if (p.wait > 0) { p.wait -= dt; continue; }
        if (dangerPos) {
          const dx = p.x - dangerPos.x, dz = p.z - dangerPos.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < 900) { p.panic = 2.5; p.heading = Math.atan2(dx, dz); }
        }
        if (p.panic > 0) p.panic -= dt;
        const sp = p.panic > 0 ? 5.5 : p.speed;
        p.x += Math.sin(p.heading) * sp * dt;
        p.z += Math.cos(p.heading) * sp * dt;
        if (Math.abs(p.x) > 235 || Math.abs(p.z) > 235 || p.z > 205) p.heading += Math.PI * 0.7;
        if (rng.chance(dt * 0.08)) p.heading += rng.range(-1.2, 1.2);
        // keep on sidewalks: snap near a road line
        const r = nearestRoad(p.x, p.z);
        if (r) {
          if (r.axis === 'x') p.z += Math.max(-1, Math.min(1, (r.at + 9 - p.z))) * dt * 0.5;
          else p.x += Math.max(-1, Math.min(1, (r.at + 9 - p.x))) * dt * 0.5;
        }
        p.mesh.position.set(p.x, 1.0 + Math.abs(Math.sin(time * 6 + p.x)) * 0.08, p.z);
        p.mesh.rotation.y = p.heading;
      }
    },
  };
}
