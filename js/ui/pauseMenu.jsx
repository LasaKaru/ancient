/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — ui/pauseMenu.jsx
   Pause overlay: Resume, Settings, Restart Mission, Quit to Menu.
   (JSX-free React.createElement — no build step; see hud.jsx note.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const React = window.__MODULES__.React;
  const h = React.createElement;

  function PauseMenu({ levelTitle, onResume, onSettings, onSkills, onRestart, onQuit }) {
    const click = (fn) => () => { G.audio.ui(); fn(); };
    const pts = G.Skills ? G.Skills.points() : 0;
    return h('div', { className: 'screen dim fade-in', style: { zIndex: 50 } },
      h('div', { className: 'panel', style: { minWidth: 360 } },
        h('div', { className: 'menu-title', style: { fontSize: 30 } }, 'PAUSED'),
        h('div', { className: 'menu-subtitle' }, levelTitle || ''),
        h('div', { className: 'menu-rule' }),
        h('button', { className: 'menu-btn primary', onClick: click(onResume) }, 'Resume'),
        // quick realism switch, right where a losing (or bored) player needs it
        h('div', { className: 'set-row', style: { border: 'none', padding: '4px 0 10px' } },
          h('label', { className: 'name', style: { flexBasis: 90 } }, 'Realism'),
          h(G.UI.RealismPresetRow)),
        onSkills ? h('button', { className: 'menu-btn', onClick: click(onSkills) }, 'Skills' + (pts > 0 ? ` (${pts} to spend)` : '')) : null,
        h('button', { className: 'menu-btn', onClick: click(onSettings) }, 'Settings'),
        h('button', { className: 'menu-btn', onClick: click(onRestart) }, 'Restart Mission'),
        h('button', { className: 'menu-btn danger', onClick: click(onQuit) }, 'Quit to Menu'),
        h('div', { className: 'menu-footnote' }, 'Progress within the mission is held at your last checkpoint.')));
  }

  G.UI = G.UI || {};
  G.UI.PauseMenu = PauseMenu;
})();
