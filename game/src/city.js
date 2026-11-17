// COSTA ALBA city builder — REBUILT LOOK (v2): sunset sky dome + sun disc, mountains,
// varied facades, storefronts with signs, a real beach (umbrellas, towels, lifeguard,
// boats, foam, sun glitter on the sea) and palm-lined beachfront. Same street grid,
// same colliders/roads API as v1 — the engine, missions and playtest are untouched.
import * as THREE from 'three';
import { CFG, PAL, DISTRICTS, PLACES } from './config.js';

// Deterministic 0..1 from grid coords (no rng calls — keeps the building layout stable).
function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function facadeTexture(rng, base, floors) {
  // Warm sunset facades: lit windows glow amber, unlit ones go dusk-blue.
  return canvasTex(128, 256, (g) => {
    g.fillStyle = '#' + base.toString(16).padStart(6, '0'); g.fillRect(0, 0, 128, 256);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 128, 8); // cornice shadow
    g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, 246, 128, 10); // ground band
    const cols = 4, rows = Math.max(3, floors);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const lit = rng.chance(0.45);
      g.fillStyle = lit ? '#ffe9a8' : (rng.chance(0.5) ? '#7a9ab0' : '#2a3a4a');
      g.fillRect(10 + x * 28, 20 + y * Math.floor(220 / rows), 18, 14);
      if (lit) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(10 + x * 28, 20 + y * Math.floor(220 / rows), 18, 3); }
    }
  });
}

const SIGN_NAMES = ['TACOS', 'MOTEL PALMA', 'SURF SHOP', 'CAFÉ SOL', 'BAR LUNA', 'HOTEL', 'PIZZA', 'NEON', 'FISH', 'TATTOO', 'CANTINA', 'DONUTS'];
const SIGN_COLORS = ['#c0392b', '#1e6f8e', '#d98c1e', '#2e7d4f', '#7a3a8e', '#a03d1e'];
const signTexCache = {};
function signTexture(name, color) {
  const key = name + color;
  if (signTexCache[key]) return signTexCache[key];
  const t = canvasTex(512, 64, (g) => {
    g.fillStyle = color; g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#fff'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, 256, 34);
  });
  signTexCache[key] = t;
  return t;
}

