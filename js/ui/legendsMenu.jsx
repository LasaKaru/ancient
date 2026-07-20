/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — ui/legendsMenu.jsx  (roadmap v1.0)
   The "Legends of the King" selection screen: choose which age's enemy the
   great king faces in the War of Ages arena, and how long the tale runs.
   Sets G.Legend and launches the warOfAges level.

   Framed everywhere as LEGEND, never history — the honest counterpart to the
   grounded Chronicles campaigns, so a player is never misled into thinking
   Dutugemunu historically fought the Portuguese or the British.
   (JSX-free React.createElement — no build step; see hud.jsx note.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const React = window.__MODULES__.React;
  const h = React.createElement;

  /* display order + flavour for each summonable foe */
  const ROSTER = [
    { id: 'chola', label: 'The Chola Empire', tag: 'The war he truly fought — endless', swatch: '#3a4a7a', historical: true },
    { id: 'pandya', label: 'The Pandyan Hosts', tag: 'A thousand years after his death', swatch: '#d9b06a' },
    { id: 'kandyan', label: 'The Men of Kandy', tag: 'Seventeen centuries hence, in the hills', swatch: '#4a8c5a' },
    { id: 'portuguese', label: 'The Portuguese', tag: 'Fire in their hands', swatch: '#a83a3a', gun: true },
    { id: 'british', label: 'The British', tag: 'Nineteen centuries hence, in red coats', swatch: '#c0342f', gun: true },
  ];

  function LegendsMenu({ onPlay, onBack }) {
    const [faction, setFaction] = React.useState((G.Legend && G.Legend.faction) || 'chola');
    const [waves, setWaves] = React.useState((G.Legend && G.Legend.waves) || 5);
    const [seedMode, setSeedMode] = React.useState('fresh');  // 'fresh' | 'daily' | 'code'
    const [codeInput, setCodeInput] = React.useState('');
    const [codeErr, setCodeErr] = React.useState('');
    const [, force] = React.useReducer((x) => x + 1, 0);
    const click = (fn) => () => { G.audio.ensure(); G.audio.ui(); fn(); };

    // build the Legend config to launch with, honouring the chosen seed source
    const launch = () => {
      let seed;
      if (seedMode === 'daily') seed = G.Challenge.dailySeed();
      else if (seedMode === 'code') {
        const dec = G.Challenge.decode(codeInput);
        if (!dec) { setCodeErr('That code is not a valid challenge.'); G.audio.ui(); return; }
        G.Legend = { faction: dec.faction, waves: dec.waves, seed: dec.seed };
        onPlay('warOfAges'); return;
      } else seed = G.Challenge.newSeed();
      G.Legend = { faction, waves, seed };
      onPlay('warOfAges');
    };

    const top = G.Leaderboard ? G.Leaderboard.top(faction) : [];

    return h('div', { className: 'screen dim fade-in', style: { zIndex: 45 } },
      h('div', { className: 'panel', style: { minWidth: 560, maxWidth: 660 } },
        h('div', { className: 'brief-chapter' }, 'Legends of the King'),
        h('div', { className: 'menu-title', style: { fontSize: 34 } }, 'THE WAR OF AGES'),
        h('div', { className: 'menu-footnote', style: { marginTop: 4, marginBottom: 8 } },
          'A legend, not a chronicle. In the bards\' telling, Dutugemunu strides across the centuries and every age\'s army rises to meet him. Choose the foe — and stand with the king.'),
        h('div', { className: 'menu-rule' }),

        h('div', { className: 'brief-objectives-h' }, 'Choose the age'),
        ROSTER.map((r) => h('button', {
          key: r.id,
          className: 'menu-btn small' + (faction === r.id ? ' primary' : ''),
          style: { textTransform: 'none', letterSpacing: 0.5, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 },
          onClick: click(() => setFaction(r.id)),
        },
          h('span', { style: { width: 16, height: 16, borderRadius: '50%', background: r.swatch, border: '1px solid rgba(255,255,255,0.3)', flex: '0 0 auto' } }),
          h('span', { style: { flex: 1 } }, r.label,
            h('span', { style: { color: '#9a8a66', fontSize: 12 } }, '  —  ' + r.tag)),
          r.gun ? h('span', { title: 'gunpowder-era foe', style: { fontSize: 13 } }, '🔫') : null,
          r.historical ? h('span', { title: 'the one he truly fought', style: { fontSize: 13 } }, '⚔') : null)),

        // leaderboard for the selected foe
        top.length ? h('div', { className: 'lb-box' },
          h('div', { className: 'lb-h' }, '⚑ Best against ' + (ROSTER.find((r) => r.id === faction) || {}).label),
          top.slice(0, 5).map((e, i) => h('div', { key: i, className: 'lb-row' },
            h('span', { className: 'lb-rank' }, '#' + (i + 1)),
            h('span', { className: 'lb-name' }, e.name),
            h('span', { className: 'lb-meta' }, `${e.cleared}/${e.waves} waves`),
            h('span', { className: 'lb-score' }, e.score.toLocaleString())))) : null,

        h('div', { className: 'set-row', style: { border: 'none', marginTop: 10 } },
          h('label', { className: 'name' }, 'Length of the tale'),
          h('div', { className: 'seg' },
            [[3, 'Short'], [5, 'The Song'], [8, 'Epic']].map(([n, lab]) => h('button', {
              key: n, className: waves === n ? 'on' : '',
              onClick: click(() => setWaves(n)),
            }, `${lab} (${n})`)))),

        // v1.1: seed source — fresh fight, the shared daily, or a friend's code
        h('div', { className: 'set-row', style: { border: 'none' } },
          h('label', { className: 'name' }, 'The fight'),
          h('div', { className: 'seg' },
            [['fresh', 'Fresh'], ['daily', "Today's"], ['code', 'From a code']].map(([m, lab]) => h('button', {
              key: m, className: seedMode === m ? 'on' : '',
              onClick: click(() => { setSeedMode(m); setCodeErr(''); }),
            }, lab)))),
        seedMode === 'code'
          ? h('div', { className: 'field-row', style: { marginTop: 4 } },
            h('input', {
              type: 'text', placeholder: 'RAJ-…  (paste a friend\'s challenge)',
              value: codeInput,
              onChange: (e) => { setCodeInput(e.target.value); setCodeErr(''); },
              onFocus: () => { G.uiTyping = true; }, onBlur: () => { G.uiTyping = false; },
            }))
          : null,
        seedMode === 'daily'
          ? h('div', { className: 'menu-footnote', style: { marginTop: 2 } },
            'Today\'s challenge — the same fight for everyone, worldwide, until midnight UTC. Compare scores by sharing your code.')
          : null,
        codeErr ? h('div', { className: 'load-error', style: { padding: 8, fontSize: 13 } }, codeErr) : null,

        h('div', { className: 'menu-rule' }),
        h('button', {
          className: 'menu-btn primary',
          onClick: () => { G.audio.ensure(); G.audio.uiConfirm(); launch(); },
        }, seedMode === 'code' ? 'Take Up the Challenge' : 'Begin the Legend'),
        h('button', { className: 'menu-btn small', onClick: click(onBack) }, 'Back to Menu'),
        h('div', { className: 'menu-footnote' },
          'History note: Dutugemunu (2nd c. BCE) fought only the Cholas. The Pandyas, Kandy, the Portuguese and the British came generations to millennia after his death — they meet him here only in legend.')));
  }

  G.UI = G.UI || {};
  G.UI.LegendsMenu = LegendsMenu;
})();
