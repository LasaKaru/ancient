/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — ui/mainMenu.jsx
   Main menu with a live 3D background (slow-rotating stupa silhouette at
   dusk, drifting sparks) rendered through React Three Fiber; New Game
   (name + armour colour), Continue, Chapters, Settings, Credits.
   (JSX-free React.createElement — no build step; see hud.jsx note.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { React, THREE, R3F, drei } = window.__MODULES__;
  const h = React.createElement;
  const { Canvas, useFrame } = R3F;

  const ARMOR_COLORS = [
    { name: 'Madder Red', hex: 0x7a2f22 },
    { name: 'Royal Gold', hex: 0x9c7a1e },
    { name: 'Forest Green', hex: 0x3d5a2a },
    { name: 'Lake Blue', hex: 0x2e4a6e },
    { name: 'Twilight Plum', hex: 0x5a2a4a },
  ];

  /* ------------------- 3D background scene ------------------- */
  function MenuStupa() {
    const grp = React.useRef();
    useFrame((state, dt) => {
      if (grp.current) grp.current.rotation.y += dt * 0.06;
    });
    const brick = React.useMemo(() => G.Mats.std({ map: G.Mats.tex.brick([8, 2]), rough: 0.9 }), []);
    const white = React.useMemo(() => G.Mats.std({ map: G.Mats.tex.whitewash([4, 2]), rough: 0.85 }), []);
    const gold = React.useMemo(() => G.Mats.std({ color: 0xe8b94a, rough: 0.25, metal: 1 }), []);
    return h('group', { ref: grp, position: [0, -2.2, 0] },
      h('mesh', { position: [0, 0.35, 0] },
        h('cylinderGeometry', { args: [4.6, 4.75, 0.7, 40] }),
        h('primitive', { object: brick, attach: 'material' })),
      h('mesh', { position: [0, 1.0, 0] },
        h('cylinderGeometry', { args: [4.2, 4.3, 0.6, 40] }),
        h('primitive', { object: brick, attach: 'material' })),
      h('mesh', { position: [0, 1.3, 0] },
        h('sphereGeometry', { args: [3.6, 40, 22, 0, Math.PI * 2, 0, Math.PI / 2] }),
        h('primitive', { object: white, attach: 'material' })),
      h('mesh', { position: [0, 5.2, 0] },
        h('boxGeometry', { args: [1.4, 0.55, 1.4] }),
        h('primitive', { object: white, attach: 'material' })),
      h('mesh', { position: [0, 6.4, 0] },
        h('coneGeometry', { args: [0.55, 2.6, 12] }),
        h('primitive', { object: white, attach: 'material' })),
      h('mesh', { position: [0, 7.8, 0] },
        h('sphereGeometry', { args: [0.18, 8, 8] }),
        h('primitive', { object: gold, attach: 'material' })));
  }

  function MenuScene() {
    const Sparkles = drei && drei.Sparkles;
    return h(React.Fragment, null,
      h('color', { attach: 'background', args: ['#160f08'] }),
      h('fog', { attach: 'fog', args: ['#160f08', 8, 30] }),
      h('hemisphereLight', { args: [0x8a90c0, 0x40301a, 0.5] }),
      h('directionalLight', { position: [-6, 5, 4], intensity: 1.6, color: 0xffb870 }),
      h('pointLight', { position: [4, 1, 5], intensity: 8, color: 0xff9440, distance: 14 }),
      h(MenuStupa),
      Sparkles ? h(Sparkles, { count: 60, size: 2.5, scale: [16, 8, 16], speed: 0.25, color: '#f3cd7a', opacity: 0.5 }) : null,
      h('mesh', { position: [0, -2.5, 0], 'rotation-x': -Math.PI / 2 },
        h('circleGeometry', { args: [40, 32] }),
        h('meshStandardMaterial', { color: '#241a0e', roughness: 1 })));
  }

  class MenuCanvasBoundary extends React.Component {
    constructor(p) { super(p); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(e) { console.warn('[menu] 3D background failed', e); }
    render() {
      if (this.state.failed) return null;
      return h('div', { className: 'screen-canvas-bg' },
        h(Canvas, { camera: { position: [0, 2.2, 13], fov: 45 }, dpr: 1, gl: { antialias: true } },
          h(MenuScene)));
    }
  }

  /* ------------------------- menu panels ------------------------- */
  function MainMenu({ progress, onNewGame, onContinue, onChapter, onSettings, onMap, onLegends, onSelectSlot, onDeleteSlot, activeSlot }) {
    const [view, setView] = React.useState('root'); // root | newgame | chapters | credits | slots
    const [name, setName] = React.useState(progress.profile?.name || 'Abhaya');
    const [color, setColor] = React.useState(progress.profile?.armorColor || ARMOR_COLORS[0].hex);
    const click = (fn) => () => { G.audio.ensure(); G.audio.ui(); fn(); };
    const hasSave = progress.unlocked > 1 || progress.completedCount > 0;
    const order = G.Levels.order;

    let body;
    if (view === 'newgame') {
      body = h(React.Fragment, null,
        h('div', { className: 'field-row' },
          h('label', null, 'Warrior\'s name'),
          h('input', {
            type: 'text', value: name, maxLength: 18,
            onChange: (e) => setName(e.target.value),
            onFocus: () => { G.uiTyping = true; }, onBlur: () => { G.uiTyping = false; },
          })),
        h('div', { className: 'field-row' },
          h('label', null, 'Armour sash'),
          h('div', { className: 'swatch-row' },
            ARMOR_COLORS.map((c) => h('div', {
              key: c.hex, title: c.name,
              className: 'swatch' + (color === c.hex ? ' active' : ''),
              style: { background: '#' + c.hex.toString(16).padStart(6, '0') },
              onClick: click(() => setColor(c.hex)),
            })))),
        h('button', { className: 'menu-btn primary', onClick: click(() => onNewGame({ name: name.trim() || 'Abhaya', armorColor: color })) }, 'March to War'),
        h('button', { className: 'menu-btn small', onClick: click(() => setView('root')) }, 'Back'));
    } else if (view === 'chapters') {
      body = h(React.Fragment, null,
        order.filter((id) => !G.Levels.defs[id].standalone).map((id, i) => {
          const def = G.Levels.defs[id];
          const locked = def.bonus ? !progress.bonusUnlocked : (i + 1) > progress.unlocked;
          return h('button', {
            key: id, className: 'menu-btn small', disabled: locked,
            onClick: click(() => onChapter(id)),
          }, `${def.chapter} — ${def.title}` + (locked ? '  🔒' : ''));
        }),
        h('button', { className: 'menu-btn small', onClick: click(() => setView('root')) }, 'Back'));
    } else if (view === 'slots') {
      const slots = (G.Saves ? G.Saves.list() : []);
      body = h(React.Fragment, null,
        h('div', { className: 'menu-subtitle', style: { marginBottom: 6 } }, 'Choose a campaign'),
        slots.map(({ slot, data }) => h('div', { key: slot, className: 'slot-row' + (slot === activeSlot ? ' active' : '') },
          h('button', {
            className: 'menu-btn small', style: { flex: 1, textAlign: 'left', textTransform: 'none', letterSpacing: 0.4 },
            onClick: click(() => { onSelectSlot && onSelectSlot(slot); setView('root'); }),
          }, data
            ? `Slot ${slot + 1} · ${data.name} — Day ${data.day}, ${data.completed} won${slot === activeSlot ? '  ◄' : ''}`
            : `Slot ${slot + 1} · — empty —${slot === activeSlot ? '  ◄' : ''}`),
          data ? h('button', {
            className: 'menu-btn small danger', style: { flex: '0 0 auto', width: 40 },
            title: 'Erase this campaign',
            onClick: click(() => { if (onDeleteSlot) onDeleteSlot(slot); }),
          }, '✕') : null)),
        h('button', { className: 'menu-btn small', onClick: click(() => setView('root')) }, 'Back'));
    } else if (view === 'credits') {
      body = h('div', { className: 'credits-body' },
        h('h3', null, 'A Historical Action Tale'),
        h('div', { className: 'big' }, 'Warriors of Taprobane'),
        h('h3', null, 'Inspired By'),
        h('div', null, 'The Mahavamsa chronicle · the sacred city of Anuradhapura', h('br'), 'the Ruwanwelisaya Maha Seya · the Dasa Maha Yodhayo', h('br'), 'and the enduring legend of Sigiriya'),
        h('h3', null, 'A Note On History'),
        h('div', null, 'Dutugemunu and Elara reigned in the 2nd century BCE.', h('br'), 'The chronicle records that Dutugemunu honoured his fallen rival', h('br'), 'with a monument — a rare grace between enemies.', h('br'), 'The Sigiriya chapter is a legend set ~600 years later, told apart.'),
        h('h3', null, 'Technology'),
        h('div', null, 'Three.js · React Three Fiber · cannon-es · Web Audio', h('br'), 'All art, music and sound generated procedurally in your browser.'),
        h('button', { className: 'menu-btn small', style: { marginTop: 18 }, onClick: click(() => setView('root')) }, 'Back'));
    } else {
      body = h(React.Fragment, null,
        h('button', { className: 'menu-btn primary', onClick: click(() => setView('newgame')) }, G.t('menu.newGame')),
        h('button', { className: 'menu-btn', disabled: !hasSave, onClick: click(onContinue) }, G.t('menu.continue')),
        onMap ? h('button', { className: 'menu-btn', onClick: click(onMap) }, G.t('menu.map')) : null,
        onLegends ? h('button', { className: 'menu-btn', onClick: click(onLegends) }, G.t('menu.legends')) : null,
        h('button', { className: 'menu-btn', disabled: !hasSave, onClick: click(() => setView('chapters')) }, G.t('menu.chapters')),
        onSelectSlot ? h('button', { className: 'menu-btn', onClick: click(() => setView('slots')) }, `${G.t('menu.saveSlots')} (${(activeSlot | 0) + 1})`) : null,
        h('button', { className: 'menu-btn', onClick: click(onSettings) }, G.t('menu.settings')),
        h('button', { className: 'menu-btn', onClick: click(() => setView('credits')) }, G.t('menu.credits')),
        h('div', { className: 'menu-footnote' },
          'Twenty-two centuries of war upon one island —', h('br'), 'from Dutugemunu the Great to the last kings of Kandy.'));
    }

    return h('div', { className: 'screen' },
      h(MenuCanvasBoundary),
      G.UI.KeyArtBg ? h(G.UI.KeyArtBg, { name: 'menu.jpg', dim: 0.5 }) : null,
      h('div', { className: 'panel', style: { minWidth: 420 } },
        h('div', { className: 'menu-eyebrow' }, 'Warriors of'),
        h('div', { className: 'menu-title' }, 'TAPROBANE'),
        h('div', { className: 'menu-subtitle' }, G.t('menu.subtitle')),
        h('div', { className: 'menu-rule' }),
        body));
  }

  G.UI = G.UI || {};
  G.UI.MainMenu = MainMenu;
  G.ARMOR_COLORS = ARMOR_COLORS;
})();
