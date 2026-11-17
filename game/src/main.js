// COSTA ALBA — boot, game loop, chase camera, state machine, crime rules.
import * as THREE from 'three';
import { CFG, PAL, CARS, PLACES } from './config.js';
import { makeRng, hashSeed } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildCity, buildProps } from './city.js';
import { createCar, driveCar } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPlayer, walkPlayer, nearestCar, enterCar, exitCar } from './player.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createMissions, MISSIONS } from './missions.js';
import { createProgression } from './progression.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createEffects } from './effects.js';
import { setupShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const SEED = parseInt(params.get('seed') || '1', 10) || 1;

const G = {
  time: 0, day: 1, clockMinutes: CFG.clockStart,
  state: 'title', // title | playing | paused | brief | complete | over
  seed: SEED, shotMode: !!SHOT,
};

function init() {
  const rng = makeRng(SEED * 7919 + 13);
  G.rng = rng;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.getElementById('game').appendChild(renderer.domElement);
  G.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xff8a4a); // sunset fallback (the sky dome covers it)
  scene.fog = new THREE.Fog(PAL.fog, 180, 560); // warm haze — the city fades into sunset
  G.scene = scene;
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
  camera.position.set(0, 40, 80); G.camera = camera;

  // Golden-hour sun: low, warm, from the west — long shadows toward the sea.
  const sun = new THREE.DirectionalLight(PAL.sun, 2.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); // 1024 keeps SwiftShader playtests usable; still crisp on GPU
  sun.shadow.camera.left = -160; sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160;
  sun.shadow.camera.far = 600; sun.shadow.bias = -0.0004;
  scene.add(sun); G.sun = sun;
  scene.add(new THREE.HemisphereLight(0xffd9a0, 0x6a4a3a, 1.0)); // warm sky bounce

  const city = buildCity(scene, rng);
  G.city = city; G.colliders = city.colliders;
  buildProps(scene, rng, city.colliders);

  G.input = createInput();
  G.audio = createAudio();
  G.effects = createEffects(scene);
  G.traffic = createTraffic(scene, city, rng, city.colliders);
  G.police = createPolice(scene, rng, city.colliders);
  G.combat = createCombat(scene, rng);
  G.missions = createMissions(scene, rng);
  G.progression = createProgression(scene, rng);
  G.hud = createHud();
  G.minimap = createMinimap();
  G.vehicles = { createCar };

  // Player spawns at the beach promenade; their Alba Coupe waits at the garage.
  G.player = createPlayer(scene, 0, 205); // money lives in G.progression.state.money (single source of truth)
  const alba = createCar(CARS[0], PLACES.garage.x + 8, PLACES.garage.z + 14, 0);
  alba.owned = true; scene.add(alba.mesh);
  G.worldCars = [...G.traffic.cars, alba];
  G.ownedCars = [alba];

  G.camHeading = 0; // camera looks where the player faces (south, toward the sea)
  G.camDist = 8; G.camHeight = 3.4;
  G.aimPoint = new THREE.Vector3();
  G.raycaster = new THREE.Raycaster();
  G.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  G.hud.bind({
    continue: () => { applySave(loadGame()); startPlaying(); },
    newGame: () => { clearSave(); resetProgress(); startPlaying(); },
    resume: () => { G.state = 'playing'; G.hud.showMenu(null); },
    quitToTitle: () => { saveGame(G); toTitle(); },
    startMission: () => { G.state = 'playing'; G.hud.showMenu(null); G.hud.toast('Mission started — follow the yellow beacon'); },
    next: () => {
      G.state = 'playing'; G.hud.showMenu(null);
      const ms = G.missions.state;
      if (!ms.done && ms.index >= 0 && ms.index < MISSIONS.length && !ms.active) G.missions.start(ms.index, G);
    },
  });
  window.addEventListener('error', (e) => { window.__gameError = String(e.message || e.error); });
  return G;
}

function applySave(d) {
  if (!d) return;
  const p = G.player, pr = G.progression.state;
  G.progression.state.money = d.money ?? CFG.startMoney; p.money = G.progression.state.money; p.health = d.health ?? 100;
  p.x = d.x ?? 0; p.z = d.z ?? 205;
  pr.owned = d.owned || ['alba']; pr.packages = d.packages || 0;
  pr.faresDone = d.fares || 0; pr.deliveriesDone = d.deliveries || 0;
  G.clockMinutes = d.clock ?? CFG.clockStart;
  G.missions.state.index = (d.mission ?? -1);
}
function resetProgress() {
  const p = G.player, pr = G.progression.state;
  G.progression.state.money = CFG.startMoney; p.money = CFG.startMoney; p.health = CFG.playerHealth; p.x = 0; p.z = 205;
  pr.owned = ['alba']; pr.packages = 0; pr.faresDone = 0; pr.deliveriesDone = 0;
  G.missions.state.index = -1; G.missions.state.done = false;
  G.clockMinutes = CFG.clockStart; G.day = 1;
}
function startPlaying() {
  G.state = 'playing'; G.hud.showMenu(null);
  G.audio.ensure(); G.audio.startMusic();
  const ms = G.missions.state;
  if (ms.index < 0) { ms.index = 0; G.missions.start(0, G); }
  else if (!ms.active && !ms.done) G.missions.start(ms.index, G);
}
function toTitle() {
  G.state = 'title';
  G.hud.showStart(hasSave(), Math.max(0, G.missions.state.index));
}

