/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — engine/playerController.js
   First-person controller: pointer-lock mouse look, WASD movement on a
   cannon-es sphere body, sprint (stamina), jump, crouch, head-bob, footsteps,
   interaction ("F"), weapon hotkeys, and incoming-damage handling
   (block / perfect-parry timing lives here because the defender owns it).
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE, CANNON } = window.__MODULES__;
  const U = G.util;

  const BODY_R = 0.45;
  const EYE_STAND = 1.62;
  const EYE_CROUCH = 0.95;

  class PlayerController {
    constructor(engine, spawn = { pos: [0, 0], yaw: 0 }) {
      this.engine = engine;
      this.camera = engine.camera;

      // ---- vitals ----
      this.maxHp = 100; this.hp = 100;
      this.maxStamina = 100; this.stamina = 100;
      this.staminaRegenDelay = 0;
      this.exhausted = false;
      this.alive = true;
      this.isPlayer = true;
      this.faction = 'ally';
      // herb pouch (v0.2): field healing between checkpoints
      this.herbs = 2;
      this._healPool = 0;    // remaining heal-over-time from a chewed herb

      // ---- movement state ----
      this.yaw = spawn.yaw || 0;
      this.pitch = 0;
      this.crouching = false;
      this.sprinting = false;
      this.grounded = false;
      this.eyeHeight = EYE_STAND;
      this.bobT = 0;
      this.bobAmp = 0;
      this.stepT = 0;
      this.fovOffset = 0;         // combat (bow zoom) writes this
      this.viewShake = 0;
      this.moveLocked = false;    // cutscenes
      this.godMode = false;

      // ---- block / parry ----
      this.blocking = false;
      this.blockPressedAt = -99;

      // ---- physics body ----
      const body = new CANNON.Body({
        mass: 78,
        shape: new CANNON.Sphere(BODY_R),
        position: new CANNON.Vec3(spawn.pos[0], (spawn.pos[2] !== undefined ? 0 : 0) + 1.2, spawn.pos[1]),
        fixedRotation: true,
        linearDamping: 0.02,
        material: engine.slickMat,
        collisionFilterGroup: G.COL.PLAYER,
        collisionFilterMask: G.COL.GROUND | G.COL.STATIC | G.COL.NPC,
      });
      if (spawn.pos.length === 3) body.position.set(spawn.pos[0], spawn.pos[1] + 1.2, spawn.pos[2]);
      body.allowSleep = false;
      body.userData = { entity: this };
      engine.physics.addBody(body);
      this.body = body;

      // scratch vectors
      this._fwd = new THREE.Vector3();
      this._right = new THREE.Vector3();
      this._wish = new THREE.Vector3();
      this._camEuler = new THREE.Euler(0, 0, 0, 'YXZ');

      // ---- input ----
      this.keysDown = new Set();
      this._bind();
    }

    /* position at chest height (used by AI targeting) */
    get pos() {
      const p = this.body.position;
      return new THREE.Vector3(p.x, p.y - BODY_R + 1.2, p.z);
    }
    get feetPos() {
      const p = this.body.position;
      return new THREE.Vector3(p.x, p.y - BODY_R, p.z);
    }

    teleport(x, y, z, yaw) {
      this.body.position.set(x, y + 1.2, z);
      this.body.velocity.set(0, 0, 0);
      if (yaw !== undefined) { this.yaw = yaw; this.pitch = 0; }
    }

    /* ------------------------- input wiring ------------------------- */
    _bind() {
      const eng = this.engine;
      this._onKeyDown = (e) => {
        if (eng.uiFocus) return;
        this.keysDown.add(e.code);
        const K = G.Settings.data.controls.keys;
        if (e.code === K.pause) return;                 // app handles Esc
        if (!this.pointerLocked || eng.paused || !this.alive) return;
        if (e.code === K.jump) { e.preventDefault(); if (!eng.riding) this._tryJump(); }
        else if (e.code === K.crouch || e.code === 'ControlLeft') this.crouching = !eng.riding && true;
        else if (e.code === K.switchWeapon) eng.combat.switchWeapon();
        else if (e.code === K.nock) eng.combat.nockArrow();
        else if (e.code === K.interact) { if (eng.riding) eng.riding.dismount(); else eng.tryInteract(); }
        else if (e.code === K.missionLog) { e.preventDefault(); eng.ui.toggleTracker(); }
        else if (e.code === K.herb) this.useHerb();
        else if (e.code === K.rally) eng.rally();
        else if (e.code === K.skills) eng.bridge.openSkills && eng.bridge.openSkills();
        else if (e.code === K.camera) {
          G.Settings.set('graphics.camera', eng.tpMode ? 'first' : 'third');
          eng.ui.toast(eng.tpMode ? 'THIRD-PERSON VIEW' : 'FIRST-PERSON VIEW');
        }
        else if (/^Digit[1-5]$/.test(e.code)) {
          const slot = Number(e.code.slice(5));
          const id = Object.keys(G.MELEE).find((k) => G.MELEE[k].slot === slot);
          if (id) eng.combat.selectMelee(id);
        }
      };
      this._onKeyUp = (e) => {
        this.keysDown.delete(e.code);
        const K = G.Settings.data.controls.keys;
        if (e.code === K.crouch || e.code === 'ControlLeft') this.crouching = false;
      };
      this._onMouseMove = (e) => {
        if (!this.pointerLocked || eng.paused || this.moveLocked) return;
        const c = G.Settings.data.controls;
        const sens = 0.0022 * c.sensitivity;
        this.yaw -= e.movementX * sens;
        this.pitch -= e.movementY * sens * (c.invertY ? -1 : 1);
        this.pitch = U.clamp(this.pitch, -1.45, 1.45);
      };
      this._onMouseDown = (e) => {
        // clicking the canvas while unlocked mid-game re-captures the mouse
        if (!this.pointerLocked && !eng.paused && this.alive && e.target === eng.canvas) {
          this.requestLock();
          return;
        }
        if (!this.pointerLocked || eng.paused || !this.alive || this.moveLocked) return;
        if (e.button === 0) eng.combat.primaryDown();
        if (e.button === 2) { eng.combat.secondaryDown(); this.blockPressedAt = performance.now() / 1000; }
      };
      this._onMouseUp = (e) => {
        if (e.button === 0) eng.combat.primaryUp();
        if (e.button === 2) eng.combat.secondaryUp();
      };
      this._onLockChange = () => {
        this.pointerLocked = document.pointerLockElement === eng.canvas;
        if (!this.pointerLocked) this.keysDown.clear();
        eng.onPointerLock(this.pointerLocked);
      };
      this._onContext = (e) => e.preventDefault();
      document.addEventListener('keydown', this._onKeyDown);
      document.addEventListener('keyup', this._onKeyUp);
      document.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('mousedown', this._onMouseDown);
      document.addEventListener('mouseup', this._onMouseUp);
      document.addEventListener('pointerlockchange', this._onLockChange);
      document.addEventListener('contextmenu', this._onContext);
    }

    requestLock() {
      try { this.engine.canvas.requestPointerLock(); } catch (_) {}
    }
    releaseLock() {
      if (document.pointerLockElement) document.exitPointerLock();
    }

    key(action) {
      return this.keysDown.has(G.Settings.data.controls.keys[action]);
    }

    herbCap() { return (G.Skills && G.Skills.owned('herbalist')) ? 5 : 3; }
    useHerb() {
      if (!this.alive || this.herbs <= 0 || this._healPool > 0) return;
      if (this.hp >= this.maxHp) { this.engine.ui.toast('UNHURT — SAVE THE HERBS'); return; }
      this.herbs--;
      this._healPool = (G.Skills && G.Skills.owned('herbalist')) ? 50 : 30;
      G.audio.interact();
      this.engine.ui.toast('🌿 HERBS — the pain dulls');
    }

    /* --------------------------- update --------------------------- */
    update(dt) {
      const eng = this.engine;

      // heal-over-time from herbs ticks even while mounted
      if (this._healPool > 0 && this.alive) {
        const tick = Math.min(this._healPool, 18 * dt);
        this._healPool -= tick;
        this.hp = Math.min(this.maxHp, this.hp + tick);
      }

      // realism: natural recovery (arcade regens fully, standard only to 40%,
      // realistic not at all — herbs and checkpoints are your surgeons)
      const R = G.Realism();
      if (this.alive && R.regen !== 'none' && eng.time - (this.lastDamageT || -99) > 5) {
        const cap = R.regen === 'arcade' ? this.maxHp : this.maxHp * 0.4;
        if (this.hp < cap) this.hp = Math.min(cap, this.hp + (R.regen === 'arcade' ? 4 : 6) * dt);
      }

      // riding: the elephant drives the body & camera; keep look + FOV logic
      if (eng.riding) {
        const g = eng.riding.group;
        this.camera.position.set(g.position.x, 4.15 + Math.sin(eng.riding.phase * 2.6) * 0.06, g.position.z);
        this._camEuler.set(this.pitch, this.yaw, 0);
        this.camera.quaternion.setFromEuler(this._camEuler);
        this._fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const baseFov = G.Settings.data.graphics.fov;
        const target = baseFov + this.fovOffset;
        if (Math.abs(this.camera.fov - target) > 0.05) {
          this.camera.fov = U.damp(this.camera.fov, target, 10, dt);
          this.camera.updateProjectionMatrix();
        }
        this.stamina = Math.min(this.maxStamina, this.stamina + 10 * dt);
        this.blocking = false;
        return;
      }

      this._checkGrounded();

      // desired planar velocity from input
      let ix = 0, iz = 0;
      if (this.alive && !this.moveLocked && this.pointerLocked && !eng.paused) {
        if (this.key('forward')) iz += 1;
        if (this.key('back')) iz -= 1;
        if (this.key('left')) ix -= 1;
        if (this.key('right')) ix += 1;
      }
      const moving = (ix !== 0 || iz !== 0);
      const wantsSprint = this.key('sprint') && moving && iz > 0 && !this.crouching && !this.engine.combat.isBlockingOrDrawing();
      this.sprinting = wantsSprint && !this.exhausted && this.stamina > 1;

      let speed = 4.3;
      if (this.sprinting) speed = 7.2;
      if (this.crouching) speed = 2.2;
      if (this.engine.combat.isBlockingOrDrawing()) speed *= 0.55;
      // realistic preset: deep wounds slow the legs
      if (R.preset === 'realistic' && this.hp < this.maxHp * 0.25) speed *= 0.8;

      // stamina economy
      if (this.sprinting) {
        this.stamina -= 11 * dt;
        this.staminaRegenDelay = 0.7;
        if (this.stamina <= 0) { this.stamina = 0; this.exhausted = true; }
      }
      this.staminaRegenDelay -= dt;
      if (this.staminaRegenDelay <= 0 && this.stamina < this.maxStamina) {
        this.stamina = Math.min(this.maxStamina, this.stamina + (this.crouching ? 16 : 12) * dt);
      }
      if (this.exhausted && this.stamina > 22) this.exhausted = false;

      // build wish direction in world space from yaw
      this._fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      this._right.set(-this._fwd.z, 0, this._fwd.x);
      this._wish.set(0, 0, 0)
        .addScaledVector(this._fwd, iz)
        .addScaledVector(this._right, ix);
      if (this._wish.lengthSq() > 0) this._wish.normalize().multiplyScalar(speed);

      // steer velocity (strong on ground, weak in air)
      const v = this.body.velocity;
      const accel = this.grounded ? 14 : 3.2;
      v.x = U.damp(v.x, this._wish.x, accel, dt);
      v.z = U.damp(v.z, this._wish.z, accel, dt);

      // eye height (crouch) + head bob
      const targetEye = this.crouching ? EYE_CROUCH : EYE_STAND;
      this.eyeHeight = U.damp(this.eyeHeight, targetEye, 12, dt);
      const planar = Math.hypot(v.x, v.z);
      const targetAmp = this.grounded && planar > 0.5 ? U.clamp(planar / 7, 0, 1) : 0;
      this.bobAmp = U.damp(this.bobAmp, targetAmp, 8, dt);
      this.bobT += dt * (4.4 + planar * 0.9);

      // footstep sounds tied to bob cycle
      if (this.grounded && planar > 1.2) {
        this.stepT -= dt;
        if (this.stepT <= 0) {
          this.stepT = this.sprinting ? 0.31 : this.crouching ? 0.65 : 0.44;
          G.audio.footstep(this.sprinting);
          if (this.sprinting) this.engine.noiseEvent(this.feetPos, 11);
        }
      }

      // camera transform (first-person head, or third-person shoulder rig)
      const p = this.body.position;
      const bobY = Math.sin(this.bobT * 2) * 0.045 * this.bobAmp;
      const bobX = Math.cos(this.bobT) * 0.025 * this.bobAmp;
      this.viewShake = Math.max(0, this.viewShake - dt * 3);
      const shX = (Math.random() - 0.5) * this.viewShake * 0.05;
      const shY = (Math.random() - 0.5) * this.viewShake * 0.05;
      if (eng.tpMode) {
        this._thirdPersonCamera(dt, p, shX, shY);
      } else {
        this.camera.position.set(
          p.x + this._right.x * bobX + shX,
          p.y - BODY_R + this.eyeHeight + bobY + shY,
          p.z + this._right.z * bobX);
        this._camEuler.set(this.pitch, this.yaw, Math.sin(this.bobT) * 0.002 * this.bobAmp);
        this.camera.quaternion.setFromEuler(this._camEuler);
      }

      // FOV: settings base + bow-zoom offset
      const baseFov = G.Settings.data.graphics.fov;
      const target = baseFov + this.fovOffset + (this.sprinting ? 4 : 0);
      if (Math.abs(this.camera.fov - target) > 0.05) {
        this.camera.fov = U.damp(this.camera.fov, target, 10, dt);
        this.camera.updateProjectionMatrix();
      }

      // safety net: fell through the world
      if (p.y < -20) this.teleport(this.engine.lastCheckpoint?.pos?.[0] ?? 0, 0.5, this.engine.lastCheckpoint?.pos?.[2] ?? 0);

      // track blocking state for the HUD & combat (any melee weapon guards)
      this.blocking = this.engine.combat.isMelee && this.engine.combat.secondaryHeld && this.alive;
    }

    /* over-the-shoulder camera with wall-collision probe (v0.3) */
    _thirdPersonCamera(dt, p, shX, shY) {
      const eng = this.engine;
      const drawing = eng.combat.drawing || eng.combat.secondaryHeld;
      const dist = drawing ? 2.0 : 3.3;
      const side = drawing ? 0.7 : 0.5;
      // view direction from yaw/pitch
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const dir = new THREE.Vector3(-Math.sin(this.yaw) * cp, sp, -Math.cos(this.yaw) * cp);
      const anchor = new THREE.Vector3(p.x, p.y - BODY_R + this.eyeHeight + 0.15, p.z);
      anchor.addScaledVector(this._right, side);
      const desired = anchor.clone().addScaledVector(dir, -dist);
      desired.y = Math.max(desired.y, 0.25);
      // don't clip through walls: probe from the head to the desired position
      const from = new CANNON.Vec3(anchor.x, anchor.y, anchor.z);
      const to = new CANNON.Vec3(desired.x, desired.y, desired.z);
      const res = eng.aiRayResult;
      res.reset();
      eng.physics.raycastClosest(from, to, { collisionFilterMask: G.COL.STATIC, skipBackfaces: true }, res);
      if (res.hasHit) {
        const hp = res.hitPointWorld;
        desired.set(hp.x, hp.y, hp.z).lerp(anchor, 0.12);
      }
      this.camera.position.set(desired.x + shX, desired.y + shY, desired.z);
      this._camEuler.set(this.pitch, this.yaw, 0);
      this.camera.quaternion.setFromEuler(this._camEuler);
    }

    _checkGrounded() {
      const p = this.body.position;
      const from = new CANNON.Vec3(p.x, p.y, p.z);
      const to = new CANNON.Vec3(p.x, p.y - (BODY_R + 0.22), p.z);
      const res = new CANNON.RaycastResult();
      this.engine.physics.raycastClosest(from, to, {
        collisionFilterMask: G.COL.GROUND | G.COL.STATIC,
        skipBackfaces: true,
      }, res);
      const wasAirborne = !this.grounded;
      this.grounded = res.hasHit;
      if (this.grounded && wasAirborne && this.body.velocity.y < -3) G.audio.land();
    }

    _tryJump() {
      if (!this.grounded || this.crouching) return;
      if (this.stamina < 6) return;
      this.stamina -= 6;
      this.staminaRegenDelay = 0.6;
      this.body.velocity.y = 7.6;
      this.grounded = false;
      G.audio.jump();
    }

    /* ------------------- damage / block / parry ------------------- */
    /**
     * @param amount   raw damage
     * @param fromPos  THREE.Vector3 of the attacker (for facing checks)
     * @param opts     { type:'melee'|'arrow', attacker }
     */
    takeDamage(amount, fromPos, opts = {}) {
      if (!this.alive || this.godMode) return { blocked: false };
      const eng = this.engine;
      const now = performance.now() / 1000;
      amount *= G.Realism ? G.Realism().damageTaken : 1;
      this.lastDamageT = eng.time;
      if (eng.riding) amount *= 0.6;   // hard to reach a rider on a war elephant

      // facing check: are we looking (roughly) at the attacker?
      let facing = false;
      if (fromPos) {
        const toA = new THREE.Vector3().subVectors(fromPos, this.pos).setY(0).normalize();
        facing = this._fwd.dot(toA) > 0.35;
      }

      const ironGuard = G.Skills && G.Skills.owned('iron_guard');
      if (opts.type !== 'arrow' && this.blocking && facing) {
        // PERFECT PARRY — block began inside the timing window just before impact
        if (now - this.blockPressedAt < G.PARRY_WINDOW * (ironGuard ? 1.5 : 1)) {
          G.audio.parry();
          this.viewShake = 0.5;
          eng.events.emit('parry', { attacker: opts.attacker });
          if (opts.attacker && opts.attacker.stagger) opts.attacker.stagger(1.8);
          eng.ui.toast('PERFECT PARRY');
          this.stamina = Math.min(this.maxStamina, this.stamina + 8);
          return { blocked: true, parried: true };
        }
        // normal block: heavy mitigation, costs stamina (less with Iron Guard)
        if (this.stamina > 4) {
          this.stamina -= ironGuard ? 8 : 13;
          this.staminaRegenDelay = 0.9;
          G.audio.block();
          this.viewShake = 0.4;
          amount *= 0.15;
          this.hp -= amount;
          eng.world.flashDamage();
          if (this.hp <= 0) this._die();
          return { blocked: true };
        }
      }

      this.hp -= amount;
      this.viewShake = 0.8;
      G.audio.hurt();
      eng.world.flashDamage();
      eng.ui.damageFlash();
      eng.noiseEvent(this.pos, 6);
      if (this.hp <= 0) this._die();
      return { blocked: false };
    }

    heal(x) { this.hp = Math.min(this.maxHp, this.hp + x); }

    _die() {
      if (!this.alive) return;
      this.hp = 0;
      this.alive = false;
      G.audio.defeat();
      this.engine.onPlayerDeath();
    }

    revive() {
      this.alive = true;
      this.hp = this.maxHp;
      this.stamina = this.maxStamina;
    }

    dispose() {
      document.removeEventListener('keydown', this._onKeyDown);
      document.removeEventListener('keyup', this._onKeyUp);
      document.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('mousedown', this._onMouseDown);
      document.removeEventListener('mouseup', this._onMouseUp);
      document.removeEventListener('pointerlockchange', this._onLockChange);
      document.removeEventListener('contextmenu', this._onContext);
      this.engine.physics.removeBody(this.body);
    }
  }

  G.PARRY_WINDOW = 0.22;   // seconds — generous enough to be learnable
  G.PlayerController = PlayerController;
})();
