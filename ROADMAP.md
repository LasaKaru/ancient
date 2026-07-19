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
| v0.3 | *Kandula* | ◐ shipped | ✅ Realism presets (settings + pause), ✅ third-person mode (V), ✅ campaign day counter + drifting sun; ☐ full day/night cycle, war-camp hub, crowds, weather |
| v0.4 | *Taprobane* | The map | Ancient-map campaign screen, kingdom/war selection, save slots |
| v0.5 | *Shadows* | AC-style play | Climbing/parkour, stealth assassinations, warrior-sense, crowds/citizens |
| v0.6–0.9 | *Chronicles I–IV* | Era campaigns | Chola, Polonnaruwa, Kurunegala/transitional, Portuguese→Kandy→British wars |
| v1.0 | *One Island* | Full release | All campaigns + Legends of the King mode, polish, performance |
| v1.1+ | *Brothers-in-Arms* | Multiplayer | Async ghosts → P2P co-op → duel PvP |

---

## 1 · v0.2 — "Armoury": combat depth

### 1.1 Weapons (◐ sword + longbow exist)

| Weapon | Class | Notes |
|---|---|---|
| ✅ War spear | Reach / thrust | Longer range, wide sweep, +20% vs. brutes (skill unlock, slot 2) |
| ✅ Battle axe | Heavy / cleave | Slow, staggers, splits barricades & gates (skill unlock, slot 3) |
| ✅ Mace / gada | Heavy / blunt | +50% vs. armoured brutes/champions (skill unlock, slot 4) |
| ✅ Dagger | Fast / stealth | Quick and quiet; 3× damage from behind (skill unlock, slot 5) |
| ☐ Shield (equippable) | Defense | Passive block arc without RMB-hold, shield-bash stagger move |
| ☐ Javelin bundle | Ranged sidearm | 3-slot quick-throw between melee exchanges |
| ✅ Fire arrows | Bow upgrade | Skill unlock: +35% damage, 2× vs. wooden structures |

Systems work: weapon wheel / number-key quick slots, per-weapon damage-type vs.
armor-type table, per-weapon movesets on the existing rig (player FP + NPC),
loot pickups from fallen elites, level-authored weapon racks.

### 1.2 Skills & progression (✅ shipped v0.2 — 9-skill tree, K key / pause / summary)

- ✅ **Skill tree** fed by Renown (already earned per mission/civilian saved), 3 branches:
  - **Warrior** — combo extender (4th swing), parry window +, stagger damage +, dual-wield dagger.
  - **Hunter** — faster draw, breath-hold zoom, arrow recovery from corpses, fire/heavy arrows.
  - **Commander** — ally damage/health auras, rally shout (AI push), Kandula horn (elephant charge event, once per mission).
- ☐ Skill screen accessible from pause + mission summary; respec allowed between missions.
- ☐ Persist in the existing `G.GameState` localStorage save.

### 1.3 Health & survival (◐ flat 100 HP + full-heal checkpoints)

- ☐ Max-vitality growth with campaign progress (100 → 150 via skill tree).
- ☐ **Herb pouch**: carryable siyambala/kothala-himbutu field remedies (2–3 charges,
  hold-to-use with animation, found at camps) instead of checkpoint-only healing.
- ☐ Optional **regeneration modes** tied to the Realism setting (§2.1): arcade
  (slow auto-regen), standard (regen to 40% only), realistic (herbs/checkpoints only).
- ☐ Bandaged/limping state under 25% HP in realistic mode (slower sprint, audible breathing).

### 1.4 Enemy-nearby warning (✅ shipped v0.2 — toggle in Settings → Accessibility)

- ✅ HUD **threat ring** around the crosshair/compass: directional pips for enemies in
  detection states (grey = suspicious, orange = searching, red = engaged) — doubles as an
  accessibility aid for players who can't rely on audio cues.
