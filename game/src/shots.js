// Screenshot staging v2: the shots are staged where the GTA fantasy lives —
// the beachfront at sunset, looking south toward the sea. Deterministic scenarios,
// real rules, fixed ticks, window.__shotReady. ?shot=chase|foot|mission|start &seed=N.
import { CARS, PLACES } from './config.js';
import { createCar, driveCar } from './vehicles.js';
import { enterCar } from './player.js';

const DT = 1 / 60;
const fakeDrive = { axis: () => ({ x: 0, y: 1 }), keys: new Set() };

function placeCamera(G, tx, tz, heading, dist, height, lookAhead = 10) {
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

// Honest mid-story money for each shot (start $500 + the rewards earned by then).
const MONEY = { chase: 2050, foot: 700, mission: 2550, start: 1450 };

export function setupShot(G, name, seed) {
  const p = G.player;
  G.hud.showMenu(null);
  G.progression.state.money = MONEY[name] ?? 500;
  if (name === 'chase') {
    // COVER: sunset chase down the beachfront road, SOUTH toward the sea —
    // Comet GT at speed, wanted 3, cruisers with flashing light bars, helicopter
    // overhead, palms + beach + ocean + sun disc ahead. This one decides the entry.
    const car = createCar(CARS[1], 60, 90, 0); // heading south (+z), toward the beach
    car.owned = true; G.scene.add(car.mesh); G.worldCars.push(car);
    enterCar(p, car, false);
    car.speed = 30;
    G.missions.start(4, G); // mission 5 "Heat Wave" — sets wanted 3 itself
    G.hud.showMenu(null);
    G.police.spawnCar(56, 120, 0);
    G.police.spawnCar(65, 100, 0);
    for (let i = 0; i < 100; i++) {
      G.time += DT;
      driveCar(car, fakeDrive, DT, G.colliders, G.city.half);
      p.x = car.x; p.z = car.z;
      G.traffic.update(DT, p, null, G.time);
      G.police.update(DT, G.time, p, G.city, G.effects, G.audio);
      G.effects.update(DT);
      if (i === 50) G.effects.skid(car.x, car.z, car.heading);
    }
    // Stage the cruisers: both AHEAD of the player, flanking the road (the
    // camera looks south, so anything behind it is invisible) — left cruiser
    // pulling alongside, right cruiser further up the road, light bars flashing.
    const pc = G.police.cars;
    if (pc[0]) { pc[0].x = car.x - 6; pc[0].z = car.z + 15; pc[0].heading = 0.2; pc[0].mesh.position.set(pc[0].x, 0, pc[0].z); pc[0].mesh.rotation.y = 0.2; }
    if (pc[1]) { pc[1].x = car.x + 5; pc[1].z = car.z + 22; pc[1].heading = 0.3; pc[1].mesh.position.set(pc[1].x, 0, pc[1].z); pc[1].mesh.rotation.y = 0.3; }
    G.police.flashLights(G.time);
    // Helicopter overhead, ahead-right in the sky (wanted 3 spawns it; force it into frame).
    const heli = G.police.heli || G.police.spawnHeli(p);
    heli.x = car.x + 24; heli.z = car.z + 52; heli.y = 30; heli.heading = 0.5;
    heli.mesh.position.set(heli.x, heli.y, heli.z); heli.mesh.rotation.y = heli.heading;
    heli.mesh.userData.rotor.rotation.y = 0.6;
    // Traffic on the road ahead so the chase has something to weave through.
    for (let i = 0; i < 3; i++) {
      const tc = G.traffic.cars[i];
      if (!tc) break;
      tc.x = 60 + (i - 1) * 4; tc.z = car.z + 38 + i * 9; tc.heading = 0;
      tc.mesh.position.set(tc.x, 0, tc.z); tc.mesh.rotation.y = 0;
    }
    placeCamera(G, car.x, car.z, car.heading, 10, 3.6);
  } else if (name === 'foot') {
    // ON FOOT: the Marina Bay promenade at sunset — player walking south toward
    // the sea, pedestrians + beachgoers, palms, umbrellas, ocean and sun ahead.
    p.x = 0; p.z = 178; p.heading = 0; // facing the sea
    p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.heading;
    G.missions.start(1, G); // mission 2 "First Fare" — pick up at Marina Bay
    G.hud.showMenu(null);
    // Pedestrians ahead (south), facing the camera; beachgoers on the sand behind them.
    for (let i = 0; i < 5; i++) {
      const ped = G.traffic.peds[i];
      ped.x = -8 + i * 4; ped.z = p.z + 9; ped.heading = Math.PI; ped.wait = 0; ped.panic = 0;
      ped.mesh.position.set(ped.x, 0, ped.z); ped.mesh.rotation.y = Math.PI;
    }
    for (let i = 0; i < 3; i++) {
      const ped = G.traffic.peds[24 + i];
      if (!ped) break;
      ped.x = -14 + i * 12; ped.z = 208; ped.heading = Math.PI; ped.wait = 0; ped.panic = 0;
      ped.mesh.position.set(ped.x, 0, ped.z); ped.mesh.rotation.y = Math.PI;
    }
    tickWorld(G, 40);
    placeCamera(G, p.x, p.z, p.heading, 8, 3.6);
  } else if (name === 'mission') {
    // MISSION: The Exchange — firefight in the Market Quarter at sunset.
    // Player looks NORTH up the market street (south-facing storefront signs
    // catch the warm sun), enemies lined up in the open, beacon overhead.
    p.x = PLACES.market.x; p.z = PLACES.market.z + 20; p.heading = Math.PI;
    p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.heading;
    G.missions.start(5, G); // mission 6 "The Exchange" — 4 of Salazar's men
    G.hud.showMenu(null);
    G.combat.enemies.forEach((e, i) => {
      e.x = PLACES.market.x + (i - 1.5) * 4; e.z = PLACES.market.z - 6 - i * 3;
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
    placeCamera(G, p.x, p.z, p.heading, 8, 3.8);
  } else {
    // START: title screen over a sunset establishing view — high above the city,
    // looking SOUTH across the rooftops to the beach, the sea and the sun disc.
    G.camera.position.set(0, 115, -90);
    G.camera.lookAt(0, 0, 230);
    G.camera.updateProjectionMatrix();
    G.hud.showStart(true, 3);
  }
  G.hud.update(G);
  G.minimap.draw(G);
}
