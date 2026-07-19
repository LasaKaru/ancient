/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — engine/combatSystem.js
   Player melee (3-swing combo, timed hit window, stamina costs), block/draw
   input routing, and the shared arrow projectile simulation used by BOTH the
   player and enemy archers: arrows are integrated with gravity and swept each
   frame with a cannon-es raycast so fast shafts never tunnel through walls;
   on impact they stick into the surface (or the unlucky soldier).
   Arrow meshes come from a fixed pool (Section 14: object pooling).
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE, CANNON } = window.__MODULES__;
  const U = G.util;

  /* Melee arsenal (v0.2 "Armoury"). Slots 1–5; spear/axe/mace/dagger are
     unlocked through the skill tree (see ui/skillsMenu.jsx). */
  const MELEE = {
    sword:  { slot: 1, name: 'War Sword', icon: '⚔️', dmg: [22, 25, 34], dur: 0.42, hitAt: 0.19, cost: 12, range: 2.5, arc: 0.72, style: 'slash' },
    spear:  { slot: 2, name: 'War Spear', icon: '🔱', dmg: [20, 22, 30], dur: 0.5, hitAt: 0.24, cost: 11, range: 3.5, arc: 0.85, style: 'thrust', vsBrute: 1.2, skill: 'spear' },
    axe:    { slot: 3, name: 'Battle Axe', icon: '🪓', dmg: [30, 34, 46], dur: 0.62, hitAt: 0.32, cost: 17, range: 2.4, arc: 0.6, style: 'chop', staggerChance: 0.5, structDmg: 2.4, skill: 'axe' },
    mace:   { slot: 4, name: 'War Mace', icon: '🔨', dmg: [26, 30, 40], dur: 0.55, hitAt: 0.27, cost: 15, range: 2.2, arc: 0.65, style: 'chop', vsArmor: 1.5, skill: 'mace' },
    dagger: { slot: 5, name: "Hunter's Knife", icon: '🗡️', dmg: [14, 15, 20], dur: 0.26, hitAt: 0.12, cost: 7, range: 1.9, arc: 0.62, style: 'slash', backstab: 3, skill: 'dagger' },
  };
  G.MELEE = MELEE;
  const DRAW_TIME = 0.85;
  const ARROW_POOL = 44;
  const ARROW_G = 11.5;

  class CombatSystem {
    constructor(engine) {
      this.engine = engine;
      this.weapon = 'sword';       // any MELEE key, or 'bow'
      this.lastMelee = 'sword';
      this.arrows = 12;
      this.quiverMax = 24;

      // melee state
      this.attacking = false;
      this.attackT = 0;
      this.combo = 0;
      this.comboWindow = 0;
      this._didHit = false;
      this.secondaryHeld = false;

      // bow state
      this.drawing = false;
      this.drawPct = 0;
      this.nocked = true;

      this._buildArrowPool();
    }

    /* ------------------------- arrow pool ------------------------- */
    _buildArrowPool() {
      const lib = G.Mats.library();
      this.pool = [];
      this.active = [];
      const shaftGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.78, 5);
      shaftGeo.rotateX(Math.PI / 2);
      shaftGeo.translate(0, 0, -0.28);
      const headGeo = new THREE.ConeGeometry(0.028, 0.09, 5);
      headGeo.rotateX(Math.PI / 2);
      headGeo.translate(0, 0, 0.12);
      const fletchGeo = new THREE.PlaneGeometry(0.09, 0.05);
      const shaftMat = G.Mats.std({ color: 0xa8813f, rough: 0.8 });
      const fletchMat = G.Mats.std({ color: 0xd8d2bd, rough: 0.95, side: THREE.DoubleSide });
      const flameMat = new THREE.SpriteMaterial({
        map: G.Mats.canvasTex('arrowflame', 32, (c, s) => {
          const g2 = c.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
          g2.addColorStop(0, 'rgba(255,240,170,1)');
          g2.addColorStop(0.5, 'rgba(255,140,30,0.8)');
          g2.addColorStop(1, 'rgba(200,40,0,0)');
          c.fillStyle = g2; c.fillRect(0, 0, s, s);
        }),
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
      });
      for (let i = 0; i < ARROW_POOL; i++) {
        const grp = new THREE.Group();
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        const head = new THREE.Mesh(headGeo, lib.iron);
        grp.add(shaft, head);
        for (const a of [0, Math.PI / 2]) {
          const f = new THREE.Mesh(fletchGeo, fletchMat);
          f.position.z = -0.6;
          f.rotation.z = a;
          grp.add(f);
        }
        const flame = new THREE.Sprite(flameMat);
        flame.scale.set(0.28, 0.34, 1);
        flame.position.z = 0.05;
        flame.visible = false;
        grp.add(flame);
        grp.visible = false;
        grp.castShadow = false;
        this.engine.scene.add(grp);
        this.pool.push({
          mesh: grp, flame, alive: false, stuck: false, flaming: false,
          pos: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(),
          owner: null, damage: 0, life: 0, stickParent: null, stickLocal: new THREE.Vector3(),
        });
      }
      this._rayFrom = new CANNON.Vec3();
      this._rayTo = new CANNON.Vec3();
      this._rayRes = new CANNON.RaycastResult();
    }

    _getArrow() {
      let a = this.pool.find((x) => !x.alive);
      if (!a) { a = this.active.shift(); this._retire(a); }
      a.alive = true; a.stuck = false; a.life = 0; a.stickParent = null;
      a.mesh.visible = true;
      if (a.mesh.parent !== this.engine.scene) {
        this.engine.scene.attach(a.mesh);
      }
      this.active.push(a);
      return a;
    }
    _retire(a) {
      a.alive = false; a.stuck = false;
      a.mesh.visible = false;
      if (a.mesh.parent !== this.engine.scene) this.engine.scene.attach(a.mesh);
      const i = this.active.indexOf(a);
      if (i >= 0) this.active.splice(i, 1);
    }

    /* ----------------------- input handlers ----------------------- */
    get cfg() { return MELEE[this.weapon] || MELEE.sword; }
    get isMelee() { return this.weapon !== 'bow'; }

    isBlockingOrDrawing() {
      return (this.isMelee && this.secondaryHeld) || (this.weapon === 'bow' && this.drawing);
    }

    /** Direct slot selection (keys 1–5). Locked weapons prompt their skill. */
    selectMelee(id) {
      const def = MELEE[id];
      if (!def || this.attacking) return;
      if (def.skill && !(G.Skills && G.Skills.owned(def.skill))) {
        this.engine.ui.toast('LEARN "' + def.name.toUpperCase() + '" IN THE SKILLS PAGE (K)');
        G.audio.ui();
        return;
      }
      if (this.weapon === id) return;
      this.drawing = false; this.drawPct = 0; this.secondaryHeld = false;
      this.weapon = id;
      this.lastMelee = id;
      G.audio.interact();
      this.engine.playerRig?.onWeaponSwitch(id);
    }

    primaryDown() {
      const player = this.engine.player;
      if (!player.alive) return;
      if (this.isMelee) {
        if (this.secondaryHeld) return; // can't swing while guarding
        this._trySwing();
      } else if (this.weapon === 'bow') {
        if (this.drawing && this.drawPct > 0.2) this._releaseArrow();
        else G.audio.ui();
      }
    }
    primaryUp() {}

    secondaryDown() {
      this.secondaryHeld = true;
      if (this.weapon === 'bow') {
        if (this.arrows <= 0) { this.engine.ui.toast('QUIVER EMPTY'); G.audio.ui(); return; }
        if (!this.nocked) this.nockArrow();
        if (this.nocked) {
          this.drawing = true;
          this.drawPct = 0;
          G.audio.bowDraw();
        }
      }
    }
    secondaryUp() {
      this.secondaryHeld = false;
      if (this.weapon === 'bow' && this.drawing) {
        this.drawing = false;      // released without firing → let the string down
        this.drawPct = 0;
      }
    }

    switchWeapon() {
      if (this.attacking) return;
      this.drawing = false; this.drawPct = 0; this.secondaryHeld = false;
      this.weapon = this.isMelee ? 'bow' : this.lastMelee;
      G.audio.interact();
      this.engine.playerRig?.onWeaponSwitch(this.weapon);
    }

    nockArrow() {
      if (this.weapon !== 'bow') return;
      if (this.arrows <= 0) { this.engine.ui.toast('QUIVER EMPTY'); return; }
      this.nocked = true;
      G.audio.footstep(false);
    }

    addArrows(n) {
      this.arrows = Math.min(this.quiverMax, this.arrows + n);
      this.nocked = this.arrows > 0;
    }

    /* -------------------------- melee -------------------------- */
    _trySwing() {
      const player = this.engine.player;
      const cfg = this.cfg;
      if (this.attacking || player.exhausted) return;
      if (player.stamina < cfg.cost * 0.5) { this.engine.ui.toast('EXHAUSTED'); return; }
      // combo chaining
      this.combo = this.comboWindow > 0 ? (this.combo + 1) % 3 : 0;
      this.attacking = true;
      this.attackT = 0;
      this._didHit = false;
      player.stamina -= cfg.cost;
      player.staminaRegenDelay = 0.8;
      G.audio.swordSwing();
      this.engine.noiseEvent(player.pos, 9);
      this.engine.playerRig?.playSwing(this.combo);
    }

    _applyMeleeHit() {
      const eng = this.engine, player = eng.player;
      const cfg = this.cfg;
      const origin = player.pos;
      const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
      let hitSomething = false;

      const tryHit = (t, isStruct) => {
        if (!t || t.alive === false) return;
        const tp = t.pos;
        const to = new THREE.Vector3().subVectors(tp, origin);
        const dist = Math.hypot(to.x, to.z);
        if (dist > cfg.range + (t.radius || 0)) return;
        to.setY(0).normalize();
        if (to.dot(fwd) < cfg.arc) return;
        hitSomething = true;
        let dmg = cfg.dmg[this.combo];
        if (isStruct && cfg.structDmg) dmg *= cfg.structDmg;
        if (!isStruct && t.type) {
          if (cfg.vsBrute && t.type === 'brute') dmg *= cfg.vsBrute;
          if (cfg.vsArmor && (t.type === 'brute' || t.type === 'elite')) dmg *= cfg.vsArmor;
        }
        // knife in the back — three-fold, as the hunters teach
        if (!isStruct && cfg.backstab && t.yaw !== undefined) {
          const tFwd = new THREE.Vector3(Math.sin(t.yaw), 0, Math.cos(t.yaw));
          const fromT = new THREE.Vector3().subVectors(origin, tp).setY(0).normalize();
          if (tFwd.dot(fromT) < -0.35) {
            dmg *= cfg.backstab;
            eng.ui.toast('BACKSTAB');
          }
        }
        t.takeDamage(dmg, { dir: fwd.clone(), type: 'melee', from: player, attackerPos: origin });
        if (!isStruct && cfg.staggerChance && t.stagger && Math.random() < cfg.staggerChance) t.stagger(1.0);
      };

      for (const e of eng.enemies.combatants()) if (e.faction !== 'ally') tryHit(e, false);
      for (const t of eng.targets) tryHit(t, false);
      for (const d of eng.attackables) tryHit(d, true);
      for (const d of eng.destructibles) if (!d.broken) tryHit(d, true);

      if (hitSomething) {
        player.viewShake = Math.max(player.viewShake, 0.25);
      }
    }

    /* --------------------------- bow --------------------------- */
    _releaseArrow() {
      const player = this.engine.player;
      if (this.arrows <= 0) return;
      this.arrows--;
      const power = this.drawPct;
      this.drawing = this.secondaryHeld && this.arrows > 0; // keep drawing next arrow if still holding
      this.drawPct = 0;
      this.nocked = this.arrows > 0;
      G.audio.bowRelease(power);
      this.engine.noiseEvent(player.pos, 14);
      this.engine.playerRig?.playRelease();

      const flaming = G.Skills && G.Skills.owned('fire_arrows');
      const dir = new THREE.Vector3();
      this.engine.camera.getWorldDirection(dir);
      const from = this.engine.camera.position.clone().addScaledVector(dir, 0.55);
      from.y -= 0.06;
      this.fireArrow({
        from, dir,
        speed: 16 + power * 26,
        owner: player,
        damage: (18 + power * 26) * (flaming ? 1.35 : 1),
        flaming,
      });
    }

    /**
     * Shared projectile spawn — used by player and enemy archers.
     * opts: { from:V3, dir:V3, speed, owner (entity with .faction), damage }
     */
    fireArrow({ from, dir, speed, owner, damage, flaming = false }) {
      const a = this._getArrow();
      a.pos.copy(from);
      a.prev.copy(from);
      a.vel.copy(dir).normalize().multiplyScalar(speed);
      a.owner = owner;
      a.damage = damage;
      a.flaming = flaming;
      a.flame.visible = flaming;
      a.mesh.position.copy(from);
      a.mesh.lookAt(from.clone().add(a.vel));
    }

    /* -------------------------- update -------------------------- */
    update(dt) {
      const eng = this.engine, player = eng.player;

      // melee swing lifecycle (timings come from the equipped weapon)
      if (this.attacking) {
        const cfg = this.cfg;
        this.attackT += dt;
        if (!this._didHit && this.attackT >= cfg.hitAt) {
          this._didHit = true;
          this._applyMeleeHit();
        }
        if (this.attackT >= cfg.dur) {
          this.attacking = false;
          this.comboWindow = 0.55;
        }
      } else if (this.comboWindow > 0) {
        this.comboWindow -= dt;   // once it expires, _trySwing restarts the combo at 0
      }

      // bow draw (Quick Draw skill shortens it)
      if (this.weapon === 'bow' && this.drawing && player.alive) {
        const drawTime = DRAW_TIME / ((G.Skills && G.Skills.owned('quick_draw')) ? 1.3 : 1);
        this.drawPct = Math.min(1, this.drawPct + dt / drawTime);
      }
      // aim-down zoom once drawing (deeper when fully drawn — the "hold" reward)
      const zoom = this.weapon === 'bow' ? -(this.drawPct * 9 + (this.drawPct >= 1 ? 4 : 0)) : 0;
      player.fovOffset = U.damp(player.fovOffset, zoom, 8, dt);

      // integrate arrows
      for (let i = this.active.length - 1; i >= 0; i--) {
        const a = this.active[i];
        a.life += dt;
        if (a.stuck) {
          if (a.flaming && a.flame.visible && a.life > 2.5) a.flame.visible = false;
          if (a.life > 14) this._retire(a);
          continue;
        }
        if (a.life > 8) { this._retire(a); continue; }
        a.prev.copy(a.pos);
        a.vel.y -= ARROW_G * dt;
        a.pos.addScaledVector(a.vel, dt);

        // swept collision test via cannon raycast (prev → pos)
        this._rayFrom.set(a.prev.x, a.prev.y, a.prev.z);
        this._rayTo.set(a.pos.x, a.pos.y, a.pos.z);
        this._rayRes.reset();
        const ownerIsPlayer = !!(a.owner && a.owner.isPlayer);
        const mask = G.COL.GROUND | G.COL.STATIC | G.COL.NPC | (ownerIsPlayer ? 0 : G.COL.PLAYER);
        eng.physics.raycastClosest(this._rayFrom, this._rayTo, { collisionFilterMask: mask, skipBackfaces: false }, this._rayRes);

        if (this._rayRes.hasHit) {
          const hp = this._rayRes.hitPointWorld;
          const hitPoint = new THREE.Vector3(hp.x, hp.y, hp.z);
          const hitBody = this._rayRes.body;
          const ent = hitBody && hitBody.userData ? hitBody.userData.entity : null;
          this._arrowImpact(a, hitPoint, hitBody, ent);
          continue;
        }
        a.mesh.position.copy(a.pos);
        a.mesh.lookAt(a.pos.clone().add(a.vel));
      }
    }

    _arrowImpact(a, hitPoint, hitBody, ent) {
      const eng = this.engine;
      a.stuck = true;
      a.vel.set(0, 0, 0);
      const dirNorm = a.pos.clone().sub(a.prev).normalize();
      a.mesh.position.copy(hitPoint).addScaledVector(dirNorm, -0.06);
      a.mesh.lookAt(a.mesh.position.clone().add(dirNorm));

      if (ent && ent.isPlayer) {
        if (a.owner === ent || (a.owner && a.owner.faction === 'ally')) { this._retire(a); return; }
        ent.takeDamage(a.damage, a.owner ? a.owner.pos : hitPoint, { type: 'arrow', attacker: a.owner });
        this._retire(a); // no first-person pincushion
        return;
      }
      if (ent && ent.takeDamage) {
        const sameFaction = a.owner && ent.faction && a.owner.faction === ent.faction;
        if (!sameFaction && ent.alive !== false) {
          const crit = hitPoint.y > (ent.pos ? ent.pos.y + 0.42 : 1.6);
          ent.takeDamage(a.damage * (crit ? 1.7 : 1), { dir: dirNorm, type: 'arrow', from: a.owner, crit });
          G.audio.arrowHit('flesh');
          if (crit && a.owner && a.owner.isPlayer) eng.ui.toast('CRITICAL HIT');
        } else {
          G.audio.arrowHit('flesh');
        }
        // stick into the body: parent to its mesh so it rides along
        if (ent.group) {
          ent.group.attach(a.mesh);
          a.stickParent = ent;
        }
        a.life = 8; // shorter linger on bodies
        return;
      }
      // stuck in the world (ground / walls / props)
      G.audio.arrowHit(hitBody && hitBody.userData && hitBody.userData.surface ? hitBody.userData.surface : 'wood');
      // nearby attackable structures (gate, barricades) take chip damage;
      // fire arrows bite wood twice as hard
      const structMul = a.flaming ? 2 : 1;
      for (const d of eng.attackables) {
        if (d.pos && hitPoint.distanceTo(d.pos) < (d.radius || 2.5) + 0.6 && d.takeDamage) d.takeDamage(a.damage * 0.4 * structMul, { type: 'arrow' });
      }
      for (const d of eng.destructibles) {
        if (!d.broken && d.pos && hitPoint.distanceTo(d.pos) < 1.6 && d.takeDamage) d.takeDamage(a.damage * 0.5 * structMul, { type: 'arrow' });
      }
    }

    /* ------------- NPC melee strike (called by enemy AI) ------------- */
    npcStrike(attacker, target, damage) {
      if (!target || target.alive === false) return;
      const dist = U.flatDist(attacker.pos, target.pos);
      if (dist > 2.6) return; // target escaped during windup
      if (target.isPlayer) {
        target.takeDamage(damage, attacker.pos, { type: 'melee', attacker });
      } else if (target.takeDamage) {
        target.takeDamage(damage, { dir: null, type: 'melee', from: attacker, attackerPos: attacker.pos });
        G.audio.swordClash();
      }
    }

    hudInfo() {
      const def = this.isMelee ? this.cfg : null;
      return {
        weapon: this.weapon,
        weaponName: def ? def.name : 'Longbow',
        weaponIcon: def ? def.icon : '🏹',
        arrows: this.arrows,
        quiverMax: this.quiverMax,
        drawPct: this.drawPct,
        drawing: this.drawing,
      };
    }

    dispose() {
      for (const a of this.pool) {
        if (a.mesh.parent) a.mesh.parent.remove(a.mesh);
      }
    }
  }

  G.CombatSystem = CombatSystem;
})();
