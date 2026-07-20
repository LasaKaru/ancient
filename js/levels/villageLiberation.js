/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/villageLiberation.js
   CHAPTER II — "The Border Village"
   A paddy village under Chola-aligned garrison. Mixed stealth & combat:
   patrol routes, hearing/vision detection (crouch to stay low), captive
   allies to cut free, and an optional objective — usher hiding civilians to
   safety for reputation. Freed soldiers join the fight beside you.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  G.Levels.register({
    id: 'village',
    order: 2,
    chapter: 'Chapter II',
    title: 'The Border Village',
    location: 'Kasagala village, southern Rajarata',
    framing:
      "Elara's border garrisons hold the paddy villages that feed Anuradhapura. " +
      'This one has been taken: its guardians roped to posts, its people hiding in ' +
      'the dark of their homes. Slip in with the dawn mist. Free the captured ' +
      'soldiers, drive out the garrison — and if you can, see the villagers safe. ' +
      'An army that saves its people is an army the island will follow.',
    timeLine: 'first light, under mist', marchDays: 5,
    ambience: 'village',
    music: 'explore',
    atmosphere: {
      skyTop: 0x6f89ae, skyHorizon: 0xe8d2a8, fogColor: 0xd9cba8, fogScale: 0.8,
      sunDir: new THREE.Vector3(0.6, 0.5, 0.3), sunIntensity: 2.2,
    },
    objectives: [
      { id: 'garrison', text: 'Eliminate the Chola garrison', count: 8, marker: [0, 10] },
      { id: 'captives', text: 'Cut the captured soldiers free', count: 3, marker: [-12, 16] },
      { id: 'civilians', text: 'Send hiding villagers to the shrine refuge', count: 4, optional: true, marker: [34, -20] },
    ],
    spawn: { pos: [2, -52], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'grass', bounds: 70 });
      const B = G.Build;
      const level = this;

      // village core
      const hutSpots = [[-8, 4, 2.3, 0.4], [6, 8, 2.5, 2.2], [-2, 18, 2.2, 3.4], [12, 18, 2.4, 1.2], [-16, 8, 2.1, -0.6], [4, 28, 2.3, 0.2]];
      for (const [x, z, r, yaw] of hutSpots) B.hut(engine, { pos: [x, z], r, yaw });
      T.addPath([[2, -50], [0, -10], [0, 10], [0, 26]], 3.5);
      T.addPath([[0, 10], [-14, 16]], 2.5);
      T.addPath([[0, 4], [30, -16]], 2.5);
      T.addPaddy(-24, -12, 14, 9);
      T.addPaddy(-24, -24, 14, 9);
      T.addPaddy(20, 26, 12, 8);
      T.addWater(40, 20, 14);
      B.crate(engine, { pos: [2, 6], s: 1.1 }); B.crate(engine, { pos: [3.2, 6.4], s: 0.8, yaw: 0.6 });
      B.urn(engine, { pos: [-7, 6.5] }); B.urn(engine, { pos: [6.5, 10.2] });
      B.tower(engine, { pos: [8, -2] });
      // small village shrine = the refuge point
      B.stupa(engine, { pos: [34, -22], radius: 3.2, whitewashed: true });
      B.banner(engine, { pos: [30, -18], color: 0xcfc2a2, terrain: T });

      T.scatterTrees(150, 64, [
        { x: 0, z: 12, r: 26 }, { x: -24, z: -18, r: 16 }, { x: 40, z: 20, r: 17 },
        { x: 34, z: -22, r: 8 }, { x: 2, z: -50, r: 8 }, { x: 20, z: 26, r: 10 }, { x: 0, z: -30, r: 6 },
      ]);
      T.scatterGrass(800, 62, [{ x: 0, z: 12, r: 20 }, { x: 40, z: 20, r: 15 }]);
      T.scatterRocks(20, 60, [{ x: 0, z: 12, r: 20 }]);

      // ---- the garrison (8): patrols + a tower archer ----
      const spawnEnemy = (type, pos, patrol) =>
        engine.enemies.spawn({ faction: 'enemy', type, pos, patrol, yaw: U.rand(0, 6.28) });
      spawnEnemy('melee', [0, -8], [[0, -8], [0, 6], [-10, 10], [0, 6]]);
      spawnEnemy('melee', [10, 14], [[10, 14], [2, 24], [-4, 14]]);
      spawnEnemy('melee', [-12, 12], [[-12, 12], [-16, 2], [-6, 0]]);
      spawnEnemy('melee', [4, 22], [[4, 22], [12, 20], [8, 10]]);
      spawnEnemy('brute', [0, 10]);
      spawnEnemy('archer', [16, 2], [[16, 2], [22, -8], [12, -4]]);
      spawnEnemy('archer', [-6, 26], [[-6, 26], [2, 32], [8, 26]]);
      const towerArcher = engine.enemies.spawn({ faction: 'enemy', type: 'archer', pos: [8, -2], holdPos: true });
      towerArcher.group.position.y = 6.15;   // stationed on the watchtower deck
      towerArcher.baseY = 6.15;

      // ---- captives at posts ----
      level.captives = [];
      const postSpots = [[-12, 16], [-14, 18], [14, 22]];
      postSpots.forEach(([x, z], i) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.0, 6), G.Mats.library().woodDark);
        post.position.set(x, 1, z);
        post.castShadow = true;
        engine.scene.add(post);
        const cap = engine.enemies.spawn({
          faction: 'ally', type: 'melee', pos: [x, z + 0.5], yaw: U.rand(0, 6),
          posture: 'captive', passive: true, hp: 70, brain: true,
        });
        cap.ai.passive = true;
        level.captives.push(cap);
        engine.addInteract({
          pos: [x, z], radius: 2.2, prompt: 'Cut the ropes', once: true,
          when: () => cap.alive,
          onUse: () => {
            cap.clearPosture();
            cap.captive = false;      // a freed blade is a target — and a threat
            cap.ai.passive = false;
            cap.ai.followPlayer = true;
            G.audio.interact();
            engine.ui.subtitle('Freed soldier', 'My sword is yours. For Ruhuna!', 3.5);
            const done = engine.missions.bump('captives');
            engine.checkpoint({ note: 'Captive freed' });
            if (done) engine.ui.toast('ALL CAPTIVES FREED');
          },
        });
      });

      // ---- hiding civilians (optional) ----
      level.civFled = 0;
      const civSpots = [[-8, 3], [6, 9], [-2, 19], [12, 17]];
      civSpots.forEach(([x, z], i) => {
        const civ = engine.enemies.spawn({
          faction: 'civilian', type: 'civilian', pos: [x + 0.6, z + 0.8], yaw: U.rand(0, 6),
          posture: 'kneel', hp: 30,
        });
        civ.fleeing = false;
        engine.addInteract({
          pos: [x + 0.6, z + 0.8], radius: 2.4, prompt: 'Send villager to the shrine', once: true,
          when: () => civ.alive && !civ.fleeing,
          onUse: () => {
            civ.fleeing = true;
            civ.clearPosture();
            G.audio.interact();
            engine.ui.subtitle('Villager', 'Blessings on you, warrior!', 3);
          },
        });
        (level.civs = level.civs || []).push(civ);
      });

      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction === 'enemy') {
          const done = engine.missions.bump('garrison');
          const left = engine.enemies.enemiesAlive();
          if (left === 4) engine.checkpoint({ note: 'Half the garrison down' });
          if (done) {
            engine.checkpoint({ note: 'Garrison eliminated' });
            engine.ui.subtitle(null, 'The village is free. The mist lifts from the paddies.', 5);
          }
        }
        if (npc.faction === 'civilian') engine.ui.toast('A VILLAGER HAS DIED');
      });
    },

    start(engine) {
      engine.ui.subtitle(null, 'Dawn mist. Crouch (C) to move unseen; a knife from behind asks no questions. Whistle (B) to lure a sentry into the scrub.', 7);
      engine.checkpoint({ note: 'Village outskirts' });
    },

    update(engine, dt) {
      const level = this;
      // shepherd fleeing civilians toward the shrine refuge
      if (level.civs) {
        for (const civ of level.civs) {
          if (!civ.alive || !civ.fleeing || civ.saved) continue;
          const refuge = new THREE.Vector3(34, 0, -20);
          civ.setMove(refuge, dt, 3.6);
          if (U.flatDist(civ.pos, refuge) < 4) {
            civ.saved = true;
            civ.setMove(null, dt);
            civ.rig.playCheer();
            engine.stats.saved++;
            engine.missions.bump('civilians');
          }
        }
      }
    },
  });
})();
