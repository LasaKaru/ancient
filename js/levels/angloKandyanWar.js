/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/angloKandyanWar.js
   CHRONICLES IV — "The Passes of 1803" (First Anglo-Kandyan War)

   Standalone era campaign from the Taprobane map (v0.7). History records
   that the British march on Kandy in 1803 met an empty, burned capital —
   and that the campaign was truly lost on the retreat, when a starving
   column was harried to pieces in the mountain passes. You are a Kandyan
   ranger doing exactly that: ambush the vanguard, burn the supply column
   that was the retreat's only hope, cut down the column's officer, and
   seal the pass behind what remains of them.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  G.Levels.register({
    id: 'angloKandyan',
    order: 24,
    standalone: true,
    chapter: 'Chronicles IV',
    title: 'The Passes of 1803',
    location: 'A jungle pass on the road from Kandy, 1803 CE',
    framing:
      'They took an empty city and called it a conquest. Now the fever has ' +
      'them, their rice is gone, and they march for the coast through passes ' +
      'the mountain kingdom has known since before their grandfathers\' ' +
      'grandfathers were born. Kandy does not need to meet this column in the ' +
      'open. It needs the jungle, the ambush, and patience.',
    timeLine: 'the retreat, in driving rain',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0.6, flowers: 0.5, herbs: 1 },
    atmosphere: {
      skyTop: 0x3a4a52, skyHorizon: 0x8a9484, fogColor: 0x707868, fogScale: 1.3,
      sunDir: new THREE.Vector3(0.3, 0.5, 0.5), sunColor: 0xc8d0c0, sunIntensity: 1.6,
      hemiSky: 0x6a7868, hemiGround: 0x3a3a2c, hemiIntensity: 0.5,
    },
    objectives: [
      { id: 'vanguard', text: 'Spring the ambush on the vanguard patrol', count: 5, marker: [0, -4] },
      { id: 'wagons', text: 'Burn the supply wagons', count: 3, marker: [10, 14], hidden: true },
      { id: 'officer', text: "Cut down the column's officer", marker: [0, 30], hidden: true },
      { id: 'seal', text: 'Seal the pass', marker: [0, 40], hidden: true },
      { id: 'porters', text: 'Free the pressed Kandyan porters', count: 3, optional: true, marker: [-12, 6] },
    ],
    spawn: { pos: [0, -34], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'dirt', bounds: 68, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      T.addPath([[0, -34], [0, 34]], 4);
      for (const [x, z] of [[-9, -18], [9, -16], [-11, 4], [10, 8]]) B.crate(engine, { pos: [x, z], s: U.rand(0.8, 1.2), yaw: U.rand(0, 3) });
      B.hut(engine, { pos: [-16, -22], r: 2.0 }); B.hut(engine, { pos: [15, -24], r: 2.1 });

      // supply wagons (three burnable "stores" standing in for the baggage train)
      level.wagons = [];
      for (const [x, z] of [[10, 14], [6, 18], [14, 20]]) {
        level.wagons.push(B.supplyStore(engine, {
          pos: [x, z], yaw: U.rand(0, 3), hp: 70,
          onDestroyed: () => {
            const done = engine.missions.bump('wagons');
            G.audio.enemyDie();
            if (done) engine.ui.toast('THE BAGGAGE TRAIN BURNS — THEY WILL NOT EAT TONIGHT');
          },
        }));
      }
      B.cannon(engine, { pos: [-6, 18], yaw: 0.4 });

      // rope-and-log narrows for the ambush, and the final choke to seal
      B.wall(engine, { from: [-30, -8], to: [-6, -8], h: 3.2 });
      B.wall(engine, { from: [6, -8], to: [30, -8], h: 3.2 });
      B.tower(engine, { pos: [-8, -10], h: 5.5 });

      T.scatterTrees(140, 62, [{ x: 0, z: 8, r: 28 }, { x: 0, z: -20, r: 20 }, { x: 0, z: 34, r: 12 }]);
      T.scatterGrass(700, 60, [{ x: 0, z: 8, r: 28 }]);
      T.scatterRocks(30, 60, [{ x: 0, z: 0, r: 30 }]);

      // ---- forces ----
      // Kandyan rangers — this ambush is fought with allies who already
      // understand the terrain, not a straight-on charge
      for (let i = 0; i < 4; i++) {
        engine.enemies.spawn({
          faction: 'ally', type: i % 2 ? 'archer' : 'melee', pos: [-5 + i * 3, -30],
          followPlayer: true, hp: 90,
        });
      }

      // pressed Kandyan porters, forced to carry the column's baggage
      level.porters = [];
      for (const [x, z] of [[-12, 4], [-14, 8], [-10, 12]]) {
        const p = engine.enemies.spawn({
          faction: 'ally', type: 'civilian', pos: [x, z], yaw: U.rand(0, 6), posture: 'kneel', hp: 35,
        });
        p.captive = true;
        engine.addInteract({
          pos: [x, z], radius: 2.2, prompt: 'Free the porter', once: true,
          when: () => p.alive,
          onUse: () => {
            p.captive = false; p.clearPosture();
            G.audio.interact();
            engine.ui.subtitle('Freed porter', 'They marched us at bayonet-point — I know every trail from here to Kandy.', 3.5);
            const done = engine.missions.bump('porters');
            if (done) engine.ui.toast('THE PORTERS ARE FREE');
          },
        });
        level.porters.push(p);
      }

      // the vanguard patrol — the ambush's first spring
      const vanguard = [];
      for (const [type, x, z] of [['melee', -4, -2], ['melee', 4, -2], ['gunner', 0, -6], ['gunner', -6, -4], ['melee', 6, -4]]) {
        vanguard.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: 0, palette: 'british', guardRadius: 18 }));
      }

      // the main column + officer, held until the vanguard falls
      level.column = [];
      level.officer = null;

      level.stage = 'vanguard';
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.stage === 'vanguard' && vanguard.includes(npc)) {
          const done = engine.missions.bump('vanguard');
          if (done) {
            level.stage = 'column';
            engine.missions.reveal('wagons');
            engine.checkpoint({ note: 'The vanguard is down', arrows: 8 });
            engine.ui.subtitle(null, 'The trail ahead opens on their baggage train. Burn what they cannot carry — a column that cannot eat cannot march.', 6);
          }
        } else if (level.stage === 'column' && level.column.includes(npc)) {
          if (npc === level.officer) {
            engine.missions.complete('officer');
            engine.missions.reveal('seal');
            engine.checkpoint({ note: 'The officer has fallen', pos: [0, 0, 26] });
            engine.ui.subtitle(null, 'Without him the column is just frightened men in a strange country. One thing remains.', 5);
          }
        }
      });

      // wagons all burned + vanguard cleared → the main column shows itself
      // (polled from update() below rather than event-driven, since it
      // depends on two independent objectives finishing in either order)
      const tryRevealColumn = () => {
        if (level.stage !== 'column' || level.column.length) return;
        if (!engine.missions.get('wagons').done) return;
        engine.missions.reveal('officer');
        engine.ui.subtitle(null, 'What is left of the column forms up around its officer, hemmed in by the trees.', 5);
        for (const [type, x, z] of [['gunner', -8, 26], ['gunner', 8, 26], ['melee', -4, 30], ['melee', 4, 30]]) {
          level.column.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: Math.PI, palette: 'british', guardRadius: 22 }));
        }
        level.officer = engine.enemies.spawn({
          faction: 'enemy', type: 'elite', pos: [0, 30], yaw: Math.PI,
          palette: 'british', name: 'Major Ashworth', showName: true, hp: 165, plume: true, cape: true,
        });
        level.column.push(level.officer);
      };
      level._checkColumn = tryRevealColumn;

      // seal the pass — the final act, once the officer has fallen
      engine.addInteract({
        pos: [0, 40], radius: 3, prompt: 'Bring down the pass', once: true,
        when: () => level.stage === 'column' && level.officer && !level.officer.alive,
        onUse: () => {
          level.stage = 'done';
          G.audio.warHorn(); G.audio.bell();
          engine.ui.subtitle(null, 'Ropes are cut, logs give way, and the pass closes in a roar of stone and mud. What is left of the column will not come this way again.', 8);
          engine.after(5, () => engine.missions.complete('seal'));
        },
      });
    },

    start(engine) {
      engine.ui.subtitle(null, 'Rain and fever have done half the work already. Stay to the treeline — let them come to you.', 7);
      engine.checkpoint({ note: 'The ambush line' });
      engine.setCombatIntensity(0.4);
    },

    update(engine, dt) {
      this._checkColumn && this._checkColumn();
    },
  });
})();
