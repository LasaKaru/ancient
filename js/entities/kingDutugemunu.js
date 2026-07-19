/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — entities/kingDutugemunu.js
   Scripted "hero" NPCs that sit above the generic soldier brain:
     · King Dutugemunu — regal rig for briefings, cutscenes and the duel intro.
     · Elara — the final-duel boss: phase-based attack patterns with clearly
       telegraphed windups (raised blade + glow + audio cue) so the fight is
       skill/parry-based rather than a damage sponge.
     · The Dasa Maha Yodhayo (Ten Giant Warriors) squad factory.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util;

  /* ------------------------- King Dutugemunu ------------------------- */
  class KingDutugemunu {
    constructor(engine, { pos = [0, 0], yaw = 0, showName = true } = {}) {
      this.engine = engine;
      this.npc = engine.enemies.spawn({
        faction: 'ally', type: 'elite', pos, yaw,
        palette: 'royal', crown: true, cape: true, plume: false,
        name: 'King Dutugemunu', showName, nameColor: '#f3cd7a',
        hp: 400, brain: false, passive: true,
      });
      this.npc.isKing = true;
      this._queue = [];
      this._walking = null;
    }
    get pos() { return this.npc.pos; }

    say(line, dur = 4) {
      this.engine.ui.subtitle('King Dutugemunu', line, dur);
    }
    walkTo(x, z, speed = 2.2) { this._walking = { target: new THREE.Vector3(x, 0, z), speed }; }
    face(pos) { this.npc.faceToward(pos, 1, 99); }
    cheer() { this.npc.rig.playCheer(); }

    update(dt) {
      if (this._walking) {
        const w = this._walking;
        if (U.flatDist(this.npc.group.position, w.target) < 0.4) {
          this._walking = null;
          this.npc.setMove(null, dt);
        } else {
          this.npc.setMove(w.target, dt, w.speed);
        }
      }
    }
  }
  G.KingDutugemunu = KingDutugemunu;

  /* ----------------------------- Elara ------------------------------- */
  /* Duel boss. Attack patterns:
       overhead — long windup, heavy hit, prime parry-training tool
       sweep    — quicker windup, wide arc, block (or back off)
       charge   — from range: roar, then a straight rush; sidestep it
     Parrying any strike staggers him and opens a 2s bonus-damage window.  */
  class ElaraBoss {
    constructor(engine, { pos = [0, 0], yaw = 0 } = {}) {
      this.engine = engine;
      this.npc = engine.enemies.spawn({
        faction: 'enemy', type: 'elite', pos, yaw,
        palette: 'boss', cape: true, plume: true, scale: 1.18,
        name: 'Elara', showName: true, nameColor: '#e08a7a',
        hp: 340, brain: false, weapon: 'sword',
      });
      this.npc.isBoss = true;
      this.maxHp = this.npc.maxHp;

      // telegraph glow on his blade
      const sword = this.npc.rig.weapons.sword;
      this.glowMat = sword.children[0].material.clone();
      sword.children[0].material = this.glowMat;

      this.state = 'idle';   // idle | stalk | windup | strike | dash | recover | staggered | dead
      this.stateT = 0;
      this.attack = null;
      this.strafeDir = 1;
      this.started = false;
      this.vulnT = 0;

      // parry → stagger hookup: intercept damage for the bonus window
      const orig = this.npc.takeDamage.bind(this.npc);
      this.npc.takeDamage = (amount, info = {}) => {
        if (this.state === 'dead') return;
        const mult = this.vulnT > 0 ? 1.6 : 1;
        orig(amount * mult, info);
        if (!this.npc.alive && this.state !== 'dead') this._die();
        this.engine.ui.bossBar('ELARA, KING OF RAJARATA', Math.max(0, this.npc.hp) / this.maxHp);
      };
      this.npc.stagger = (t) => this._stagger(t);
    }

    get phase() {
      const f = this.npc.hp / this.maxHp;
      return f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
    }

    begin() {
      this.started = true;
      this.state = 'stalk';
      this.stateT = 0;
      this.engine.ui.bossBar('ELARA, KING OF RAJARATA', 1);
    }

    _stagger(t = 2.0) {
      if (this.state === 'dead') return;
      this.state = 'staggered';
      this.stateT = 0;
      this.staggerFor = t;
      this.vulnT = t;
      this.npc.rig.playStagger();
      this.glowMat.emissive = new THREE.Color(0x000000);
      this.engine.ui.toast('ELARA IS OPEN — STRIKE');
    }

    _die() {
      this.state = 'dead';
      this.engine.ui.bossBar(null);
      this.engine.events.emit('bossDefeated', { boss: 'elara' });
    }

    _setState(s) { this.state = s; this.stateT = 0; }

    _pickAttack(dist) {
      const p = this.phase;
      if (dist > 4.5 && (p >= 2 || Math.random() < 0.35)) return 'charge';
      if (Math.random() < (p === 1 ? 0.55 : 0.42)) return 'overhead';
      return 'sweep';
    }

    update(dt) {
      if (!this.started || this.state === 'dead') return;
      const eng = this.engine, player = eng.player, npc = this.npc;
      if (!npc.alive) { this._die(); return; }
      if (!player.alive) { npc.setMove(null, dt); return; }
      this.stateT += dt;
      this.vulnT = Math.max(0, this.vulnT - dt);
      const dist = U.flatDist(npc.pos, player.pos);
      const p = this.phase;
      const speedMul = p === 1 ? 1 : p === 2 ? 1.18 : 1.32;

      switch (this.state) {
        case 'stalk': {
          npc.faceToward(player.pos, dt);
          // hold a menacing 2.6m orbit, then commit
          if (dist > 2.9) npc.setMove(player.pos, dt, 3.1 * speedMul, true);
          else {
            if (Math.random() < dt * 0.5) this.strafeDir *= -1;
            const a = Math.atan2(npc.pos.x - player.pos.x, npc.pos.z - player.pos.z) + this.strafeDir * 0.5;
            npc.setMove(new THREE.Vector3(player.pos.x + Math.sin(a) * 2.6, 0, player.pos.z + Math.cos(a) * 2.6), dt, 2.2 * speedMul, true);
          }
          const patience = p === 1 ? 2.2 : p === 2 ? 1.5 : 1.1;
          if (this.stateT > patience && (dist < 3.2 || dist > 4.5)) {
            this.attack = this._pickAttack(dist);
            if (this.attack === 'charge' && dist < 4.5) this.attack = 'sweep';
            this._setState('windup');
            npc.rig.playWindup();
            G.audio.stagger();                        // audible telegraph
            if (this.attack === 'charge') G.audio.warHorn();
          }
          break;
        }
        case 'windup': {
          npc.setMove(null, dt);
          npc.faceToward(player.pos, dt, 4);
          const windups = { overhead: 0.95, sweep: 0.65, charge: 0.75 };
          const wu = windups[this.attack] / (p === 3 ? 1.15 : 1);
          // blade glows through the windup — the visual telegraph
          const glow = Math.min(1, this.stateT / wu);
          this.glowMat.emissive = new THREE.Color(0xff3010).multiplyScalar(glow * 0.8);
          if (this.stateT >= wu) {
            this.glowMat.emissive = new THREE.Color(0x000000);
            if (this.attack === 'charge') {
              this._dashDir = new THREE.Vector3().subVectors(player.pos, npc.pos).setY(0).normalize();
              this._dashHit = false;
              this._setState('dash');
              npc.rig.playStrike();
            } else {
              npc.rig.playStrike();
              eng.combat.npcStrike(npc, player, this.attack === 'overhead' ? 20 : 14);
              this._combo = (p >= 2 && this.attack === 'sweep' && Math.random() < 0.6) ? 1 : 0;
              this._setState(this._combo ? 'combo' : 'recover');
            }
          }
          break;
        }
        case 'combo': { // fast follow-up after a sweep (phase 2+)
          npc.faceToward(player.pos, dt, 5);
          if (this.stateT > 0.42) {
            npc.rig.playStrike();
            eng.combat.npcStrike(npc, player, 12);
            this._setState('recover');
          } else if (this.stateT > 0.12 && this.stateT < 0.2) {
            npc.rig.playWindup();
          }
          break;
        }
        case 'dash': {
          const step = 11.5 * dt;
          npc.group.position.x += this._dashDir.x * step;
          npc.group.position.z += this._dashDir.z * step;
          npc.yaw = Math.atan2(this._dashDir.x, this._dashDir.z);
          npc.rig.speedPct = 1;
          if (!this._dashHit && U.flatDist(npc.pos, player.pos) < 1.5) {
            this._dashHit = true;
            player.takeDamage(24, npc.pos, { type: 'melee', attacker: npc });
          }
          // arena bounds guard
          if (this.stateT > 0.75 || Math.hypot(npc.group.position.x, npc.group.position.z) > 26) this._setState('recover');
          break;
        }
        case 'recover': {
          npc.faceToward(player.pos, dt, 3);
          if (Math.random() < dt) this.strafeDir *= -1;
          const a = Math.atan2(npc.pos.x - player.pos.x, npc.pos.z - player.pos.z) + this.strafeDir * 0.35;
          npc.setMove(new THREE.Vector3(player.pos.x + Math.sin(a) * 3.1, 0, player.pos.z + Math.cos(a) * 3.1), dt, 1.8, true);
          const rec = (p === 1 ? 1.6 : p === 2 ? 1.15 : 0.85);
          if (this.stateT > rec) this._setState('stalk');
          break;
        }
        case 'staggered': {
          npc.setMove(null, dt);
          if (this.stateT > this.staggerFor) this._setState('recover');
          break;
        }
      }
    }
  }
  G.ElaraBoss = ElaraBoss;

  /* -------------------- the Ten Giant Warriors -------------------- */
  const GIANT_NAMES = [
    'Nandhimitra', 'Suranimala', 'Mahasona', 'Gothaimbara', 'Theraputtabhaya',
    'Bharana', 'Velusumana', 'Khanjadeva', 'Phussadeva', 'Labhiya Vasabha',
  ];
  G.GIANT_NAMES = GIANT_NAMES;

  /**
   * Spawn `count` of the Dasa Maha Yodhayo around `center`, as elite allies
   * that follow the player and join every fight.
   */
  G.spawnGiants = function (engine, { center = [0, 0], count = 4, names = null, followPlayer = true } = {}) {
    const chosen = names || GIANT_NAMES.slice(0, count);
    const out = [];
    chosen.forEach((name, i) => {
      const a = (i / chosen.length) * Math.PI * 2;
      const npc = engine.enemies.spawn({
        faction: 'ally', type: 'elite',
        pos: [center[0] + Math.sin(a) * 2.8, center[1] + Math.cos(a) * 2.8],
        yaw: a + Math.PI,
        name, showName: true,
        followPlayer,
        hp: 160,
        scale: 1.12 + (i % 3) * 0.035,
        tintCloth: [0x7a2f22, 0x8a5a1e, 0x5a6e2a, 0x6e3a52][i % 4],
      });
      npc.isGiant = true;
      out.push(npc);
    });
    return out;
  };
})();
