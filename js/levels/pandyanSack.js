/* ============================================================================
   WARRIORS OF TAPROBANE — levels/pandyanSack.js
   CHRONICLES — "The Pandyan Sack" (846 CE)

   A standalone era campaign launched from the Taprobane map: the Pandyan king
   Srimara Srivallabha broke the Sinhalese line at Mahatalita and fell upon the
   sacred city of Anuradhapura. History does not pretend it was held — the city
   was plundered — but what mattered most was carried clear first. Take up the
   relic casket from the great stupa and bear it to the inner shrine refuge,
   hold the sacred precinct through the onslaught, and break Srimara's champion
   before the ordered withdrawal south.

   Historicity note: the Culavamsa (ch. 50) records Srimara's sack of the city
   in Sena I's reign, ended by treaty. This mission dramatizes the defence of
   the relics during that sack.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const GATES = [[-32, -8], [32, -8], [0, -34], [-26, 22], [26, 22]];
  const WAVES = [
    { label: 'The gate is forced', units: [['melee', 4], ['archer', 2]] },
    { label: 'Through the temple street', units: [['melee', 5], ['brute', 1], ['archer', 2]] },
    { label: "Srimara's vanguard", units: [['melee', 4], ['brute', 2], ['archer', 2]], champion: true },
  ];
  const RESPITE = 9;

  G.Levels.register({
    id: 'pandyanSack',
    order: 26,
    standalone: true,
    chapter: 'Chronicles — Anuradhapura',
    title: 'The Pandyan Sack',
    location: 'The sacred city of Anuradhapura — 846 CE',
    sources: 'Culavamsa ch. 50 (Srimara Srivallabha\'s sack of Anuradhapura in Sena I\'s reign, 846).',
    framing:
      'The line broke at Mahatalita, and now the Pandyan host is in the streets of ' +
      'the sacred city. It cannot be held — the chronicles are plain on that. But ' +
      'the relics of the great stupa must not fall into a raider\'s saddlebag, nor ' +
      'the monks into his chains. Carry the casket to the inner refuge, hold the ' +
      'precinct while they run, and make Srimara\'s champion pay the toll of the gate.',
    timeLine: 'a smoke-reddened dusk',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0, flowers: 0.3, herbs: 0.7 },
    atmosphere: {
      skyTop: 0x3a3050, skyHorizon: 0xc06a38, fogColor: 0x9a6a48, fogScale: 0.9,
      sunDir: new THREE.Vector3(0.6, 0.3, -0.2), sunColor: 0xffb070, sunIntensity: 2.0,
      weather: 'dust',
    },
    objectives: [
      { id: 'relics', text: 'Bear the relic casket to the inner shrine refuge', marker: [0, 8] },
      { id: 'defend', text: 'Hold the sacred precinct through the onslaught', count: 3, marker: [0, 0] },
      { id: 'champion', text: "Break Srimara's champion at the gate", marker: [0, -30], hidden: true },
      { id: 'monks', text: 'Send the fleeing monks to the refuge', count: 3, optional: true, marker: [14, 6] },
    ],
    spawn: { pos: [0, -10], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'dirt', bounds: 72, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      // ---- the sacred precinct: the great stupa, a bodhigara, guarded court ----
      level.stupa = B.stupa(engine, { pos: [0, 12], radius: 10, whitewashed: true });
      B.moonstone(engine, { pos: [0, 2.6], yaw: Math.PI });
      B.guardStones(engine, { pos: [0, 3.8], yaw: Math.PI });
      B.bodhigara(engine, { pos: [-22, 6], size: 6 });
      // the inner shrine refuge, north behind the stupa
      B.pillarHall(engine, { pos: [0, 34], yaw: 0, w: 10, d: 7 });
      B.banner(engine, { pos: [-3, 30], color: 0xc8a12e, terrain: T });
      B.banner(engine, { pos: [3, 30], color: 0xc8a12e, terrain: T });
      for (const [x, z, r] of [[24, 6, 2.3], [-26, 20, 2.2], [26, 20, 2.2], [-24, -6, 2.1]]) B.hut(engine, { pos: [x, z], r });
      for (const [x, z] of [[-6, 6], [6, 6], [0, 26], [-14, -8], [14, -8]]) B.brazier(engine, { pos: [x, z], light: true, terrain: T });
      // low city walls with gates the raiders pour through
      B.wall(engine, { from: [-46, -20], to: [-14, -20], h: 4 });
      B.wall(engine, { from: [14, -20], to: [46, -20], h: 4 });
      B.gatehouse(engine, { pos: [0, -20], yaw: 0, hp: 400 });
      T.scatterTrees(50, 64, [{ x: 0, z: 10, r: 34 }]);
      T.scatterRocks(20, 62, [{ x: 0, z: 10, r: 32 }]);

      // arrow resupply at the refuge
      engine.addInteract({
        pos: [0, 32], radius: 3, prompt: 'Take arrows from the shrine store',
        when: () => engine.combat.arrows < engine.combat.quiverMax,
        onUse: () => { engine.combat.addArrows(12); G.audio.interact(); engine.ui.toast('QUIVER REFILLED'); },
      });

      // ---- defenders: two of the guard + temple soldiers ----
      level.guard = G.spawnGiants
        ? G.spawnGiants(engine, { center: [0, 4], count: 2, names: ['Temple Captain', 'Sworn Blade'], followPlayer: false })
        : [];
      for (const [x, z] of [[-8, -2], [8, -2], [0, -6]]) engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [x, z], hp: 90, guardRadius: 24 });

      // ---- the relic casket (carry objective) ----
      level.carrying = false; level.relicSafe = false;
      const casket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), G.Mats.std({ color: 0xe8b94a, rough: 0.3, metal: 0.9 }));
      casket.position.set(0, 0.9, 6); casket.castShadow = true;
      engine.scene.add(casket); level.casket = casket;
      engine.addInteract({
        pos: [0, 6], radius: 2.4, prompt: 'Take up the relic casket', once: true,
        when: () => !level.carrying && !level.relicSafe,
        onUse: () => {
          level.carrying = true; casket.visible = false;
          G.audio.interact();
          engine.ui.subtitle(null, 'The casket is light in your hands, and heavier than the whole city. Get it to the refuge.', 5);
        },
      });
      // deliver to the refuge
      engine.addZone({
        pos: [0, 34], r: 5,
        when: () => level.carrying && !engine.missions.get('relics').done,
        onEnter: () => {
          level.carrying = false; level.relicSafe = true;
          casket.position.set(1.6, 0.9, 34); casket.visible = true;
          engine.missions.complete('relics');
          engine.checkpoint({ note: 'The relics are safe in the refuge' });
          engine.ui.subtitle('Temple Captain', 'The Tooth of the city is safe! Now hold — let the monks reach us, and let their champion break upon the stones.', 7);
        },
      });

      // ---- fleeing monks (optional rescue) ----
      level.monks = [];
      for (const [x, z] of [[14, 6], [16, 10], [12, 2]]) {
        const s = engine.enemies.spawn({ faction: 'ally', type: 'civilian', pos: [x, z], palette: 'civilian', hp: 40 });
        s.captive = true; level.monks.push(s);
      }
      engine.addInteract({
        pos: [14, 6], radius: 4, prompt: 'Send the monks to the refuge', once: true,
        onUse: () => {
          for (const s of level.monks) if (s.alive) { s.captive = false; s.clearPosture && s.clearPosture(); (level.fleeing = level.fleeing || []).push(s); }
          G.audio.interact();
          engine.ui.toast('THE MONKS RUN FOR THE REFUGE');
        },
      });

      // ---- wave machinery ----
      level.wave = 0; level.state = 'intro'; level.timer = 5; level.raiders = [];

      engine.events.on('npcDeath', ({ npc }) => {
        if (npc === level.champion) {
          engine.missions.complete('champion');
          engine.ui.subtitle(null, 'Srimara\'s champion falls in the gateway. The city is lost — but its heart was carried clear.', 7);
        }
      });
    },

    _spawnWave(engine) {
      const level = this, def = WAVES[level.wave];
      level.raiders = [];
      let gi = 0;
      for (const [type, n] of def.units) {
        for (let i = 0; i < n; i++) {
          const gate = GATES[gi++ % GATES.length];
          const npc = engine.enemies.spawn({
            faction: 'enemy', type, pos: [gate[0] + U.rand(-3, 3), gate[1] + U.rand(-2, 2)],
            tintCloth: 0x6a2a2a, guardRadius: 44,
          });
          if (engine.player && npc.ai) npc.ai.alertTo(engine.player);
          level.raiders.push(npc);
        }
      }
      if (def.champion) {
        engine.missions.reveal('champion');
        level.champion = engine.enemies.spawn({
          faction: 'enemy', type: 'elite', pos: [0, -30], yaw: 0,
          name: "Devan, Srimara's Champion", showName: true, hp: 220, plume: true, cape: true, tintCloth: 0x6a2a2a,
        });
        if (engine.player && level.champion.ai) level.champion.ai.alertTo(engine.player);
        level.raiders.push(level.champion);
      }
      G.audio.warHorn();
      engine.ui.banner('WAVE ' + (level.wave + 1) + ' / ' + WAVES.length, def.label);
      engine.setCombatIntensity(0.85);
    },

    start(engine) {
      engine.ui.titleCard({ pre: 'CHRONICLES · 846 CE', main: 'THE PANDYAN SACK', body: 'Anuradhapura burns. Save the relics, hold the precinct, and break their champion.', dur: 6 });
      engine.after(6.2, () => {
        engine.ui.subtitle('Temple Captain', 'They are past the gate. Take up the casket — I will hold the court with you. For the city!', 6);
        engine.checkpoint({ note: 'The sacred precinct' });
        engine.setCombatIntensity(0.5);
      });
    },

    update(engine, dt) {
      const level = this;
      const refuge = new THREE.Vector3(0, 0, 34);

      // freed monks stream to the refuge
      if (level.fleeing) {
        for (const s of level.fleeing) {
          if (!s.alive || s.saved) continue;
          s.setMove(refuge, dt, 3.6);
          if (U.flatDist(s.pos, refuge) < 6) { s.saved = true; s.setMove(null, dt); engine.stats.saved++; engine.missions.bump('monks'); }
        }
      }

      // wave state machine
      if (level.state === 'intro') {
        level.timer -= dt;
        if (level.timer <= 0) { level.state = 'wave'; this._spawnWave(engine); }
      } else if (level.state === 'wave') {
        if (level.raiders.filter((n) => n.alive).length === 0) {
          level.wave++;
          engine.missions.bump('defend');
          if (level.wave >= WAVES.length) {
            level.state = 'done';
            engine.setCombatIntensity(0);
            engine.after(2, () => engine.ui.subtitle(null, 'The last of the vanguard falls. Below, the city smoulders — but the relics ride south with the dawn.', 7));
          } else {
            level.state = 'respite'; level.timer = RESPITE;
            engine.checkpoint({ note: `Wave ${level.wave} repelled`, arrows: 10 });
            engine.ui.banner('RESPITE', 'Bind your wounds — they gather for another rush.');
          }
        }
      } else if (level.state === 'respite') {
        level.timer -= dt;
        engine.setCombatIntensity(0.2);
        if (level.timer <= 0) { level.state = 'wave'; this._spawnWave(engine); }
      }
    },
  });
})();
