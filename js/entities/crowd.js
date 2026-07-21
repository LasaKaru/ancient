/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — entities/crowd.js   (v0.3 §2.4 / v0.5)
   Ambient civilian crowds that give a settlement life — villagers who wander
   a small daily beat (idle at a well, work a market stall, stroll a lane) and
   scatter in panic when battle erupts. They also enable the Assassin's-Creed
   "social blend": stand quiet among a knot of civilians and the enemy's eye
   slides past you (see enemyAI._canSee).
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  const TINTS = [0xcaa16a, 0x9c8f6a, 0xb08d5a, 0x8a7c62, 0xc2b48a, 0x7a5c3a, 0xa8925e];

  class Civilian {
    constructor(engine, { pos = [0, 0], roam = 6, tint = 0xb08d5a, rng = Math.random } = {}) {
      this.engine = engine;
      this.faction = 'civilian';
      this.alive = true;
      this.rng = rng;
      this.rig = new G.HumanoidRig({ palette: 'civilian', weapon: 'none', shield: false, helmet: false, tintCloth: tint });
      this.rig.root.position.set(pos[0], 0, pos[1]);
      engine.scene.add(this.rig.root);
      this.home = new THREE.Vector3(pos[0], 0, pos[1]);
      this.roam = roam;
      this.state = 'idle';
      this.stateT = rng() * 3;
      this.target = null;
      this.yaw = rng() * Math.PI * 2;
      this.speed = 0;
      this.chore = rng() < 0.4 ? 'work' : 'relaxed';   // some tend a stall / draw water
    }

    get pos() { const p = this.rig.root.position; return new THREE.Vector3(p.x, p.y + 1.1, p.z); }

    /* civilians don't fight — a blow (or a near miss) sends them running */
    takeDamage() { this.panic(); }
    panic() { if (this.state !== 'flee') { this.state = 'flee'; this.stateT = 4.5; this.target = null; } }

    update(dt) {
      const eng = this.engine, root = this.rig.root;
      this.stateT -= dt;
      const playerD = eng.player ? U.flatDist(root.position, eng.player.feetPos) : 99;

      // battle nearby, or a sprinting warrior at your shoulder → flee
      if (this.state !== 'flee' && ((eng.combatIntensity > 0.45 && playerD < 26) || (playerD < 2 && eng.player.sprinting))) {
        this.panic();
      }

      if (this.state === 'flee') {
        // run away from the nearest fright (the player, or the arena centre)
        if (!this.target) {
          const away = new THREE.Vector3().subVectors(root.position, eng.player ? eng.player.feetPos : new THREE.Vector3()).setY(0);
          if (away.lengthSq() < 0.01) away.set(1, 0, 0);
          this.target = root.position.clone().addScaledVector(away.normalize(), 20);
        }
        this._moveTo(this.target, dt, 5.4);
        if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 2 + this.rng() * 3; this.target = null; }
      } else if (this.state === 'idle') {
        this.speed = U.damp(this.speed, 0, 6, dt);
        this.rig.posture = this.chore === 'work' ? 'work' : 'relaxed';
        if (this.stateT <= 0) {                       // pick the next spot on the beat
          this.state = 'walk'; this.stateT = 4 + this.rng() * 5;
          const a = this.rng() * Math.PI * 2, r = this.rng() * this.roam;
          this.target = this.home.clone().add(new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
        }
      } else {                                        // walk
        this.rig.posture = 'relaxed';
        const done = this._moveTo(this.target, dt, 1.5);
        if (done || this.stateT <= 0) { this.state = 'idle'; this.stateT = 2.5 + this.rng() * 4; }
      }

      this.rig.speedPct = U.clamp(this.speed / 6.5, 0, 1);
      this.rig.animate(dt);
    }

    _moveTo(target, dt, sp) {
      const root = this.rig.root;
      if (!target) return true;
      const to = new THREE.Vector3().subVectors(target, root.position).setY(0);
      const d = to.length();
      if (d < 0.4) { this.speed = U.damp(this.speed, 0, 6, dt); return true; }
      to.normalize();
      root.position.addScaledVector(to, Math.min(sp * dt, d));
      this.yaw = U.angleLerp(this.yaw, Math.atan2(to.x, to.z), Math.min(1, dt * 6));
      root.rotation.y = this.yaw;
      this.speed = U.damp(this.speed, sp, 6, dt);
      // stay inside the arena/level bounds
      const bounds = (this.engine.terrain ? this.engine.terrain.opts.bounds : 70) - 3;
      if (root.position.length() > bounds) root.position.setLength(bounds);
      return false;
    }

    dispose() { if (this.rig.root.parent) this.rig.root.parent.remove(this.rig.root); }
  }
  G.Civilian = Civilian;

  G.Crowd = {
    /** populate(engine, { count, center:[x,z], area, roam }) */
    populate(engine, cfg = {}) {
      engine.crowd = engine.crowd || [];
      const n = cfg.count || 8;
      const center = cfg.center || [0, 0];
      const area = cfg.area || 26;
      const rng = U.mulberry((engine.levelId || 'x').length * 97 + 13);
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2, r = 3 + rng() * area;
        engine.crowd.push(new Civilian(engine, {
          pos: [center[0] + Math.sin(a) * r, center[1] + Math.cos(a) * r],
          roam: cfg.roam || (5 + rng() * 6),
          tint: TINTS[Math.floor(rng() * TINTS.length)], rng,
        }));
      }
    },
  };
})();
