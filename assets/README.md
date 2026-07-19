# Rajarata: Dutugemunu's War — Asset Slots

The game ships **fully procedural**: every texture is painted onto canvases at
startup, every model is built from primitives, and every sound is synthesised
through the Web Audio API. Nothing in this folder is required to play.

Everything below is an **optional upgrade slot** — drop in your own files (or
free/CC0 assets) and the game will look/sound better. Recommended generic
sources: any CC0 texture library (ambientCG-style PBR sets), CC0 sound archives
(freesound-style, filter by CC0), and CC0 3D model repositories. **Do not** use
copyrighted material you don't have rights to.

> Note: automatic loading of these files only works when the game is served
> over `http(s)://` (e.g. `python3 -m http.server`). When opened directly via
> `file://`, browsers block fetches, so the procedural fallbacks are used —
> which is fine: the game is designed around them.

## Audio slots (auto-detected by `js/audio/audioEngine.js`)

The audio engine tries to fetch each of these at startup and silently falls
back to synthesis when absent. Format: `.mp3` or `.ogg` (rename accordingly in
`SAMPLE_SLOTS` inside `audioEngine.js`).

| Slot | Path | Suggested content |
|---|---|---|
| Sword impact | `assets/audio/sword_hit_01.mp3` | bronze/steel clash, short |
| Sword swing | `assets/audio/sword_swing_01.mp3` | air whoosh |
| Bow release | `assets/audio/bow_release_01.mp3` | string twang + arrow whoosh |
| Bow draw | `assets/audio/bow_draw_01.mp3` | wood/string creak |
| Arrow impact | `assets/audio/arrow_thud_01.mp3` | thud into wood |
| Footstep | `assets/audio/footstep_dirt_01.mp3` | single step on dry earth |
| Shield block | `assets/audio/shield_block_01.mp3` | dull leather/wood impact |
| Parry ring | `assets/audio/parry_ring_01.mp3` | bright metallic ring |
| Player hurt | `assets/audio/player_hurt_01.mp3` | male grunt |
| Enemy death | `assets/audio/enemy_die_01.mp3` | cry + fall |
| War-drum loop | `assets/audio/music_war_drums.mp3` | Kandyan-drum style loop (bars of 8) |
| Jungle ambience | `assets/audio/amb_jungle.mp3` | dry-zone forest bed, seamless loop |

## Texture upgrade slots (manual swap)

Textures are generated in `js/engine/world.js` (`G.Mats.tex.*`). To use real
PBR textures, replace the relevant `Mats.canvasTex(...)` call with a
`THREE.TextureLoader` load of your file. Suggested files:

| Material | Suggested path | Used for |
|---|---|---|
| Fired brick | `assets/tex/brick_diffuse.jpg` | stupas, ramparts, gatehouse |
| Lime plaster | `assets/tex/plaster_diffuse.jpg` | hut walls, whitewashed domes |
| Granite | `assets/tex/granite_diffuse.jpg` | moonstones, guard stones, platforms |
| Dry-zone soil | `assets/tex/dirt_diffuse.jpg` | paths, siege field |
| Grass/scrub | `assets/tex/grass_diffuse.jpg` | ground cover |
| Timber planks | `assets/tex/wood_diffuse.jpg` | halls, towers, scaffolds, gate |
| Thatch | `assets/tex/thatch_diffuse.jpg` | roofs |
| Sigiriya rock | `assets/tex/sigiriya_rock_diffuse.jpg` | the Lion Rock |
| Fresco panel | `assets/tex/fresco_01.jpg` | Sigiriya gallery (respectful reproduction) |

## Model upgrade slots (manual swap)

All characters use the procedural rig in `js/entities/soldierNPC.js`; all
architecture comes from `js/engine/terrain.js` (`G.Build.*`). Natural places to
substitute glTF models (via `GLTFLoader` from `three/addons`):

- `G.Build.elephant` — a rigged Asian elephant (Kandula!)
- `G.Build.stupa` — a scanned dagoba / Ruwanwelisaya model
- `G.Build.moonstone` / `G.Build.guardStones` — museum-quality scans exist as CC0
- `G.HumanoidRig` — any humanoid glTF with idle/walk/attack clips

## HDRI / environment

The sky is a procedural gradient dome (`js/engine/world.js`). For image-based
lighting, load an equirect HDR (e.g. `assets/env/dusk_4k.hdr`) with `RGBELoader`
and assign it to `scene.environment`.
