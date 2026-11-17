// COSTA ALBA city builder: street grid, districts, buildings, beach, sea, props.
// Returns colliders + road graph the traffic, police and missions drive on.
import * as THREE from 'three';
import { CFG, PAL, DISTRICTS, PLACES } from './config.js';

function facadeTexture(rng, base, floors) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#' + base.toString(16).padStart(6, '0'); g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 128, 10);
  const cols = 4, rows = Math.max(3, floors);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const lit = rng.chance(0.25);
    g.fillStyle = lit ? '#ffe9a8' : '#9fd4e8';
    g.fillRect(10 + x * 28, 20 + y * Math.floor(220 / rows), 18, 14);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(10 + x * 28, 20 + y * Math.floor(220 / rows), 18, 3);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene, rng) {
  const colliders = [];
  const roads = []; // { axis:'x'|'z', at, from, to }
  const group = new THREE.Group(); group.name = 'city'; scene.add(group);
  const half = CFG.city / 2;

  // Ground: grass-green base, sand strip at the south, sea beyond.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CFG.city + 260, CFG.city + 260),
    new THREE.MeshLambertMaterial({ color: 0x8aa86a }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 0); ground.receiveShadow = true; group.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(CFG.city + 260, 70),
    new THREE.MeshLambertMaterial({ color: PAL.sand }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, CFG.seaZ + 5); sand.receiveShadow = true; group.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 400),
    new THREE.MeshPhongMaterial({ color: PAL.sea, shininess: 120, transparent: true, opacity: 0.92 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.05, CFG.seaZ + 240); group.add(sea);

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
      // dashed centre line
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
  const facades = PAL.building.slice(0, 4).map((c) => facadeTexture(rng, c, 6));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofMat = new THREE.MeshLambertMaterial({ color: PAL.roof });
  const glassMat = new THREE.MeshLambertMaterial({ color: PAL.glass });
  const reserved = [
    { x: PLACES.garage.x, z: PLACES.garage.z, r: 34 },
    { x: PLACES.hospital.x, z: PLACES.hospital.z, r: 34 },
    { x: PLACES.villa.x, z: PLACES.villa.z, r: 34 },
    { x: 0, z: 0, r: 40 }, // central plaza
  ];
  let placed = 0;
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
      const roof = new THREE.Mesh(boxGeo, roofMat);
      roof.scale.set(w + 1, 1, dep + 1); roof.position.set(b.position.x, h + 0.5, b.position.z);
      group.add(roof);
      colliders.push({ minX: b.position.x - w / 2, maxX: b.position.x + w / 2, minZ: b.position.z - dep / 2, maxZ: b.position.z + dep / 2 });
      placed++;
    }
  }
  return { group, colliders, roads, placed, sea, half };
}

// Street props + landmark buildings. Call after buildCity.

export function buildProps(scene, rng, colliders) {
  const group = new THREE.Group(); group.name = 'props'; scene.add(group);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2a2f36 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 7, 6);
  const leafGeo = new THREE.ConeGeometry(2.6, 3.4, 6);

  function palm(x, z) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 3.5; trunk.castShadow = true; t.add(trunk);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = 7.2; leaf.rotation.z = Math.PI / 2.6; leaf.rotation.y = (i / 5) * Math.PI * 2;
      leaf.position.x = Math.cos((i / 5) * Math.PI * 2) * 1.4; leaf.position.z = Math.sin((i / 5) * Math.PI * 2) * 1.4;
      t.add(leaf);
    }
    t.position.set(x, 0, z); group.add(t);
  }
  // Palm rows along the beach and the marina promenade.
  for (let x = -220; x <= 220; x += 22) { palm(x + rng.range(-4, 4), 196 + rng.range(-3, 3)); }
  for (let x = -200; x <= 200; x += 40) { if (rng.chance(0.6)) palm(x, 168 + rng.range(-2, 2)); }

  // Street lamps at intersections.
  const lampGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 5);
  for (let x = -240; x <= 240; x += 60) for (let z = -240; z <= 180; z += 60) {
    if (rng.chance(0.5)) continue;
    const pole = new THREE.Mesh(lampGeo, lampMat); pole.position.set(x + 9, 3, z + 9); group.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), bulbMat);
    bulb.position.set(x + 9, 6.2, z + 9); group.add(bulb);
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
