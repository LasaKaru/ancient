/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/fortressSiege.js
   CHAPTER III — "The Gates of Vijitanagara"
   The great border fortress. A true battle: your squad (two of the Ten
   Giants + spearmen) pushes with you against the gatehouse; tower archers
   rain reed arrows; destructible barricades give cover on the approach.
   Break the outer guard, batter down the gate, take the courtyard, and
   slay the garrison captain.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  G.Levels.register({
    id: 'siege',
    order: 3,
    chapter: 'Chapter III',
    title: 'The Gates of Vijitanagara',
    location: 'Vijitanagara fortress — four months into the campaign',
    framing:
      'Vijitanagara: strongest of the thirty-two strongholds on the road to ' +
      'Anuradhapura. Its walls have swallowed four assaults whole. Nandhimitra ' +
      'and Suranimala of the Ten march at your shoulder; the war-drums of Ruhuna ' +
      'thunder behind. Today the wall breaks, or the campaign does.',
    ambience: 'battlefield',
    music: 'combat',
    atmosphere: {
      skyTop: 0x4a6a9c, skyHorizon: 0xd8b98c, fogColor: 0xcdb894, fogScale: 0.9,
      sunDir: new THREE.Vector3(-0.4, 0.6, -0.45), sunIntensity: 2.4,
    },
    objectives: [
      { id: 'outer', text: 'Break the outer guard before the gate', count: 6, marker: [0, 18] },
      { id: 'gate', text: 'Batter down the fortress gate', marker: [0, 20], hidden: true },
      { id: 'court', text: 'Clear the courtyard garrison', count: 8, marker: [0, 38], hidden: true },
      { id: 'captain', text: 'Slay the garrison captain', marker: [0, 46], hidden: true },
    ],
    spawn: { pos: [0, -34], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'dirt', bounds: 72, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      // ---- fortress: wall line across z=20, gate at x=0 ----
      B.wall(engine, { from: [-52, 20], to: [-9, 20], h: 5 });
      B.wall(engine, { from: [9, 20], to: [52, 20], h: 5 });
      level.gate = B.gatehouse(engine, { pos: [0, 20], yaw: 0, hp: 260 });
      level.gate.pos = new THREE.Vector3(0, 2.5, 20);
      level.gate.radius = 3.4;
      level.gate.alive = true;
      engine.attackables.push(level.gate);
      // side walls of the courtyard
      B.wall(engine, { from: [-52, 20], to: [-52, 58], h: 5 });
      B.wall(engine, { from: [52, 20], to: [52, 58], h: 5 });
      B.wall(engine, { from: [-52, 58], to: [52, 58], h: 5 });
      // keep & inner buildings
      B.pillarHall(engine, { pos: [0, 48], yaw: 0, w: 14, d: 10 });
      B.hut(engine, { pos: [-20, 40], r: 2.4 });
      B.hut(engine, { pos: [22, 44], r: 2.6 });
      B.stupa(engine, { pos: [-34, 48], radius: 4 });

      // towers flanking the approach (enemy archer perches)
      const t1 = B.tower(engine, { pos: [-12, 16], h: 6.5 });
      const t2 = B.tower(engine, { pos: [12, 16], h: 6.5 });

      // approach: paths, barricades (destructible cover), battle clutter
      T.addPath([[0, -40], [0, 18]], 5);
      level.covers = [];
      for (const [x, z, yaw] of [[-4, -6, 0.2], [5, -10, -0.3], [-7, 2, 0.1], [6, 4, 0.25], [0, -18, -0.15], [-10, -14, 0.3]]) {
        level.covers.push(B.barricade(engine, { pos: [x, z], yaw, hp: 70 }));
      }
      for (const [x, z] of [[-14, -22], [16, -20]]) B.banner(engine, { pos: [x, z], color: 0xc8a12e, terrain: T });
      B.banner(engine, { pos: [-6, 22.5], color: 0x2e3a5e, terrain: T });
      B.banner(engine, { pos: [6, 22.5], color: 0x2e3a5e, terrain: T });
      B.crate(engine, { pos: [-18, -8], s: 1.2 }); B.crate(engine, { pos: [18, -4], s: 1 });

      T.scatterTrees(70, 66, [{ x: 0, z: 0, r: 30 }, { x: 0, z: 30, r: 40 }]);
      T.scatterGrass(400, 60, [{ x: 0, z: 20, r: 26 }]);
      T.scatterRocks(26, 60, [{ x: 0, z: 8, r: 24 }]);

      // ---- forces ----
      // your squad
      level.squad = G.spawnGiants(engine, { center: [0, -38], count: 2, names: ['Nandhimitra', 'Suranimala'] });
      for (let i = 0; i < 4; i++) {
        level.squad.push(engine.enemies.spawn({
          faction: 'ally', type: i % 2 ? 'melee' : 'archer', pos: [-6 + i * 3.5, -40],
          followPlayer: true, hp: 80,
        }));
      }

      // outer guard (6)
      const out = [];
      for (const [type, x, z] of [['melee', -5, 14], ['melee', 5, 14], ['melee', 0, 12], ['brute', 0, 16], ['archer', -9, 12], ['archer', 9, 12]]) {
        out.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: Math.PI, guardRadius: 20 }));
      }
      // tower archers (hold their perches)
      for (const [tw, x, z] of [[t1, -12, 16], [t2, 12, 16]]) {
        const a = engine.enemies.spawn({ faction: 'enemy', type: 'archer', pos: [x, z], holdPos: true });
        a.group.position.y = tw.deckY; a.baseY = tw.deckY;
      }

      // courtyard garrison (8) + captain — spawned beyond the gate, waiting
      level.courtyard = [];
      for (const [type, x, z] of [['melee', -6, 30], ['melee', 6, 30], ['melee', -12, 36], ['melee', 12, 36], ['brute', 0, 32], ['brute', -4, 40], ['archer', -18, 44], ['archer', 18, 44]]) {
        level.courtyard.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: Math.PI, guardRadius: 24 }));
      }
      level.captain = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, 46], yaw: Math.PI,
        name: 'Garrison Captain', showName: true, hp: 150, plume: true, cape: true,
      });

      // ---- flow ----
      level.stage = 'outer';
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.stage === 'outer' && out.includes(npc)) {
          const done = engine.missions.bump('outer');
          if (done) {
            level.stage = 'gate';
            engine.missions.reveal('gate');
            engine.checkpoint({ note: 'Outer guard broken', arrows: 10 });
            engine.ui.subtitle('Suranimala', 'The door is only wood — and wood splits! Strike it down!', 5);
            G.audio.warHorn();
          }
        } else if (level.stage === 'court') {
          if (npc === level.captain) {
            engine.missions.complete('captain');
          } else if (level.courtyard.includes(npc)) {
            engine.missions.bump('court');
          }
          if (!level.captain.alive && engine.missions.get('court').done) {
            engine.ui.subtitle('Nandhimitra', 'Vijitanagara is ours! The road to Anuradhapura lies open.', 6);
          }
        }
      });

      engine.events.on('gateBroken', () => {
        if (level.stage !== 'gate') return;
        level.stage = 'court';
        engine.missions.complete('gate');
        engine.missions.reveal('court');
        engine.missions.reveal('captain');
        engine.checkpoint({ note: 'The gate is down', pos: [0, 14], arrows: 8 });
        engine.ui.subtitle(null, 'The gate splinters. The courtyard seethes with iron.', 4);
        engine.enemies.alertAllEnemies(engine.player);
        G.audio.elephantTrumpet();
      });
    },

    start(engine) {
      engine.ui.subtitle('Nandhimitra', 'Shields high! Their reeds will fall like rain — move cover to cover and break their line!', 6);
      G.audio.warHorn();
      engine.checkpoint({ note: 'Before the walls' });
      engine.setCombatIntensity(0.6);
    },

    update(engine, dt) {
      const level = this;
      // allies chip at the gate once the outer guard falls
      if (level.stage === 'gate' && !level.gate.broken) {
        level._chip = (level._chip || 0) + dt;
        if (level._chip > 1.4) {
          level._chip = 0;
          level.gate.takeDamage(4);
          G.audio.arrowHit('wood');
        }
      }
      // keep the war-drums hot through the whole assault
      engine.setCombatIntensity(Math.max(engine.combatIntensity, 0.45));
    },
  });
})();
