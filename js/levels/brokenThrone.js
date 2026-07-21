/* ============================================================================
   WARRIORS OF TAPROBANE — levels/brokenThrone.js
   CHRONICLES II — "The Broken Throne" (1215)

   A standalone era campaign launched from the Taprobane map: the last night of
   Polonnaruwa. Kalinga Magha's host has broken the outer city; you are the last
   of the citadel guard. History's own outcome is not rewritten — the city falls
   — but you buy the time for the Sacred Tooth and the royal line to slip south
   over the causeway, and so the island endures. Throw back the first assault at
   the gate, lead the Relic-bearer to the south sally-port, hold the causeway
   while the court crosses, and cut down Magha's war-captain.

   Historicity note: Culavamsa chs. 80–81 record Magha's sack of Polonnaruwa and
   the flight of the relics and the court to the south-west — the end of the
   Rajarata civilisation. This mission dramatizes that fighting withdrawal.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  G.Levels.register({
    id: 'brokenThrone',
    order: 25,
    standalone: true,
    chapter: 'Chronicles II',
    title: 'The Broken Throne',
    location: 'The citadel of Polonnaruwa, the night of the sack — 1215',
    sources: 'Culavamsa chs. 80–81 (Kalinga Magha\'s sack of Polonnaruwa and the flight of the relics, 1215).',
    framing:
      'The outer city is already burning. Magha of Kalinga has come with an army ' +
      'of mercenaries, and the chronicles do not pretend he was thrown back — ' +
      'Polonnaruwa falls tonight, and with it the Rajarata age. But the Sacred ' +
      'Tooth must not be taken, nor the royal line. Hold the gate long enough for ' +
      'the Relic-bearer to reach the causeway, cover the crossing, and make Magha ' +
      'pay for every stone. What survives the south will one day return.',
    timeLine: 'a burning midnight',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0, flowers: 0.2, herbs: 0.6 },
    atmosphere: {
      skyTop: 0x2a2038, skyHorizon: 0x8a4a28, fogColor: 0x6a4a38, fogScale: 0.85,
      sunDir: new THREE.Vector3(0.4, 0.45, -0.3), sunColor: 0xffb070, sunIntensity: 1.6,
      timeOfDay: 0.92, weather: 'dust',
    },
    objectives: [
      { id: 'hold', text: 'Throw back Magha\'s first assault on the gate', count: 8, marker: [0, 26] },
      { id: 'relic', text: 'Lead the Relic-bearer to the south sally-port', marker: [0, -40], hidden: true },
      { id: 'cover', text: 'Hold the causeway while the court crosses', count: 6, marker: [0, -44], hidden: true },
      { id: 'captain', text: 'Cut down Magha\'s war-captain', marker: [0, 30], hidden: true },
      { id: 'scribes', text: 'Get the palace scribes clear of the fire', count: 3, optional: true, marker: [16, 6] },
    ],
    spawn: { pos: [0, 8], yaw: 0 },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'dirt', bounds: 74, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      // ---- the citadel: north wall + gate (where Magha attacks), a palace,
      //      and a causeway south over the moat to the sally-port ----
      B.wall(engine, { from: [-54, 26], to: [-9, 26], h: 5 });
      B.wall(engine, { from: [9, 26], to: [54, 26], h: 5 });
      level.gate = B.gatehouse(engine, { pos: [0, 26], yaw: 0, hp: 300 });
      B.wall(engine, { from: [-40, 26], to: [-40, -20], h: 4.5 });
      B.wall(engine, { from: [40, 26], to: [40, -20], h: 4.5 });
      // the palace hall + a vatadage relic-house at the heart of the citadel
      B.pillarHall(engine, { pos: [0, 14], yaw: Math.PI, w: 12, d: 9 });
      B.vatadage(engine, { pos: [-20, 2], radius: 6 });
      B.throne(engine, { pos: [0, 17], yaw: Math.PI });
      for (const [x, z, r] of [[24, 8, 2.3], [-26, 18, 2.2], [26, 18, 2.2]]) B.hut(engine, { pos: [x, z], r });
      for (const [x, z] of [[-6, 22], [6, 22], [0, 0], [-16, -12], [16, -12]]) B.brazier(engine, { pos: [x, z], light: true, terrain: T });

      // ---- the moat + causeway to the south sally-port ----
      T.addWater(0, -40, 30);
      B.bridge(engine, { from: [0, -22], to: [0, -40], width: 4 });
      B.banner(engine, { pos: [-3, -41], color: 0xc8a12e, terrain: T });
      B.banner(engine, { pos: [3, -41], color: 0xc8a12e, terrain: T });

      T.scatterTrees(60, 66, [{ x: 0, z: 6, r: 40 }, { x: 0, z: -40, r: 28 }]);
      T.scatterRocks(22, 64, [{ x: 0, z: 6, r: 34 }]);

      // ---- defenders: you, two of the old guard, and the Relic-bearer ----
      level.guard = G.spawnGiants
        ? G.spawnGiants(engine, { center: [0, 20], count: 2, names: ['Captain of the Guard', 'Sworn Blade'], followPlayer: false })
        : [];
      level.bearer = engine.enemies.spawn({
        faction: 'ally', type: 'civilian', pos: [0, 14], yaw: 0,
        palette: 'royal', name: 'The Relic-bearer', showName: true, hp: 120, posture: 'relaxed',
      });
      level.bearer.captive = true;   // stays put until the gate is held

      // palace scribes (optional rescue)
      level.scribes = [];
      for (const [x, z] of [[16, 6], [18, 10], [14, 2]]) {
        const s = engine.enemies.spawn({ faction: 'ally', type: 'civilian', pos: [x, z], palette: 'civilian', hp: 40 });
        s.captive = true; level.scribes.push(s);
      }
      level.scribeZone = engine.addInteract({
        pos: [16, 6], radius: 4, prompt: 'Send the scribes to the causeway', once: true,
        onUse: () => {
          for (const s of level.scribes) { if (s.alive) { s.captive = false; s.clearPosture && s.clearPosture(); (level.fleeing = level.fleeing || []).push(s); } }
          G.audio.interact();
          engine.missions.bump('scribes', level.scribes.filter((s) => s.alive).length);
          engine.ui.toast('THE SCRIBES RUN FOR THE CAUSEWAY');
        },
      });

      // ---- Magha's host: the first assault pours through the gate ----
      level.attackers = [];
      const spawnWave = (list, tag) => {
        for (const [type, x, z] of list) {
          const npc = engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: Math.PI, tintCloth: 0x3a2a4a, guardRadius: 40 });
          // engine.player doesn't exist during build() — waves acquire the
          // player through their own senses; only alert if it's already there
          if (engine.player && npc.ai) npc.ai.alertTo(engine.player);
          npc._tag = tag; level.attackers.push(npc);
        }
      };
      spawnWave([
        ['melee', -6, 34], ['melee', 6, 34], ['melee', 0, 38], ['brute', 0, 32],
        ['archer', -12, 36], ['archer', 12, 36], ['melee', -3, 40], ['brute', 4, 40],
      ], 'hold');

      // ---- flow ----
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (npc._tag === 'hold') {
          const done = engine.missions.bump('hold');
          if (done) {
            engine.missions.reveal('relic');
            level.escorting = true;        // the bearer now follows the player (update)
            engine.checkpoint({ note: 'The first assault is broken' });
            engine.ui.subtitle('Captain of the Guard', 'The gate won\'t hold twice! Take the Relic-bearer to the causeway — we are right behind you. GO!', 7);
          }
        } else if (npc._tag === 'cover') {
          const done = engine.missions.bump('cover');
          if (done) { engine.checkpoint({ note: 'The court is across' }); engine.ui.subtitle('The Relic-bearer', 'The Tooth is safe across the water. Finish it, warrior — then follow us south.', 6); }
        } else if (npc === level.captain) {
          engine.missions.complete('captain');
          engine.ui.subtitle(null, 'Magha\'s captain falls in the gateway. The city is lost — but the line, and the Relic, live.', 7);
        }
      });

      // the sally-port zone: arriving with the bearer completes the escort and
      // brings on the covering assault + Magha's war-captain
      engine.addZone({
        pos: [0, -42], r: 6,
        when: () => !engine.missions.get('relic').hidden && !engine.missions.get('relic').done,
        onEnter: () => {
          engine.missions.complete('relic');
          level.escorting = false; level.bearer.saved = true; level.bearer.setMove && level.bearer.setMove(null, 0);
          engine.missions.reveal('cover');
          engine.missions.reveal('captain');
          G.audio.warHorn();
          engine.ui.subtitle('The Relic-bearer', 'Across! Now hold the causeway — do not let them follow us over the water.', 6);
          spawnWave([
            ['melee', -6, -20], ['melee', 6, -20], ['brute', 0, -18],
            ['archer', -10, -16], ['archer', 10, -16], ['melee', 0, -14],
          ], 'cover');
          level.captain = engine.enemies.spawn({
            faction: 'enemy', type: 'elite', pos: [0, -16], yaw: 0,
            name: 'Adittha, Magha\'s War-captain', showName: true, hp: 220, plume: true, cape: true, tintCloth: 0x3a2a4a,
          });
          if (engine.player && level.captain.ai) level.captain.ai.alertTo(engine.player);
          engine.setCombatIntensity(0.9);
        },
      });
    },

    start(engine) {
      engine.ui.titleCard({ pre: 'CHRONICLES II · 1215', main: 'THE BROKEN THRONE', body: 'Polonnaruwa falls tonight. Buy the time the Relic needs to reach the south.', dur: 6 });
      engine.after(6.2, () => {
        engine.ui.subtitle('Captain of the Guard', 'They are through the outer wall. Hold this gate with me — the Relic-bearer waits on your word.', 6);
        engine.checkpoint({ note: 'The citadel gate' });
        engine.setCombatIntensity(0.7);
      });
    },

    update(engine, dt) {
      const level = this;
      const port = new THREE.Vector3(0, 0, -42);
      // the Relic-bearer follows the player toward the sally-port
      if (level.escorting && level.bearer && level.bearer.alive && !level.bearer.saved) {
        const pp = engine.player.feetPos;
        const target = new THREE.Vector3(pp.x, 0, pp.z);
        if (U.flatDist(level.bearer.pos, target) > 2.6) level.bearer.setMove(target, dt, 3.6);
        else level.bearer.setMove(null, dt);
      }
      // any freed scribes stream south to the causeway
      if (level.fleeing) {
        for (const s of level.fleeing) {
          if (!s.alive || s.saved) continue;
          s.setMove(port, dt, 3.6);
          if (U.flatDist(s.pos, port) < 7) { s.saved = true; s.setMove(null, dt); engine.stats.saved++; }
        }
      }
    },
  });
})();
