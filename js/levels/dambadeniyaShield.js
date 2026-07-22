/* ============================================================================
   WARRIORS OF TAPROBANE — levels/dambadeniyaShield.js
   CHRONICLES — "Dambadeniya Shield" (1247 & 1262 CE)

   A standalone era campaign launched from the Taprobane map. Twice Chandrabhanu
   of Tambralinga sailed his Javaka host against the young kingdom of Dambadeniya
   seeking the Tooth Relic; twice he was thrown back into the sea. You are the
   shield of Parakramabahu II's gate: first HOLD — stand the rock-gate through the
   Javaka assault while the relic is carried up to safety — then SALLY, down to
   the beach to cast down Chandrabhanu's war-standard and break the man himself.

   Historicity note: the Culavamsa records Chandrabhanu's two failed invasions
   (1247, and 1262 with Pandyan help), repelled under Parakramabahu II — the
   second counter-led by his nephew Virabahu. This dramatizes the defence.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const JAVAKA = 0x2f7a5e;            // the jade-green of Chandrabhanu's Javaka host
  const GATES = [[-14, -26], [14, -26], [0, -32]];
  const WAVES = [
    { label: 'The Javaka storm the gate', units: [['melee', 4], ['archer', 2]] },
    { label: 'Chandrabhanu throws in his guard', units: [['melee', 4], ['brute', 2], ['archer', 2]] },
  ];
  const RESPITE = 9;

  G.Levels.register({
    id: 'dambadeniyaShield',
    order: 29,
    standalone: true,
    chapter: 'Chronicles — Dambadeniya',
    title: 'Dambadeniya Shield',
    location: 'The rock-gate of Dambadeniya, above the invasion shore, 1247 CE',
    sources: "Culavamsa (Chandrabhanu of Tambralinga's two invasions, 1247 & 1262, repelled under Parakramabahu II).",
    framing:
      'The Javaka have come again for the Tooth of the island, their boats black ' +
      'on the morning water. Stand the rock-gate while the relic is borne up to ' +
      'safety — hold, whatever it costs — and when their storm is spent, do not ' +
      'wait behind the wall. Sally down to the sand, cast down Chandrabhanu\'s ' +
      'standard, and throw him back into the sea he came from.',
    timeLine: 'a bright invasion morning',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0, flowers: 0.3, herbs: 0.7 },
    atmosphere: {
      skyTop: 0x4a78ac, skyHorizon: 0xe8cfa0, fogColor: 0xcdbfa0, fogScale: 0.95,
      sunDir: new THREE.Vector3(0.5, 0.5, 0.2), sunColor: 0xffe6b8, sunIntensity: 2.5,
    },
    objectives: [
      { id: 'hold', text: 'Hold the rock-gate through the Javaka assault', count: 2, marker: [0, -18] },
      { id: 'relic', text: 'See the Tooth Relic borne up to the summit shrine', marker: [0, 20] },
      { id: 'standard', text: "Sally out and cast down Chandrabhanu's war-standard", hidden: true, marker: [0, -46] },
      { id: 'chandrabhanu', text: 'Break Chandrabhanu on the shore', hidden: true, marker: [0, -50] },
      { id: 'wounded', text: 'Rally the gate defenders', count: 3, optional: true, marker: [10, 6] },
    ],
    spawn: { pos: [0, -6], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'dirt', bounds: 74, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      // ---- Dambadeniya rock: the summit shrine, the gate below, the shore beyond ----
      level.rock = B.stupa(engine, { pos: [0, 24], radius: 9, whitewashed: true });
      B.pillarHall(engine, { pos: [0, 20], yaw: 0, w: 10, d: 7 });          // the summit shrine
      B.banner(engine, { pos: [-3, 15], color: 0xc8a12e, terrain: T });
      B.banner(engine, { pos: [3, 15], color: 0xc8a12e, terrain: T });
      // the rock-gate the assault breaks upon
      B.wall(engine, { from: [-44, -14], to: [-6, -14], h: 4.2 });
      B.wall(engine, { from: [6, -14], to: [44, -14], h: 4.2 });
      B.gatehouse(engine, { pos: [0, -14], yaw: 0, hp: 500 });
      const t1 = B.tower(engine, { pos: [-6, -14], h: 6.5 });
      const t2 = B.tower(engine, { pos: [6, -14], h: 6.5 });
      for (const [x, z] of [[-8, -8], [8, -8], [0, 6]]) B.brazier(engine, { pos: [x, z], light: true, terrain: T });
      for (const [x, z, r] of [[-20, 8, 2.2], [20, 8, 2.1]]) B.hut(engine, { pos: [x, z], r });

      // the invasion shore, to the south
      T.addWater(0, -64, 26);
      B.boat(engine, { pos: [-8, -52], yaw: 0.3 });
      B.boat(engine, { pos: [9, -54], yaw: -0.2 });
      B.boat(engine, { pos: [0, -58], yaw: 0.1, sail: false });
      T.addPath([[0, -12], [0, -44]], 4);

      T.scatterTrees(64, 66, [{ x: 0, z: 16, r: 26 }, { x: 0, z: -52, r: 22 }]);
      T.scatterRocks(24, 64, [{ x: 0, z: 16, r: 24 }]);

      // arrow resupply at the gate
      engine.addInteract({
        pos: [0, -8], radius: 3.2, prompt: 'Take arrows from the gate store',
        when: () => engine.combat.arrows < engine.combat.quiverMax,
        onUse: () => { engine.combat.addArrows(12); G.audio.interact(); engine.ui.toast('QUIVER REFILLED'); },
      });

      // ---- defenders ----
      for (const [x, z] of [[-8, -10], [8, -10], [0, -12]]) engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [x, z], hp: 95, guardRadius: 26 });
      for (const [tw, x, z] of [[t1, -6, -14], [t2, 6, -14]]) {
        const a = engine.enemies.spawn({ faction: 'ally', type: 'archer', pos: [x, z], holdPos: true });
        a.group.position.y = tw.deckY; a.baseY = tw.deckY;
      }

      // ---- the Tooth Relic, borne up to the summit shrine ----
      level.carrying = false; level.relicSafe = false;
      const casket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), G.Mats.std({ color: 0xe8b94a, rough: 0.3, metal: 0.9 }));
      casket.position.set(0, 0.9, -4); casket.castShadow = true;
      engine.scene.add(casket); level.casket = casket;
      engine.addInteract({
        pos: [0, -4], radius: 2.4, prompt: 'Take up the Tooth Relic casket', once: true,
        when: () => !level.carrying && !level.relicSafe,
        onUse: () => {
          level.carrying = true; casket.visible = false; G.audio.interact();
          engine.ui.subtitle(null, 'The relic is in your keeping. Get it up to the summit shrine before the gate is forced.', 5);
        },
      });
      engine.addZone({
        pos: [0, 20], r: 5,
        when: () => level.carrying && !engine.missions.get('relic').done,
        onEnter: () => {
          level.carrying = false; level.relicSafe = true;
          casket.position.set(1.4, 0.9, 20); casket.visible = true;
          engine.missions.complete('relic');
          engine.checkpoint({ note: 'The Tooth is safe on the summit' });
          engine.ui.subtitle(null, 'The Tooth is safe above. Now down to the gate — hold it, and let the Javaka break.', 6);
        },
      });

      // ---- the wounded (optional rally) ----
      level.wounded = [];
      for (const [x, z] of [[10, 6], [-9, 4], [6, -2]]) {
        const w = engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [x, z], hp: 60, posture: 'kneel' });
        w.downed = true; level.wounded.push(w);
        engine.addInteract({
          pos: [x, z], radius: 2.4, prompt: 'Rally the gate defender', once: true,
          onUse: () => {
            if (w.alive) { w.downed = false; w.clearPosture && w.clearPosture(); w.followPlayer = true; }
            G.audio.interact();
            const done = engine.missions.bump('wounded');
            if (done) engine.ui.toast('THE DEFENDERS STAND AGAIN');
          },
        });
      }

      // ---- the invasion shore camp: Chandrabhanu, his guard, and the war-standard ----
      //      (placed now but held on the sand until the sally; short guardRadius) ----
      for (const [type, x, z] of [['melee', -8, -46], ['melee', 8, -46], ['brute', 0, -44], ['archer', -12, -50], ['archer', 12, -50]]) {
        engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: 0, guardRadius: 16, tintCloth: JAVAKA });
      }
      level.chandrabhanu = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, -50], yaw: 0,
        name: 'Chandrabhanu of Tambralinga', showName: true, hp: 240, plume: true, cape: true, tintCloth: JAVAKA,
      });
      // the war-standard (a tall pole + a jade banner), cast down by interact on the sally
      level.standardDown = false;
      const std = new THREE.Group();
      const spole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.4, 6), G.Mats.library().woodDark);
      spole.position.y = 1.7; std.add(spole);
      const sflag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), G.Mats.std({ color: JAVAKA, rough: 0.9, side: THREE.DoubleSide }));
      sflag.position.set(0.55, 2.9, 0); std.add(sflag);
      std.position.set(0, 0, -47); std.traverse((c) => { if (c.isMesh) c.castShadow = true; });
      engine.scene.add(std); level.standard = std;
      engine.addInteract({
        pos: [0, -47], radius: 3.0, prompt: "Cast down Chandrabhanu's war-standard", once: true,
        when: () => engine.missions.get('hold').done && !level.standardDown,
        onUse: () => {
          level.standardDown = true;
          std.rotation.z = 1.5; std.position.set(1.2, 0, -47);       // topple it
          engine.missions.complete('standard');
          G.audio.interact();
          engine.ui.toast('THE JAVAKA STANDARD IS CAST DOWN');
        },
      });

      // ---- wave / phase machinery ----
      level.wave = 0; level.state = 'intro'; level.timer = 6; level.raiders = [];

      engine.events.on('npcDeath', ({ npc }) => {
        if (npc === level.chandrabhanu) {
          engine.missions.complete('chandrabhanu');
          engine.ui.subtitle(null, 'Chandrabhanu falls on the sand he landed on. Twice the island has thrown him back — the Tooth stays where it belongs.', 7);
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
            tintCloth: JAVAKA, guardRadius: 40,
          });
          if (engine.player && npc.ai) npc.ai.alertTo(engine.player);
          level.raiders.push(npc);
        }
      }
      G.audio.warHorn();
      engine.ui.banner('ASSAULT ' + (level.wave + 1) + ' / ' + WAVES.length, def.label);
      engine.setCombatIntensity(0.85);
    },

    start(engine) {
      engine.ui.titleCard({ pre: 'CHRONICLES · 1247 CE', main: 'DAMBADENIYA SHIELD', body: 'The Javaka have come for the Tooth. Hold the gate — then throw them back into the sea.', dur: 6 });
      engine.after(6.2, () => {
        engine.ui.subtitle(null, 'Take up the relic and get it to the summit shrine — then stand the gate. Their first rush is already on the sand.', 7);
        engine.checkpoint({ note: 'The rock-gate' });
        engine.setCombatIntensity(0.5);
      });
    },

    update(engine, dt) {
      const level = this;

      // hold → sally phase machine
      if (level.state === 'intro') {
        level.timer -= dt;
        if (level.timer <= 0) { level.state = 'defend'; this._spawnWave(engine); }
      } else if (level.state === 'defend') {
        if (level.raiders.filter((n) => n.alive).length === 0) {
          level.wave++;
          engine.missions.bump('hold');
          if (level.wave >= WAVES.length) {
            level.state = 'sally';
            engine.missions.reveal('standard');
            engine.missions.reveal('chandrabhanu');
            engine.checkpoint({ note: 'The assault is broken — now sally', arrows: 10 });
            engine.setCombatIntensity(0.7);
            engine.ui.banner('SALLY', 'Their storm is spent — down to the sand and end it.');
            engine.ui.subtitle(null, 'The gate holds! Do not wait behind the wall — sally down, cast down his standard, and break Chandrabhanu on the shore.', 8);
          } else {
            level.state = 'respite'; level.timer = RESPITE;
            engine.checkpoint({ note: `Assault ${level.wave} repelled`, arrows: 10 });
            engine.ui.banner('RESPITE', 'Bind your wounds — they form up for another rush.');
          }
        }
      } else if (level.state === 'respite') {
        level.timer -= dt;
        engine.setCombatIntensity(0.2);
        if (level.timer <= 0) { level.state = 'defend'; this._spawnWave(engine); }
      }
    },
  });
})();
