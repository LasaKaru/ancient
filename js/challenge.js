/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — challenge.js  (roadmap v1.1 "Brothers-in-Arms",
   Phase M1: asynchronous multiplayer — no server, no build step)

   The honest, offline-first slice of multiplayer:
     · G.Challenge — encode/decode a short, human-typable code that pins down
       a War of Ages fight exactly (faction · tale length · seed). Share the
       code and a friend faces the *same* challenge; the seed makes the wave
       composition and spawn gates reproduce, so the only variable is skill.
     · G.Leaderboard — a per-faction, localStorage-backed high-score table.
       Beat a friend's shared score on their code, or chase your own bests.

   A later Phase (M2+, see ROADMAP.md) layers WebRTC co-op on top of this;
   this file is deliberately dependency-free so it works from file://.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});

  const FACTION_ORDER = ['chola', 'pandya', 'kandyan', 'portuguese', 'british'];

  /* base36 helpers with a tiny checksum so a mistyped code is rejected,
     not silently loaded as a different (garbage) fight */
  function b36(n) { return Math.max(0, Math.floor(n)).toString(36); }
  function checksum(body) {
    let s = 0;
    for (let i = 0; i < body.length; i++) s = (s + body.charCodeAt(i) * (i + 1)) % 36;
    return s.toString(36);
  }

  G.Challenge = {
    FACTION_ORDER,

    /** {faction, waves, seed} → "RAJ-<f><w>.<seed>-<chk>" (upper-cased) */
    encode({ faction = 'chola', waves = 5, seed } = {}) {
      const fi = Math.max(0, FACTION_ORDER.indexOf(faction));
      if (seed === undefined || seed === null) seed = this.newSeed();
      const body = `${b36(fi)}${b36(waves)}.${b36(seed)}`;
      return `RAJ-${body}-${checksum(body)}`.toUpperCase();
    },

    /** parse a code back to {faction, waves, seed} or null if malformed */
    decode(code) {
      if (!code) return null;
      const cleaned = String(code).trim().toUpperCase().replace(/\s+/g, '');
      const m = cleaned.match(/^RAJ-([0-9A-Z]+)\.([0-9A-Z]+)-([0-9A-Z])$/);
      if (!m) return null;
      const head = m[1], seedStr = m[2], chk = m[3];
      const body = `${head}.${seedStr}`.toLowerCase();
      if (checksum(body) !== chk.toLowerCase()) return null;   // typo guard
      if (head.length < 2) return null;
      const fi = parseInt(head[0], 36);
      const waves = parseInt(head.slice(1), 36);
      const seed = parseInt(seedStr, 36);
      if (isNaN(fi) || isNaN(waves) || isNaN(seed)) return null;
      const faction = FACTION_ORDER[fi] || 'chola';
      if (waves < 1 || waves > 40) return null;
      return { faction, waves, seed };
    },

    newSeed() { return 1 + Math.floor(Math.random() * 0x7fffff); },

    /** a shared "daily" seed so everyone can chase the same fight each day */
    dailySeed() {
      const d = new Date();
      return (d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()) % 0x7fffff;
    },
  };

  /* ------------------------------ leaderboard ------------------------------ */
  const LB_KEY = 'rajarata_arena_scores';
  const MAX_PER_FACTION = 10;

  G.Leaderboard = {
    _all() {
      try { return JSON.parse(localStorage.getItem(LB_KEY)) || {}; }
      catch (_) { return {}; }
    },
    _save(all) {
      try { localStorage.setItem(LB_KEY, JSON.stringify(all)); } catch (_) {}
    },

    /** top scores for a faction, high → low */
    top(faction) {
      const list = this._all()[faction] || [];
      return list.slice().sort((a, b) => b.score - a.score).slice(0, MAX_PER_FACTION);
    },

    best(faction) {
      const t = this.top(faction);
      return t.length ? t[0].score : 0;
    },

    /** record a run; returns { rank, isBest } (rank 1-based, 0 if off-board) */
    record(faction, entry) {
      const all = this._all();
      const list = (all[faction] || []).slice();
      const prevBest = list.length ? Math.max(...list.map((e) => e.score)) : 0;
      const row = {
        name: entry.name || 'Warrior',
        score: entry.score | 0,
        waves: entry.waves | 0,
        cleared: entry.cleared | 0,
        seed: entry.seed | 0,
        code: entry.code || '',
        date: Date.now(),
      };
      list.push(row);
      list.sort((a, b) => b.score - a.score);
      const trimmed = list.slice(0, MAX_PER_FACTION);
      all[faction] = trimmed;
      this._save(all);
      const idx = trimmed.indexOf(row);              // -1 if it fell off the board
      return { rank: idx >= 0 ? idx + 1 : 0, isBest: row.score > prevBest };
    },

    clear(faction) {
      const all = this._all();
      if (faction) delete all[faction]; else Object.keys(all).forEach((k) => delete all[k]);
      this._save(all);
    },
  };
})();
