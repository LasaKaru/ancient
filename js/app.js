/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — app.js
   The spine of the game:
     · G.Settings        — live settings store (graphics/controls/audio/access)
     · G.GameState       — profile + campaign progress (localStorage-backed)
     · MissionSystem     — objectives, reveals, counters, completion flow
     · GameEngine        — orchestrates physics, world, player, combat, AI,
                           interactions, zones, checkpoints, cinematics
     · React application — screen router: Menu → Brief → Game (HUD / Pause /
                           Death) → Summary → Victory → Credits
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { React, ReactDOMClient, THREE, CANNON, R3F } = window.__MODULES__;
  const h = React.createElement;
  const { Canvas, useFrame, useThree } = R3F;
  const U = G.util;

  /* ===================== collision groups ===================== */
  G.COL = { GROUND: 1, PLAYER: 2, NPC: 4, STATIC: 8 };

  /* ========================= SETTINGS ========================= */
  const DEFAULT_SETTINGS = () => ({
    graphics: {
      preset: 'medium', postFX: true, fov: 75, fpsCap: 60,
      drawDistance: 180, foliage: 0.8, pixelRatio: 1.5,
      camera: 'first',            // 'first' | 'third' (V toggles in the field)
      showFPS: false,             // v1.0 polish: on-screen frame-rate readout
      autoQuality: true,          // v1.0 polish: step the preset down on sustained low FPS
    },
    realism: {                    // v0.3: one dial for how punishing the war is
      preset: 'standard',
      damageTaken: 1, damageDealt: 1,
      regen: 'standard',          // 'arcade' | 'standard' | 'none'
      enemyAwareness: 1,
      arrowDrop: 1,
      hudMinimal: false,
    },
    controls: {
      sensitivity: 1.0, invertY: false,
      keys: {
        forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
        sprint: 'ShiftLeft', jump: 'Space', crouch: 'KeyC',
        switchWeapon: 'KeyQ', nock: 'KeyR', interact: 'KeyF',
        missionLog: 'Tab', pause: 'Escape',
        herb: 'KeyG', rally: 'KeyT', skills: 'KeyK', camera: 'KeyV',
        lure: 'KeyB', sense: 'KeyX', shield: 'KeyH', javelin: 'KeyZ',
      },
    },
    audio: { master: 0.8, music: 0.65, sfx: 0.9, ambience: 0.7 },
    access: { subtitles: true, colorblind: false, threatRing: true, autoPause: true },
  });
  const PRESETS = {
    low: { drawDistance: 120, foliage: 0.4, pixelRatio: 1, postFX: false },
    medium: { drawDistance: 180, foliage: 0.8, pixelRatio: 1.5, postFX: true },
    high: { drawDistance: 250, foliage: 1.0, pixelRatio: 2, postFX: true },
    ultra: { drawDistance: 330, foliage: 1.3, pixelRatio: 2, postFX: true },
  };
  const REALISM_PRESETS = {
    arcade: { damageTaken: 0.6, damageDealt: 1.25, regen: 'arcade', enemyAwareness: 0.8, arrowDrop: 0.7, hudMinimal: false },
    standard: { damageTaken: 1, damageDealt: 1, regen: 'standard', enemyAwareness: 1, arrowDrop: 1, hudMinimal: false },
    realistic: { damageTaken: 1.5, damageDealt: 1, regen: 'none', enemyAwareness: 1.25, arrowDrop: 1.3, hudMinimal: true },
  };
  G.REALISM_PRESETS = REALISM_PRESETS;
  /* live accessor used by combat / AI / player each frame */
  G.Realism = () => G.Settings.data.realism;

  G.Settings = {
    data: DEFAULT_SETTINGS(),
    _subs: new Set(),
    subscribe(fn) { this._subs.add(fn); return () => this._subs.delete(fn); },
    _notify() { for (const fn of this._subs) fn(); this._persist(); },
    get(path) { return path.split('.').reduce((o, k) => (o ? o[k] : undefined), this.data); },
    set(path, value) {
      const keys = path.split('.');
      let o = this.data;
      for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
      o[keys[keys.length - 1]] = value;
      // hand-tuning any realism dial drops the preset to "custom"
      if (path.startsWith('realism.') && path !== 'realism.preset') this.data.realism.preset = 'custom';
      this._notify();
    },
    applyPreset(name) {
      this.data.graphics.preset = name;
      Object.assign(this.data.graphics, PRESETS[name]);
      this._notify();
    },
    applyRealism(name) {
      if (!REALISM_PRESETS[name]) return;
      Object.assign(this.data.realism, REALISM_PRESETS[name], { preset: name });
      this._notify();
    },
    resetDefaults() { this.data = DEFAULT_SETTINGS(); this._notify(); },
    _persist() {
      try { localStorage.setItem('rajarata_settings', JSON.stringify(this.data)); } catch (_) {}
    },
    /* First launch only: guess a sensible quality preset from the hardware so
       low-end machines don't open on Medium and stutter. Never overrides a
       returning player's saved choice. */
    autoDetectPreset() {
      let preset = 'medium';
      try {
        const mem = navigator.deviceMemory || 4;             // GB, coarse & privacy-clamped
        const cores = navigator.hardwareConcurrency || 4;
        const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
        if (mobile || mem <= 2 || cores <= 2) preset = 'low';
        else if (mem >= 8 && cores >= 8) preset = 'high';
      } catch (_) {}
      this.data.graphics.preset = preset;
      Object.assign(this.data.graphics, PRESETS[preset]);
      return preset;
    },
    load() {
      try {
        const raw = localStorage.getItem('rajarata_settings');
        if (raw) {
          const saved = JSON.parse(raw);
          const base = DEFAULT_SETTINGS();
          this.data = {
            graphics: { ...base.graphics, ...saved.graphics },
            realism: { ...base.realism, ...saved.realism },
            controls: { ...base.controls, ...saved.controls, keys: { ...base.controls.keys, ...(saved.controls || {}).keys } },
            audio: { ...base.audio, ...saved.audio },
            access: { ...base.access, ...saved.access },
          };
        } else {
          this.autoDetectPreset();     // brand-new player: fit the machine
        }
      } catch (_) {}
    },
  };
  G.Settings.load();
  G.Settings.subscribe(() => G.audio.setVolumes(G.Settings.data.audio));
  G.audio.setVolumes(G.Settings.data.audio);

  /* ===================== PERFORMANCE MONITOR (v1.0 polish) =====================
     A self-clocked frame-rate meter, ticked once per presented frame. Feeds the
     optional on-screen FPS readout and the opt-in adaptive-quality governor,
     which steps the graphics preset DOWN (never up, so it settles and never
     oscillates) after a sustained low-FPS spell, keeping the wide range of
     browser hardware playable. */
  G.Perf = {
    fps: 60, ms: 16.7,
    _frames: 0, _t0: 0, _lowSpells: 0, _lastAdjust: -1e9,
    reset() { this.fps = 60; this.ms = 16.7; this._frames = 0; this._t0 = 0; this._lowSpells = 0; },
    tick(now) {
      now = now || (performance.now ? performance.now() : Date.now());
      if (!this._t0) { this._t0 = now; return; }
      this._frames++;
      const el = now - this._t0;
      if (el >= 500) {                       // recompute twice a second
        this.fps = Math.round((this._frames * 1000) / el);
        this.ms = +(el / this._frames).toFixed(1);
        this._frames = 0; this._t0 = now;
        this._adapt(now);
      }
    },
    _adapt(now) {
      const gfx = G.Settings.data.graphics;
      if (!gfx.autoQuality) { this._lowSpells = 0; return; }
      const order = ['ultra', 'high', 'medium', 'low'];
      const i = order.indexOf(gfx.preset);
      if (i < 0 || i >= order.length - 1) { this._lowSpells = 0; return; }   // already lowest / custom
      const cap = gfx.fpsCap > 0 ? gfx.fpsCap : 60;
      const floor = Math.max(24, cap * 0.7);
      if (this.fps < floor) this._lowSpells++; else this._lowSpells = Math.max(0, this._lowSpells - 1);
      // ~3s of sustained low frames, and don't thrash: at least 5s between steps
      if (this._lowSpells >= 6 && now - this._lastAdjust > 5000) {
        this._lowSpells = 0; this._lastAdjust = now;
        const next = order[i + 1];
        G.Settings.applyPreset(next);
        if (G.UIBus) G.UIBus.toast('⚙ Auto quality → ' + next + ' for smoother play');
      }
    },
  };

  /* ========================= GAME STATE ========================= */
  G.GameState = {
    profile: { name: 'Abhaya', armorColor: 0x7a2f22 },
    unlocked: 1,              // highest unlocked chapter order
    bonusUnlocked: false,
    completed: {},            // levelId → summary
    reputation: 0,
    skills: [],               // learned skill ids (v0.2)
    day: 1,                   // campaign calendar (v0.3): days since the muster
    get completedCount() { return Object.keys(this.completed).length; },
    save() {
      try {
        localStorage.setItem('rajarata_save', JSON.stringify({
          profile: this.profile, unlocked: this.unlocked,
          bonusUnlocked: this.bonusUnlocked, completed: this.completed,
          reputation: this.reputation, skills: this.skills, day: this.day,
        }));
      } catch (_) {}
    },
    load() {
      try {
        const raw = localStorage.getItem('rajarata_save');
        if (raw) Object.assign(this, JSON.parse(raw));
      } catch (_) {}
    },
    resetCampaign(profile) {
      this.profile = profile;
      this.unlocked = 1;
      this.bonusUnlocked = false;
      this.completed = {};
      this.reputation = 0;
      this.skills = [];
      this.day = 1;
      this.save();
    },
  };
  G.GameState.load();

  /* ======================== MISSION SYSTEM ======================== */
  class MissionSystem {
    constructor(engine, defs) {
      this.engine = engine;
      this.list = defs.map((d) => ({
        id: d.id, text: d.text, count: d.count || 0, optional: !!d.optional,
        hidden: !!d.hidden, marker: d.marker || null,
        done: false, progress: 0, note: null,
      }));
      this._finished = false;
      this.push();
    }
    get(id) { return this.list.find((o) => o.id === id); }
    push() { G.UIBus.setObjectives(this.list.map((o) => ({ ...o }))); }
    reveal(id) {
      const o = this.get(id);
      if (!o || !o.hidden) return;
      o.hidden = false;
      this.engine.ui.banner('NEW OBJECTIVE', o.text);
      G.audio.interact();
      this.push();
    }
    complete(id) {
      const o = this.get(id);
      if (!o || o.done) return;
      o.done = true;
      o.hidden = false;
      if (o.count) o.progress = o.count;
      G.audio.objectiveDone();
      this.engine.ui.toast('OBJECTIVE COMPLETE');
      this.push();
      this._checkAll();
    }
    bump(id, n = 1) {
      const o = this.get(id);
      if (!o || o.done) return o ? o.done : false;
      o.progress += n;
      if (o.count && o.progress >= o.count) { this.complete(id); return true; }
      this.push();
      return false;
    }
    setNote(id, note) { const o = this.get(id); if (o) { o.note = note; this.push(); } }
    currentMarker() {
      const o = this.list.find((x) => !x.hidden && !x.done && x.marker);
      return o ? o.marker : null;
    }
    _checkAll() {
      if (this._finished) return;
      if (this.list.every((o) => o.optional || o.done)) {
        this._finished = true;
        this.engine.after(3.0, () => this.engine.finishLevel(), true);
      }
    }
    serialize() {
      return this.list.map((o) => ({ id: o.id, done: o.done, progress: o.progress, hidden: o.hidden, note: o.note }));
    }
    restore(snap) {
      for (const s of snap) {
        const o = this.get(s.id);
        if (o) { o.done = s.done; o.progress = s.progress; o.hidden = s.hidden; o.note = s.note; }
      }
      this.push();
    }
  }

  /* ========================== GAME ENGINE ========================== */
  class GameEngine {
    constructor({ scene, camera, gl, levelId, bridge }) {
      this.scene = scene;
      this.camera = camera;
      this.gl = gl;
      this.canvas = gl.domElement;
      this.bridge = bridge;
      this.levelId = levelId;
      this.def = G.Levels.defs[levelId];
      this.disposed = false;
      this.paused = false;
      this.uiFocus = false;
      this.time = 0;
      this.stats = { kills: 0, saved: 0, t0: performance.now() / 1000 };
      this.cinematic = { active: false };
      this.combatIntensity = 0;
      this._musicFloor = 0;
      this._renderAcc = 1;

      // ---- lightweight event emitter (auto-cleaned on dispose) ----
      this._handlers = {};
      this.events = {
        on: (evt, fn) => { (this._handlers[evt] = this._handlers[evt] || []).push(fn); },
        emit: (evt, data) => { for (const fn of this._handlers[evt] || []) fn(data); },
      };

      // ---- shared registries the level builders populate ----
      this.occluders = [];
      this.targets = [];
      this.attackables = [];
      this.destructibles = [];
      this.noises = [];
      this.interactables = [];
      this.zones = [];
      this.timers = [];
      this.currentPrompt = null;
      this.lastCheckpoint = null;

      // ---- physics ----
      this.physics = new CANNON.World({ gravity: new CANNON.Vec3(0, -19.6, 0) });
      this.physics.broadphase = new CANNON.SAPBroadphase(this.physics);
      this.physics.allowSleep = true;
      this.slickMat = new CANNON.Material('slick');
      this.physics.defaultContactMaterial.friction = 0.0;
      this.physics.defaultContactMaterial.restitution = 0;
      this.aiRayResult = new CANNON.RaycastResult();

      // ---- ui facade over the HUD bus ----
      this.ui = {
        toast: (t) => G.UIBus.toast(t),
        subtitle: (speaker, text, dur) => G.UIBus.subtitle(speaker, text, dur),
        banner: (title, text, dur) => G.UIBus.banner(title, text, dur),
        titleCard: (card) => G.UIBus.titleCard(card),
        bossBar: (name, frac) => G.UIBus.bossBar(name, frac),
        damageFlash: () => G.UIBus.damageFlash(),
        toggleTracker: () => G.UIBus.toggleTracker(),
      };

      // ---- build the world ----
      scene.add(camera);
      this.world = new G.World(this, this.def.atmosphere || {});
      this.world.setupPost(gl, camera);
      this.enemies = new G.EnemyManager(this);
      this.combat = new G.CombatSystem(this);
      this.missions = new MissionSystem(this, this.def.objectives || []);
      this.riding = null;          // active ElephantMount, if any
      this.rallyT = 0;             // Commander "Rally Cry" timers
      this.rallyCd = 0;
      this.mounts = [];
      this.critters = [];
      this.def.build(this);
      this.player = new G.PlayerController(this, this.def.spawn || { pos: [0, 0], yaw: 0 });
      this.playerRig = new G.PlayerRig(this, { armorColor: G.GameState.profile.armorColor });
      if (!this.terrain) this.terrain = new G.Terrain(this, {});
      // battle-hardened: learned skills toughen the body (100 → 150 at mastery)
      if (G.Skills) {
        this.player.maxHp = 100 + G.Skills.bonusHp();
        this.player.hp = this.player.maxHp;
      }
      // living-world layer: flowers, wandering animals, herb plants
      if (G.Wildlife) G.Wildlife.autoPopulate(this, this.def.nature || {});

      // ---- audio scene ----
      G.audio.setAmbience(this.def.ambience || 'jungle');
      G.audio.setMusicMode(this.def.music || 'explore');
      G.audio.setIntensity(0.1);

      G.engine = this;   // console/debug handle
      this._onResize = () => this.world.setSize(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', this._onResize);
      this._settingsUnsub = G.Settings.subscribe(() => this.applySettings());
      this.applySettings();

      this.checkpoint({ note: 'Mission start' });
      if (this.def.start) this.def.start(this);
    }

    /* third-person mode is just a settings read — V toggles it live */
    get tpMode() { return G.Settings.data.graphics.camera === 'third'; }

    /* ---------------- static-body helpers for builders ---------------- */
    addStaticPlane() {
      const b = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), collisionFilterGroup: G.COL.GROUND });
      b.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
      b.userData = { surface: 'dirt' };
      this.physics.addBody(b);
      return b;
    }
    addStaticBox(pos, half, yaw = 0, opts = {}) {
      const b = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(half[0], half[1], half[2])),
        position: new CANNON.Vec3(pos[0], pos[1], pos[2]),
        collisionFilterGroup: G.COL.STATIC,
      });
      b.quaternion.setFromEuler(0, yaw, 0);
      b.userData = { surface: opts.surface || 'stone', invisible: !!opts.invisible };
      this.physics.addBody(b);
      return b;
    }
    addStaticBoxQuat(pos, half, yaw, pitch) {
      const b = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(half[0], half[1], half[2])),
        position: new CANNON.Vec3(pos[0], pos[1], pos[2]),
        collisionFilterGroup: G.COL.STATIC,
      });
      const qy = new CANNON.Quaternion().setFromEuler(0, yaw, 0);
      const qp = new CANNON.Quaternion().setFromEuler(pitch, 0, 0);
      b.quaternion = qy.mult(qp);
      b.userData = { surface: 'stone' };
      this.physics.addBody(b);
      return b;
    }
    addStaticCylinder(pos, radius, height) {
      const b = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Cylinder(radius, radius, height, 14),
        position: new CANNON.Vec3(pos[0], pos[1], pos[2]),
        collisionFilterGroup: G.COL.STATIC,
      });
      b.userData = { surface: 'stone' };
      this.physics.addBody(b);
      return b;
    }
    removeBody(b) { try { this.physics.removeBody(b); } catch (_) {} }

    /* ------------------------- level services ------------------------- */
    addInteract(def) { this.interactables.push({ once: false, fired: false, ...def }); }
    addZone(def) { this.zones.push({ once: true, fired: false, ...def }); }
    after(sec, fn, duringCinematic = false) { this.timers.push({ t: sec, fn, cine: duringCinematic }); }
    noiseEvent(pos, radius) {
      this.noises.push({ pos: pos.clone ? pos.clone() : new THREE.Vector3(pos[0], 1, pos[1]), radius, t: this.time, faction: 'ally' });
    }
    setCombatIntensity(x) { this._musicFloor = x; }

    /* v0.5 Shadows: whistle lure — draw a patrol to your hiding place */
    whistle() {
      if (this._whistleCd > this.time) return;
      this._whistleCd = this.time + 4;
      G.audio.whistle();
      this.noiseEvent(this.player.pos, 17);
      this.ui.toast('…a low whistle');
    }

    /* v0.5 Shadows: Warrior Sense — a hunter's focus marks foes through walls */
    warriorSense() {
      if (G.Realism().preset === 'realistic') { this.ui.toast('A REALIST TRUSTS HIS EYES'); return; }
      if (this._senseCd > this.time) { this.ui.toast(`FOCUS RESTS — ${Math.ceil(this._senseCd - this.time)}s`); return; }
      if (this.player.stamina < 20) { this.ui.toast('TOO WINDED TO FOCUS'); return; }
      this.player.stamina -= 20;
      this._senseCd = this.time + 12;
      G.audio.sense();
      this._senseMarkers = this._senseMarkers || [];
      // clear stale markers
      for (const m of this._senseMarkers) this.scene.remove(m.obj);
      this._senseMarkers.length = 0;
      const mkMat = (color) => new THREE.SpriteMaterial({
        map: G.Mats.canvasTex('senseglow', 32, (c, s) => {
          const g2 = c.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
          g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(0.4, 'rgba(255,255,255,0.5)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g2; c.fillRect(0, 0, s, s);
        }),
        color, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      for (const n of this.enemies.npcs) {
        if (!n.alive || n.faction !== 'enemy') continue;
        if (U.flatDist(n.pos, this.player.pos) > 45) continue;
        const sp = new THREE.Sprite(mkMat(0xff5030));
        sp.scale.set(0.9, 0.9, 1);
        sp.renderOrder = 999;
        this.scene.add(sp);
        this._senseMarkers.push({ obj: sp, npc: n, t: 6 });
      }
      const marker = this.missions.currentMarker();
      if (marker) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.5, 34, 8, 1, true),
          new THREE.MeshBasicMaterial({ color: 0xf3cd7a, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        pillar.position.set(marker[0], 17, marker[1]);
        pillar.renderOrder = 998;
        this.scene.add(pillar);
        this._senseMarkers.push({ obj: pillar, npc: null, t: 6 });
      }
      this.ui.toast('WARRIOR SENSE — the hunt is shown');
    }
    _updateSenseMarkers(dt) {
      if (!this._senseMarkers || !this._senseMarkers.length) return;
      for (let i = this._senseMarkers.length - 1; i >= 0; i--) {
        const m = this._senseMarkers[i];
        m.t -= dt;
        if (m.t <= 0 || (m.npc && !m.npc.alive)) {
          this.scene.remove(m.obj);
          this._senseMarkers.splice(i, 1);
          continue;
        }
        if (m.npc) m.obj.position.set(m.npc.pos.x, m.npc.pos.y + 0.9, m.npc.pos.z);
        const fade = Math.min(1, m.t / 1.5);
        if (m.obj.material) m.obj.material.opacity = (m.npc ? 0.9 : 0.3) * fade;
      }
    }

    /* Commander skill: Rally Cry (T) — allies fight harder for a spell */
    rally() {
      if (!(G.Skills && G.Skills.owned('rally'))) return;
      if (this.rallyCd > 0) { this.ui.toast(`RALLY RESTS — ${Math.ceil(this.rallyCd)}s`); return; }
      this.rallyT = 12;
      this.rallyCd = 45;
      G.audio.warHorn();
      this.ui.toast('RALLY! THE LINE SURGES FORWARD');
      for (const n of this.enemies.npcs) if (n.alive && n.faction === 'ally') n.rig.playCheer();
    }

    tryInteract() {
      const it = this.currentPrompt;
      if (!it) return;
      it.fired = true;
      it.onUse();
    }
    onPointerLock(locked) {
      if (!locked && !this.paused && !this.disposed && !this.cinematic.active && this.player && this.player.alive && !this._deadShown) {
        this.bridge.requestPause();
      }
    }

    /* --------------------------- checkpoints --------------------------- */
    checkpoint(opts = {}) {
      const p = this.player ? this.player.feetPos : null;
      this.lastCheckpoint = {
        note: opts.note || '',
        pos: opts.pos || (p ? [p.x, Math.max(0, p.y), p.z] : [0, 0, 0]),
        yaw: this.player ? this.player.yaw : 0,
        arrows: Math.max(opts.arrows || 0, this.combat ? this.combat.arrows : 0),
        weapon: this.combat ? this.combat.weapon : 'sword',
        missions: this.missions.serialize(),
        data: opts.data || null,
      };
      if (this.player) {
        G.audio.checkpoint();
        this.ui.toast('CHECKPOINT — ' + (opts.note || 'saved'));
        this.player.herbs = Math.min(this.player.herbCap(), this.player.herbs + 1);
      }
    }
    restoreCheckpoint(opts = {}) {
      const cp = this.lastCheckpoint;
      if (!cp) return;
      if (this.riding) this.riding.dismount();
      const pos = cp.pos.length === 3 ? cp.pos : [cp.pos[0], 0, cp.pos[1]];
      this.player.teleport(pos[0], pos[1], pos[2], cp.yaw);
      if (!opts.keepHp) this.player.revive();
      this.player.moveLocked = false;
      this.player.shieldEquipped = false;             // stand down on respawn
      this.combat.arrows = Math.max(this.combat.arrows, cp.arrows);
      this.combat.nocked = this.combat.arrows > 0;
      this.combat.javelins = this.combat.javelinMax;  // fresh cast of javelins
      this.combat.drawing = false; this.combat.drawPct = 0;
      this.missions.restore(cp.missions);
      this.noises.length = 0;
      this._deadShown = false;
      if (this.def.restore) this.def.restore(this, cp.data);
    }

    onPlayerDeath() {
      if (this._deadShown) return;
      this._deadShown = true;
      if (this.riding) this.riding.dismount();
      G.audio.setIntensity(0);
      this.after(1.6, () => {
        this.player.releaseLock();
        this.bridge.onDeath('Your wounds overcome you beneath the banners of Lanka.');
      }, true);
    }
    failMission(reason) {
      if (this._deadShown) return;
      this._deadShown = true;
      this.player.releaseLock();
      this.bridge.onDeath(reason);
    }

    finishLevel() {
      if (this._summaryShown) return;
      this._summaryShown = true;
      const t = performance.now() / 1000 - this.stats.t0;
      this.player.releaseLock();
      G.audio.setAmbience('none');
      G.audio.setIntensity(0);
      this.bridge.onSummary({
        levelId: this.levelId,
        title: this.def.title,
        chapter: this.def.chapter,
        kills: this.stats.kills,
        saved: this.stats.saved,
        time: t,
        // levels may attach extra summary data (e.g. the arena score + code)
        ...(this.def.summaryExtra ? this.def.summaryExtra(this, t) : {}),
      });
    }

    /* --------------------------- cinematics --------------------------- */
    playCinematic(keys, { onStart, onDone } = {}) {
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      this.cinematic = {
        active: true, keys, i: 0, t: 0,
        fromPos: this.camera.position.clone(),
        fromLook: this.camera.position.clone().add(camDir.multiplyScalar(10)),
        onDone,
      };
      this.player.moveLocked = true;
      this.player.body.velocity.set(0, 0, 0);
      this.playerRig.group.visible = false;      // hide first-person arms
      this._cineSkip = (e) => { if (e.code === 'Space' || e.code === 'Enter') this._endCinematic(); };
      document.addEventListener('keydown', this._cineSkip);
      if (onStart) onStart();
    }
    _endCinematic() {
      if (!this.cinematic.active) return;
      const cb = this.cinematic.onDone;
      this.cinematic = { active: false };
      this.player.moveLocked = false;
      this.playerRig.group.visible = true;
      document.removeEventListener('keydown', this._cineSkip);
      if (cb) cb();
    }
    _updateCinematic(dt) {
      const c = this.cinematic;
      const seg = c.keys[c.i];
      c.t += dt;
      const f0 = Math.min(1, c.t / seg.dur);
      const f = f0 * f0 * (3 - 2 * f0);  // smoothstep
      const target = new THREE.Vector3(...seg.pos);
      const look = new THREE.Vector3(...seg.look);
      this.camera.position.lerpVectors(c.fromPos, target, f);
      const lk = new THREE.Vector3().lerpVectors(c.fromLook, look, f);
      this.camera.lookAt(lk);
      if (f0 >= 1) {
        c.fromPos = target;
        c.fromLook = look;
        c.i++;
        c.t = 0;
        if (c.i >= c.keys.length) this._endCinematic();
      }
    }

    /* ----------------------------- update ----------------------------- */
    update(dt) {
      if (this.disposed) return;
      dt = Math.min(dt, 0.05);
      if (this.paused) return;
      this.time += dt;

      if (this.cinematic.active) {
        this._updateCinematic(dt);
      }

      this.rallyT = Math.max(0, this.rallyT - dt);
      this.rallyCd = Math.max(0, this.rallyCd - dt);
      this._updateSenseMarkers(dt);

      this.physics.step(1 / 60, dt, 3);
      if (!this.cinematic.active) {
        this.player.update(dt);
      }
      for (const m of this.mounts) m.update(dt);
      for (const c of this.critters) c.update(dt);
      this.playerRig.update(dt);
      this.combat.update(dt);
      this.enemies.update(dt);
      if (this.def.update && !this.cinematic.active) this.def.update.call(this.def, this, dt);
      if (this.terrain) this.terrain.update(dt, this.time);

      // timers
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const tm = this.timers[i];
        if (this.cinematic.active && !tm.cine) continue;
        tm.t -= dt;
        if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); }
      }
      // noise decay
      for (let i = this.noises.length - 1; i >= 0; i--)
        if (this.time - this.noises[i].t > 0.6) this.noises.splice(i, 1);

      // interact prompt scan
      if (!this.cinematic.active && this.player.alive) {
        const pp = this.player.feetPos;
        let best = null, bestD = 1e9;
        for (const it of this.interactables) {
          if (it.once && it.fired) continue;
          if (it.when && !it.when()) continue;
          const ix = it.pos[0], iy = it.pos.length === 3 ? it.pos[1] : 0, iz = it.pos.length === 3 ? it.pos[2] : it.pos[1];
          if (it.minY !== undefined && pp.y < it.minY - 1.5) continue;
          const d = Math.hypot(pp.x - ix, pp.z - iz);
          if (d < it.radius && d < bestD) { best = it; bestD = d; }
        }
        this.currentPrompt = best;
      } else this.currentPrompt = null;

      // zone triggers
      if (!this.cinematic.active && this.player.alive) {
        const pp = this.player.feetPos;
        for (const z of this.zones) {
          if (z.fired && z.once) continue;
          if (z.when && !z.when()) continue;
          if (z.minY !== undefined && pp.y < z.minY - 2) continue;
          if (Math.hypot(pp.x - z.pos[0], pp.z - z.pos[1]) < z.r) {
            z.fired = true;
            z.onEnter();
          }
        }
      }

      // adaptive music intensity: how much steel is currently seeking you
      let engaged = 0;
      for (const n of this.enemies.npcs) {
        if (n.alive && n.faction === 'enemy' && n.ai &&
          (n.ai.state === 'engage' || n.ai.state === 'windup' || n.ai.state === 'recover') &&
          U.flatDist(n.pos, this.player.pos) < 34) engaged++;
      }
      this.combatIntensity = Math.max(this._musicFloor, Math.min(1, engaged * 0.28));
      G.audio.setIntensity(this.combatIntensity);

      this._scanThreatProximity();

      this.world.update(dt, this.player.feetPos);
    }

    /* v0.2 §1.4: an audio sting + a screen-edge pulse the first moment an
       alerted enemy closes inside 10 m — a danger-close cue that doubles as an
       accessibility aid. Auto-disabled on the realistic preset (and with the
       threat ring off), by design. */
    _scanThreatProximity() {
      const realistic = G.Realism && G.Realism().preset === 'realistic';
      if (G.Settings.data.access.threatRing === false || realistic ||
          !this.player || !this.player.alive || this.cinematic.active) {
        if (this._nearThreats) this._nearThreats.clear();
        return;
      }
      const prev = this._nearThreats || (this._nearThreats = new Set());
      const now = new Set();
      const pp = this.player.pos;
      const facingDeg = ((-this.player.yaw * 180 / Math.PI) % 360 + 360) % 360;
      const ALERT = ['engage', 'windup', 'recover', 'investigate', 'search'];
      for (const n of this.enemies.npcs) {
        if (!n.alive || n.faction !== 'enemy' || !n.ai) continue;
        if (!ALERT.includes(n.ai.state)) continue;
        if (U.flatDist(n.pos, pp) > 10) continue;
        now.add(n);
        if (!prev.has(n)) {                      // newly danger-close → warn once
          const bearing = (Math.atan2(n.pos.x - pp.x, -(n.pos.z - pp.z)) * 180 / Math.PI + 360) % 360;
          const dir = ((bearing - facingDeg + 540) % 360) - 180;
          G.audio.threatSting();
          G.UIBus.threatPing(dir);
        }
      }
      this._nearThreats = now;
    }

    render(dt) {
      if (this.disposed) return;
      const cap = G.Settings.data.graphics.fpsCap;
      if (cap > 0) {
        this._renderAcc += dt;
        if (this._renderAcc < 1 / cap) return;
        this._renderAcc %= (1 / cap);
      }
      G.Perf.tick();          // count real presented frames for the meter / auto-quality
      this.world.render(dt);
    }

    /* ------------------------------ HUD ------------------------------ */
    getHudState() {
      const p = this.player, c = this.combat;
      const facingDeg = ((-p.yaw * 180 / Math.PI) % 360 + 360) % 360;
      let objDiff = null;
      const marker = this.missions.currentMarker();
      if (marker) {
        const fp = p.feetPos;
        const bearing = (Math.atan2(marker[0] - fp.x, -(marker[1] - fp.z)) * 180 / Math.PI + 360) % 360;
        objDiff = ((bearing - facingDeg + 540) % 360) - 180;
      }
      // enemy-nearby warning pips (direction + heat)
      const threats = [];
      if (G.Settings.data.access.threatRing !== false) {
        const fp = p.feetPos;
        for (const n of this.enemies.npcs) {
          if (!n.alive || n.faction !== 'enemy' || !n.ai) continue;
          const st = n.ai.state;
          const sus = st === 'investigate';
          const hot = st === 'engage' || st === 'windup' || st === 'recover' || st === 'flee';
          if (!sus && !hot) continue;
          if (U.flatDist(n.pos, fp) > 30) continue;
          const bearing = (Math.atan2(n.pos.x - fp.x, -(n.pos.z - fp.z)) * 180 / Math.PI + 360) % 360;
          threats.push({ diff: ((bearing - facingDeg + 540) % 360) - 180, hot });
          if (threats.length >= 10) break;
        }
      }
      const info = c.hudInfo();
      const slots = Object.values(G.MELEE).map((d) => ({
        icon: d.icon,
        unlocked: !d.skill || (G.Skills && G.Skills.owned(d.skill)),
        current: c.weapon !== 'bow' && c.cfg === d,
      }));
      slots.push({ icon: '🏹', unlocked: true, current: c.weapon === 'bow' });
      return {
        hp: p.hp, maxHp: p.maxHp, stamina: p.stamina, maxStamina: p.maxStamina,
        exhausted: p.exhausted, alive: p.alive,
        weapon: c.weapon, weaponName: info.weaponName, weaponIcon: info.weaponIcon,
        arrows: c.arrows, quiverMax: c.quiverMax,
        drawPct: c.drawPct, slots,
        herbs: p.herbs,
        javelins: c.javelins, shield: p.shieldEquipped,
        skillPts: G.Skills ? G.Skills.points() : 0,
        crosshair: c.weapon === 'bow' ? (c.drawPct >= 1 ? 'bowfull' : c.drawing ? 'bow' : 'melee') : 'melee',
        takedown: !!c.takedownTarget(),
        facingDeg, objDiff, threats,
        prompt: this.riding ? 'Dismount' : (this.currentPrompt ? this.currentPrompt.prompt : null),
        repute: G.GameState.reputation + this.stats.saved,
        levelTitle: this.def.title,
        cinematic: this.cinematic.active,
      };
    }

    applySettings() {
      if (this.disposed) return;
      this.world.applySettings();
      const pr = Math.min(window.devicePixelRatio || 1, G.Settings.data.graphics.pixelRatio);
      this.gl.setPixelRatio(pr);
      this.world.setSize(window.innerWidth, window.innerHeight);
    }

    dispose() {
      this.disposed = true;
      if (G.engine === this) G.engine = null;
      window.removeEventListener('resize', this._onResize);
      if (this._cineSkip) document.removeEventListener('keydown', this._cineSkip);
      this._settingsUnsub();
      this.player.dispose();
      this.playerRig.dispose();
      this.enemies.dispose();
      this.combat.dispose();
      this.world.dispose();
      G.UIBus.bossBar(null);
      G.audio.setAmbience('none');
      G.audio.setIntensity(0);
    }
  }

  /* ===================== R3F engine mount ===================== */
  function EngineMount({ levelId, bridge, engineRef }) {
    const { scene, camera, gl } = useThree();
    React.useEffect(() => {
      const engine = new GameEngine({ scene, camera, gl, levelId, bridge });
      engineRef.current = engine;
      bridge.onEngineReady(engine);
      return () => { engine.dispose(); engineRef.current = null; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [levelId]);
    useFrame((state, dt) => {
      const engine = engineRef.current;
      if (engine) { engine.update(dt); engine.render(dt); }
    }, 1);
    return null;
  }

  function GameView({ levelId, session, bridge, engineRef }) {
    const gfx = G.Settings.data.graphics;
    return h(Canvas, {
      key: levelId + ':' + session,
      shadows: true,
      dpr: Math.min(window.devicePixelRatio || 1, gfx.pixelRatio),
      gl: { antialias: true, powerPreference: 'high-performance' },
      camera: { fov: gfx.fov, near: 0.08, far: 1400, position: [0, 1.6, 0] },
      style: { position: 'fixed', inset: 0 },
      onCreated: ({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.06;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      },
    }, h(EngineMount, { levelId, bridge, engineRef }));
  }

  /* ========================= AUX SCREENS ========================= */
  function ChallengeShare({ summary }) {
    const [copied, setCopied] = React.useState(false);
    const copy = () => {
      const text = `I held the arena against ${summary.factionName} — scored ${summary.score.toLocaleString()} in Rajarata: Dutugemunu's War. Match my fight: ${summary.code}`;
      const done = () => { setCopied(true); G.audio.uiConfirm(); setTimeout(() => setCopied(false), 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
      else done();
    };
    return h('div', { className: 'challenge-share' },
      summary.ghostSaved
        ? h('div', { className: 'cs-ghost' }, '👻 A new ghost of this run is saved — race it (and your best score) next time you take this fight.')
        : summary.hadGhost
          ? h('div', { className: 'cs-ghost dim' }, '👻 Your ghost held its record this time.')
          : null,
      h('div', { className: 'cs-label' }, 'Challenge a friend to the same fight'),
      h('div', { className: 'cs-code-row' },
        h('code', { className: 'cs-code' }, summary.code),
        h('button', { className: 'menu-btn small', style: { margin: 0, width: 'auto', flex: '0 0 auto', minWidth: 90 }, onClick: copy },
          copied ? 'Copied ✓' : 'Copy')));
  }

  function SummaryScreen({ summary, onNext, onMenu, onSkills, isLast, isBonus, isStandalone, isLegend }) {
    const mm = Math.floor(summary.time / 60), ss = Math.floor(summary.time % 60);
    const arena = summary.arena;
    return h('div', { className: 'screen dim fade-in' },
      h('div', { className: 'panel', style: { minWidth: 440 } },
        h('div', { className: 'brief-chapter' }, (summary.chapter || '') + (arena ? ' — THE TALE ENDS' : ' — COMPLETE')),
        h('div', { className: 'brief-title' }, summary.title),
        h('div', { className: 'menu-rule' }),
        h('div', { className: 'summary-verdict' },
          arena
            ? (summary.cleared >= summary.totalWaves
              ? `Every age, and still the king stood. ${summary.factionName} broke upon your line.`
              : `You held ${summary.cleared} of ${summary.totalWaves} ages against ${summary.factionName} before the song ended.`)
            : summary.saved > 0
              ? `Word of your deeds spreads. ${summary.saved} villager${summary.saved > 1 ? 's' : ''} owe you their lives.`
              : 'The bards will sing of this day.'),
        arena
          ? h('div', { className: 'summary-grid' },
            h('div', { className: 'k' }, 'Score'), h('div', { className: 'v', style: { fontSize: 20 } }, summary.score.toLocaleString() + (summary.isBest ? '  ★ NEW BEST' : '')),
            h('div', { className: 'k' }, 'Ages held'), h('div', { className: 'v' }, `${summary.cleared} / ${summary.totalWaves}`),
            h('div', { className: 'k' }, 'Enemies felled'), h('div', { className: 'v' }, String(summary.kills)),
            h('div', { className: 'k' }, 'Time'), h('div', { className: 'v' }, `${mm}:${String(ss).padStart(2, '0')}`),
            h('div', { className: 'k' }, 'Leaderboard'), h('div', { className: 'v' }, summary.rank ? `#${summary.rank} vs. ${summary.factionName}` : 'not ranked'))
          : h('div', { className: 'summary-grid' },
            h('div', { className: 'k' }, 'Enemies defeated'), h('div', { className: 'v' }, String(summary.kills)),
            h('div', { className: 'k' }, 'Civilians saved'), h('div', { className: 'v' }, String(summary.saved)),
            h('div', { className: 'k' }, 'Time'), h('div', { className: 'v' }, `${mm}:${String(ss).padStart(2, '0')}`),
            h('div', { className: 'k' }, 'Renown earned'), h('div', { className: 'v' }, '+' + (1 + summary.saved))),
        arena && summary.code ? h(ChallengeShare, { summary }) : null,
        h('div', { className: 'menu-rule' }),
        h('button', { className: 'menu-btn primary', onClick: () => { G.audio.uiConfirm(); onNext(); } },
          isLegend ? 'Tell Another Legend' : isStandalone ? 'Return to the Chart' : isBonus ? 'The Legend Ends' : isLast ? 'Witness the Triumph' : 'Continue the Campaign'),
        G.Skills && G.Skills.points() > 0
          ? h('button', { className: 'menu-btn', onClick: () => { G.audio.ui(); onSkills(); } }, `Spend Renown — Skills (${G.Skills.points()})`)
          : null,
        h('button', { className: 'menu-btn small', onClick: () => { G.audio.ui(); onMenu(); } }, 'Return to Menu')));
  }

  function DeathScreen({ reason, onRise, onAbandon }) {
    return h('div', { className: 'screen death-screen fade-in' },
      h('div', { style: { textAlign: 'center' } },
        h('div', { className: 'death-title' }, 'FALLEN'),
        h('div', { className: 'death-sub' }, reason),
        h('button', { className: 'menu-btn primary', style: { maxWidth: 340, margin: '8px auto' }, onClick: () => { G.audio.ensure(); G.audio.uiConfirm(); onRise(); } }, 'Rise at the Last Checkpoint'),
        h('button', { className: 'menu-btn danger', style: { maxWidth: 340, margin: '8px auto' }, onClick: () => { G.audio.ui(); onAbandon(); } }, 'Abandon the Field')));
  }

  function VictoryScreen({ onBonus, onCredits, onMenu }) {
    return h('div', { className: 'screen dim fade-in' },
      h('div', { className: 'panel', style: { maxWidth: 620 } },
        h('div', { className: 'brief-chapter' }, 'THE CAMPAIGN IS WON'),
        h('div', { className: 'brief-title' }, 'One Island, One King'),
        h('div', { className: 'menu-rule' }),
        h('div', { className: 'brief-framing' },
          'The wars are ended. Under Dutugemunu the island is one, and above the roofs of ' +
          'Anuradhapura the Ruwanwelisaya stands white against the monsoon sky — a mountain ' +
          'of merit raised not by conquest but by ten thousand willing hands. The chronicles ' +
          'will remember the king; the king, they say, asked only to be remembered as a builder. ' +
          'And in the centuries that followed, when travellers spoke of Lanka, they spoke of this: ' +
          'the great white dome, and the peace that built it.'),
        h('div', { className: 'menu-rule' }),
        h('button', { className: 'menu-btn primary', onClick: () => { G.audio.uiConfirm(); onBonus(); } }, '✦ Bonus Legend: The Trial of the Lion Rock'),
        h('button', { className: 'menu-btn', onClick: () => { G.audio.ui(); onCredits(); } }, 'Credits'),
        h('button', { className: 'menu-btn small', onClick: () => { G.audio.ui(); onMenu(); } }, 'Return to Menu')));
  }

  /* ============================== APP ============================== */
  function App() {
    const [screen, setScreen] = React.useState('menu');    // menu|brief|game|summary|victory
    const [levelId, setLevelId] = React.useState(null);
    const [session, setSession] = React.useState(0);
    const [paused, setPaused] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    const [showSkills, setShowSkills] = React.useState(false);
    const [death, setDeath] = React.useState(null);
    const [summary, setSummary] = React.useState(null);
    const [, force] = React.useReducer((x) => x + 1, 0);
    const engineRef = React.useRef(null);

    const stateRef = React.useRef({});
    stateRef.current = { screen, paused, showSettings, showSkills, death };

    const bridge = React.useMemo(() => ({
      onEngineReady: () => force(),
      requestPause: () => setPaused(true),
      openSkills: () => setShowSkills(true),
      onDeath: (reason) => setDeath(reason),
      onSummary: (s) => {
        // record progress
        const def = G.Levels.defs[s.levelId];
        G.GameState.completed[s.levelId] = { kills: s.kills, saved: s.saved, time: s.time };
        G.GameState.reputation += 1 + s.saved;
        const mainline = !def.bonus && !def.standalone;
        if (mainline) G.GameState.day += def.marchDays || 3;   // the campaign marches on
        if (mainline) G.GameState.unlocked = Math.max(G.GameState.unlocked, def.order + 1);
        if (mainline && def.order >= 5) G.GameState.bonusUnlocked = true;
        G.GameState.save();
        setSummary(s);
        setScreen('summary');
        setPaused(false);
        setDeath(null);
      },
    }), []);

    // global Escape / pause handling
    React.useEffect(() => {
      const onKey = (e) => {
        const st = stateRef.current;
        if (e.code !== 'Escape') return;
        if (st.screen !== 'game') return;
        if (st.showSettings) { setShowSettings(false); return; }
        if (st.showSkills) { setShowSkills(false); return; }
        if (st.death) return;
        setPaused((p) => {
          const np = !p;
          if (np && engineRef.current) engineRef.current.player.releaseLock();
          return np;
        });
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, []);

    // auto-pause when the tab is hidden so nothing keeps swinging at you while
    // you're away (complements the pointer-lock-loss pause for unlocked states)
    React.useEffect(() => {
      const onHide = () => {
        if (!G.Settings.data.access.autoPause) return;
        if (!document.hidden) return;
        const st = stateRef.current;
        if (st.screen !== 'game' || st.paused || st.death || st.showSettings || st.showSkills) return;
        const eng = engineRef.current;
        if (eng && eng.player) eng.player.releaseLock();
        setPaused(true);
      };
      document.addEventListener('visibilitychange', onHide);
      return () => document.removeEventListener('visibilitychange', onHide);
    }, []);

    // keep engine.paused in sync + relock pointer on resume
    React.useEffect(() => {
      const eng = engineRef.current;
      if (!eng) return;
      eng.paused = paused || !!death || showSettings || showSkills;
      if (showSkills && eng.player) eng.player.releaseLock();
      if (screen === 'game' && !paused && !death && !showSettings && !showSkills && eng.player) {
        eng.player.requestLock();
      }
    }, [paused, death, showSettings, showSkills, screen, session]);

    const startLevel = (id) => {
      setLevelId(id);
      setSession((s) => s + 1);
      setSummary(null);
      setDeath(null);
      setPaused(false);
      setScreen('brief');
    };
    const quitToMenu = () => {
      setScreen('menu');
      setLevelId(null);
      setPaused(false);
      setDeath(null);
      G.audio.setAmbience('none');
      G.audio.setMusicMode('menu');
    };

    const children = [];

    if (screen === 'game' || (screen === 'summary' && levelId)) {
      children.push(h(GameView, { key: 'game', levelId, session, bridge, engineRef }));
    }
    if (screen === 'game') {
      if (engineRef.current) children.push(h(G.UI.HUD, { key: 'hud', engine: engineRef.current }));
      if (paused && !showSettings && !showSkills) {
        children.push(h(G.UI.PauseMenu, {
          key: 'pause',
          levelTitle: G.Levels.defs[levelId]?.title,
          onResume: () => setPaused(false),
          onSettings: () => setShowSettings(true),
          onSkills: () => setShowSkills(true),
          onRestart: () => { setSession((s) => s + 1); setPaused(false); setDeath(null); },
          onQuit: quitToMenu,
        }));
      }
      if (death) {
        children.push(h(DeathScreen, {
          key: 'death', reason: death,
          onRise: () => {
            const eng = engineRef.current;
            if (eng) { eng._deadShown = false; eng.restoreCheckpoint(); }
            setDeath(null);
          },
          onAbandon: quitToMenu,
        }));
      }
    }

    if (screen === 'map') {
      children.push(h(G.UI.CampaignMap, {
        key: 'map',
        progress: {
          unlocked: G.GameState.unlocked,
          bonusUnlocked: G.GameState.bonusUnlocked,
          completed: G.GameState.completed,
        },
        onPlay: (id) => startLevel(id),
        onBack: () => setScreen('menu'),
      }));
    }

    if (screen === 'legends') {
      children.push(h(G.UI.LegendsMenu, {
        key: 'legends',
        onPlay: (id) => startLevel(id),
        onBack: () => setScreen('menu'),
      }));
    }

    if (screen === 'menu') {
      children.push(h(G.UI.MainMenu, {
        key: 'menu',
        progress: {
          profile: G.GameState.profile,
          unlocked: G.GameState.unlocked,
          bonusUnlocked: G.GameState.bonusUnlocked,
          completedCount: G.GameState.completedCount,
        },
        onMap: () => setScreen('map'),
        onLegends: () => setScreen('legends'),
        onNewGame: (profile) => { G.GameState.resetCampaign(profile); startLevel(G.Levels.order[0]); },
        onContinue: () => {
          const idx = Math.min(G.GameState.unlocked, 5) - 1;
          const id = G.Levels.order[idx] || G.Levels.order[0];
          startLevel(G.GameState.unlocked > 5 && G.GameState.bonusUnlocked ? 'sigiriya' : id);
        },
        onChapter: (id) => startLevel(id),
        onSettings: () => setShowSettings(true),
      }));
    }

    if (screen === 'brief' && levelId) {
      children.push(h(G.UI.MissionBrief, {
        key: 'brief',
        level: G.Levels.defs[levelId],
        onBegin: () => { setScreen('game'); },
        onBack: quitToMenu,
      }));
    }

    if (screen === 'summary' && summary) {
      const def = G.Levels.defs[summary.levelId];
      const isLast = def.order === 5;
      children.push(h(SummaryScreen, {
        key: 'summary', summary,
        isLast, isBonus: !!def.bonus, isStandalone: !!def.standalone, isLegend: !!def.legend,
        onSkills: () => setShowSkills(true),
        onNext: () => {
          if (def.legend) { setScreen('legends'); setLevelId(null); setSummary(null); return; }
          if (def.standalone) { setScreen('map'); setLevelId(null); setSummary(null); return; }
          if (def.bonus) { quitToMenu(); return; }
          if (isLast) { setScreen('victory'); setLevelId(null); return; }
          const next = G.Levels.next(summary.levelId);
          if (next && !G.Levels.defs[next].bonus) startLevel(next);
          else setScreen('victory');
        },
        onMenu: quitToMenu,
      }));
    }

    if (screen === 'victory') {
      children.push(h(VictoryScreen, {
        key: 'victory',
        onBonus: () => startLevel('sigiriya'),
        onCredits: quitToMenu,
        onMenu: quitToMenu,
      }));
    }

    if (showSettings) {
      children.push(h(G.UI.SettingsMenu, { key: 'settings', onBack: () => setShowSettings(false) }));
    }
    if (showSkills) {
      children.push(h(G.UI.SkillsMenu, { key: 'skills', onBack: () => setShowSkills(false) }));
    }

    return h(React.Fragment, null, children);
  }

  /* ============================== BOOT ============================== */
  G.boot = function () {
    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    root.render(h(App));
    // wake audio on the first user gesture anywhere
    const wake = () => { G.audio.ensure(); G.audio.setMusicMode('menu'); document.removeEventListener('pointerdown', wake); };
    document.addEventListener('pointerdown', wake);
    console.info('%cRAJARATA: DUTUGEMUNU\'S WAR %c— ancient Ceylon awaits.',
      'color:#f3cd7a;font-weight:bold', 'color:#b49b6c');
  };
})();
