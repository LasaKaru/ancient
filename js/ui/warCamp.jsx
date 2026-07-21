/* ============================================================================
   WARRIORS OF TAPROBANE — ui/warCamp.jsx   (v0.3 §2.3 · war-camp hub)
   The camp between battles: the campaign day, a word with the Ten Giants
   (Dasa Maha Yodhayo) of tradition, a chance to spend Renown, and the choice
   to march on (or turn to the field map). Shown after a mainline chapter.
   (JSX-free React.createElement — no build step.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const React = window.__MODULES__.React;
  const h = React.createElement;

  // the Ten Giant Warriors of Dutugemunu, per the Mahavamsa tradition
  const GIANTS = [
    { name: 'Nandhimitra', trait: 'Strongest of the ten — could seize a war-elephant by the tusks.', line: 'Point me at their gate, prince. I will open it with my hands.' },
    { name: 'Suranimala', trait: 'Swift as the monsoon wind; outran the king\'s horses.', line: 'Their scouts will not see me until it is far too late.' },
    { name: 'Mahasona', trait: 'Uprooted young palms bare-handed to clear the road.', line: 'Walls are only trees that forgot how to fall.' },
    { name: 'Gothaimbara', trait: 'The wrestler who threw down the yakkha of the ford.', line: 'Send me their champion. I have thrown worse.' },
    { name: 'Theraputtabhaya', trait: 'Monk turned warrior — first into every breach.', line: 'I have made my peace. Now let us make theirs.' },
    { name: 'Bharana', trait: 'The archer who feared no numbers.', line: 'Give me a quiver and a clear sky; I need nothing more.' },
    { name: 'Velusumana', trait: 'Horseman who tamed the king\'s wild Sindh stallion.', line: 'My mount and I will draw their line thin as thread.' },
    { name: 'Khanjadeva', trait: 'Could lift and hurl a full-grown buffalo.', line: 'Their shields will not like what I throw at them.' },
    { name: 'Phussadeva', trait: 'His war-conch alone could break an enemy\'s nerve.', line: 'One blast, and half of them will run before we strike.' },
    { name: 'Labhiyavasabha', trait: 'Tireless — dug a great tank almost alone.', line: 'I do not tire, my king. March as long as you will.' },
  ];

  function WarCamp({ day, nextTitle, onMarch, onSkills, onMap, onMenu }) {
    const [sel, setSel] = React.useState(0);
    const g = GIANTS[sel];
    const pts = G.Skills ? G.Skills.points() : 0;
    return h('div', { className: 'screen dim fade-in' },
      h('div', { className: 'panel', style: { minWidth: 640, maxWidth: 780 } },
        h('div', { className: 'brief-chapter' }, `THE WAR CAMP · DAY ${day}`),
        h('div', { className: 'brief-title' }, 'The Fires Between Battles'),
        h('div', { className: 'menu-rule' }),
        h('div', { className: 'brief-framing', style: { marginTop: 0 } },
          'The cook-fires burn low and the Ten Giants gather at your tent. Rest, take counsel, and choose the road ahead.'),
        h('div', { className: 'wc-body' },
          h('div', { className: 'wc-roster' },
            h('div', { className: 'brief-objectives-h' }, 'The Ten Giants'),
            GIANTS.map((x, i) => h('button', {
              key: x.name,
              className: 'wc-giant' + (i === sel ? ' sel' : ''),
              onClick: () => { G.audio.ui(); setSel(i); },
            }, x.name))),
          h('div', { className: 'wc-detail' },
            h('div', { className: 'wc-giant-name' }, g.name),
            h('div', { className: 'wc-giant-trait' }, g.trait),
            h('div', { className: 'wc-giant-line' }, '“' + g.line + '”'))),
        h('div', { className: 'menu-rule' }),
        pts > 0
          ? h('button', { className: 'menu-btn', onClick: () => { G.audio.ui(); onSkills(); } }, `Spend Renown — Skills (${pts})`)
          : h('div', { className: 'menu-footnote', style: { marginTop: 0 } }, 'No Renown to spend — win more of the field to earn it.'),
        h('button', { className: 'menu-btn primary', onClick: () => { G.audio.uiConfirm(); onMarch(); } },
          nextTitle ? `March on — ${nextTitle}` : 'March on'),
        onMap ? h('button', { className: 'menu-btn small', onClick: () => { G.audio.ui(); onMap(); } }, 'The Field Map') : null,
        h('button', { className: 'menu-btn small', onClick: () => { G.audio.ui(); onMenu(); } }, 'Return to Menu')));
  }

  G.UI = G.UI || {};
  G.UI.WarCamp = WarCamp;
})();
