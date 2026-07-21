/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — ui/regionMap.jsx   (v0.4 §3.2)
   The in-field map: press M for a hand-drawn parchment chart of the current
   mission area — the player's position and facing, objective markers (with ✓
   seals), the entry point, and enemy presence — in the same engraved,
   aged-parchment language as the Taprobane campaign chart. Pauses the battle.
   (JSX-free React.createElement — no build step.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const React = window.__MODULES__.React;
  const h = React.createElement;

  function paint(canvas, data) {
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    c.clearRect(0, 0, W, H);

    // --- aged parchment ---
    const grad = c.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.72);
    grad.addColorStop(0, '#e9d8ad'); grad.addColorStop(0.7, '#dcc793'); grad.addColorStop(1, '#c3a86f');
    c.fillStyle = grad; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) {   // foxing / grain
      c.fillStyle = Math.random() < 0.5 ? 'rgba(90,60,25,0.05)' : 'rgba(255,250,230,0.05)';
      c.beginPath(); c.arc(Math.random() * W, Math.random() * H, Math.random() * 1.8, 0, 7); c.fill();
    }
    c.strokeStyle = 'rgba(70,45,20,0.6)'; c.lineWidth = 4; c.strokeRect(10, 10, W - 20, H - 20);
    c.lineWidth = 1; c.strokeRect(16, 16, W - 32, H - 32);

    const pad = 40;
    const size = Math.min(W, H) - pad * 2;
    const ox = (W - size) / 2, oy = (H - size) / 2;
    const B = data.bounds || 70;
    // world (x, z) → canvas; north (−z) is up
    const toXY = (wx, wz) => [ox + (wx / B * 0.5 + 0.5) * size, oy + (wz / B * 0.5 + 0.5) * size];

    // faint survey grid
    c.strokeStyle = 'rgba(80,55,25,0.18)'; c.lineWidth = 1;
    for (let g = -B; g <= B; g += B / 4) {
      const [gx] = toXY(g, 0), [, gy] = toXY(0, g);
      c.beginPath(); c.moveTo(gx, oy); c.lineTo(gx, oy + size); c.stroke();
      c.beginPath(); c.moveTo(ox, gy); c.lineTo(ox + size, gy); c.stroke();
    }

    // enemy presence — inked marks
    c.fillStyle = 'rgba(150,30,20,0.75)';
    for (const e of data.enemies) {
      const [x, y] = toXY(e.x, e.z);
      c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill();
    }

    // entry point (spawn) — a small pennant
    if (data.spawn) {
      const [x, y] = toXY(data.spawn.x, data.spawn.z);
      c.strokeStyle = '#5a4020'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 14); c.stroke();
      c.fillStyle = '#7a6a3a'; c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x + 10, y - 11); c.lineTo(x, y - 8); c.fill();
    }

    // objective markers — gold diamonds, sealed with ✓ when done
    for (const o of data.objectives) {
      const [x, y] = toXY(o.x, o.z);
      c.save(); c.translate(x, y); c.rotate(Math.PI / 4);
      c.fillStyle = o.done ? 'rgba(90,120,70,0.9)' : o.optional ? 'rgba(180,150,70,0.75)' : 'rgba(196,150,44,0.95)';
      c.strokeStyle = '#4a3410'; c.lineWidth = 1.5;
      c.fillRect(-6, -6, 12, 12); c.strokeRect(-6, -6, 12, 12);
      c.restore();
      if (o.done) { c.fillStyle = '#2f3d20'; c.font = 'bold 12px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✓', x, y + 0.5); }
    }

    // player — a red arrowhead pointing where they face (yaw 0 → north/−z → up)
    {
      const [x, y] = toXY(data.player.x, data.player.z);
      c.save(); c.translate(x, y); c.rotate(data.player.yaw);   // screen-up is −z; yaw rotates about +y
      c.fillStyle = '#b8321e'; c.strokeStyle = '#3a1208'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, -11); c.lineTo(7, 8); c.lineTo(0, 4); c.lineTo(-7, 8); c.closePath();
      c.fill(); c.stroke();
      c.restore();
    }

    // compass rose (top-right)
    const rx = W - 52, ry = 52, rr = 22;
    c.strokeStyle = '#5a4020'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(rx, ry, rr, 0, 7); c.stroke();
    c.fillStyle = '#7a1e12';
    c.beginPath(); c.moveTo(rx, ry - rr); c.lineTo(rx + 5, ry); c.lineTo(rx - 5, ry); c.closePath(); c.fill();
    c.fillStyle = '#5a4020'; c.font = 'bold 12px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('N', rx, ry - rr - 9);
  }

  function RegionMap({ engine, onClose }) {
    const ref = React.useRef(null);
    const data = React.useMemo(() => (engine ? engine.getMapData() : null), [engine]);
    React.useEffect(() => {
      if (ref.current && data) paint(ref.current, data);
    }, [data]);
    if (!data) return null;

    return h('div', { className: 'screen dim fade-in', style: { zIndex: 72 }, onClick: onClose },
      h('div', { className: 'panel region-map', style: { minWidth: 560 }, onClick: (e) => e.stopPropagation() },
        h('div', { className: 'brief-chapter' }, `MISSION MAP · DAY ${data.day}${data.timeLine ? ' · ' + data.timeLine : ''}`),
        h('div', { className: 'brief-title', style: { fontSize: 24 } }, data.title || 'The Field'),
        h('div', { className: 'menu-rule' }),
        h('canvas', { ref, width: 520, height: 520, className: 'region-canvas' }),
        h('div', { className: 'region-legend' },
          h('span', null, h('i', { className: 'lg-player' }), 'You'),
          h('span', null, h('i', { className: 'lg-obj' }), 'Objective'),
          h('span', null, h('i', { className: 'lg-obj done' }), 'Done'),
          h('span', null, h('i', { className: 'lg-foe' }), 'Enemy'),
          h('span', null, h('i', { className: 'lg-spawn' }), 'Entry')),
        h('button', { className: 'menu-btn small primary', style: { marginTop: 8 }, onClick: () => { G.audio.ui(); onClose(); } }, 'Close (M)')));
  }

  G.UI = G.UI || {};
  G.UI.RegionMap = RegionMap;
})();
