/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/mulleriyawaBattle.js
   CHRONICLES IV — "Battle of Mulleriyawa" (1559 CE)

   Standalone era campaign from the Taprobane map (v0.7). In the marshes east
   of Colombo, prince Tikiri Bandara — the future Rajasinha I — annihilates a
   Portuguese field army. This is the game's first encounter with gunpowder
   enemies: matchlock gunners with a long, telegraphed reload window (v0.7
   AI_TYPES.gunner) that rewards closing the distance and punishing the
   reload, exactly as the historical battle is remembered — a musket line
   broken by swords before it could reload a second volley.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  G.Levels.register({
    id: 'mulleriyawa',
    order: 23,
    standalone: true,
    chapter: 'Chronicles IV',
    title: 'Battle of Mulleriyawa',
    location: 'The marshes east of Colombo, 1559 CE',
    sources: 'Rajavaliya; Queirós, The Temporal and Spiritual Conquest of Ceylon (Mulleriyawa, 1559).',
    framing:
      'Twelve years of war between Sitawaka and the Portuguese come to this ' +
      'field. Their line has muskets — slow to load, murderous at range. Ours ' +
      'has swords, and the marsh underfoot. Prince Tikiri Bandara\'s order is ' +
      'simple: close the distance before the second volley, and break them ' +
      'while their powder is still wet in the pan.',
    timeLine: 'the hour before the volley',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0.4, flowers: 0.5, herbs: 0.7 },
    atmosphere: {
      skyTop: 0x5a7098, skyHorizon: 0xd8c49a, fogColor: 0xc9baa0, fogScale: 1.05,
      sunDir: new THREE.Vector3(-0.35, 0.55, 0.4), sunIntensity: 2.2,
      weather: 'rain',   // the 1559 battle was fought in the flooded monsoon paddy
    },
    objectives: [
      { id: 'skirmish', text: 'Break the Portuguese skirmish line', count: 6, marker: [0, 4] },
      { id: 'cannon', text: 'Spike the two gun emplacements', count: 2, marker: [-14, 16], hidden: true },
      { id: 'rescue', text: 'Pull the pinned Sitawaka soldiers out of the killing ground', count: 3, optional: true, marker: [10, -2] },
      { id: 'commander', text: 'Break the Portuguese commander\'s line', marker: [0, 34], hidden: true },
    ],
    spawn: { pos: [0, -32], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'grass', bounds: 70 });
      const B = G.Build;
      const level = this;

      T.addPath([[0, -30], [0, 30]], 5);
      T.addPaddy(-20, -14, 16, 10);
      T.addPaddy(20, -12, 14, 9);
      T.addWater(0, 14, 12);           // the marsh itself — a soft, low pool
      for (const [x, z] of [[-8, -6], [8, -4], [-4, 6], [6, 8]]) B.crate(engine, { pos: [x, z], s: U.rand(0.8, 1.1), yaw: U.rand(0, 3) });
      B.hut(engine, { pos: [-22, 26], r: 2.2 }); B.hut(engine, { pos: [20, 28], r: 2.4 });
      B.banner(engine, { pos: [-6, -28], color: 0x8c1f14, terrain: T });
      B.banner(engine, { pos: [6, -28], color: 0x8c1f14, terrain: T });

      // Portuguese field emplacements
      level.cannons = [];
      for (const [x, z, yaw] of [[-14, 16, 0.3], [14, 18, -0.3]]) {
        const cannon = B.cannon(engine, { pos: [x, z], yaw });
        const spot = { group: cannon, spiked: false, pos: new THREE.Vector3(x, 1, z), radius: 2.2 };
        level.cannons.push(spot);
        engine.addInteract({
          pos: [x, z], radius: 2.4, prompt: 'Spike the gun', once: true,
          when: () => !spot.spiked && level.stage !== 'skirmish',
          onUse: () => {
            spot.spiked = true;
            G.audio.arrowHit('stone'); G.audio.interact();
            engine.ui.subtitle(null, 'The touch-hole is driven full of iron — this gun will not fire again today.', 3.5);
            const done = engine.missions.bump('cannon');
            engine.checkpoint({ note: 'A gun is spiked' });
            if (done) engine.ui.toast('BOTH GUNS ARE SILENCED');
          },
        });
      }

      T.scatterTrees(90, 64, [{ x: 0, z: 0, r: 30 }, { x: -20, z: -14, r: 16 }, { x: 20, z: -12, r: 16 }]);
      T.scatterGrass(500, 60, [{ x: 0, z: 8, r: 26 }]);
      T.scatterRocks(20, 58, [{ x: 0, z: 8, r: 26 }]);

      // ---- forces ----
      // your allies: Sitawaka swordsmen, eager to close before the reload
      for (let i = 0; i < 5; i++) {
        engine.enemies.spawn({
          faction: 'ally', type: i === 4 ? 'archer' : 'melee', pos: [-6 + i * 3, -28],
          followPlayer: true, hp: 85,
        });
      }

      // Portuguese skirmish line: musketeers behind a thin melee screen
      const skirmish = [];
      for (const [type, x, z] of [['melee', -8, 2], ['melee', 8, 2], ['gunner', -4, 6], ['gunner', 4, 6], ['gunner', 0, 10], ['melee', 0, 0]]) {
        skirmish.push(engine.enemies.spawn({
          faction: 'enemy', type, pos: [x, z], yaw: Math.PI, palette: 'portuguese', guardRadius: 22,
        }));
      }

      // pinned allies, caught in the open ground under musket fire
      level.pinned = [];
      for (const [x, z] of [[10, -3], [12, 0], [8, -6]]) {
        const p = engine.enemies.spawn({
          faction: 'ally', type: 'melee', pos: [x, z], yaw: 0, posture: 'kneel', hp: 60, passive: true,
        });
        p.ai.passive = true;
        level.pinned.push(p);
        engine.addInteract({
          pos: [x, z], radius: 2.2, prompt: 'Pull him to cover', once: true,
          when: () => p.alive,
          onUse: () => {
            p.clearPosture(); p.ai.passive = false; p.ai.followPlayer = true;
            G.audio.interact();
            engine.ui.subtitle('Sitawaka soldier', 'My thanks — now let us finish this!', 3);
            const done = engine.missions.bump('rescue');
            if (done) engine.ui.toast('NO ONE IS LEFT IN THE OPEN');
          },
        });
      }

      // the main Portuguese line + commander, held in reserve until the skirmish breaks
      level.mainLine = [];
      level.commander = null;

      level.stage = 'skirmish';
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.stage === 'skirmish' && skirmish.includes(npc)) {
          const done = engine.missions.bump('skirmish');
          if (done) {
            level.stage = 'line';
            engine.missions.reveal('cannon');
            engine.missions.reveal('commander');
            engine.checkpoint({ note: 'The skirmish line is broken', arrows: 8 });
            engine.ui.subtitle(null, 'The screen is down — their guns stand exposed, and their main line forms behind the marsh.', 6);
            for (const [type, x, z] of [['gunner', -6, 26], ['gunner', 6, 26], ['melee', -12, 30], ['melee', 12, 30], ['gunner', 0, 30]]) {
              level.mainLine.push(engine.enemies.spawn({
                faction: 'enemy', type, pos: [x, z], yaw: Math.PI, palette: 'portuguese', guardRadius: 26,
              }));
            }
            level.commander = engine.enemies.spawn({
              faction: 'enemy', type: 'elite', pos: [0, 34], yaw: Math.PI,
              palette: 'portuguese', name: 'Dom Afonso, Field Commander', showName: true, hp: 170, plume: true, cape: true,
            });
            level.mainLine.push(level.commander);
          }
        } else if (level.stage === 'line' && level.mainLine.includes(npc)) {
          if (npc === level.commander) {
            engine.missions.complete('commander');
            engine.ui.subtitle(null, 'Dom Afonso falls, and with him the line. Mulleriyawa belongs to Sitawaka.', 6);
          }
        }
      });
    },

    start(engine) {
      engine.ui.subtitle(null, 'Muskets are slow to load and murder at range. When their volley falls, close the ground — a reloading gun is just a club.', 8);
      G.audio.warHorn();
      engine.checkpoint({ note: 'The marsh edge' });
      engine.setCombatIntensity(0.55);
    },

    update() {},
  });
})();
