/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — ghost.js  (roadmap v1.1 M1, completing the
   asynchronous-multiplayer phase)

   "Race your ghost." Because a Challenge Code makes a War of Ages fight
   perfectly reproducible (js/challenge.js), the path your best run took
   through that exact fight is meaningful — so we record it and, next time you
   take up the same code, replay it as a translucent spectral warrior fighting
   the same waves beside you. Beat your own ghost's score to overwrite it.

   Storage is keyed by the challenge code, so a ghost only ever haunts the
   fight it belongs to. Everything is localStorage + primitives — no server,
   no build step (works from file://).
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;

  const INTERVAL = 0.125;        // 8 Hz sampling — smooth enough, compact enough
  const MAX_SAMPLES = 3200;      // ~6.5 min cap so localStorage never bloats
  const MELEE_ORDER = ['sword', 'spear', 'axe', 'mace', 'dagger'];

  /* ------------------------------ recorder ------------------------------ */
  class GhostRecorder {
    constructor() { this.samples = []; this.acc = 0; this.on = false; }
    start() { this.on = true; this.acc = 0; this.samples.length = 0; }
    stop() { this.on = false; }

    sample(engine, dt) {
      if (!this.on || this.samples.length >= MAX_SAMPLES) return;
      this.acc += dt;
      if (this.acc < INTERVAL) return;
      this.acc -= INTERVAL;
      const p = engine.player, c = engine.combat, pos = p.feetPos;
      const weapon = c.weapon === 'bow' ? 5 : Math.max(0, MELEE_ORDER.indexOf(c.weapon));
      let action = 0;
      if (c.attacking) action = 1;
      else if (p.blocking) action = 2;
      else if (c.drawing) action = 3;
      // [x, y, z, yaw, flags]  (flags = weapon 0-5 + action*10)
      this.samples.push([
        +pos.x.toFixed(2), +Math.max(0, pos.y).toFixed(2), +pos.z.toFixed(2),
        +p.yaw.toFixed(2), weapon + action * 10,
      ]);
    }
  }
  G.GhostRecorder = GhostRecorder;

  /* ------------------------------ replay body ------------------------------ */
  class GhostReplay {
    constructor(engine, data) {
      this.engine = engine;
      this.samples = data.samples || [];
      this.score = data.score || 0;
      this.t = 0; this.on = false; this.done = false;
      this._lastAtk = false; this._lastDraw = false;

      this.rig = new G.HumanoidRig({ palette: 'ally', weapon: 'sword', shield: true, plume: true, tintCloth: 0x2a7a8c });
      this.rig.root.traverse((c) => {
        if (c.isMesh && c.material) {
          c.material = c.material.clone();
          c.material.transparent = true;
          c.material.opacity = 0.38;
          c.material.depthWrite = false;
          if (c.material.emissive) { c.material.emissive = new THREE.Color(0x2a7a8c); c.material.emissiveIntensity = 0.5; }
        }
      });
      this.rig.root.visible = false;
      engine.scene.add(this.rig.root);
      this.label = G.util.makeLabel('◇ your ghost · ' + this.score.toLocaleString(), '#8fe6e6');
      this.label.position.y = 2.2;
      this.rig.root.add(this.label);
    }

    start() {
      if (!this.samples.length) return;
      this.on = true; this.t = 0; this.done = false;
      this.rig.root.visible = true;
      this.engine.ui.toast('👻 RACING YOUR GHOST — beat ' + this.score.toLocaleString());
    }

    update(engine, dt) {
      if (!this.on || this.done) return;
      this.t += dt;
      const f = this.t / INTERVAL;
      const i = Math.floor(f);
      if (i >= this.samples.length - 1) {           // the ghost's run is over
        this.rig.root.visible = false;
        this.done = true;
        return;
      }
      const a = this.samples[i], b = this.samples[i + 1], k = f - i;
      const x = a[0] + (b[0] - a[0]) * k;
      const y = a[1] + (b[1] - a[1]) * k;
      const z = a[2] + (b[2] - a[2]) * k;
      this.rig.root.position.set(x, y, z);
      this.rig.root.rotation.y = G.util.angleLerp(a[3], b[3], k);

      const dist = Math.hypot(b[0] - a[0], b[2] - a[2]);
      this.rig.speedPct = Math.min(1, (dist / INTERVAL) / 6.5);
      const action = Math.floor(a[4] / 10);
      const weapon = (a[4] % 10) === 5 ? 'bow' : 'sword';
      if (this.rig.currentWeapon !== weapon) this.rig.setWeapon(weapon);
      this.rig.posture = (action || this.rig.speedPct > 0.4) ? 'combat' : 'relaxed';
      if (action === 1 && !this._lastAtk) this.rig.playStrike();
      if (action === 3 && !this._lastDraw) this.rig.playBowDraw();
      this._lastAtk = action === 1;
      this._lastDraw = action === 3;
      this.rig.animate(dt);
      this.label.lookAt(engine.camera.position);
    }

    dispose() {
      if (this.rig.root.parent) this.rig.root.parent.remove(this.rig.root);
    }
  }
  G.GhostReplay = GhostReplay;

  /* ------------------------------ storage ------------------------------ */
  G.Ghost = {
    _key(code) { return 'rajarata_ghost_' + String(code || '').toUpperCase(); },

    /** the stored ghost for this exact fight, or null */
    load(code) {
      if (!code) return null;
      try { const raw = localStorage.getItem(this._key(code)); return raw ? JSON.parse(raw) : null; }
      catch (_) { return null; }
    },

    /** keep the run only if it beats the stored ghost for this code; → saved? */
    save(code, score, samples) {
      if (!code || !samples || !samples.length) return false;
      const cur = this.load(code);
      if (cur && cur.score >= score) return false;
      try { localStorage.setItem(this._key(code), JSON.stringify({ code, score: score | 0, samples })); return true; }
      catch (_) { return false; }
    },
  };
})();