export function buildCity(scene, rng) {
  const colliders = [];
  const roads = [];
  const group = new THREE.Group(); group.name = 'city'; scene.add(group);
  const half = CFG.city / 2;

  // --- Sunset sky dome: vertical gradient, bright warm horizon, deep purple zenith.
  const skyTex = canvasTex(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#241640'); gr.addColorStop(0.35, '#6b2a5e'); gr.addColorStop(0.55, '#d84a5e');
    gr.addColorStop(0.75, '#ff8a4a'); gr.addColorStop(0.9, '#ffc46b'); gr.addColorStop(1, '#ffe9a8');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(780, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; group.add(sky);

  // --- Sun disc: low in the south-southwest, visible when the camera looks to the sea.
  const sunTex = canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 8, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.35, 'rgba(255,200,110,0.95)');
    gr.addColorStop(0.7, 'rgba(255,120,60,0.45)'); gr.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }));
  sunDisc.position.set(-70, 62, 520); sunDisc.lookAt(0, 40, 0); group.add(sunDisc);

  // --- Mountains on the north horizon + headlands in the sea (hazy purple silhouettes).
  const mtnMat = new THREE.MeshLambertMaterial({ color: 0x5a3a6e, flatShading: true });
  const mtns = [[-320, -390, 110, 150], [-140, -410, 150, 190], [60, -400, 120, 160], [260, -390, 140, 175], [380, 330, 70, 90], [-390, 350, 80, 100]];
  for (const [mx, mz, mr, mh] of mtns) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 7), mtnMat);
    m.position.set(mx, mh / 2 - 4, mz); group.add(m);
  }

  // Ground: warm grass base, sand strip at the south, sea beyond.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CFG.city + 260, CFG.city + 260),
    new THREE.MeshLambertMaterial({ color: 0x7a9a58 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 0); ground.receiveShadow = true; group.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(CFG.city + 260, 70),
    new THREE.MeshLambertMaterial({ color: PAL.sand }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, CFG.seaZ + 5); sand.receiveShadow = true; group.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 400),
    new THREE.MeshPhongMaterial({ color: PAL.sea, shininess: 140, transparent: true, opacity: 0.94 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.05, CFG.seaZ + 240); group.add(sea);
  // Sun glitter path on the water, toward the sun's azimuth.
  const glitterTex = canvasTex(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,180,90,0)'); gr.addColorStop(0.5, 'rgba(255,180,90,0.75)'); gr.addColorStop(1, 'rgba(255,180,90,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const glitter = new THREE.Mesh(new THREE.PlaneGeometry(90, 320),
    new THREE.MeshBasicMaterial({ map: glitterTex, transparent: true, opacity: 0.55, depthWrite: false }));
  glitter.rotation.x = -Math.PI / 2; glitter.position.set(-40, 0.08, CFG.seaZ + 130); group.add(glitter);
  // Foam line where the waves meet the sand.
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(760, 3),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.07, CFG.seaZ + 38); group.add(foam);

  // Streets: asphalt strips + sidewalks + dashed centre lines.
  const roadMat = new THREE.MeshLambertMaterial({ color: PAL.asphalt });
  const walkMat = new THREE.MeshLambertMaterial({ color: PAL.sidewalkCol });
  const lineMat = new THREE.MeshBasicMaterial({ color: PAL.line });
  const streets = [];
  for (let v = -half; v <= half; v += CFG.block) streets.push(v);
  for (const v of streets) {
    for (const axis of ['x', 'z']) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(CFG.city, CFG.roadW), roadMat);
      road.rotation.x = -Math.PI / 2;
      if (axis === 'x') { road.position.set(0, 0.01, v); road.rotation.z = 0; }
      else { road.position.set(v, 0.01, 0); road.rotation.z = Math.PI / 2; }
      road.receiveShadow = true; group.add(road);
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(CFG.city, CFG.roadW + CFG.sidewalk * 2), walkMat);
      walk.rotation.x = -Math.PI / 2; walk.position.set(axis === 'x' ? 0 : v, 0.005, axis === 'x' ? v : 0);
      if (axis === 'z') walk.rotation.z = Math.PI / 2;
      group.add(walk);
      roads.push({ axis, at: v, from: -half, to: half });
      for (let d = -half + 10; d < half - 10; d += 12) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.5), lineMat);
        dash.rotation.x = -Math.PI / 2;
        if (axis === 'x') dash.position.set(d, 0.015, v);
        else { dash.position.set(v, 0.015, d); dash.rotation.z = Math.PI / 2; }
        group.add(dash);
      }
    }
  }

  // Buildings, one per block cell (skip beach, plazas, special places).
  // All 8 palette colours now (v1 used only the first 4) + warm lit windows.
  const facades = PAL.building.map((c) => facadeTexture(rng, c, 6));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofMats = [0x6a4a3a, 0x4a5a6a, 0x7a3a3a, 0x3a4a3a].map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const placed = [];
  const reserved = [
    { x: PLACES.garage.x, z: PLACES.garage.z, r: 34 },
    { x: PLACES.hospital.x, z: PLACES.hospital.z, r: 34 },
    { x: PLACES.villa.x, z: PLACES.villa.z, r: 34 },
    { x: 0, z: 0, r: 40 }, // central plaza
  ];
  let placedCount = 0;
  for (let bx = -half + CFG.block / 2; bx < half; bx += CFG.block) {
    for (let bz = -half + CFG.block / 2; bz < half; bz += CFG.block) {
      if (bz > 170) continue; // beach, no buildings
      if (reserved.some((p) => Math.abs(bx - p.x) < p.r && Math.abs(bz - p.z) < p.r)) continue;
      if (rng.chance(0.12)) continue; // empty lot / park
      const d = DISTRICTS.find((dd) => Math.abs(bx - dd.cx) < dd.hw && Math.abs(bz - dd.cz) < dd.hd)
        || DISTRICTS[2];
      const h = rng.range(d.h[0], d.h[1]);
      const w = rng.range(22, 38), dep = rng.range(22, 38);
      const tex = rng.pick(facades);
      const mat = new THREE.MeshLambertMaterial({ map: tex });
      const b = new THREE.Mesh(boxGeo, mat);
      b.scale.set(w, h, dep);
      b.position.set(bx + rng.range(-4, 4), h / 2, bz + rng.range(-4, 4));
      b.castShadow = true; b.receiveShadow = true; group.add(b);
      // Roof: varied colour + a parapet lip; some roofs get a water tower or AC box.
      const roof = new THREE.Mesh(boxGeo, rng.pick(roofMats));
      roof.scale.set(w + 1, 1, dep + 1); roof.position.set(b.position.x, h + 0.5, b.position.z);
      group.add(roof);
      const hv = hash2(bx, bz);
      if (hv < 0.22) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 4, 8),
          new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
        tower.position.set(b.position.x + w * 0.2, h + 3, b.position.z); tower.castShadow = true; group.add(tower);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2, 8),
          new THREE.MeshLambertMaterial({ color: 0x5a3a2a }));
        cap.position.set(b.position.x + w * 0.2, h + 6, b.position.z); group.add(cap);
      } else if (hv < 0.45) {
        const ac = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x9aa4a8 }));
        ac.scale.set(3, 1.2, 2); ac.position.set(b.position.x - w * 0.2, h + 1.1, b.position.z); group.add(ac);
      }
      colliders.push({ minX: b.position.x - w / 2, maxX: b.position.x + w / 2, minZ: b.position.z - dep / 2, maxZ: b.position.z + dep / 2 });
      placed.push({ x: b.position.x, z: b.position.z, w, h, dep, district: d });
      placedCount++;
    }
  }

  // Storefronts: awning + lit sign on the south face of beachfront / market buildings.
  // (South faces the camera in the sunset shots, so the signs read.)
  const awningCols = [0xc0392b, 0x1e6f8e, 0xd98c1e, 0x2e7d4f, 0x7a3a8e, 0xe8e8e8];
  for (const p of placed) {
    const isShop = (p.district.name === 'Marina Bay' || p.district.name === 'Market Quarter' || p.district.name === 'Palm Row')
      && hash2(p.x + 7, p.z - 3) < 0.55;
    if (!isShop) continue;
    const awCol = awningCols[Math.floor(hash2(p.x, p.z + 11) * awningCols.length)];
    const awn = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: awCol }));
    awn.scale.set(Math.min(p.w * 0.7, 18), 0.35, 3.2);
    awn.position.set(p.x, 3.4, p.z + p.dep / 2 + 1.4); awn.rotation.x = 0.25; group.add(awn);
    const name = SIGN_NAMES[Math.floor(hash2(p.x - 5, p.z + 9) * SIGN_NAMES.length)];
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(p.w * 0.72, 18), 1.7),
      new THREE.MeshBasicMaterial({ map: signTexture(name, SIGN_COLORS[Math.floor(hash2(p.x + 3, p.z) * SIGN_COLORS.length)]) }));
    sign.position.set(p.x, 5.4, p.z + p.dep / 2 + 0.25); group.add(sign);
  }
  return { group, colliders, roads, placed: placedCount, sea, half };
}

