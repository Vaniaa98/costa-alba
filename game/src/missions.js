// MISSION CHAIN — 8 missions, Rico Vela vs Don Salazar. Steps: goto / steal / fight / collect / evade.
import * as THREE from 'three';
import { PLACES } from './config.js';

export const MISSIONS = [
  { id: 'homecoming', title: '1 — Homecoming', reward: 200,
    brief: "Rico's back in Costa Alba after five years away. His father's garage, Vela Motors, is all that's left — and Don Salazar owns the debt on it. Drive to the garage and take stock.",
    steps: [{ type: 'goto', x: PLACES.garage.x, z: PLACES.garage.z + 16, r: 12, text: 'Drive to Vela Motors' }] }, // garage door (the building centre is inside its collider)
  { id: 'firstfare', title: '2 — First Fare', reward: 350,
    brief: "The garage needs cash today, not tomorrow. A tourist at Marina Bay needs a ride downtown. Pick them up, drop them off, and don't scratch the paint.",
    steps: [
      { type: 'goto', x: 30, z: 180, r: 8, text: 'Pick up the passenger at Marina Bay' },
      { type: 'goto', x: 0, z: 0, r: 12, text: 'Drop the passenger in Downtown' },
    ] },
  { id: 'pickup', title: '3 — The Pickup', reward: 400,
    brief: "A crate came in at the Old Harbor docks with Rico's name on it — no questions, just drive it back. Salazar's boys watch the docks, so keep it smooth.",
    steps: [{ type: 'goto', x: PLACES.harbor.x, z: PLACES.harbor.z, r: 10, text: 'Collect the crate at Old Harbor' }] },
  { id: 'hotwheels', title: '4 — Hot Wheels', reward: 600,
    brief: "Salazar's nephew parks his Comet GT downtown like he owns the street. Take it. Bring it to the garage. The cops will notice — that's the point.",
    steps: [
      { type: 'steal', carId: 'comet', x: 30, z: -60, text: 'Steal the yellow Comet GT downtown' }, // street z=-60 — (30,-30) is a block centre (building)
      { type: 'goto', x: PLACES.garage.x, z: PLACES.garage.z + 16, r: 12, text: 'Bring the Comet to Vela Motors' },
    ] },
  { id: 'heatwave', title: '5 — Heat Wave', reward: 500,
    brief: "Three stars and every cruiser in Costa Alba on your tail. Salazar wants to see if Rico can drive. Lose them — all of them — and come home clean.",
    steps: [{ type: 'evade', stars: 3, text: 'Lose the 3-star wanted level' }] },
  { id: 'exchange', title: '6 — The Exchange', reward: 800,
    brief: "Salazar's collectors are shaking down the Market Quarter. Rico's had enough. Settle it the loud way — four of them, in the market square.",
    steps: [{ type: 'fight', count: 4, x: PLACES.market.x, z: PLACES.market.z, text: 'Deal with 4 of Salazar\'s men' }] },
  { id: 'heist', title: '7 — Harbor Heist', reward: 1200,
    brief: "Salazar's cargo sits in the harbor warehouse, guarded and worth a fortune. Three crates, in and out. The harbor patrol won't make it easy.",
    steps: [{ type: 'collect', count: 3, x: PLACES.harbor.x, z: PLACES.harbor.z, text: 'Grab 3 cargo crates at the harbor' }] },
  { id: 'king', title: '8 — King of Costa Alba', reward: 2500,
    brief: "It ends tonight at Salazar's villa. Six of his best men between Rico and the Don. Finish it, shake the heat, and Costa Alba is Rico's.",
    steps: [
      { type: 'fight', count: 6, x: PLACES.villa.x, z: PLACES.villa.z + 18, text: "Take down 6 of Salazar's guards" }, // villa door (the centre is inside its collider)
      { type: 'evade', stars: 4, text: 'Lose the 4-star wanted level' },
    ] },
];

