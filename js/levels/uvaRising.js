/* ============================================================================
   WARRIORS OF TAPROBANE — levels/uvaRising.js
   CHRONICLES — "The Uva Rising" (1817–1818 CE) — the series' solemn finale

   A standalone era campaign launched from the Taprobane map. The convention of
   1815 gave the last kingdom away without a battle; the great rising of Uva–
   Wellassa fought to take it back. History is plain about how it ended — the
   rising was crushed, Keppetipola Disawe taken and beheaded, and two thousand
   three hundred years of Lankan kingship closed. This mission does not rewrite
   that. You fight beside Keppetipola in the last defiance: raise the flag,
   break the British outpost, and — knowing the kingdom cannot be saved — get the
   people of Wellassa away into the hills, so that the memory, at least, endures.

   Historicity note: the 1817–18 Uva–Wellassa rebellion against Brownrigg's
   government, led by Keppetipola, was suppressed with great severity. This
   dramatizes its defiance and the saving of its people, not a mapped battle.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const BRITISH = 0xa02828;           // redcoat scarlet
  const HILLS = new THREE.Vector3(0, 0, 34);   // the refuge in the hills

  G.Levels.register({
    id: 'uvaRising',
    order: 33,
    standalone: true,
    chapter: 'Chronicles — The Last Kingdom',
    title: 'The Uva Rising',
    location: 'Wellassa, the last rising of the last kingdom, 1818 CE',
    sources: 'Accounts of the 1817–18 Uva–Wellassa rebellion under Keppetipola Disawe, and its suppression under Governor Brownrigg.',
    framing:
      'The kingdom was signed away three years ago, and now the hills have risen ' +
      'to take it back. You know how this ends — the chronicles do not spare it — ' +
      'and Keppetipola knows too, and stands anyway. Raise the flag one last time, ' +
      'break the redcoat outpost, and buy with your sword the one thing that can ' +
      'still be saved: the people of Wellassa, gone into the hills before the ' +
      'reprisal comes. Let them carry the memory where no army can follow.',
    timeLine: 'the last red evening of the kingdom',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0.2, flowers: 0.5, herbs: 0.8 },
    atmosphere: {
      skyTop: 0x3a3358, skyHorizon: 0xd06a3a, fogColor: 0xb07850, fogScale: 0.95,
      sunDir: new THREE.Vector3(0.55, 0.3, 0.25), sunColor: 0xffa860, sunIntensity: 2.0,
      timeOfDay: 0.8,
    },
    objectives: [
      { id: 'rising', text: 'Raise the flag of the rising over Wellassa', marker: [0, 0] },
      { id: 'outpost', text: 'Break the British outpost guard', count: 4, marker: [0, -18] },
      { id: 'hills', text: 'See the people of Wellassa away into the hills', count: 3, hidden: true, marker: [0, 30] },
      { id: 'major', text: 'Cut down the major of the reprisal column', hidden: true, marker: [0, -26] },
      { id: 'wounded', text: 'Rally the fallen of the rising', count: 3, optional: true, marker: [-14, 8] },
    ],
    spawn: { pos: [0, -28], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'grass', bounds: 74, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      // ---- Wellassa: a hill village between the redcoat outpost and the high hills ----
      for (const [x, z, r] of [[-14, 6, 2.3], [14, 8, 2.2], [-10, 16, 2.1], [12, 18, 2.2], [0, 12, 2.4]]) B.hut(engine, { pos: [x, z], r });
      for (const [x, z] of [[-6, 4], [8, 10], [0, 24]]) B.brazier(engine, { pos: [x, z], light: true, terrain: T });
      // the British outpost to the south (tents + a stockade face + a gun)
      const timber = G.Mats.std({ map: G.Mats.tex.woodDark([6, 2]), rough: 0.9 });
      B.wall(engine, { from: [-16, -22], to: [-3, -22], h: 3.0, thick: 0.8, mat: timber });
      B.wall(engine, { from: [3, -22], to: [16, -22], h: 3.0, thick: 0.8, mat: timber });
      B.tower(engine, { pos: [-10, -22], h: 5.5 });
      B.tower(engine, { pos: [10, -22], h: 5.5 });
      B.cannon(engine, { pos: [0, -24], yaw: 0 });
      B.banner(engine, { pos: [-5, -21], color: BRITISH, terrain: T });
      B.banner(engine, { pos: [5, -21], color: BRITISH, terrain: T });
      // the hills refuge to the north
      B.pillarHall(engine, { pos: [0, 34], yaw: 0, w: 8, d: 6 });
      T.addPath([[0, -26], [0, 30]], 4);
      T.scatterTrees(90, 66, [{ x: 0, z: 12, r: 26 }, { x: 0, z: 34, r: 14 }]);
      T.scatterRocks(28, 64, [{ x: 0, z: 12, r: 24 }]);

      // arrow resupply in the village
      engine.addInteract({
        pos: [0, 20], radius: 3.2, prompt: 'Take arrows from the village store',
        when: () => engine.combat.arrows < engine.combat.quiverMax,
        onUse: () => { engine.combat.addArrows(12); G.audio.interact(); engine.ui.toast('QUIVER REFILLED'); },
      });

      // ---- Keppetipola + the risen fight beside you ----
      level.keppetipola = engine.enemies.spawn({
        faction: 'ally', type: 'elite', pos: [-3, -24], yaw: Math.PI,
        palette: 'royal', cape: true, plume: true, name: 'Keppetipola Disawe',
        showName: true, hp: 330, followPlayer: true,
      });
      for (let i = 0; i < 3; i++) {
        engine.enemies.spawn({ faction: 'ally', type: i === 2 ? 'archer' : 'melee', pos: [3 + i * 2.0, -26], followPlayer: true, hp: 85 });
      }

      // ---- the flag of the rising (raise it — the opening beat) ----
      level.flagUp = false;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 6), G.Mats.library().woodDark);
      pole.position.set(0, 0.2, 0); engine.scene.add(pole); level.flagPole = pole;
      engine.addInteract({
        pos: [0, 0], radius: 3.0, prompt: 'Raise the flag of the rising', once: true,
        when: () => !level.flagUp,
        onUse: () => {
          level.flagUp = true; engine.scene.remove(pole);
          B.banner(engine, { pos: [0, 0], color: 0xc8a12e, terrain: engine.terrain });
          engine.missions.complete('rising');
          G.audio.interact(); G.audio.warHorn();
          engine.checkpoint({ note: 'The flag flies over Wellassa' });
          engine.ui.subtitle('Keppetipola Disawe', 'Let them see it fly once more. Now the outpost — break it, and we hold the village long enough to get our people away.', 8);
        },
      });

      // ---- the British outpost guard ----
      level.outpost = [];
      for (const [type, x, z] of [['melee', -5, -20], ['melee', 5, -20], ['gunner', 0, -22], ['gunner', -10, -18]]) {
        level.outpost.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: 0, palette: 'british', tintCloth: BRITISH, guardRadius: 18 }));
      }
      // the reprisal column + its major (held to the south until the outpost falls)
      for (const [type, x, z] of [['gunner', -8, -30], ['gunner', 8, -30], ['melee', -3, -32], ['melee', 3, -32], ['gunner', 0, -34]]) {
        engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], palette: 'british', tintCloth: BRITISH, guardRadius: 16 });
      }
      level.major = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, -34], yaw: 0,
        name: 'Major of the Reprisal', showName: true, hp: 210, plume: true, cape: true, palette: 'british', tintCloth: BRITISH,
      });

      // ---- the people of Wellassa (send them to the hills once the outpost is broken) ----
      level.people = [];
      for (const [x, z] of [[-14, 8], [-11, 12], [12, 14], [10, 20], [0, 16]]) {
        const p = engine.enemies.spawn({ faction: 'ally', type: 'civilian', pos: [x, z], palette: 'civilian', hp: 40 });
        p.captive = true; level.people.push(p);
      }
      engine.addInteract({
        pos: [0, 14], radius: 5.0, prompt: 'Send the people of Wellassa to the hills', once: true,
        when: () => engine.missions.get('outpost').done,
        onUse: () => {
          for (const p of level.people) if (p.alive) { p.captive = false; p.clearPosture && p.clearPosture(); (level.fleeing = level.fleeing || []).push(p); }
          G.audio.interact();
          engine.ui.toast('THE PEOPLE GO UP INTO THE HILLS');
        },
      });

      // ---- the wounded (optional rally) ----
      level.wounded = [];
      for (const [x, z] of [[-14, 8], [8, 4], [-6, -2]]) {
        const w = engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [x, z], hp: 60, posture: 'kneel' });
        w.downed = true; level.wounded.push(w);
        engine.addInteract({
          pos: [x, z], radius: 2.4, prompt: 'Rally the fallen fighter', once: true,
          onUse: () => {
            if (w.alive) { w.downed = false; w.clearPosture && w.clearPosture(); w.followPlayer = true; }
            G.audio.interact();
            const done = engine.missions.bump('wounded');
            if (done) engine.ui.toast('THE RISING STANDS AGAIN');
          },
        });
      }

      // ---- flow ----
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.outpost.includes(npc)) {
          const done = engine.missions.bump('outpost');
          if (done) {
            engine.missions.reveal('hills');
            engine.missions.reveal('major');
            engine.checkpoint({ note: 'The outpost is broken — now the reprisal comes', arrows: 8 });
            engine.setCombatIntensity(0.8);
            engine.ui.subtitle('Keppetipola Disawe', 'The outpost is ours — but the redcoats are on the road already. Send our people up into the hills, and cut down the major before he brings the whole column down on them.', 9);
          }
        }
        if (npc === level.major) {
          engine.missions.complete('major');
          engine.ui.subtitle('Keppetipola Disawe', 'Their major is down, and our people are in the hills. They will take me, and this kingdom, before the year is out — but not this. Not the memory. Go — live, and remember Wellassa.', 10);
        }
      });
    },

    start(engine) {
      engine.ui.titleCard({ pre: 'CHRONICLES · 1818 CE', main: 'THE UVA RISING', body: 'The last defiance of the last kingdom. You cannot save the crown — only the people, and the memory.', dur: 6.5 });
      engine.after(6.7, () => {
        engine.ui.subtitle(null, 'The hills of Uva have risen. The kingdom is already lost on paper — but here, this evening, it is not yet done. Raise the flag.', 8);
        engine.checkpoint({ note: 'Wellassa' });
        engine.setCombatIntensity(0.4);
      });
    },

    update(engine, dt) {
      const level = this;
      // the people of Wellassa stream up into the hills
      if (level.fleeing) {
        for (const p of level.fleeing) {
          if (!p.alive || p.saved) continue;
          p.setMove(HILLS, dt, 3.8);
          if (U.flatDist(p.pos, HILLS) < 6) { p.saved = true; p.setMove(null, dt); engine.stats.saved++; engine.missions.bump('hills'); }
        }
      }
    },
  });
})();
