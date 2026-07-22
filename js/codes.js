/* ============================================================================
   WARRIORS OF TAPROBANE — codes.js
   Secret codes: word-codes the player can enter (Main Menu → Secret Codes, or
   the pause menu) to unlock hidden weapons and abilities. Persisted per browser
   in localStorage so an unlocked secret stays unlocked.

   `G.Cheats` is the live flag bag the engine reads (god mode, swift feet, endless
   ammo, the fire-weapon, the Lion's Fang). `G.Codes` is the registry + the
   enter()/apply() plumbing. Codes are thematic (Sinhala words of the chronicles).
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});

  // live abilities the rest of the engine consults
  G.Cheats = { godMode: false, swift: false, infiniteAmmo: false, musket: false, lionFang: false };

  const STORE = 'rajarata_codes';

  // code (normalised) -> effect. `toggle` effects flip on re-entry; the rest latch on.
  const DEFS = [
    { code: 'GINIAYUDHA', effect: 'musket', toggle: false, name: 'The Fire-Weapon', desc: 'Unlocks the ancient matchlock musket — press 6 to draw it.' },
    { code: 'SINHAYA', effect: 'lion', toggle: false, name: "The Lion's Fang", desc: 'Your blade bites like a lion — greatly increased sword damage.' },
    { code: 'AMARA', effect: 'god', toggle: true, name: 'The Deathless', desc: 'No wound can fell you. Enter again to become mortal once more.' },
    { code: 'WEGAYA', effect: 'swift', toggle: true, name: 'Fleet of Foot', desc: 'Run like the wind. Enter again to slow to a mortal pace.' },
    { code: 'WEDIPUPURA', effect: 'ammo', toggle: true, name: 'Endless Quiver & Powder', desc: 'Arrows, javelins and shot never run dry. Enter again to spend them normally.' },
    { code: 'DASAYODHA', effect: 'all', toggle: false, name: 'The Ten Champions', desc: 'Every chapter and the legend unlocked, Renown to spare, and every blade learned.' },
  ];
  const BY_CODE = {}; for (const d of DEFS) BY_CODE[d.code] = d;
  const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const Codes = {
    DEFS,
    active: new Set(),

    load() {
      try { const raw = JSON.parse(localStorage.getItem(STORE) || '[]'); this.active = new Set(raw); } catch (_) { this.active = new Set(); }
      this._apply();
    },
    _save() { try { localStorage.setItem(STORE, JSON.stringify(Array.from(this.active))); } catch (_) {} },

    /** Enter a code. Returns { ok, toggledOff, def } for the UI to report. */
    enter(str) {
      const def = BY_CODE[norm(str)];
      if (!def) { G.audio && G.audio.ui && G.audio.ui(); return { ok: false }; }
      let toggledOff = false;
      if (def.toggle && this.active.has(def.effect)) { this.active.delete(def.effect); toggledOff = true; }
      else this.active.add(def.effect);
      this._save(); this._apply();
      G.audio && (toggledOff ? G.audio.ui && G.audio.ui() : G.audio.objectiveDone && G.audio.objectiveDone());
      return { ok: true, toggledOff, def };
    },

    has(effect) { return this.active.has(effect); },

    /** Push the active set into G.Cheats and into any running game/save. */
    _apply() {
      const C = G.Cheats;
      C.godMode = this.active.has('god');
      C.swift = this.active.has('swift');
      C.infiniteAmmo = this.active.has('ammo');
      C.musket = this.active.has('musket');
      C.lionFang = this.active.has('lion');

      // one-shot unlocks that write into the save/profile
      if (this.active.has('all') && G.GameState) {
        const gs = G.GameState;
        gs.unlocked = Math.max(gs.unlocked || 1, 99);
        gs.bonusUnlocked = true;
        gs.reputation = Math.max(gs.reputation || 0, 30);
        gs.skills = gs.skills || [];
        for (const id of ['spear', 'axe', 'mace', 'dagger', 'fire_arrows', 'quick_draw']) if (!gs.skills.includes(id)) gs.skills.push(id);
        if (gs.save) try { gs.save(); } catch (_) {}
      }

      // live-apply to a running battle
      const e = G.engine;
      if (e && e.player) {
        e.player.godMode = C.godMode;
        if (C.musket && e.combat && e.combat.musketUnlocked) e.combat.musketUnlocked();
      }
    },
  };

  G.Codes = Codes;
})();