// Street props + landmark buildings + beach life. Call after buildCity.

export function buildProps(scene, rng, colliders) {
  const group = new THREE.Group(); group.name = 'props'; scene.add(group);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8e44, flatShading: true });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2a2f36 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 8, 6);
  // Palm crown: one downward cone = a canopy silhouette against the sunset sky.
  const crownGeo = new THREE.ConeGeometry(3.1, 2.8, 7);
  crownGeo.rotateX(Math.PI); // apex down

  function palm(x, z, s = 1) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 4; trunk.castShadow = true; t.add(trunk);
    const crown = new THREE.Mesh(crownGeo, leafMat);
    crown.position.y = 8.6; crown.scale.set(s, s, s); crown.rotation.y = rng.range(0, Math.PI); t.add(crown);
    t.position.set(x, 0, z); group.add(t);
  }
  // Palm rows: beach edge, promenade, and framing the beachfront chase road (x=60).
  // Keep |x| < 14 clear on the beach rows — the foot shot's camera looks straight
  // down x=0 toward the sea, and a palm crown 2 units from the lens fills the frame.
  for (let x = -220; x <= 220; x += 22) { const px = x + rng.range(-4, 4); if (Math.abs(px) < 14) continue; palm(px, 196 + rng.range(-3, 3)); }
  for (let x = -200; x <= 200; x += 40) { if (Math.abs(x) < 14) continue; if (rng.chance(0.6)) palm(x, 172 + rng.range(-2, 2)); }
  for (let z = 100; z <= 190; z += 30) { palm(52 + rng.range(-2, 2), z, 1.1); palm(68 + rng.range(-2, 2), z + 15, 1.1); }

  // Street lamps at intersections (warm bulbs — sunset).
  const lampGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 5);
  for (let x = -240; x <= 240; x += 60) for (let z = -240; z <= 180; z += 60) {
    if (rng.chance(0.5)) continue;
    const pole = new THREE.Mesh(lampGeo, lampMat); pole.position.set(x + 9, 3, z + 9); group.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), bulbMat);
    bulb.position.set(x + 9, 6.2, z + 9); group.add(bulb);
  }

  // --- Beach life: umbrellas, towels, lifeguard tower, boats.
  const umbCols = [0xe84a3a, 0xf2c230, 0x2e8e8e, 0xe87b39, 0xffffff, 0x3a6fd2];
  const umbGeo = new THREE.ConeGeometry(2.4, 1.4, 8);
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 5);
  for (let i = 0; i < 22; i++) {
    const x = -215 + i * 20 + rng.range(-6, 6), z = 212 + rng.range(0, 18);
    const pole = new THREE.Mesh(poleGeo, lampMat); pole.position.set(x, 1.3, z); group.add(pole);
    const umb = new THREE.Mesh(umbGeo, new THREE.MeshLambertMaterial({ color: umbCols[i % umbCols.length] }));
    umb.position.set(x, 3.1, z); umb.castShadow = true; group.add(umb);
    if (rng.chance(0.7)) {
      const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1),
        new THREE.MeshLambertMaterial({ color: umbCols[(i + 2) % umbCols.length] }));
      towel.rotation.x = -Math.PI / 2; towel.position.set(x + rng.range(-3, 3), 0.06, z + rng.range(2, 5)); group.add(towel);
    }
  }
  // Lifeguard tower at the promenade.
  const lg = new THREE.Group();
  const lgMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
  const lgRed = new THREE.MeshLambertMaterial({ color: 0xd23b2e });
  for (const [sx, sz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), lgMat);
    leg.position.set(sx, 2, sz); lg.add(leg);
  }
  const hut = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2, 3), lgMat); hut.position.y = 5; lg.add(hut);
  const lgRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.4, 4), lgRed); lgRoof.position.y = 6.7; lgRoof.rotation.y = Math.PI / 4; lg.add(lgRoof);
  lg.position.set(30, 0, 216); group.add(lg);

  // Boats on the water (hull + mast + sail).
  const boatCols = [0xe8e8e8, 0xd23b2e, 0x2e6fd2];
  for (let i = 0; i < 3; i++) {
    const bx = [-150, 40, 190][i], bz = 300 + i * 40;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 8),
      new THREE.MeshLambertMaterial({ color: boatCols[i] }));
    hull.position.set(bx, 0.6, bz); group.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 5), lampMat);
    mast.position.set(bx, 4, bz); group.add(mast);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 4),
      new THREE.MeshLambertMaterial({ color: 0xf2e6d0 }));
    sail.position.set(bx, 5.5, bz); sail.rotation.y = Math.PI / 4; group.add(sail);
  }

  // Landmark: Vela Motors garage (box + sign), Alba General hospital (white slab + cross), Salazar villa.
  function landmark(x, z, w, h, d, color, sign, signColor) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; group.add(m);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    if (sign) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 64;
      const g = c.getContext('2d'); g.fillStyle = signColor; g.fillRect(0, 0, 512, 64);
      g.fillStyle = '#fff'; g.font = 'bold 36px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(sign, 256, 34);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const board = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, 3),
        new THREE.MeshBasicMaterial({ map: tex }));
      board.position.set(x, h + 2.2, z + d / 2 + 0.2); group.add(board);
    }
    return m;
  }
  landmark(PLACES.garage.x, PLACES.garage.z, 34, 9, 22, 0xc96a3a, 'VELA MOTORS', '#a03d1e');
  landmark(PLACES.hospital.x, PLACES.hospital.z, 36, 16, 24, 0xeef2f2, 'ALBA GENERAL', '#2a7a8c');
  landmark(PLACES.villa.x, PLACES.villa.z, 30, 12, 26, 0xe8dcc8, "SALAZAR'S VILLA", '#5a3a6a');

  // Central plaza: fountain + benches.
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 1.2, 20),
    new THREE.MeshLambertMaterial({ color: 0xb8b0a0 }));
  basin.position.set(0, 0.6, 0); basin.castShadow = true; group.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.5, 20),
    new THREE.MeshPhongMaterial({ color: 0x2e7fa8, shininess: 140 }));
  water.position.set(0, 1.3, 0); group.add(water);
  colliders.push({ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }); // fountain blocks cars and feet

  // Harbor pier.
  const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 60),
    new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
  pier.position.set(-180, 0.5, 225); group.add(pier);
  return group;
}
