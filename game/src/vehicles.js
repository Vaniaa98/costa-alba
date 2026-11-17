// Cars v2: shaped meshes (hood, cabin, spoiler, grille, glowing lights) so a car
// reads as a car at chase-cam distance — plus a police light bar (red+blue, always
// lit, glow pulses) and a police helicopter. Physics (driveCar) unchanged from v1.
import * as THREE from 'three';
import { CFG } from './config.js';

const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.32, 12);
const hubGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 8);
const glassMat = new THREE.MeshPhongMaterial({ color: 0x18242e, shininess: 200 });
const tireMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
const hubMat = new THREE.MeshLambertMaterial({ color: 0xc8ccd0 });
const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
const grilleMat = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });

// Radial glow texture for the light-bar halos (shared).
let glowTex = null;
function getGlowTex() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

export function makeCarMesh(def, withLights = true) {
  const g = new THREE.Group();
  const isPolice = def.kind === 'police';
  const bodyColor = isPolice ? 0xeef2f2 : def.color;
  const bodyMat = new THREE.MeshPhongMaterial({ color: bodyColor, shininess: 110 });
  const len = def.kind === 'truck' ? 4.6 : def.kind === 'sport' ? 4.3 : 4.1;
  const wid = 1.95, h = def.kind === 'truck' ? 1.4 : 0.8;
  // Main body (low, wide) + hood + trunk deck so the silhouette is a car, not a box.
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(wid, h, len); body.position.y = 0.72; body.castShadow = true; g.add(body);
  const hood = new THREE.Mesh(bodyGeo, bodyMat);
  hood.scale.set(wid * 0.92, 0.42, 1.1); hood.position.set(0, 0.62, len / 2 - 0.55); hood.castShadow = true; g.add(hood);
  const trunk = new THREE.Mesh(bodyGeo, bodyMat);
  trunk.scale.set(wid * 0.92, 0.45, 0.9); trunk.position.set(0, 0.64, -len / 2 + 0.45); g.add(trunk);
  // Cabin: dark glass, set back, narrower — with a sloped look from the windshield strip.
  const cabin = new THREE.Mesh(bodyGeo, glassMat);
  const cw = wid * 0.78, ch = 0.62, cl = def.kind === 'truck' ? 1.1 : 1.8;
  cabin.scale.set(cw, ch, cl);
  cabin.position.set(0, 0.72 + h / 2 + ch / 2 - 0.08, def.kind === 'truck' ? 0.8 : -0.25);
  cabin.castShadow = true; g.add(cabin);
  if (def.kind === 'truck') {
    const bed = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x3a3f46 }));
    bed.scale.set(wid * 0.92, 0.5, 1.8); bed.position.set(0, 1.3, -1.3); g.add(bed);
  }
  if (def.kind === 'sport') {
    // Rear spoiler.
    const wing = new THREE.Mesh(bodyGeo, bodyMat);
    wing.scale.set(wid * 0.9, 0.08, 0.5); wing.position.set(0, 1.35, -len / 2 + 0.15); g.add(wing);
    for (const sx of [-0.8, 0.8]) {
      const strut = new THREE.Mesh(bodyGeo, bodyMat);
      strut.scale.set(0.08, 0.3, 0.3); strut.position.set(sx, 1.18, -len / 2 + 0.15); g.add(strut);
    }
  }
  // Grille + bumper strips.
  const grille = new THREE.Mesh(bodyGeo, grilleMat);
  grille.scale.set(wid * 0.6, 0.22, 0.08); grille.position.set(0, 0.62, len / 2 + 0.02); g.add(grille);
  const bumper = new THREE.Mesh(bodyGeo, grilleMat);
  bumper.scale.set(wid * 0.96, 0.14, 0.08); bumper.position.set(0, 0.32, len / 2 + 0.02); g.add(bumper);
  // Wheels with silver hubs.
  const wheels = [];
  for (const [wx, wz] of [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.35], [0.88, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.46, wz); w.castShadow = true;
    g.add(w); wheels.push(w);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2; hub.position.set(wx, 0.46, wz); g.add(hub);
  }
  if (withLights) {
    // Big headlights + a full-width red taillight strip.
    for (const sx of [-0.62, 0.62]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.1), lightMat);
      hl.position.set(sx, 0.82, len / 2 + 0.03); g.add(hl);
    }
    const tl = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.8, 0.2, 0.1), tailMat);
    tl.position.set(0, 0.82, -len / 2 - 0.03); g.add(tl);
  }
  // --- Police livery + light bar (the GTA signature). ---
  let lightBar = null;
  if (isPolice) {
    // Dark blue doors stripe.
    const stripe = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
    stripe.scale.set(wid + 0.04, 0.34, len * 0.62); stripe.position.set(0, 0.72, -0.1); g.add(stripe);
    // Light bar: red left, blue right — both lit at once (a still frame shows both).
    const barBase = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x222831 }));
    barBase.scale.set(1.3, 0.16, 0.4); barBase.position.set(0, 1.62, -0.25); g.add(barBase);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x2266ff });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.36), redMat);
    red.position.set(-0.33, 1.78, -0.25); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.36), blueMat);
    blue.position.set(0.33, 1.78, -0.25); g.add(blue);
    // Glow halos (pulse alternately in police.update; a still frame shows both).
    const tex = getGlowTex();
    const redGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: tex, color: 0xff3333, transparent: true, opacity: 0.7, depthWrite: false }));
    redGlow.position.set(-0.33, 1.85, -0.25); g.add(redGlow);
    const blueGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: tex, color: 0x3388ff, transparent: true, opacity: 0.7, depthWrite: false }));
    blueGlow.position.set(0.33, 1.85, -0.25); g.add(blueGlow);
    lightBar = { red, blue, redGlow, blueGlow, redMat, blueMat };
  }
  g.userData = { len, wid, wheels, lightBar };
  return g;
}

// Police helicopter: dark body, tail boom, spinning main rotor, skids, searchlight cone.
export function makeHelicopter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0x1a2a4a, shininess: 80 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(2.2, 1.6, 4.2); body.position.y = 0; body.castShadow = true; g.add(body);
  const nose = new THREE.Mesh(bodyGeo, glassMat);
  nose.scale.set(1.8, 1.1, 1.2); nose.position.set(0, 0.1, 2.4); g.add(nose);
  const boom = new THREE.Mesh(bodyGeo, bodyMat);
  boom.scale.set(0.5, 0.5, 4.5); boom.position.set(0, 0.3, -4); g.add(boom);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.9), bodyMat);
  tail.position.set(0, 0.6, -6.1); g.add(tail);
  // Main rotor (spins) + tail rotor.
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x222831 }));
  rotor.position.y = 1.15; g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x222831 }));
  tailRotor.position.set(0.35, 0.6, -6.1); g.add(tailRotor);
  // Skids.
  for (const sx of [-0.9, 0.9]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.6),
      new THREE.MeshLambertMaterial({ color: 0x222831 }));
    skid.position.set(sx, -1.1, 0.4); g.add(skid);
  }
  // Searchlight cone (translucent, points down-forward).
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 9, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  cone.rotation.x = Math.PI * 0.85; cone.position.set(0, -4.5, 3.5); g.add(cone);
  // White "CAPD" belly stripe.
  const stripe = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0xeef2f2 }));
  stripe.scale.set(2.24, 0.3, 3.2); stripe.position.set(0, -0.4, 0.3); g.add(stripe);
  g.userData = { rotor, tailRotor };
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
    if ((nx - cx) * (nx - cx) + (nz - cz) * (nz - cz) < 1.6 * 1.6) { hit = true; break; }
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
