/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/finalDuel.js
   CHAPTER IV — "The Field of Kings"
   The armies meet before Anuradhapura. A cinematic fly-over (war elephants,
   banners, the King on Kandula) gives way to single combat: by ancient custom
   the matter is settled champion against champion — and Elara has named YOU.
   A skill-based duel against telegraphed patterns; parry to break him open.
   Ends as the history remembers: with honour for the fallen king.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  G.Levels.register({
    id: 'duel',
    order: 4,
    chapter: 'Chapter IV',
    title: 'The Field of Kings',
    location: 'The plain before Anuradhapura',
    framing:
      'The last fortress has fallen. Between Dutugemunu and the throne of ' +
      'Anuradhapura stands only Elara himself — old, upright, and unbowed. ' +
      'To spare ten thousand lives, the matter will be settled in the old way: ' +
      'single combat between the lines. The Chola king has watched you cut ' +
      'through his strongholds. He has asked for you by name.',
    ambience: 'battlefield',
    music: 'duel',
    atmosphere: {
      skyTop: 0x8a5a3c, skyHorizon: 0xf0c98a, fogColor: 0xe0c294, fogScale: 1.1,
      sunDir: new THREE.Vector3(0.75, 0.35, 0.2), sunColor: 0xffdca8, sunIntensity: 2.8,
      hemiSky: 0xd8b890, hemiGround: 0x7a5a3a,
    },
    objectives: [
      { id: 'duel', text: 'Defeat Elara in single combat', marker: [0, 14] },
      { id: 'honor', text: 'Stand witness with King Dutugemunu', marker: [0, 0], hidden: true },
    ],
    spawn: { pos: [0, -14], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'dirt', bounds: 60, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      T.addPath([[0, -40], [0, 40]], 8);
      // the arena ring is fenced by unseen walls so the duel stays a duel
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        engine.addStaticBox([Math.sin(a) * 26, 3, Math.cos(a) * 26], [7.5, 6, 0.6], a + Math.PI / 2, { invisible: true });
      }

      // ---- the two armies, drawn up in lines ----
      const row = (faction, z0, n, dz) => {
        for (let i = 0; i < n; i++) {
          const x = -18 + (36 / (n - 1)) * i;
          engine.enemies.spawn({
            faction, type: i % 4 === 3 ? 'archer' : 'melee',
            pos: [x + U.rand(-0.6, 0.6), z0 + U.rand(-0.8, 0.8) + dz],
            yaw: faction === 'ally' ? 0 : Math.PI,
            brain: false, posture: 'combat', hp: 999,
          });
        }
      };
      row('ally', -34, 10, 0); row('ally', -37, 9, 0);
      row('enemy', 34, 10, 0); row('enemy', 37, 9, 0);
      for (const [x, z, c] of [[-22, -32, 0xc8a12e], [22, -32, 0xc8a12e], [-22, 32, 0x2e3a5e], [22, 32, 0x2e3a5e]])
        B.banner(engine, { pos: [x, z], color: c, terrain: T });

      // King Dutugemunu beside his war elephant Kandula
      level.king = new G.KingDutugemunu(engine, { pos: [-8, -30], yaw: 0 });
      level.kandula = B.elephant(engine, { pos: [-13, -31], yaw: 0.15, armored: true, scale: 1.15 });
      // Elara's own mount waits on the far side
      B.elephant(engine, { pos: [13, 33], yaw: Math.PI, armored: true });

      T.scatterTrees(50, 56, [{ x: 0, z: 0, r: 42 }, { x: -18, z: -42, r: 16 }, { x: 18, z: 42, r: 16 }]);
      T.scatterGrass(300, 54, [{ x: 0, z: 0, r: 30 }]);

      // ---- Elara ----
      level.elara = new G.ElaraBoss(engine, { pos: [0, 16], yaw: Math.PI });
      level.done = false;

      engine.events.on('bossDefeated', () => {
        if (level.done) return;
        level.done = true;
        engine.missions.complete('duel');
        engine.missions.reveal('honor');
        engine.setCombatIntensity(0);
        G.audio.bell();
        engine.after(1.2, () => {
          engine.ui.subtitle(null, 'A silence falls across ten thousand men.', 4);
          level.king.walkTo(0, 4, 2.0);
        });
        engine.after(5.5, () => {
          level.king.say('He ruled without fear and he fell without it. Let no man rejoice.', 6);
        });
        engine.after(12, () => {
          level.king.say('Raise a tomb for Elara where he lies. Let all who pass — even kings — bow before it. That is my decree.', 8);
        });
        engine.addInteract({
          pos: [0, 4], radius: 3.5, prompt: 'Bow your head', once: true,
          when: () => level.done,
          onUse: () => {
            engine.ui.subtitle(null, 'You bow. So, history records, did every king of Lanka who ever passed this place after.', 6);
            engine.after(3, () => engine.missions.complete('honor'));
          },
        });
      });
    },

    start(engine) {
      const level = this;
      // ---- the fly-over: armies → Kandula & the King → Elara → the line ----
      engine.playCinematic([
        { pos: [-28, 9, -46], look: [4, 1.5, -34], dur: 4.2 },     // sweep the ally line
        { pos: [-20, 4.5, -40], look: [-12, 2.8, -31], dur: 3.6 }, // Kandula & the King
        { pos: [14, 5, 34], look: [10, 2, 33], dur: 4.0 },         // across to Elara's line & his mount
        { pos: [4, 2.4, 8], look: [0, 1.6, 16], dur: 3.2 },        // Elara steps forward
        { pos: [0, 2.0, -13], look: [0, 1.5, 16], dur: 2.6 },      // settle behind the player
      ], {
        onStart: () => {
          engine.ui.subtitle(null, 'Two armies. One island. The old custom holds: champion against champion.', 5);
          engine.after(5, () => engine.ui.subtitle('King Dutugemunu', 'Whatever befalls — no soldier moves. This is between the two of them and heaven.', 6), true);
          engine.after(10.5, () => engine.ui.subtitle('Elara', 'Young lion. Your king honours me with his fiercest. Come — let us give them something worth remembering.', 6), true);
          G.audio.elephantTrumpet();
          G.audio.warHorn();
        },
        onDone: () => {
          level.elara.begin();
          engine.checkpoint({ note: 'The duel begins' });
          engine.ui.toast('WATCH HIS BLADE — PARRY THE GLOW');
          engine.setCombatIntensity(0.85);
        },
      });
    },

    update(engine, dt) {
      const level = this;
      level.king.update(dt);
      if (level.elara) level.elara.update(dt);
    },

    /* checkpoint restore inside the duel resets Elara to full */
    restore(engine) {
      const level = this;
      if (level.done) return;
      const npc = level.elara.npc;
      npc.hp = npc.maxHp;
      npc.group.position.set(0, 0, 16);
      npc.yaw = Math.PI;
      if (level.elara.started) {
        level.elara._setState('stalk');
        engine.ui.bossBar('ELARA, KING OF RAJARATA', 1);
      }
    },
  });
})();
