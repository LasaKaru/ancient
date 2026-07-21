# WARRIORS OF TAPROBANE — Development Roadmap

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
| v0.3 | *Kandula* | ✅ shipped | ✅ Realism presets (+ friendly-fire / herb dials), ✅ third-person mode (V), ✅ campaign day counter, ✅ **weather** (rain / dust / heat-haze), ✅ **more fauna** (monkeys, buffalo, crocodiles), ✅ **full day/night arc** (moon, stars, night raid), ✅ **civilian crowds**, ✅ **more architecture**, ✅ **war-camp hub** |
| v0.4 | *Taprobane* | ✅ shipped | ✅ Ancient-map campaign screen (engraved chart, kingdom labels, era filter, 16 chronicle wars, campaign launch), ✅ **in-game M map** (parchment mission chart), ✅ **save slots** (three independent campaigns), ✅ **sea-lane invasion arrows** |
| v0.5 | *Shadows* | ✅ shipped | ✅ Stealth takedowns, corpse awareness, whistle lure, concealment, Warrior Sense, mantle/vault, ✅ **full ledge climbing**, ✅ **assassination/riposte finishers**, ✅ **social-blend crowds** |
| v0.6 | *Chronicles I* | ◐ shipped | ✅ Two playable era campaigns from the map: Gajabahu's Crossing (~120 CE) and the Liberation of Polonnaruwa (1070); ☐ remaining Chronicles I rows |
| v0.7 | *Chronicles III (early)* | ◐ shipped | ✅ **Yapahuwa & the Tooth** (1283, Kurunegala era) — a relic-escort defense up the rock stair; ☐ Dambadeniya Shield, Kotte Rising |
| v0.8 | *Chronicles II* | ◐ shipped | ✅ **The Broken Throne** (1215) — the last stand at Polonnaruwa against Kalinga Magha, an honest fighting withdrawal that saves the Sacred Tooth; ☐ Parakramabahu's Wars |
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
- ✅ **friendly fire** on/off (your own steel/arrows can wound allies — on by default only
  on the realistic preset) and a **herb-abundance dial** (0.5 sparse … 1.5 plentiful,
  scaling the pouch cap and the starting handful; realistic is stingy, arcade generous)

### 2.2 Third-person mode (✅ shipped v0.3 — core)