// ---- per-tick update ----
function update(dt) {
  G.time += dt;
  G.clockMinutes += dt * 1.2; // ~1 game minute per real second
  if (G.clockMinutes >= CFG.dayMinutes) { G.clockMinutes -= CFG.dayMinutes; G.day++; }
  const input = G.input, p = G.player;
  const danger = G.combat.enemies.some((e) => e.alive) ? { x: p.x, z: p.z } : null;
  G.traffic.update(dt, p, danger, G.time);
  G.police.update(dt, G.time, p, G.city, G.effects, G.audio);
  G.combat.update(dt, p, G.effects);
  G.missions.update(dt, G);
  G.progression.update(dt, G);
  G.effects.update(dt);

  // sun follows the clock but stays LOW and warm: golden hour all game long.
  // At 17:40 the sun sits west-southwest, ~45 up — long shadows, warm facades.
  const t = (G.clockMinutes / CFG.dayMinutes) * Math.PI * 2 - Math.PI / 2;
  const sun = G.sun;
  sun.position.set(p.x + Math.cos(t) * 220, 42 + Math.max(0, Math.sin(t)) * 60, p.z + 90);
  sun.target.position.set(p.x, 0, p.z);
  sun.target.updateMatrixWorld();

  // --- player ---
  if (p.car) {
    driveCar(p.car, input, dt, G.colliders, G.city.half);
    p.x = p.car.x; p.z = p.car.z; p.heading = p.car.heading;
    G.camHeading = p.car.heading; // camera looks where the car points
    G.audio.engine(Math.abs(p.car.speed) / (p.car.def.top || CFG.carMax), true);
    if (Math.abs(p.car.speed) > 20 && input.keys.has(' ')) {
      G.effects.skid(p.car.x, p.car.z, p.car.heading);
    }
    if (p.car.crashed) {
      G.effects.explosion(p.car.x, 1, p.car.z);
      G.audio.crash();
      exitCar(p, G.colliders);
      p.health -= 20;
      if (G.hud) G.hud.toast('Your car is wrecked!');
    }
  } else {
    walkPlayer(p, input, dt, G.colliders, G.city.half, G.camHeading);
    G.audio.engine(0, false);
    // camera heading follows the player's facing when walking
    if (p.speed > 0.1) G.camHeading += (p.heading - G.camHeading) * Math.min(1, dt * 2);
  }

  // --- actions (one-shot keys) ---
  if (input.pressed.has('e')) {
    if (p.car) exitCar(p, G.colliders);
    else {
      const car = nearestCar(p, G.worldCars);
      if (car) {
        const stolen = !car.owned && !car.isPolice ? true : car.isPolice;
        if (!car.owned) {
          G.police.addWanted(car.isPolice ? 2 : 1, G.time);
          G.hud.toast(car.isPolice ? 'You stole a police cruiser! +2 wanted' : 'Car stolen! +1 wanted');
        }
        enterCar(p, car, stolen);
        if (G.missions.state.active) G.missions.update(0, G);
      }
    }
  }
  if (input.pressed.has('f') && p.onFoot) {
    const hit = G.combat.melee({ x: p.x, z: p.z }, p.heading, G.effects, G.audio);
    if (hit && !hit.alive) G.missions.onKill(); // only a kill counts, not a graze
    // hitting a pedestrian counts as a crime
    for (const ped of G.traffic.peds) {
      if (!ped.alive) continue;
      const dx = ped.x - p.x, dz = ped.z - p.z;
      if (Math.hypot(dx, dz) < CFG.meleeRange && dx * Math.sin(p.heading) + dz * Math.cos(p.heading) > 0) {
        ped.alive = false; ped.mesh.visible = false;
        G.police.addWanted(1, G.time);
        G.hud.toast('You attacked a pedestrian! +1 wanted');
        break;
      }
    }
  }
  if (input.mouse.clicked && !p.car) {
    aimAtMouse();
    const hit = G.combat.shoot({ x: p.x, z: p.z }, G.aimPoint, G.effects, G.audio);
    if (hit && !hit.alive) G.missions.onKill(); // only a kill counts, not a graze
    // shooting near police draws attention; hitting a pedestrian is a crime
    if (G.police.cars.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < 60)) G.police.addWanted(1, G.time);
    for (const ped of G.traffic.peds) {
      if (!ped.alive) continue;
      if (Math.hypot(ped.x - G.aimPoint.x, ped.z - G.aimPoint.z) < 2) {
        ped.alive = false; ped.mesh.visible = false;
        G.police.addWanted(1, G.time);
        break;
      }
    }
  }
  if (input.pressed.has('t')) {
    const t = G.progression.startTaxi(G);
    if (t) G.hud.toast('Taxi fare: pick up the passenger');
    else if (G.progression.state.taxi) G.hud.toast('Fare in progress — follow the yellow marker');
  }
  if (input.pressed.has('g')) {
    const d = G.progression.startDelivery(G);
    if (d) G.hud.toast('Delivery: take the package to Old Harbor');
  }
  if (input.pressed.has('r') && p.onFoot) {
    const near = nearestCar(p, G.ownedCars, 12);
    if (near && near.health < CFG.carHealth && G.progression.spend(CFG.repairCost)) {
      near.health = CFG.carHealth; near.crashed = false;
      G.hud.toast(`Repaired ${near.def.name} for $${CFG.repairCost}`);
    }
  }
  if (input.pressed.has('p') || input.pressed.has('Escape')) {
    if (G.state === 'playing') { G.state = 'paused'; G.hud.showPause(G); }
    else if (G.state === 'paused') { G.state = 'playing'; G.hud.showMenu(null); }
  }
  if (input.pressed.has('m')) G.audio.setMuted(!G.audio.muted);

  // --- busted / wasted ---
  if (p.busted) {
    p.busted = false; G.progression.state.money = Math.max(0, G.progression.state.money - 150); p.money = G.progression.state.money;
    p.health = CFG.playerHealth; G.police.wanted = 0;
    p.x = PLACES.garage.x; p.z = PLACES.garage.z + 20; p.mesh.position.set(p.x, 0, p.z);
    if (p.car) { p.car.isPlayer = false; p.car.driver = null; p.car = null; p.onFoot = true; p.mesh.visible = true; }
    G.state = 'over'; G.hud.showBusted(); saveGame(G);
  }
  if (p.health <= 0) {
    p.health = CFG.playerHealth; G.progression.state.money = Math.max(0, G.progression.state.money - 150); p.money = G.progression.state.money;
    G.police.wanted = 0;
    p.x = PLACES.hospital.x; p.z = PLACES.hospital.z + 20; p.mesh.position.set(p.x, 0, p.z);
    if (p.car) { p.car.isPlayer = false; p.car.driver = null; p.car = null; p.onFoot = true; p.mesh.visible = true; }
    G.state = 'over'; G.hud.showWasted(); saveGame(G);
  }

  // --- camera: LOW chase cam (like the top entries) — close behind the car,
  // looking slightly up the road so the beach + sunset fill the frame.
  const target = p.car ? p.car : p;
  const dist = p.car ? 9.5 : 8, height = p.car ? 3.4 : 3.4;
  const cx = target.x - Math.sin(G.camHeading) * dist;
  const cz = target.z - Math.cos(G.camHeading) * dist;
  const cam = G.camera;
  cam.position.x += (cx - cam.position.x) * Math.min(1, dt * 5);
  cam.position.y += (height - cam.position.y) * Math.min(1, dt * 5);
  cam.position.z += (cz - cam.position.z) * Math.min(1, dt * 5);
  cam.lookAt(target.x + Math.sin(G.camHeading) * 6, 1.6, target.z + Math.cos(G.camHeading) * 6);

  G.hud.update(G);
  G.minimap.draw(G);
  input.endTick();
}

