// Player: on-foot third-person controller + enter/exit/steal any nearby car.
import * as THREE from 'three';
import { CFG } from './config.js';
import { createCar } from './vehicles.js';

export function makePersonMesh(shirt = 0x2e6fd2, pants = 0x222831) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const shirtM = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsM = new THREE.MeshLambertMaterial({ color: pants });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.35), pantsM);
  legs.position.y = 0.45; legs.castShadow = true; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), shirtM);
  torso.position.y = 1.3; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skin);
  head.position.y = 2.0; head.castShadow = true; g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.55),
    new THREE.MeshLambertMaterial({ color: 0xd23b2e }));
  cap.position.y = 2.28; g.add(cap);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), shirtM);
  armL.position.set(-0.48, 1.3, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.48; g.add(armR);
  g.userData = { legs, torso, armL, armR };
  return g;
}

export function createPlayer(scene, x, z) {
  const mesh = makePersonMesh();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh, x, z, heading: 0, health: CFG.playerHealth, money: CFG.startMoney,
    onFoot: true, car: null, dead: false, busted: false, speed: 0,
    wanted: 0, lastCrime: -999, hidden: 0,
  };
}

// Move on foot. Returns true if the player moved.
export function walkPlayer(player, input, dt, colliders, half, cameraHeading) {
  const ax = input.axis();
  const run = input.run();
  const sp = run ? CFG.runSpeed : CFG.walkSpeed;
  // movement relative to camera heading
  const fx = Math.sin(cameraHeading), fz = Math.cos(cameraHeading);
  const rx = Math.cos(cameraHeading), rz = -Math.sin(cameraHeading);
  let mx = fx * ax.y + rx * ax.x, mz = fz * ax.y + rz * ax.x;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len; mz /= len;
    player.heading = Math.atan2(mx, mz);
    const nx = player.x + mx * sp * dt, nz = player.z + mz * sp * dt;
    let blocked = false;
    for (const c of colliders) {
      if (nx > c.minX - 0.6 && nx < c.maxX + 0.6 && nz > c.minZ - 0.6 && nz < c.maxZ + 0.6) { blocked = true; break; }
    }
    if (Math.abs(nx) > half - 3 || nz > 234 || nz < -half + 3) blocked = true;
    if (!blocked) { player.x = nx; player.z = nz; }
    player.speed = sp;
    // walk bob
    const t = performance.now() / 1000;
    player.mesh.userData.legs.position.y = 0.45 + Math.abs(Math.sin(t * 9)) * 0.08;
  } else player.speed = 0;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  return len > 0.01;
}

// Nearest car within reach (for E: enter/steal).
export function nearestCar(player, cars, maxDist = 4) {
  let best = null, bd = maxDist;
  for (const c of cars) {
    if (c.crashed) continue;
    const dx = c.x - player.x, dz = c.z - player.z;
    const d = Math.hypot(dx, dz);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function enterCar(player, car, steal) {
  player.car = car; player.onFoot = false;
  car.isPlayer = true; car.driver = 'player';
  player.mesh.visible = false;
  return steal;
}

export function exitCar(player, colliders) {
  const car = player.car;
  if (!car) return;
  // step out to the side
  const sx = car.x + Math.cos(car.heading) * 2.2, sz = car.z - Math.sin(car.heading) * 2.2;
  player.x = sx; player.z = sz; player.heading = car.heading;
  player.car = null; player.onFoot = true;
  car.isPlayer = false; car.driver = null; car.speed = 0;
  player.mesh.visible = true;
  player.mesh.position.set(player.x, 0, player.z);
}