- ✅ Shoulder camera (toggle key `V` + settings default), reusing the existing
  `HumanoidRig` as the player body (player's sash colour) with the FP arms hidden;
  camera collision probe against the physics world; tighter over-shoulder framing
  while drawing the bow; body rides the howdah when mounted.
- ✅ **Character-fidelity pass** — the shared `HumanoidRig` (every soldier, king,
  civilian, the third-person player body, the ghost spectre) rebuilt from plain
  capsules into an articulated, layered figure: jointed legs (thigh → knee-cop →
  greave → sabaton boot with a toe), a pelvis + belt-and-buckle + hanging
  faulds/tassets, a banded lamellar cuirass with a raised collar, gilt trim ring
  and chest medallion, gorget-guarded neck, pauldron → vambrace → sculpted
  five-box hands, and a real face (whites-and-iris eyes, angled brows, nose,
  mouth, swept-back hair, jaw beard). Same-material sub-meshes are merged
  (`BGU.mergeGeometries`) to hold the draw-call count down; the animation state
  machine is untouched (all articulated groups preserved).
- ☐ Player rig full traversal animations (§4) and finishers in both cameras.

### 2.3 Day/night & day-by-day campaign structure (◐ shipped v0.3 — calendar + drifting sun)

- ✅ **Time-of-day**: the sun drifts across the sky during a mission, and now a full
  **day/night arc** — `World.setTimeOfDay(t)` drives sun elevation, sky/fog darkening,
  a sun→moonlight blend, and a fading **star field + moon**; a level may pin a fixed
  time (`atmosphere.timeOfDay` / `night`) or run a live cycle (`dayNightRate`). The
  **village liberation is now a moonlit night raid** lit by braziers — torch-lit night
  infiltration, exactly the stealth mission the v0.5 kit was built for.
- ☐ Missions locked to time by the map (dawn siege etc.) beyond the authored ones.
- ✅ **Campaign calendar**: mission briefs show "Day N of the campaign · time of day";
  each victory advances the calendar by that chapter's march (stored in the save).
- ☐ Missions locked to time (night infiltration, dawn siege); optional side
  missions consume days.
- ✅ **War-camp hub** between missions (`js/ui/warCamp.jsx`): after a mainline chapter you
  rest at the camp — take counsel with the **Ten Giants** (the Dasa Maha Yodhayo, each with
  a trait and a line), spend Renown on skills, and choose to march on to the next chapter
  or turn to the field map.

### 2.4 "Very ancient environment" density pass (◐ — flora & fauna shipped early in v0.2)

- ✅ Populated settlements: **ambient civilian crowds** (`js/entities/crowd.js`) who wander
  a small daily beat — idle at a well, tend a stall (work posture), stroll a lane — and
  scatter in panic when battle erupts or a warrior sprints past. Authored into the sacred-
  city tutorial (a living street to blend into); any level can add `crowd: {…}`.
- ✅ More architecture (`js/engine/terrain.js` `Build.*`): **vatadage** (circular relic-house
  — terraces, pillar rings, a central dagoba, moonstone entrances), **bodhigara** (railed
  bo-tree shrine), **stone bridge** (walkable deck on piers), **bisokotuwa sluice** (the
  ancient valve-pit + channel) and a **rock cave-temple**. Placed in the sacred city
  (vatadage, bodhigara, cave-temple) and the village (bridge over the tank, sluice at the
  paddy bund). City walls with working gates already ship (`Build.gatehouse`).
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
  ✅ **Sea-lane invasion arrows** — dashed, labelled routes engraved on the chart (Chola ·
  Pandya across the Palk Strait, Kalinga Magha from the Bay of Bengal, European fleets from
  the south-west).
- ✅ **Select-a-war UI**: 16 conflicts pinned on the chart, each with a chronicle-page
  brief (date, combatants, historical outcome, summary) sourced from the List of wars
  involving Sri Lanka; the Dutugemunu pin launches the playable campaign chapters, the
  Lion Rock pin the bonus legend; future Chronicles wars appear as chronicle records.
  Completed chapters show ✓ seals.
- ✅ Era rail (543 BCE → 1818 CE) filtering conflicts by chronicle period —
  Anuradhapura → Polonnaruwa → Transitional → Kandyan → British.
- ✅ Multiple **save slots** (`G.Saves` in `js/app.js`): three independent campaigns keyed
  in localStorage, chosen from a **Save Slots** menu that shows each slot's hero, day and
  wins; a legacy single-save migrates into slot 0 so returning players keep their progress.

### 3.2 In-game map (✅ shipped v0.4)

- ✅ `M` opens a regional hand-drawn **parchment map** (`js/ui/regionMap.jsx`) of the
  current mission area — the player's position + facing, objective markers (gold diamonds,
  ✓-sealed when done), the entry point, and enemy presence — in the same engraved,
  aged-parchment language as the Taprobane chart, with a compass rose. Pauses the fight;
  Esc or M closes it. Fed by `engine.getMapData()`.

---

## 4 · v0.5 — "Shadows": Assassin's-Creed-style traversal & stealth

- ✅ **Climbing**: mantle/vault (SPACE hoists you over barricades, crates and onto ledges
  up to ~1.9m), and now a **full ledge-grab climb** — a taller wall (~1.9–3.7m) with a
  clear lip and headroom is latched and pulled up over in a short scripted climb (a real
  stamina cost; input is suspended for the pull-up), while low obstacles still mantle.
- ✅ **Parkour-lite**: vaulting barricades & low walls via the mantle system.
- ✅ **Stealth kit** (v0.5): crouch-takedowns from behind unaware enemies (knife kills
  outright, heavier blades wound gravely — both silent), corpse awareness (patrols that
  spot a fallen brother go searching), stone-still crouch concealment, whistle lure (B).
  ✅ **Social blend** in civilian crowds (v0.5): stand still and unremarkable among two or
  more civilians and the enemy's spotting range is halved (`engine.playerBlended` →
  `enemyAI._canSee`); sprinting, drawing or striking breaks cover. A 👤 blended HUD cue.
- ✅ **Warrior Sense** (X): stamina-costed pulse marking enemies and the objective
  through walls for 6s; disabled on the realistic preset by design.
