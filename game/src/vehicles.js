// Cars: box-built meshes + arcade driving physics (accel, steer, grip, collisions).
import * as THREE from 'three';
import { CFG } from './config.js';

const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
const cabinGeo = new THREE.BoxGeometry(1, 1, 1);
const glassMat = new THREE.MeshPhongMaterial({ color: 0x1a2a3a, shininess: 160 });
const tireMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });

export function makeCarMesh(def, withLights = true) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhongMaterial({ color: def.color, shininess: 90 });
  const len = def.kind === 'truck' ? 4.6 : def.kind === 'sport' ? 4.2 : 4.0;
  const wid = 1.9, h = def.kind === 'truck' ? 1.5 : 0.85;
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(wid, h, len); body.position.y = 0.75; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  const cw = wid * 0.8, ch = 0.7, cl = def.kind === 'truck' ? 1.2 : 1.9;
  cabin.scale.set(cw, ch, cl);
  cabin.position.set(0, 0.75 + h / 2 + ch / 2 - 0.1, def.kind === 'truck' ? 0.7 : -0.2);
  cabin.castShadow = true; g.add(cabin);
  if (def.kind === 'truck') {
    const bed = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x3a3f46 }));
    bed.scale.set(wid * 0.92, 0.5, 1.8); bed.position.set(0, 1.35, -1.2); g.add(bed);
  }
  // wheels
  const wheels = [];
  for (const [wx, wz] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); w.castShadow = true;
    g.add(w); wheels.push(w);
  }
  if (withLights) {
    for (const sx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
      hl.position.set(sx, 0.85, len / 2 + 0.02); g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), tailMat);
      tl.position.set(sx, 0.85, -len / 2 - 0.02); g.add(tl);
    }
  }
  g.userData = { len, wid, wheels };
  return g;
}

// Arcade car: heading, speed, steer. Collides with building AABBs + city bounds.
export function createCar(def, x, z, heading = 0) {
  const mesh = makeCarMesh(def);
  mesh.position.set(x, 0, z); mesh.rotation.y = heading;
  return {
    def, mesh, x, z, heading, speed: 0, steer: 0, health: CFG.carHealth,
    kind: def.kind, color: def.color, driver: null, isPlayer: false, isPolice: def.kind === 'police',
    crashed: false,
  };
}

export function driveCar(car, input, dt, colliders, half) {
  const ax = input ? input.axis() : { x: 0, y: 0 };
  const handbrake = input && input.keys.has(' ');
  const top = car.def.top || CFG.carMax;
  if (ax.y > 0) car.speed += (car.def.accel || CFG.carAccel) * dt;
  else if (ax.y < 0) {
    if (car.speed > 0.5) car.speed -= CFG.carBrake * dt;
    else car.speed -= CFG.carReverse * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  }
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 30 * dt);
  car.speed = Math.max(-CFG.carReverse, Math.min(top, car.speed));
  const steerTarget = -ax.x * CFG.carSteer * Math.min(1, Math.abs(car.speed) / 8);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  if (Math.abs(car.speed) > 0.1) car.heading += car.steer * dt * Math.sign(car.speed) * (handbrake ? 1.6 : 1);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  // collide with buildings (AABB, car as circle r=1.6) and bounds
  let hit = false;
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(nx, c.maxX));
    const cz = Math.max(c.minZ, Math.min(nz, c.maxZ));
    const dx = nx - cx, dz = nz - cz;
    if (dx * dx + dz * dz < 1.6 * 1.6) { hit = true; break; }
  }
  if (Math.abs(nx) > half - 4 || Math.abs(nz) > half - 4 || nz > 236) hit = true;
  if (hit) {
    if (Math.abs(car.speed) > 12) car.health -= Math.abs(car.speed) * 0.4;
    car.speed *= -0.25; // bounce
  } else { car.x = nx; car.z = nz; }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  // spin wheels + lean
  const spin = car.speed * dt * 2.4;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  car.mesh.rotation.z = -car.steer * 0.04 * Math.min(1, Math.abs(car.speed) / 10);
  if (car.health <= 0) car.crashed = true;
}
