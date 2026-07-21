# RAJARATA: DUTUGEMUNU'S WAR — Development Roadmap

**Vision:** grow the current single-campaign vertical slice (v0.1, playable today) into
*Chronicles of Lanka* — an Assassin's-Creed-style, open-era historical action series
covering the island's great wars, selected from an ancient **Taprobane map**, with deep
combat, skills, third-person play, day-by-day campaigns, and multiplayer.

**Design pillars (never break these):**

1. **Playable first.** Every release must run by opening `index.html` — no build step.
2. **Grounded history, labelled legend.** Real wars are played in their real era with an
   era-appropriate hero (see §6 — sourced from the
   [List of wars involving Sri Lanka](https://en.wikipedia.org/wiki/List_of_wars_involving_Sri_Lanka)
   and the Mahavamsa/Culavamsa chronicle periods). Dutugemunu (2nd c. BCE) cannot
   historically fight Kandy, the Portuguese or the British — those matchups live in an
   explicitly framed **"Legends of the King"** mythic mode (same device already used for
   the Sigiriya bonus chapter), never presented as history.
3. **Respectful tone.** Sacred sites, chronicles and cultures depicted with care — epic,
   not caricature.

**Legend:** ☐ planned ◐ partial (exists in v0.1, needs expansion) ✅ shipped in v0.1

---

## Version plan at a glance

| Version | Codename | Theme | Headline features |
|---|---|---|---|
| v0.1 | *Ruwanwelisaya* | ✅ shipped | 6-level Dutugemunu campaign, FPS combat, AI, settings, procedural audio |
| v0.2 | *Armoury* | ✅ shipped | Spear/axe/mace/dagger, 9-skill Renown tree, herb healing, threat ring, rally, rideable war elephants, wildlife & flora pass (pulled forward from v0.3 §2.4) |
| v0.3 | *Kandula* | ◐ shipped | ✅ Realism presets (settings + pause), ✅ third-person mode (V), ✅ campaign day counter + drifting sun, ✅ **weather** (monsoon rain / dust / heat-haze), ✅ **more fauna** (monkeys, buffalo, crocodiles); ☐ full day/night cycle, war-camp hub, crowds |
| v0.4 | *Taprobane* | ◐ shipped | ✅ Ancient-map campaign screen (engraved chart, kingdom labels, era filter, 16 chronicle wars, campaign launch); ☐ save slots, in-game M map |
| v0.5 | *Shadows* | ◐ shipped | ✅ Stealth takedowns, corpse awareness, whistle lure, concealment, Warrior Sense, mantle/vault; ☐ full ledge climbing, finisher animations, crowds |
| v0.6 | *Chronicles I* | ◐ shipped | ✅ Two playable era campaigns from the map: Gajabahu's Crossing (~120 CE) and the Liberation of Polonnaruwa (1070); ☐ remaining Chronicles I rows |
| v0.7 | *Chronicles III (early)* | ◐ shipped | ✅ **Yapahuwa & the Tooth** (1283, Kurunegala era) — a relic-escort defense up the rock stair; ☐ Dambadeniya Shield, Kotte Rising |
| v0.8 | *Chronicles II* | ☐ planned | Parakramabahu's Wars, the Invasion of Kalinga Magha |
| v0.9 | *Chronicles IV (early)* | ◐ shipped | ✅ **Battle of Mulleriyawa** (1559) — the first gunpowder enemies (`AI_TYPES.gunner`, telegraphed musket reload) and Portuguese armour; ✅ **The Passes of 1803** (First Anglo-Kandyan War) — a jungle ambush against British redcoat gunners; ☐ Kandyan–Dutch wars, the Uva Rising finale |
| v1.0 | *One Island* | ◐ shipped | ✅ **Legends of the King** — the "War of Ages" arena where Dutugemunu faces any age's foe (Chola/Pandya/Kandy/Portuguese/British), explicitly framed as legend; ✅ **polish & performance pass** — FPS/frame-time meter, opt-in adaptive quality (steps the preset down on sustained low FPS), first-launch hardware quality auto-detect, and auto-pause when the tab is hidden; ☐ further campaign polish |
| v1.1 | *Brothers-in-Arms* | ◐ shipped | ✅ **Phase M1** async multiplayer: seeded Challenge Codes (same fight for everyone) + per-faction leaderboards + daily-seed challenge + ✅ **ghost replays** (record your best run through a code, race its translucent spectre next time); ☐ P2P co-op, duel PvP |

---

## 1 · v0.2 — "Armoury": combat depth

### 1.1 Weapons (◐ sword + longbow exist)

| Weapon | Class | Notes |
|---|---|---|
| ✅ War spear | Reach / thrust | Longer range, wide sweep, +20% vs. brutes (skill unlock, slot 2) |
| ✅ Battle axe | Heavy / cleave | Slow, staggers, splits barricades & gates (skill unlock, slot 3) |
| ✅ Mace / gada | Heavy / blunt | +50% vs. armoured brutes/champions (skill unlock, slot 4) |
| ✅ Dagger | Fast / stealth | Quick and quiet; 3× damage from behind (skill unlock, slot 5) |
| ✅ Shield (equippable) | Defense | Raise the guard with **H**: a passive block arc (no RMB-hold) that soaks frontal melee **and turns aside arrows** a bare parry can't, folds behind an active block for near-impunity, slows the pace, and enables a **shield-bash** (left-click) that staggers and shoves a front cone |
| ✅ Javelin bundle | Ranged sidearm | **Z** hurls one of 3 heavy arcing casts between melee exchanges without switching off your blade; HUD stock counter; refilled at checkpoints |
| ✅ Fire arrows | Bow upgrade | Skill unlock: +35% damage, 2× vs. wooden structures |

Systems work: weapon wheel / number-key quick slots, per-weapon damage-type vs.
armor-type table, per-weapon movesets on the existing rig (player FP + NPC),
loot pickups from fallen elites, level-authored weapon racks.

### 1.2 Skills & progression (✅ shipped v0.2 — 9-skill tree, K key / pause / summary)

- ✅ **Skill tree** fed by Renown (already earned per mission/civilian saved), 3 branches:
  - **Warrior** — combo extender (4th swing), parry window +, stagger damage +, dual-wield dagger.
  - **Hunter** — faster draw, breath-hold zoom, arrow recovery from corpses, fire/heavy arrows.
  - **Commander** — ally damage/health auras, rally shout (AI push), Kandula horn (elephant charge event, once per mission).
- ✅ Skill screen accessible from pause + mission summary; ✅ **respec** between missions
  ("Forget All" unlearns every discipline and frees the Renown to re-spend).
- ✅ Persist in the existing `G.GameState` localStorage save.

### 1.3 Health & survival (◐ flat 100 HP + full-heal checkpoints)

- ✅ Max-vitality growth with campaign progress: `G.Skills.bonusHp()` scales the body from
  100 to **150** across the nine-skill tree (and drops back on respec).
- ✅ **Herb pouch**: carryable field remedies (`player.herbs`, hold-G to chew with a
  heal-over-time), refilled at checkpoints; the Herbalist skill deepens it.
- ✅ Optional **regeneration modes** tied to the Realism setting (§2.1): arcade
  (auto-regen), standard (regen to 40% only), realistic (herbs/checkpoints only).
- ✅ Low-vitality **limp** under a quarter HP on the realistic preset (slower legs).

### 1.4 Enemy-nearby warning (✅ shipped v0.2 — toggle in Settings → Accessibility)

- ✅ HUD **threat ring** around the crosshair/compass: directional pips for enemies in
  detection states (grey = suspicious, orange = searching, red = engaged) — doubles as an
  accessibility aid for players who can't rely on audio cues.
- ✅ Audio sting + controller-style **screen-edge pulse** the first moment an alerted
  enemy closes inside 10 m — the pulse lights the edge nearest its bearing (left / right /
  front), fires once per arrival, and is a `G.UIBus.threatPing` + `audio.threatSting`.
- ✅ Toggleable in Settings → Accessibility (shares the threat-ring toggle); auto-disabled
  in the "realistic" preset by design.

---

## 2 · v0.3 — "Kandula": realism, third person, living days

### 2.1 Realism controls on Settings **and** Pause pages (✅ shipped v0.3)

A single **Realism preset** (Arcade / Standard / Realistic / Custom) exposed in both the
settings screen (new Realism tab) and directly on the pause menu, driving live dials:

- ✅ damage taken/dealt multipliers, health regeneration mode (full / to-40% / none)
- ✅ HUD minimalism (hides compass/tracker/threat-ring for diegetic play)
- ✅ arrow physics drop severity, ✅ enemy awareness sharpness, ✅ low-vitality limp
  (realistic preset)
- ☐ friendly fire on/off, herb scarcity dial

### 2.2 Third-person mode (✅ shipped v0.3 — core)

- ✅ Shoulder camera (toggle key `V` + settings default), reusing the existing
  `HumanoidRig` as the player body (player's sash colour) with the FP arms hidden;
  camera collision probe against the physics world; tighter over-shoulder framing
  while drawing the bow; body rides the howdah when mounted.
- ☐ Player rig full traversal animations (§4) and finishers in both cameras.

### 2.3 Day/night & day-by-day campaign structure (◐ shipped v0.3 — calendar + drifting sun)

- ◐ **Time-of-day**: the sun now drifts visibly across the sky during a mission
  (sky dome + shadows follow). ☐ Full day/night arc, moon, torch-lit night missions.
- ✅ **Campaign calendar**: mission briefs show "Day N of the campaign · time of day";
  each victory advances the calendar by that chapter's march (stored in the save).
- ☐ Missions locked to time (night infiltration, dawn siege); optional side
  missions consume days.
- ☐ War-camp hub scene between missions: talk to the Ten Giants, spend skills, choose
  the next march on the field map.

### 2.4 "Very ancient environment" density pass (◐ — flora & fauna shipped early in v0.2)

- ☐ Populated settlements: civilian crowds with daily-routine schedules (market, wells,
  paddy work, temple worship — AC-style living streets).
- ☐ More architecture: vatadage shrines, bodhigara, stone bridges, cave temples,
  irrigation canals & sluices (bisokotuwa), city walls with working gates.
- ✅ Wildlife (v0.2): peafowl that fan their tails and spotted deer that wander and
  flee from battle; **rideable war elephants** (mount F, WASD drive, trample) in the
  city, the siege and the stupa defense. ✅ (v0.3) **monkeys** (curling tail, skittish),
  **water buffalo** (sweeping horns, hard to startle) and **mugger crocodiles** (low,
  still, tail-sweeping) join the weighted fauna pool with per-species nerve (`timid`).
- ✅ Flora (v0.2): four tree archetypes (clustered rain-tree crowns, palms, flowering
  temple trees, banyan landmarks with aerial roots), per-instance colour variation,
  flowering shrubs, lotus pads & blooms on every tank, mossy stones & standing monoliths,
  gatherable healing-herb plants.
- ✅ Weather (`World.setWeather` in `js/engine/world.js`): **monsoon rain** (falling
  streaks that follow the player, darkened sky/fog, a rain audio bed), dry-zone **dust
  storms** (blowing motes + amber haze + gusting wind) and **heat haze** (warm shimmering
  exposure). Set per level via the atmosphere config — Mulleriyawa (1559) fights in the
  monsoon paddy, the Ruwanwelisaya defense shimmers under a dry-zone noon.

---

## 3 · v0.4 — "Taprobane": the ancient map & war selection

### 3.1 Campaign map screen (✅ shipped v0.4 — "Campaign Map — Taprobane" on the main menu)

- ✅ Full-screen **ancient Taprobane chart** in the style of the classical/early-modern
  maps of Ceylon (compass rose, engraved sea, ships, sea-serpent, aged parchment,
  "ANCIENNE ISLE TAPROBANE" cartouche, degree-tick plate border) — procedural canvas
  painting, with the `assets/map/taprobane.jpg` slot auto-detected for a real
  public-domain scan (e.g. the 1686 Mallet engraving).
- ✅ Kingdom regions labelled: Rajarata/Anuradhapura, Ruhuna, Polonnaruwa, Jaffna,
  Dambadeniya–Kurunegala, Sigiriya, Kandy, Kotte, Sitawaka + central highlands, rivers.
  ☐ Sea-lane invasion arrows.
- ✅ **Select-a-war UI**: 16 conflicts pinned on the chart, each with a chronicle-page
  brief (date, combatants, historical outcome, summary) sourced from the List of wars
  involving Sri Lanka; the Dutugemunu pin launches the playable campaign chapters, the
  Lion Rock pin the bonus legend; future Chronicles wars appear as chronicle records.
  Completed chapters show ✓ seals.
- ✅ Era rail (543 BCE → 1818 CE) filtering conflicts by chronicle period —
  Anuradhapura → Polonnaruwa → Transitional → Kandyan → British.
- ☐ Multiple **save slots** + per-campaign progress tracking.

### 3.2 In-game map (☐ new)

- ☐ `M` opens a regional hand-drawn map of the current mission area (objectives, camps,
  discovered points of interest), same parchment art language.

---

## 4 · v0.5 — "Shadows": Assassin's-Creed-style traversal & stealth

- ◐ **Climbing**: ✅ mantle/vault (SPACE hoists you over barricades, crates and onto
  ledges up to ~1.9m when something blocks the way). ☐ Full ledge-grab wall climbing.
- ✅ **Parkour-lite**: vaulting barricades & low walls via the mantle system.
- ✅ **Stealth kit** (v0.5): crouch-takedowns from behind unaware enemies (knife kills
  outright, heavier blades wound gravely — both silent), corpse awareness (patrols that
  spot a fallen brother go searching), stone-still crouch concealment, whistle lure (B).
  ☐ Social blend in civilian crowds (needs §2.4 crowds).
- ✅ **Warrior Sense** (X): stamina-costed pulse marking enemies and the objective
  through walls for 6s; disabled on the realistic preset by design.
- ☐ Assassination/parry **finisher animations** (both cameras).
- ◐ Mission design pass: the village liberation is fully stealthable end-to-end.

---

## 5 · v0.6–v0.9 — "Chronicles": era campaigns from the historical record

Each campaign = 4–7 missions + its own briefing art, faction armour sets, weapons and
music layer, launched from the Taprobane map. Historically attested wars, per the
chronicles (Dipavamsa/Mahavamsa/Culavamsa/Rajavaliya) and the Wikipedia war list:

### v0.6 — Chronicles I: The Anuradhapura Wars (Chola & Pandya)
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ☐ **Vijithapura** (162–161 BCE) | Dutugemunu *(extends shipped campaign)* | Four-month siege of Vijithapura, Kandula at the south gate |
| ✅ **Gajabahu's Crossing** (c. 120 CE) — *shipped v0.6* | Gajabahu I fights beside you | Beach landing among the war-canoes, storming the palisaded Chola camp, breaking the captive pens (freed captives run for the boats), slaying the camp commander, optional store-burning |
| ☐ **The Pandyan Sack** (846 CE) | Defender of Anuradhapura under Sena I | Fighting withdrawal, Battle of Mahatalita, save the relics |
| ☐ **Udaya's Counterstroke** (946 CE) | General Viduragga | Repel Parantaka I, cross-strait raid to recover the plunder |
| ◐ **The Great Conquest & Resistance** (992–1070) | Ruhuna resistance → Vijayabahu I | ✅ *Liberation of Polonnaruwa (1070) shipped v0.6*: stealth-or-steel patrol clearing, citadel gate breach with the resistance rising, the occupation governor, raising the lion banner. ☐ Fall-of-Anuradhapura + guerrilla-years missions |

### v0.7 — Chronicles III: The Transitional Kingdoms (incl. **Kurunegala**) — ◐ shipped
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ☐ **Dambadeniya Shield** (1247–1270) | Parakramabahu II's guard | Repel Chandrabhanu's two Tambralinga invasions and the Pandyan expeditions |
| ✅ **Yapahuwa & the Tooth** (1277–1288) — *shipped v0.7* | You escort Bhikkhu Ananda | The fortress is lost (history's own outcome, not rewritten) — you buy the time for the Relic-bearer to reach the sally-port: hold the gate, escort him up the great stair, hold the summit, rescue temple guards en route. Frames the historical embassy-recovery as the mission's epilogue. |
| ☐ **Kotte Rising** (1411–1454) | Prince Sapumal / Parakramabahu VI's forces | Ming–Kotte war aftermath, defence against Vijayanagara raids, conquest of Jaffna |

### v0.8 — Chronicles II: Polonnaruwa Ascendant — ☐ planned
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ☐ **Parakramabahu's Wars** (1153–1186) | Parakramabahu the Great's champion | Unification of the three lands, overseas expeditions (Pagan war 1164, Pandyan intervention 1169–77) |
| ☐ **The Broken Throne** (1202–1215) | Last guard of Polonnaruwa | Chola raids of 1202/1208/1210, Queen Lilavati's fall, stand against Kalinga Magha's invasion (1215) |

### v0.9 — Chronicles IV: Muskets on the Shore (European wars & **Kandy**) — ◐ shipped
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ◐ **Sitawaka Lion** (1551–1593) | Sitawaka/Kotte-era warrior | ✅ *Battle of Mulleriyawa (1559) shipped v0.7*: break a Portuguese musket skirmish line before it reloads, spike its two gun emplacements, rescue pinned soldiers, break the field commander. ☐ Sieges of Kotte, Danture |
| ☐ **Kandyan Defiance** (1670–1766) | **Kandyan Kingdom** ranger | Kandyan–Dutch wars: forest ambush warfare, Rajasinha II's offensives |
| ◐ **The Last Kingdom** (1803–1818) | Kandyan guerrilla under Keppetipola | ✅ *The Passes of 1803 shipped v0.7*: ambush the British vanguard, burn the baggage train, cut down the column's officer, seal the pass, free pressed porters — the First Anglo-Kandyan War told as a retreat harried to pieces. ☐ 1815 fall, 1818 Uva–Wellassa rising (the series' solemn finale) |

*New systems these require:* naval landing set pieces ✅ (`Build.boat`, shipped v0.6),
elephant riding ✅ (shipped v0.2), early gunpowder enemies ✅ — `AI_TYPES.gunner`
(shipped v0.7): matchlock muskets with a long, audible-and-visible telegraphed aim
and a very long reload window so a rushed melee attacker can close and cut a gunner
down before the second shot, near-hitscan ballistics, gunfire noise that carries and
alerts the whole field, and Portuguese/British armour palettes. Fort architecture per
era, faction flag art, and era-specific music modes remain open.

### v1.0 — "Legends of the King" (mythic crossover mode) — ◐ shipped
- ✅ The user-requested fantasy — **Dutugemunu vs. the Cholas, the Pandyas, Kandy, the
  Portuguese, even the British** — shipped as an explicitly framed dream-chronicle
  ("*In the bards' fireside telling, the great king strides across the centuries…*"),
  title-carded exactly like the Sigiriya chapter so history and legend never blur.
  Reached from a dedicated **"✦ Legends of the King"** main-menu entry, and its brief
  is stamped "a legend outside the campaign's calendar". A history-note on the picker
  states plainly that Dutugemunu historically fought only the Cholas.
- ✅ Horde-style **War of Ages** arena (`js/levels/warOfAges.js`, `js/ui/legendsMenu.jsx`):
  pick the age's foe and tale length (3/5/8 waves), then hold a sacred stupa arena
  against escalating waves — the chosen faction sets the enemy palette, banners and
  troop mix (including gunpowder `gunner` troops for the Portuguese/British).
  King Dutugemunu (given a real combat brain, 600 HP) and three of the Ten Giants
  fight at your side; the tale ends if the king falls.
- ✅ **Polish & performance pass** (`G.Perf` in `js/app.js`): a self-clocked FPS /
  frame-time meter (optional on-screen readout, off by default) that also drives an
  opt-in **adaptive-quality** governor — after ~3s of sustained low frames it steps the
  graphics preset down one rung (never up, so it settles without oscillating), keeping
  the wide range of browser hardware playable. A **first-launch quality auto-detect**
  fits the starting preset to the machine (`navigator.deviceMemory` / cores / mobile UA)
  so low-end devices don't open on Medium and stutter, and **auto-pause on tab-hidden**
  halts the battle the instant you switch away. All exposed as Settings toggles.
- ☐ Further full-campaign polish remains for the v1.0 release proper.

---

## 6 · v1.1+ — "Brothers-in-Arms": multiplayer

Browser + no-build-step makes this the hardest pillar; staged to keep each release real:

1. ◐ **Phase M1 — Asynchronous (no server):** ✅ shipped — shareable **Challenge Codes**
   (`js/challenge.js`) that pin down a War of Ages fight (faction · tale length · seed);
   the seeded wave spawner reproduces the *exact same fight* for every player, so only
   skill decides the score. ✅ A per-faction, localStorage **leaderboard** (shown on the
   Legends menu and stamped on the run summary with rank + NEW-BEST), a **Fresh /
   Today's (shared daily seed) / From-a-code** launcher, and a one-tap "copy challenge"
   share on the summary. ✅ **Ghost replays** (`js/ghost.js`): a code makes the fight
   reproducible, so a run's path is meaningful — the recorder samples position, facing,
   weapon and action at 8 Hz, and beating the stored score overwrites the ghost. Take the
   same code again and a translucent cyan spectre of your best run fights the identical
   waves beside you (keyed by code in localStorage, so a ghost only haunts its own fight).
2. ☐ **Phase M2 — P2P co-op (WebRTC):** 2-player co-op in wave-defense and Chronicles
   missions via WebRTC DataChannels; manual copy-paste signalling keeps the no-server
   promise, an optional tiny signalling relay (documented, self-hostable) makes it
   one-click. Host-authoritative sim, second player possesses an ally Giant.
3. ☐ **Phase M3 — PvP duels:** 1v1 parry-duel arenas (Elara-kit movesets), best-of-five,
   with era-champion cosmetics.
4. ☐ **Phase M4 (stretch):** 4-player siege co-op (attack/defend Vijithapura).

---

## 7 · Continuous engineering tracks (every version)

- ◐ **Performance:** instancing/LOD exist; add merged static batches per level, worker
  thread for physics, quality autotuner, mobile/touch controls investigation.
- ◐ **Save system:** extend `G.GameState` for slots, skill trees, calendar, map progress.
- ◐ **Asset pipeline:** keep every procedural asset swappable (see `assets/README.md`);
  add optional glTF character/architecture packs as they become available (CC0 only).
- ☐ **Localisation:** externalise strings; Sinhala and Tamil as first targets.
- ☐ **Testing:** grow the headless Playwright suite (already used for v0.1) into a CI
  gate per level and per campaign.
- ☐ **Historical review:** each Chronicles drop gets a sources note in-game (chronicle
  citations on briefing cards, like v0.1's credits note separating history from legend).

---

## 8 · Suggested order of attack & rough effort

| Milestone | Est. effort | Depends on |
|---|---|---|
| v0.2 Armoury | 3–4 weeks | — |
| v0.3 Kandula | 4–5 weeks | v0.2 (realism ties into health) |
| v0.4 Taprobane | 2–3 weeks | v0.3 (calendar feeds the map) |
| v0.5 Shadows | 5–6 weeks | v0.3 (third-person animations) |
| v0.6–0.9 Chronicles | 4–6 weeks **each** | v0.4 map, v0.5 systems |
| v1.0 Legends + polish | 3 weeks | two Chronicles shipped |
| v1.1+ Multiplayer | 6–10 weeks staged | v1.0 stability |

*Solo-developer estimates at vertical-slice quality; halve scope before halving quality.*
