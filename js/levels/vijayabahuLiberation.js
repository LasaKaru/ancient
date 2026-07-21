/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/vijayabahuLiberation.js
   CHRONICLES I — "The Liberation of Polonnaruwa" (1070 CE)

   Standalone era campaign from the Taprobane map (v0.6): after fifty years
   of Chola occupation, Vijayabahu I's long resistance breaks into open war.
   You are the spearpoint of the resistance — thin out the occupation patrols
   in the lower town (steel or shadow, your choice), breach the citadel gate,
   cut down the occupation governor, and raise the lion banner over a free
   Polonnaruwa. Ends where the Chola conquest began.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  G.Levels.register({
    id: 'vijayabahu',
    order: 21,
    standalone: true,
    chapter: 'Chronicles I',
    title: 'The Liberation of Polonnaruwa',
    location: 'Polonnaruwa under Chola occupation, 1070 CE',
    sources: 'Culavamsa chs. 57–60 (Vijayabahu I and the liberation of Polonnaruwa, 1070).',
    framing:
      'Fifty-three years the tiger banner has flown over Rajarata. From the hills ' +
      'of Ruhuna a boy who grew up in a conquered land became Vijayabahu, and his ' +
      'resistance became an army. Tonight it ends where it began: the lower town ' +
      'is thick with patrols, the citadel gate is barred, and the occupation ' +
      'governor sleeps behind it. Move like smoke or strike like thunder — but by ' +
      'dawn, the lion flies over Polonnaruwa.',
    timeLine: 'the last hour before dawn',
    ambience: 'battlefield',
    music: 'duel',
    nature: { animals: 0, flowers: 0.5, herbs: 1 },
    atmosphere: {
      skyTop: 0x2c3a5e, skyHorizon: 0xc08a5a, fogColor: 0x9a8a74, fogScale: 0.8,
      sunDir: new THREE.Vector3(0.8, 0.25, 0.3), sunColor: 0xffc890, sunIntensity: 2.0,
      hemiSky: 0x7a86b0, hemiGround: 0x5a4a34, hemiIntensity: 0.45,
    },
    objectives: [
      { id: 'patrols', text: 'Cut down the occupation patrols (shadow or steel)', count: 5, marker: [0, -6] },
      { id: 'gate', text: 'Breach the citadel gate', marker: [0, 20], hidden: true },
      { id: 'governor', text: 'Cut down the occupation governor', marker: [0, 38], hidden: true },
      { id: 'banner', text: 'Raise the lion banner over Polonnaruwa', marker: [0, 44], hidden: true },
      { id: 'stores', text: 'Burn the occupation stores', count: 3, optional: true, marker: [-14, -2] },
    ],
    spawn: { pos: [0, -48], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'dirt', bounds: 70 });
      const B = G.Build;
      const level = this;

      // ---- the lower town ----
      T.addPath([[0, -46], [0, 16]], 4);
      for (const [x, z, r, yaw] of [[-10, -10, 2.3, 0.4], [10, -8, 2.4, 2.0], [-16, 2, 2.2, 1.1], [16, 4, 2.3, -0.6], [-8, -24, 2.1, 0.9], [9, -26, 2.2, 2.6]]) {
        B.hut(engine, { pos: [x, z], r, yaw });
      }
      B.tower(engine, { pos: [-6, -16], h: 6 });
      for (const [x, z] of [[-3, -6], [6, -14]]) B.brazier(engine, { pos: [x, z], light: true, terrain: T });
      B.crate(engine, { pos: [3, -10], s: 1 }); B.urn(engine, { pos: [-6, -3] });

      // occupation stores (optional)
      level.storeCount = 0;
      for (const [x, z] of [[-14, -2], [12, -18], [18, 10]]) {
        B.supplyStore(engine, {
          pos: [x, z], yaw: U.rand(0, 3), hp: 80,
          onDestroyed: () => {
            const done = engine.missions.bump('stores');
            if (done) engine.ui.toast('THE OCCUPATION STARVES');
          },
        });
      }

      // ---- the citadel (north): walls, gate, stupa, governor's hall ----
      B.wall(engine, { from: [-40, 20], to: [-9, 20], h: 5 });
      B.wall(engine, { from: [9, 20], to: [40, 20], h: 5 });
      B.wall(engine, { from: [-40, 20], to: [-40, 54], h: 5 });
      B.wall(engine, { from: [40, 20], to: [40, 54], h: 5 });
      B.wall(engine, { from: [-40, 54], to: [40, 54], h: 5 });
      level.gate = B.gatehouse(engine, { pos: [0, 20], yaw: 0, hp: 240 });
      level.gate.pos = new THREE.Vector3(0, 2.5, 20);
      level.gate.radius = 3.4;
      level.gate.alive = true;
      engine.attackables.push(level.gate);
      B.stupa(engine, { pos: [-24, 42], radius: 6 });
      B.pillarHall(engine, { pos: [0, 40], yaw: 0, w: 12, d: 9 });
      B.moonstone(engine, { pos: [0, 33.4], yaw: 0, r: 1.5 });
      B.banner(engine, { pos: [-5, 22.5], color: 0x2e3a5e, terrain: T });
      B.banner(engine, { pos: [5, 22.5], color: 0x2e3a5e, terrain: T });

      T.scatterTrees(90, 64, [{ x: 0, z: -12, r: 26 }, { x: 0, z: 38, r: 34 }, { x: 0, z: -48, r: 10 }]);
      T.scatterGrass(400, 60, [{ x: 0, z: 30, r: 30 }]);
      T.scatterRocks(22, 60, [{ x: 0, z: 30, r: 28 }]);

      // ---- the occupation ----
      // lower-town patrols (5) — the stealth playground
      const patrols = [];
      patrols.push(engine.enemies.spawn({ faction: 'enemy', type: 'melee', pos: [0, -4], patrol: [[0, -4], [-10, -14], [4, -20]] }));
      patrols.push(engine.enemies.spawn({ faction: 'enemy', type: 'melee', pos: [12, -2], patrol: [[12, -2], [16, -14], [6, -8]] }));
      patrols.push(engine.enemies.spawn({ faction: 'enemy', type: 'melee', pos: [-14, -8], patrol: [[-14, -8], [-18, 4], [-8, 0]] }));
      patrols.push(engine.enemies.spawn({ faction: 'enemy', type: 'brute', pos: [0, 10], patrol: [[0, 10], [-8, 12], [8, 12]] }));
      const towerA = engine.enemies.spawn({ faction: 'enemy', type: 'archer', pos: [-6, -16], holdPos: true });
      towerA.group.position.y = 6.15; towerA.baseY = 6.15;
      patrols.push(towerA);

      // citadel garrison + the governor (wait behind the gate)
      for (const [type, x, z] of [['melee', -6, 26], ['melee', 6, 26], ['melee', -12, 32], ['melee', 12, 32], ['brute', 0, 28], ['archer', -18, 40], ['archer', 18, 40]]) {
        engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: Math.PI, guardRadius: 24 });
      }
      level.governor = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, 38], yaw: Math.PI,
        name: 'The Occupation Governor', showName: true, hp: 180, plume: true, cape: true,
      });

      // ---- flow ----
      level.stage = 'patrols';
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.stage === 'patrols' && patrols.includes(npc)) {
          const done = engine.missions.bump('patrols');
          if (done) {
            level.stage = 'gate';
            engine.missions.reveal('gate');
            engine.checkpoint({ note: 'The lower town is quiet', arrows: 8 });
            engine.ui.subtitle(null, 'The lower town is yours. Now the gate — and behind it, fifty years of occupation.', 5);
            G.audio.warHorn();
          }
        }
        if (npc === level.governor) {
          engine.missions.complete('governor');
          engine.missions.reveal('banner');
          engine.checkpoint({ note: 'The governor has fallen', pos: [0, 0, 34] });
          engine.ui.subtitle(null, 'The tiger banner has no master left. One thing remains.', 5);
        }
      });

      engine.events.on('gateBroken', () => {
        if (level.stage !== 'gate') return;
        level.stage = 'citadel';
        engine.missions.complete('gate');
        engine.missions.reveal('governor');
        engine.checkpoint({ note: 'The citadel gate is down', pos: [0, 0, 14], arrows: 8 });
        engine.enemies.alertAllEnemies(engine.player);
        engine.ui.subtitle(null, 'The gate splinters — and from the alleys, the resistance rises with you!', 5);
        // the resistance joins the assault
        for (let i = 0; i < 4; i++) {
          engine.enemies.spawn({
            faction: 'ally', type: i % 2 ? 'melee' : 'archer',
            pos: [-6 + i * 4, 12], followPlayer: true, hp: 85,
            tintCloth: 0x5a6e2a,
          });
        }
        G.audio.elephantTrumpet();
      });

      // the banner pole atop the citadel
      engine.addInteract({
        pos: [0, 44], radius: 3.0, prompt: 'Raise the lion banner', once: true,
        when: () => level.stage === 'citadel' && !level.governor.alive,
        onUse: () => {
          G.Build.banner(engine, { pos: [0, 44], color: 0xc8a12e, terrain: T });
          G.audio.bell(); G.audio.victory();
          engine.ui.subtitle(null, 'As the sun rises, the lion banner climbs over Polonnaruwa. Fifty-three years of occupation end in one dawn. Vijayabahu will be crowned where you stand.', 8);
          engine.after(4, () => engine.missions.complete('banner'));
        },
      });
    },

    start(engine) {
      engine.ui.subtitle(null, 'The last hour before dawn. Five patrols hold the lower town — take them by shadow (C, from behind) or by steel. The choice is the resistance\'s gift to you.', 8);
      engine.checkpoint({ note: 'The edge of the lower town' });
      engine.setCombatIntensity(0.25);
    },

    update() {},
  });
})();