- ☐ Audio sting + controller-style screen-edge pulse when an unseen enemy enters 10 m.
- ☐ Toggleable and scalable in Settings → Accessibility; auto-disabled in "realistic" preset.

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
  city, the siege and the stupa defense. ☐ Still to come: monkeys, buffalo, crocodiles.
- ✅ Flora (v0.2): four tree archetypes (clustered rain-tree crowns, palms, flowering
  temple trees, banyan landmarks with aerial roots), per-instance colour variation,
  flowering shrubs, lotus pads & blooms on every tank, mossy stones & standing monoliths,
  gatherable healing-herb plants.
- ☐ Weather: monsoon rain fronts, heat haze, dust storms in the dry zone.

---

## 3 · v0.4 — "Taprobane": the ancient map & war selection

### 3.1 Campaign map screen (☐ new — the roadmap's centrepiece)

- ☐ Full-screen **ancient Taprobane chart** in the style of the classical/early-modern
  maps of Ceylon (compass rose, sea-monster flourishes, aged parchment, "TAPROBANE"
  cartouche). Implemented as a procedural canvas painting so it ships asset-free, with
  an asset slot `assets/map/taprobane.jpg` for a real public-domain scan (e.g. the 1686
  Mallet *"Ancienne Isle Taprobane"* engraving) to replace it.
- ☐ Kingdom regions drawn and labelled: **Rajarata/Anuradhapura, Ruhuna, Polonnaruwa,
  Dambadeniya–Kurunegala, Gampola, Kotte, Sitawaka, Jaffna, Kandy**, plus sea-lane
  arrows for invading powers (Chola, Pandya, Portuguese, Dutch, British).
- ☐ **Select-a-war UI**: hovering a region/era reveals its conflicts (from §6) with a
  chronicle-page brief (combatants, date, historical outcome); click to launch that
  campaign or battle. Completed wars gain a wax-seal marker.
- ☐ Era slider along the map's edge (543 BCE → 1818 CE) filtering visible conflicts —
  the pasted period chronology (Anuradhapura → Polonnaruwa → Transitional → Kandyan →
  British) becomes the literal UI.
- ☐ Multiple **save slots** + per-campaign progress tracking.

### 3.2 In-game map (☐ new)

- ☐ `M` opens a regional hand-drawn map of the current mission area (objectives, camps,
  discovered points of interest), same parchment art language.

---

## 4 · v0.5 — "Shadows": Assassin's-Creed-style traversal & stealth

- ☐ **Climbing**: ledge-grab & climbable surfaces (city walls, rock faces, scaffolds,
  Sigiriya retrofit) via tagged geometry + capsule probes.
- ☐ **Parkour-lite**: vault barricades, mantle windows, rooftop runs across market
  streets, hay-cart drops.
- ☐ **Stealth kit**: crouch-takedowns with dagger (front fail / back success), body
  awareness (patrols find corpses → search state already exists), foliage concealment,
  whistle lure, social blend in civilian crowds (§2.4).
