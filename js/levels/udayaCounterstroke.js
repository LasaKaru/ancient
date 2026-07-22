/* ============================================================================
   WARRIORS OF TAPROBANE — levels/udayaCounterstroke.js
   CHRONICLES — "Udaya's Counterstroke" (946 CE)

   A standalone era campaign launched from the Taprobane map. The Chola emperor
   Parantaka I fell upon the coast of Rajarata and carried off the treasure of
   the shrines — but could not hold what he had struck. In Udaya IV's day the
   general Viduragga crossed the strait into the Chola country to take it back.
   You are first off his boats: break the shore guard, recover the plundered
   chests to the waiting boats, free the captives penned in the camp, and cut
   down the Chola shore-captain who holds the treasury.

   Historicity note: the Culavamsa records that a Chola raid under Parantaka I
   was answered by a Sinhala counter-expedition that recovered the plunder. This
   mission dramatizes that recovery raid, not a mapped battlefield.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const CHOLA = 0x7a2222;              // the tiger-banner red of the Chola camp
  const BOATS = new THREE.Vector3(0, 0, -46);   // where the plunder must be carried

  G.Levels.register({
    id: 'udayaCounterstroke',
    order: 27,
    standalone: true,
    chapter: 'Chronicles — Anuradhapura',
    title: "Udaya's Counterstroke",
    location: 'A Chola shore-camp across the strait, 946 CE',
    sources: "Culavamsa (Parantaka I's raid on Rajarata and the Sinhala counter-expedition under Viduragga that recovered the plunder, in Udaya IV's reign).",
    framing:
      'The tiger struck the coast and sailed off heavy with the treasure of the ' +
      'shrines — but a raider cannot hold what he only grabs. General Viduragga ' +
      'has crossed the water to take it back, and you are first off the boats. ' +
      'Storm the shore guard, get the plundered chests down to the boats, break ' +
      'open the captive pens, and let the Chola captain of this camp answer for it.',
    timeLine: 'first light on a foreign shore',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0, flowers: 0.4, herbs: 0.8 },
    atmosphere: {
      skyTop: 0x4a6ea6, skyHorizon: 0xecc088, fogColor: 0xd8bc94, fogScale: 0.95,
      sunDir: new THREE.Vector3(0.65, 0.38, -0.25), sunColor: 0xffd49c, sunIntensity: 2.4,
    },
    objectives: [
      { id: 'beachhead', text: 'Storm the Chola shore guard', count: 6, marker: [0, -18] },
      { id: 'plunder', text: 'Recover the plundered chests to the boats', count: 3, hidden: true, marker: [0, 22] },
      { id: 'captain', text: 'Cut down the Chola shore-captain', hidden: true, marker: [0, 26] },
      { id: 'prisoners', text: 'Free the penned captives', count: 4, optional: true, marker: [-12, 12] },
    ],
    spawn: { pos: [0, -46], yaw: 0 },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'sand', bounds: 68 });
      const B = G.Build;
      const level = this;

      // ---- the landing: lagoon + beached boats ----
      T.addWater(0, -62, 26);
      B.boat(engine, { pos: [-7, -46], yaw: 0.35 });
      B.boat(engine, { pos: [7, -48], yaw: -0.25 });
      B.boat(engine, { pos: [16, -52], yaw: 0.15, sail: false });
      T.addPath([[0, -44], [0, -12], [0, 18]], 4);

      // ---- the Chola camp: timber palisade with a gate gap ----
      const timber = G.Mats.std({ map: G.Mats.tex.woodDark([6, 2]), rough: 0.9 });
      B.wall(engine, { from: [-30, -12], to: [-4, -12], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [4, -12], to: [30, -12], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [-30, -12], to: [-30, 32], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [30, -12], to: [30, 32], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [-30, 32], to: [30, 32], h: 3.4, thick: 0.9, mat: timber });
      const t1 = B.tower(engine, { pos: [-7, -14], h: 6 });
      const t2 = B.tower(engine, { pos: [7, -14], h: 6 });
      B.banner(engine, { pos: [-4.5, -11], color: CHOLA, terrain: T });
      B.banner(engine, { pos: [4.5, -11], color: CHOLA, terrain: T });

      // camp interior + the treasury hall where the plunder is stacked
      B.pillarHall(engine, { pos: [0, 26], yaw: 0, w: 10, d: 7 });
      B.banner(engine, { pos: [-3, 22], color: CHOLA, terrain: T });
      B.banner(engine, { pos: [3, 22], color: CHOLA, terrain: T });
      for (const [x, z, r] of [[-18, 0, 2.2], [18, -2, 2.0], [-20, 18, 2.3], [20, 20, 2.2]]) B.hut(engine, { pos: [x, z], r });
      for (const [x, z] of [[-6, 2], [8, 14]]) B.brazier(engine, { pos: [x, z], light: false, terrain: T });
      B.crate(engine, { pos: [4, -2], s: 1.1 }); B.crate(engine, { pos: [-4, 6], s: 0.9, yaw: 0.5 });

      T.scatterTrees(78, 62, [{ x: 0, z: 8, r: 34 }, { x: 0, z: -50, r: 22 }, { x: 0, z: -62, r: 26 }]);
      T.scatterGrass(340, 58, [{ x: 0, z: 8, r: 30 }, { x: 0, z: -56, r: 22 }]);
      T.scatterRocks(22, 60, [{ x: 0, z: 8, r: 30 }]);

      // arrow resupply at the boats
      engine.addInteract({
        pos: [0, -44], radius: 3.4, prompt: 'Take arrows from the boat store',
        when: () => engine.combat.arrows < engine.combat.quiverMax,
        onUse: () => { engine.combat.addArrows(12); G.audio.interact(); engine.ui.toast('QUIVER REFILLED'); },
      });

      // ---- forces: Viduragga + marines fight beside you ----
      level.viduragga = engine.enemies.spawn({
        faction: 'ally', type: 'elite', pos: [-3, -42], yaw: 0,
        palette: 'royal', cape: true, plume: true, name: 'General Viduragga',
        showName: true, hp: 320, followPlayer: true,
      });
      for (let i = 0; i < 3; i++) {
        engine.enemies.spawn({
          faction: 'ally', type: i === 2 ? 'archer' : 'melee', pos: [3 + i * 2.2, -44],
          followPlayer: true, hp: 85,
        });
      }

      // shore guard (6) between the boats and the palisade
      level.shore = [];
      for (const [type, x, z] of [['melee', -6, -22], ['melee', 6, -22], ['melee', 0, -26], ['brute', 0, -18], ['archer', -12, -18], ['archer', 12, -18]]) {
        level.shore.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: 0, guardRadius: 18, tintCloth: CHOLA }));
      }
      // tower archers
      for (const [tw, x, z] of [[t1, -7, -14], [t2, 7, -14]]) {
        const a = engine.enemies.spawn({ faction: 'enemy', type: 'archer', pos: [x, z], holdPos: true, tintCloth: CHOLA });
        a.group.position.y = tw.deckY; a.baseY = tw.deckY;
      }
      // camp garrison + the shore-captain who holds the treasury
      for (const [type, x, z] of [['melee', -8, 6], ['melee', 8, 4], ['melee', -2, 14], ['brute', 2, 10], ['archer', -16, 16], ['archer', 16, 18]]) {
        engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], guardRadius: 22, tintCloth: CHOLA });
      }
      level.captain = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, 26], yaw: Math.PI,
        name: 'Ilangovan, Chola Shore-Captain', showName: true, hp: 190, plume: true, cape: true, tintCloth: CHOLA,
      });

      // ---- the plundered chests: recover each to the boats. Interacting sends a
      //      marine porter up to shoulder the chest and run it back down to the
      //      boats — a live escort the player has to keep alive through the camp. ----
      level.porters = [];
      const chestMat = G.Mats.std({ color: 0xe8b94a, rough: 0.3, metal: 0.9 });
      const chestSpots = [[-6, 24], [6, 24], [0, 29]];
      chestSpots.forEach(([x, z]) => {
        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), chestMat);
        chest.position.set(x, 0.85, z); chest.castShadow = true;
        engine.scene.add(chest);
        engine.addInteract({
          pos: [x, z], radius: 2.4, prompt: 'Recover the plundered chest', once: true,
          when: () => engine.missions.get('beachhead').done,
          onUse: () => {
            engine.scene.remove(chest);
            // a porter appears at the chest, shoulders it, and carries it to the boats
            const porter = engine.enemies.spawn({
              faction: 'ally', type: 'civilian', pos: [x, z], palette: 'ally', hp: 60,
            });
            porter.carry = chest; porter.bearing = true;
            chest.position.set(0, 1.2, 0); porter.group.add(chest); chest.visible = true;
            level.porters.push(porter);
            G.audio.interact();
            engine.ui.toast('A PORTER RUNS THE CHEST TO THE BOATS');
          },
        });
      });

      // ---- captive pens (optional): free them, they run for the boats ----
      const penSpots = [[-12, 10], [-8, 16], [12, 12], [6, 18]];
      penSpots.forEach(([x, z]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.0, 6), G.Mats.library().woodDark);
        post.position.set(x, 1, z); post.castShadow = true; engine.scene.add(post);
        const cap = engine.enemies.spawn({
          faction: 'ally', type: 'civilian', pos: [x + U.rand(-0.6, 0.6), z + U.rand(0.4, 1.0)],
          yaw: U.rand(0, 6), posture: 'captive', hp: 40, palette: 'civilian',
        });
        cap.captive = true;
        engine.addInteract({
          pos: [x, z], radius: 2.4, prompt: 'Break open the pen', once: true,
          onUse: () => {
            if (cap.alive) { cap.captive = false; cap.clearPosture && cap.clearPosture(); cap.freed = true; (level.freed = level.freed || []).push(cap); }
            G.audio.interact();
            const done = engine.missions.bump('prisoners');
            engine.checkpoint({ note: 'Pen broken open' });
            if (done) engine.ui.toast('THE CAPTIVES ARE FREED');
          },
        });
      });

      // ---- flow ----
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.shore.includes(npc)) {
          const done = engine.missions.bump('beachhead');
          if (done) {
            engine.missions.reveal('plunder');
            engine.missions.reveal('captain');
            engine.checkpoint({ note: 'The beachhead is secured', arrows: 8 });
            engine.setCombatIntensity(0.7);
            engine.ui.subtitle('General Viduragga', 'The beach is ours! Into the camp — get the chests down to the boats and cut down their captain. Free any of our people you find penned.', 8);
          }
        }
        if (npc === level.captain) {
          engine.missions.complete('captain');
          engine.ui.subtitle('General Viduragga', 'Their captain is down. Load the last of it and put to sea — we sail home with what was ours.', 6);
        }
      });
    },

    start(engine) {
      engine.ui.titleCard({ pre: 'CHRONICLES · 946 CE', main: "UDAYA'S COUNTERSTROKE", body: 'Across the strait, in the Chola country. Take back the plunder of the shrines.', dur: 6 });
      engine.after(6.2, () => {
        engine.ui.subtitle(null, 'The boats ground on Chola sand. Beyond the palisade, the treasure of the shrines is stacked for the tiger to keep — unless you take it back.', 7);
        G.audio.warHorn();
        engine.checkpoint({ note: 'The landing' });
        engine.setCombatIntensity(0.5);
      });
    },

    update(engine, dt) {
      const level = this;

      // porters shoulder their chest to the boats, then bump the plunder count
      if (level.porters) {
        for (const p of level.porters) {
          if (!p.alive) { if (p.carry) { p.carry.visible = false; } continue; }
          if (!p.bearing || p.delivered) continue;
          p.setMove(BOATS, dt, 3.4);
          if (U.flatDist(p.pos, BOATS) < 6) {
            p.delivered = true; p.bearing = false; p.setMove(null, dt);
            if (p.carry) { p.group.remove(p.carry); p.carry.visible = false; }
            p.rig.playCheer && p.rig.playCheer();
            const done = engine.missions.bump('plunder');
            engine.stats.saved++;
            if (done) { engine.checkpoint({ note: 'The plunder is recovered' }); engine.ui.toast('THE PLUNDER IS RECOVERED'); }
          }
        }
      }

      // freed captives run for the boats
      if (level.freed) {
        for (const cap of level.freed) {
          if (!cap.alive || cap.saved) continue;
          cap.setMove(BOATS, dt, 3.8);
          if (U.flatDist(cap.pos, BOATS) < 6) { cap.saved = true; cap.setMove(null, dt); cap.rig.playCheer && cap.rig.playCheer(); engine.stats.saved++; }
        }
      }
    },
  });
})();
