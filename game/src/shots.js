// Screenshot staging: deterministic scenarios, real rules, fixed ticks, window.__shotReady.
// ?shot=chase|foot|mission|start &seed=N — mirrors the starter's shots.js pattern.
import { CARS, PLACES } from './config.js';
import { createCar, driveCar } from './vehicles.js';
import { enterCar } from './player.js';

const DT = 1 / 60;
const fakeDrive = { axis: () => ({ x: 0, y: 1 }), keys: new Set() };
const fakeWalk = { axis: () => ({ x: 0, y: 1 }), run: () => false, keys: new Set(), pressed: new Set() };

function placeCamera(G, tx, tz, heading, dist, height, lookAhead = 8) {
  const cam = G.camera;
  cam.position.set(tx - Math.sin(heading) * dist, height, tz - Math.cos(heading) * dist);
  cam.lookAt(tx + Math.sin(heading) * lookAhead, 1.6, tz + Math.cos(heading) * lookAhead);
  cam.updateProjectionMatrix();
}

function tickWorld(G, n) {
  for (let i = 0; i < n; i++) {
    G.time += DT;
    G.traffic.update(DT, G.player, null, G.time);
    G.police.update(DT, G.time, G.player, G.city, G.effects, G.audio);
    G.combat.update(DT, G.player, G.effects);
    G.effects.update(DT);
  }
}

export function setupShot(G, name, seed) {
  const p = G.player;
  G.hud.showMenu(null);
  if (name === 'chase') {
    // COVER: driving chase — Comet GT at speed, wanted 3, two cruisers on the tail.
    // Street x=60 (east side) so the road ahead is clear of the central plaza.
    const car = createCar(CARS[1], 60, 90, Math.PI); // heading north (-z)
    car.owned = true; G.scene.add(car.mesh); G.worldCars.push(car);
    enterCar(p, car, false);
    car.speed = 30;
    G.missions.start(4, G); // mission 5 "Heat Wave" — sets wanted 3 itself
    G.hud.showMenu(null);
    // two cruisers ahead, turning in to chase — visible in the frame
    G.police.spawnCar(-4, 48, 0);
    G.police.spawnCar(5, 38, 0);
    for (let i = 0; i < 100; i++) {
      G.time += DT;
      driveCar(car, fakeDrive, DT, G.colliders, G.city.half);
      p.x = car.x; p.z = car.z;
      G.traffic.update(DT, p, null, G.time);
      G.police.update(DT, G.time, p, G.city, G.effects, G.audio);
      G.effects.update(DT);
      if (i === 50) G.effects.skid(car.x, car.z, car.heading);
    }
    // stage the cruisers ahead for the shot (they chased, now they turn in)
    const pc = G.police.cars;
    if (pc[0]) { pc[0].x = car.x - 4; pc[0].z = car.z - 18; pc[0].heading = 0; pc[0].mesh.position.set(pc[0].x, 0, pc[0].z); pc[0].mesh.rotation.y = 0; }
    if (pc[1]) { pc[1].x = car.x + 4; pc[1].z = car.z - 30; pc[1].heading = 0.3; pc[1].mesh.position.set(pc[1].x, 0, pc[1].z); pc[1].mesh.rotation.y = 0.3; }
    placeCamera(G, car.x, car.z, car.heading, 9, 3.5);
  } else if (name === 'foot') {
    // ON FOOT: sunny Marina promenade — traffic, pedestrians, beach behind.
    p.x = 0; p.z = 178; p.heading = Math.PI;
    p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.heading;
    G.missions.start(1, G); // mission 2 "First Fare" — pick up at Marina Bay
    G.hud.showMenu(null);
    // pedestrians in a row across the road ahead (facing the camera); clear their
    // idle wait and snap their meshes so the staging actually shows.
    for (let i = 0; i < 5; i++) {
      const ped = G.traffic.peds[i];
      ped.x = -8 + i * 4; ped.z = p.z - 9; ped.heading = 0; ped.wait = 0; ped.panic = 0;
      ped.mesh.position.set(ped.x, 1.0, ped.z); ped.mesh.rotation.y = 0;
    }
    tickWorld(G, 40);
    placeCamera(G, p.x, p.z, p.heading, 8, 3.6);
  } else if (name === 'mission') {
    // MISSION: The Exchange — firefight in the Market Quarter, beacon overhead.
    // Market is a street intersection now, so the enemies stand on open road.
    p.x = PLACES.market.x; p.z = PLACES.market.z + 20; p.heading = Math.PI;
    p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.heading;
    G.missions.start(5, G); // mission 6 "The Exchange" — 4 of Salazar's men
    G.hud.showMenu(null);
    G.combat.enemies.forEach((e, i) => {
      e.x = PLACES.market.x + (i - 1.5) * 4; e.z = PLACES.market.z - 6 - i * 4;
      e.heading = 0; e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = 0;
    });
    // one enemy already down, one in the crosshair
    const e0 = G.combat.enemies[0];
    if (e0) { e0.health = 1; }
    tickWorld(G, 30);
    const target = G.combat.enemies.find((e) => e.alive);
    if (target) {
      G.aimPoint.set(target.x, 1.2, target.z);
      G.combat.shoot({ x: p.x, z: p.z }, G.aimPoint, G.effects, G.audio);
      G.missions.onKill();
    }
    placeCamera(G, p.x, p.z, p.heading, 9, 3.8);
  } else {
    // START: title screen over a high establishing view of the city + coast.
    G.camera.position.set(-40, 90, 260);
    G.camera.lookAt(0, 0, 60);
    G.camera.updateProjectionMatrix();
    G.hud.showStart(true, 3);
  }
  G.hud.update(G);
  G.minimap.draw(G);
}
