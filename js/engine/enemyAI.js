/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — engine/enemyAI.js
   Finite-state-machine soldier brains + the EnemyManager that owns every NPC.

   States: idle → patrol → investigate → engage → windup → recover → (flee) → dead
   - Vision cone + hearing radius drive detection (crouching player is harder
     to spot; sprinting & combat make noise events the AI investigates).
   - Melee units close in, telegraph a windup (visible + audible) and strike
     in timed windows so multi-enemy fights stay fair; they circle-strafe
     while recovering instead of stun-locking the player.
   - Archer units keep distance, kite when crowded, and loose physical arrows.
   - Units may break and flee at low health depending on their morale roll.
   - Allies use the same brain, target the opposing faction, and loosely
     follow the player when idle.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE, CANNON } = window.__MODULES__;
  const U = G.util;

  const TYPES = {
    melee: { hp: 55, speed: 3.6, dmg: 11, windup: 0.6, recover: [1.1, 2.0], range: 1.9, view: 26 },
    brute: { hp: 110, speed: 2.9, dmg: 21, windup: 0.85, recover: [1.6, 2.6], range: 2.2, view: 24 },
    archer: { hp: 40, speed: 3.4, dmg: 10, windup: 0.85, recover: [2.2, 3.2], range: 24, view: 32 },
    elite: { hp: 90, speed: 4.1, dmg: 14, windup: 0.5, recover: [0.9, 1.6], range: 2.0, view: 30 },
  };
  G.AI_TYPES = TYPES;

  class SoldierAI {
    constructor(engine, npc, opts = {}) {
      this.engine = engine;
      this.npc = npc;
      this.type = opts.type || 'melee';
      this.cfg = TYPES[this.type] || TYPES.melee;
      this.state = opts.patrol && opts.patrol.length ? 'patrol' : 'idle';
      this.patrol = opts.patrol || null;
      this.patrolIdx = 0;
      this.holdPos = opts.holdPos || null;          // stationary post (tower archers)
      this.followPlayer = opts.followPlayer || false;
      this.guardRadius = opts.guardRadius || 0;      // stay near spawn
      this.home = npc.group.position.clone();
      this.target = null;
      this.lastKnown = null;
      this.sightTimer = 0;
      this.senseT = Math.random() * 0.25;
      this.cooldown = U.rand(0.4, 1.4);
      this.stateT = 0;
      this.strafeDir = Math.random() < 0.5 ? 1 : -1;
      this.morale = U.rand(0, 1);
      this.fleeing = false;
      this.shoutCd = 0;
      this.passive = opts.passive || false;          // instructors etc.
    }

    /* --------------------------- senses --------------------------- */
    _opponents() {
      const eng = this.engine, out = [];
      const myFaction = this.npc.faction;
      if (myFaction === 'enemy' && eng.player.alive) out.push(eng.player);
      for (const n of eng.enemies.npcs) {
        if (!n.alive || n === this.npc) continue;
        if (n.faction !== myFaction && (n.faction === 'ally' || n.faction === 'enemy')) out.push(n);
      }
      return out;
    }

    _canSee(t) {
      const eng = this.engine;
      const myPos = this.npc.pos;
      const tPos = t.pos;
      let view = this.cfg.view;
      if (t.isPlayer && t.crouching) view *= 0.55;
      const d = U.flatDist(myPos, tPos);
      if (d > view) return { seen: false, d };
      // facing cone (~150° when engaged, ~120° when calm)
      const fwd = new THREE.Vector3(Math.sin(this.npc.yaw), 0, Math.cos(this.npc.yaw));
      const to = new THREE.Vector3().subVectors(tPos, myPos).setY(0).normalize();
      const cosLimit = this.state === 'engage' ? -0.5 : 0.15;
      if (fwd.dot(to) < cosLimit && d > 3) return { seen: false, d };
      // line of sight against static geometry
      const from = new CANNON.Vec3(myPos.x, myPos.y + 0.4, myPos.z);
      const to3 = new CANNON.Vec3(tPos.x, tPos.y, tPos.z);
      const res = eng.aiRayResult;
      res.reset();
      eng.physics.raycastClosest(from, to3, { collisionFilterMask: G.COL.STATIC, skipBackfaces: true }, res);
      return { seen: !res.hasHit, d };
    }

    _sense(dt) {
      this.senseT -= dt;
      if (this.senseT > 0) return;
      this.senseT = 0.22;
      const eng = this.engine;

      // keep / acquire target
      let best = null, bestD = Infinity, bestSeen = false;
      for (const t of this._opponents()) {
        const { seen, d } = this._canSee(t);
        if (seen && d < bestD) { best = t; bestD = d; bestSeen = true; }
      }
      if (bestSeen) {
        const instant = bestD < 9 || this.state === 'engage' || this.state === 'investigate';
        this.sightTimer += instant ? 1 : 0.3;
        if (this.sightTimer > 0.5) {
          if (this.target !== best) this._acquire(best);
          this.lastKnown = best.pos.clone();
        }
      } else {
        this.sightTimer = Math.max(0, this.sightTimer - 0.2);
        if (this.target && this.target.alive === false) this.target = null;
      }

      // hearing
      if (!this.target) {
        for (const n of eng.noises) {
          if (n.faction === this.npc.faction) continue;
          if (U.flatDist(this.npc.pos, n.pos) < n.radius) {
            this.lastKnown = n.pos.clone();
            if (this.state === 'idle' || this.state === 'patrol') this._setState('investigate');
          }
        }
      }
      // target died / lost
      if (this.target && this.target.alive === false) { this.target = null; this._setState(this.patrol ? 'patrol' : 'idle'); }
    }

    _acquire(t) {
      const wasCalm = this.state === 'idle' || this.state === 'patrol' || this.state === 'investigate';
      this.target = t;
      this.lastKnown = t.pos.clone();
      if (wasCalm) {
        this._setState('engage');
        if (this.npc.faction === 'enemy') G.audio.enemyHurt(); // alert bark
        // shout to nearby brothers-in-arms
        if (this.shoutCd <= 0) {
          this.shoutCd = 4;
          this.engine.enemies.alertNear(this.npc, t, 14);
          this.engine.events.emit('alerted', { npc: this.npc });
        }
      } else if (this.state !== 'windup' && this.state !== 'stagger' && this.state !== 'recover') {
        this._setState('engage');
      }
    }

    alertTo(target) {
      if (!this.npc.alive || this.passive || this.fleeing) return;
      if (this.state === 'idle' || this.state === 'patrol' || this.state === 'investigate') {
        this.target = target;
        this.lastKnown = target.pos.clone();
        this._setState('engage');
      }
    }

    _setState(s) {
      this.state = s;
      this.stateT = 0;
    }

    stagger(t = 1.6) {
      if (!this.npc.alive) return;
      this._setState('stagger');
      this.staggerFor = t;
      this.npc.rig.playStagger();
      G.audio.stagger();
    }

    /* --------------------------- update --------------------------- */
    update(dt) {
      const npc = this.npc, eng = this.engine;
      if (!npc.alive) return;
      this.stateT += dt;
      this.cooldown -= dt;
      this.shoutCd -= dt;
      if (this.passive) { npc.setMove(null, dt); return; }
      this._sense(dt);

      // morale check → flee
      if (!this.fleeing && npc.hp < npc.maxHp * 0.22 && this.morale < 0.3 && this.npc.faction === 'enemy' && this.type !== 'brute') {
        this.fleeing = true;
        this._setState('flee');
      }

      switch (this.state) {
        case 'idle': this._idle(dt); break;
        case 'patrol': this._patrol(dt); break;
        case 'investigate': this._investigate(dt); break;
        case 'engage': this._engage(dt); break;
        case 'windup': this._windup(dt); break;
        case 'recover': this._recover(dt); break;
        case 'stagger':
          npc.setMove(null, dt);
          if (this.stateT > this.staggerFor) this._setState(this.target ? 'engage' : 'idle');
          break;
        case 'flee': this._flee(dt); break;
      }
    }

    _idle(dt) {
      const npc = this.npc;
      if (this.followPlayer && this.engine.player.alive) {
        const d = U.flatDist(npc.pos, this.engine.player.pos);
        if (d > 5.5) { npc.setMove(this.engine.player.pos, dt, this.cfg.speed * (d > 12 ? 1.5 : 1)); return; }
      }
      npc.setMove(null, dt);
      // ambient idle look-around
      if (Math.random() < dt * 0.2) npc.yaw += U.rand(-0.8, 0.8);
    }

    _patrol(dt) {
      const npc = this.npc;
      const wp = this.patrol[this.patrolIdx];
      const target = new THREE.Vector3(wp[0], 0, wp[1]);
      if (U.flatDist(npc.pos, target) < 1.2) {
        this.patrolIdx = (this.patrolIdx + 1) % this.patrol.length;
        npc.setMove(null, dt);
      } else {
        npc.setMove(target, dt, this.cfg.speed * 0.55);
      }
    }

    _investigate(dt) {
      const npc = this.npc;
      if (!this.lastKnown) { this._setState(this.patrol ? 'patrol' : 'idle'); return; }
      if (U.flatDist(npc.pos, this.lastKnown) < 1.6 || this.stateT > 12) {
        // nothing here…
        this.lastKnown = null;
        this._setState(this.patrol ? 'patrol' : 'idle');
        return;
      }
      npc.setMove(this.lastKnown, dt, this.cfg.speed * 0.75);
    }

    _engage(dt) {
      const npc = this.npc, eng = this.engine;
      if (!this.target || this.target.alive === false) {
        this.target = null;
        this._setState(this.lastKnown ? 'investigate' : (this.patrol ? 'patrol' : 'idle'));
        return;
      }
      const tPos = this.target.pos;
      const d = U.flatDist(npc.pos, tPos);
      npc.faceToward(tPos, dt);

      if (this.type === 'archer') {
        // kite band: 9m … 22m
        if (d < 8) { npc.setMove(this._awayPoint(tPos, 6), dt, this.cfg.speed); return; }
        if (d > 23 && !this.holdPos) { npc.setMove(tPos, dt, this.cfg.speed); return; }
        npc.setMove(null, dt);
        if (this.cooldown <= 0) {
          const { seen } = this._canSee(this.target);
          if (seen) { this._setState('windup'); npc.rig.playBowDraw(); G.audio.bowDraw(); }
          else if (!this.holdPos) npc.setMove(tPos, dt, this.cfg.speed * 0.8);
        }
        return;
      }

      // melee: close the distance
      if (d > this.cfg.range) {
        npc.setMove(tPos, dt, this.cfg.speed, true);
        return;
      }
      npc.setMove(null, dt);
      if (this.cooldown <= 0 && eng.enemies.requestAttackToken(this, this.target)) {
        this._setState('windup');
        npc.rig.playWindup();
        G.audio.stagger(); // audible telegraph cue
      } else {
        // shuffle sideways while waiting for an opening
        const strafe = this._strafePoint(tPos, d);
        npc.setMove(strafe, dt, this.cfg.speed * 0.45, true);
      }
    }

    _windup(dt) {
      const npc = this.npc;
      if (!this.target || this.target.alive === false) { this._setState('idle'); return; }
      npc.faceToward(this.target.pos, dt, 6);
      npc.setMove(null, dt);
      if (this.stateT >= this.cfg.windup) {
        if (this.type === 'archer') {
          this._loose();
        } else {
          npc.rig.playStrike();
          this.engine.combat.npcStrike(npc, this.target, this.cfg.dmg * U.rand(0.85, 1.15));
        }
        this.cooldown = U.rand(this.cfg.recover[0], this.cfg.recover[1]);
        this.engine.enemies.releaseAttackToken(this);
        this._setState('recover');
      }
    }

    _loose() {
      const npc = this.npc, t = this.target;
      npc.rig.playRelease();
      const from = npc.pos.clone(); from.y += 0.35;
      const tp = t.pos.clone();
      // lead the target + gravity compensation + skill spread
      if (t.body) tp.addScaledVector(new THREE.Vector3(t.body.velocity.x, 0, t.body.velocity.z), U.flatDist(from, tp) / 26);
      const dist = from.distanceTo(tp);
      tp.y += dist * dist * 0.008;                       // arc up
      tp.x += U.rand(-1, 1) * dist * 0.035;              // spread
      tp.y += U.rand(-1, 1) * dist * 0.03;
      tp.z += U.rand(-1, 1) * dist * 0.035;
      const dir = tp.sub(from).normalize();
      this.engine.combat.fireArrow({ from, dir, speed: 27, owner: npc, damage: this.cfg.dmg });
    }

    _recover(dt) {
      const npc = this.npc;
      if (!this.target || this.target.alive === false) { this._setState('idle'); return; }
      npc.faceToward(this.target.pos, dt);
      const d = U.flatDist(npc.pos, this.target.pos);
      if (this.type === 'archer') {
        npc.setMove(null, dt);
      } else {
        // circle-strafe
        if (Math.random() < dt * 0.7) this.strafeDir *= -1;
        npc.setMove(this._strafePoint(this.target.pos, Math.max(d, 2.2)), dt, this.cfg.speed * 0.5, true);
      }
      if (this.cooldown <= 0) this._setState('engage');
    }

    _flee(dt) {
      const npc = this.npc;
      if (!this.target) { this._setState('idle'); this.fleeing = false; return; }
      if (this.stateT > 7) { this.fleeing = false; this.morale += 0.5; this._setState('engage'); return; }
      npc.setMove(this._awayPoint(this.target.pos, 10), dt, this.cfg.speed * 1.15);
    }

    _awayPoint(fromPos, dist) {
      const npc = this.npc;
      const dir = new THREE.Vector3().subVectors(npc.pos, fromPos).setY(0).normalize();
      if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
      return npc.pos.clone().addScaledVector(dir, dist);
    }
    _strafePoint(center, radius) {
      const npc = this.npc;
      const a = Math.atan2(npc.pos.x - center.x, npc.pos.z - center.z) + this.strafeDir * 0.55;
      return new THREE.Vector3(center.x + Math.sin(a) * radius, 0, center.z + Math.cos(a) * radius);
    }
  }
  G.SoldierAI = SoldierAI;

  /* ========================== ENEMY MANAGER ========================== */
  class EnemyManager {
    constructor(engine) {
      this.engine = engine;
      this.npcs = [];
      // limits how many melee units may swing at one target simultaneously
      this._tokens = new Map();
    }

    spawn(opts) {
      const npc = new G.SoldierNPC(this.engine, opts);
      if (opts.brain !== false && opts.type !== 'civilian' && opts.type !== 'worker') {
        npc.ai = new SoldierAI(this.engine, npc, opts);
      }
      this.npcs.push(npc);
      return npc;
    }

    combatants() { return this.npcs.filter((n) => n.alive && n.faction !== 'civilian'); }
    enemiesAlive() { return this.npcs.filter((n) => n.alive && n.faction === 'enemy').length; }
    alliesAlive() { return this.npcs.filter((n) => n.alive && n.faction === 'ally').length; }

    alertNear(source, target, radius) {
      for (const n of this.npcs) {
        if (!n.alive || n.faction !== source.faction || !n.ai || n === source) continue;
        if (U.flatDist(n.pos, source.pos) < radius) n.ai.alertTo(target);
      }
    }
    alertAllEnemies(target) {
      for (const n of this.npcs) if (n.alive && n.faction === 'enemy' && n.ai) n.ai.alertTo(target);
    }

    /* fair-fight valve: at most 2 melee attackers on one target at a time */
    requestAttackToken(ai, target) {
      const cur = this._tokens.get(target) || [];
      const live = cur.filter((a) => a.npc.alive && (a.state === 'windup' || a.state === 'engage') && a._hasToken);
      if (live.length >= 2 && !live.includes(ai)) { this._tokens.set(target, live); return false; }
      if (!live.includes(ai)) live.push(ai);
      ai._hasToken = true;
      this._tokens.set(target, live);
      return true;
    }
    releaseAttackToken(ai) { ai._hasToken = false; }

    update(dt) {
      const camPos = this.engine.camera.position;
      for (const n of this.npcs) {
        // LOD: distant NPCs tick their skeleton animation less often
        const d2 = (n.group.position.x - camPos.x) ** 2 + (n.group.position.z - camPos.z) ** 2;
        n.lodFar = d2 > 2500; // >50m
        if (n.ai && n.alive && !this.engine.cinematic.active) n.ai.update(dt);
        n.update(dt);
      }
    }

    dispose() {
      for (const n of this.npcs) n.dispose();
      this.npcs.length = 0;
    }
  }
  G.EnemyManager = EnemyManager;
})();
