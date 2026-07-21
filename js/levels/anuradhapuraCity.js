/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/anuradhapuraCity.js
   CHAPTER I — "The King's Muster" (tutorial)
   The sacred city of Anuradhapura: whitewashed dagoba, pillared hall with
   moonstone & guard stones, training yard by the tank. Nandhimitra of the
   Ten Giants drills the recruit: movement, sprint/jump, sword combos,
   the parry window, and the bow — then present yourself to the King.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  G.Levels.register({
    id: 'anuradhapura',
    order: 1,
    chapter: 'Chapter I',
    title: "The King's Muster",
    location: 'Anuradhapura — sacred city of Rajarata, 161 BCE',
    framing:
      'Rajarata is divided. From the southern kingdom of Ruhuna, prince Dutugemunu ' +
      'has marched north to unite the island under one banner and end the long rule ' +
      'of King Elara. In the shadow of the great dagobas of Anuradhapura, his army ' +
      'gathers. You are a young warrior come to join the muster. Prove yourself.',
    timeLine: 'morning of the muster', marchDays: 4,
    ambience: 'jungle',
    music: 'explore',
    // a living sacred-city street (v0.3 §2.4) — folk on their morning beat
    crowd: { count: 12, center: [0, -6], area: 26 },
    atmosphere: {
      skyTop: 0x3d6fb5, skyHorizon: 0xe3d3ac, fogColor: 0xd6c8a4,
      sunDir: new THREE.Vector3(-0.5, 0.8, 0.3),
    },
    objectives: [
      { id: 'talk', text: 'Speak with Nandhimitra at the training yard', marker: [8, -20] },
      { id: 'run', text: 'Run to the lion banner (hold SHIFT to sprint, SPACE to jump)', marker: [26, -38], hidden: true },
      { id: 'dummies', text: 'Strike the training dummies', count: 6, marker: [14, -26], hidden: true },
      { id: 'parry', text: "Parry Nandhimitra's attacks (raise guard just before the blow lands)", count: 2, marker: [8, -20], hidden: true },
      { id: 'targets', text: 'Hit the archery targets with your bow', count: 3, marker: [2, -30], hidden: true },
      { id: 'king', text: 'Present yourself to King Dutugemunu', marker: [0, 24], hidden: true },
    ],
    spawn: { pos: [0, -6], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'grass', bounds: 78 });
      const B = G.Build;

      // sacred precinct — great whitewashed stupa to the north
      B.stupa(engine, { pos: [0, 46], radius: 11, whitewashed: true });
      B.stupa(engine, { pos: [-38, 30], radius: 5.5 });
      // audience hall with correct threshold furniture
      B.pillarHall(engine, { pos: [0, 24], yaw: Math.PI, w: 12, d: 10 });
      B.moonstone(engine, { pos: [0, 17.2], yaw: Math.PI });
      B.guardStones(engine, { pos: [0, 18.4], yaw: Math.PI });
      T.addPath([[0, -40], [0, 16]], 4);
      T.addPath([[0, 0], [26, -38]], 3);
      T.addPath([[0, 30], [0, 44]], 3);

      // the tank (wewa) and paddies to the east
      T.addWater(52, -8, 20);
      T.addPaddy(30, 18, 12, 8);
      T.addPaddy(30, 30, 12, 8);

      // training yard south-west
      for (let i = 0; i < 3; i++) B.dummy(engine, { pos: [12 + i * 2.4, -26] });
      B.archeryTarget(engine, { pos: [2, -34], yaw: 0 });
      B.archeryTarget(engine, { pos: [-2, -35], yaw: 0 });
      B.archeryTarget(engine, { pos: [6, -35.5], yaw: 0 });
      B.banner(engine, { pos: [26, -38], color: 0xc8a12e, terrain: T });
      B.banner(engine, { pos: [-6, -20], color: 0x7a2f22, terrain: T });
      for (const [x, z] of [[10, -18], [-4, -28], [16, -34]]) B.crate(engine, { pos: [x, z], s: U.rand(0.8, 1.2), yaw: U.rand(0, 3) });
      B.brazier(engine, { pos: [3, 17], light: true, terrain: T });
      B.brazier(engine, { pos: [-3, 17], light: true, terrain: T });

      // elephant stables west — the young tusker can be ridden (F to mount)
      G.Wildlife.rideable(engine, { pos: [-30, -10], yaw: 1.2, name: 'young tusker' });
      B.elephant(engine, { pos: [-36, -16], yaw: 0.4 });
      B.tower(engine, { pos: [-16, -40] });
      for (const [x, z, r] of [[-22, 6, 2.4], [-28, 0, 2.2], [-20, -14, 2.0]]) B.hut(engine, { pos: [x, z], r });

      // city greenery
      T.scatterTrees(120, 74, [
        { x: 0, z: 46, r: 20 }, { x: 0, z: 24, r: 12 }, { x: 52, z: -8, r: 24 },
        { x: 12, z: -26, r: 10 }, { x: 2, z: -33, r: 8 }, { x: 26, z: -38, r: 6 },
        { x: 0, z: 0, r: 10 }, { x: 30, z: 24, r: 12 }, { x: -30, z: -12, r: 10 },
        { x: 0, z: -40, r: 8 }, { x: -38, z: 30, r: 9 },
      ]);
      T.scatterGrass(700, 70, [{ x: 0, z: 46, r: 16 }, { x: 52, z: -8, r: 22 }]);
      T.scatterRocks(24, 70, [{ x: 0, z: 46, r: 18 }, { x: 52, z: -8, r: 22 }]);

      // ---- characters ----
      const level = this;
      level.instructor = engine.enemies.spawn({
        faction: 'ally', type: 'elite', pos: [8, -20], yaw: -1.6,
        name: 'Nandhimitra', showName: true, passive: true, hp: 500,
      });
      level.king = new G.KingDutugemunu(engine, { pos: [0, 22], yaw: Math.PI });
      // honour guard by the hall
      engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [-3.4, 19.5], yaw: Math.PI, passive: true, brain: true });
      engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [3.4, 19.5], yaw: Math.PI, passive: true, brain: true });
      // recruits sparring in the yard (flavour)
      engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [16, -22], yaw: 2.2, passive: true });
      engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [17.4, -23.2], yaw: -0.9, passive: true });

      // ---- interactions & tutorial flow ----
      level.phase = 'talk';
      level.parryCount = 0;
      level.drill = { t: 2.5, active: false };

      engine.addInteract({
        pos: [8, -20], radius: 2.6, prompt: 'Speak with Nandhimitra', once: false,
        when: () => level.phase === 'talk' || level.phase === 'parry-wait',
        onUse: () => {
          if (level.phase === 'talk') {
            engine.ui.subtitle('Nandhimitra', 'So — another blade for the King. We will see. First: legs before steel. Sprint to the lion banner across the yard and come back quick.', 6);
            engine.missions.complete('talk');
            engine.missions.reveal('run');
            level.phase = 'run';
          } else if (level.phase === 'parry-wait') {
            engine.ui.subtitle('Nandhimitra', 'Now the true lesson. I will strike at you. Hold your guard — but raise it at the LAST instant to turn my blade. Twice, recruit.', 6);
            level.phase = 'parry';
            level.drill.active = true;
            engine.missions.reveal('parry');
          }
        },
      });

      engine.addZone({
        pos: [26, -38], r: 3.5,
        when: () => level.phase === 'run',
        onEnter: () => {
          engine.missions.complete('run');
          engine.missions.reveal('dummies');
          engine.ui.subtitle('Nandhimitra', 'Quick enough. Now draw steel — LEFT HAND strikes, chain three blows for a combo. Break those dummies\' rest.', 6);
          level.phase = 'dummies';
          engine.checkpoint({ note: 'Training — swordwork' });
        },
      });

      engine.events.on('dummyHit', () => {
        if (level.phase !== 'dummies') return;
        const done = engine.missions.bump('dummies');
        if (done) {
          level.phase = 'parry-wait';
          engine.ui.subtitle('Nandhimitra', 'Good arm. Come back to me — your guard needs testing.', 5);
        }
      });

      engine.events.on('parry', () => {
        if (level.phase !== 'parry') return;
        const done = engine.missions.bump('parry');
        engine.ui.toast('PARRY ' + Math.min(2, ++level.parryCount) + ' / 2');
        if (done) {
          level.phase = 'bow';
          level.drill.active = false;
          engine.combat.addArrows(12);
          engine.missions.reveal('targets');
          engine.ui.subtitle('Nandhimitra', 'You have iron in you after all. Take the bow — press Q. HOLD right hand to draw, loose with the left. Three targets, three reeds.', 7);
          engine.checkpoint({ note: 'Training — archery' });
        }
      });

      engine.events.on('targetHit', () => {
        if (level.phase !== 'bow') return;
        const done = engine.missions.bump('targets');
        if (done) {
          level.phase = 'king';
          engine.missions.reveal('king');
          engine.ui.subtitle('Nandhimitra', 'Enough. The King watches from the hall of pillars. Kneel before him — we march at dawn.', 6);
        }
      });

      engine.addInteract({
        pos: [0, 22], radius: 3.2, prompt: 'Kneel before King Dutugemunu',
        when: () => level.phase === 'king',
        onUse: () => {
          level.phase = 'done';
          level.king.say('Rise, warrior. Not for the joy of power do I make this war, but to unite the island and guard the Dhamma. Elara is a just king — yet there must be one Lanka.', 9);
          engine.after(9, () => {
            level.king.say('At first light we ride for the border villages. Rest now. Lanka will remember what we do.', 6);
            engine.missions.complete('king');
          });
        },
      });
    },

    start(engine) {
      engine.ui.subtitle(null, 'Anuradhapura. The army of Ruhuna gathers beneath the great stupa.', 5);
      engine.ui.toast('Follow the gold marker on your compass');
    },

    update(engine, dt) {
      const level = this;
      level.king.update(dt);
      // parry drill: the instructor throws slow telegraphed strikes
      if (level.drill.active && engine.player.alive) {
        const ins = level.instructor;
        const d = U.flatDist(ins.pos, engine.player.pos);
        ins.faceToward(engine.player.pos, dt);
        if (d > 2.4) ins.setMove(engine.player.pos, dt, 2.4);
        else {
          ins.setMove(null, dt);
          level.drill.t -= dt;
          if (level.drill.t <= 0) {
            level.drill.t = 3.2;
            ins.rig.playWindup();
            G.audio.stagger();
            engine.after(0.9, () => {
              if (level.phase !== 'parry') return;
              ins.rig.playStrike();
              // training blows sting but cannot kill
              if (engine.player.hp > 22) engine.combat.npcStrike(ins, engine.player, 6);
              else engine.combat.npcStrike(ins, engine.player, 0);
            });
          }
        }
      }
    },
  });
})();
