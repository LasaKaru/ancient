/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — audioEngine.js
   Procedural SFX + layered music system built on the native Web Audio API.

   Because no licensed recordings can be shipped, every sound here is
   synthesised from oscillators and noise buffers. Every effect that a real
   recording could replace is marked with an  /* AUDIO SLOT * /  comment giving
   the expected file path under assets/audio/. The engine will automatically
   try to fetch those files at startup (works when served over http://) and
   will fall back to the procedural version when they are absent (always the
   case on file://).
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});

  /* Sample slots the user can fill in later — see assets/README.md.
     Key → expected path. If the file exists (http serving), it is used
     instead of the procedural synth. */
  const SAMPLE_SLOTS = {
    sword_hit:    'assets/audio/sword_hit_01.mp3',     /* AUDIO SLOT */
    sword_swing:  'assets/audio/sword_swing_01.mp3',   /* AUDIO SLOT */
    bow_release:  'assets/audio/bow_release_01.mp3',   /* AUDIO SLOT */
    bow_draw:     'assets/audio/bow_draw_01.mp3',      /* AUDIO SLOT */
    arrow_thud:   'assets/audio/arrow_thud_01.mp3',    /* AUDIO SLOT */
    footstep:     'assets/audio/footstep_dirt_01.mp3', /* AUDIO SLOT */
    block:        'assets/audio/shield_block_01.mp3',  /* AUDIO SLOT */
    parry:        'assets/audio/parry_ring_01.mp3',    /* AUDIO SLOT */
    hurt:         'assets/audio/player_hurt_01.mp3',   /* AUDIO SLOT */
    enemy_die:    'assets/audio/enemy_die_01.mp3',     /* AUDIO SLOT */
    war_drums:    'assets/audio/music_war_drums.mp3',  /* AUDIO SLOT (loop) */
    ambience_jungle: 'assets/audio/amb_jungle.mp3',    /* AUDIO SLOT (loop) */
  };

  const PENTATONIC = [220, 247.5, 277.2, 330, 371.25, 440, 495]; // A-ish hemitonic feel

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.buses = {};
      this.samples = {};
      this.volumes = { master: 0.8, music: 0.7, sfx: 0.9, ambience: 0.7 };
      this.musicMode = 'none';
      this.intensity = 0;          // 0 explore … 1 full combat
      this._smoothedIntensity = 0;
      this.ambienceType = 'none';
      this._ambNodes = [];
      this._musicTimer = null;
      this._nextBeat = 0;
      this._beatCount = 0;
      this._bpm = 72;
      this._fluteCooldown = 0;
      this._birdCooldown = 2;
      this._knockCooldown = 1;
      this._enabled = true;
    }

    /* Must be called from a user gesture (click / keydown). Safe to call often. */
    ensure() {
      if (!this._enabled) return false;
      if (!this.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AC();
        } catch (e) {
          console.warn('[audio] WebAudio unavailable', e);
          this._enabled = false;
          return false;
        }
        const c = this.ctx;
        this.buses.master = c.createGain();
        this.buses.master.connect(c.destination);
        for (const b of ['music', 'sfx', 'ambience']) {
          this.buses[b] = c.createGain();
          this.buses[b].connect(this.buses.master);
        }
        this.applyVolumes();
        this._noise = this._makeNoiseBuffer('white');
        this._pink = this._makeNoiseBuffer('pink');
        this._startMusicClock();
        this._tryLoadSamples();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }

    applyVolumes() {
      if (!this.ctx) return;
      const v = this.volumes;
      this.buses.master.gain.value = v.master * v.master; // perceptual curve
      this.buses.music.gain.value = v.music;
      this.buses.sfx.gain.value = v.sfx;
      this.buses.ambience.gain.value = v.ambience;
    }
    setVolumes(v) { Object.assign(this.volumes, v); this.applyVolumes(); }

    async _tryLoadSamples() {
      // Only meaningful when served over http(s); silently skipped on file://.
      if (location.protocol === 'file:') return;
      for (const [key, path] of Object.entries(SAMPLE_SLOTS)) {
        try {
          const res = await fetch(path);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          this.samples[key] = await this.ctx.decodeAudioData(buf);
          console.info('[audio] using real sample for', key);
        } catch (_) { /* keep procedural fallback */ }
      }
    }

    _makeNoiseBuffer(kind) {
      const c = this.ctx, len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      if (kind === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.997 * b0 + 0.029591 * w;
          b1 = 0.985 * b1 + 0.032534 * w;
          b2 = 0.95 * b2 + 0.048056 * w;
          d[i] = (b0 + b1 + b2 + w * 0.05) * 2.1;
        }
      } else {
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      return buf;
    }

    /* ------------------------------------------------------------------ */
    /*  Low-level synth helpers                                            */
    /* ------------------------------------------------------------------ */

    _playSample(key, bus, gain = 1, rate = 1) {
      if (!this.samples[key]) return false;
      const c = this.ctx, src = c.createBufferSource();
      src.buffer = this.samples[key];
      src.playbackRate.value = rate;
      const g = c.createGain(); g.gain.value = gain;
      src.connect(g); g.connect(this.buses[bus]);
      src.start();
      return true;
    }

    _burst({ bus = 'sfx', noise = 'white', dur = 0.15, gain = 0.4, filter = null, q = 1, sweep = null, delay = 0 }) {
      const c = this.ctx, t = c.currentTime + delay;
      const src = c.createBufferSource();
      src.buffer = noise === 'pink' ? this._pink : this._noise;
      src.loop = true;
      let node = src;
      if (filter) {
        const f = c.createBiquadFilter();
        f.type = filter.type || 'bandpass';
        f.frequency.setValueAtTime(filter.freq, t);
        if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(30, sweep), t + dur);
        f.Q.value = q;
        node.connect(f); node = f;
      }
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.012, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      node.connect(g); g.connect(this.buses[bus]);
      src.start(t); src.stop(t + dur + 0.05);
    }

    _tone({ bus = 'sfx', type = 'sine', freq = 440, freqEnd = null, dur = 0.2, gain = 0.3, delay = 0, attack = 0.005, vibrato = 0 }) {
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
      if (vibrato > 0) {
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 5.2; lg.gain.value = vibrato;
        lfo.connect(lg); lg.connect(o.frequency);
        lfo.start(t); lfo.stop(t + dur + 0.1);
      }
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.buses[bus]);
      o.start(t); o.stop(t + dur + 0.05);
      return o;
    }

    /* ------------------------------------------------------------------ */
    /*  SFX API (called by gameplay code)                                  */
    /* ------------------------------------------------------------------ */

    ui() { if (!this.ensure()) return; this._tone({ freq: 660, freqEnd: 520, dur: 0.07, gain: 0.12, type: 'triangle' }); }
    uiConfirm() { if (!this.ensure()) return; this._tone({ freq: 520, dur: 0.06, gain: 0.12, type: 'triangle' }); this._tone({ freq: 780, dur: 0.1, gain: 0.12, type: 'triangle', delay: 0.07 }); }

    footstep(running) {
      if (!this.ensure()) return;
      if (this._playSample('footstep', 'sfx', running ? 0.7 : 0.45, 0.9 + Math.random() * 0.2)) return;
      const f = 240 + Math.random() * 160;
      this._burst({ dur: 0.07, gain: running ? 0.22 : 0.12, noise: 'pink', filter: { type: 'lowpass', freq: f }, q: 0.8 });
    }
    jump() { if (!this.ensure()) return; this._burst({ dur: 0.12, gain: 0.15, noise: 'pink', filter: { type: 'lowpass', freq: 500 } }); }
    land() { if (!this.ensure()) return; this._tone({ freq: 95, freqEnd: 45, dur: 0.13, gain: 0.25 }); this._burst({ dur: 0.1, gain: 0.15, noise: 'pink', filter: { type: 'lowpass', freq: 350 } }); }

    swordSwing() {
      if (!this.ensure()) return;
      if (this._playSample('sword_swing', 'sfx', 0.6)) return;
      this._burst({ dur: 0.22, gain: 0.2, filter: { type: 'bandpass', freq: 1800 }, sweep: 500, q: 2.5 });
    }
    swordClash() {
      if (!this.ensure()) return;
      if (this._playSample('sword_hit', 'sfx', 0.8)) return;
      // metallic ring: inharmonic partials + bright noise click
      for (const [f, g, d] of [[1567, 0.16, 0.35], [2310, 0.1, 0.28], [3140, 0.07, 0.2], [523, 0.1, 0.15]])
        this._tone({ freq: f * (0.97 + Math.random() * 0.06), dur: d, gain: g, type: 'triangle' });
      this._burst({ dur: 0.05, gain: 0.3, filter: { type: 'highpass', freq: 3000 } });
    }
    fleshHit() {
      if (!this.ensure()) return;
      this._tone({ freq: 160, freqEnd: 70, dur: 0.12, gain: 0.3 });
      this._burst({ dur: 0.09, gain: 0.2, noise: 'pink', filter: { type: 'lowpass', freq: 800 } });
    }
    block() {
      if (!this.ensure()) return;
      if (this._playSample('block', 'sfx', 0.7)) return;
      this._tone({ freq: 220, freqEnd: 110, dur: 0.12, gain: 0.3, type: 'square' });
      this._burst({ dur: 0.08, gain: 0.22, noise: 'pink', filter: { type: 'lowpass', freq: 900 } });
    }
    parry() {
      if (!this.ensure()) return;
      if (this._playSample('parry', 'sfx', 0.9)) return;
      for (const [f, g] of [[2093, 0.2], [3136, 0.13], [4186, 0.08]])
        this._tone({ freq: f, dur: 0.5, gain: g, type: 'sine' });
      this._burst({ dur: 0.04, gain: 0.3, filter: { type: 'highpass', freq: 4000 } });
    }
    bowDraw() {
      if (!this.ensure()) return;
      if (this._playSample('bow_draw', 'sfx', 0.5)) return;
      this._burst({ dur: 0.5, gain: 0.07, noise: 'pink', filter: { type: 'bandpass', freq: 300 }, sweep: 700, q: 4 });
    }
    bowRelease(power = 1) {
      if (!this.ensure()) return;
      if (this._playSample('bow_release', 'sfx', 0.6 + 0.3 * power)) return;
      this._tone({ freq: 170, freqEnd: 90, dur: 0.09, gain: 0.3 * power, type: 'triangle' }); // string thump
      this._burst({ dur: 0.25, gain: 0.18 * power, filter: { type: 'bandpass', freq: 2500 }, sweep: 700, q: 1.5 }); // whoosh
    }
    arrowHit(surface = 'wood') {
      if (!this.ensure()) return;
      if (this._playSample('arrow_thud', 'sfx', 0.7)) return;
      if (surface === 'flesh') { this.fleshHit(); return; }
      if (surface === 'stone') {
        this._tone({ freq: 900, freqEnd: 500, dur: 0.06, gain: 0.15, type: 'square' });
        this._burst({ dur: 0.05, gain: 0.2, filter: { type: 'highpass', freq: 2500 } });
      } else {
        this._tone({ freq: 130, freqEnd: 60, dur: 0.11, gain: 0.3 });
        this._burst({ dur: 0.06, gain: 0.18, noise: 'pink', filter: { type: 'lowpass', freq: 1000 } });
      }
    }
    hurt() {
      if (!this.ensure()) return;
      if (this._playSample('hurt', 'sfx', 0.8)) return;
      this._tone({ freq: 240, freqEnd: 110, dur: 0.22, gain: 0.3, type: 'sawtooth' });
      this._burst({ dur: 0.18, gain: 0.14, noise: 'pink', filter: { type: 'bandpass', freq: 700 }, q: 1.2 });
    }
    enemyHurt() { if (!this.ensure()) return; this._tone({ freq: 200 + Math.random() * 80, freqEnd: 90, dur: 0.16, gain: 0.16, type: 'sawtooth' }); }
    enemyDie() {
      if (!this.ensure()) return;
      if (this._playSample('enemy_die', 'sfx', 0.8)) return;
      this._tone({ freq: 190, freqEnd: 55, dur: 0.5, gain: 0.22, type: 'sawtooth' });
      this._burst({ dur: 0.35, gain: 0.16, noise: 'pink', filter: { type: 'lowpass', freq: 500 } });
    }
    stagger() { if (!this.ensure()) return; this._tone({ freq: 320, freqEnd: 140, dur: 0.3, gain: 0.18, type: 'square' }); }
    interact() { if (!this.ensure()) return; this._tone({ freq: 523, dur: 0.08, gain: 0.14, type: 'triangle' }); this._tone({ freq: 659, dur: 0.14, gain: 0.14, type: 'triangle', delay: 0.08 }); }
    whistle() {
      if (!this.ensure()) return;
      this._tone({ freq: 1400, freqEnd: 2100, dur: 0.22, gain: 0.2, type: 'sine', attack: 0.02 });
      this._tone({ freq: 2100, freqEnd: 1500, dur: 0.28, gain: 0.18, type: 'sine', delay: 0.24, attack: 0.02 });
    }
    sense() {
      if (!this.ensure()) return;
      this._tone({ freq: 110, dur: 1.4, gain: 0.14, type: 'sine', attack: 0.15 });
      this._tone({ freq: 220, dur: 1.1, gain: 0.08, type: 'sine', delay: 0.1, attack: 0.2 });
      this._tone({ freq: 1760, freqEnd: 880, dur: 0.5, gain: 0.05, type: 'sine', delay: 0.05 });
    }
    takedown() {
      if (!this.ensure()) return;
      this._burst({ dur: 0.1, gain: 0.22, filter: { type: 'bandpass', freq: 2200 }, sweep: 500, q: 2 });
      this._tone({ freq: 140, freqEnd: 60, dur: 0.16, gain: 0.28 });
    }

    /* v0.7: gunpowder-era enemies (Portuguese/British muskets) */
    musketCock() {
      if (!this.ensure()) return;
      this._tone({ freq: 1400, dur: 0.03, gain: 0.1, type: 'square' });
      this._tone({ freq: 260, dur: 0.05, gain: 0.07, type: 'square', delay: 0.06 });
    }
    musketShot() {
      if (!this.ensure()) return;
      this._burst({ dur: 0.16, gain: 0.42, filter: { type: 'lowpass', freq: 3400 }, sweep: 700 });
      this._tone({ freq: 95, freqEnd: 38, dur: 0.24, gain: 0.36, type: 'square' });
      this._burst({ dur: 0.55, gain: 0.13, noise: 'pink', filter: { type: 'lowpass', freq: 550 }, delay: 0.03 }); // rolling report
    }
    objectiveDone() {
      if (!this.ensure()) return;
      [523, 659, 784].forEach((f, i) => this._tone({ freq: f, dur: 0.28, gain: 0.14, type: 'triangle', delay: i * 0.1 }));
    }
    checkpoint() {
      if (!this.ensure()) return;
      this._tone({ freq: 392, dur: 0.4, gain: 0.12, type: 'sine' });
      this._tone({ freq: 587, dur: 0.6, gain: 0.1, type: 'sine', delay: 0.12 });
    }
    bell() { // temple bell for stupa / victory moments
      if (!this.ensure()) return;
      for (const [f, g, d] of [[440, 0.2, 2.4], [1108, 0.1, 1.8], [1740, 0.05, 1.2]])
        this._tone({ freq: f, dur: d, gain: g, type: 'sine' });
    }
    victory() {
      if (!this.ensure()) return;
      this.bell();
      [523, 659, 784, 1046].forEach((f, i) => this._tone({ freq: f, dur: 0.7, gain: 0.12, type: 'triangle', delay: 0.3 + i * 0.16 }));
    }
    defeat() {
      if (!this.ensure()) return;
      [330, 311, 262, 196].forEach((f, i) => this._tone({ freq: f, dur: 0.9, gain: 0.14, type: 'sine', delay: i * 0.35 }));
      this._tone({ freq: 65, dur: 2.2, gain: 0.2, type: 'sine', delay: 0.2 });
    }
    warHorn() {
      if (!this.ensure()) return;
      this._tone({ freq: 175, dur: 1.6, gain: 0.22, type: 'sawtooth', attack: 0.25, vibrato: 3 });
      this._tone({ freq: 174, dur: 1.6, gain: 0.14, type: 'square', attack: 0.3 });
    }
    elephantTrumpet() {
      if (!this.ensure()) return;
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(280, t);
      o.frequency.linearRampToValueAtTime(520, t + 0.25);
      o.frequency.linearRampToValueAtTime(330, t + 0.8);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 1.5;
      o.connect(f); f.connect(g); g.connect(this.buses.sfx);
      o.start(t); o.stop(t + 1.1);
    }

    /* ------------------------------------------------------------------ */
    /*  AMBIENCE BEDS                                                      */
    /* ------------------------------------------------------------------ */

    setAmbience(type) {
      if (!this.ensure()) { this.ambienceType = type; return; }
      if (type === this.ambienceType) return;
      this.ambienceType = type;
      // fade out & stop old bed
      for (const n of this._ambNodes) {
        try {
          n.gainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.6);
          n.src.stop(this.ctx.currentTime + 2.5);
        } catch (_) {}
      }
      this._ambNodes = [];
      if (type === 'none') return;

      /* AUDIO SLOT: assets/audio/amb_jungle.mp3 (looping bed replaces wind layer) */
      const addLoop = (noise, filterType, freq, q, gain, lfoRate, lfoDepth) => {
        const c = this.ctx;
        const src = c.createBufferSource();
        src.buffer = noise === 'pink' ? this._pink : this._noise;
        src.loop = true;
        const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
        const g = c.createGain(); g.gain.value = 0.0001;
        g.gain.setTargetAtTime(gain, c.currentTime, 1.2);
        if (lfoRate) {
          const lfo = c.createOscillator(), lg = c.createGain();
          lfo.frequency.value = lfoRate; lg.gain.value = lfoDepth;
          lfo.connect(lg); lg.connect(f.frequency); lfo.start();
        }
        src.connect(f); f.connect(g); g.connect(this.buses.ambience);
        src.start();
        this._ambNodes.push({ src, gainNode: g });
      };

      switch (type) {
        case 'jungle':
        case 'village':
          addLoop('pink', 'lowpass', 320, 0.6, 0.10, 0.07, 120);   // soft wind through canopy
          addLoop('white', 'bandpass', 5200, 6, 0.012, 3.1, 900);  // insect shimmer
          break;
        case 'battlefield':
          addLoop('pink', 'lowpass', 280, 0.6, 0.13, 0.05, 100);   // low wind
          addLoop('pink', 'bandpass', 900, 1.2, 0.02, 0.4, 300);   // distant din
          break;
        case 'construction':
          addLoop('pink', 'lowpass', 350, 0.6, 0.10, 0.06, 130);   // wind
          break;
        case 'heights':
          addLoop('pink', 'lowpass', 500, 0.5, 0.16, 0.09, 260);   // strong high-altitude wind
          addLoop('white', 'bandpass', 1400, 2.5, 0.02, 0.13, 500);
          break;
      }
    }

    /* ------------------------------------------------------------------ */
    /*  MUSIC — layered war-drums / flute, crossfaded by combat intensity  */
    /*  Implemented as a lookahead scheduler over a beat clock so layers   */
    /*  can be mixed by gain (per spec: crossfading, not track switching). */
    /* ------------------------------------------------------------------ */

    setMusicMode(mode) {
      this.musicMode = mode;
      this._bpm = mode === 'duel' ? 96 : mode === 'menu' ? 60 : 72;
    }
    setIntensity(x) { this.intensity = Math.max(0, Math.min(1, x)); }

    _startMusicClock() {
      if (this._musicTimer) return;
      this._nextBeat = this.ctx.currentTime + 0.1;
      this._musicTimer = setInterval(() => this._scheduleMusic(), 40);
    }

    _scheduleMusic() {
      if (!this.ctx || this.musicMode === 'none') return;
      const c = this.ctx;
      // smooth the combat intensity so layers swell instead of snapping
      this._smoothedIntensity += (this.intensity - this._smoothedIntensity) * 0.06;
      const inten = this._smoothedIntensity;
      const spb = 60 / (this._bpm * (1 + inten * 0.35)); // combat pushes tempo
      while (this._nextBeat < c.currentTime + 0.15) {
        const t = this._nextBeat, beat = this._beatCount % 8;
        const isDuel = this.musicMode === 'duel';

        /* AUDIO SLOT: assets/audio/music_war_drums.mp3 — replaces this drum kit */
        // Layer 1 — deep war drum (always present, heartbeat of the score)
        if (beat === 0 || beat === 4) this._drum(t, 66, 0.20 + inten * 0.1);
        // Layer 2 — mid drums (fade in with tension)
        const midG = Math.max(0, inten - 0.15) * 0.28;
        if (midG > 0.01 && (beat === 2 || beat === 5 || beat === 7)) this._drum(t, 110, midG);
        // Layer 3 — fast skin hits (full combat only)
        const fastG = Math.max(0, inten - 0.5) * 0.4;
        if (fastG > 0.01 && beat % 2 === 1) {
          this._burst({ bus: 'music', dur: 0.06, gain: fastG * 0.5, noise: 'pink', filter: { type: 'bandpass', freq: 1500 }, q: 1.4, delay: t - c.currentTime });
          this._drum(t + spb * 0.5, 150, fastG * 0.5);
        }
        // Duel / finale — solemn drone + choral swell
        if (isDuel && beat === 0 && this._beatCount % 16 === 0) this._drone(t, spb * 16);
        // Exploration — bamboo-flute-style motif (recedes during combat)
        const fluteG = Math.max(0, 0.55 - inten) * 0.35;
        if (fluteG > 0.02 && !isDuel) {
          this._fluteCooldown -= spb;
          if (this._fluteCooldown <= 0 && Math.random() < 0.4) {
            this._flutePhrase(t, spb, fluteG);
            this._fluteCooldown = 6 + Math.random() * 8;
          }
        }
        this._nextBeat += spb;
        this._beatCount++;
      }
      this._ambienceEvents();
    }

    _drum(t, freq, gain) {
      const c = this.ctx;
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(freq * 2, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.22);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g); g.connect(this.buses.music);
      o.start(t); o.stop(t + 0.45);
      // skin slap
      const src = c.createBufferSource(); src.buffer = this._pink; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.005);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      src.connect(f); f.connect(ng); ng.connect(this.buses.music);
      src.start(t); src.stop(t + 0.12);
    }

    _flutePhrase(t, spb, gain) {
      let idx = 2 + Math.floor(Math.random() * 3);
      const n = 3 + Math.floor(Math.random() * 3);
      let tt = t;
      for (let i = 0; i < n; i++) {
        idx = Math.max(0, Math.min(PENTATONIC.length - 1, idx + (Math.floor(Math.random() * 3) - 1)));
        const dur = spb * (Math.random() < 0.3 ? 2.2 : 1.1);
        this._tone({ bus: 'music', type: 'triangle', freq: PENTATONIC[idx] * 2, dur, gain, delay: tt - this.ctx.currentTime, attack: 0.08, vibrato: 6 });
        // breath noise under the note
        this._burst({ bus: 'music', dur: dur * 0.8, gain: gain * 0.12, filter: { type: 'bandpass', freq: PENTATONIC[idx] * 2 }, q: 2, delay: tt - this.ctx.currentTime });
        tt += dur;
      }
    }

    _drone(t, dur) {
      // solemn low drone + slow "choral" partials for the duel / stupa finale
      const c = this.ctx, root = 110;
      for (const [ratio, g] of [[1, 0.10], [1.5, 0.05], [2, 0.045], [2.4, 0.028]]) {
        const o = c.createOscillator();
        o.type = ratio === 1 ? 'sawtooth' : 'sine';
        o.frequency.value = root * ratio * (0.998 + Math.random() * 0.004);
        const gg = c.createGain();
        gg.gain.setValueAtTime(0.0001, t);
        gg.gain.linearRampToValueAtTime(g, t + dur * 0.35);
        gg.gain.linearRampToValueAtTime(0.0001, t + dur);
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
        o.connect(f); f.connect(gg); gg.connect(this.buses.music);
        o.start(t); o.stop(t + dur + 0.1);
      }
    }

    _ambienceEvents() {
      const c = this.ctx, now = c.currentTime;
      // random bird calls in jungle levels
      if (this.ambienceType === 'jungle' || this.ambienceType === 'village') {
        this._birdCooldown -= 0.04;
        if (this._birdCooldown <= 0) {
          this._birdCooldown = 2.5 + Math.random() * 7;
          const f0 = 1400 + Math.random() * 1800;
          const n = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++)
            this._tone({ bus: 'ambience', freq: f0, freqEnd: f0 * (1.2 + Math.random() * 0.5), dur: 0.12, gain: 0.03, type: 'sine', delay: i * 0.16, attack: 0.02 });
        }
      }
      // hammering / chisel knocks at the construction site
      if (this.ambienceType === 'construction') {
        this._knockCooldown -= 0.04;
        if (this._knockCooldown <= 0) {
          this._knockCooldown = 0.7 + Math.random() * 2.2;
          this._tone({ bus: 'ambience', freq: 620 + Math.random() * 500, freqEnd: 240, dur: 0.05, gain: 0.05, type: 'square' });
          this._burst({ bus: 'ambience', dur: 0.05, gain: 0.05, noise: 'pink', filter: { type: 'lowpass', freq: 1500 } });
        }
      }
      // sparse echoed calls at Sigiriya's height
      if (this.ambienceType === 'heights') {
        this._birdCooldown -= 0.04;
        if (this._birdCooldown <= 0) {
          this._birdCooldown = 6 + Math.random() * 12;
          const f0 = 900 + Math.random() * 700;
          for (let e = 0; e < 3; e++) // fake echo taps
            this._tone({ bus: 'ambience', freq: f0, freqEnd: f0 * 0.8, dur: 0.3, gain: 0.03 / (e + 1), type: 'sine', delay: e * 0.45, attack: 0.05 });
        }
      }
    }
  }

  G.AudioEngine = AudioEngine;
  G.audio = new AudioEngine();
})();