- ✅ Assassination/parry **finisher animations** (both cameras): a shared kill flourish
  (`combat._doFinisher` + `PlayerRig.playFinisher`, a hard overhead chop in first person
  and a strike on the third-person body, with a heavy view-punch and audio). Fires on a
  stealth takedown (the **assassination**) and on a **riposte** — a strike into a
  staggered foe (e.g. one you've just perfect-parried) lands at 2.2× for the kill.
- ◐ Mission design pass: the village liberation is fully stealthable end-to-end (now at night).

---

## 5 · v0.6–v0.9 — "Chronicles": era campaigns from the historical record

Each campaign = 4–7 missions + its own briefing art, faction armour sets, weapons and
music layer, launched from the Taprobane map. Historically attested wars, per the
chronicles (Dipavamsa/Mahavamsa/Culavamsa/Rajavaliya) and the Wikipedia war list:

### v0.6 — Chronicles I: The Anuradhapura Wars (Chola & Pandya)
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ✅ **Vijithapura** (162–161 BCE) — *shipped as core Chapter III* | Dutugemunu | The four-month siege of Vijithapura / Vijitanagara with Kandula at the gate is the shipped campaign's Chapter III ("The Gates of Vijitanagara"). |
| ✅ **The First Tiger** (110 CE) — *shipped* | Rajarata coast muster | The early Chola raid the chronicles record as a Chola success, played as a dawn coastal defence: drive the raiders off the strand, cut the bound townsfolk free before they are loaded, and break the raid-captain — the raid Gajabahu avenges ten years hence. Launched from the **110 Chola Invasion** map pin. |
| ✅ **Gajabahu's Crossing** (c. 120 CE) — *shipped v0.6* | Gajabahu I fights beside you | Beach landing among the war-canoes, storming the palisaded Chola camp, breaking the captive pens (freed captives run for the boats), slaying the camp commander, optional store-burning |
| ✅ **The Pandyan Sack** (846 CE) — *shipped* | Defender of Anuradhapura under Sena I | Srimara's sack, played as a defence of the relics: carry the casket from the great stupa to the inner shrine refuge, hold the sacred precinct through three waves, shepherd the fleeing monks, and break Srimara's champion at the gate. Launched from the **Pandyan Sack** map pin. |
| ✅ **Udaya's Counterstroke** (946 CE) — *shipped* | General Viduragga | The cross-strait recovery raid: land on the Chola shore beside Viduragga, storm the shore guard, send porters to run the plundered treasure-chests down to the boats, free the penned captives, and cut down the Chola shore-captain who holds the treasury. Launched from the **946 CE** map pin. |
| ✅ **The Great Conquest & Resistance** (992–1070) — *shipped* | Ruhuna resistance → Vijayabahu I | ✅ *The Fall of Anuradhapura (c.993) shipped*: the last night of the old kingdom — hold the sacred precinct, bear the regalia south to the Ruhuna road, see the people away, and make the Chola general pay; the city falls (history's outcome) but the crown escapes south to rise again. ✅ *Liberation of Polonnaruwa (1070) shipped v0.6*: stealth-or-steel patrol clearing, citadel gate breach with the resistance rising, the occupation governor, raising the lion banner. ☐ guerrilla-years missions remain open. |

### v0.7 — Chronicles III: The Transitional Kingdoms (incl. **Kurunegala**) — ◐ shipped
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ✅ **Dambadeniya Shield** (1247–1270) — *shipped* | Parakramabahu II's guard | A two-phase defence of Chandrabhanu's Javaka invasion: bear the Tooth Relic up to the summit shrine, HOLD the rock-gate through two assault waves, then SALLY down to the invasion shore to cast down Chandrabhanu's war-standard and break the man himself — rallying the gate defenders as you go. Launched from the **Tambralinga Invasions** map pin. |
| ✅ **Yapahuwa & the Tooth** (1277–1288) — *shipped v0.7* | You escort Bhikkhu Ananda | The fortress is lost (history's own outcome, not rewritten) — you buy the time for the Relic-bearer to reach the sally-port: hold the gate, escort him up the great stair, hold the summit, rescue temple guards en route. Frames the historical embassy-recovery as the mission's epilogue. |
| ✅ **Kotte Rising** (1411–1454) — *shipped* | Prince Sapumal / Parakramabahu VI's forces | The conquest of Jaffna, played as the storming of Nallur: break the gate-guard, then take the city quarter by quarter (raise the Kotte lion over three positions), spare the palace scribes, and depose the Arya Chakravarti king in his citadel. Launched from the **Kotte Conquest of Jaffna** map pin. ☐ Ming–Kotte 1411 + Vijayanagara-raid missions remain open. |

### v0.8 — Chronicles II: Polonnaruwa Ascendant — ☐ planned
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ✅ **Parakramabahu's Wars** (1153–1186) — *shipped* | Parakramabahu the Great's champion | A field action of the unification war: force a river ford against the rival claimant's shield-line, throw down the camp gate-barricades (a rideable war elephant waits to charge them), raise the lion banner over the captured court, break the pretender's champion, and rally the fallen. Launched from the **1153–1186** map pin. ☐ overseas expeditions (Pagan 1164, Pandyan intervention) remain open. |
| ✅ **The Broken Throne** (1215) — *shipped* | Last guard of Polonnaruwa | The night of Magha's sack, played as an honest fighting withdrawal: hold the citadel gate, escort the Relic-bearer over the causeway to the south sally-port, hold the crossing, and cut down Magha's war-captain — the city falls (history's own outcome) but the Sacred Tooth and the royal line escape south. Launched from the **Kalinga Magha** map pin. |

### v0.9 — Chronicles IV: Muskets on the Shore (European wars & **Kandy**) — ◐ shipped
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ◐ **Sitawaka Lion** (1551–1593) | Sitawaka/Kotte-era warrior | ✅ *Battle of Mulleriyawa (1559) shipped v0.7*: break a Portuguese musket skirmish line before it reloads, spike its two gun emplacements, rescue pinned soldiers, break the field commander. ☐ Sieges of Kotte, Danture |
| ✅ **Kandyan Defiance** (1670–1766) — *shipped* | **Kandyan Kingdom** ranger | A moonlit night raid on a Dutch Company stockade: slip the sally-port watch, spike the Company guns, fire the powder magazine (the set-piece), free the pressed villagers, and cut down the Dutch commander before the coast sends relief — Dutch matchlock gunners (`AI_TYPES.gunner`) man the walls. Launched from the **Kandyan–Dutch Wars** map pin. |
| ◐ **The Last Kingdom** (1803–1818) | Kandyan guerrilla under Keppetipola | ✅ *The Passes of 1803 shipped v0.7*: ambush the British vanguard, burn the baggage train, cut down the column's officer, seal the pass, free pressed porters — the First Anglo-Kandyan War told as a retreat harried to pieces. ✅ *The Uva Rising (1818) shipped — the series' solemn finale*: fight beside Keppetipola in the last defiance — raise the flag over Wellassa, break the redcoat outpost, see the people away into the hills, and cut down the reprisal's major; history's outcome (the kingdom ends) is kept, only the people and the memory saved. Launched from the **Fall of Kandy & the Uva Rising** map pin. ☐ 1815 convention/fall of Kandy mission remains open. |

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
- ✅ **Save system:** `G.GameState` carries slots (`G.Saves`), the skill tree, the campaign
  calendar and map progress — three independent save slots with legacy migration.
- ◐ **Asset pipeline:** every procedural asset stays swappable (see `assets/README.md`);
  ✅ **rebrand to _Warriors of Taprobane_** (the game outgrew a single king's war — it now
  spans every era) with wired optional **key-art slots** (menu backdrop, loading backdrop,
  per-campaign briefing banners via `js/ui/art.jsx`) that fade in over the procedural look
  when a file is present and fall back silently when absent; ☐ optional glTF packs (CC0).
- ◐ **Localisation:** ✅ scaffold shipped (`js/i18n.js`) — a `G.t('key')` string table with
  per-key English fallback, a persisted language choice and a Settings selector; the main
  menu is wired as the worked example with seed **Sinhala** and **Tamil** translations
  (pending native review). ☐ extend the coverage to the full UI.
- ☐ **Testing:** grow the headless Playwright suite (already used for v0.1) into a CI
  gate per level and per campaign.
- ✅ **Historical review:** every playable level carries a **chronicle-sources** citation
  (Mahavamsa / Culavamsa / Rajavaliya / early European accounts) shown on its briefing
  card, extending v0.1's credits note that separates history from legend.

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
