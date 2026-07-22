/* ============================================================================
   WARRIORS OF TAPROBANE — ui/coopGuestView.jsx
   Phase M2 — co-op spectate: the guest's live 3D view of the host's battle.

   The guest does not run the simulation. It receives the host's authoritative
   SNAPSHOT stream over the WebRTC DataChannel (net/coopSession.js) and rebuilds
   the battle from it — one procedural `HumanoidRig` per netId (the host's player
   and every NPC), positioned each frame from the mirror (lightly interpolated so
   the 15 Hz stream looks smooth), with the camera trailing the host. This is the
   spectate slice; possession (the guest driving an ally Giant, its input applied
   on the host) rides the same mirror and is the next step.
   (JSX-free React.createElement — no build step.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const M = window.__MODULES__;
  const { React, R3F, THREE } = M;
  const h = React.createElement;
  const { Canvas, useThree, useFrame } = R3F;
  const { useRef, useEffect, useState } = React;

  const PAL = { ally: 'ally', enemy: 'enemy', civilian: 'civilian' };
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpAng = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

  function GuestScene({ atmo, mirrorRef }) {
    const { scene, camera } = useThree();
    const rigsRef = useRef(new Map());     // netId -> { rig, cur:{x,z,yaw}, spd }
    const hostRef = useRef(null);          // { rig, cur:{x,z,yaw} }
    const camRef = useRef({ x: 0, z: 8 });

    useEffect(() => {
      const a = atmo || {};
      scene.background = new THREE.Color(a.skyHorizon != null ? a.skyHorizon : 0xbcc6c2);
      scene.fog = new THREE.Fog(a.fogColor != null ? a.fogColor : 0xbcc6c2, 40, 260);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x4a4230, 1.1);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(a.sunColor != null ? a.sunColor : 0xffffff, a.sunIntensity != null ? a.sunIntensity : 2.2);
      const sd = a.sunDir || new THREE.Vector3(0.5, 0.6, 0.2);
      sun.position.set(sd.x * 60, sd.y * 80 + 20, sd.z * 60); scene.add(sun);
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(220, 40),
        new THREE.MeshStandardMaterial({ color: 0x6f7d47, roughness: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
      return () => { scene.remove(hemi); scene.remove(sun); scene.remove(ground); };
    }, [scene, atmo]);

    useFrame((_, dtRaw) => {
      const dt = Math.min(dtRaw, 0.05);
      const mir = mirrorRef.current;
      if (!mir) return;
      const rigs = rigsRef.current;
      const k = 1 - Math.pow(0.001, dt);     // smoothing toward the latest snapshot

      // ---- NPCs ----
      const live = new Set();
      if (mir.npcs) mir.npcs.forEach((n) => {
        live.add(n.id);
        let e = rigs.get(n.id);
        if (!e) {
          const rig = new G.HumanoidRig({ palette: PAL[n.faction] || 'enemy', weapon: n.type === 'archer' ? 'bow' : 'sword', scale: n.type === 'brute' ? 1.15 : 1 });
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
      // drop despawned
      rigs.forEach((e, id) => { if (!live.has(id)) { scene.remove(e.rig.root); rigs.delete(id); } });

      // ---- host player ----
      if (mir.player) {
        let hp = hostRef.current;
        if (!hp) {
          const rig = new G.HumanoidRig({ palette: 'ally', weapon: 'sword', cape: true });
          scene.add(rig.root);
          hp = hostRef.current = { rig, cur: { x: mir.player.x, z: mir.player.z, yaw: mir.player.yaw }, spd: 0 };
        }
        const dx = mir.player.x - hp.cur.x, dz = mir.player.z - hp.cur.z;
        hp.spd = lerp(hp.spd, Math.min(1, Math.hypot(dx, dz) / dt / 5 || 0), 0.2);
        hp.cur.x = lerp(hp.cur.x, mir.player.x, k); hp.cur.z = lerp(hp.cur.z, mir.player.z, k); hp.cur.yaw = lerpAng(hp.cur.yaw, mir.player.yaw, k);
        hp.rig.root.position.set(hp.cur.x, 0, hp.cur.z);
        hp.rig.root.rotation.y = hp.cur.yaw;
        hp.rig.speedPct = hp.spd; hp.rig.animate(dt);

        // trailing spectate camera behind the host
        const bx = hp.cur.x - Math.sin(hp.cur.yaw) * 6, bz = hp.cur.z - Math.cos(hp.cur.yaw) * 6;
        camRef.current.x = lerp(camRef.current.x, bx, k * 0.6);
        camRef.current.z = lerp(camRef.current.z, bz, k * 0.6);
        camera.position.set(camRef.current.x, 4.2, camRef.current.z);
        camera.lookAt(hp.cur.x, 1.4, hp.cur.z);
      }
    });
    return null;
  }

  function CoopGuestView({ atmo, hostName, levelTitle, onLeave }) {
    const mirrorRef = useRef({ player: null, npcs: new Map() });
    const [count, setCount] = useState(0);
    const [ended, setEnded] = useState(false);

    useEffect(() => {
      const peer = G.coopPeer;
      G.__coopGuestMirror = mirrorRef.current;   // observability for tests / debug
      G.__coopSnaps = 0;
      if (!peer) return;
      const onMsg = (m) => {
        if (!m || !m.t) return;
        if (m.t === G.Coop.MSG.SNAPSHOT) { G.Coop.applySnapshot(m, mirrorRef.current); G.__coopSnaps++; setCount(mirrorRef.current.npcs.size); }
        else if (m.t === 'end') setEnded(true);
      };
      peer.on('message', onMsg);
      const onClose = () => setEnded(true);
      peer.on('close', onClose);
      const key = (e) => { if (e.code === 'Escape') onLeave(); };
      window.addEventListener('keydown', key);
      return () => { window.removeEventListener('keydown', key); };
    }, []);

    const gfx = G.Settings.data.graphics;
    return h('div', { className: 'screen coop-guest-screen' },
      h(Canvas, {
        shadows: true, dpr: Math.min(window.devicePixelRatio || 1, gfx.pixelRatio),
        gl: { antialias: true, powerPreference: 'high-performance' },
        camera: { fov: gfx.fov || 70, near: 0.08, far: 1400, position: [0, 4, 8] },
        style: { position: 'fixed', inset: 0 },
        onCreated: ({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; },
      }, h(GuestScene, { atmo, mirrorRef })),
      h('div', { className: 'coop-guest-hud' },
        h('div', { className: 'cg-title' }, '⚔ SPECTATING'),
        h('div', { className: 'cg-sub' }, (hostName || 'your ally') + (levelTitle ? ' · ' + levelTitle : '')),
        h('div', { className: 'cg-count' }, count + ' warriors afield'),
        ended ? h('div', { className: 'cg-ended' }, 'The battle has ended or the link closed.') : null,
        h('button', { className: 'menu-btn small', onClick: onLeave }, ended ? 'Back' : 'Leave (Esc)')));
  }

  G.UI = G.UI || {};
  G.UI.CoopGuestView = CoopGuestView;
})();
