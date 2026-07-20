/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/gajabahuCrossing.js
   CHRONICLES I — "Gajabahu's Crossing" (~120 CE)

   A standalone era campaign launched from the Taprobane map (v0.6): nearly
   three centuries after Dutugemunu, King Gajabahu I crossed the strait to
   the Chola country and brought home the twelve thousand captives taken in
   his father's day. You fight as the point of his landing party: storm the
   shore guard, break open the captive pens, and cut down the camp commander
   — burning the raiders' stores for good measure.

   Historicity note: the crossing is chronicle tradition (Rajavaliya et al.);
   this mission dramatizes the beloved tale, not a mapped battlefield.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  G.Levels.register({
    id: 'gajabahu',
    order: 20,
    standalone: true,          // era campaign: launched from the map, outside the main chain
    chapter: 'Chronicles I',
    title: "Gajabahu's Crossing",
    location: 'A Chola shore-camp across the strait, c. 120 CE',
    framing:
      'The chronicles tell it plainly: what was taken shall be returned. In his ' +
      "father's day the Cholas carried off twelve thousand of the island's people. " +
      'Now Gajabahu has crossed the water with his champions — and you are first ' +
      'off the boats. Break the shore guard, open the pens, and let no commander ' +
      'of this camp live to raid again.',
    timeLine: 'a red dawn on a foreign shore',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0, flowers: 0.4, herbs: 0.8 },
    atmosphere: {
      skyTop: 0x5a7aa8, skyHorizon: 0xf0c090, fogColor: 0xdcc49c, fogScale: 0.95,
      sunDir: new THREE.Vector3(0.7, 0.4, -0.2), sunColor: 0xffd8a8, sunIntensity: 2.5,
    },
    objectives: [
      { id: 'shore', text: 'Storm the shore guard', count: 6, marker: [0, -18] },
      { id: 'pens', text: 'Break open the captive pens', count: 4, marker: [-10, 10], hidden: true },
      { id: 'commander', text: 'Cut down the camp commander', marker: [0, 22], hidden: true },
      { id: 'stores', text: 'Burn the raiders\' supply stores', count: 3, optional: true, marker: [14, 6] },
    ],
    spawn: { pos: [0, -46], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'sand', bounds: 68 });
      const B = G.Build;
      const level = this;

      // ---- the landing: lagoon + beached boats ----
      T.addWater(0, -62, 26);
      B.boat(engine, { pos: [-7, -46], yaw: 0.35 });
      B.boat(engine, { pos: [7, -48], yaw: -0.25 });
      B.boat(engine, { pos: [16, -52], yaw: 0.15, sail: false });
      T.addPath([[0, -44], [0, -12], [0, 16]], 4);

      // ---- the Chola camp: timber palisade with a gate gap ----
      const timber = G.Mats.std({ map: G.Mats.tex.woodDark([6, 2]), rough: 0.9 });
      B.wall(engine, { from: [-30, -12], to: [-4, -12], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [4, -12], to: [30, -12], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [-30, -12], to: [-30, 30], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [30, -12], to: [30, 30], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [-30, 30], to: [30, 30], h: 3.4, thick: 0.9, mat: timber });
      const t1 = B.tower(engine, { pos: [-7, -14], h: 6 });
      const t2 = B.tower(engine, { pos: [7, -14], h: 6 });
      B.banner(engine, { pos: [-4.5, -11], color: 0x2e3a5e, terrain: T });
      B.banner(engine, { pos: [4.5, -11], color: 0x2e3a5e, terrain: T });

      // camp interior
      B.pillarHall(engine, { pos: [0, 24], yaw: 0, w: 9, d: 7 });
      for (const [x, z, r] of [[-18, 0, 2.2], [18, -2, 2.0], [-20, 18, 2.3], [20, 20, 2.2]]) B.hut(engine, { pos: [x, z], r });
      for (const [x, z] of [[-6, 2], [8, 14]]) B.brazier(engine, { pos: [x, z], light: false, terrain: T });
      B.crate(engine, { pos: [4, -2], s: 1.1 }); B.crate(engine, { pos: [-4, 6], s: 0.9, yaw: 0.5 });

      // supply stores (optional burn objective)
      level.stores = [];
      for (const [x, z] of [[14, 6], [-14, 8], [10, 24]]) {
        level.stores.push(B.supplyStore(engine, {
          pos: [x, z], yaw: U.rand(0, 3), hp: 80,
          onDestroyed: () => {
            const done = engine.missions.bump('stores');
            if (done) engine.ui.toast('THE RAIDERS\' STORES ARE ASH');
          },
        }));
      }

      T.scatterTrees(80, 62, [{ x: 0, z: 8, r: 34 }, { x: 0, z: -50, r: 22 }, { x: 0, z: -62, r: 26 }]);
      T.scatterGrass(350, 58, [{ x: 0, z: 8, r: 30 }, { x: 0, z: -56, r: 22 }]);
      T.scatterRocks(24, 60, [{ x: 0, z: 8, r: 30 }]);

      // ---- forces ----
      // Gajabahu himself + three marines fight beside you
      level.gajabahu = engine.enemies.spawn({
        faction: 'ally', type: 'elite', pos: [-3, -42], yaw: Math.PI,
        palette: 'royal', crown: true, cape: true, name: 'King Gajabahu I',
        showName: true, hp: 320, followPlayer: true,
      });
      for (let i = 0; i < 3; i++) {
        engine.enemies.spawn({
          faction: 'ally', type: i === 2 ? 'archer' : 'melee', pos: [3 + i * 2.2, -44],
          followPlayer: true, hp: 85,
        });
      }

      // shore guard (6) between the boats and the palisade
      const shore = [];
      for (const [type, x, z] of [['melee', -6, -22], ['melee', 6, -22], ['melee', 0, -26], ['brute', 0, -18], ['archer', -12, -18], ['archer', 12, -18]]) {
        shore.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: Math.PI, guardRadius: 18 }));
      }
      // tower archers
      for (const [tw, x, z] of [[t1, -7, -14], [t2, 7, -14]]) {
        const a = engine.enemies.spawn({ faction: 'enemy', type: 'archer', pos: [x, z], holdPos: true });
        a.group.position.y = tw.deckY; a.baseY = tw.deckY;
      }
      // camp garrison + commander
      for (const [type, x, z] of [['melee', -8, 6], ['melee', 8, 4], ['melee', -2, 14], ['brute', 2, 8], ['archer', -16, 14], ['archer', 16, 16]]) {
        engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], guardRadius: 22 });
      }
      level.commander = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, 22], yaw: Math.PI,
        name: 'Karikala, Camp Commander', showName: true, hp: 160, plume: true, cape: true,
      });

      // ---- the captive pens ----
      level.freedCount = 0;
      const penSpots = [[-12, 10], [-8, 16], [12, 12], [6, 20]];
      penSpots.forEach(([x, z]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.0, 6), G.Mats.library().woodDark);
        post.position.set(x, 1, z);
        post.castShadow = true;
        engine.scene.add(post);
        const caps = [];
        for (let i = 0; i < 2; i++) {
          const cap = engine.enemies.spawn({
            faction: 'ally', type: 'civilian', pos: [x + U.rand(-0.8, 0.8), z + U.rand(0.4, 1.2)],
            yaw: U.rand(0, 6), posture: 'captive', hp: 40, palette: 'civilian',
          });
          cap.captive = true;
          caps.push(cap);
        }
        engine.addInteract({
          pos: [x, z], radius: 2.4, prompt: 'Break open the pen', once: true,
          onUse: () => {
            for (const cap of caps) {
              if (!cap.alive) continue;
              cap.captive = false;
              cap.clearPosture();
              cap.freed = true;
              (level.freed = level.freed || []).push(cap);
            }
            G.audio.interact();
            engine.ui.subtitle('Freed captive', 'Home… we are going home!', 3.5);
            const done = engine.missions.bump('pens');
            engine.checkpoint({ note: 'Pen broken open' });
            if (done) engine.ui.toast('THE PENS ARE OPEN');
          },
        });
      });

      // ---- flow ----
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (shore.includes(npc)) {
          const done = engine.missions.bump('shore');
          if (done) {
            engine.missions.reveal('pens');
            engine.missions.reveal('commander');
            engine.checkpoint({ note: 'The shore is taken', arrows: 8 });
            engine.ui.subtitle('King Gajabahu I', 'The beach is ours! Into the camp — the pens first, then their commander. Leave the pens standing and burn the rest.', 7);
          }
        }
        if (npc === level.commander) {
          engine.missions.complete('commander');
          engine.ui.subtitle('King Gajabahu I', 'It is done. Gather the freed — the boats go home full this day.', 6);
        }
      });
    },

    start(engine) {
      engine.ui.subtitle(null, 'The boats ground on foreign sand. Somewhere beyond the palisade, twelve thousand wait for home.', 6);
      G.audio.warHorn();
      engine.checkpoint({ note: 'The landing' });
      engine.setCombatIntensity(0.5);
    },

    update(engine, dt) {
      const level = this;
      // freed captives run for the boats
      if (level.freed) {
        for (const cap of level.freed) {
          if (!cap.alive || cap.saved) continue;
          const boats = new THREE.Vector3(0, 0, -46);
          cap.setMove(boats, dt, 3.8);
          if (U.flatDist(cap.pos, boats) < 6) {
            cap.saved = true;
            cap.setMove(null, dt);
            cap.rig.playCheer();
            engine.stats.saved++;
          }
        }
      }
    },
  });
})();
