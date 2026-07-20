/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — entities/soldierNPC.js
   The reusable humanoid: one procedural rig (primitives only, no external
   models) shared by every character in the game. Faction identity comes from
   material palette swaps, per the design brief:
     · Sinhalese allies — bronze lamellar over deep-madder sarongs, gold trim.
     · Elara's Chola-aligned troops — iron & dark leather over indigo cloth
       (historically plausible South Indian palette, not caricature).
   Includes the full animation state machine (idle/walk/run, windup, strike,
   bow draw & release, flinch, stagger, kneel/captive, work, cheer, death)
   driven analytically — no animation assets required.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE, CANNON } = window.__MODULES__;
  const U = G.util, M = G.Mats;

  /* ----------------------------- palettes ----------------------------- */
  const PALETTES = {
    ally: {
      skin: 0x9c6b4a, cloth: 0x7a2f22, clothAlt: 0x9c4a28,
      armor: 0xa9793a, armorRough: 0.35, armorMetal: 0.85,
      helm: 0xb5854a, trim: 0xe0b04e, shield: 0x8c5a2c,
    },
    enemy: {
      skin: 0x7c5238, cloth: 0x2e3a5e, clothAlt: 0x4a3a68,
      armor: 0x70747c, armorRough: 0.42, armorMetal: 0.9,
      helm: 0x5c6068, trim: 0xb08d4a, shield: 0x3a4258,
    },
    civilian: {
      skin: 0x96684a, cloth: 0xcfc2a2, clothAlt: 0x9c8a62,
      armor: null, helm: null, trim: 0x8a7a52, shield: null,
    },
    royal: {
      skin: 0x9c6b4a, cloth: 0x8c1f14, clothAlt: 0xc8a12e,
      armor: 0xd8a94e, armorRough: 0.22, armorMetal: 1.0,
      helm: 0xe0b04e, trim: 0xf3cd7a, shield: 0xd8a94e,
    },
    boss: {
      skin: 0x7c5238, cloth: 0x3a1220, clothAlt: 0x6e1a2e,
      armor: 0x4a4e58, armorRough: 0.3, armorMetal: 0.95,
      helm: 0x3c4048, trim: 0xc89a3e, shield: 0x2e3240,
    },
  };

  /* ============================ HUMANOID RIG ============================ */
  class HumanoidRig {
    /**
     * opts: { palette:'ally'|'enemy'|'civilian'|'royal'|'boss', weapon:
     * 'sword'|'spear'|'bow'|'none', shield, helmet, cape, crown, plume,
     * scale, tintCloth }
     */
    constructor(opts = {}) {
      this.opts = Object.assign({ palette: 'ally', weapon: 'sword', shield: true, helmet: true, cape: false, crown: false, plume: false, scale: 1, tintCloth: null }, opts);
      const P = PALETTES[this.opts.palette] || PALETTES.ally;
      this.P = P;

      const skinMat = M.std({ color: P.skin, rough: 0.72 });
      const clothMat = M.std({ color: this.opts.tintCloth ?? P.cloth, rough: 0.92 });
      const clothAltMat = M.std({ color: P.clothAlt, rough: 0.92 });
      const armorMat = P.armor ? M.std({ color: P.armor, rough: P.armorRough, metal: P.armorMetal }) : clothAltMat;
      const trimMat = M.std({ color: P.trim, rough: 0.3, metal: 0.9 });

      const root = new THREE.Group();       // origin at the feet
      this.root = root;

      // -- pelvis / legs --
      this.hips = new THREE.Group();
      this.hips.position.y = 0.94;
      root.add(this.hips);

      const mkLeg = (side) => {
        const thigh = new THREE.Group();
        thigh.position.set(side * 0.11, 0, 0);
        const thighMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.34, 3, 6), clothMat);
        thighMesh.position.y = -0.21;
        thigh.add(thighMesh);
        const shin = new THREE.Group();
        shin.position.y = -0.45;
        const shinMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.34, 3, 6), skinMat);
        shinMesh.position.y = -0.2;
        shin.add(shinMesh);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.22), M.std({ color: 0x5c3a22, rough: 0.8 }));
        foot.position.set(0, -0.43, 0.05);
        shin.add(foot);
        thigh.add(shin);
        this.hips.add(thigh);
        return { thigh, shin };
      };
      this.legL = mkLeg(-1);
      this.legR = mkLeg(1);

      // sarong drape over the hips
      const sarong = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.42, 10), clothMat);
      sarong.position.y = -0.18;
      this.hips.add(sarong);

      // -- torso --
      this.chest = new THREE.Group();
      this.chest.position.y = 0.16;
      this.hips.add(this.chest);
      const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.3, 4, 8), P.armor ? armorMat : skinMat);
      torsoMesh.position.y = 0.26;
      torsoMesh.scale.set(1.15, 1, 0.85);
      this.chest.add(torsoMesh);
      if (P.armor) {
        // lamellar rows suggested by thin trim bands
        for (let i = 0; i < 3; i++) {
          const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - i * 0.008, 0.205 - i * 0.008, 0.035, 10), i === 0 ? trimMat : M.std({ color: P.helm, rough: 0.45, metal: 0.8 }));
          band.position.y = 0.14 + i * 0.11;
          band.scale.z = 0.85;
          this.chest.add(band);
        }
      }

      // -- head --
      this.neck = new THREE.Group();
      this.neck.position.y = 0.52;
      this.chest.add(this.neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skinMat);
      head.position.y = 0.12;
      this.neck.add(head);
      this.headMesh = head;
      if (this.opts.helmet && P.helm) {
        const helm = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), M.std({ color: P.helm, rough: 0.35, metal: 0.85 }));
        helm.position.y = 0.15;
        this.neck.add(helm);
        if (this.opts.plume) {
          const plume = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 6), M.std({ color: P.cloth, rough: 0.9 }));
          plume.position.y = 0.34;
          this.neck.add(plume);
        }
      }
      if (this.opts.crown) {
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.2, 8), trimMat);
        crown.position.y = 0.28;
        this.neck.add(crown);
        const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), M.std({ color: 0xc03030, rough: 0.2, metal: 0.4 }));
        jewel.position.set(0, 0.26, 0.12);
        this.neck.add(jewel);
      }

      // -- arms --
      const mkArm = (side) => {
        const shoulder = new THREE.Group();
        shoulder.position.set(side * 0.24, 0.42, 0);
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 3, 6), P.armor ? armorMat : skinMat);
        upper.position.y = -0.15;
        shoulder.add(upper);
        if (P.armor) {
          const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.std({ color: P.helm, rough: 0.4, metal: 0.85 }));
          shoulder.add(pauldron);
        }
        const elbow = new THREE.Group();
        elbow.position.y = -0.3;
        const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 3, 6), skinMat);
        fore.position.y = -0.14;
        elbow.add(fore);
        const hand = new THREE.Group();
        hand.position.y = -0.28;
        elbow.add(hand);
        shoulder.add(elbow);
        this.chest.add(shoulder);
        return { shoulder, elbow, hand };
      };
      this.armL = mkArm(-1);
      this.armR = mkArm(1);

      // -- cape (kings / boss) --
      if (this.opts.cape) {
        const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.85, 4, 6), M.std({ color: P.clothAlt, rough: 0.95, side: THREE.DoubleSide }));
        cape.position.set(0, 0.2, -0.16);
        cape.rotation.x = 0.14;
        this.chest.add(cape);
        this.cape = cape;
      }

      // -- weapons --
      this.weapons = {};
      this.weapons.sword = this._mkSword(trimMat);
      this.weapons.spear = this._mkSpear();
      this.weapons.bow = this._mkBow();
      for (const w of Object.values(this.weapons)) { w.visible = false; this.armR.hand.add(w); }
      // bow is held in the LEFT hand
      this.armR.hand.remove(this.weapons.bow);
      this.armL.hand.add(this.weapons.bow);
      this.setWeapon(this.opts.weapon);

      if (this.opts.shield && P.shield) {
        const sh = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.035, 14), M.std({ color: P.shield, rough: 0.6, metal: 0.3 }));
        disc.rotation.x = Math.PI / 2;
        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), trimMat);
        boss.position.z = 0.04;
        sh.add(disc, boss);
        sh.position.set(0, -0.05, 0.05);
        sh.rotation.y = Math.PI / 2;
        this.armL.elbow.add(sh);
        this.shield = sh;
        if (this.opts.weapon === 'bow') sh.visible = false;
      }

      root.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
      root.scale.setScalar(this.opts.scale);

      // ---- animation state ----
      this.speedPct = 0;         // 0 idle … 1 sprint
      this.phase = Math.random() * 10;
      this.action = null;        // { name, t, dur }
      this.posture = 'relaxed';  // relaxed | combat | kneel | captive | work
      this.breath = Math.random() * 5;
      this.dead = false;
      this._deathT = 0;
      this._fallDir = Math.random() < 0.5 ? 1 : -1;
    }

    _mkSword(trimMat) {
      const g = new THREE.Group();
      // simple straight ancient blade (deliberately NOT a kastane — that hilt
      // style is centuries too late for this period)
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.62, 0.012), M.std({ color: 0xb8bcc2, rough: 0.25, metal: 1 }));
      blade.position.y = -0.42;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.03), trimMat);
      guard.position.y = -0.1;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.12, 6), M.std({ color: 0x4a2c16, rough: 0.8 }));
      grip.position.y = -0.04;
      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), trimMat);
      pommel.position.y = 0.03;
      g.add(blade, guard, grip, pommel);
      g.rotation.x = Math.PI;   // blade points down along the arm at rest
      return g;
    }
    _mkSpear() {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.9, 6), M.std({ color: 0x6e4a26, rough: 0.8 }));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 6), M.std({ color: 0xb8bcc2, rough: 0.3, metal: 1 }));
      tip.position.y = 1.0;
      g.add(shaft, tip);
      return g;
    }
    _mkBow() {
      const g = new THREE.Group();
      const curve = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.016, 5, 12, Math.PI * 0.8), M.std({ color: 0x6e4a26, rough: 0.75 }));
      curve.rotation.z = Math.PI / 2 + Math.PI * 0.1;
      const stringGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.47, 0.16), new THREE.Vector3(0, -0.47, 0.16)]);
      const string = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xd8d2bd }));
      g.add(curve, string);
      g.rotation.x = Math.PI / 2;
      return g;
    }

    setWeapon(w) {
      this.currentWeapon = w;
      for (const [k, mesh] of Object.entries(this.weapons)) mesh.visible = (k === w);
      if (this.shield) this.shield.visible = (w !== 'bow' && this.opts.shield);
    }

    play(name, dur) { this.action = { name, t: 0, dur }; }
    playWindup() { this.play('windup', 0.9); }
    playStrike() { this.play('strike', 0.3); }
    playBowDraw() { this.play('bowdraw', 1.1); }
    playRelease() { this.play('release', 0.25); }
    playStagger() { this.play('stagger', 1.4); }
    playFlinch() { if (!this.action || this.action.name === 'flinch') this.play('flinch', 0.28); }
    playCheer() { this.play('cheer', 2.2); }
    playDeath() { this.dead = true; this._deathT = 0; }

    /* analytic pose update — called every frame (or less when LOD'd out) */
    animate(dt) {
      const s = this.speedPct;
      this.breath += dt;

      if (this.dead) {
        this._deathT += dt;
        const t = Math.min(1, this._deathT / 0.75);
        const e = 1 - Math.pow(1 - t, 3);
        this.root.rotation.x = -e * (Math.PI / 2) * 0.96;
        this.root.rotation.z = this._fallDir * e * 0.25;
        this.hips.position.y = 0.94 - e * 0.62;
        this.armL.shoulder.rotation.x = -0.4 * e;
        this.armR.shoulder.rotation.x = -0.7 * e;
        this.legL.shin.rotation.x = 0.4 * e;
        return;
      }

      this.phase += dt * (5.4 + 5.2 * s);
      const swing = Math.sin(this.phase) * (0.28 + 0.42 * s) * (s > 0.02 ? 1 : 0);
      const swing2 = Math.sin(this.phase + Math.PI) * (0.28 + 0.42 * s) * (s > 0.02 ? 1 : 0);

      // legs
      this.legL.thigh.rotation.x = swing;
      this.legR.thigh.rotation.x = swing2;
      this.legL.shin.rotation.x = Math.max(0, -swing) * 1.3 + 0.05 * s;
      this.legR.shin.rotation.x = Math.max(0, -swing2) * 1.3 + 0.05 * s;

      // body bob + lean
      this.hips.position.y = 0.94 + Math.abs(Math.sin(this.phase)) * 0.05 * s;
      this.chest.rotation.x = 0.06 * s + Math.sin(this.breath * 1.7) * 0.015;
      this.root.rotation.x = 0;
      this.root.rotation.z = 0;

      // default arm pose by posture
      let armLX = swing2 * 0.6, armRX = swing * 0.6;
      let armLZ = 0.12, armRZ = -0.12;
      let elbL = -0.25, elbR = -0.25;
      if (this.posture === 'combat') {
        if (this.currentWeapon === 'bow') { armLX = -0.5; armRX = -0.3; elbR = -1.1; }
        else { armRX = -0.5; elbR = -1.35; armLX = -0.35; elbL = -0.9; } // weapon & shield up
      } else if (this.posture === 'kneel' || this.posture === 'captive') {
        this.hips.position.y = 0.55;
        this.legL.thigh.rotation.x = -1.5; this.legL.shin.rotation.x = 2.2;
        this.legR.thigh.rotation.x = -0.5; this.legR.shin.rotation.x = 2.4;
        if (this.posture === 'captive') { armLX = armRX = -0.55; armLZ = -0.5; armRZ = 0.5; elbL = elbR = -1.9; }
        else { armLX = armRX = -0.2; }
      } else if (this.posture === 'work') {
        const w = Math.sin(this.breath * 6);
        armRX = -1.2 + w * 0.55; elbR = -0.4;
        armLX = -0.4; this.chest.rotation.x = 0.35 + w * 0.08;
      }

      // action overlays
      if (this.action) {
        const a = this.action;
        a.t += dt;
        const f = Math.min(1, a.t / a.dur);
        switch (a.name) {
          case 'windup':
            armRX = U.lerp(armRX, -2.4, Math.min(1, f * 2.5));
            armRZ = U.lerp(armRZ, 0.5, Math.min(1, f * 2.5));
            elbR = -0.5;
            this.chest.rotation.y = -0.35 * Math.min(1, f * 2.5);
            break;
          case 'strike':
            armRX = U.lerp(-2.4, 0.9, f);
            armRZ = U.lerp(0.5, -0.3, f);
            elbR = -0.2;
            this.chest.rotation.y = U.lerp(-0.35, 0.4, f);
            break;
          case 'bowdraw':
            armLX = -1.5; elbL = 0;
            armRX = U.lerp(-0.6, -1.35, f); elbR = U.lerp(-0.6, -1.7, f);
            this.chest.rotation.y = 0.5;
            break;
          case 'release':
            armLX = -1.5; elbL = 0;
            armRX = -0.7; elbR = -0.4;
            this.chest.rotation.y = 0.45;
            break;
          case 'stagger':
            this.chest.rotation.x = -0.5 * Math.sin(f * Math.PI);
            armLX = armRX = -1.2 * Math.sin(f * Math.PI + 0.4);
            this.hips.position.y = 0.94 - 0.12 * Math.sin(f * Math.PI);
            break;
          case 'flinch':
            this.chest.rotation.x = -0.3 * Math.sin(f * Math.PI);
            this.chest.rotation.y = 0.25 * Math.sin(f * Math.PI);
            break;
          case 'cheer': {
            const w2 = Math.sin(a.t * 9);
            armLX = armRX = -2.6 + w2 * 0.2;
            armLZ = -0.3; armRZ = 0.3;
            break;
          }
        }
        if (f >= 1) this.action = null;
      } else {
        this.chest.rotation.y = 0;
      }

      this.armL.shoulder.rotation.x = armLX;
      this.armR.shoulder.rotation.x = armRX;
      this.armL.shoulder.rotation.z = armLZ;
      this.armR.shoulder.rotation.z = armRZ;
      this.armL.elbow.rotation.x = elbL;
      this.armR.elbow.rotation.x = elbR;

      if (this.cape) this.cape.rotation.x = 0.14 + Math.sin(this.breath * 2.2) * 0.05 + s * 0.35;
    }
  }
  G.HumanoidRig = HumanoidRig;

  /* ============================ SOLDIER NPC ============================ */
  class SoldierNPC {
    /**
     * opts: { faction:'ally'|'enemy'|'civilian', type:'melee'|'archer'|'brute'
     * |'elite'|'civilian'|'worker', pos:[x,z] (or [x,y,z]), yaw, name,
     * nameColor, palette, weapon, scale, hp, patrol, followPlayer, holdPos,
     * passive, posture }
     */
    constructor(engine, opts = {}) {
      this.engine = engine;
      this.opts = opts;
      this.faction = opts.faction || 'enemy';
      this.type = opts.type || 'melee';
      this.name = opts.name || null;
      this.alive = true;
      this.radius = 0.55;

      const cfg = G.AI_TYPES[this.type] || { hp: 40 };
      this.maxHp = opts.hp || cfg.hp || 40;
      this.hp = this.maxHp;

      const isCiv = this.type === 'civilian' || this.type === 'worker';
      const weapon = opts.weapon || (this.type === 'archer' ? 'bow' : this.type === 'brute' ? 'spear' : isCiv ? 'none' : 'sword');
      const scale = opts.scale || (this.type === 'brute' ? 1.16 : this.type === 'elite' ? 1.1 : 1);
      this.rig = new HumanoidRig({
        palette: opts.palette || (isCiv ? 'civilian' : this.faction === 'ally' ? 'ally' : 'enemy'),
        weapon,
        shield: !isCiv && this.type !== 'archer',
        helmet: !isCiv,
        plume: this.type === 'elite' || this.type === 'brute',
        cape: opts.cape || false,
        crown: opts.crown || false,
        scale,
        tintCloth: opts.tintCloth ?? null,
      });
      this.group = this.rig.root;
      const p = opts.pos || [0, 0];
      this.baseY = p.length === 3 ? p[1] : 0;
      this.group.position.set(p[0], this.baseY, p.length === 3 ? p[2] : p[1]);
      this.yaw = opts.yaw || 0;
      this.group.rotation.y = this.yaw;
      engine.scene.add(this.group);
      if (opts.posture) this.rig.posture = opts.posture;

      // name banner for the famous warriors
      if (this.name && opts.showName !== false && (this.type === 'elite' || opts.showName)) {
        this.label = U.makeLabel(this.name, opts.nameColor || (this.faction === 'ally' ? '#f3cd7a' : '#e08a7a'));
        this.label.position.y = 2.15 * scale;
        this.group.add(this.label);
      }

      // kinematic physics proxy (blocks movement; catches arrows)
      this.body = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        shape: new CANNON.Sphere(0.42),
        position: new CANNON.Vec3(this.group.position.x, this.baseY + 1.0, this.group.position.z),
        collisionFilterGroup: G.COL.NPC,
        collisionFilterMask: G.COL.PLAYER | G.COL.NPC,
      });
      this.body.userData = { entity: this };
      engine.physics.addBody(this.body);

      this.ai = null;          // attached by EnemyManager when combat-capable
      this.captive = opts.posture === 'captive';   // bound prisoners draw no blades
      this.lodFar = false;
      this._lodTick = 0;
      this._moving = false;
      this._avoidDir = 0;
      this._avoidT = 0;
    }

    get pos() {
      const gp = this.group.position;
      return new THREE.Vector3(gp.x, gp.y + 1.15 * (this.opts.scale || 1), gp.z);
    }

    /* steering: walk toward `target` (THREE.Vector3) or stand (null) */
    setMove(target, dt, speed = 3.4, keepFacing = false) {
      if (!this.alive) return;
      if (!target) {
        this._moving = false;
        this.rig.speedPct = U.damp(this.rig.speedPct, 0, 8, dt);
        return;
      }
      const gp = this.group.position;
      const dir = new THREE.Vector3(target.x - gp.x, 0, target.z - gp.z);
      const dist = dir.length();
      if (dist < 0.05) { this.rig.speedPct = U.damp(this.rig.speedPct, 0, 8, dt); return; }
      dir.normalize();

      // simple obstacle avoidance: probe ahead against static geometry
      this._avoidT -= dt;
      if (this._avoidT <= 0) {
        this._avoidT = 0.25;
        const from = new CANNON.Vec3(gp.x, gp.y + 0.7, gp.z);
        const to = new CANNON.Vec3(gp.x + dir.x * 1.6, gp.y + 0.7, gp.z + dir.z * 1.6);
        const res = this.engine.aiRayResult;
        res.reset();
        this.engine.physics.raycastClosest(from, to, { collisionFilterMask: G.COL.STATIC, skipBackfaces: true }, res);
        this._avoidDir = res.hasHit ? (this._avoidDir || (Math.random() < 0.5 ? 1 : -1)) : 0;
      }
      if (this._avoidDir) {
        const a = Math.atan2(dir.x, dir.z) + this._avoidDir * 1.1;
        dir.set(Math.sin(a), 0, Math.cos(a));
      }

      // separation from other soldiers & the player
      const sep = new THREE.Vector3();
      for (const n of this.engine.enemies.npcs) {
        if (n === this || !n.alive) continue;
        const dx = gp.x - n.group.position.x, dz = gp.z - n.group.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.9 && d > 0.001) sep.add(new THREE.Vector3(dx / d, 0, dz / d).multiplyScalar((0.9 - d) * 2));
      }
      const pl = this.engine.player;
      if (pl && pl.alive) {
        const dx = gp.x - pl.pos.x, dz = gp.z - pl.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.85 && d > 0.001) sep.add(new THREE.Vector3(dx / d, 0, dz / d).multiplyScalar((0.85 - d) * 3));
      }
      dir.add(sep).normalize();

      const step = Math.min(speed * dt, dist);
      gp.x += dir.x * step;
      gp.z += dir.z * step;
      this._moving = true;
      this.rig.speedPct = U.damp(this.rig.speedPct, U.clamp(speed / 6.5, 0.2, 1), 8, dt);
      if (!keepFacing) {
        const targetYaw = Math.atan2(dir.x, dir.z);
        this.yaw = U.angleLerp(this.yaw, targetYaw, Math.min(1, dt * 9));
      }
    }

    faceToward(pos, dt, rate = 9) {
      const targetYaw = Math.atan2(pos.x - this.group.position.x, pos.z - this.group.position.z);
      this.yaw = U.angleLerp(this.yaw, targetYaw, Math.min(1, dt * rate));
    }

    /**
     * info: { dir, type:'melee'|'arrow', from, crit }
     */
    takeDamage(amount, info = {}) {
      if (!this.alive) return;
      this.hp -= amount;
      const isPlayerHit = info.from && info.from.isPlayer;
      if (info.type === 'melee' && !info.silent) G.audio.swordClash();
      if (!info.silent) G.audio.enemyHurt();
      this.rig.playFlinch();
      // getting hit reveals the attacker — unless the blow was silent:
      // the dead raise no cry, and a wounded survivor turns without shouting
      if (this.ai && info.from && info.from.faction !== this.faction) {
        if (info.silent) {
          if (this.hp > 0) this.ai.alertTo(info.from);
        } else if (this.ai._acquire) {
          this.ai._acquire(info.from);
        }
      }
      if (this.faction === 'civilian') this.engine.events.emit('civilianHurt', this);
      if (this.hp <= 0) this._die(info);
      else if (isPlayerHit && Math.random() < 0.25) this.ai?.stagger(0.7);
    }

    stagger(t) { this.ai ? this.ai.stagger(t) : this.rig.playStagger(); }

    _die(info) {
      this.alive = false;
      this.hp = 0;
      this.rig.playDeath();
      if (this.label) this.label.visible = false;
      G.audio.enemyDie();
      this.engine.physics.removeBody(this.body);
      this.engine.events.emit('npcDeath', { npc: this, killer: info.from || null });
      if (this.faction === 'enemy' && info.from && info.from.isPlayer) {
        this.engine.stats.kills++;
      }
    }

    update(dt) {
      // LOD: far NPCs animate at ~1/4 rate
      if (this.lodFar) {
        this._lodTick += dt;
        if (this._lodTick < 0.12) { return; }
        dt = this._lodTick;
        this._lodTick = 0;
      }
      this.group.rotation.y = this.yaw;
      this.rig.posture = this.opts.posture ? this.rig.posture
        : (this.ai && (this.ai.state === 'engage' || this.ai.state === 'windup' || this.ai.state === 'recover')) ? 'combat' : 'relaxed';
      this.rig.animate(dt);
      if (this.alive) {
        this.body.position.set(this.group.position.x, this.group.position.y + 1.0, this.group.position.z);
      }
      if (this.label) this.label.lookAt(this.engine.camera.position);
    }

    setPosture(p) { this.opts.posture = p; this.rig.posture = p; }
    clearPosture() { this.opts.posture = null; }

    dispose() {
      if (this.group.parent) this.group.parent.remove(this.group);
      if (this.alive) this.engine.physics.removeBody(this.body);
    }
  }
  G.SoldierNPC = SoldierNPC;
})();
