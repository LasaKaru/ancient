/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/sigiriyaLegendaryTrial.js
   BONUS CHAPTER — "The Trial of the Lion Rock"

   IMPORTANT FRAMING (shown to the player on an in-game title card): Sigiriya
   postdates Dutugemunu by roughly six centuries (King Kashyapa, 5th c. CE).
   This chapter is therefore presented in-game as a SEPARATE mythic legend —
   "centuries later, a legend endures…" — and is deliberately not stitched
   into the historical Dutugemunu-Elara storyline.

   Gameplay: vertical platforming + combat gauntlets up the rock — water
   gardens, switchback stairs, the fresco gallery and mirror wall, floating
   ledge jumps, the lion-paw gateway, and a summit throne finale against
   spectral guardians.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const C = { x: 0, z: 24 };       // rock centre
  const ROCK_R = 26, ROCK_H = 36;

  function ghostify(npc) {
    npc.group.traverse((c) => {
      if (c.isMesh && c.material) {
        c.material = c.material.clone();
        c.material.transparent = true;
        c.material.opacity = 0.78;
        c.material.emissive = new THREE.Color(0x2a7a8c);
        c.material.emissiveIntensity = 0.5;
      }
    });
    if (npc.label) npc.label.position.y += 0.15;
  }

  G.Levels.register({
    id: 'sigiriya',
    order: 6,
    bonus: true,
    chapter: 'A Legend Apart',
    title: 'The Trial of the Lion Rock',
    location: 'Sigiriya — the Sky Fortress (a legend set centuries later)',
    framing:
      'CENTURIES LATER, A LEGEND ENDURES… Long after Dutugemunu slept beneath ' +
      'his great stupas, another king — Kashyapa — raised a palace in the clouds ' +
      'atop the Lion Rock of Sigiriya. The chronicles say that when the fortress ' +
      'fell silent, its painted maidens kept watch still, and spectral guardians ' +
      'tested any soul who dared the climb. This trial stands apart from the ' +
      'histories you have lived: a myth, told by firelight, of the warrior who ' +
      'climbed the sky.',
    ambience: 'heights',
    music: 'duel',
    atmosphere: {
      skyTop: 0x35406e, skyHorizon: 0xf0a865, fogColor: 0xd8a678, fogScale: 1.6,
      sunDir: new THREE.Vector3(0.8, 0.28, -0.3), sunColor: 0xffc890, sunIntensity: 2.5,
      hemiSky: 0x8a90c0, hemiGround: 0x6a5038, hemiIntensity: 0.5,
    },
    nature: { animals: 0, flowers: 0.5, herbs: 0.6 },   // the rock is a bare place
    objectives: [
      { id: 'gallery', text: 'Climb to the fresco gallery', marker: [27, 18] },
      { id: 'shades1', text: 'Banish the gallery shades', count: 3, hidden: true, marker: [27, 18] },
      { id: 'lion', text: 'Reach the Lion Gate terrace', hidden: true, marker: [0, 52] },
      { id: 'shades2', text: 'Banish the guardians of the Gate', count: 4, hidden: true, marker: [0, 52] },
      { id: 'summit', text: 'Ascend to the summit', hidden: true, marker: [0, 24] },
      { id: 'shades3', text: 'Banish the summit watch', count: 4, hidden: true, marker: [0, 24] },
      { id: 'throne', text: 'Claim the throne of the Sky Fortress', hidden: true, marker: [0, 24] },
    ],
    spawn: { pos: [0, -34], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'grass', bounds: 78, boundary: 'cliff' });
      const B = G.Build;
      const M = G.Mats;
      const level = this;
      const lib = M.library();

      /* ---- the Rock ---- */
      const rockMat = M.std({ map: M.tex.sigiriyaRock([5, 4]), rough: 0.95, bump: 0.1 });
      const rock = new THREE.Mesh(new THREE.CylinderGeometry(ROCK_R, ROCK_R + 3, ROCK_H, 28, 1), rockMat);
      rock.position.set(C.x, ROCK_H / 2, C.z);
      rock.castShadow = rock.receiveShadow = true;
      engine.scene.add(rock);
      engine.addStaticCylinder([C.x, ROCK_H / 2, C.z], ROCK_R + 0.2, ROCK_H);
      engine.occluders.push(rock);
      // summit floor detail + ruin walls
      const ruin = M.std({ map: M.tex.brickOld([3, 1]), rough: 0.95 });
      for (const [x, z, w, yaw] of [[-6, 20, 8, 0.3], [7, 28, 6, -0.8], [-2, 32, 7, 1.2]]) {
        const wmesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, 0.7), ruin);
        wmesh.position.set(x, ROCK_H + 0.55, z);
        wmesh.rotation.y = yaw;
        wmesh.castShadow = true;
        engine.scene.add(wmesh);
        engine.addStaticBox([x, ROCK_H + 0.55, z], [w / 2, 0.55, 0.35], yaw);
      }
      level.throne = B.throne(engine, { pos: [0, 24], y: ROCK_H, yaw: Math.PI });

      /* ---- water gardens at the base ---- */
      T.addPath([[0, -40], [0, -16]], 4);
      T.addWater(-10, -24, 6);
      T.addWater(10, -24, 6);
      for (const [x, z] of [[-16, -30], [16, -30], [-7, -14], [7, -14]]) B.banner(engine, { pos: [x, z], color: 0x8c5a2c, terrain: T });
      B.guardStones(engine, { pos: [0, -16], yaw: Math.PI, gap: 3 });
      B.moonstone(engine, { pos: [0, -17.5], yaw: Math.PI, r: 1.6 });
      T.scatterTrees(110, 72, [{ x: 0, z: 24, r: 34 }, { x: 0, z: -24, r: 14 }, { x: 0, z: -38, r: 8 }]);
      T.scatterGrass(600, 70, [{ x: 0, z: 24, r: 30 }]);
      T.scatterRocks(30, 68, [{ x: 0, z: 24, r: 30 }]);

      /* ---- the climb: platforms + stairs hugging the rock face ----
         (gaps tuned to the player's jump: ≤2m gap, ≤1.1m rise)          */
      const plat = (x, y, z, sx = 3.5, sz = 2.5, mat = lib.stone) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.5, sz), mat);
        p.position.set(x, y - 0.25, z);
        p.castShadow = p.receiveShadow = true;
        engine.scene.add(p);
        engine.addStaticBox([x, y - 0.25, z], [sx / 2, 0.25, sz / 2]);
        return p;
      };

      B.stairs(engine, { from: [0, 0, -14], to: [9, 4, -5.5], width: 3 });
      plat(9.7, 4, -3.5, 6, 5);
      B.stairs(engine, { from: [11, 4, -2.5], to: [20, 8, 5], width: 2.8 });
      plat(20.5, 8, 6.5, 6, 5);
      B.stairs(engine, { from: [22, 8, 8.5], to: [27.5, 12, 16], width: 2.8 });

      // the gallery — mirror wall + frescoes along the rock face
      plat(27.5, 12, 20, 8, 6);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 9),
        M.std({ map: M.tex.plaster([1, 3]), rough: 0.15, metal: 0.15 }));
      mirror.position.set(31.4, 12.55, 20);
      mirror.castShadow = true;
      engine.scene.add(mirror);
      engine.addStaticBox([31.4, 12.55, 20], [0.18, 0.55, 4.5]);
      for (let i = 0; i < 3; i++)
        B.fresco(engine, { pos: [24.8, 13.6, 15.5 + i * 3.4], yaw: Math.PI / 2 + 0.15, seed: i + 1 });

      // floating-ledge jumps up from the gallery
      plat(27, 13, 26.5, 2.6, 2.4, ruin);
      plat(25.5, 14, 30.8, 2.6, 2.4, ruin);
      plat(23.2, 15, 34.8, 2.6, 2.4, ruin);
      plat(20, 16, 39, 6, 5);
      B.stairs(engine, { from: [18, 16, 41], to: [7, 20, 49.5], width: 2.8 });

      // Lion Gate terrace
      plat(0, 20, 52, 16, 10);
      B.lionPaws(engine, { pos: [0, 49.5], yaw: Math.PI, y: 20 });
      B.stairs(engine, { from: [-2.8, 20, 50], to: [-14.5, 26, 46.5], width: 2.6, mat: ruin });
      plat(-15, 26, 45.5, 5, 4.5);
      B.stairs(engine, { from: [-17, 26, 43.5], to: [-24.5, 31, 36.5], width: 2.6, mat: ruin });
      plat(-24.5, 31, 35, 5, 4.5);
      B.stairs(engine, { from: [-23.5, 31, 32.5], to: [-15.5, 36.2, 28.5], width: 2.6, mat: ruin });

      /* ---- gauntlet triggers ---- */
      level.stage = 'climb';
      level.guards = [];
      const spawnShades = (defs, anchor) => {
        const out = [];
        for (const [type, x, y, z] of defs) {
          const npc = engine.enemies.spawn({
            faction: 'enemy', type, pos: [x, y, z],
            name: 'Guardian Shade', hp: type === 'brute' ? 90 : 45,
            holdPos: type === 'archer',
          });
          ghostify(npc);
          npc.anchor = new THREE.Vector3(anchor[0], anchor[1], anchor[2]);
          npc.anchorR = 7;
          npc.ai.alertTo(engine.player);
          out.push(npc);
          level.guards.push(npc);
        }
        G.audio.warHorn();
        return out;
      };

      engine.addZone({
        pos: [27.5, 20], r: 5, minY: 10,
        when: () => level.stage === 'climb',
        onEnter: () => {
          level.stage = 'gallery';
          engine.missions.complete('gallery');
          engine.missions.reveal('shades1');
          engine.checkpoint({ note: 'The fresco gallery', pos: [27.5, 12, 18], arrows: 8 });
          engine.ui.subtitle(null, 'The painted maidens watch from the stone. Something colder watches with them.', 5);
          level.set1 = spawnShades([['melee', 27, 12, 23], ['melee', 25, 12, 17], ['archer', 30, 12, 22]], [27.5, 12, 20]);
        },
      });
      engine.addZone({
        pos: [0, 52], r: 6, minY: 18,
        when: () => level.stage === 'gallery-done',
        onEnter: () => {
          level.stage = 'terrace';
          engine.missions.complete('lion');
          engine.missions.reveal('shades2');
          engine.checkpoint({ note: 'The Lion Gate', pos: [0, 20, 54], arrows: 10 });
          engine.ui.subtitle(null, 'Between the lion\'s paws, the air itself stands guard.', 5);
          level.set2 = spawnShades([['melee', -4, 20, 52], ['melee', 4, 20, 52], ['brute', 0, 20, 49], ['archer', 6, 20, 55]], [0, 20, 52]);
        },
      });
      engine.addZone({
        pos: [-10, 26], r: 8, minY: 33, // stepping onto the summit
        when: () => level.stage === 'terrace-done',
        onEnter: () => {
          level.stage = 'summit';
          engine.missions.complete('summit');
          engine.missions.reveal('shades3');
          engine.checkpoint({ note: 'The summit', pos: [-14, ROCK_H, 28], arrows: 10 });
          engine.ui.subtitle(null, 'The summit of the sky fortress. The last watch rises to meet you.', 5);
          level.set3 = spawnShades([['melee', -4, ROCK_H, 22], ['melee', 5, ROCK_H, 26], ['archer', 2, ROCK_H, 32], ['archer', -8, ROCK_H, 30]], [0, ROCK_H, 26]);
        },
      });

      engine.events.on('npcDeath', ({ npc }) => {
        if (!level.guards.includes(npc)) return;
        const setOf = (arr) => arr && arr.includes(npc);
        if (setOf(level.set1)) {
          if (engine.missions.bump('shades1')) {
            level.stage = 'gallery-done';
            engine.missions.reveal('lion');
            engine.ui.toast('THE GALLERY IS STILL');
          }
        } else if (setOf(level.set2)) {
          if (engine.missions.bump('shades2')) {
            level.stage = 'terrace-done';
            engine.missions.reveal('summit');
            engine.ui.toast('THE GATE IS OPEN');
          }
        } else if (setOf(level.set3)) {
          if (engine.missions.bump('shades3')) {
            level.stage = 'throne';
            engine.missions.reveal('throne');
            engine.ui.toast('THE WATCH IS ENDED');
          }
        }
      });

      engine.addInteract({
        pos: [0, 24], radius: 2.8, minY: 33, prompt: 'Sit upon the throne of the Sky Fortress',
        when: () => level.stage === 'throne',
        once: true,
        onUse: () => {
          level.stage = 'done';
          G.audio.victory();
          engine.ui.subtitle(null, 'From the throne of Sigiriya the whole island lies below you — tank and temple, field and forest. The legend has its ending.', 8);
          engine.after(6, () => engine.missions.complete('throne'));
        },
      });
    },

    start(engine) {
      engine.ui.titleCard({
        pre: 'A LEGEND APART',
        main: 'SIGIRIYA',
        body: 'Centuries later, a legend endures… This trial stands outside the histories of Dutugemunu — a myth of the Lion Rock, told by firelight, of the warrior who climbed the sky.',
        dur: 7,
      });
      engine.after(7.5, () => {
        engine.ui.subtitle(null, 'Climb. The rock only respects those who do not fall.', 5);
        engine.checkpoint({ note: 'The water gardens' });
      });
    },

    update(engine, dt) {
      const level = this;
      // guardians are bound to their terraces — reel them back if they stray
      for (const gnpc of level.guards) {
        if (!gnpc.alive || !gnpc.anchor) continue;
        const gp = gnpc.group.position;
        const d = Math.hypot(gp.x - gnpc.anchor.x, gp.z - gnpc.anchor.z);
        if (d > gnpc.anchorR) {
          const k = gnpc.anchorR / d;
          gp.x = gnpc.anchor.x + (gp.x - gnpc.anchor.x) * k;
          gp.z = gnpc.anchor.z + (gp.z - gnpc.anchor.z) * k;
        }
        gp.y = gnpc.anchor.y; // shades hover their own terrace height
      }
      // a fall returns the climber to the last checkpoint
      if (engine.player.alive && engine.lastCheckpoint && (engine.lastCheckpoint.pos?.[1] || 0) > 3) {
        if (engine.player.feetPos.y < 1.2 && level.stage !== 'climb' && level.stage !== 'done') {
          engine.ui.toast('THE ROCK REJECTS THE UNWARY');
          engine.restoreCheckpoint({ keepHp: true });
        }
      }
    },
  });
})();
