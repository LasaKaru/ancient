/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — engine/world.js
   Scene atmosphere: sky dome, sun/shadow lighting rig, fog, dust particles,
   post-processing chain (bloom + vignette + film grain), plus the shared
   utility toolbox (math helpers, seeded RNG) and the procedural PBR material
   library used by every level.

   VISUAL FIDELITY TARGET (be honest with yourself, future reader):
   we aim for the best *real-time browser WebGL* look — a stylized-realistic
   indie-AAA presentation via PBR materials, ACES tone mapping, soft shadows
   and post FX. Literal photorealism is not achievable in-browser and is
   explicitly not the goal.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const { EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass } = window.__MODULES__.POST;

  /* ========================== UTILITIES ========================== */
  const util = {
    clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
    lerp: (a, b, t) => a + (b - a) * t,
    /* frame-rate independent exponential approach */
    damp: (cur, target, lambda, dt) => THREE.MathUtils.damp(cur, target, lambda, dt),
    rand: (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
    randInt: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    v3: (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z),
    angleLerp(a, b, t) {
      let d = (b - a) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      return a + d * t;
    },
    /* deterministic RNG so level layouts are stable between runs */
    mulberry(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    flatDist(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return Math.hypot(dx, dz); },
    yawTo(from, to) { return Math.atan2(to.x - from.x, to.z - from.z); },
    makeLabel(text, color = '#f3cd7a') {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 64;
      const c = cv.getContext('2d');
      c.font = '28px Georgia';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = 6;
      c.fillStyle = color;
      c.fillText(text, 128, 32);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.scale.set(1.9, 0.48, 1);
      return sp;
    },
  };
  G.util = util;

  /* ==================== PROCEDURAL PBR MATERIALS ====================
     No image assets ship with the game, so every texture is painted onto a
     canvas at startup: albedo + a bump map derived from the same painter.
     Real texture files can be swapped in later — see assets/README.md.    */
  const texCache = {};
  const Mats = {
    canvasTex(key, size, painter, { repeat = [1, 1], srgb = true } = {}) {
      const cacheKey = key + repeat.join(',');
      if (texCache[cacheKey]) return texCache[cacheKey];
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      painter(cv.getContext('2d'), size);
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
      tex.anisotropy = 4;
      if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
      texCache[cacheKey] = tex;
      return tex;
    },

    _speckle(c, size, n, colors, rMin = 0.5, rMax = 2.5, alpha = 0.5) {
      for (let i = 0; i < n; i++) {
        c.fillStyle = util.pick(colors);
        c.globalAlpha = Math.random() * alpha;
        const r = util.rand(rMin, rMax);
        c.beginPath();
        c.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    },

    /* ---- painters ---- */
    brickPainter(base = '#a55a35', mortar = '#7d6a52') {
      return (c, s) => {
        c.fillStyle = mortar; c.fillRect(0, 0, s, s);
        const bh = s / 8, bw = s / 4;
        for (let row = 0; row < 8; row++) {
          const off = (row % 2) * bw * 0.5;
          for (let col = -1; col < 5; col++) {
            const x = col * bw + off, y = row * bh;
            const grad = c.createLinearGradient(x, y, x + bw, y + bh);
            const jitter = util.randInt(-14, 14);
            grad.addColorStop(0, Mats._shade(base, jitter));
            grad.addColorStop(1, Mats._shade(base, jitter - 16));
            c.fillStyle = grad;
            c.fillRect(x + 2, y + 2, bw - 4, bh - 4);
          }
        }
        Mats._speckle(c, s, 700, ['#00000033', '#ffffff22', '#5a2e1a55'], 0.4, 1.6, 0.4);
      };
    },
    _shade(hex, amt) {
      const n = parseInt(hex.slice(1), 16);
      const r = util.clamp(((n >> 16) & 255) + amt, 0, 255);
      const g = util.clamp(((n >> 8) & 255) + amt, 0, 255);
      const b = util.clamp((n & 255) + amt, 0, 255);
      return `rgb(${r},${g},${b})`;
    },
    grainyPainter(base, tones, speckles = 2600) {
      return (c, s) => {
        c.fillStyle = base; c.fillRect(0, 0, s, s);
        Mats._speckle(c, s, speckles, tones, 0.5, 3, 0.35);
        // large soft blotches for organic variation
        for (let i = 0; i < 24; i++) {
          const g = c.createRadialGradient(
            Math.random() * s, Math.random() * s, 2,
            Math.random() * s, Math.random() * s, util.rand(s * 0.1, s * 0.3));
          g.addColorStop(0, util.pick(tones));
          g.addColorStop(1, 'transparent');
          c.globalAlpha = 0.12; c.fillStyle = g; c.fillRect(0, 0, s, s);
        }
        c.globalAlpha = 1;
      };
    },
    plankPainter(base = '#7a5230') {
      return (c, s) => {
        c.fillStyle = base; c.fillRect(0, 0, s, s);
        const pw = s / 6;
        for (let p = 0; p < 6; p++) {
          c.fillStyle = Mats._shade(base, util.randInt(-20, 16));
          c.fillRect(p * pw + 1, 0, pw - 2, s);
          c.strokeStyle = '#00000055';
          for (let l = 0; l < 7; l++) {
            c.beginPath();
            const x = p * pw + util.rand(3, pw - 3);
            c.moveTo(x, 0);
            c.bezierCurveTo(x + util.rand(-6, 6), s * 0.33, x + util.rand(-6, 6), s * 0.66, x + util.rand(-8, 8), s);
            c.lineWidth = util.rand(0.4, 1.4);
            c.stroke();
          }
        }
        Mats._speckle(c, s, 500, ['#00000044', '#ffffff18'], 0.3, 1.2, 0.4);
      };
    },
    clothPainter(base) {
      return (c, s) => {
        c.fillStyle = base; c.fillRect(0, 0, s, s);
        c.globalAlpha = 0.14;
        for (let i = 0; i < s; i += 3) {
          c.fillStyle = i % 6 ? '#000000' : '#ffffff';
          c.fillRect(0, i, s, 1);
          c.fillRect(i, 0, 1, s);
        }
        c.globalAlpha = 1;
      };
    },

    /* ---- cached shared textures ---- */
    tex: {
      brick: (rep = [3, 2]) => Mats.canvasTex('brick', 256, Mats.brickPainter(), { repeat: rep }),
      brickOld: (rep = [3, 2]) => Mats.canvasTex('brickOld', 256, Mats.brickPainter('#8f5a3e', '#6e5f4c'), { repeat: rep }),
      plaster: (rep = [2, 2]) => Mats.canvasTex('plaster', 256, Mats.grainyPainter('#ded2b8', ['#c9bda2', '#efe6cf', '#b3a68b']), { repeat: rep }),
      whitewash: (rep = [2, 2]) => Mats.canvasTex('whitewash', 256, Mats.grainyPainter('#efe9da', ['#e0d8c4', '#f8f4ea', '#cfc5ad']), { repeat: rep }),
      stone: (rep = [2, 2]) => Mats.canvasTex('stone', 256, Mats.grainyPainter('#8d8578', ['#79726a', '#a09889', '#6a655c']), { repeat: rep }),
      graniteDark: (rep = [2, 2]) => Mats.canvasTex('graniteDark', 256, Mats.grainyPainter('#5d5850', ['#4d4942', '#6e685f', '#3c3833']), { repeat: rep }),
      dirt: (rep = [8, 8]) => Mats.canvasTex('dirt', 256, Mats.grainyPainter('#7c603f', ['#6b5236', '#8d7049', '#5c4630', '#93805d'], 3600), { repeat: rep }),
      grass: (rep = [10, 10]) => Mats.canvasTex('grass', 256, Mats.grainyPainter('#5c6e35', ['#4a5c2a', '#6e8040', '#3f5124', '#7c8a4c'], 4200), { repeat: rep }),
      sand: (rep = [6, 6]) => Mats.canvasTex('sand', 256, Mats.grainyPainter('#c2a878', ['#b09669', '#d1ba8c', '#a08a60'], 3000), { repeat: rep }),
      wood: (rep = [1, 1]) => Mats.canvasTex('wood', 256, Mats.plankPainter(), { repeat: rep }),
      woodDark: (rep = [1, 1]) => Mats.canvasTex('woodDark', 256, Mats.plankPainter('#54371f'), { repeat: rep }),
      rock: (rep = [3, 3]) => Mats.canvasTex('rock', 256, Mats.grainyPainter('#7a6f60', ['#655b4e', '#8d8271', '#57503f', '#93876f']), { repeat: rep }),
      sigiriyaRock: (rep = [4, 6]) => Mats.canvasTex('sigRock', 256, Mats.grainyPainter('#a3714a', ['#8a5d3d', '#b5854f', '#7c5236', '#c29a6b']), { repeat: rep }),
      thatch: (rep = [2, 1]) => Mats.canvasTex('thatch', 256, (c, s) => {
        c.fillStyle = '#9a8146'; c.fillRect(0, 0, s, s);
        for (let i = 0; i < 900; i++) {
          c.strokeStyle = Mats._shade('#9a8146', util.randInt(-40, 30));
          c.globalAlpha = 0.6; c.lineWidth = util.rand(0.6, 1.6);
          const x = Math.random() * s, y = Math.random() * s;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + util.rand(-4, 4), y + util.rand(8, 22)); c.stroke();
        }
        c.globalAlpha = 1;
      }, { repeat: rep }),
    },

    /* material factory with sane PBR defaults */
    std({ map = null, color = 0xffffff, rough = 0.85, metal = 0.0, bump = 0.0, flat = false, emissive = 0x000000, emissiveIntensity = 1, side } = {}) {
      const m = new THREE.MeshStandardMaterial({
        map, color, roughness: rough, metalness: metal,
        emissive, emissiveIntensity, flatShading: flat,
      });
      if (side !== undefined) m.side = side;
      if (map && bump > 0) { m.bumpMap = map; m.bumpScale = bump; }
      return m;
    },
    /* shared armour / prop materials (cached because instancing shares them) */
    lib: null,
    library() {
      if (Mats.lib) return Mats.lib;
      Mats.lib = {
        brick: Mats.std({ map: Mats.tex.brick(), rough: 0.92, bump: 0.06 }),
        plaster: Mats.std({ map: Mats.tex.plaster(), rough: 0.9, bump: 0.02 }),
        whitewash: Mats.std({ map: Mats.tex.whitewash(), rough: 0.85, bump: 0.02 }),
        stone: Mats.std({ map: Mats.tex.stone(), rough: 0.95, bump: 0.05 }),
        graniteDark: Mats.std({ map: Mats.tex.graniteDark(), rough: 0.9, bump: 0.05 }),
        wood: Mats.std({ map: Mats.tex.wood(), rough: 0.8, bump: 0.04 }),
        woodDark: Mats.std({ map: Mats.tex.woodDark(), rough: 0.85, bump: 0.04 }),
        thatch: Mats.std({ map: Mats.tex.thatch(), rough: 1.0, bump: 0.08 }),
        rock: Mats.std({ map: Mats.tex.rock(), rough: 0.97, bump: 0.08, flat: true }),
        bronze: Mats.std({ color: 0xa97b3c, rough: 0.35, metal: 0.85 }),
        iron: Mats.std({ color: 0x8a8d92, rough: 0.4, metal: 0.9 }),
        gold: Mats.std({ color: 0xe8b94a, rough: 0.25, metal: 1.0 }),
        leather: Mats.std({ color: 0x6d4526, rough: 0.75, metal: 0.05 }),
        leatherDark: Mats.std({ color: 0x452a17, rough: 0.8, metal: 0.05 }),
        skin: Mats.std({ color: 0x9c6b4a, rough: 0.75 }),
        skinDark: Mats.std({ color: 0x7c5238, rough: 0.75 }),
        foliage: Mats.std({ color: 0x4a6b2d, rough: 0.95, flat: true }),
        foliageDry: Mats.std({ color: 0x7a7c3a, rough: 0.95, flat: true }),
        trunk: Mats.std({ color: 0x5e4428, rough: 0.95, flat: true }),
      };
      return Mats.lib;
    },
  };
  G.Mats = Mats;

  /* ============================ POST SHADER ============================ */
  const VignetteGrainShader = {
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      vigStrength: { value: 0.55 },
      grain: { value: 0.045 },
      damage: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float time, vigStrength, grain, damage;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + time) * 43758.5453); }
      void main() {
        vec4 col = texture2D(tDiffuse, vUv);
        float d = distance(vUv, vec2(0.5));
        col.rgb *= 1.0 - vigStrength * smoothstep(0.35, 0.85, d);       // vignette
        col.rgb += (hash(vUv * 900.0) - 0.5) * grain;                    // film grain
        col.rgb = mix(col.rgb, vec3(0.45, 0.03, 0.01), damage * smoothstep(0.25, 0.8, d)); // hurt flash
        gl_FragColor = col;
      }`,
  };

  /* ============================== WORLD ============================== */
  class World {
    /**
     * @param engine  the GameEngine
     * @param opts    per-level atmosphere: {skyTop, skyHorizon, sunDir, sunColor,
     *                sunIntensity, hemiSky, hemiGround, fogColor, fogScale, dust}
     */
    constructor(engine, opts = {}) {
      this.engine = engine;
      this.opts = Object.assign({
        skyTop: 0x3d6fb5, skyHorizon: 0xd9c9a3, sunDir: new THREE.Vector3(-0.55, 0.72, 0.35),
        sunColor: 0xfff0d0, sunIntensity: 2.6,
        hemiSky: 0xbcd8f5, hemiGround: 0x8a7048, hemiIntensity: 0.55,
        fogColor: 0xcfc4a4, fogScale: 1.0, dust: true,
        weather: 'clear',          // v0.3 §2.4: 'clear' | 'rain' | 'dust' | 'haze'
      }, opts);
      this.scene = engine.scene;
      this.composer = null;
      this.time = 0;
      this._damageFlash = 0;
      this._build();
    }

    _build() {
      const o = this.opts, scene = this.scene;

      /* --- gradient sky dome (procedural HDRI substitute) --- */
      const skyGeo = new THREE.SphereGeometry(900, 24, 16);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color(o.skyTop) },
          horizon: { value: new THREE.Color(o.skyHorizon) },
          sunDir: { value: o.sunDir.clone().normalize() },
          sunColor: { value: new THREE.Color(o.sunColor) },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform vec3 top, horizon, sunColor, sunDir;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 col = mix(horizon, top, pow(h, 0.55));
            float sun = clamp(dot(normalize(vDir), normalize(sunDir)), 0.0, 1.0);
            col += sunColor * (pow(sun, 350.0) * 3.0 + pow(sun, 12.0) * 0.22);   // disc + haze
            col = mix(col, horizon * 1.05, pow(1.0 - h, 6.0) * 0.5);             // ground haze
            gl_FragColor = vec4(col, 1.0);
          }`,
      });
      this.sky = new THREE.Mesh(skyGeo, skyMat);
      this.sky.frustumCulled = false;
      scene.add(this.sky);
      this._baseSunDir = o.sunDir.clone().normalize();

      /* --- lighting rig: key sun + hemisphere fill + faint bounce --- */
      this.hemi = new THREE.HemisphereLight(o.hemiSky, o.hemiGround, o.hemiIntensity);
      scene.add(this.hemi);

      this.sun = new THREE.DirectionalLight(o.sunColor, o.sunIntensity);
      this.sun.position.copy(o.sunDir).multiplyScalar(80);
      this.sun.castShadow = true;
      const s = this.sun.shadow;
      s.mapSize.set(2048, 2048);
      s.camera.near = 5; s.camera.far = 250;
      s.camera.left = s.camera.bottom = -70;
      s.camera.right = s.camera.top = 70;
      s.bias = -0.0006;
      s.normalBias = 0.03;
      scene.add(this.sun);
      scene.add(this.sun.target);

      this.bounce = new THREE.DirectionalLight(0xffe0b8, 0.25);
      this.bounce.position.copy(o.sunDir.clone().multiplyScalar(-40).setY(20));
      scene.add(this.bounce);

      /* --- fog (density driven by draw-distance setting) --- */
      scene.fog = new THREE.Fog(o.fogColor, 40, 200);
      scene.background = new THREE.Color(o.fogColor);

      /* --- drifting dust / pollen motes (cheap volumetric feel) --- */
      if (o.dust) {
        const n = 350;
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          pos[i * 3] = util.rand(-50, 50);
          pos[i * 3 + 1] = util.rand(0.3, 9);
          pos[i * 3 + 2] = util.rand(-50, 50);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
          color: 0xffeecc, size: 0.055, transparent: true, opacity: 0.5,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
        }));
        this.dust.frustumCulled = false;
        scene.add(this.dust);
      }
      this._buildWeather();
      this.applySettings();
      this.setWeather(o.weather);
    }

    /* -------------------- weather (v0.3 §2.4) --------------------
       Reusable particle rigs built once and toggled per level. Rain falls as
       short vertical streaks in a box that follows the player; dry-zone dust
       blows past horizontally; heat haze warms the air and shimmers.  */
    _buildWeather() {
      const scene = this.scene;
      this.weather = { kind: 'clear', intensity: 1, t: 0 };
      this._baseFog = { near: scene.fog.near, far: scene.fog.far, color: scene.fog.color.clone() };
      this._baseExposure = 1.06;

      // --- rain: line streaks, 2 verts each ---
      const RN = 900, R_BOX = 46, R_TOP = 24;
      const rpos = new Float32Array(RN * 6);
      this._rainSeed = new Float32Array(RN);
      for (let i = 0; i < RN; i++) {
        const x = util.rand(-R_BOX, R_BOX), y = util.rand(0, R_TOP), z = util.rand(-R_BOX, R_BOX);
        const len = util.rand(0.5, 0.95);
        rpos[i * 6] = x; rpos[i * 6 + 1] = y + len; rpos[i * 6 + 2] = z;
        rpos[i * 6 + 3] = x; rpos[i * 6 + 4] = y; rpos[i * 6 + 5] = z;
        this._rainSeed[i] = util.rand(0.8, 1.4);
      }
      const rgeo = new THREE.BufferGeometry();
      rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
      this.rain = new THREE.LineSegments(rgeo, new THREE.LineBasicMaterial({
        color: 0xafc0d0, transparent: true, opacity: 0.34,
      }));
      this.rain.frustumCulled = false; this.rain.visible = false;
      this._rainPos = rpos; this._rainN = RN; this._rainBox = R_BOX; this._rainTop = R_TOP;
      scene.add(this.rain);

      // --- dust: horizontal blowing motes ---
      const DN = 420;
      const dpos = new Float32Array(DN * 3);
      for (let i = 0; i < DN; i++) {
        dpos[i * 3] = util.rand(-50, 50);
        dpos[i * 3 + 1] = util.rand(0.2, 6);
        dpos[i * 3 + 2] = util.rand(-50, 50);
      }
      const dgeo = new THREE.BufferGeometry();
      dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
      this.dustStorm = new THREE.Points(dgeo, new THREE.PointsMaterial({
        color: 0xcdb387, size: 0.12, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true,
      }));
      this.dustStorm.frustumCulled = false; this.dustStorm.visible = false;
      this._dustStormPos = dpos; this._dustStormN = DN;
      scene.add(this.dustStorm);
    }

    setWeather(kind = 'clear', intensity = 1) {
      if (!this.weather) return;
      this.weather.kind = kind; this.weather.intensity = intensity;
      const rain = kind === 'rain';
      if (this.rain) this.rain.visible = rain;
      if (this.dustStorm) this.dustStorm.visible = kind === 'dust';
      if (this.dust) this.dust.visible = this.opts.dust && kind !== 'rain';   // motes hide in the downpour
      // atmosphere shifts
      const fog = this.scene.fog, bf = this._baseFog;
      if (rain) {
        fog.color.setHex(0x6f7a82); this.scene.background.setHex(0x6f7a82);
        fog.near = bf.near * 0.6; fog.far = bf.far * 0.62;
        this.hemi.intensity = this.opts.hemiIntensity * 0.7;
        this.sun.intensity = this.opts.sunIntensity * 0.45;
      } else if (kind === 'dust') {
        fog.color.setHex(0xc9a86e); this.scene.background.setHex(0xc9a86e);
        fog.near = bf.near * 0.5; fog.far = bf.far * 0.66;
        this.hemi.intensity = this.opts.hemiIntensity;
        this.sun.intensity = this.opts.sunIntensity * 0.8;
      } else if (kind === 'haze') {
        fog.color.setHex(0xe6d6ad); this.scene.background.setHex(0xe6d6ad);
        fog.near = bf.near * 0.8; fog.far = bf.far * 0.9;
        this.hemi.intensity = this.opts.hemiIntensity * 1.1;
        this.sun.intensity = this.opts.sunIntensity;
      } else {
        fog.color.copy(bf.color); this.scene.background.copy(bf.color);
        this.hemi.intensity = this.opts.hemiIntensity;
        this.sun.intensity = this.opts.sunIntensity;
        this.applySettings();   // restore the draw-distance-driven fog
      }
      if (this._gl) this._gl.toneMappingExposure = kind === 'haze' ? 1.16 : kind === 'rain' ? 0.94 : this._baseExposure;
      G.audio.setWeatherSound(rain ? 'rain' : kind === 'dust' ? 'dust' : 'clear');
    }

    /* Post chain — created once the renderer exists */
    setupPost(gl, camera) {
      // cheap image-based lighting so metals (bronze/gold/steel) read properly
      const { RoomEnvironment } = window.__MODULES__;
      if (RoomEnvironment && !this.scene.environment) {
        const pmrem = new THREE.PMREMGenerator(gl);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        if ('environmentIntensity' in this.scene) this.scene.environmentIntensity = 0.35;
        pmrem.dispose();
      }
      const size = gl.getSize(new THREE.Vector2());
      const target = new THREE.WebGLRenderTarget(size.x, size.y, {
        samples: 4, type: THREE.HalfFloatType,
      });
      this.composer = new EffectComposer(gl, target);
      this.composer.addPass(new RenderPass(this.scene, camera));
      this.bloom = new UnrealBloomPass(size.clone(), 0.28, 0.6, 0.88);
      this.composer.addPass(this.bloom);
      this.vgPass = new ShaderPass(VignetteGrainShader);
      this.composer.addPass(this.vgPass);
      this.composer.addPass(new OutputPass());
      this._gl = gl;
      this._camera = camera;
    }

    setSize(w, h) { if (this.composer) this.composer.setSize(w, h); }

    flashDamage() { this._damageFlash = 1; }

    render(dt) {
      const gfx = G.Settings.data.graphics;
      this._damageFlash = Math.max(0, this._damageFlash - dt * 2.4);
      if (this.composer && gfx.postFX) {
        this.vgPass.uniforms.time.value = this.time;
        this.vgPass.uniforms.damage.value = this._damageFlash * 0.6;
        this.composer.render();
      } else if (this._gl) {
        this._gl.render(this.scene, this._camera);
      }
    }

    update(dt, playerPos) {
      this.time += dt;
      // the day wears on: the sun drifts slowly across the sky during a mission
      if (this.opts.sunDrift !== false) {
        const a = this.time * (this.opts.sunDriftRate || 0.0006);
        const b = this._baseSunDir, cs = Math.cos(a), sn = Math.sin(a);
        this.opts.sunDir.set(b.x * cs - b.z * sn, b.y + Math.sin(this.time * 0.0004) * 0.06, b.x * sn + b.z * cs).normalize();
        this.sky.material.uniforms.sunDir.value.copy(this.opts.sunDir);
      }
      if (playerPos) {
        // shadow frustum follows the player (quantized to reduce shimmer)
        const q = 2;
        const px = Math.round(playerPos.x / q) * q, pz = Math.round(playerPos.z / q) * q;
        const dir = this.opts.sunDir;
        this.sun.position.set(px + dir.x * 80, dir.y * 80, pz + dir.z * 80);
        this.sun.target.position.set(px, 0, pz);
        this.sky.position.set(playerPos.x, 0, playerPos.z);
        if (this.dust) {
          this.dust.position.x = px; this.dust.position.z = pz;
          this.dust.rotation.y = this.time * 0.01;
          this.dust.position.y = Math.sin(this.time * 0.13) * 0.4;
        }
      }
      this._updateWeather(dt, playerPos);
    }

    _updateWeather(dt, playerPos) {
      const w = this.weather;
      if (!w || w.kind === 'clear') return;
      w.t += dt;
      const px = playerPos ? playerPos.x : 0, pz = playerPos ? playerPos.z : 0;
      if (w.kind === 'rain' && this.rain) {
        // follow the player, and rush each streak downward, wrapping at the ground
        this.rain.position.set(px, 0, pz);
        const p = this._rainPos, box = this._rainBox, top = this._rainTop;
        const fall = 34 * dt, gust = Math.sin(w.t * 0.7) * 3 * dt;
        for (let i = 0; i < this._rainN; i++) {
          const spd = this._rainSeed[i];
          let yTop = p[i * 6 + 1] - fall * spd, yBot = p[i * 6 + 4] - fall * spd;
          let x = p[i * 6] + gust, xB = p[i * 6 + 3] + gust;
          if (yBot < 0) {                              // recycle to the top of the box
            const nx = util.rand(-box, box), nz = util.rand(-box, box), len = yTop - yBot;
            x = nx; xB = nx;
            yBot = top; yTop = top + len;
            p[i * 6 + 2] = nz; p[i * 6 + 5] = nz;
          }
          p[i * 6] = x; p[i * 6 + 1] = yTop;
          p[i * 6 + 3] = xB; p[i * 6 + 4] = yBot;
        }
        this.rain.geometry.attributes.position.needsUpdate = true;
      } else if (w.kind === 'dust' && this.dustStorm) {
        this.dustStorm.position.set(px, 0, pz);
        const p = this._dustStormPos;
        const wind = 9 * dt;
        for (let i = 0; i < this._dustStormN; i++) {
          p[i * 3] += wind;
          p[i * 3 + 1] += Math.sin((w.t + i) * 1.3) * 0.4 * dt;
          if (p[i * 3] > 50) p[i * 3] = -50;           // wrap across the wind
        }
        this.dustStorm.geometry.attributes.position.needsUpdate = true;
      } else if (w.kind === 'haze') {
        // gentle heat shimmer on the exposure
        if (this._gl) this._gl.toneMappingExposure = 1.16 + Math.sin(w.t * 2.3) * 0.02;
      }
    }

    applySettings() {
      const gfx = G.Settings.data.graphics;
      const res = { low: 512, medium: 1024, high: 2048, ultra: 4096 }[gfx.preset] || 1024;
      if (this.sun.shadow.mapSize.x !== res) {
        this.sun.shadow.mapSize.set(res, res);
        if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
      }
      const dd = gfx.drawDistance * this.opts.fogScale;
      this.scene.fog.near = dd * 0.3;
      this.scene.fog.far = dd;
      if (this.bloom) this.bloom.enabled = gfx.postFX;
    }

    dispose() {
      if (this.composer) { this.composer.dispose?.(); this.composer = null; }
      G.audio.setWeatherSound('clear');
    }
  }
  G.World = World;

  /* ==================== LEVEL REGISTRY ====================
     Defined here (world.js loads before the level files) so each level
     module can self-register at script-load time. */
  G.Levels = {
    defs: {},
    order: [],
    register(def) {
      G.Levels.defs[def.id] = def;
      G.Levels.order.push(def.id);
      G.Levels.order.sort((a, b) => G.Levels.defs[a].order - G.Levels.defs[b].order);
    },
    byOrder(n) { return G.Levels.defs[G.Levels.order[n - 1]]; },
    next(id) {
      const i = G.Levels.order.indexOf(id);
      return i >= 0 && i + 1 < G.Levels.order.length ? G.Levels.order[i + 1] : null;
    },
  };
})();
