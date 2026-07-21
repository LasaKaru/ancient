/* ============================================================================
   WARRIORS OF TAPROBANE — levels/kandyanDefiance.js
   CHRONICLES — "Kandyan Defiance" (1670–1766 CE)

   A standalone era campaign launched from the Taprobane map. For a century the
   Dutch East India Company held every harbour of the island, but never the hills
   — the drums of Kandy answered every fort with fire in the night. You lead a
   Kandyan raiding party against a Company stockade in the lowlands: slip the
   sally-port watch in the dark, spike the Company guns, fire the powder magazine,
   free the pressed villagers penned inside, and cut down the Dutch commander
   before the coast can send relief.

   Historicity note: the Kandyan–Dutch wars under Rajasinha II and later Kirti
   Sri Rajasinha were fought as forest ambush and night raid against Company
   forts. This dramatizes one such raid rather than a single mapped action.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const DUTCH = 0xd47818;             // Company orange

  G.Levels.register({
    id: 'kandyanDefiance',
    order: 32,
    standalone: true,
    chapter: 'Chronicles — Kandy',
    title: 'Kandyan Defiance',
    location: 'A Dutch Company stockade in the lowlands, by night, c. 1670 CE',
    sources: 'Accounts of the Kandyan–Dutch wars (Rajasinha II, Kirti Sri Rajasinha): forest ambush and night raids on Company forts.',
    framing:
      'The Company owns the coast and the cinnamon, and thinks a stockade and a ' +
      'few guns make the lowlands theirs. Teach them otherwise in the dark. Slip ' +
      'the sally-port watch, spike their guns, fire the powder store, and turn out ' +
      'the villagers they\'ve penned to peel their bark — then take the commander ' +
      'before the coast wakes. Be gone before the dawn brings their relief.',
    timeLine: 'the dead of a moonlit night',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0, flowers: 0.3, herbs: 0.7 },
    atmosphere: {
      skyTop: 0x141d33, skyHorizon: 0x27324e, fogColor: 0x1c2436, fogScale: 0.8,
      sunDir: new THREE.Vector3(0.3, 0.6, 0.2), sunColor: 0x9fb0d8, sunIntensity: 0.7,
      timeOfDay: 0.92,
    },
    objectives: [
      { id: 'sallyport', text: 'Silence the sally-port watch', count: 3, marker: [0, -14] },
      { id: 'guns', text: 'Spike the Company guns', count: 2, hidden: true, marker: [-12, 6] },
      { id: 'magazine', text: 'Fire the Dutch powder magazine', hidden: true, marker: [12, 10] },
      { id: 'commander', text: 'Cut down the Dutch commander', hidden: true, marker: [0, 28] },
      { id: 'prisoners', text: 'Free the pressed villagers', count: 3, optional: true, marker: [-14, 22] },
    ],
    spawn: { pos: [0, -40], yaw: 0 },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'grass', bounds: 72, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      // ---- the Company stockade ----
      const timber = G.Mats.std({ map: G.Mats.tex.woodDark([6, 2]), rough: 0.9 });
      B.wall(engine, { from: [-30, -14], to: [-5, -14], h: 3.6, thick: 0.9, mat: timber });
      B.wall(engine, { from: [5, -14], to: [30, -14], h: 3.6, thick: 0.9, mat: timber });
      B.wall(engine, { from: [-30, -14], to: [-30, 34], h: 3.6, thick: 0.9, mat: timber });
      B.wall(engine, { from: [30, -14], to: [30, 34], h: 3.6, thick: 0.9, mat: timber });
      B.wall(engine, { from: [-30, 34], to: [30, 34], h: 3.6, thick: 0.9, mat: timber });
      const t1 = B.tower(engine, { pos: [-6, -14], h: 6 });
      const t2 = B.tower(engine, { pos: [6, -14], h: 6 });
      B.banner(engine, { pos: [-4.5, -11], color: DUTCH, terrain: T });
      B.banner(engine, { pos: [4.5, -11], color: DUTCH, terrain: T });
      B.pillarHall(engine, { pos: [0, 28], yaw: 0, w: 10, d: 7 });          // the commander's quarters
      for (const [x, z, r] of [[-20, 2, 2.2], [20, 4, 2.1], [-22, 20, 2.2]]) B.hut(engine, { pos: [x, z], r });
      // lit lanterns/braziers for the night raid — pools of light and shadow
      for (const [x, z] of [[-8, -8], [8, -8], [0, 14], [-14, 24], [14, 24]]) B.brazier(engine, { pos: [x, z], light: true, terrain: T });
      T.addPath([[0, -38], [0, -12]], 3.5);
      T.scatterTrees(96, 64, [{ x: 0, z: 8, r: 30 }]);
      T.scatterGrass(360, 60, [{ x: 0, z: 8, r: 28 }]);

      // ---- the Company guns (spike objective, revealed after the sally-port) ----
      level.guns = [];
      for (const [x, z, yaw] of [[-12, 6, 0.3], [12, 10, -0.3]]) {
        const cannon = B.cannon(engine, { pos: [x, z], yaw });
        const spot = { group: cannon, spiked: false, pos: new THREE.Vector3(x, 1, z), radius: 2.2 };
        level.guns.push(spot);
        engine.addInteract({
          pos: [x, z], radius: 2.6, prompt: 'Spike the gun', once: true,
          when: () => engine.missions.get('sallyport').done && !spot.spiked,
          onUse: () => {
            spot.spiked = true;
            cannon.rotation.z = 0.5; cannon.position.y = -0.15;      // dismounted, ruined
            G.audio.interact(); G.audio.arrowHit('wood');
            const done = engine.missions.bump('guns');
            engine.checkpoint({ note: 'A Company gun is spiked' });
            if (done) { engine.missions.reveal('magazine'); engine.ui.toast('THE GUNS ARE SPIKED — NOW THE POWDER'); }
            else engine.ui.toast('A GUN IS SPIKED');
          },
        });
      }

      // ---- the powder magazine (fire it — the raid's set-piece) ----
      level.magFired = false;
      const mag = new THREE.Group();
      const powder = G.Mats.std({ color: 0x3a2c1e, rough: 0.9 });
      for (let i = 0; i < 6; i++) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.8, 8), powder);
        barrel.position.set(U.rand(-0.9, 0.9), 0.4, U.rand(-0.7, 0.7));
        barrel.castShadow = true; mag.add(barrel);
      }
      const magRoof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 2.2), timber);
      magRoof.position.y = 1.1; mag.add(magRoof);
      mag.position.set(14, 0, 14); engine.scene.add(mag); level.magazine = mag;
      engine.addInteract({
        pos: [14, 14], radius: 3.0, prompt: 'Fire the powder magazine', once: true,
        when: () => engine.missions.get('guns').done && !level.magFired,
        onUse: () => {
          level.magFired = true;
          mag.children.forEach((c) => { c.material = G.Mats.std({ color: 0x120a06, rough: 1 }); c.position.y = 0.15; c.rotation.set(U.rand(-1, 1), 0, U.rand(-1, 1)); });
          G.audio.enemyDie(); G.audio.warHorn();
          engine.missions.complete('magazine');
          engine.setCombatIntensity(0.9);
          engine.checkpoint({ note: 'The magazine is ablaze' });
          engine.ui.banner('THE POWDER GOES UP', 'The fort is burning — find the commander and be gone.');
          engine.ui.subtitle(null, 'The magazine goes up in a gout of flame that lights the whole fort. No hiding now — take the commander and run for the trees.', 7);
        },
      });

      // ---- garrison: Dutch gunners on the wall + the commander ----
      level.watch = [];
      for (const [type, x, z] of [['melee', -5, -18], ['melee', 5, -18], ['gunner', 0, -20]]) {
        level.watch.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: Math.PI, palette: 'portuguese', tintCloth: DUTCH, guardRadius: 16 }));
      }
      for (const [tw, x, z] of [[t1, -6, -14], [t2, 6, -14]]) {
        const a = engine.enemies.spawn({ faction: 'enemy', type: 'gunner', pos: [x, z], holdPos: true, palette: 'portuguese', tintCloth: DUTCH });
        a.group.position.y = tw.deckY; a.baseY = tw.deckY;
      }
      for (const [type, x, z] of [['gunner', -10, 4], ['gunner', 10, 8], ['melee', -6, 12], ['melee', 6, 12], ['gunner', 0, 18]]) {
        engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], palette: 'portuguese', tintCloth: DUTCH, guardRadius: 20 });
      }
      level.commander = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, 28], yaw: Math.PI,
        name: 'The Company Commandeur', showName: true, hp: 210, plume: true, cape: true, palette: 'portuguese', tintCloth: DUTCH,
      });

      // ---- the pressed villagers (optional rescue) ----
      level.captives = [];
      const penSpots = [[-14, 22], [-11, 26], [-16, 25]];
      penSpots.forEach(([x, z]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.0, 6), G.Mats.library().woodDark);
        post.position.set(x, 1, z); post.castShadow = true; engine.scene.add(post);
        const cap = engine.enemies.spawn({ faction: 'ally', type: 'civilian', pos: [x + U.rand(-0.5, 0.5), z + U.rand(0.4, 1.0)], yaw: U.rand(0, 6), posture: 'captive', hp: 40, palette: 'civilian' });
        cap.captive = true; level.captives.push(cap);
      });
      engine.addInteract({
        pos: [-13, 24], radius: 4.0, prompt: 'Turn out the pressed villagers', once: true,
        onUse: () => {
          for (const c of level.captives) if (c.alive) { c.captive = false; c.clearPosture && c.clearPosture(); (level.fleeing = level.fleeing || []).push(c); }
          G.audio.interact();
          engine.ui.toast('THE VILLAGERS RUN FOR THE TREES');
        },
      });

      // ---- flow ----
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.watch.includes(npc)) {
          const done = engine.missions.bump('sallyport');
          if (done) {
            engine.missions.reveal('guns');
            engine.missions.reveal('commander');
            engine.checkpoint({ note: 'The sally-port is ours', arrows: 8 });
            engine.setCombatIntensity(0.6);
            engine.ui.subtitle(null, 'The watch is down and the port is open. Inside — spike the guns, fire the powder, and find the commander. Quietly, while you can.', 8);
          }
        }
        if (npc === level.commander) {
          engine.missions.complete('commander');
          engine.ui.subtitle(null, 'The Commandeur is dead and his fort is burning behind you. Let the Company keep its harbours — the hills answer to Kandy.', 7);
        }
      });
    },

    start(engine) {
      engine.ui.titleCard({ pre: 'CHRONICLES · c.1670 CE', main: 'KANDYAN DEFIANCE', body: 'A Company fort in the dark. Spike the guns, fire the powder, and be gone by dawn.', dur: 6 });
      engine.after(6.2, () => {
        engine.ui.subtitle(null, 'The stockade sleeps but for its watch, lantern-light pooling on the palisade. Silence the sally-port guard and slip inside.', 7);
        engine.checkpoint({ note: 'The tree-line' });
        engine.setCombatIntensity(0.35);
      });
    },

    update(engine, dt) {
      const level = this;
      // freed villagers flee for the tree-line
      if (level.fleeing) {
        const trees = new THREE.Vector3(0, 0, -40);
        for (const c of level.fleeing) {
          if (!c.alive || c.saved) continue;
          c.setMove(trees, dt, 3.8);
          if (U.flatDist(c.pos, trees) < 6) { c.saved = true; c.setMove(null, dt); engine.stats.saved++; engine.missions.bump('prisoners'); }
        }
      }
    },
  });
})();
