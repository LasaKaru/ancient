/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — levels/warOfAges.js
   LEGENDS OF THE KING — "The War of Ages" (roadmap v1.0, mythic mode)

   The user-requested fantasy, shipped with an explicit frame: in the bards'
   fireside telling, the great king Dutugemunu strides across the centuries
   and faces every enemy the island ever knew — the Cholas he truly fought,
   and the Pandyas, the mountain men of Kandy, the Portuguese and the British
   who came long after his death. This is a LEGEND, deliberately set apart
   from the historical campaign and its calendar (the same device as the
   Sigiriya bonus chapter). It is never presented as history.

   Mechanically: pick a foe from any age (js/ui/legendsMenu.jsx sets
   G.Legend), then hold a sacred arena through escalating waves, with
   Dutugemunu and three of the Ten Giants fighting at your side. The chosen
   faction decides the enemy palette, banners and troop mix — including the
   gunpowder-era `gunner` type for the Portuguese and British.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  /* Every foe the legend can summon. `mix` is the troop pool a wave draws
     from; later waves lean on the back of the list (brutes/elites/gunners). */
  const FACTIONS = {
    chola: {
      id: 'chola', name: 'the Chola Empire', banner: 0x2e3a5e, palette: 'enemy', tint: null,
      when: 'the war he truly fought — but here, without end',
      mix: ['melee', 'melee', 'archer', 'brute', 'elite'],
    },
    pandya: {
      id: 'pandya', name: 'the Pandyan hosts', banner: 0xd9b06a, palette: 'enemy', tint: 0xd9b06a,
      when: 'a thousand years after his death',
      mix: ['melee', 'archer', 'melee', 'brute', 'elite'],
    },
    kandyan: {
      id: 'kandyan', name: 'the mountain men of Kandy', banner: 0x4a8c5a, palette: 'enemy', tint: 0x3d5a2a,
      when: 'seventeen centuries hence, in the high hills',
      mix: ['melee', 'archer', 'melee', 'elite', 'brute'],
    },
    portuguese: {
      id: 'portuguese', name: 'the Portuguese', banner: 0x7a1f1f, palette: 'portuguese', tint: null,
      when: 'seventeen centuries hence, with fire in their hands',
      mix: ['melee', 'gunner', 'melee', 'gunner', 'elite'],
    },
    british: {
      id: 'british', name: 'the British', banner: 0xa8241f, palette: 'british', tint: null,
      when: 'nineteen centuries hence, in red coats',
      mix: ['gunner', 'melee', 'gunner', 'melee', 'elite'],
    },
  };
  G.LEGEND_FACTIONS = FACTIONS;

  /* the faction chosen on the Legends menu (defaults to the Cholas).
     `seed` (v1.1) makes the wave composition reproducible so a shared
     Challenge Code reproduces the exact same fight. */
  G.Legend = G.Legend || { faction: 'chola', waves: 5 };
  const cfg = () => FACTIONS[(G.Legend && G.Legend.faction) || 'chola'] || FACTIONS.chola;
  const waveCount = () => (G.Legend && G.Legend.waves) || 5;

  const ARENA_R = 34;
  const GATES = [[0, -ARENA_R + 4], [-ARENA_R + 6, 8], [ARENA_R - 6, 8], [0, ARENA_R - 4]];

  G.Levels.register({
    id: 'warOfAges',
    order: 30,
    standalone: true,
    legend: true,            // like the Sigiriya bonus: framed as legend, not history
    chapter: 'Legends of the King',
    get title() { return 'The War of Ages'; },
    get location() { return 'A sacred arena outside time · against ' + cfg().name; },
    get framing() {
      return 'In the bards\' fireside telling, the great king Dutugemunu does not ' +
        'sleep beneath his stupas. He strides across the centuries, and every enemy ' +
        'the island ever knew rises to meet him. Tonight the tale sets him against ' +
        cfg().name + ' — ' + cfg().when + '. This is a legend, not a chronicle; ' +
        'stand with the king and see how long the song can last.';
    },
    timeLine: 'a tale told outside the histories',
    ambience: 'battlefield',
    music: 'duel',
    nature: { animals: 0, flowers: 0.5, herbs: 1 },
    atmosphere: {
      skyTop: 0x2a2a4a, skyHorizon: 0xc86a3a, fogColor: 0x8a6a5a, fogScale: 1.2,
      sunDir: new THREE.Vector3(0.5, 0.35, -0.3), sunColor: 0xffb070, sunIntensity: 2.2,
      hemiSky: 0x7a6aa0, hemiGround: 0x4a3a2c, hemiIntensity: 0.5,
    },
    get objectives() {
      return [
        { id: 'waves', text: 'Hold the arena against ' + cfg().name, count: waveCount(), marker: [0, 0] },
        { id: 'survive', text: 'Keep King Dutugemunu alive', marker: [0, 6] },
      ];
    },
    spawn: { pos: [0, -14], yaw: Math.PI },

    build(engine) {
      const T = engine.terrain = new G.Terrain(engine, { groundTex: 'sand', bounds: ARENA_R + 6, boundary: 'cliff' });
      const B = G.Build;
      const level = this;
      level.cfg = cfg();
      level.totalWaves = waveCount();
      // seeded RNG for wave composition so a Challenge Code = the same fight
      level.seed = (G.Legend && G.Legend.seed) || (G.Challenge ? G.Challenge.newSeed() : 1);
      if (G.Legend) G.Legend.seed = level.seed;
      level.rng = U.mulberry(level.seed);
      level.code = G.Challenge ? G.Challenge.encode({ faction: level.cfg.id, waves: level.totalWaves, seed: level.seed }) : '';
      level.score = 0;

      // the sacred centre: a whitewashed stupa the king defends across time
      B.stupa(engine, { pos: [0, 10], radius: 6, whitewashed: true });
      B.moonstone(engine, { pos: [0, 3.4], yaw: Math.PI, r: 1.6 });
      B.guardStones(engine, { pos: [0, 5], yaw: Math.PI });
      T.addPath([[0, -16], [0, 2]], 4);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        B.brazier(engine, { pos: [Math.sin(a) * 14, 10 + Math.cos(a) * 14], light: true, terrain: T });
      }
      // the king's own banners ring the arena; the foe's banners mark the gates
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        B.banner(engine, { pos: [Math.sin(a) * (ARENA_R - 3), Math.cos(a) * (ARENA_R - 3)], color: 0xc8a12e, terrain: T });
      }
      for (const [x, z] of GATES) B.banner(engine, { pos: [x, z], color: level.cfg.banner, terrain: T });

      T.scatterTrees(50, ARENA_R + 4, [{ x: 0, z: 10, r: 14 }, { x: 0, z: 0, r: 12 }]);
      T.scatterGrass(300, ARENA_R, [{ x: 0, z: 10, r: 12 }]);
      T.scatterRocks(20, ARENA_R, [{ x: 0, z: 10, r: 12 }]);

      // arrow resupply between waves
      B.crate(engine, { pos: [3, -8], s: 1.1 });
      engine.addInteract({
        pos: [3, -8], radius: 2.2, prompt: 'Take arrows from the supply crate',
        when: () => engine.combat.arrows < engine.combat.quiverMax,
        onUse: () => { engine.combat.addArrows(12); G.audio.interact(); engine.ui.toast('QUIVER REFILLED'); },
      });

      // ---- the king and his champions fight at your side ----
      level.king = new G.KingDutugemunu(engine, { pos: [-2, 8], yaw: Math.PI });
      level.king.npc.followPlayer = false;
      level.king.npc.hp = level.king.npc.maxHp = 600;
      // the king is a legend himself — give him a real brain so he fights
      level.king.npc.ai = new G.SoldierAI(engine, level.king.npc, { type: 'elite', guardRadius: 16 });
      level.king.npc.rig.posture = 'combat';
      level.giants = G.spawnGiants(engine, { center: [0, 2], count: 3, names: ['Nandhimitra', 'Suranimala', 'Mahasona'], followPlayer: false });
      for (const g of level.giants) { g.ai.guardRadius = 20; g.hp = g.maxHp = 220; }

      // ---- wave machinery ----
      level.wave = 0;
      level.state = 'intro';
      level.timer = 4;
      level.raiders = [];

      engine.events.on('npcDeath', ({ npc }) => {
        if (npc === level.king.npc) {
          engine.failMission('The king has fallen — and with him, the song. Even legends can end.');
          return;
        }
      });
    },

    _spawnWave(engine) {
      const level = this, c = level.cfg, rng = level.rng;
      level.wave++;
      level.raiders = [];
      // wave size and toughness climb with the wave number. Everything random
      // here is drawn from the SEEDED rng, so a Challenge Code reproduces the
      // exact same wave sizes, troop types and spawn gates for every player.
      const n = 4 + level.wave * 2;
      const poolDepth = Math.min(c.mix.length, 2 + level.wave);   // later waves reach the elites/gunners
      for (let i = 0; i < n; i++) {
        const gate = GATES[i % GATES.length];
        const type = c.mix[Math.min(c.mix.length - 1, Math.floor(rng() * poolDepth))];
        const sx = gate[0] + (rng() - 0.5) * 6, sz = gate[1] + (rng() - 0.5) * 4;
        const npc = engine.enemies.spawn({
          faction: 'enemy', type,
          pos: [sx, sz],
          palette: c.palette, tintCloth: c.tint,
        });
        npc._spawnPos = [+sx.toFixed(2), +sz.toFixed(2)];   // stable record (AI moves the live pos)
        // everyone converges on the king and the player both
        npc.ai.alertTo(rng() < 0.5 ? engine.player : level.king.npc);
        level.raiders.push(npc);
      }
      G.audio.warHorn();
      engine.ui.banner('WAVE ' + level.wave + ' / ' + level.totalWaves, 'The age of ' + c.name + ' comes on');
      engine.setCombatIntensity(0.85);
    },

    /* final score, leaderboard entry, and the shareable code — merged into
       the mission-summary payload by the engine (v1.1) */
    summaryExtra(engine, t) {
      const level = this;
      const cleared = level.wave >= level.totalWaves ? level.totalWaves : Math.max(0, level.wave - 1);
      const timeBonus = Math.max(0, 1200 - Math.round(t));
      const score = level.score + engine.stats.kills * 10 + timeBonus;
      let rank = 0, isBest = false;
      if (!level._recorded && cleared > 0 && G.Leaderboard) {
        level._recorded = true;
        const res = G.Leaderboard.record(level.cfg.id, {
          name: G.GameState.profile.name, score,
          waves: level.totalWaves, cleared, seed: level.seed, code: level.code,
        });
        rank = res.rank; isBest = res.isBest;
      }
      return {
        arena: true,
        faction: level.cfg.id,
        factionName: level.cfg.name,
        score, cleared, totalWaves: level.totalWaves,
        code: level.code, seed: level.seed,
        rank, isBest,
        best: G.Leaderboard ? G.Leaderboard.best(level.cfg.id) : score,
      };
    },

    start(engine) {
      engine.ui.titleCard({
        pre: 'LEGENDS OF THE KING',
        main: 'THE WAR OF AGES',
        body: 'In the bards\' fireside telling, the great king strides across the centuries. This is a legend — not a chronicle. Stand with Dutugemunu against ' + cfg().name + ', and see how long the song can last.',
        dur: 7,
      });
      engine.after(7.2, () => {
        engine.ui.subtitle('King Dutugemunu', 'Let them come from whatever age they please. While one of us still stands, the island stands. To me!', 6);
        engine.checkpoint({ note: 'The arena, before the first age' });
      });
    },

    update(engine, dt) {
      const level = this;
      level.king.update(dt);

      if (level.state === 'intro') {
        level.timer -= dt;
        if (level.timer <= 0) { level.state = 'wave'; this._spawnWave(engine); }
        return;
      }
      if (level.state === 'wave') {
        const alive = level.raiders.filter((n) => n.alive).length;
        if (alive === 0) {
          engine.missions.bump('waves');
          // score: cleared waves × the wave's own weight (later waves worth
          // more) + a completion crown. Kills & time fold in at finish.
          level.score += 500 + level.wave * 250;
          if (level.wave >= level.totalWaves) {
            level.state = 'done';
            level.score += 3000;   // held every age — the crown of the run
            engine.missions.complete('survive');
            engine.setCombatIntensity(0);
            G.audio.victory(); G.audio.bell();
            for (const g of level.giants) if (g.alive) g.rig.playCheer();
            level.king.npc.rig.playCheer();
            engine.ui.subtitle('King Dutugemunu', 'Every age, and still we stand. Let the bards make of it what they will — the island endures. It always has.', 8);
          } else {
            level.state = 'respite';
            level.timer = 9;
            engine.setCombatIntensity(0.2);
            engine.checkpoint({ note: 'Age ' + level.wave + ' repelled', arrows: 10 });
            engine.ui.subtitle(null, 'The age falls back. Catch your breath, fill your quiver — another century is already marching.', 5);
          }
        }
        return;
      }
      if (level.state === 'respite') {
        level.timer -= dt;
        if (level.timer <= 0) { level.state = 'wave'; this._spawnWave(engine); }
      }
    },
  });
})();
