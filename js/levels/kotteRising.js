/* ============================================================================
   WARRIORS OF TAPROBANE — levels/kotteRising.js
   CHRONICLES — "The Conquest of Jaffna" / Kotte Rising (1449–1454 CE)

   A standalone era campaign launched from the Taprobane map. Under Parakramabahu
   VI — the last king to rule the whole island — his adopted son Prince Sapumal
   Kumaraya marched north and took the kingdom of Jaffna, so that for one span a
   single throne again spoke for all Lanka. You lead Sapumal's storming party
   into Nallur: break the gate-guard, raise the Kotte lion over the three quarters
   of the city, spare its scribes, and depose the Arya Chakravarti king in his
   citadel.

   Historicity note: the Rajavaliya and Kokila Sandesaya record Sapumal's
   conquest of Jaffna (c. 1449–1454) for Parakramabahu VI of Kotte. This
   dramatizes the taking of Nallur.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const JAFFNA = 0xb85a1e;            // the saffron-ochre of the Arya Chakravarti levy
  const KOTTE = 0xc8a12e;             // the gold Kotte lion

  G.Levels.register({
    id: 'kotteRising',
    order: 31,
    standalone: true,
    chapter: 'Chronicles — Kotte',
    title: 'The Conquest of Jaffna',
    location: 'Nallur, the Jaffna capital, c. 1450 CE',
    sources: 'Rajavaliya; Kokila Sandesaya (Prince Sapumal Kumaraya\'s conquest of Jaffna for Parakramabahu VI of Kotte, c. 1449–1454).',
    framing:
      'One island, one throne — Parakramabahu of Kotte would see it so once more, ' +
      'and it falls to you and Prince Sapumal to close the last gap in the north. ' +
      'Nallur\'s gate bars the way. Break its guard, raise the lion over each ' +
      'quarter of the city, and take the Arya Chakravarti king in his own hall — ' +
      'but stay the sword over the scribes; a conquered city still needs its books.',
    timeLine: 'the hard light of the dry north',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0, flowers: 0.3, herbs: 0.6 },
    atmosphere: {
      skyTop: 0x5a86bc, skyHorizon: 0xf0d2a0, fogColor: 0xe0c79c, fogScale: 1.0,
      sunDir: new THREE.Vector3(0.6, 0.55, 0.1), sunColor: 0xffe4b0, sunIntensity: 2.7,
      weather: 'heat',
    },
    objectives: [
      { id: 'gate', text: 'Break the gate-guard of Nallur', count: 5, marker: [0, -16] },
      { id: 'quarters', text: 'Raise the Kotte lion over the three quarters', count: 3, hidden: true, marker: [0, 6] },
      { id: 'king', text: 'Depose the Arya Chakravarti king in his citadel', hidden: true, marker: [0, 30] },
      { id: 'scribes', text: 'Spare the palace scribes — send them to safety', count: 3, optional: true, marker: [16, 24] },
    ],
    spawn: { pos: [0, -40], yaw: 0 },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'sand', bounds: 72, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      // ---- Nallur: a walled city with a south gate and a citadel to the north ----
      const timber = G.Mats.std({ map: G.Mats.tex.woodDark([6, 2]), rough: 0.9 });
      B.wall(engine, { from: [-34, -16], to: [-5, -16], h: 4.2, thick: 1.0, mat: timber });
      B.wall(engine, { from: [5, -16], to: [34, -16], h: 4.2, thick: 1.0, mat: timber });
      B.wall(engine, { from: [-34, -16], to: [-34, 38], h: 4.2, thick: 1.0, mat: timber });
      B.wall(engine, { from: [34, -16], to: [34, 38], h: 4.2, thick: 1.0, mat: timber });
      B.wall(engine, { from: [-34, 38], to: [34, 38], h: 4.2, thick: 1.0, mat: timber });
      B.gatehouse(engine, { pos: [0, -16], yaw: 0, hp: 500 });
      const t1 = B.tower(engine, { pos: [-6, -16], h: 6.5 });
      const t2 = B.tower(engine, { pos: [6, -16], h: 6.5 });
      // the citadel (the king's hall) at the north
      B.pillarHall(engine, { pos: [0, 30], yaw: 0, w: 12, d: 8 });
      for (const [x, z] of [[-4, 25], [4, 25]]) B.banner(engine, { pos: [x, z], color: JAFFNA, terrain: T });
      // the three quarters — a market, a well-court, a shrine-yard
      for (const [x, z, r] of [[-18, 2, 2.4], [18, 4, 2.3], [-20, 20, 2.2], [20, 22, 2.2], [-14, 32, 2.0], [14, 32, 2.0]]) B.hut(engine, { pos: [x, z], r });
      B.crate(engine, { pos: [-16, 0], s: 1.1 }); B.crate(engine, { pos: [16, 6], s: 0.9, yaw: 0.4 });
      for (const [x, z] of [[-8, 8], [8, 10], [0, 22]]) B.brazier(engine, { pos: [x, z], light: false, terrain: T });
      T.addPath([[0, -38], [0, -14]], 4);
      T.addPath([[0, -12], [0, 26]], 4);

      T.scatterTrees(56, 64, [{ x: 0, z: 10, r: 40 }, { x: 0, z: -38, r: 16 }]);
      T.scatterRocks(24, 62, [{ x: 0, z: 10, r: 38 }]);

      // arrow resupply at the muster
      engine.addInteract({
        pos: [0, -38], radius: 3.4, prompt: 'Take arrows from the muster store',
        when: () => engine.combat.arrows < engine.combat.quiverMax,
        onUse: () => { engine.combat.addArrows(12); G.audio.interact(); engine.ui.toast('QUIVER REFILLED'); },
      });

      // ---- forces: Prince Sapumal + his storming party ----
      level.sapumal = engine.enemies.spawn({
        faction: 'ally', type: 'elite', pos: [-3, -36], yaw: 0,
        palette: 'royal', cape: true, plume: true, name: 'Prince Sapumal Kumaraya',
        showName: true, hp: 330, followPlayer: true,
      });
      for (let i = 0; i < 4; i++) {
        engine.enemies.spawn({
          faction: 'ally', type: i === 3 ? 'archer' : 'melee', pos: [3 + i * 2.0, -38],
          followPlayer: true, hp: 90,
        });
      }

      // ---- the gate-guard (break to enter) ----
      level.gateGuard = [];
      for (const [type, x, z] of [['melee', -5, -20], ['melee', 5, -20], ['brute', 0, -22], ['archer', -10, -18], ['archer', 10, -18]]) {
        level.gateGuard.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: Math.PI, guardRadius: 18, tintCloth: JAFFNA }));
      }
      for (const [tw, x, z] of [[t1, -6, -16], [t2, 6, -16]]) {
        const a = engine.enemies.spawn({ faction: 'enemy', type: 'archer', pos: [x, z], holdPos: true, tintCloth: JAFFNA });
        a.group.position.y = tw.deckY; a.baseY = tw.deckY;
      }
      // city garrison + the Arya Chakravarti king in the citadel
      for (const [type, x, z] of [['melee', -16, 2], ['melee', 16, 4], ['brute', 0, 8], ['melee', -14, 20], ['melee', 14, 22], ['archer', -18, 12], ['archer', 18, 14]]) {
        engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], guardRadius: 22, tintCloth: JAFFNA });
      }
      level.king = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, 30], yaw: Math.PI,
        name: 'The Arya Chakravarti', showName: true, hp: 230, plume: true, cape: true, crown: true, tintCloth: JAFFNA,
      });

      // ---- the three quarters: raise the Kotte lion at each (revealed after the gate) ----
      level.quarterSpots = [[-18, 6], [18, 8], [0, 20]];
      level.quarterSpots.forEach(([x, z]) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 6), G.Mats.library().woodDark);
        pole.position.set(x, 0.2, z); engine.scene.add(pole);
        engine.addInteract({
          pos: [x, z], radius: 3.0, prompt: 'Raise the Kotte lion over this quarter', once: true,
          when: () => engine.missions.get('gate').done,
          onUse: () => {
            engine.scene.remove(pole);
            B.banner(engine, { pos: [x, z], color: KOTTE, terrain: engine.terrain });
            G.audio.interact();
            const done = engine.missions.bump('quarters');
            engine.checkpoint({ note: 'A quarter of Nallur is taken' });
            engine.ui.toast(done ? 'NALLUR IS TAKEN — ON TO THE CITADEL' : 'THE LION FLIES OVER THIS QUARTER');
            if (done) engine.missions.reveal('king');
          },
        });
      });

      // ---- palace scribes (optional: spare them, they flee to safety) ----
      level.scribes = [];
      for (const [x, z] of [[16, 24], [18, 28], [14, 26]]) {
        const s = engine.enemies.spawn({ faction: 'ally', type: 'civilian', pos: [x, z], palette: 'civilian', hp: 40 });
        s.captive = true; level.scribes.push(s);
      }
      engine.addInteract({
        pos: [16, 26], radius: 4.0, prompt: 'Spare the scribes — send them to safety', once: true,
        onUse: () => {
          for (const s of level.scribes) if (s.alive) { s.captive = false; s.clearPosture && s.clearPosture(); (level.fleeing = level.fleeing || []).push(s); }
          G.audio.interact();
          engine.ui.toast('THE SCRIBES ARE SENT TO SAFETY');
        },
      });

      // ---- flow ----
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.gateGuard.includes(npc)) {
          const done = engine.missions.bump('gate');
          if (done) {
            engine.missions.reveal('quarters');
            engine.checkpoint({ note: 'The gate of Nallur is forced', arrows: 8 });
            engine.setCombatIntensity(0.75);
            engine.ui.subtitle('Prince Sapumal Kumaraya', 'The gate is ours! Into the city — raise the lion over every quarter, and find their king. Spare the scribes.', 8);
          }
        }
        if (npc === level.king) {
          engine.missions.complete('king');
          engine.ui.subtitle('Prince Sapumal Kumaraya', 'The north bows at last. One island, one crown — my father will hear that Nallur is Kotte\'s.', 7);
        }
      });
    },

    start(engine) {
      engine.ui.titleCard({ pre: 'CHRONICLES · c.1450 CE', main: 'THE CONQUEST OF JAFFNA', body: 'Close the last gap in the north. Take Nallur for Kotte and make one island again.', dur: 6 });
      engine.after(6.2, () => {
        engine.ui.subtitle(null, 'Nallur\'s wall runs the width of the road, and its gate is shut. Break the guard and open the way in.', 7);
        G.audio.warHorn();
        engine.checkpoint({ note: 'Before the gate' });
        engine.setCombatIntensity(0.5);
      });
    },

    update(engine, dt) {
      const level = this;
      // spared scribes flee to a safe corner of the city
      if (level.fleeing) {
        const safe = new THREE.Vector3(28, 0, 34);
        for (const s of level.fleeing) {
          if (!s.alive || s.saved) continue;
          s.setMove(safe, dt, 3.6);
          if (U.flatDist(s.pos, safe) < 6) { s.saved = true; s.setMove(null, dt); engine.stats.saved++; engine.missions.bump('scribes'); }
        }
      }
    },
  });
})();