function aimAtMouse() {
  const m = G.input.mouse;
  const nx = (m.x / innerWidth) * 2 - 1, ny = -(m.y / innerHeight) * 2 + 1;
  G.raycaster.setFromCamera({ x: nx, y: ny }, G.camera);
  const hit = G.raycaster.ray.intersectPlane(G.groundPlane, G.aimPoint);
  if (!hit) G.aimPoint.set(G.player.x, 0, G.player.z - 10);
}

// ---- boot + loop ----
const g = init();
window.__game = g; // test hook for the Playwright playtest (state access)
g.saveGame = () => saveGame(g); // test hook: save from the console / playtest
g.loadGame = () => loadGame();
if (SHOT) {
  // Deterministic screenshot staging: run the real game forward, then flag ready.
  setupShot(g, SHOT, SEED);
  g.renderer.render(g.scene, g.camera);
  window.__shotReady = true;
} else {
  toTitle();
  let last = performance.now(), acc = 0;
  const DT = 1 / 60;
  function frame(now) {
    requestAnimationFrame(frame);
    let ft = Math.min(0.1, (now - last) / 1000); last = now;
    if (g.state === 'playing') {
      acc += ft;
      while (acc >= DT) { update(DT); acc -= DT; }
    }
    g.renderer.render(g.scene, g.camera);
  }
  requestAnimationFrame(frame);
}
