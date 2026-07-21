/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/ruwanwelisayaDefense.js
   CHAPTER V — "The Great Stupa Rises"
   Wave-defense finale of the main campaign: protect the Ruwanwelisaya
   construction site and its builders from raider incursions. Between waves
   the work continues — scaffolding crawls with masons and the great dome
   visibly rises in the background until the crowning of the spire.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const WAVES = [
    { label: 'First incursion', units: [['melee', 4], ['archer', 1]] },
    { label: 'Second incursion', units: [['melee', 4], ['archer', 2], ['brute', 1]] },
    { label: 'Third incursion', units: [['melee', 5], ['archer', 2], ['brute', 2]] },
    { label: 'The last raid', units: [['melee', 5], ['archer', 3], ['brute', 2], ['elite', 1]] },
  ];
  const BUILD_TIME = 16;
  const GATES = [[0, -55], [-50, 18], [50, 18]];

  G.Levels.register({
    id: 'stupa',
    order: 5,
    chapter: 'Chapter V',
    title: 'The Great Stupa Rises',
    location: 'Ruwanwelisaya construction grounds, Anuradhapura',
    framing:
      'The war is won; the harder work begins. On the sanctified ground of ' +
      'Anuradhapura, King Dutugemunu raises the Ruwanwelisaya — the Great Stupa, ' +
      'a mountain of brick and merit. But scattered war-bands still prowl the ' +
      'countryside, and they have smelled the treasure of a king. The builders ' +
      'hold trowels, not swords. Yours must be enough for all of them.',
    timeLine: 'high noon, years after the war', marchDays: 1,
    ambience: 'construction',
    music: 'duel',
    atmosphere: {
      skyTop: 0x4a7ab8, skyHorizon: 0xe8d8b0, fogColor: 0xd9cda9,
      sunDir: new THREE.Vector3(-0.35, 0.75, 0.4),
      weather: 'haze',   // the dry-zone stupa shimmers under a hard noon sun
    },
    objectives: [
      { id: 'waves', text: 'Repel the raider incursions', count: 4, marker: [0, 0] },
      { id: 'workers', text: 'Keep the master builders alive', marker: [0, 12] },
    ],
    spawn: { pos: [0, -18], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'sand', bounds: 66 });
      const B = G.Build;
      const level = this;

      // ---- the rising stupa + scaffolding + works yard ----
      level.completion = 0.3;
      level.stupa = B.stupa(engine, { pos: [0, 14], radius: 12, completion: level.completion });
      level.scaffold = B.scaffold(engine, { pos: [0, 14], radius: 14.2, h: 9, segments: 12 });
      B.moonstone(engine, { pos: [0, -2.2], yaw: Math.PI, r: 1.6 });
      B.guardStones(engine, { pos: [0, -1], yaw: Math.PI });
      T.addPath([[0, -56], [0, -4]], 5);
      T.addPath([[-48, 18], [-18, 14]], 4);
      T.addPath([[48, 18], [18, 14]], 4);
      // brick stacks, mortar urns, cranes
      for (const [x, z, s] of [[-8, -6, 1.2], [9, -5, 1], [-12, 2, 0.9], [13, 4, 1.1], [7, -10, 0.8]]) {
        const stack = new THREE.Mesh(new THREE.BoxGeometry(1.6 * s, 0.9 * s, 1.1 * s), G.Mats.library().brick);
        stack.position.set(x, 0.45 * s, z);
        stack.castShadow = stack.receiveShadow = true;
        engine.scene.add(stack);
        engine.addStaticBox([x, 0.45 * s, z], [0.8 * s, 0.45 * s, 0.55 * s]);
      }
      for (const [x, z] of [[-6, -9], [11, -8]]) B.urn(engine, { pos: [x, z], s: 1.3 });
      B.pillarHall(engine, { pos: [-26, -14], yaw: 0.6, w: 9, d: 7 });
      T.addWater(38, -30, 13);
      B.banner(engine, { pos: [-4, -4], color: 0xc8a12e, terrain: T });
      B.banner(engine, { pos: [4, -4], color: 0x7a2f22, terrain: T });
      for (const [x, z] of [[-14, -8], [14, -9], [0, -12]]) B.brazier(engine, { pos: [x, z], light: false, terrain: T });

      T.scatterTrees(90, 60, [{ x: 0, z: 8, r: 26 }, { x: 38, z: -30, r: 16 }, { x: 0, z: -50, r: 10 }, { x: -48, z: 18, r: 10 }, { x: 48, z: 18, r: 10 }, { x: -26, z: -14, r: 9 }]);
      T.scatterGrass(500, 58, [{ x: 0, z: 10, r: 24 }]);

      // ---- people ----
      level.king = new G.KingDutugemunu(engine, { pos: [6, -2], yaw: Math.PI });
      level.workers = [];
      const workSpots = [[-9, 8], [9, 8], [-13, 16], [13, 16], [-6, 24], [6, 24]];
      for (const [x, z] of workSpots) {
        const w = engine.enemies.spawn({
          faction: 'ally', type: 'worker', pos: [x, z], yaw: U.rand(0, 6),
          posture: 'work', hp: 45, palette: 'civilian',
        });
        w.isWorker = true;
        level.workers.push(w);
      }
      level.defenders = G.spawnGiants(engine, { center: [0, -8], count: 2, names: ['Gothaimbara', 'Theraputtabhaya'], followPlayer: false });
      for (const [x, z, type] of [[-16, 0, 'melee'], [16, 0, 'melee'], [-8, -14, 'archer'], [8, -14, 'archer']]) {
        level.defenders.push(engine.enemies.spawn({ faction: 'ally', type, pos: [x, z], hp: 90, guardRadius: 18 }));
      }

      // a labour elephant hauls brick by day — and breaks raiders by need
      G.Wildlife.rideable(engine, { pos: [-20, -22], yaw: 0.8, name: 'labour elephant' });

      // arrow resupply
      B.crate(engine, { pos: [3, -14], s: 1.1 });
      engine.addInteract({
        pos: [3, -14], radius: 2.2, prompt: 'Take arrows from the supply crate',
        when: () => engine.combat.arrows < engine.combat.quiverMax,
        onUse: () => { engine.combat.addArrows(12); G.audio.interact(); engine.ui.toast('QUIVER REFILLED'); },
      });

      // ---- wave machinery ----
      level.wave = 0;               // completed waves
      level.state = 'build';
      level.timer = 8;              // first respite is short
      level.raiders = [];

      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.isWorker) {
          const left = level.workers.filter((w) => w.alive).length;
          engine.ui.toast(left > 0 ? `A BUILDER HAS FALLEN — ${left} REMAIN` : 'THE BUILDERS ARE SLAIN');
          engine.missions.setNote('workers', `${left} / ${level.workers.length} alive`);
          if (left === 0) engine.failMission('The master builders are dead. The great work cannot go on.');
        }
      });
    },

    _spawnWave(engine) {
      const level = this;
      const def = WAVES[level.wave];
      level.raiders = [];
      let gi = 0;
      for (const [type, n] of def.units) {
        for (let i = 0; i < n; i++) {
          const gate = GATES[gi++ % GATES.length];
          const npc = engine.enemies.spawn({
            faction: 'enemy', type,
            pos: [gate[0] + U.rand(-3, 3), gate[1] + U.rand(-2, 2)],
            hp: undefined,
          });
          // raiders charge the site: half hunt builders, half hunt the guard
          const liveWorkers = level.workers.filter((w) => w.alive);
          const target = (i % 2 === 0 && liveWorkers.length) ? U.pick(liveWorkers) : engine.player;
          npc.ai.alertTo(target);
          level.raiders.push(npc);
        }
      }
      G.audio.warHorn();
      engine.ui.banner('INCURSION', def.label + ' — defend the builders!');
      engine.setCombatIntensity(0.8);
    },

    _advanceConstruction(engine) {
      const level = this;
      level.completion = 0.3 + 0.7 * (level.wave / WAVES.length);
      const done = level.wave >= WAVES.length;
      // rebuild the stupa at the new completion state
      engine.scene.remove(level.stupa.group);
      level.stupa = G.Build.stupa(engine, { pos: [0, 14], radius: 12, completion: done ? 1 : level.completion, whitewashed: done });
      if (done && level.scaffold) { engine.scene.remove(level.scaffold); level.scaffold = null; }
      G.audio.bell();
    },

    start(engine) {
      const engineRef = engine;
      engine.ui.subtitle('King Dutugemunu', 'Look at it, warrior — a mountain raised by ten thousand hands. Scouts speak of raiders on every road. Hold this ground.', 8);
      engine.checkpoint({ note: 'The works, before the first raid', data: { wave: 0 } });
      engine.missions.setNote('workers', '6 / 6 alive');
    },

    update(engine, dt) {
      const level = this;
      level.king.update(dt);

      if (level.state === 'build') {
        level.timer -= dt;
        engine.setCombatIntensity(0.15);
        // builders hammer away happily during respite
        if (Math.floor(level.timer * 2) % 2 === 0) { /* ambience bed carries the knocks */ }
        if (level.timer <= 0 && level.wave < WAVES.length) {
          level.state = 'wave';
          this._spawnWave(engine);
        }
      } else if (level.state === 'wave') {
        const alive = level.raiders.filter((n) => n.alive).length;
        if (alive === 0) {
          level.wave++;
          engine.missions.bump('waves');
          this._advanceConstruction(engine);
          if (level.wave >= WAVES.length) {
            level.state = 'done';
            engine.setCombatIntensity(0);
            engine.missions.complete('workers');
            for (const w of level.workers) if (w.alive) { w.clearPosture(); w.rig.playCheer(); }
            level.king.walkTo(0, 2, 2);
            engine.after(2, () => engine.ui.subtitle(null, 'The last raider falls. Above you, the crown of the Great Stupa catches the sun.', 6));
            engine.after(7, () => level.king.say('It is done. Not by my hand — by all of Lanka\'s. Whatever merit this work holds, let it belong to the people who raised it.', 9));
            engine.after(15, () => G.audio.victory());
          } else {
            level.state = 'build';
            level.timer = BUILD_TIME;
            engine.checkpoint({ note: `Wave ${level.wave} repelled`, arrows: 10, data: { wave: level.wave } });
            engine.ui.banner('RESPITE', 'The masons return to the scaffolds. The dome rises…');
            engine.ui.subtitle('Gothaimbara', 'They will come again. Catch your breath — and fill your quiver.', 5);
          }
        }
      }
    },

    restore(engine, data) {
      const level = this;
      // clear any raiders still on the field, revive half-dead builders kindly
      for (const r of level.raiders) if (r.alive) { r.hp = 0; r.alive = false; r.group.visible = false; engine.physics.removeBody(r.body); }
      level.raiders = [];
      for (const w of level.workers) {
        if (!w.alive) {
          w.alive = true; w.hp = Math.round(w.maxHp * 0.5);
          w.rig.dead = false; w.rig.root.rotation.set(0, w.yaw, 0); w.rig.hips.position.y = 0.94;
          w.group.visible = true;
          engine.physics.addBody(w.body);
        }
        w.setPosture('work');
      }
      level.wave = (data && data.wave) || 0;
      level.state = 'build';
      level.timer = 6;
      engine.missions.setNote('workers', `${level.workers.length} / ${level.workers.length} alive`);
    },
  });
})();
