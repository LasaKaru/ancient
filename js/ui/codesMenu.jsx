/* ============================================================================
   WARRIORS OF TAPROBANE — ui/codesMenu.jsx
   Secret Codes screen: enter a word-code to unlock a hidden weapon or ability.
   Reachable from the Main Menu ("Secret Codes") and the Pause menu.
   (JSX-free React.createElement — no build step.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { React } = window.__MODULES__;
  const h = React.createElement;
  const { useState } = React;

  function CodesMenu({ onBack }) {
    const [val, setVal] = useState('');
    const [msg, setMsg] = useState(null);       // { ok, text }
    const [, force] = useState(0);

    const submit = () => {
      if (!val.trim()) return;
      const r = G.Codes.enter(val);
      if (!r.ok) setMsg({ ok: false, text: 'Unknown code. The chronicles keep their secrets.' });
      else if (r.toggledOff) setMsg({ ok: true, text: r.def.name + ' — switched off.' });
      else setMsg({ ok: true, text: r.def.name + ' — ' + r.def.desc });
      setVal('');
      force((n) => n + 1);
      if (G.engine && G.engine.ui && r.ok) G.engine.ui.toast('CODE ACCEPTED — ' + r.def.name.toUpperCase());
    };

    const active = G.Codes ? G.Codes.active : new Set();
    const known = G.Codes ? G.Codes.DEFS : [];

    return h('div', { className: 'screen codes-screen fade-in' },
      G.UI.KeyArtBg ? h(G.UI.KeyArtBg, { name: 'menu.jpg', dim: 0.62 }) : null,
      h('div', { className: 'panel', style: { minWidth: 480, maxWidth: 620 } },
        h('div', { className: 'menu-eyebrow' }, 'The Chronicler\'s Secrets'),
        h('div', { className: 'menu-title', style: { fontSize: 30 } }, 'SECRET CODES'),
        h('div', { className: 'menu-subtitle' }, 'Speak a word of power to unlock hidden weapons and abilities.'),
        h('div', { className: 'menu-rule' }),
        h('div', { className: 'codes-row' },
          h('input', {
            className: 'codes-input', value: val, placeholder: 'enter a code…', spellCheck: false,
            onChange: (e) => setVal(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') submit(); },
            onFocus: () => { G.uiTyping = true; }, onBlur: () => { G.uiTyping = false; },
          }),
          h('button', { className: 'menu-btn primary', style: { minWidth: 120 }, onClick: submit }, 'Unlock')),
        msg ? h('div', { className: 'codes-msg ' + (msg.ok ? 'ok' : 'bad') }, msg.text) : null,
        h('div', { className: 'codes-list-h' }, 'Secrets discovered'),
        h('div', { className: 'codes-list' },
          known.filter((d) => active.has(d.effect)).length
            ? known.filter((d) => active.has(d.effect)).map((d) => h('div', { key: d.effect, className: 'codes-known' },
              h('span', { className: 'ck-name' }, '✓ ' + d.name), h('span', { className: 'ck-desc' }, d.desc)))
            : h('div', { className: 'codes-none' }, 'None yet. Hint: the chronicles speak of a fire-weapon, a lion\'s fang, and the ten champions…')),
        h('button', { className: 'menu-btn small', style: { marginTop: 16 }, onClick: onBack }, 'Back')));
  }

  G.UI = G.UI || {};
  G.UI.CodesMenu = CodesMenu;
})();
