// Progression: money, car garage/ownership, taxi fares, deliveries, hidden packages.
import * as THREE from 'three';
import { CFG, CARS, PLACES } from './config.js';

export function createProgression(scene, rng) {
  const state = {
    money: CFG.startMoney, owned: ['alba'], packages: 0, faresDone: 0, deliveriesDone: 0,
    taxi: null, delivery: null, packageMeshes: [],
  };
  // 12 hidden packages around the city (gold boxes).
  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xf2c230, emissive: 0x664400 }));
    const x = rng.range(-220, 220), z = rng.range(-220, 180);
    mesh.position.set(x, 0.8, z); mesh.castShadow = true; scene.add(mesh);
    state.packageMeshes.push({ mesh, x, z, taken: false });
  }
  return {
    state,
    addMoney(n, why) {
      state.money += n;
      return n;
    },
    spend(n) { if (state.money >= n) { state.money -= n; return true; } return false; },
    buyCar(id) {
      const def = CARS.find((c) => c.id === id);
      if (!def || state.owned.includes(id) || !this.spend(def.price)) return null;
      state.owned.push(id);
      return def;
    },
    // Taxi: a passenger waits at a random spot; drive them to a random destination.
    startTaxi(G) {
      if (state.taxi) return null;
      const spots = [PLACES.marina, PLACES.downtown, PLACES.market, PLACES.beach, PLACES.harbor];
      const from = spots[Math.floor(rng.next() * spots.length)];
      let to = spots[Math.floor(rng.next() * spots.length)];
      if (to === from) to = PLACES.downtown;
      state.taxi = { phase: 'pickup', from, to, fare: CFG.taxiFare[0] + Math.floor(rng.next() * (CFG.taxiFare[1] - CFG.taxiFare[0])) };
      return state.taxi;
    },
    startDelivery(G) {
      if (state.delivery) return null;
      state.delivery = { to: PLACES.harbor, pay: CFG.deliveryPay[0] + Math.floor(rng.next() * (CFG.deliveryPay[1] - CFG.deliveryPay[0])) };
      return state.delivery;
    },
    update(dt, G) {
      const p = G.player;
      const px = p.car ? p.car.x : p.x, pz = p.car ? p.car.z : p.z;
      // packages
      for (const pk of state.packageMeshes) {
        if (!pk.taken && Math.hypot(px - pk.x, pz - pk.z) < 3) {
          pk.taken = true; scene.remove(pk.mesh); state.packages++;
          this.addMoney(CFG.packagePay, 'Hidden package');
          if (G.hud) G.hud.toast(`Hidden package! +$${CFG.packagePay} (${state.packages}/12)`);
          if (G.audio) G.audio.pickup();
        }
      }
      // taxi
      if (state.taxi) {
        const t = state.taxi;
        const dest = t.phase === 'pickup' ? t.from : t.to;
        if (Math.hypot(px - dest.x, pz - dest.z) < 10) {
          if (t.phase === 'pickup') { t.phase = 'dropoff'; if (G.hud) G.hud.toast('Passenger aboard — drive to the destination'); }
          else {
            this.addMoney(t.fare, 'Taxi fare'); state.faresDone++;
            if (G.hud) G.hud.toast(`Fare complete! +$${t.fare}`);
            if (G.audio) G.audio.cash();
            state.taxi = null;
          }
        }
      }
      // delivery
      if (state.delivery) {
        const d = state.delivery;
        if (Math.hypot(px - d.to.x, pz - d.to.z) < 10) {
          this.addMoney(d.pay, 'Delivery'); state.deliveriesDone++;
          if (G.hud) G.hud.toast(`Delivery done! +$${d.pay}`);
          if (G.audio) G.audio.cash();
          state.delivery = null;
        }
      }
    },
    // Where should the minimap/HUD point for the current side activity?
    activityTarget() {
      if (state.taxi) { const t = state.taxi; return t.phase === 'pickup' ? t.from : t.to; }
      if (state.delivery) return state.delivery.to;
      return null;
    },
  };
}
