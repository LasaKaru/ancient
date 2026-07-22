/* ============================================================================
   WARRIORS OF TAPROBANE — levels/firstCholaRaid.js
   CHRONICLES — "The First Tiger" (110 CE)

   A standalone era campaign launched from the Taprobane map. Long before the
   great conquests, an early Chola expedition fell on the Rajarata coast at dawn
   and began marching the island's people down to the boats. The chronicles
   remember the day as a Chola success — much was carried off across the strait —
   but you are the muster that reaches the strand in time to save what can be
   saved: drive the raiders off the sand, cut the bound townsfolk free before
   they are loaded, and break the raid-captain. What you cannot recover here, a
   king named Gajabahu will cross the water to bring home ten years hence.

   Historicity note: chronicle tradition records early Chola raids that carried
   off captives, later recovered by Gajabahu I. This dramatizes one such raid as
   a coastal defence.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const CHOLA = 0x7a2222;
  const REFUGE = new THREE.Vector3(0, 0, 26);   // the village, inland to the north

  G.Levels.register({
    id: 'firstCholaRaid',
    order: 35,
    standalone: true,
    chapter: 'Chronicles — Anuradhapura',
    title: 'The First Tiger',
    location: 'A Rajarata fishing coast, at dawn — 110 CE',
    sources: 'Chronicle tradition of early Chola raids on Rajarata (later avenged by Gajabahu I, c. 120).',
    framing:
      'The first tiger came from the sea before the light, and by the time the ' +
      'muster reached the shore its boats were already half-loaded with our ' +
      'people. The chronicles will call today a Chola success — so it is, for ' +
      'much is already gone. But not all. Drive them off the sand, cut free the ' +
      'ones still bound on the strand, and break their captain — and let Gajabahu ' +
      'settle the rest across the water when his day comes.',
    timeLine: 'a grey dawn breaking red',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0, flowers: 0.4, herbs: 0.8 },
    atmosphere: {
      skyTop: 0x4a5e86, skyHorizon: 0xe89860, fogColor: 0xd8b088, fogScale: 0.95,
      sunDir: new THREE.Vector3(0.4, 0.25, -0.4), sunColor: 0xffb878, sunIntensity: 2.0,
    },
    objectives: [
      { id: 'raiders', text: 'Drive the Chola raiders off the strand', count: 6, marker: [0, -20] },
      { id: 'captives', text: 'Cut the bound townsfolk free before they are loaded', count: 4, marker: [0, -26] },
      { id: 'captain', text: 'Break the Chola raid-captain', hidden: true, marker: [0, -30] },
      { id: 'wounded', text: 'Rally the fallen villagers', count: 2, optional: true, marker: [-12, 10] },
    ],
    spawn: { pos: [0, 8], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'sand', bounds: 70, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      // ---- the coast: the strand + the raiders' beached boats to the south ----
      T.addWater(0, -46, 24);
      B.boat(engine, { pos: [-8, -34], yaw: 0.3 });
      B.boat(engine, { pos: [8, -36], yaw: -0.25 });
      B.boat(engine, { pos: [0, -40], yaw: 0.1, sail: false });
      T.addPath([[0, 6], [0, -28]], 4);
      // the fishing village, inland to the north
      for (const [x, z, r] of [[-14, 14, 2.3], [14, 16, 2.2], [-10, 22, 2.1], [10, 24, 2.2], [0, 20, 2.4]]) B.hut(engine, { pos: [x, z], r });
      for (const [x, z] of [[-6, 12], [8, 18]]) B.brazier(engine, { pos: [x, z], light: true, terrain: T });
      B.banner(engine, { pos: [-3, 24], color: 0xc8a12e, terrain: T });
      B.banner(engine, { pos: [3, 24], color: 0xc8a12e, terrain: T });
      T.scatterTrees(70, 62, [{ x: 0, z: 16, r: 22 }, { x: 0, z: -40, r: 22 }]);
      T.scatterGrass(300, 58, [{ x: 0, z: 16, r: 20 }]);
      T.scatterRocks(20, 60, [{ x: 0, z: -20, r: 22 }]);

      // arrow resupply in the village
      engine.addInteract({
        pos: [0, 20], radius: 3.2, prompt: 'Take arrows from the village store',
        when: () => engine.combat.arrows < engine.combat.quiverMax,
        onUse: () => { engine.combat.addArrows(12); G.audio.interact(); engine.ui.toast('QUIVER REFILLED'); },
      });

      // ---- villagers-at-arms fight beside you ----
      for (const [x, z] of [[-6, 4], [6, 4], [0, 6]]) engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [x, z], hp: 85, guardRadius: 24, followPlayer: true });

      // ---- the raiders on the strand + their captain ----
      level.raiders = [];
      for (const [type, x, z] of [['melee', -6, -18], ['melee', 6, -18], ['brute', 0, -16], ['melee', -10, -22], ['archer', -12, -26], ['archer', 12, -26]]) {
        level.raiders.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: 0, tintCloth: CHOLA, guardRadius: 22 }));
      }
      level.captain = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, -32], yaw: 0,
        name: 'Karunakaran, Raid-Captain', showName: true, hp: 180, plume: true, cape: true, tintCloth: CHOLA,
      });

      // ---- the bound townsfolk on the strand (cut free → they run inland) ----
      level.bound = [];
      const bindSpots = [[-4, -24], [4, -24], [-2, -28], [3, -28]];
      bindSpots.forEach(([x, z]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.0, 6), G.Mats.library().woodDark);
        post.position.set(x, 1, z); post.castShadow = true; engine.scene.add(post);
        const cap = engine.enemies.spawn({ faction: 'ally', type: 'civilian', pos: [x + U.rand(-0.5, 0.5), z + U.rand(0.3, 0.9)], yaw: U.rand(0, 6), posture: 'captive', hp: 40, palette: 'civilian' });
        cap.captive = true; level.bound.push(cap);
        engine.addInteract({
          pos: [x, z], radius: 2.2, prompt: 'Cut the captive free', once: true,
          onUse: () => {
            if (cap.alive) { cap.captive = false; cap.clearPosture && cap.clearPosture(); cap.freed = true; (level.fleeing = level.fleeing || []).push(cap); }
            G.audio.interact();
            engine.checkpoint({ note: 'A captive is cut free' });
          },
        });
      });

      // ---- the wounded (optional rally) ----
      level.wounded = [];
      for (const [x, z] of [[-12, 10], [8, 8]]) {
        const w = engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [x, z], hp: 60, posture: 'kneel' });
        w.downed = true; level.wounded.push(w);
        engine.addInteract({
          pos: [x, z], radius: 2.4, prompt: 'Rally the fallen villager', once: true,
          onUse: () => {
            if (w.alive) { w.downed = false; w.clearPosture && w.clearPosture(); w.followPlayer = true; }
            G.audio.interact();
            const done = engine.missions.bump('wounded');
            if (done) engine.ui.toast('THE VILLAGERS STAND AGAIN');
          },
        });
      }

      // ---- flow ----
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.raiders.includes(npc)) {
          const done = engine.missions.bump('raiders');
          if (done) {
            engine.missions.reveal('captain');
            engine.checkpoint({ note: 'The strand is cleared', arrows: 8 });
            engine.setCombatIntensity(0.7);
            engine.ui.subtitle(null, 'The raiders break for the boats! Cut the rest of our people free and put their captain down before he sails.', 8);
          }
        }
        if (npc === level.captain) {
          engine.missions.complete('captain');
          engine.ui.subtitle(null, 'Their captain is dead on the sand. They will carry off what they already have — but Gajabahu will cross for that, and bring our people home.', 8);
        }
      });
    },

    start(engine) {
      engine.ui.titleCard({ pre: 'CHRONICLES · 110 CE', main: 'THE FIRST TIGER', body: 'The first Chola raid, at dawn. Save who you can from the boats.', dur: 6 });
      engine.after(6.2, () => {
        engine.ui.subtitle(null, 'The raiders have our people bound on the sand and the boats half-loaded. Down to the strand — drive them off and cut our folk free.', 7);
        G.audio.warHorn();
        engine.checkpoint({ note: 'The strand' });
        engine.setCombatIntensity(0.55);
      });
    },

    update(engine, dt) {
      const level = this;
      // freed townsfolk run inland to the village
      if (level.fleeing) {
        for (const c of level.fleeing) {
          if (!c.alive || c.saved) continue;
          c.setMove(REFUGE, dt, 3.9);
          if (U.flatDist(c.pos, REFUGE) < 6) { c.saved = true; c.setMove(null, dt); c.rig.playCheer && c.rig.playCheer(); engine.stats.saved++; engine.missions.bump('captives'); }
        }
      }
    },
  });
})();
