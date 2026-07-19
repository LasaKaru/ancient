/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — ui/hud.jsx
   In-game HUD overlay: health & stamina, weapon / quiver panel, compass with
   objective bearing, collapsible mission tracker, context-sensitive
   crosshair, interact prompts, subtitles, toasts, boss bar, damage vignette
   and cinematic letterbox.

   NOTE ON THE .jsx EXTENSION: per project convention these UI files use .jsx
   but contain no JSX syntax — everything is React.createElement — so the game
   runs with no build step straight from file://.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const React = window.__MODULES__.React;
  const h = React.createElement;

  /* ---------------- tiny pub/sub bus between engine and HUD ---------------- */
  const UIBus = {
    state: {
      toast: null, toastKey: 0,
      subtitle: null,           // {speaker, text, until}
      banner: null,             // {title, text, until}
      titleCard: null,          // {pre, main, body, until}
      boss: null,               // {name, frac}
      objectives: [],
      trackerOpen: true,
      damageKey: 0,
    },
    _subs: new Set(),
    set(patch) {
      Object.assign(this.state, patch);
      for (const fn of this._subs) fn();
    },
    on(fn) { this._subs.add(fn); return () => this._subs.delete(fn); },
    now() { return performance.now() / 1000; },
    toast(text) { this.set({ toast: text, toastKey: this.state.toastKey + 1 }); },
    subtitle(speaker, text, dur = 4) { this.set({ subtitle: { speaker, text, until: this.now() + dur } }); },
    banner(title, text, dur = 4) { this.set({ banner: { title, text, until: this.now() + dur } }); },
    titleCard(card) { this.set({ titleCard: { ...card, until: this.now() + (card.dur || 6) } }); },
    bossBar(name, frac) { this.set({ boss: name ? { name, frac } : null }); },
    damageFlash() { this.set({ damageKey: this.state.damageKey + 1 }); },
    setObjectives(list) { this.set({ objectives: list }); },
    toggleTracker() { this.set({ trackerOpen: !this.state.trackerOpen }); },
  };
  G.UIBus = UIBus;

  const CARDINALS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };

  function Compass({ facingDeg, objDiff }) {
    const ticks = [];
    for (let d = 0; d < 360; d += 15) {
      let diff = ((d - facingDeg + 540) % 360) - 180;
      if (Math.abs(diff) > 68) continue;
      const label = CARDINALS[d];
      ticks.push(h('div', {
        key: d,
        className: 'hud-compass-tick' + (label ? '' : ' minor'),
        style: { left: `calc(50% + ${diff * 2.4}px)` },
      }, label || '·'));
    }
    if (objDiff !== null && Math.abs(objDiff) <= 66) {
      ticks.push(h('div', { key: 'obj', className: 'hud-compass-obj', style: { left: `calc(50% + ${objDiff * 2.4}px)` } }, '◆'));
    }
    return h('div', { className: 'hud-compass' },
      h('div', { className: 'hud-compass-strip' }, ticks));
  }

  function Crosshair({ mode }) {
    if (mode === 'none') return null;
    if (mode === 'bow' || mode === 'bowfull') {
      return h('div', { className: 'hud-crosshair ' + (mode === 'bowfull' ? 'ch-full' : '') },
        h('div', { className: 'ch-bow' },
          h('span', { className: 'l1' }), h('span', { className: 'l2' }),
          h('span', { className: 'l3' }), h('span', { className: 'l4' })),
        h('div', { className: 'ch-dot' }));
    }
    return h('div', { className: 'hud-crosshair ch-melee' }, h('div', { className: 'ch-dot' }));
  }

  function HUD({ engine }) {
    const [, force] = React.useReducer((x) => x + 1, 0);
    const [snap, setSnap] = React.useState(null);

    React.useEffect(() => UIBus.on(force), []);
    React.useEffect(() => {
      const id = setInterval(() => {
        if (engine && engine.player) setSnap(engine.getHudState());
      }, 50);
      return () => clearInterval(id);
    }, [engine]);

    const S = UIBus.state;
    const now = UIBus.now();
    const cb = G.Settings.data.access.colorblind ? ' cb-outline' : '';
    const subsOn = G.Settings.data.access.subtitles;

    // full-screen title card outranks everything
    if (S.titleCard && S.titleCard.until > now) {
      const tc = S.titleCard;
      return h('div', { className: 'title-card' },
        h('div', { className: 'tc-pre' }, tc.pre || ''),
        h('div', { className: 'tc-main' }, tc.main || ''),
        h('div', { className: 'tc-body' }, tc.body || ''));
    }
    if (!snap) return null;

    const cine = snap.cinematic;
    const hpFrac = Math.max(0, snap.hp / snap.maxHp);
    const stFrac = Math.max(0, snap.stamina / snap.maxStamina);
    const objList = S.objectives.filter((o) => !o.hidden);

    return h('div', { id: 'hud', className: cb.trim() },
      // damage / low-hp overlays (keyed remount restarts the flash animation)
      h('div', { key: 'dmg' + S.damageKey, className: 'hud-damage-vignette' + (S.damageKey ? ' hit' : '') }),
      hpFrac < 0.3 && snap.alive ? h('div', { className: 'hud-lowhp-vignette' }) : null,

      // cinematic letterbox
      cine ? h('div', { className: 'hud-letterbox-top' }) : null,
      cine ? h('div', { className: 'hud-letterbox-bot' }) : null,

      // vitals
      !cine ? h('div', { className: 'hud-vitals' },
        h('div', { className: 'hud-bar-wrap' },
          h('div', { className: 'hud-bar-label' }, h('span', null, 'Vitality'), h('span', null, `${Math.ceil(snap.hp)} / ${snap.maxHp}`)),
          h('div', { className: 'hud-bar' },
            h('div', { className: 'fill health' + (hpFrac < 0.3 ? ' low' : ''), style: { width: (hpFrac * 100) + '%' } }))),
        h('div', { className: 'hud-bar-wrap' },
          h('div', { className: 'hud-bar-label' }, h('span', null, 'Stamina')),
          h('div', { className: 'hud-bar slim' },
            h('div', { className: 'fill stamina', style: { width: (stFrac * 100) + '%', opacity: snap.exhausted ? 0.45 : 1 } }))),
        snap.repute > 0 ? h('div', { className: 'hud-repute' }, `Renown ${snap.repute}`) : null,
      ) : null,

      // weapon panel
      !cine ? h('div', { className: 'hud-weapon' },
        h('div', { className: 'hud-weapon-icon' }, snap.weapon === 'bow' ? '🏹' : '⚔️'),
        h('div', { className: 'hud-weapon-name' }, snap.weapon === 'bow' ? 'Longbow' : 'War Sword'),
        snap.weapon === 'bow'
          ? h('div', { className: 'hud-arrows' }, `${snap.arrows} `, h('span', { className: 'cap' }, `/ ${snap.quiverMax}`))
          : null,
        snap.weapon === 'bow' && snap.drawPct > 0
          ? h('div', { className: 'hud-draw-meter' }, h('div', { className: 'fill', style: { width: (snap.drawPct * 100) + '%' } }))
          : null,
      ) : null,

      // compass + boss bar
      !cine ? h(Compass, { facingDeg: snap.facingDeg, objDiff: snap.objDiff }) : null,
      !cine ? h('div', { className: 'hud-compass-center' }) : null,
      S.boss && !cine ? h('div', { className: 'hud-boss' },
        h('div', { className: 'hud-boss-name' }, S.boss.name),
        h('div', { className: 'hud-boss-bar' },
          h('div', { className: 'fill', style: { width: (S.boss.frac * 100) + '%' } }))) : null,

      // mission tracker
      !cine && subsOn !== 'off' ? h('div', { className: 'hud-tracker' },
        h('div', { className: 'hud-tracker-h', onClick: () => UIBus.toggleTracker() },
          h('span', null, snap.levelTitle || 'Objectives'),
          h('span', { className: 'caret' }, S.trackerOpen ? '▾' : '▸ (TAB)')),
        S.trackerOpen ? objList.map((o) =>
          h('div', { key: o.id, className: 'hud-obj' + (o.done ? ' done' : '') + (o.optional ? ' optional' : '') },
            h('span', { className: 'box' }, o.done ? '✓' : '◻'),
            h('span', null,
              o.text + (o.count ? ` (${Math.min(o.progress, o.count)}/${o.count})` : '') + (o.note ? ` — ${o.note}` : '')))) : null,
      ) : null,

      // crosshair + interact prompt
      !cine && snap.alive ? h(Crosshair, { mode: snap.crosshair }) : null,
      !cine && snap.prompt ? h('div', { className: 'hud-interact-tip' },
        h('b', null, prettyKey(G.Settings.data.controls.keys.interact)), ' — ' + snap.prompt) : null,

      // toast / banner
      S.toast ? h('div', { key: 'toast' + S.toastKey, className: 'hud-toast' }, S.toast) : null,
      S.banner && S.banner.until > now ? h('div', { className: 'obj-banner' },
        h('div', { className: 'ob-h' }, S.banner.title),
        h('div', { className: 'ob-t' }, S.banner.text)) : null,

      // subtitles
      subsOn && S.subtitle && S.subtitle.until > now ? h('div', { className: 'hud-subtitle' },
        S.subtitle.speaker ? h('span', { className: 'speaker' }, S.subtitle.speaker + ': ') : null,
        S.subtitle.text) : null,
    );
  }

  function prettyKey(code) {
    if (!code) return '?';
    return code.replace('Key', '').replace('Digit', '').replace('Arrow', '')
      .replace('Left', ' L').replace('Right', ' R').replace('Control', 'Ctrl');
  }
  G.prettyKey = prettyKey;

  G.UI = G.UI || {};
  G.UI.HUD = HUD;

  // auto-clear toasts
  let lastToastKey = 0;
  UIBus.on(() => {
    if (UIBus.state.toastKey !== lastToastKey) {
      lastToastKey = UIBus.state.toastKey;
      const key = lastToastKey;
      setTimeout(() => {
        if (UIBus.state.toastKey === key) UIBus.set({ toast: null });
      }, 2400);
    }
  });
})();
