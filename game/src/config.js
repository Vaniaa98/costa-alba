// COSTA ALBA — tuning, palette, districts, cars. All numbers live here.
export const CFG = {
  city: 480,            // city extent (units), x/z in [-240, 240]
  block: 60,            // street spacing
  roadW: 14,            // road width
  sidewalk: 3,
  seaZ: 210,            // beach starts here (south edge), water beyond
  gravity: 1,           // (kept for clarity; arcade physics, no falling)
  // player
  walkSpeed: 9, runSpeed: 14, turnSpeed: 9,
  playerHealth: 100,
  // cars
  carAccel: 26, carBrake: 40, carReverse: 12, carMax: 38, carMaxSport: 48,
  carSteer: 2.1, carGrip: 6.5, carHealth: 100,
  // police / wanted
  wantedDecay: 18,     // seconds without crime before a star drops
  copSpeed: 11, copCatch: 1.6, copCatchTime: 1.5,
  policeCarSpeed: 40,
  // combat
  pistolDamage: 34, pistolRate: 0.22, pistolRange: 60, meleeDamage: 25, meleeRange: 2.4,
  enemyHealth: 70,
  // economy
  startMoney: 500, taxiFare: [60, 160], deliveryPay: [120, 220], packagePay: 100,
  repairCost: 80,
  // time
  dayMinutes: 24 * 60, clockStart: 9 * 60 + 30,
};

export const PAL = {
  sky: 0x8ec9ee, sun: 0xfff2cf, fog: 0xa8d4e8,
  sand: 0xe8d29a, sea: 0x2e7fa8, seaDeep: 0x1b5f8a,
  asphalt: 0x3a3f46, asphalt2: 0x454b54, line: 0xf5d76e,
  sidewalkCol: 0xb8b0a0, grass: 0x7fae5a,
  building: [0xe8dcc8, 0xd9c4a5, 0xc9b8a3, 0xf2e6d0, 0xb8c4c9, 0xe0a878, 0xd98c6a, 0x9fb8a8],
  glass: 0x9fd4e8, roof: 0x8a5a44,
  palmTrunk: 0x7a5a3a, palmLeaf: 0x3f9e4d,
  car: [0xd23b2e, 0x2e6fd2, 0xf2c230, 0x27a35c, 0x8a4fd2, 0xe8e8e8, 0x222831, 0xe07b39],
  police: 0x1a2a4a, policeLight: [0xff2222, 0x2266ff],
  marker: 0xffd23b, markerBad: 0xff4444, beacon: 0xffe14d,
};

// Districts: name, center, half-size, flavour (drives building heights / colours).
export const DISTRICTS = [
  { name: 'Old Harbor', cx: -150, cz: 150, hw: 85, hd: 55, h: [8, 18], col: 0xd9c4a5 },
  { name: 'Marina Bay', cx: 0, cz: 165, hw: 120, hd: 40, h: [6, 14], col: 0xf2e6d0 },
  { name: 'Downtown', cx: 0, cz: 0, hw: 110, hd: 100, h: [18, 55], col: 0xb8c4c9 },
  { name: 'Market Quarter', cx: -150, cz: -30, hw: 80, hd: 90, h: [8, 22], col: 0xe0a878 },
  { name: 'Hillside', cx: 150, cz: -120, hw: 85, hd: 100, h: [10, 26], col: 0x9fb8a8 },
  { name: 'Palm Row', cx: 150, cz: 120, hw: 80, hd: 70, h: [6, 16], col: 0xe8dcc8 },
];

// Cars the player can own / find. kind: sedan | sport | truck | taxi | police.
export const CARS = [
  { id: 'alba', name: 'Alba Coupe', kind: 'sedan', color: 0xd23b2e, price: 0, top: 36, accel: 24 },
  { id: 'comet', name: 'Comet GT', kind: 'sport', color: 0xf2c230, price: 4000, top: 48, accel: 32 },
  { id: 'burro', name: 'Burro Truck', kind: 'truck', color: 0x27a35c, price: 2500, top: 32, accel: 20 },
  { id: 'taxi', name: 'Costa Taxi', kind: 'taxi', color: 0xf2c230, price: 1500, top: 36, accel: 24 },
  { id: 'police', name: 'CAPD Cruiser', kind: 'police', color: 0x1a2a4a, price: 0, top: 42, accel: 30 },
];

// Garage + key places (world coords).
export const PLACES = {
  garage: { x: -132, z: 96, name: 'Vela Motors' },
  hospital: { x: 132, z: -132, name: 'Alba General' },
  beach: { x: 0, z: 225, name: 'Playa Alba' },
  harbor: { x: -180, z: 180, name: 'Old Harbor Docks' },
  marina: { x: 30, z: 180, name: 'Marina Bay' },
  downtown: { x: 0, z: 0, name: 'Downtown' },
  market: { x: -180, z: -60, name: 'Market Quarter' }, // street intersection — block centres have buildings on them
  villa: { x: 168, z: -168, name: "Salazar's Villa" },
};
