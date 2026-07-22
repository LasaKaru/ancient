/* ============================================================================
   WARRIORS OF TAPROBANE — levels/cholaConquest.js
   CHRONICLES — "The Fall of Anuradhapura" (992–1017 CE)

   A standalone era campaign launched from the Taprobane map. Rajaraja I and then
   Rajendra I of the Chola Empire broke the thousand-year kingdom of the north:
   Anuradhapura was sacked and abandoned, Polonnaruwa made a Chola provincial
   capital, and Rajarata lay under the tiger banner for two generations. History
   is plain — the city falls. This mission does not pretend otherwise. You are of
   the last guard of the sacred city: hold the great stupa's precinct while the
   regalia of the kingdom is borne south, see the people away down the Ruhuna
   road, and make the Chola general pay for the ground — so that the crown, at
   least, survives in the south to rise again one day as Vijayabahu.

   Historicity note: the Culavamsa records the Chola conquest under Rajaraja I /
   Rajendra I and the flight of the royal line to Ruhuna. This dramatizes the
   fall of Anuradhapura and the saving of the regalia.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const CHOLA = 0x7a2222;
  const SOUTH = new THREE.Vector3(0, 0, -40);   // the Ruhuna road, out to the south

  G.Levels.register({
    id: 'cholaConquest',
    order: 34,
    standalone: true,
    chapter: 'Chronicles — Anuradhapura',
    title: 'The Fall of Anuradhapura',
    location: 'The sacred precinct of Anuradhapura, the night it fell — c. 993 CE',
    sources: 'Culavamsa (the Chola conquest under Rajaraja I / Rajendra I, and the flight of the royal line to Ruhuna).',
    framing:
      'The thousand-year city dies tonight, and every soul here knows it. The ' +
      'tiger is over the north wall and there is no throwing him back. But the ' +
      'crown need not die with the walls: hold the great stupa while the regalia ' +
      'goes south, get the people down the Ruhuna road, and make their general ' +
      'buy every stone. What lives to reach the south will one day come back north ' +
      'behind a lion.',
    timeLine: 'the last night of the old kingdom',
    ambience: 'battlefield',
    music: 'combat',
    nature: { animals: 0, flowers: 0.2, herbs: 0.7 },
    atmosphere: {
      skyTop: 0x342a4a, skyHorizon: 0xb85a34, fogColor: 0x8a5236, fogScale: 0.9,
      sunDir: new THREE.Vector3(0.5, 0.28, -0.2), sunColor: 0xff9a58, sunIntensity: 1.9,
      timeOfDay: 0.9, weather: 'dust',
    },
    objectives: [
      { id: 'regalia', text: 'Bear the regalia of the kingdom south to the Ruhuna road', marker: [0, -34] },
      { id: 'precinct', text: 'Hold the sacred precinct against the Chola vanguard', count: 6, marker: [0, 6] },
      { id: 'people', text: 'See the people away down the Ruhuna road', count: 3, hidden: true, marker: [0, -30] },
      { id: 'general', text: 'Make the Chola general pay for the ground', hidden: true, marker: [0, 28] },
      { id: 'monks', text: 'Send the temple monks south', count: 3, optional: true, marker: [14, 8] },
    ],
    spawn: { pos: [0, -4], yaw: 0 },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'dirt', bounds: 74, boundary: 'hills' });
      const B = G.Build;
      const level = this;

      // ---- the sacred precinct: the great stupa, court, and the north gate ----
      level.stupa = B.stupa(engine, { pos: [0, 14], radius: 10, whitewashed: true });
      B.moonstone(engine, { pos: [0, 3.4], yaw: Math.PI });
      B.guardStones(engine, { pos: [0, 4.6], yaw: Math.PI });
      B.bodhigara(engine, { pos: [-22, 8], size: 6 });
      for (const [x, z] of [[-6, 6], [6, 6], [0, -2]]) B.brazier(engine, { pos: [x, z], light: true, terrain: T });
      // the north wall the tiger is already over
      B.wall(engine, { from: [-44, 24], to: [-6, 24], h: 4.2 });
      B.wall(engine, { from: [6, 24], to: [44, 24], h: 4.2 });
      B.gatehouse(engine, { pos: [0, 24], yaw: 0, hp: 400 });
      for (const [x, z, r] of [[-20, 0, 2.2], [20, 2, 2.1], [16, 8, 2.0]]) B.hut(engine, { pos: [x, z], r });
      // the Ruhuna road south, out of the city
      T.addPath([[0, 8], [0, -38]], 4.5);
      B.banner(engine, { pos: [-3, -30], color: 0xc8a12e, terrain: T });
      B.banner(engine, { pos: [3, -30], color: 0xc8a12e, terrain: T });
      T.scatterTrees(46, 66, [{ x: 0, z: 10, r: 30 }, { x: 0, z: -34, r: 14 }]);
      T.scatterRocks(22, 64, [{ x: 0, z: 10, r: 28 }]);

      // arrow resupply on the road
      engine.addInteract({
        pos: [0, -30], radius: 3.4, prompt: 'Take arrows from the road store',
        when: () => engine.combat.arrows < engine.combat.quiverMax,
        onUse: () => { engine.combat.addArrows(12); G.audio.interact(); engine.ui.toast('QUIVER REFILLED'); },
      });

      // ---- the last guard fights beside you ----
      for (const [x, z] of [[-7, 2], [7, 2], [0, 8]]) engine.enemies.spawn({ faction: 'ally', type: 'melee', pos: [x, z], hp: 95, guardRadius: 26 });

      // ---- the regalia of the kingdom (carry south) ----
      level.carrying = false; level.regaliaSafe = false;
      const casket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), G.Mats.std({ color: 0xe8b94a, rough: 0.3, metal: 0.9 }));
      casket.position.set(0, 0.9, 2); casket.castShadow = true;
      engine.scene.add(casket); level.casket = casket;
      engine.addInteract({
        pos: [0, 2], radius: 2.4, prompt: 'Take up the regalia of the kingdom', once: true,
        when: () => !level.carrying && !level.regaliaSafe,
        onUse: () => {
          level.carrying = true; casket.visible = false; G.audio.interact();
          engine.ui.subtitle(null, 'The crown of a thousand years is in your hands. Get it down the road — the south must have a king to come back to.', 6);
        },
      });
      engine.addZone({
        pos: [0, -34], r: 5,
        when: () => level.carrying && !engine.missions.get('regalia').done,
        onEnter: () => {
          level.carrying = false; level.regaliaSafe = true;
          casket.position.set(1.4, 0.9, -34); casket.visible = true;
          engine.missions.complete('regalia');
          engine.checkpoint({ note: 'The regalia is away to the south' });
          engine.ui.subtitle(null, 'The regalia is on the south road and moving. Now buy the people the time to follow it.', 6);
        },
      });

      // ---- the temple monks (optional) ----
      level.monks = [];
      for (const [x, z] of [[14, 8], [16, 11], [12, 5]]) {
        const s = engine.enemies.spawn({ faction: 'ally', type: 'civilian', pos: [x, z], palette: 'civilian', hp: 40 });
        s.captive = true; s.monk = true; level.monks.push(s);
      }
      engine.addInteract({
        pos: [14, 8], radius: 4.0, prompt: 'Send the temple monks south', once: true,
        onUse: () => {
          for (const s of level.monks) if (s.alive) { s.captive = false; s.clearPosture && s.clearPosture(); (level.fleeing = level.fleeing || []).push(s); }
          G.audio.interact(); engine.ui.toast('THE MONKS TAKE THE SOUTH ROAD');
        },
      });

      // ---- the people of the city (flee south once the precinct holds) ----
      level.people = [];
      for (const [x, z] of [[-10, -6], [10, -6], [-6, -10], [6, -10], [0, -12]]) {
        const p = engine.enemies.spawn({ faction: 'ally', type: 'civilian', pos: [x, z], palette: 'civilian', hp: 40 });
        p.captive = true; level.people.push(p);
      }
      engine.addInteract({
        pos: [0, -10], radius: 5.0, prompt: 'Send the people down the Ruhuna road', once: true,
        when: () => engine.missions.get('precinct').done,
        onUse: () => {
          for (const p of level.people) if (p.alive) { p.captive = false; p.clearPosture && p.clearPosture(); (level.fleeing = level.fleeing || []).push(p); }
          G.audio.interact(); engine.ui.toast('THE PEOPLE TAKE THE SOUTH ROAD');
        },
      });

      // ---- the Chola vanguard storming the precinct + the general beyond the gate ----
      level.vanguard = [];
      for (const [type, x, z] of [['melee', -6, 18], ['melee', 6, 18], ['brute', 0, 20], ['melee', -10, 16], ['archer', -14, 22], ['archer', 14, 22]]) {
        level.vanguard.push(engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], yaw: Math.PI, tintCloth: CHOLA, guardRadius: 30 }));
        const npc = level.vanguard[level.vanguard.length - 1];
        if (engine.player && npc.ai) npc.ai.alertTo(engine.player);
      }
      // the general + his guard, held beyond the north gate until the precinct holds
      for (const [type, x, z] of [['melee', -8, 34], ['melee', 8, 34], ['archer', 0, 38]]) {
        engine.enemies.spawn({ faction: 'enemy', type, pos: [x, z], tintCloth: CHOLA, guardRadius: 16 });
      }
      level.general = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos: [0, 36], yaw: Math.PI,
        name: 'Senapati of the Chola Host', showName: true, hp: 240, plume: true, cape: true, tintCloth: CHOLA,
      });

      // ---- flow ----
      engine.events.on('npcDeath', ({ npc }) => {
        if (npc.faction !== 'enemy') return;
        if (level.vanguard.includes(npc)) {
          const done = engine.missions.bump('precinct');
          if (done) {
            engine.missions.reveal('people');
            engine.missions.reveal('general');
            engine.checkpoint({ note: 'The precinct holds — for now', arrows: 8 });
            engine.setCombatIntensity(0.8);
            engine.ui.subtitle(null, 'The vanguard is broken on the precinct stones. Get the people onto the road — then cut down their general before the next wave forms.', 9);
          }
        }
        if (npc === level.general) {
          engine.missions.complete('general');
          engine.ui.subtitle(null, 'Their general lies in the precinct he came to take. Anuradhapura is lost tonight — but the crown rides south, and the north will not be Chola forever.', 9);
        }
      });
    },

    start(engine) {
      engine.ui.titleCard({ pre: 'CHRONICLES · c.993 CE', main: 'THE FALL OF ANURADHAPURA', body: 'The thousand-year city dies tonight. Save the crown, the people, and the memory.', dur: 6.5 });
      engine.after(6.7, () => {
        engine.ui.subtitle(null, 'The tiger is over the north wall and the sky is red with the city\'s burning. Take up the regalia — the south must have a crown to fight for.', 8);
        engine.checkpoint({ note: 'The sacred precinct' });
        engine.setCombatIntensity(0.55);
      });
    },

    update(engine, dt) {
      const level = this;
      // monks and people stream south down the Ruhuna road
      if (level.fleeing) {
        for (const p of level.fleeing) {
          if (!p.alive || p.saved) continue;
          p.setMove(SOUTH, dt, 3.7);
          if (U.flatDist(p.pos, SOUTH) < 6) {
            p.saved = true; p.setMove(null, dt); engine.stats.saved++;
            engine.missions.bump(p.monk ? 'monks' : 'people');
          }
        }
      }
    },
  });
})();
