/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/yapahuwaTooth.js
   CHRONICLES III — "Yapahuwa & the Tooth" (1283 CE, Dambadeniya–Kurunegala era)

   Standalone era campaign from the Taprobane map (v0.7). A Pandyan
   expedition under Arya Chakravarti has fallen on Bhuvanekabahu I's rock
   citadel of Yapahuwa, seeking the Sacred Tooth Relic. History records the
   fortress lost and the Relic carried off — recovered only later by
   Parakramabahu III's embassy to the Pandyan court. This mission does not
   rewrite that outcome: you cannot save Yapahuwa, only the Relic's bearer.
   Hold the gate, then the stair, long enough for the monk carrying the
   Tooth to slip out the sally-port — buying the time history says the
   embassy would later need.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;
  const ROCK_H = 26;

  /* height of the great stair's surface at a given z — first flight rises
     0→10 over z -2..16, a landing holds at y=10 over z 16..22, the second
     flight rises 10→26 over z 22..42, and the summit sits flat at 26. Used
     to keep the escorted monk and the rescuable guards glued to the steps
     instead of interpolating between waypoints (which snapped them
     vertically when a target changed). */
  function stairY(z) {
    if (z <= -2) return 0;
    if (z <= 16) return ((z + 2) / 18) * 10;
    if (z <= 22) return 10;
    if (z <= 42) return 10 + ((z - 22) / 20) * (ROCK_H - 10);
    return ROCK_H;
  }

  G.Levels.register({
    id: 'yapahuwa',
    order: 22,
    standalone: true,
    chapter: 'Chronicles III',
    title: 'Yapahuwa & the Tooth',
    location: 'The rock citadel of Yapahuwa, 1283 CE',
    framing:
      'Arya Chakravarti\'s expedition has broken through the outer works. The ' +
      'fortress is already lost — what matters now is what leaves it. Bhikkhu ' +
      'Ananda carries the Sacred Tooth Relic toward the sally-port on the far ' +
      'side of the rock. You cannot hold Yapahuwa. You can hold the stair long ' +
      'enough for him to disappear into the jungle — long enough for a king\'s ' +
      'embassy, years from now, to ask for it back.',
    timeLine: 'the fortress\'s last hour',
    ambience: 'battlefield',
    music: 'duel',
    nature: { animals: 0.3, flowers: 0.4, herbs: 0.8 },
    atmosphere: {
      skyTop: 0x8a5a3c, skyHorizon: 0xecb878, fogColor: 0xd8b088, fogScale: 1.0,
      sunDir: new THREE.Vector3(0.6, 0.3, -0.4), sunColor: 0xffc48a, sunIntensity: 2.3,
    },
    objectives: [
      { id: 'gate', text: 'Hold the lower gate against the vanguard', count: 5, marker: [0, -10] },
      { id: 'escort', text: 'Escort Bhikkhu Ananda up the great stair', marker: [0, 30], hidden: true },
      { id: 'summit', text: 'Hold the summit while the sally-port opens', count: 4, marker: [0, 46], hidden: true },
      { id: 'guards', text: 'Save the temple guards along the stair', count: 3, optional: true, marker: [0, 20] },
    ],
    spawn: { pos: [0, -30], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'rock', bounds: 66, boundary: 'cliff' });
      const B = G.Build;
      const level = this;

      T.addPath([[0, -34], [0, -8]], 4);
      B.lionPaws(engine, { pos: [0, -6], yaw: 0, y: 0 });
      B.moonstone(engine, { pos: [0, -3.4], yaw: Math.PI, r: 1.5 });
      B.wall(engine, { from: [-24, -8], to: [-4, -8], h: 4 });
      B.wall(engine, { from: [4, -8], to: [24, -8], h: 4 });
      B.banner(engine, { pos: [-5, -6.5], color: 0xc8a12e, terrain: T });
      B.banner(engine, { pos: [5, -6.5], color: 0xc8a12e, terrain: T });

      // the great stair climbing the rock
      B.stairs(engine, { from: [0, 0, -2], to: [0, 10, 16], width: 5 });
      const land1 = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 6), G.Mats.library().stone);
      land1.position.set(0, stairY(19), 19);
      land1.castShadow = land1.receiveShadow = true;
      engine.scene.add(land1);
      engine.addStaticBox([0, stairY(19), 19], [4.5, 0.25, 3]);
      B.stairs(engine, { from: [0, 10, 22], to: [0, ROCK_H, 42], width: 5 });
      for (let i = 0; i < 3; i++) B.fresco(engine, { pos: [-6, 6 + i * 4, 5 + i * 6], yaw: Math.PI / 2 + 0.2, seed: 9 + i });

      // summit terrace
      const summit = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 16), G.Mats.library().stone);
      summit.position.set(0, ROCK_H - 0.3, 46);
      summit.castShadow = summit.receiveShadow = true;
      engine.scene.add(summit);
      engine.addStaticBox([0, ROCK_H - 0.3, 46], [10, 0.3, 8]);
      // note: most Build.* helpers have no elevation param (they sit at
      // ground y=0), so the summit terrace is dressed only with builders
      // that take an explicit y — a bare stone platform and a throne,
      // echoing Sigiriya's own summit.
      B.throne(engine, { pos: [0, 50], yaw: Math.PI, y: ROCK_H });

      T.scatterTrees(70, 60, [{ x: 0, z: -6, r: 20 }, { x: 0, z: 46, r: 24 }]);
      T.scatterRocks(24, 60, [{ x: 0, z: 20, r: 30 }]);

      // ---- Pandyan expedition (tinted saffron/white to distinguish from Elara's Cholas) ----
      const pandyan = (type, pos, extra = {}) => engine.enemies.spawn({
        faction: 'enemy', type, pos, tintCloth: 0xd9b06a, yaw: Math.PI, ...extra,
      });
      const gate = [
        pandyan('melee', [-6, -12]), pandyan('melee', [6, -12]), pandyan('melee', [0, -14]),
        pandyan('brute', [0, -10]), pandyan('archer', [-10, -14]),
      ];

      // Bhikkhu Ananda, the Relic-bearer — the mission's real objective
      level.monk = engine.enemies.spawn({
        faction: 'ally', type: 'civilian', pos: [0, 0], yaw: Math.PI, hp: 60,
        palette: 'civilian', name: 'Bhikkhu Ananda', showName: true, passive: true,
      });
      level.monk.setPosture('relaxed');
      level.escorting = false;

      // temple guards along the stair (rescuable — reuse the captive pattern)
      level.guardCount = 0;
      for (const [x, z] of [[-3, 12], [3, 24], [-3, 34]]) {
        const g = engine.enemies.spawn({
          faction: 'ally', type: 'melee', pos: [x, stairY(z), z], yaw: 0, posture: 'kneel', hp: 55,
        });
        g.captive = true;
        engine.addInteract({
          pos: [x, z], radius: 2.2, prompt: 'Rally the temple guard', once: true,
          when: () => g.alive && level.escorting,
          onUse: () => {
            g.captive = false; g.clearPosture(); g.ai.followPlayer = true;
            G.audio.interact();
            engine.ui.subtitle('Temple guard', 'To the summit! The Relic must not fall!', 3);
            const done = engine.missions.bump('guards');
            if (done) engine.ui.toast('THE GUARD IS RALLIED');
          },
        });
      }

      // summit defenders (revealed once the escort begins)
      level.summitWave = [];

      level.stage = 'gate';
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.stage === 'gate' && gate.includes(npc)) {
          const done = engine.missions.bump('gate');
          if (done) {
            level.stage = 'escort';
            level.escorting = true;
            engine.missions.reveal('escort');
            engine.checkpoint({ note: 'The gate is bought', arrows: 8 });
            engine.ui.subtitle('Bhikkhu Ananda', 'They are through — I go for the stair. Stay close, warrior, or all of this was for nothing.', 6);
          }
        }
        if (level.stage === 'summit' && level.summitWave.includes(npc)) {
          engine.missions.bump('summit');
        }
      });

      engine.addZone({
        pos: [0, 46], r: 8, minY: ROCK_H - 3,
        when: () => level.stage === 'escort',
        onEnter: () => {
          level.stage = 'summit';
          engine.missions.reveal('summit');
          engine.checkpoint({ note: 'The summit', pos: [0, ROCK_H, 42], arrows: 10 });
          engine.ui.subtitle(null, 'The last of the garrison has followed you up. Hold this ground — the sally-port needs only minutes.', 6);
          for (const [x, z] of [[-6, 40], [6, 40], [-4, 52], [4, 52]]) {
            level.summitWave.push(pandyan(Math.random() < 0.3 ? 'archer' : 'melee', [x, ROCK_H, z], { yaw: 0 }));
          }
        },
      });

      engine.addInteract({
        pos: [0, 50], radius: 3, minY: ROCK_H - 3, prompt: 'Open the sally-port',
        when: () => level.stage === 'summit' && engine.missions.get('summit').done,
        once: true,
        onUse: () => {
          level.stage = 'done';
          G.audio.bell();
          engine.ui.subtitle('Bhikkhu Ananda', 'Go well, warrior. What is lost today, a king will ask for tomorrow — and receive.', 7);
          engine.after(4, () => engine.ui.subtitle(null, 'Years later, Parakramabahu III would travel to the Pandyan court in person, and the Tooth Relic would come home.', 6));
        },
      });
    },

    start(engine) {
      engine.ui.subtitle(null, 'Smoke over the outer works. Yapahuwa is falling — but the Relic does not have to fall with it.', 6);
      engine.checkpoint({ note: 'The lower gate' });
      engine.setCombatIntensity(0.5);
    },

    update(engine, dt) {
      const level = this;
      if (!level.escorting || !level.monk.alive) return;
      // walk straight up the z-axis; the stair's height comes from stairY(),
      // not from waypoint snapping, so the climb reads smoothly the whole way
      level.monk.setMove(new THREE.Vector3(0, 0, 50), dt, 2.0);
      level.monk.group.position.y = stairY(level.monk.group.position.z);
    },
  });
})();
