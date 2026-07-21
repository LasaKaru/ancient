/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — ui/skillsMenu.jsx  (added in v0.2 "Armoury")
   The Renown skill tree: three disciplines, three tiers each. Renown earned
   from missions and saved civilians is spent here; every skill learned also
   hardens the body (+5 max vitality). Opens from the pause menu, the mission
   summary, or the K key in the field.
   (JSX-free React.createElement — no build step; see hud.jsx note.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const React = window.__MODULES__.React;
  const h = React.createElement;

  /* ----------------------------- logic ----------------------------- */
  const DEFS = [
    { id: 'spear', branch: 'Warrior', tier: 1, name: 'War Spear', icon: '🔱', desc: 'Unlock the long spear (slot 2): reach, wide sweeps, +20% vs. brutes.' },
    { id: 'iron_guard', branch: 'Warrior', tier: 2, name: 'Iron Guard', icon: '🛡️', desc: 'Blocking costs far less stamina; the perfect-parry window grows by half.' },
    { id: 'axe', branch: 'Warrior', tier: 3, name: 'Battle Axe', icon: '🪓', desc: 'Unlock the battle axe (slot 3): slow, brutal, staggers men and splits gates.' },
    { id: 'quick_draw', branch: 'Hunter', tier: 1, name: 'Quick Draw', icon: '🏹', desc: 'The bow draws 30% faster.' },
    { id: 'dagger', branch: 'Hunter', tier: 2, name: "Hunter's Knife", icon: '🗡️', desc: 'Unlock the knife (slot 5): quick, quiet, and three-fold from behind.' },
    { id: 'fire_arrows', branch: 'Hunter', tier: 3, name: 'Fire Arrows', icon: '🔥', desc: 'Arrows fly wreathed in flame: +35% damage, twice as cruel to wood.' },
    { id: 'rally', branch: 'Commander', tier: 1, name: 'Rally Cry', icon: '📯', desc: 'Press T on the field: allies fight half again as hard for 12s (45s rest).' },
    { id: 'mace', branch: 'Commander', tier: 2, name: 'War Mace', icon: '🔨', desc: 'Unlock the mace (slot 4): +50% against armoured brutes and champions.' },
    { id: 'herbalist', branch: 'Commander', tier: 3, name: 'Herbalist', icon: '🌿', desc: 'The herb pouch holds 5, and each handful heals far more.' },
  ];

  G.Skills = {
    DEFS,
    owned(id) { return (G.GameState.skills || []).includes(id); },
    ownedCount() { return (G.GameState.skills || []).length; },
    points() { return Math.max(0, Math.floor(G.GameState.reputation) - this.ownedCount()); },
    /* battle-hardened body: mastering the whole tree grows vitality 100 → 150 */
    bonusHp() { return Math.round(50 * this.ownedCount() / DEFS.length); },
    /* respec between missions: unlearn every discipline, freeing the Renown to
       re-spend (points() rises again as ownedCount falls) */
    respec() {
      if (!this.ownedCount()) return false;
      G.GameState.skills = [];
      G.GameState.save();
      const eng = G.engine;
      if (eng && eng.player) { eng.player.maxHp = 100; eng.player.hp = Math.min(eng.player.hp, 100); }
      G.audio.uiConfirm();
      return true;
    },
    canBuy(id) {
      if (this.owned(id) || this.points() <= 0) return false;
      const def = DEFS.find((d) => d.id === id);
      if (!def) return false;
      // tiers unlock in order within a branch
      for (const d of DEFS) {
        if (d.branch === def.branch && d.tier < def.tier && !this.owned(d.id)) return false;
      }
      return true;
    },
    buy(id) {
      if (!this.canBuy(id)) return false;
      G.GameState.skills = G.GameState.skills || [];
      G.GameState.skills.push(id);
      G.GameState.save();
      G.audio.objectiveDone();
      // battle-hardened: every discipline learned toughens the body
      const eng = G.engine;
      if (eng && eng.player) {
        eng.player.maxHp = 100 + this.bonusHp();
        eng.player.hp = Math.min(eng.player.maxHp, eng.player.hp + 5);
      }
      return true;
    },
  };

  /* ------------------------------ UI ------------------------------ */
  function SkillsMenu({ onBack }) {
    const [, force] = React.useReducer((x) => x + 1, 0);
    const branches = ['Warrior', 'Hunter', 'Commander'];
    const pts = G.Skills.points();

    return h('div', { className: 'screen dim fade-in', style: { zIndex: 70 } },
      h('div', { className: 'panel', style: { minWidth: 700, maxWidth: 860 } },
        h('div', { className: 'menu-title', style: { fontSize: 30 } }, 'SKILLS'),
        h('div', { className: 'menu-subtitle' },
          `Renown to spend: ${pts}`),
        h('div', { className: 'menu-rule' }),
        h('div', { style: { display: 'flex', gap: 18 } },
          branches.map((br) =>
            h('div', { key: br, style: { flex: 1 } },
              h('div', { className: 'brief-objectives-h', style: { textAlign: 'center' } }, br),
              DEFS.filter((d) => d.branch === br).map((d) => {
                const owned = G.Skills.owned(d.id);
                const can = G.Skills.canBuy(d.id);
                return h('button', {
                  key: d.id,
                  className: 'menu-btn small' + (owned ? ' primary' : ''),
                  disabled: !owned && !can,
                  style: { textTransform: 'none', letterSpacing: 0.5, textAlign: 'left', lineHeight: 1.45, opacity: owned ? 1 : can ? 0.95 : 0.45 },
                  title: d.desc,
                  onClick: () => {
                    if (owned) return;
                    if (G.Skills.buy(d.id)) force();
                  },
                }, h('div', null,
                  h('div', { style: { fontSize: 14 } }, `${d.icon} ${d.name} ${owned ? '✓' : can ? '· 1 renown' : '🔒'}`),
                  h('div', { style: { fontSize: 11.5, color: '#b3a175', marginTop: 3 } }, d.desc)));
              })))),
        h('div', { className: 'menu-footnote' },
          'Earn Renown by completing missions and saving civilians. Mastering the whole tree grows your vitality from 100 to 150. Between missions you may forget your disciplines and re-spend the Renown.'),
        h('div', { style: { display: 'flex', gap: 10, marginTop: 10 } },
          h('button', {
            className: 'menu-btn small',
            style: { flex: '0 0 auto', opacity: G.Skills.ownedCount() ? 1 : 0.4 },
            disabled: !G.Skills.ownedCount(),
            title: 'Unlearn every discipline and reclaim the Renown to re-spend.',
            onClick: () => { if (G.Skills.respec()) force(); },
          }, `Forget All (respec ${G.Skills.ownedCount()})`),
          h('button', { className: 'menu-btn small primary', style: { flex: 1 }, onClick: () => { G.audio.uiConfirm(); onBack(); } }, 'Done'))));
  }

  G.UI = G.UI || {};
  G.UI.SkillsMenu = SkillsMenu;
})();
