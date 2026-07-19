/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — ui/missionBrief.jsx
   Mission intro card: chapter, title, historical framing, objective list.
   (JSX-free React.createElement — no build step; see hud.jsx note.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const React = window.__MODULES__.React;
  const h = React.createElement;

  function MissionBrief({ level, onBegin, onBack }) {
    return h('div', { className: 'screen dim fade-in' },
      h('div', { className: 'panel brief-panel' },
        h('div', { className: 'brief-chapter' }, level.chapter || ''),
        h('div', { className: 'brief-title' }, level.title),
        h('div', { className: 'brief-location' }, level.location || ''),
        h('div', { className: 'brief-location', style: { marginTop: 3, color: '#b49b6c' } },
          level.bonus
            ? '⋆ a legend outside the campaign\'s calendar ⋆'
            : `Day ${G.GameState.day} of the campaign · ${level.timeLine || 'morning'}`),
        h('div', { className: 'menu-rule' }),
        h('div', { className: 'brief-framing' }, level.framing),
        h('div', { className: 'brief-objectives-h' }, 'Objectives'),
        level.objectives.filter((o) => !o.hidden).map((o) =>
          h('div', { key: o.id, className: 'brief-obj' + (o.optional ? ' optional' : '') },
            h('span', { className: 'tick' }, '◆'),
            h('span', null, o.text + (o.optional ? ' (optional)' : '')))),
        h('div', { className: 'menu-rule' }),
        h('button', {
          className: 'menu-btn primary',
          onClick: () => { G.audio.ensure(); G.audio.uiConfirm(); onBegin(); },
        }, 'Begin'),
        onBack ? h('button', { className: 'menu-btn small', onClick: () => { G.audio.ui(); onBack(); } }, 'Back to Menu') : null,
        h('div', { className: 'menu-footnote' },
          'WASD move · SHIFT sprint · SPACE jump · C crouch · LMB strike / loose · RMB guard / draw · 1–5 weapons · Q sword⇄bow · F interact / mount · G herbs · T rally · K skills · TAB log · ESC pause')));
  }

  G.UI = G.UI || {};
  G.UI.MissionBrief = MissionBrief;
})();