- ☐ **Warrior Sense** (AC "eagle vision" analogue, framed as a hunter's focus):
  brief pulse highlighting enemies/objectives through walls; costs stamina; honours the
  realistic preset (disabled) and accessibility settings (stronger/longer variant).
- ☐ Assassination/parry **finisher animations** (both cameras).
- ☐ Mission design pass: every combat mission gains a viable stealth route.

---

## 5 · v0.6–v0.9 — "Chronicles": era campaigns from the historical record

Each campaign = 4–7 missions + its own briefing art, faction armour sets, weapons and
music layer, launched from the Taprobane map. Historically attested wars, per the
chronicles (Dipavamsa/Mahavamsa/Culavamsa/Rajavaliya) and the Wikipedia war list:

### v0.6 — Chronicles I: The Anuradhapura Wars (Chola & Pandya)
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ☐ **Vijithapura** (162–161 BCE) | Dutugemunu *(extends shipped campaign)* | Four-month siege of Vijithapura, Kandula at the south gate |
| ☐ **Gajabahu's Crossing** (c. 120 CE) | Gajabahu I | Naval landing, march into Chola country, freeing the 12,000 captives |
| ☐ **The Pandyan Sack** (846 CE) | Defender of Anuradhapura under Sena I | Fighting withdrawal, Battle of Mahatalita, save the relics |
| ☐ **Udaya's Counterstroke** (946 CE) | General Viduragga | Repel Parantaka I, cross-strait raid to recover the plunder |
| ☐ **The Great Conquest & Resistance** (992–1070) | Ruhuna resistance → Vijayabahu I | Fall of Anuradhapura, guerrilla years, liberation of Polonnaruwa from the Chola Empire |

### v0.7 — Chronicles II: Polonnaruwa Ascendant
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ☐ **Parakramabahu's Wars** (1153–1186) | Parakramabahu the Great's champion | Unification of the three lands, overseas expeditions (Pagan war 1164, Pandyan intervention 1169–77) |
| ☐ **The Broken Throne** (1202–1215) | Last guard of Polonnaruwa | Chola raids of 1202/1208/1210, Queen Lilavati's fall, stand against Kalinga Magha's invasion (1215) |

### v0.8 — Chronicles III: The Transitional Kingdoms (incl. **Kurunegala**)
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ☐ **Dambadeniya Shield** (1247–1270) | Parakramabahu II's guard | Repel Chandrabhanu's two Tambralinga invasions and the Pandyan expeditions |
| ☐ **Yapahuwa & the Tooth** (1277–1288) | Kurunegala-era hero | Fall of Yapahuwa to Arya Chakravarti, embassy-quest to recover the Sacred Tooth Relic (Dambadeniya–**Kurunegala** period) |
| ☐ **Kotte Rising** (1411–1454) | Prince Sapumal / Parakramabahu VI's forces | Ming–Kotte war aftermath, defence against Vijayanagara raids, conquest of Jaffna |

### v0.9 — Chronicles IV: Muskets on the Shore (European wars & **Kandy**)
| Campaign | Playable era/hero | Key missions |
|---|---|---|
| ☐ **Sitawaka Lion** (1551–1593) | Sitawaka/Kotte-era warrior | Sinhalese–**Portuguese** wars: Battle of Mulleriyawa (1559), sieges of Kotte, Danture — sword-and-shield vs. early muskets |
| ☐ **Kandyan Defiance** (1670–1766) | **Kandyan Kingdom** ranger | Kandyan–Dutch wars: forest ambush warfare, Rajasinha II's offensives |
| ☐ **The Last Kingdom** (1803–1818) | Kandyan guerrilla under Keppetipola | Anglo-Kandyan wars: 1803 Kandyan victory, 1815 fall, 1818 Uva–Wellassa rising vs. the **British** — the series' solemn finale |

*New systems these require:* naval landing set pieces, elephant riding, early gunpowder
enemies (arquebus/cannon with long telegraphed reloads so melee stays viable), fort
architecture per era, faction armour/flag art sets, era-specific music modes.

### v1.0 — "Legends of the King" (mythic crossover mode)
- ☐ The user-requested fantasy — **Dutugemunu vs. Kandy, Kurunegala, Polonnaruwa, the
  Cholas, the Portuguese, even the British** — shipped as an explicitly framed
  dream-chronicle ("*In the bards' fireside telling, the great king strides across the
  centuries…*"), title-carded exactly like the Sigiriya chapter so history and legend
  never blur. Unlocked by finishing any two Chronicles.
- ☐ Horde-style **War of Ages** arena: pick any faction matchup on the Taprobane map.

---

## 6 · v1.1+ — "Brothers-in-Arms": multiplayer

Browser + no-build-step makes this the hardest pillar; staged to keep each release real:

1. ☐ **Phase M1 — Asynchronous (no server):** shareable challenge codes (seeded arena
   runs), local ghost replays, per-browser leaderboards.
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
