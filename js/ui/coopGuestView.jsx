/* ============================================================================
   WARRIORS OF TAPROBANE — ui/coopGuestView.jsx
   Phase M2 — co-op: the guest's live 3D view of the host's battle, and command
   of the ally Giant the host assigns.

   The guest does not run the simulation. It receives the host's authoritative
   SNAPSHOT stream (net/coopSession.js) and rebuilds the battle — one procedural
   `HumanoidRig` per netId, lightly interpolated. When the host sends a POSSESS
   message the guest learns which entity is its Giant: the camera trails that
   Giant, and the guest's keys (WASD move, A/D turn, Space strike) are sent back
   as INPUT for the host to apply on its authoritative sim. Host-authoritative,
   so the guest sees the results of its commands the next snapshot — a real, if
   internet-latency'd, co-op.
   (JSX-free React.createElement — no build step.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const Mods = window.__MODULES__;
  const { React, R3F, THREE } = Mods;
  const h = React.createElement;
  const { Canvas, useThree, useFrame } = R3F;
  const { useRef, useEffect, useState } = React;

  const PAL = { ally: 'ally', enemy: 'enemy', civilian: 'civilian' };
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpAng = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

  function GuestScene({ atmo, mirrorRef, giantRef, inputRef }) {
    const { scene, camera } = useThree();
    const rigsRef = useRef(new Map());
    const hostRef = useRef(null);
    const camRef = useRef({ x: 0, z: 8 });

    useEffect(() => {
      const a = atmo || {};
      scene.background = new THREE.Color(a.skyHorizon != null ? a.skyHorizon : 0xbcc6c2);
      scene.fog = new THREE.Fog(a.fogColor != null ? a.fogColor : 0xbcc6c2, 40, 260);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x4a4230, 1.1);
      const sun = new THREE.DirectionalLight(a.sunColor != null ? a.sunColor : 0xffffff, a.sunIntensity != null ? a.sunIntensity : 2.2);
      const sd = a.sunDir || new THREE.Vector3(0.5, 0.6, 0.2);
      sun.position.set(sd.x * 60, sd.y * 80 + 20, sd.z * 60);
      const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 40), new THREE.MeshStandardMaterial({ color: 0x6f7d47, roughness: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
      scene.add(hemi); scene.add(sun); scene.add(ground);
      return () => { scene.remove(hemi); scene.remove(sun); scene.remove(ground); };
    }, [scene, atmo]);

    useFrame((_, dtRaw) => {
      const dt = Math.min(dtRaw, 0.05);
      const mir = mirrorRef.current; if (!mir) return;
      const rigs = rigsRef.current;
      const k = 1 - Math.pow(0.001, dt);
      const gid = giantRef.current;

      const live = new Set();
      if (mir.npcs) mir.npcs.forEach((n) => {
        live.add(n.id);
        let e = rigs.get(n.id);
        if (!e) {
          const rig = new G.HumanoidRig({ palette: PAL[n.faction] || 'enemy', weapon: n.type === 'archer' ? 'bow' : 'sword', scale: n.type === 'brute' ? 1.15 : 1, cape: n.id === gid });
          scene.add(rig.root);
          e = { rig, cur: { x: n.x, z: n.z, yaw: n.yaw }, spd: 0 };
          rigs.set(n.id, e);
        }
        const dx = n.x - e.cur.x, dz = n.z - e.cur.z;
        e.spd = lerp(e.spd, Math.min(1, Math.hypot(dx, dz) / dt / 5 || 0), 0.2);
        e.cur.x = lerp(e.cur.x, n.x, k); e.cur.z = lerp(e.cur.z, n.z, k); e.cur.yaw = lerpAng(e.cur.yaw, n.yaw, k);
        e.rig.root.position.set(e.cur.x, n.y || 0, e.cur.z);
        e.rig.root.rotation.y = e.cur.yaw;
        e.rig.speedPct = n.alive ? e.spd : 0;
        if (!n.alive && !e.rig.dead) e.rig.playDeath && e.rig.playDeath();
        e.rig.animate(dt);
      });
      rigs.forEach((e, id) => { if (!live.has(id)) { scene.remove(e.rig.root); rigs.delete(id); } });

      if (mir.player) {
        let hp = hostRef.current;
        if (!hp) { const rig = new G.HumanoidRig({ palette: 'ally', weapon: 'sword' }); scene.add(rig.root); hp = hostRef.current = { rig, cur: { x: mir.player.x, z: mir.player.z, yaw: mir.player.yaw }, spd: 0 }; }
        const dx = mir.player.x - hp.cur.x, dz = mir.player.z - hp.cur.z;
        hp.spd = lerp(hp.spd, Math.min(1, Math.hypot(dx, dz) / dt / 5 || 0), 0.2);
        hp.cur.x = lerp(hp.cur.x, mir.player.x, k); hp.cur.z = lerp(hp.cur.z, mir.player.z, k); hp.cur.yaw = lerpAng(hp.cur.yaw, mir.player.yaw, k);
        hp.rig.root.position.set(hp.cur.x, 0, hp.cur.z); hp.rig.root.rotation.y = hp.cur.yaw;
        hp.rig.speedPct = hp.spd; hp.rig.animate(dt);
      }

      // camera trails the possessed Giant (if assigned) else the host
      const g = gid != null && rigs.get(gid);
      const tgt = g ? g.cur : (hostRef.current ? hostRef.current.cur : null);
      if (tgt) {
        const heading = g ? (inputRef.current.yaw || tgt.yaw) : tgt.yaw;   // responsive turning for the commander
        const bx = tgt.x - Math.sin(heading) * 6, bz = tgt.z - Math.cos(heading) * 6;
        camRef.current.x = lerp(camRef.current.x, bx, k * 0.7);
        camRef.current.z = lerp(camRef.current.z, bz, k * 0.7);
        camera.position.set(camRef.current.x, 4.0, camRef.current.z);
        camera.lookAt(tgt.x, 1.4, tgt.z);
      }
    });
    return null;
  }

  function CoopGuestView({ atmo, hostName, levelTitle, onLeave }) {
    const mirrorRef = useRef({ player: null, npcs: new Map() });
    const giantRef = useRef(null);
    const inputRef = useRef({ fwd: 0, strafe: 0, turn: 0, attack: false, yaw: 0 });
    const [count, setCount] = useState(0);
    const [giantName, setGiantName] = useState(null);
    const [ended, setEnded] = useState(false);

    useEffect(() => {
      const peer = G.coopPeer;
      G.__coopGuestMirror = mirrorRef.current; G.__coopSnaps = 0;
      G.__coopInject = (o) => Object.assign(inputRef.current, o);   // test/debug hook
      if (!peer) return;

      const onMsg = (m) => {
        if (!m || !m.t) return;
        if (m.t === G.Coop.MSG.SNAPSHOT) { G.Coop.applySnapshot(m, mirrorRef.current); G.__coopSnaps++; setCount(mirrorRef.current.npcs.size); }
        else if (m.t === 'possess') { giantRef.current = m.id; G.__myGiantId = m.id; setGiantName(m.name || 'your Giant'); }
        else if (m.t === 'end') setEnded(true);
      };
      const onClose = () => setEnded(true);
      peer.on('message', onMsg); peer.on('close', onClose);

      const ip = inputRef.current;
      const set = (code, down) => {
        const v = down ? 1 : 0;
        if (code === 'KeyW' || code === 'ArrowUp') ip.fwd = down ? 1 : 0;
        else if (code === 'KeyS' || code === 'ArrowDown') ip.fwd = down ? -1 : 0;
        else if (code === 'KeyA' || code === 'ArrowLeft') ip.turn = down ? -1 : 0;
        else if (code === 'KeyD' || code === 'ArrowRight') ip.turn = down ? 1 : 0;
        else if (code === 'KeyQ') ip.strafe = down ? -1 : 0;
        else if (code === 'KeyE') ip.strafe = down ? 1 : 0;
        else if (code === 'Space') ip.attack = down;
        else if (code === 'Escape' && down) onLeave();
      };
      const kd = (e) => { set(e.code, true); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); };
      const ku = (e) => set(e.code, false);
      window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

      // send input to the host at ~20 Hz, accumulating our own facing
      let last = performance.now();
      const send = setInterval(() => {
        const now = performance.now(), d = Math.min(0.1, (now - last) / 1000); last = now;
        ip.yaw += ip.turn * 2.6 * d;
        if (peer.connected) peer.send(G.Coop.input({ move: [ip.fwd, ip.strafe], yaw: ip.yaw, attack: ip.attack }));
      }, 50);

      return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); clearInterval(send); };
    }, []);

    const gfx = G.Settings.data.graphics;
    return h('div', { className: 'screen coop-guest-screen' },
      h(Canvas, {
        shadows: true, dpr: Math.min(window.devicePixelRatio || 1, gfx.pixelRatio),
        gl: { antialias: true, powerPreference: 'high-performance' },
        camera: { fov: gfx.fov || 70, near: 0.08, far: 1400, position: [0, 4, 8] },
        style: { position: 'fixed', inset: 0 },
        onCreated: ({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; },
      }, h(GuestScene, { atmo, mirrorRef, giantRef, inputRef })),
      h('div', { className: 'coop-guest-hud' },
        h('div', { className: 'cg-title' }, giantName ? '⚔ CO-OP — YOU COMMAND' : '⚔ SPECTATING'),
        h('div', { className: 'cg-sub' }, giantName ? giantName + ' (co-op)' : (hostName || 'your ally') + (levelTitle ? ' · ' + levelTitle : '')),
        h('div', { className: 'cg-count' }, count + ' warriors afield' + (giantName ? '  ·  WASD move · A/D turn · Space strike' : '')),
        ended ? h('div', { className: 'cg-ended' }, 'The battle has ended or the link closed.') : null,
        h('button', { className: 'menu-btn small', onClick: onLeave }, ended ? 'Back' : 'Leave (Esc)')));
  }

  G.UI = G.UI || {};
  G.UI.CoopGuestView = CoopGuestView;
})();
