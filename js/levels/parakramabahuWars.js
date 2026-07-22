/* ============================================================================
   WARRIORS OF TAPROBANE — levels/parakramabahuWars.js
   CHRONICLES — "Parakramabahu's Wars" (1153–1186 CE)

   A standalone era campaign launched from the Taprobane map. Before Polonnaruwa
   rose to its golden height, Parakramabahu the Great had first to make one
   kingdom of three. This is a battle of that unification war: a rival claimant
   holds the far bank of a river ford behind a barricaded camp. Break his
   shield-line at the crossing, throw down the gate-barricades (a war elephant
   waits if you would ride it through), raise the lion banner over his captured
   court, and cut down the pretender's champion — rallying the fallen as you go.

   Historicity note: the Culavamsa records Parakramabahu I's long civil war to
   unify Rajarata, Dakkhinadesa and Ruhuna before his reign's great works and
   overseas expeditions. This mission dramatizes one field action of that war.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const RIVAL = 0x394c86;             // the blue of the rival claimant's levy
  const LION = 0xc8a12e;              // Parakramabahu's gold lion banner

  G.Levels.register({
    id: 'parakramabahuWars',
    order: 28,
    standalone: true,
    chapter: 'Chronicles — Polonnaruwa',
    title: "Parakramabahu's Wars",
    location: 'A contested river ford of the unification war, c. 1153 CE',
    sources: "Culavamsa (Parakramabahu I's wars to unify Rajarata, Dakkhinadesa and Ruhuna before his reign of 1153–1186).",
    framing:
      'Three lands, three crowns, and only one man with the will to weld them. ' +
      'A rival claimant holds the far bank behind his barricades. Break his line ' +
      'at the ford, throw down the camp gate — ride the war elephant through it if ' +
      'you dare — raise the lion over his court, and let the pretender\'s champion ' +
      'answer for the divided island. Leave none of our wounded on the field.',
    timeLine: 'a bright, hard morning',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0.2, flowers: 0.5, herbs: 0.8 },
    atmosphere: {
      skyTop: 0x4c74b0, skyHorizon: 0xbfd0d8, fogColor: 0xbcc6c2, fogScale: 1.0,
      sunDir: new THREE.Vector3(0.4, 0.6, 0.3), sunColor: 0xfff2d6, sunIntensity: 2.6,
    },
    objectives: [
      { id: 'ford', text: "Break the rival's shield-line at the ford", count: 8, marker: [0, 4] },
      { id: 'barricade', text: 'Throw down the camp gate-barricades', count: 2, hidden: true, marker: [0, 20] },
      { id: 'standard', text: 'Raise the lion banner over the captured court', hidden: true, marker: [0, 30] },
      { id: 'rival', text: "Cut down the pretender's champion", hidden: true, marker: [0, 32] },
      { id: 'wounded', text: 'Rally the fallen', count: 3, optional: true, marker: [-14, -6] },
    ],
    spawn: { pos: [0, -40], yaw: 0 },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'grass', bounds: 72, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      // ---- the ford: a river with a causeway crossing ----
      T.addWater(0, 4, 15);
      B.bridge(engine, { from: [0, -10], to: [0, 16], width: 5 });
      T.addPath([[0, -38], [0, -12]], 4);
      T.addPath([[0, 16], [0, 34]], 4);

      // ---- the rival's fortified camp on the north bank ----
      const timber = G.Mats.std({ map: G.Mats.tex.woodDark([6, 2]), rough: 0.9 });
      B.wall(engine, { from: [-28, 18], to: [-4, 18], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [4, 18], to: [28, 18], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [-28, 18], to: [-28, 40], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [28, 18], to: [28, 40], h: 3.4, thick: 0.9, mat: timber });
      B.wall(engine, { from: [-28, 40], to: [28, 40], h: 3.4, thick: 0.9, mat: timber });
      const t1 = B.tower(engine, { pos: [-7, 18], h: 6 });
      const t2 = B.tower(engine, { pos: [7, 18], h: 6 });
      B.gatehouse(engine, { pos: [0, 18], yaw: 0, hp: 400 });
      B.pillarHall(engine, { pos: [0, 32], yaw: 0, w: 11, d: 8 });     // the rival's court
      for (const [x, z] of [[-4, 30], [4, 30]]) B.banner(engine, { pos: [x, z], color: RIVAL, terrain: T });
      for (const [x, z, r] of [[-19, 26, 2.2], [19, 26, 2.1], [-20, 36, 2.2], [20, 36, 2.2]]) B.hut(engine, { pos: [x, z], r });
      for (const [x, z] of [[-8, 24], [8, 24]]) B.brazier(engine, { pos: [x, z], light: false, terrain: T });

      T.scatterTrees(70, 64, [{ x: 0, z: 28, r: 30 }, { x: 0, z: 4, r: 18 }, { x: 0, z: -40, r: 14 }]);
      T.scatterGrass(340, 60, [{ x: 0, z: 4, r: 16 }]);
      T.scatterRocks(22, 62, [{ x: 0, z: 28, r: 28 }]);

      // arrow resupply at the muster
      engine.addInteract({
        pos: [0, -38], radius: 3.4, prompt: 'Take arrows from the muster store',
        when: () => engine.combat.arrows < engine.combat.quiverMax,
        onUse: () => { engine.combat.addArrows(12); G.audio.interact(); engine.ui.toast('QUIVER REFILLED'); },
      });

      // ---- forces: Parakramabahu + his guard, and a war elephant to ride ----
      level.king = engine.enemies.spawn({
        faction: 'ally', type: 'elite', pos: [-3, -36], yaw: 0,
        palette: 'royal', crown: true, cape: true, name: 'King Parakramabahu I',
        showName: true, hp: 340, followPlayer: true,
      });
      for (let i = 0; i < 4; i++) {
        engine.enemies.spawn({
          faction: 'ally', type: i === 3 ? 'archer' : 'melee', pos: [3 + i * 2.0, -38],
          followPlayer: true, hp: 90,
        });
      }
      G.Wildlife.rideable(engine, { pos: [-12, -34], yaw: 0.4, name: 'war elephant' });

      // ---- the rival's shield-line holding the ford ----
      level.fordLine = [];
      const fordRow = [['brute', 0, 2], ['melee', -4, 1], ['melee', 4, 1], ['melee', -8, 3], ['melee', 8, 3],
                       ['archer', -12, 6], ['archer', 12, 6], ['melee', 0, 6]];
      for (const [type, x, z] of fordRow) {
        level.fordLine.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: Math.PI, guardRadius: 20, tintCloth: RIVAL }));
      }
      // tower archers
      for (const [tw, x, z] of [[t1, -7, 18], [t2, 7, 18]]) {
        const a = engine.enemies.spawn({ faction: 'enemy', type: 'archer', pos: [x, z], holdPos: true, tintCloth: RIVAL });
        a.group.position.y = tw.deckY; a.baseY = tw.deckY;
      }
      // camp garrison + the pretender's champion in the court
      for (const [type, x, z] of [['melee', -8, 26], ['melee', 8, 26], ['brute', 0, 24], ['archer', -16, 30], ['archer', 16, 30]]) {
        engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], guardRadius: 22, tintCloth: RIVAL });
      }
      level.rival = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, 32], yaw: Math.PI,
        name: "Manabharana's Champion", showName: true, hp: 220, plume: true, cape: true, tintCloth: RIVAL,
      });

      // ---- the gate-barricades (destroy objective, revealed after the ford) ----
      level.barricades = [];
      for (const [x, z] of [[-3.2, 17], [3.2, 17]]) {
        level.barricades.push(B.supplyStore(engine, {
          pos: [x, z], yaw: U.rand(0, 3), hp: 80,
          onDestroyed: () => {
            const done = engine.missions.bump('barricade');
            if (done) { engine.missions.reveal('standard'); engine.ui.toast('THE GATE IS THROWN DOWN'); }
          },
        }));
      }

      // ---- the captured court: raise the lion banner (standard objective) ----
      level.standardRaised = false;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 6), G.Mats.library().woodDark);
      pole.position.set(0, 0.2, 33); engine.scene.add(pole); level.standardPole = pole;
      engine.addInteract({
        pos: [0, 33], radius: 3.0, prompt: 'Raise the lion banner', once: true,
        when: () => engine.missions.get('barricade').done && !level.standardRaised,
        onUse: () => {
          level.standardRaised = true;
          engine.scene.remove(pole);
          B.banner(engine, { pos: [0, 33], color: LION, terrain: engine.terrain });
          engine.missions.complete('standard');
          G.audio.interact();
          engine.checkpoint({ note: 'The lion flies over the court' });
          engine.ui.subtitle('King Parakramabahu I', 'The lion flies! One land now, whatever it cost. Finish their champion and it is done.', 7);
        },
      });

      // ---- the wounded (optional rally) ----
      level.wounded = [];
      for (const [x, z] of [[-14, -6], [10, -8], [-6, -12]]) {
        const w = engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [x, z], hp: 60, posture: 'kneel' });
        w.downed = true;
        level.wounded.push(w);
        engine.addInteract({
          pos: [x, z], radius: 2.4, prompt: 'Rally the wounded soldier', once: true,
          onUse: () => {
            if (w.alive) { w.downed = false; w.clearPosture && w.clearPosture(); w.followPlayer = true; }
            G.audio.interact();
            const done = engine.missions.bump('wounded');
            if (done) engine.ui.toast('THE FALLEN ARE ON THEIR FEET');
          },
        });
      }

      // ---- flow ----
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.fordLine.includes(npc)) {
          const done = engine.missions.bump('ford');
          if (done) {
            engine.missions.reveal('barricade');
            engine.missions.reveal('rival');
            engine.checkpoint({ note: 'The ford is forced', arrows: 8 });
            engine.setCombatIntensity(0.8);
            engine.ui.subtitle('King Parakramabahu I', 'The crossing is ours! Throw down their gate — ride the elephant through it if you can — and take the court.', 8);
          }
        }
        if (npc === level.rival) {
          engine.missions.complete('rival');
          engine.ui.subtitle('King Parakramabahu I', 'The pretender\'s champion is down. Three lands, one crown — now the real work of a kingdom begins.', 7);
        }
      });
    },

    start(engine) {
      engine.ui.titleCard({ pre: 'CHRONICLES · 1153 CE', main: "PARAKRAMABAHU'S WARS", body: 'One island, or none. Force the ford and make one kingdom of three.', dur: 6 });
      engine.after(6.2, () => {
        engine.ui.subtitle(null, 'Across the ford, the rival\'s banners crowd the far bank. Between you and one kingdom lies his shield-line — and a river.', 7);
        G.audio.warHorn();
        engine.checkpoint({ note: 'The muster' });
        engine.setCombatIntensity(0.5);
      });
    },

    update(engine, dt) {
      // (rallied wounded follow via the AI follow flag; nothing to drive per-frame)
    },
  });
})();
