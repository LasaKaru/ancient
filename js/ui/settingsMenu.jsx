/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — ui/settingsMenu.jsx
   Fully functional settings: graphics (quality preset, post FX, FOV, FPS cap,
   draw distance, foliage), controls (rebindable keys, sensitivity, invert-Y),
   audio (per-bus mixers), accessibility (subtitles, high-contrast HUD).
   Everything applies to the running game in real time via G.Settings.
   (JSX-free React.createElement — no build step; see hud.jsx note.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const React = window.__MODULES__.React;
  const h = React.createElement;

  const KEY_LABELS = {
    forward: 'Move forward', back: 'Move back', left: 'Strafe left', right: 'Strafe right',
    sprint: 'Sprint', jump: 'Jump', crouch: 'Crouch', switchWeapon: 'Sword ⇄ bow',
    nock: 'Nock arrow', interact: 'Interact / mount', missionLog: 'Mission log', pause: 'Pause',
    herb: 'Use healing herbs', rally: 'Rally cry (skill)', skills: 'Skills page',
    camera: 'First ⇄ third person',
    lure: 'Whistle lure', sense: 'Warrior sense',
    shield: 'Raise / lower shield', javelin: 'Throw javelin',
    map: 'Regional map',
  };

  function RealismPresetRow({ onChanged }) {
    const [, self] = React.useReducer((x) => x + 1, 0);
    const cur = G.Settings.data.realism.preset;
    return h('div', { className: 'seg' },
      ['arcade', 'standard', 'realistic'].map((p) => h('button', {
        key: p,
        className: cur === p ? 'on' : '',
        onClick: () => { G.audio.ui(); G.Settings.applyRealism(p); self(); onChanged && onChanged(); },
      }, p)),
      h('button', { className: cur === 'custom' ? 'on' : '', disabled: true }, 'custom'));
  }
  G.UI = G.UI || {};
  G.UI.RealismPresetRow = RealismPresetRow;

  function Row({ label, children, val }) {
    return h('div', { className: 'set-row' },
      h('label', { className: 'name' }, label),
      children,
      val !== undefined ? h('div', { className: 'val' }, val) : null);
  }
  function Slider({ path, min, max, step, fmt }) {
    const [v, setV] = React.useState(G.Settings.get(path));
    return h(React.Fragment, null,
      h('input', {
        type: 'range', min, max, step,
        value: v,
        onChange: (e) => { const x = parseFloat(e.target.value); setV(x); G.Settings.set(path, x); },
      }),
      h('div', { className: 'val' }, fmt ? fmt(v) : v));
  }
  function Seg({ path, options, labels }) {
    const [v, setV] = React.useState(G.Settings.get(path));
    return h('div', { className: 'seg' },
      options.map((o, i) => h('button', {
        key: String(o),
        className: v === o ? 'on' : '',
        onClick: () => { G.audio.ui(); setV(o); G.Settings.set(path, o); },
      }, labels ? labels[i] : String(o))));
  }
  function Toggle({ path }) {
    const [v, setV] = React.useState(!!G.Settings.get(path));
    return h('div', {
      className: 'toggle' + (v ? ' on' : ''),
      onClick: () => { G.audio.ui(); setV(!v); G.Settings.set(path, !v); },
    }, h('div', { className: 'knob' }));
  }
  function LangRow() {
    const [, self] = React.useReducer((x) => x + 1, 0);
    if (!G.I18N) return null;
    const cur = G.I18N.lang;
    return h('div', { className: 'seg' },
      G.I18N.langs().map((l) => h('button', {
        key: l, className: cur === l ? 'on' : '',
        onClick: () => { G.audio.ui(); G.I18N.setLang(l); self(); },
      }, G.I18N.LANG_NAMES[l] || l)));
  }

  function ControlsTab() {
    const [listening, setListening] = React.useState(null);
    const [, force] = React.useReducer((x) => x + 1, 0);
    React.useEffect(() => {
      if (!listening) return;
      const onKey = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.code !== 'Escape') G.Settings.set('controls.keys.' + listening, e.code);
        setListening(null);
        force();
      };
      window.addEventListener('keydown', onKey, true);
      return () => window.removeEventListener('keydown', onKey, true);
    }, [listening]);

    return h(React.Fragment, null,
      h(Row, { label: 'Mouse sensitivity' }, h(Slider, { path: 'controls.sensitivity', min: 0.2, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) })),
      h(Row, { label: 'Invert Y axis' }, h(Toggle, { path: 'controls.invertY' })),
      Object.keys(KEY_LABELS).map((k) =>
        h(Row, { key: k, label: KEY_LABELS[k] },
          h('button', {
            className: 'bind-btn' + (listening === k ? ' listening' : ''),
            onClick: () => { G.audio.ui(); setListening(listening === k ? null : k); },
          }, listening === k ? 'Press a key…' : G.prettyKey(G.Settings.get('controls.keys.' + k))))),
      h('div', { className: 'settings-note' }, 'Click a binding, then press the new key. ESC cancels. Bindings apply immediately and persist for this browser.'));
  }

  function SettingsMenu({ onBack }) {
    const [tab, setTab] = React.useState('graphics');
    const [, force] = React.useReducer((x) => x + 1, 0);
    const tabs = [['graphics', 'Graphics'], ['realism', 'Realism'], ['controls', 'Controls'], ['audio', 'Audio'], ['access', 'Accessibility']];

    let body;
    if (tab === 'graphics') {
      body = h(React.Fragment, null,
        h(Row, { label: 'Quality preset' },
          h('div', { className: 'seg' },
            ['low', 'medium', 'high', 'ultra'].map((p) => h('button', {
              key: p,
              className: G.Settings.data.graphics.preset === p ? 'on' : '',
              onClick: () => { G.audio.ui(); G.Settings.applyPreset(p); force(); },
            }, p)))),
        h(Row, { label: 'Post-processing (bloom, grain)' }, h(Toggle, { path: 'graphics.postFX', key: 'post' + G.Settings.data.graphics.preset })),
        h(Row, { label: 'Field of view' }, h(Slider, { path: 'graphics.fov', min: 60, max: 110, step: 1, fmt: (v) => v + '°' })),
        h(Row, { label: 'Target FPS cap' }, h(Seg, { path: 'graphics.fpsCap', options: [30, 60, 120, 0], labels: ['30', '60', '120', 'Off'] })),
        h(Row, { label: 'Draw distance / fog' }, h(Slider, { path: 'graphics.drawDistance', min: 100, max: 350, step: 10, fmt: (v) => v + 'm' })),
        h(Row, { label: 'Foliage density' }, h(Slider, { path: 'graphics.foliage', min: 0.2, max: 1.5, step: 0.05, fmt: (v) => Math.round(v * 100) + '%' })),
        h(Row, { label: 'Camera' }, h(Seg, { path: 'graphics.camera', options: ['first', 'third'], labels: ['1st person', '3rd person'] })),
        h(Row, { label: 'Auto quality (adaptive)' }, h(Toggle, { path: 'graphics.autoQuality' })),
        h(Row, { label: 'Show FPS' }, h(Toggle, { path: 'graphics.showFPS' })),
        h('div', { className: 'settings-note' },
          'Preset changes shadow resolution and render scale immediately; foliage density takes effect when a mission (re)loads. V swaps the camera in the field. Auto quality steps the preset down if the frame-rate stays low.'));
    } else if (tab === 'realism') {
      body = h(React.Fragment, null,
        h(Row, { label: 'Realism preset' }, h(RealismPresetRow, { onChanged: force })),
        h(Row, { label: 'Damage you take', key: 'rt' + G.Settings.data.realism.preset }, h(Slider, { path: 'realism.damageTaken', min: 0.5, max: 2, step: 0.05, fmt: (v) => '×' + v.toFixed(2) })),
        h(Row, { label: 'Damage you deal', key: 'rd' + G.Settings.data.realism.preset }, h(Slider, { path: 'realism.damageDealt', min: 0.5, max: 2, step: 0.05, fmt: (v) => '×' + v.toFixed(2) })),
        h(Row, { label: 'Natural healing', key: 'rg' + G.Settings.data.realism.preset }, h(Seg, { path: 'realism.regen', options: ['arcade', 'standard', 'none'], labels: ['Full', 'To 40%', 'None'] })),
        h(Row, { label: 'Enemy awareness', key: 'ra' + G.Settings.data.realism.preset }, h(Slider, { path: 'realism.enemyAwareness', min: 0.5, max: 1.5, step: 0.05, fmt: (v) => '×' + v.toFixed(2) })),
        h(Row, { label: 'Arrow drop (gravity)', key: 'rr' + G.Settings.data.realism.preset }, h(Slider, { path: 'realism.arrowDrop', min: 0.5, max: 1.6, step: 0.05, fmt: (v) => '×' + v.toFixed(2) })),
        h(Row, { label: 'Minimal HUD (diegetic)', key: 'rh' + G.Settings.data.realism.preset }, h(Toggle, { path: 'realism.hudMinimal' })),
        h(Row, { label: 'Friendly fire', key: 'rf' + G.Settings.data.realism.preset }, h(Toggle, { path: 'realism.friendlyFire' })),
        h(Row, { label: 'Herb abundance', key: 'rhb' + G.Settings.data.realism.preset }, h(Slider, { path: 'realism.herbs', min: 0.5, max: 1.5, step: 0.1, fmt: (v) => Math.round(v * 100) + '%' })),
        h('div', { className: 'settings-note' },
          'Applies instantly, mid-fight if you like. Realistic mode also slows your legs below a quarter vitality — chew your herbs — turns on friendly fire (mind your allies), and makes herbs scarce. Hand-tuning any dial switches the preset to "custom".'));
    } else if (tab === 'controls') {
      body = h(ControlsTab);
    } else if (tab === 'audio') {
      body = h(React.Fragment, null,
        h(Row, { label: 'Master volume' }, h(Slider, { path: 'audio.master', min: 0, max: 1, step: 0.02, fmt: (v) => Math.round(v * 100) + '%' })),
        h(Row, { label: 'Music' }, h(Slider, { path: 'audio.music', min: 0, max: 1, step: 0.02, fmt: (v) => Math.round(v * 100) + '%' })),
        h(Row, { label: 'Combat & effects' }, h(Slider, { path: 'audio.sfx', min: 0, max: 1, step: 0.02, fmt: (v) => Math.round(v * 100) + '%' })),
        h(Row, { label: 'Ambience' }, h(Slider, { path: 'audio.ambience', min: 0, max: 1, step: 0.02, fmt: (v) => Math.round(v * 100) + '%' })),
        h('div', { className: 'settings-note' },
          'All sound is generated procedurally through the Web Audio API — see js/audio/audioEngine.js for the labelled AUDIO SLOT paths if you want to drop in real recordings.'));
    } else {
      body = h(React.Fragment, null,
        h(Row, { label: 'Subtitles & objective text' }, h(Toggle, { path: 'access.subtitles' })),
        h(Row, { label: 'High-contrast HUD outline' }, h(Toggle, { path: 'access.colorblind' })),
        h(Row, { label: 'Enemy-nearby warning ring' }, h(Toggle, { path: 'access.threatRing' })),
        h(Row, { label: 'Auto-pause when tab is hidden' }, h(Toggle, { path: 'access.autoPause' })),
        h(Row, { label: 'Language' }, h(LangRow)),
        h('div', { className: 'settings-note' },
          'High-contrast mode recolours the vitality and stamina bars (orange / blue) and strengthens HUD outlines for colour-blind visibility. Auto-pause halts the battle the moment you switch away, so nothing lands a blow while you\'re gone.'));
    }

    return h('div', { className: 'screen dim fade-in', style: { zIndex: 70 } },
      h('div', { className: 'panel settings-panel' },
        h('div', { className: 'menu-title', style: { fontSize: 30 } }, 'SETTINGS'),
        h('div', { className: 'settings-tabs' },
          tabs.map(([id, label]) => h('button', {
            key: id,
            className: 'settings-tab' + (tab === id ? ' active' : ''),
            onClick: () => { G.audio.ui(); setTab(id); },
          }, label))),
        body,
        h('div', { className: 'settings-actions' },
          h('button', { className: 'menu-btn small', style: { flex: 1 }, onClick: () => { G.audio.ui(); G.Settings.resetDefaults(); force(); } }, 'Restore Defaults'),
          h('button', { className: 'menu-btn small primary', style: { flex: 1 }, onClick: () => { G.audio.uiConfirm(); onBack(); } }, 'Done'))));
  }

  G.UI = G.UI || {};
  G.UI.SettingsMenu = SettingsMenu;
})();