export function createMissions(scene, rng) {
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.35 });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 60, 12, 1, true), beaconMat);
  beacon.visible = false; scene.add(beacon);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.5, 3.5, 24), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  const state = {
    index: -1, step: 0, active: false, done: false,
    kills: 0, collected: 0, hadStars: false, crates: [], targetCar: null,
    get current() { return this.index >= 0 && this.index < MISSIONS.length ? MISSIONS[this.index] : null; },
    get stepDef() { const m = this.current; return m ? m.steps[this.step] : null; },
    objective() {
      if (!this.active) return this.done ? 'Story complete — free roam! Collect packages, run fares, buy cars.' : 'No mission — visit Vela Motors to start';
      const s = this.stepDef;
      if (!s) return '';
      if (s.type === 'fight') return `${s.text} (${this.kills}/${s.count})`;
      if (s.type === 'collect') return `${s.text} (${this.collected}/${s.count})`;
      return s.text;
    },
    target() {
      const s = this.stepDef;
      if (!s) return null;
      if (s.type === 'steal' && this.targetCar) return { x: this.targetCar.x, z: this.targetCar.z };
      if (s.x !== undefined) return { x: s.x, z: s.z };
      return null;
    },
  };
  return { state, beacon, ring,
    start(i, G) {
      state.index = i; state.step = 0; state.active = true; state.done = false;
      state.kills = 0; state.collected = 0; state.hadStars = false;
      this.clearStepObjects(G);
      this.setupStep(G);
      if (G.hud) G.hud.showBrief(MISSIONS[i]);
      if (G.audio) G.audio.mission();
    },
    clearStepObjects(G) {
      for (const c of state.crates) G.scene.remove(c.mesh);
      state.crates = [];
      if (state.targetCar && !state.targetCar.isPlayer) { /* car stays in the world */ }
      state.targetCar = null;
    },
    setupStep(G) {
      const s = state.stepDef; if (!s) return;
      if (s.type === 'fight') {
        // Enemies spawn in the open street south of the target (never inside a building).
        for (let k = 0; k < s.count; k++) {
          G.combat.spawnEnemy(s.x + rng.range(-14, 14), s.z + rng.range(2, 18));
        }
        state.kills = 0;
      } else if (s.type === 'collect') {
        state.collected = 0;
        for (let k = 0; k < s.count; k++) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6),
            new THREE.MeshLambertMaterial({ color: 0xf2c230 }));
          mesh.position.set(s.x + rng.range(-16, 16), 0.6, s.z + rng.range(-16, 16));
          mesh.castShadow = true; G.scene.add(mesh);
          state.crates.push({ mesh, x: mesh.position.x, z: mesh.position.z, taken: false });
        }
      } else if (s.type === 'steal') {
        const def = { id: 'comet', name: 'Comet GT', kind: 'sport', color: 0xf2c230, price: 0, top: 48, accel: 32 };
        const { createCar } = G.vehicles;
        const car = createCar(def, s.x, s.z, 0);
        G.scene.add(car.mesh); G.worldCars.push(car);
        state.targetCar = car;
      } else if (s.type === 'evade') {
        // Set the wanted level to exactly the mission's star count (not additive:
        // the steal may already have left 1 star) and mark it as seen at once —
        // otherwise a fast decay to 0 between frames could skip the "had stars" flag.
        G.police.wanted = s.stars;
        G.police.lastCrime = G.time;
        state.hadStars = true;
      }
      this.placeBeacon();
    },
    placeBeacon() {
      const t = state.target();
      if (t) {
        beacon.position.set(t.x, 30, t.z); beacon.visible = true;
        ring.position.set(t.x, 0.1, t.z); ring.visible = true;
      } else { beacon.visible = false; ring.visible = false; }
    },
    nextStep(G) {
      state.step++;
      const m = state.current;
      if (state.step >= m.steps.length) { this.complete(G); return; }
      this.setupStep(G);
      if (G.hud) G.hud.toast('Objective updated');
    },
    complete(G) {
      const m = state.current;
      state.active = false;
      beacon.visible = false; ring.visible = false;
      this.clearStepObjects(G);
      G.progression.addMoney(m.reward, `Mission: ${m.title}`);
      if (G.audio) { G.audio.cash(); G.audio.mission(); }
      if (state.index >= MISSIONS.length - 1) {
        state.done = true;
        if (G.hud) G.hud.showComplete(m, true);
      } else {
        if (G.hud) G.hud.showComplete(m, false);
        state.index++;
        // next mission starts when the player confirms (or auto after the screen)
      }
    },
    onKill() { state.kills++; },
    update(dt, G) {
      if (!state.active) return;
      const s = state.stepDef; if (!s) return;
      const p = G.player;
      const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
      if (s.type === 'goto') {
        const d = Math.hypot(px - s.x, pz - s.z);
        if (d < s.r) this.nextStep(G);
      } else if (s.type === 'steal') {
        if (state.targetCar && state.targetCar.isPlayer) this.nextStep(G);
      } else if (s.type === 'fight') {
        if (state.kills >= s.count) this.nextStep(G);
      } else if (s.type === 'collect') {
        for (const c of state.crates) {
          if (!c.taken && Math.hypot(px - c.x, pz - c.z) < 3.5) {
            c.taken = true; G.scene.remove(c.mesh); state.collected++;
            if (G.audio) G.audio.pickup();
            if (G.hud) G.hud.toast(`Crate ${state.collected}/${s.count}`);
          }
        }
        if (state.collected >= s.count) this.nextStep(G);
      } else if (s.type === 'evade') {
        if (G.police.wanted >= s.stars) state.hadStars = true;
        if (state.hadStars && G.police.wanted === 0) this.nextStep(G);
      }
      // beacon pulse
      const t = state.target();
      if (t) { const pu = 1 + Math.sin(G.time * 3) * 0.15; beacon.scale.set(pu, 1, pu); ring.scale.set(pu, pu, 1); }
    },
  };
}
