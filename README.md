# COSTA ALBA

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Vaniaa98/costa-alba/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Vaniaa98/costa-alba/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**COSTA ALBA** is an original open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Rico Vela comes home to a
sun-soaked coastal city and finds his father's garage in debt to Don Salazar. Eight story
missions — driving, taxi fares, a heist, a shootout, and a final showdown — stand between
Rico and the crown of Costa Alba.

Everything is original: the city, the characters, the vehicles, the story, the art, the
sound and the music. No Rockstar Games content of any kind.

## What is in the game

- **A city on foot and by car** — five districts (Old Harbor, Marina Bay, Downtown, Market
  Quarter, Hillside), a beach and a pier, drivable streets, a chase camera.
- **Traffic and pedestrians** — cars loop the street grid, pedestrians walk the sidewalks
  and run from danger.
- **Cars to steal** — walk up to any car, press E, and take it. Stealing draws the police.
- **A wanted level and police** — 0–5 stars. CAPD cruisers chase and ram; foot cops run
  you down and arrest you. Lose them to drop the heat.
- **Missions and a story** — 8 missions with objectives, a yellow beacon, briefings and
  rewards, from "Homecoming" to "King of Costa Alba".
- **Combat** — pistol (mouse aim) and melee, health, enemies who shoot back.
- **A HUD with a minimap** — health, money, wanted stars, clock, mission objective, and a
  live minimap with traffic, police and mission blips.
- **Progression and a save** — money from missions, taxi fares, deliveries and 12 hidden
  packages; buy cars for the garage; the game saves to localStorage and offers Continue.
- **Polish** — synthesized WebAudio sound and music, skid marks, particles, explosions,
  day-cycle sun, start / pause / briefing / complete screens.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: open `game/index.html` from the static files, or serve
`game/` with any static server. Needs a desktop browser with WebGL2.

Controls: **WASD** drive / walk · **E** enter / steal car · **Mouse** aim, click shoot ·
**F** melee · **Space** handbrake · **T** taxi fare · **G** delivery · **R** repair at the
garage · **P** pause · **M** mute.

## How it is built

- `game/index.html` — the page, HUD markup and import map for three.js.
- `game/vendor/three/three.module.min.js` — three.js 0.187.0, vendored (MIT).
- `game/src/` — one file per system: `city.js`, `vehicles.js`, `traffic.js`,
  `player.js`, `police.js`, `combat.js`, `missions.js`, `progression.js`, `save.js`,
  `hud.js`, `minimap.js`, `audio.js`, `effects.js`, `shots.js`, `main.js`, plus
  `config.js`, `random.js`, `input.js`.
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes
  `/output/dossier.json` with the vendored make.fun library.
- `screenshots/` — four real renders of the game (seeded staging via `?shot=`).

## Screenshots

1. `1-chase.jpg` — driving chase: Comet GT, 3 wanted stars, two cruisers, minimap, mission objective.
2. `2-foot.jpg` — on foot on the Marina promenade: traffic, pedestrians, beach.
3. `3-mission.jpg` — mission 6 "The Exchange": firefight in the Market Quarter.
4. `4-start.jpg` — the title screen over the city and the coast.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
