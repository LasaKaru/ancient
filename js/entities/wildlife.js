/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — entities/wildlife.js  (added in v0.2)
   Living-world layer: ambient animals (peafowl, spotted deer) that wander and
   flee from battle, gatherable healing-herb plants, and the RIDEABLE WAR
   ELEPHANT — mount with F, steer with WASD, trample enemies and barricades,
   fight from the howdah, dismount with F.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE, CANNON } = window.__MODULES__;
  const U = G.util, M = G.Mats;

  /* ============================= CRITTERS ============================= */
  class Critter {
    constructor(engine, { type = 'peacock', pos = [0, 0] } = {}) {
      this.engine = engine;
      this.type = type;
      this.group = new THREE.Group();
      this.home = new THREE.Vector3(pos[0], 0, pos[1]);
      this.group.position.copy(this.home);
      this.yaw = U.rand(0, Math.PI * 2);
      this.state = 'idle';
      this.stateT = U.rand(0, 2);
      this.target = null;
      this.speed = 0;
      this.phase = U.rand(0, 9);
      this.timid = 1;              // >1 skittish, <1 unbothered (set per species)
      this._build();
      engine.scene.add(this.group);
    }

    _build() {
      const g = this.group;
      if (this.type === 'peacock') {
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M.std({ color: 0x1a4a8c, rough: 0.55 }));
        body.scale.set(1, 0.85, 1.4); body.position.y = 0.3;
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 6), M.std({ color: 0x1d5aa0, rough: 0.5 }));
        neck.position.set(0, 0.5, 0.16); neck.rotation.x = -0.3;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), M.std({ color: 0x1d5aa0, rough: 0.5 }));
        head.position.set(0, 0.64, 0.22);
        const crest = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), M.std({ color: 0x2a8c5a, rough: 0.6 }));
        crest.position.set(0, 0.72, 0.22);
        // tail fan (folded by default, fans when displaying)
        const fanTex = M.canvasTex('peafan', 128, (c, s) => {
          c.fillStyle = '#1e6e46'; c.fillRect(0, 0, s, s);
          for (let i = 0; i < 26; i++) {
            const x = Math.random() * s, y = Math.random() * s;
            c.fillStyle = '#123c8c'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill();
            c.fillStyle = '#2aa06a'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill();
            c.fillStyle = '#d8a94e'; c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill();
          }
        });
        this.fan = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18, Math.PI * 0.15, Math.PI * 0.7),
          M.std({ map: fanTex, rough: 0.8, side: THREE.DoubleSide }));
        this.fan.position.set(0, 0.32, -0.2);
        this.fan.rotation.x = -0.4;
        this.fan.scale.set(0.25, 0.25, 1);   // folded
        for (const s of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 4), M.std({ color: 0x7c6a3a, rough: 0.8 }));
          leg.position.set(s * 0.06, 0.12, 0);
          g.add(leg);
        }
        g.add(body, neck, head, crest, this.fan);
        this.wanderR = 8; this.walkSpeed = 1.1; this.fleeSpeed = 3.4;
      } else if (this.type === 'monkey') {   // toque macaque
        const fur = M.std({ color: 0x8a6a3e, rough: 0.9, flat: true });
        const faceMat = M.std({ color: 0xcaa87c, rough: 0.8 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), fur);
        body.scale.set(0.9, 1.05, 1.1); body.position.y = 0.34;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 6), fur); head.position.set(0, 0.54, 0.06);
        const face = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), faceMat); face.scale.z = 0.7; face.position.set(0, 0.52, 0.13);
        // long curling tail
        this.tail = new THREE.Group();
        let prev = this.tail;
        for (let i = 0; i < 5; i++) {
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.12, 5), fur);
          seg.position.y = -0.1; seg.rotation.x = 0.5;
          const pivot = new THREE.Group(); pivot.position.y = i === 0 ? 0.3 : -0.1; pivot.add(seg);
          prev.add(pivot); prev = pivot;
        }
        this.tail.position.set(0, 0.34, -0.12); g.add(this.tail);
        this.legs = [];
        for (const [lx, lz] of [[-0.08, 0.06], [0.08, 0.06], [-0.08, -0.06], [0.08, -0.06]]) {
          const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.26, 5), fur);
          limb.position.set(lx, 0.14, lz); this.legs.push(limb); g.add(limb);
        }
        g.add(body, head, face);
        this.wanderR = 6; this.walkSpeed = 1.5; this.fleeSpeed = 4.6; this.timid = 1.3;
      } else if (this.type === 'buffalo') {   // water buffalo
        const hide = M.std({ color: 0x40403c, rough: 0.9, flat: true });
        const horn = M.std({ color: 0xb9b0a0, rough: 0.6 });
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.85, 4, 8), hide);
        body.rotation.z = Math.PI / 2; body.position.y = 0.95;
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.4, 7), hide);
        neck.position.set(0, 0.92, 0.62); neck.rotation.x = 1.1;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.5), hide);
        head.position.set(0, 0.82, 0.92);
        for (const s of [-1, 1]) {   // sweeping horns
          const h1 = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 5, 10, Math.PI * 0.8), horn);
          h1.position.set(s * 0.14, 0.98, 0.9); h1.rotation.set(0.2, 0, s * 1.1); g.add(h1);
        }
        this.legs = [];
        for (const [lx, lz] of [[-0.24, 0.5], [0.24, 0.5], [-0.24, -0.5], [0.24, -0.5]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.95, 6), hide);
          leg.position.set(lx, 0.47, lz); this.legs.push(leg); g.add(leg);
        }
        g.add(body, neck, head);
        this.wanderR = 10; this.walkSpeed = 1.0; this.fleeSpeed = 3.0; this.timid = 0.55;
      } else if (this.type === 'crocodile') {   // mugger crocodile, low and still
        const scaleMat = M.std({ color: 0x40543a, rough: 0.95, flat: true });
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.0, 4, 8), scaleMat);
        body.rotation.z = Math.PI / 2; body.position.y = 0.2; body.scale.set(1, 0.7, 1);
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.5), scaleMat); snout.position.set(0, 0.18, 0.78);
        // segmented tail
        this.tail = new THREE.Group();
        let prev = this.tail;
        for (let i = 0; i < 5; i++) {
          const seg = new THREE.Mesh(new THREE.ConeGeometry(0.16 - i * 0.025, 0.24, 5), scaleMat);
          seg.rotation.x = -Math.PI / 2; seg.position.z = -0.12;
          const pivot = new THREE.Group(); pivot.position.z = i === 0 ? -0.55 : -0.22; pivot.add(seg);
          prev.add(pivot); prev = pivot;
        }
        this.tail.position.set(0, 0.2, 0); g.add(this.tail);
        this.legs = [];
        for (const [lx, lz] of [[-0.26, 0.32], [0.26, 0.32], [-0.26, -0.28], [0.26, -0.28]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.2, 5), scaleMat);
          leg.position.set(lx, 0.1, lz); leg.rotation.z = lx < 0 ? 0.8 : -0.8; this.legs.push(leg); g.add(leg);
        }
        g.add(body, snout);
        this.wanderR = 4; this.walkSpeed = 0.55; this.fleeSpeed = 2.2; this.timid = 0.4;
      } else { // spotted deer
        const hideTex = M.canvasTex('deerhide', 64, (c, s) => {
          c.fillStyle = '#9c6b3a'; c.fillRect(0, 0, s, s);
          c.fillStyle = '#e8dcc0';
          for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(Math.random() * s, Math.random() * s, 1.6, 0, 7); c.fill(); }
        });
        const hide = M.std({ map: hideTex, rough: 0.85 });
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), hide);
        body.rotation.z = Math.PI / 2; body.position.y = 0.62;
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.38, 6), hide);
        neck.position.set(0, 0.85, 0.34); neck.rotation.x = -0.5;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), hide);
        head.scale.z = 1.5; head.position.set(0, 1.0, 0.46);
        for (const s of [-1, 1]) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.26, 4), M.std({ color: 0x6a5030, rough: 0.8 }));
          ant.position.set(s * 0.05, 1.14, 0.4); ant.rotation.z = s * 0.5; ant.rotation.x = -0.3;
          g.add(ant);
        }
        this.legs = [];
        for (const [lx, lz] of [[-0.12, 0.28], [0.12, 0.28], [-0.12, -0.28], [0.12, -0.28]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.6, 5), hide);
          leg.position.set(lx, 0.3, lz);
          this.legs.push(leg);
          g.add(leg);
        }
        g.add(body, neck, head);
        this.wanderR = 14; this.walkSpeed = 1.6; this.fleeSpeed = 6.5;
      }
      g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    }

    update(dt) {
      const eng = this.engine, g = this.group;
      this.stateT -= dt;
      this.phase += dt * (2 + this.speed * 3);
      const playerD = eng.player ? U.flatDist(g.position, eng.player.feetPos) : 99;

      // startled by nearby sprinting players or by battle (species-dependent nerve)
      const tm = this.timid;
      const scared = (playerD < 5 * tm && eng.player.sprinting) || playerD < 2.2 * tm ||
        (eng.combatIntensity > 0.5 && playerD < 22 * tm);
      if (scared && this.state !== 'flee') {
        this.state = 'flee'; this.stateT = 3.5;
        const away = new THREE.Vector3().subVectors(g.position, eng.player.feetPos).setY(0).normalize();
        if (away.lengthSq() < 0.01) away.set(1, 0, 0);
        this.target = g.position.clone().addScaledVector(away, 18);
        if (this.fan) this.fan.scale.set(0.25, 0.25, 1);
      }

      if (this.state === 'idle') {
        this.speed = U.damp(this.speed, 0, 6, dt);
        if (this.fan && this.stateT < 1.4) this.fan.scale.set(1, 1, 1);       // display!
        if (this.stateT <= 0) {
          this.state = 'wander'; this.stateT = U.rand(3, 7);
          const a = U.rand(0, Math.PI * 2);
          this.target = this.home.clone().add(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(U.rand(2, this.wanderR)));
          if (this.fan) this.fan.scale.set(0.25, 0.25, 1);
        }
      } else {
        const sp = this.state === 'flee' ? this.fleeSpeed : this.walkSpeed;
        const to = new THREE.Vector3().subVectors(this.target, g.position).setY(0);
        const d = to.length();
        if (d < 0.4 || this.stateT <= 0) {
          this.state = 'idle';
          this.stateT = U.rand(2, 6);
          if (this.state !== 'flee') this.home.copy(g.position);
        } else {
          to.normalize();
          g.position.addScaledVector(to, Math.min(sp * dt, d));
          this.yaw = U.angleLerp(this.yaw, Math.atan2(to.x, to.z), Math.min(1, dt * 6));
          this.speed = U.damp(this.speed, sp / this.fleeSpeed, 6, dt);
          // keep inside the arena
          const bounds = (eng.terrain ? eng.terrain.opts.bounds : 70) - 4;
          if (g.position.length() > bounds) g.position.setLength(bounds);
        }
      }
      g.rotation.y = this.yaw;
      // gait bob + leg swing
      g.position.y = Math.abs(Math.sin(this.phase * 3)) * 0.05 * this.speed;
      if (this.legs) {
        const sw = Math.sin(this.phase * 4) * 0.5 * this.speed;
        this.legs[0].rotation.x = sw; this.legs[3].rotation.x = sw;
        this.legs[1].rotation.x = -sw; this.legs[2].rotation.x = -sw;
      }
      if (this.tail) {   // idle tail sway (crocodile sweeps, monkey flicks)
        this.tail.rotation.y = Math.sin(this.phase * (this.type === 'crocodile' ? 1.5 : 3)) * (this.type === 'crocodile' ? 0.35 : 0.6);
      }
    }
  }

  /* ========================= RIDEABLE ELEPHANT ========================= */
  class ElephantMount {
    constructor(engine, { pos = [0, 0], yaw = 0, name = 'War Elephant' } = {}) {
      this.engine = engine;
      this.group = G.Build.elephant(engine, { pos, yaw, armored: true, scale: 1.1, mobile: true });
      this.yaw = yaw;
      this.speed = 0;
      this.turn = 0;
      this.ridden = false;
      this.phase = 0;
      this._trampled = new Map();
      this._trumpetCd = 0;
      this._stepT = 0;

      this.body = new CANNON.Body({
        mass: 0, type: CANNON.Body.KINEMATIC,
        shape: new CANNON.Box(new CANNON.Vec3(1.7, 1.6, 2.1)),
        position: new CANNON.Vec3(pos[0], 1.6, pos[1]),
        collisionFilterGroup: G.COL.STATIC,
        collisionFilterMask: G.COL.PLAYER | G.COL.NPC,
      });
      this.body.quaternion.setFromEuler(0, yaw, 0);
      this.body.userData = { surface: 'flesh' };
      engine.physics.addBody(this.body);

      engine.addInteract({
        pos: [pos[0], pos[1]], radius: 3.4, prompt: `Mount the ${name.toLowerCase()}`,
        when: () => !engine.riding && engine.player.alive,
        onUse: () => this.mount(),
      });
      this._interact = engine.interactables[engine.interactables.length - 1];
      engine.mounts = engine.mounts || [];
      engine.mounts.push(this);
    }

    mount() {
      const eng = this.engine;
      eng.riding = this;
      this.ridden = true;
      G.audio.elephantTrumpet();
      eng.ui.toast('MOUNTED — WASD to drive, F to dismount');
      eng.player.crouching = false;
    }

    dismount() {
      const eng = this.engine;
      eng.riding = null;
      this.ridden = false;
      // set the rider down beside the flank
      const side = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const p = this.group.position;
      eng.player.teleport(p.x + side.x * 2.6, 0.2, p.z + side.z * 2.6);
      G.audio.land();
    }

    update(dt) {
      const eng = this.engine, g = this.group;
      // keep the mount interact anchored to wherever the elephant is
      this._interact.pos = [g.position.x, g.position.z];

      if (this.ridden && eng.player.alive) {
        const P = eng.player;
        let fwd = 0, trn = 0;
        if (P.pointerLocked && !eng.paused) {
          if (P.key('forward')) fwd += 1;
          if (P.key('back')) fwd -= 0.5;
          if (P.key('left')) trn += 1;
          if (P.key('right')) trn -= 1;
        }
        this.speed = U.damp(this.speed, fwd * (P.key('sprint') ? 6.2 : 4.2), 2.2, dt);
        this.yaw += trn * dt * (0.9 - Math.abs(this.speed) * 0.04);

        // obstacle probe — elephants stop for walls, not for fences
        if (Math.abs(this.speed) > 0.5) {
          const dir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(Math.sign(this.speed));
          const from = new CANNON.Vec3(g.position.x, 1.4, g.position.z);
          const to = new CANNON.Vec3(g.position.x + dir.x * 3.4, 1.4, g.position.z + dir.z * 3.4);
          const res = eng.aiRayResult; res.reset();
          eng.physics.raycastClosest(from, to, { collisionFilterMask: G.COL.STATIC, skipBackfaces: true }, res);
          if (res.hasHit && !(res.body === this.body)) this.speed *= 0.85;
        }
        g.position.x += Math.sin(this.yaw) * this.speed * dt;
        g.position.z += Math.cos(this.yaw) * this.speed * dt;
        const bounds = (eng.terrain ? eng.terrain.opts.bounds : 70) - 5;
        if (g.position.length() > bounds) g.position.setLength(bounds);

        // heavy footfalls
        if (Math.abs(this.speed) > 1) {
          this._stepT -= dt * Math.abs(this.speed);
          if (this._stepT <= 0) { this._stepT = 2.2; G.audio.land(); }
        }

        // TRAMPLE — enemies and cover give way before four tons of war
        if (Math.abs(this.speed) > 2) {
          const now = eng.time;
          for (const n of eng.enemies.npcs) {
            if (!n.alive || n.faction !== 'enemy') continue;
            if (U.flatDist(n.group.position, g.position) < 2.9) {
              const last = this._trampled.get(n) || -9;
              if (now - last > 1.1) {
                this._trampled.set(n, now);
                n.takeDamage(34, { type: 'melee', from: eng.player, dir: null });
                n.stagger && n.stagger(1.2);
                this._trumpetCd -= 1;
                if (this._trumpetCd <= 0) { this._trumpetCd = 3; G.audio.elephantTrumpet(); }
              }
            }
          }
          for (const d of eng.destructibles) {
            if (!d.broken && d.pos && U.flatDist(d.pos, g.position) < 2.6) d.takeDamage(200);
          }
        }

        // carry the rider: park the physics body on the howdah
        P.body.position.set(g.position.x, 3.5, g.position.z);
        P.body.velocity.set(0, 0, 0);
      } else {
        this.speed = U.damp(this.speed, 0, 4, dt);
      }

      this.phase += dt * (1 + Math.abs(this.speed));
      g.rotation.y = this.yaw;
      g.rotation.z = Math.sin(this.phase * 2.6) * 0.02 * Math.min(1, Math.abs(this.speed));
      this.body.position.set(g.position.x, 1.6, g.position.z);
      this.body.quaternion.setFromEuler(0, this.yaw, 0);
    }
  }

  /* ============================ HERB PLANTS ============================ */
  function herbPlant(engine, x, z) {
    const grp = new THREE.Group();
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), M.std({ color: 0x3a6e2a, rough: 1, flat: true }));
    bush.scale.y = 0.7; bush.position.y = 0.2; bush.castShadow = true;
    grp.add(bush);
    for (let i = 0; i < 5; i++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), M.std({ color: 0xc03a2a, rough: 0.5 }));
      berry.position.set(U.rand(-0.2, 0.2), 0.3 + U.rand(0, 0.15), U.rand(-0.2, 0.2));
      grp.add(berry);
    }
    grp.position.set(x, 0, z);
    engine.scene.add(grp);
    engine.addInteract({
      pos: [x, z], radius: 1.8, prompt: 'Gather healing herbs', once: true,
      when: () => engine.player.herbs < engine.player.herbCap(),
      onUse: () => {
        engine.player.herbs++;
        grp.children.forEach((c, i) => { if (i > 0) c.visible = false; });
        G.audio.interact();
        engine.ui.toast('HERBS GATHERED  🌿 ' + engine.player.herbs);
      },
    });
  }

  /* ============================ POPULATION ============================ */
  const Wildlife = {
    Critter, ElephantMount,
    rideable(engine, opts) { return new ElephantMount(engine, opts); },
    /**
     * Called by the engine after a level builds. cfg: {flowers, animals, herbs}
     * as multipliers (0 disables).
     */
    autoPopulate(engine, cfg = {}) {
      const flowers = cfg.flowers !== undefined ? cfg.flowers : 1;
      const animals = cfg.animals !== undefined ? cfg.animals : 1;
      const herbs = cfg.herbs !== undefined ? cfg.herbs : 1;
      const bounds = engine.terrain ? engine.terrain.opts.bounds : 70;
      const rng = U.mulberry(engine.levelId.length * 131 + 7);

      if (flowers > 0 && engine.terrain) {
        engine.terrain.scatterFlowers(Math.round(240 * flowers), bounds - 8, [], 21);
      }
      engine.critters = [];
      if (animals > 0) {
        const n = Math.round((2 + 4 * animals));
        // weighted species pool (peacock/deer stay common); a level may override
        const pool = cfg.fauna || ['peacock', 'peacock', 'deer', 'deer', 'monkey', 'buffalo', 'crocodile'];
        for (let i = 0; i < n; i++) {
          const a = rng() * Math.PI * 2, r = 18 + rng() * (bounds - 30);
          engine.critters.push(new Critter(engine, {
            type: pool[Math.floor(rng() * pool.length)],
            pos: [Math.sin(a) * r, Math.cos(a) * r],
          }));
        }
      }
      if (herbs > 0) {
        for (let i = 0; i < Math.round(5 * herbs); i++) {
          const a = rng() * Math.PI * 2, r = 10 + rng() * (bounds - 22);
          herbPlant(engine, Math.sin(a) * r, Math.cos(a) * r);
        }
      }
    },
  };
  G.Wildlife = Wildlife;
})();
