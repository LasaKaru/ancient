/* ============================================================================
   RAJARATA / WARRIORS OF TAPROBANE — ui/art.jsx
   Optional key-art image slots. The game ships fully procedural; if a matching
   image file is present under assets/art/ it is faded in, otherwise the
   procedural look shows through. Loading is best-effort — a missing file just
   hides the element (no error surfaces to the player). See assets/README.md
   for the slot paths and a suggested mapping.
   (JSX-free React.createElement — no build step.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const React = window.__MODULES__.React;
  const h = React.createElement;
  G.ART = 'assets/art/';

  /* full-bleed cover art for a screen backdrop (menu / briefing).
     Renders nothing visible until the file actually loads. */
  function KeyArtBg({ name, dim = 0.42 }) {
    const [ok, setOk] = React.useState(false);
    return h('div', { className: 'keyart-bg' + (ok ? ' on' : ''), 'aria-hidden': 'true' },
      h('img', {
        src: G.ART + name, alt: '',
        onLoad: () => setOk(true),
        onError: (e) => { e.currentTarget.style.display = 'none'; },
      }),
      ok ? h('div', { className: 'keyart-scrim', style: { background: `rgba(8,5,2,${dim})` } }) : null);
  }

  /* inline art (e.g. a briefing header banner); hidden until/unless it loads */
  function ArtPanel({ name, className }) {
    const [ok, setOk] = React.useState(false);
    if (!name) return null;
    return h('img', {
      className: 'art-panel ' + (className || '') + (ok ? ' on' : ''),
      src: G.ART + name, alt: '',
      style: ok ? null : { display: 'none' },
      onLoad: () => setOk(true),
      onError: (e) => { e.currentTarget.style.display = 'none'; },
    });
  }

  G.UI = G.UI || {};
  G.UI.KeyArtBg = KeyArtBg;
  G.UI.ArtPanel = ArtPanel;
})();
