/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — engine/terrain.js
   Ground plane + boundary hills, dirt paths, instanced foliage, water tanks
   (wewa), and G.Build — the library of ancient-Ceylon architecture pieces
   (stupa/dagoba, moonstone, guard stones, pillared halls, huts, ramparts,
   gatehouse, watchtowers, scaffolding, war elephant, Sigiriya set pieces).

   All geometry is procedural. Repeated vegetation uses THREE.InstancedMesh
   for performance (see Section 14 of the design brief).
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE, BGU } = window.__MODULES__;
  const U = G.util, M = G.Mats;

  /* ============================== TERRAIN ============================== */
  class Terrain {
    /**
     * opts: { size, groundTex:'grass'|'dirt'|'sand'|'rock', bounds (playable
     * radius — invisible walls + rock ring), boundary:'hills'|'cliff'|'none' }
     */
    constructor(engine, opts = {}) {
      this.engine = engine;
      this.opts = Object.assign({
        size: 500, groundTex: 'grass', groundColor: 0xffffff,
        bounds: 85, boundary: 'hills',
      }, opts);
      this.updatables = [];
      this._build();
    }

    _build() {
      const { engine, opts } = this;
      const scene = engine.scene;

      // ---- visual ground ----
      const tex = M.tex[opts.groundTex]([opts.size / 14, opts.size / 14]);
      const g = new THREE.CircleGeometry(opts.size / 2, 48);
      g.rotateX(-Math.PI / 2);
      this.ground = new THREE.Mesh(g, M.std({ map: tex, color: opts.groundColor, rough: 1, bump: 0.03 }));
      this.ground.receiveShadow = true;
      scene.add(this.ground);
      engine.occluders.push(); // ground handled by physics ray, not occluder list

      // ---- physics ground (flat plane at y=0; gameplay spaces are flat) ----
      engine.addStaticPlane();

      // ---- playable-area boundary: rock/hill ring + invisible walls ----
      if (opts.boundary !== 'none') {
        const R = opts.bounds + 14;
        const hillGeo = new THREE.ConeGeometry(1, 1, 7, 1);
        const mat = opts.boundary === 'cliff' ? M.library().rock : M.std({ color: 0x51643a, rough: 1, flat: true });
        const n = 42;
        const inst = new THREE.InstancedMesh(hillGeo, mat, n);
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
        const rng = U.mulberry(1234);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rng() * 0.1;
          const r = R + rng() * 26;
          const h = 14 + rng() * (opts.boundary === 'cliff' ? 30 : 16);
          const w = 12 + rng() * 16;
          q.setFromEuler(new THREE.Euler(0, rng() * Math.PI, 0));
          sc.set(w, h, w);
          m4.compose(new THREE.Vector3(Math.sin(a) * r, h * 0.28, Math.cos(a) * r), q, sc);
          inst.setMatrixAt(i, m4);
        }
        inst.castShadow = inst.receiveShadow = true;
        scene.add(inst);
        // invisible wall ring (12-sided)
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const x = Math.sin(a) * opts.bounds, z = Math.cos(a) * opts.bounds;
          engine.addStaticBox([x, 5, z], [opts.bounds * 0.56, 10, 1], a + Math.PI / 2, { invisible: true });
        }
      }
    }

    /* Dirt path: strip decals laid along a polyline. */
    addPath(points, width = 3) {
      const mat = M.std({ map: M.tex.dirt([1, 4]), rough: 1 });
      mat.polygonOffset = true; mat.polygonOffsetFactor = -1;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const geo = new THREE.PlaneGeometry(width, len + width * 0.5, 1, 1);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((a[0] + b[0]) / 2, 0.02, (a[1] + b[1]) / 2);
        mesh.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
        mesh.receiveShadow = true;
        this.engine.scene.add(mesh);
      }
    }

    /* Instanced dry-zone jungle trees; `exclude` = [{x,z,r}] keep-clear zones.
       Four archetypes for a richer canopy line:
         A rain-tree (clustered multi-lobe crown, per-instance green variation)
         B tall palm
         C flowering tree (araliya-style: green crown + blossom shell tinted
           per instance — white / pink / gold)
         D banyan landmark (huge crown, aerial roots) — a few per level        */
    scatterTrees(count, radius, exclude = [], seed = 77) {
      count = Math.round(count * G.Settings.data.graphics.foliage);
      if (count <= 0) return;
      const lib = M.library();

      // clustered crown: several offset spheres merged (nicer than one blob)
      const crown = (r, lobes, yBase) => {
        const parts = [];
        const rng0 = U.mulberry(seed * 7 + lobes);
        for (let i = 0; i < lobes; i++) {
          const s = new THREE.SphereGeometry(r * (0.55 + rng0() * 0.4), 6, 5);
          s.scale(1, 0.72, 1);
          const a = (i / lobes) * Math.PI * 2;
          s.translate(Math.sin(a) * r * 0.55, yBase + rng0() * r * 0.5, Math.cos(a) * r * 0.55);
          parts.push(s);
        }
        const top = new THREE.SphereGeometry(r * 0.7, 6, 5); top.scale(1, 0.7, 1);
        top.translate(0, yBase + r * 0.45, 0);
        parts.push(top);
        return BGU.mergeGeometries(parts);
      };

      /* shared placement: all meshes in `layers` get identical transforms;
         `tint` optionally sets a per-instance color on a layer */
      const seedPlace = (layers, n, s0, minR = 12, scaleMul = 1, tints = null) => {
        const rng2 = U.mulberry(s0);
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler();
        const col = new THREE.Color();
        let placed = 0, guard = 0;
        while (placed < n && guard++ < n * 40) {
          const a = rng2() * Math.PI * 2, r = minR + Math.sqrt(rng2()) * (radius - minR);
          const x = Math.sin(a) * r, z = Math.cos(a) * r;
          const s = (0.75 + rng2() * 0.8) * scaleMul, sy = s * (0.9 + rng2() * 0.3), rot = rng2() * Math.PI * 2;
          if (exclude.some((e) => Math.hypot(x - e.x, z - e.z) < e.r)) continue;
          eu.set(0, rot, 0); q.setFromEuler(eu);
          m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, sy, s));
          for (let li = 0; li < layers.length; li++) {
            layers[li].setMatrixAt(placed, m4);
            if (tints && tints[li]) {
              tints[li](col, rng2);
              layers[li].setColorAt(placed, col);
            }
          }
          placed++;
        }
        for (const inst of layers) {
          inst.count = placed;
          inst.castShadow = inst.receiveShadow = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          this.engine.scene.add(inst);
        }
      };

      const greenJitter = (col, rng2) => col.setHSL(0.24 + rng2() * 0.08, 0.42 + rng2() * 0.18, 0.28 + rng2() * 0.1);
      const blossomTint = (col, rng2) => {
        const pick = rng2();
        if (pick < 0.4) col.setHSL(0.95, 0.55, 0.78);        // temple-tree pink
        else if (pick < 0.75) col.setHSL(0.13, 0.65, 0.82);  // golden
        else col.setHSL(0.1, 0.12, 0.94);                    // araliya white
      };

      const nA = Math.round(count * 0.45);
      const nB = Math.round(count * 0.25);
      const nC = Math.round(count * 0.22);
      const nD = Math.max(2, Math.round(count * 0.08));

      // A — rain tree
      const trunkA = new THREE.CylinderGeometry(0.22, 0.42, 3.4, 6); trunkA.translate(0, 1.7, 0);
      const canMatA = M.std({ color: 0xffffff, rough: 0.95, flat: true });
      seedPlace([
        new THREE.InstancedMesh(trunkA, lib.trunk, nA),
        new THREE.InstancedMesh(crown(2.4, 4, 4.0), canMatA, nA),
      ], nA, seed, 12, 1, [null, greenJitter]);

      // B — palm
      const trunkB = new THREE.CylinderGeometry(0.14, 0.26, 6.4, 6); trunkB.translate(0, 3.2, 0);
      const leafParts = [];
      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.ConeGeometry(0.5, 3.4, 4);
        leaf.rotateX(Math.PI / 2 + 0.68);
        leaf.rotateY((i / 7) * Math.PI * 2);
        leaf.translate(0, 6.5, 0);
        leafParts.push(leaf);
      }
      seedPlace([
        new THREE.InstancedMesh(trunkB, lib.trunk, nB),
        new THREE.InstancedMesh(BGU.mergeGeometries(leafParts), lib.foliageDry, nB),
      ], nB, seed + 99);

      // C — flowering temple tree: smaller crown + blossom cap tinted per tree
      const trunkC = new THREE.CylinderGeometry(0.16, 0.3, 2.6, 6); trunkC.translate(0, 1.3, 0);
      const blossomCap = crown(1.5, 3, 3.6);
      const blossomMat = M.std({ color: 0xffffff, rough: 0.85, flat: true });
      seedPlace([
        new THREE.InstancedMesh(trunkC, lib.trunk, nC),
        new THREE.InstancedMesh(crown(1.7, 3, 2.9), canMatA, nC),
        new THREE.InstancedMesh(blossomCap, blossomMat, nC),
      ], nC, seed + 41, 12, 0.9, [null, greenJitter, blossomTint]);

      // D — banyan landmarks: broad crown + aerial roots
      const banyanParts = [new THREE.CylinderGeometry(0.55, 0.95, 4.4, 8)];
      banyanParts[0].translate(0, 2.2, 0);
      for (let i = 0; i < 5; i++) {
        const root = new THREE.CylinderGeometry(0.07, 0.12, 3.6, 5);
        const a = (i / 5) * Math.PI * 2 + 0.4;
        root.rotateZ(0.16);
        root.rotateY(a);
        root.translate(Math.sin(a) * 1.6, 1.8, Math.cos(a) * 1.6);
        banyanParts.push(root);
      }
      seedPlace([
        new THREE.InstancedMesh(BGU.mergeGeometries(banyanParts), lib.trunk, nD),
        new THREE.InstancedMesh(crown(3.6, 5, 5.2), canMatA, nD),
      ], nD, seed + 173, 18, 1.25, [null, greenJitter]);
    }

    /* Flowering shrubs: dark bush tuft + blossom cluster tinted per instance */
    scatterFlowers(count, radius, exclude = [], seed = 21) {
      count = Math.round(count * G.Settings.data.graphics.foliage);
      if (count <= 0) return;
      const bushGeo = new THREE.SphereGeometry(0.22, 6, 5);
      bushGeo.scale(1, 0.65, 1); bushGeo.translate(0, 0.13, 0);
      const petalParts = [];
      const rng0 = U.mulberry(seed);
      for (let i = 0; i < 6; i++) {
        const p = new THREE.SphereGeometry(0.05, 5, 4);
        p.translate((rng0() - 0.5) * 0.34, 0.22 + rng0() * 0.12, (rng0() - 0.5) * 0.34);
        petalParts.push(p);
      }
      const bush = new THREE.InstancedMesh(bushGeo, M.std({ color: 0x2e4a20, rough: 1, flat: true }), count);
      const bloom = new THREE.InstancedMesh(BGU.mergeGeometries(petalParts), M.std({ color: 0xffffff, rough: 0.8, flat: true }), count);
      const rng = U.mulberry(seed + 5);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler();
      const col = new THREE.Color();
      const palette = [[0.98, 0.62, 0.72], [0.13, 0.72, 0.75], [0.02, 0.78, 0.62], [0.1, 0.1, 0.95], [0.78, 0.45, 0.75]];
      let placed = 0, guard = 0;
      while (placed < count && guard++ < count * 20) {
        const a = rng() * Math.PI * 2, r = 4 + Math.sqrt(rng()) * (radius - 4);
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (exclude.some((e) => Math.hypot(x - e.x, z - e.z) < e.r)) continue;
        const s = 0.7 + rng() * 1.0;
        eu.set(0, rng() * Math.PI * 2, 0); q.setFromEuler(eu);
        m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
        bush.setMatrixAt(placed, m4);
        bloom.setMatrixAt(placed, m4);
        const [hh, ss, ll] = palette[Math.floor(rng() * palette.length)];
        bloom.setColorAt(placed, col.setHSL(hh, ss, ll));
        placed++;
      }
      bush.count = bloom.count = placed;
      bush.receiveShadow = true;
      if (bloom.instanceColor) bloom.instanceColor.needsUpdate = true;
      this.engine.scene.add(bush, bloom);
    }

    /* Instanced grass tufts (no shadows — cheap density) */
    scatterGrass(count, radius, exclude = [], seed = 55) {
      count = Math.round(count * G.Settings.data.graphics.foliage);
      if (count <= 0) return;
      const blade = new THREE.ConeGeometry(0.12, 0.7, 3);
      blade.translate(0, 0.32, 0);
      const inst = new THREE.InstancedMesh(blade, M.std({ color: 0x6a7c3c, rough: 1, flat: true }), count);
      const rng = U.mulberry(seed);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler();
      let placed = 0, guard = 0;
      while (placed < count && guard++ < count * 20) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * radius;
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (exclude.some((e) => Math.hypot(x - e.x, z - e.z) < e.r)) continue;
        eu.set((rng() - 0.5) * 0.4, rng() * Math.PI, (rng() - 0.5) * 0.4);
        q.setFromEuler(eu);
        const s = 0.6 + rng() * 1.1;
        m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
        inst.setMatrixAt(placed++, m4);
      }
      inst.count = placed;
      inst.receiveShadow = true;
      this.engine.scene.add(inst);
    }

    scatterRocks(count, radius, exclude = [], seed = 31) {
      const geo = new THREE.IcosahedronGeometry(1, 0);
      const mat = M.std({ map: M.tex.rock([3, 3]), color: 0xffffff, rough: 0.97, bump: 0.08, flat: true });
      const inst = new THREE.InstancedMesh(geo, mat, count);
      const rng = U.mulberry(seed);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler();
      const col = new THREE.Color();
      let placed = 0, guard = 0;
      while (placed < count && guard++ < count * 20) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * radius;
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (exclude.some((e) => Math.hypot(x - e.x, z - e.z) < e.r)) continue;
        const mono = rng() < 0.06;   // occasional tilted standing stone
        eu.set(mono ? (rng() - 0.5) * 0.3 : rng() * Math.PI, rng() * Math.PI, mono ? (rng() - 0.5) * 0.3 : 0);
        q.setFromEuler(eu);
        const s = mono ? 1.2 + rng() * 1.6 : 0.3 + rng() * rng() * 1.4;
        m4.compose(new THREE.Vector3(x, s * (mono ? 0.8 : 0.2), z), q,
          new THREE.Vector3(s * (mono ? 0.5 : 1), s * (mono ? 2.0 : 0.7), s * (mono ? 0.4 : 1)));
        inst.setMatrixAt(placed, m4);
        // grey stone with an occasional mossy tint
        if (rng() < 0.35) col.setHSL(0.26, 0.25, 0.32 + rng() * 0.1);
        else col.setHSL(0.08, 0.06, 0.38 + rng() * 0.18);
        inst.setColorAt(placed, col);
        placed++;
      }
      inst.count = placed;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.castShadow = inst.receiveShadow = true;
      this.engine.scene.add(inst);
    }

    /* Reservoir (wewa): animated water disc + sandy rim */
    addWater(x, z, radius) {
      const rim = new THREE.Mesh(new THREE.RingGeometry(radius * 0.92, radius * 1.15, 40), M.std({ map: M.tex.sand([4, 4]), rough: 1 }));
      rim.rotation.x = -Math.PI / 2; rim.position.set(x, 0.025, z);
      rim.receiveShadow = true;
      this.engine.scene.add(rim);
      const geo = new THREE.CircleGeometry(radius, 40);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2e5d6b, roughness: 0.3, metalness: 0.35,
        transparent: true, opacity: 0.86,
      });
      const w = new THREE.Mesh(geo, mat);
      w.rotation.x = -Math.PI / 2;
      w.position.set(x, 0.06, z);
      this.engine.scene.add(w);
      this.updatables.push((dt, t) => {
        w.position.y = 0.06 + Math.sin(t * 0.9) * 0.02;
        mat.color.setHSL(0.53, 0.42, 0.28 + Math.sin(t * 0.6) * 0.02);
      });

      // lotus pads + pink blooms drifting near the banks
      const nPads = Math.min(26, Math.round(radius * 1.4 * G.Settings.data.graphics.foliage));
      if (nPads > 2) {
        const padGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.02, 8);
        const pads = new THREE.InstancedMesh(padGeo, M.std({ color: 0x3d6e35, rough: 0.6 }), nPads);
        const bloomGeo = new THREE.ConeGeometry(0.1, 0.16, 6);
        const blooms = new THREE.InstancedMesh(bloomGeo, M.std({ color: 0xe88ab0, rough: 0.7, flat: true }), nPads);
        const rng = U.mulberry(Math.round(x * 13 + z * 7) + 3);
        const m4 = new THREE.Matrix4();
        let bi = 0;
        for (let i = 0; i < nPads; i++) {
          const a = rng() * Math.PI * 2, rr = radius * (0.45 + rng() * 0.42);
          const px = x + Math.sin(a) * rr, pz = z + Math.cos(a) * rr;
          m4.makeTranslation(px, 0.085, pz);
          pads.setMatrixAt(i, m4);
          if (rng() < 0.4) { m4.makeTranslation(px, 0.16, pz); blooms.setMatrixAt(bi++, m4); }
        }
        blooms.count = bi;
        this.engine.scene.add(pads, blooms);
        this.updatables.push((dt, t) => {
          pads.position.y = Math.sin(t * 0.9) * 0.02;
          blooms.position.y = Math.sin(t * 0.9) * 0.02;
        });
      }
      return w;
    }

    /* Rice paddy: bunded green rectangles */
    addPaddy(x, z, w, d) {
      const grp = new THREE.Group();
      const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
        new THREE.MeshStandardMaterial({ color: 0x4a6e3a, roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0.9 }));
      water.rotation.x = -Math.PI / 2; water.position.y = 0.04;
      grp.add(water);
      const bundMat = M.std({ map: M.tex.dirt([2, 1]), rough: 1 });
      for (const [bx, bz, bw, bd] of [[0, d / 2, w + 0.4, 0.4], [0, -d / 2, w + 0.4, 0.4], [w / 2, 0, 0.4, d], [-w / 2, 0, 0.4, d]]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.25, bd), bundMat);
        b.position.set(bx, 0.12, bz); b.castShadow = b.receiveShadow = true;
        grp.add(b);
      }
      // rice shoots
      const shoot = new THREE.ConeGeometry(0.05, 0.5, 3); shoot.translate(0, 0.28, 0);
      const n = Math.round(w * d * 0.8 * G.Settings.data.graphics.foliage);
      if (n > 0) {
        const inst = new THREE.InstancedMesh(shoot, M.std({ color: 0x7ba04a, rough: 1, flat: true }), n);
        const m4 = new THREE.Matrix4();
        for (let i = 0; i < n; i++) {
          m4.makeTranslation(U.rand(-w / 2 + 0.4, w / 2 - 0.4), 0, U.rand(-d / 2 + 0.4, d / 2 - 0.4));
          inst.setMatrixAt(i, m4);
        }
        grp.add(inst);
      }
      grp.position.set(x, 0, z);
      this.engine.scene.add(grp);
    }

    update(dt, t) { for (const u of this.updatables) u(dt, t); }
  }
  G.Terrain = Terrain;

  /* ======================================================================
     G.Build — ancient-Ceylon architecture kit.
     Every builder adds meshes to engine.scene, registers cannon static
     bodies through engine.addStaticBox / addStaticCylinder, and returns
     the root group (plus extra handles where useful).
     ====================================================================== */
  const Build = {};
  G.Build = Build;

  /* --- Stupa / dagoba. completion: 0..1 controls construction state ---- */
  Build.stupa = function (engine, { pos = [0, 0], radius = 9, whitewashed = false, completion = 1, name = 'stupa' } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    const brickMat = whitewashed ? lib.whitewash : M.std({ map: M.tex.brick([10, 2]), rough: 0.92, bump: 0.06 });
    // three circular basal terraces (pesa walalu)
    let y = 0;
    for (const [r, h] of [[radius * 1.35, 0.7], [radius * 1.22, 0.7], [radius * 1.1, 0.7]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.03, h, 40), brickMat);
      t.position.y = y + h / 2;
      t.castShadow = t.receiveShadow = true;
      grp.add(t);
      y += h;
    }
    const baseY = y;
    // hemispherical dome (anda) — construction squashes it down
    const domeH = U.clamp(completion, 0.12, 1);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 40, 22, 0, Math.PI * 2, 0, Math.PI / 2), brickMat);
    dome.scale.y = domeH;
    dome.position.y = baseY;
    dome.castShadow = dome.receiveShadow = true;
    grp.add(dome);
    if (completion >= 0.99) {
      // harmika (square railing) + spire (kotha) + gold pinnacle
      const har = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.42, radius * 0.16, radius * 0.42), brickMat);
      har.position.y = baseY + radius + radius * 0.07;
      har.castShadow = true;
      grp.add(har);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.16, radius * 0.85, 12), whitewashed ? lib.whitewash : lib.plaster);
      spire.position.y = baseY + radius + radius * 0.55;
      spire.castShadow = true;
      grp.add(spire);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.05, 8, 8), lib.gold);
      tip.position.y = baseY + radius + radius * 1.0;
      grp.add(tip);
    }
    // vahalkada (frontispieces) at cardinal points
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const v = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.5, 2.2, 1.2), lib.brick);
      v.position.set(Math.sin(a) * radius * 1.32, 1.1, Math.cos(a) * radius * 1.32);
      v.rotation.y = a;
      v.castShadow = v.receiveShadow = true;
      grp.add(v);
    }
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    engine.addStaticCylinder([pos[0], 2.5, pos[1]], radius * 1.35, 5);
    engine.occluders.push(dome);
    return { group: grp, dome, name };
  };

  /* --- moonstone (sandakada pahana) — semicircular carved doorstep --- */
  Build.moonstone = function (engine, { pos = [0, 0], yaw = 0, r = 1.4 } = {}) {
    const tex = M.canvasTex('moonstone', 256, (c, s) => {
      const cx = s / 2, cy = s;               // semicircle centered on bottom edge
      const bands = ['#8d8578', '#7b7264', '#96897a', '#6e665b', '#a2957f', '#7b7264'];
      for (let i = bands.length - 1; i >= 0; i--) {
        c.fillStyle = bands[i];
        c.beginPath();
        c.arc(cx, cy, (s / 2) * ((i + 1) / bands.length), Math.PI, 0);
        c.fill();
      }
      // carved ring motifs: petals + procession dots (abstracted animals)
      c.strokeStyle = '#4f483d'; c.lineWidth = 2;
      for (let ring = 1; ring <= 4; ring++) {
        const rr = (s / 2) * (ring / 5);
        const n = 10 + ring * 6;
        for (let k = 0; k <= n; k++) {
          const a = Math.PI + (k / n) * Math.PI;
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
          c.beginPath();
          if (ring % 2) { c.arc(x, y, 3, 0, Math.PI * 2); c.stroke(); }
          else { c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); c.stroke(); }
        }
      }
    });
    const geo = new THREE.CircleGeometry(r, 28, 0, Math.PI);
    const ms = new THREE.Mesh(geo, M.std({ map: tex, rough: 0.9, bump: 0.05 }));
    ms.rotation.x = -Math.PI / 2;
    ms.rotation.z = yaw;
    ms.position.set(pos[0], 0.03, pos[1]);
    ms.receiveShadow = true;
    engine.scene.add(ms);
    return ms;
  };

  /* --- guard stone (muragala) pair --- */
  Build.guardStones = function (engine, { pos = [0, 0], yaw = 0, gap = 2.2 } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    for (const side of [-1, 1]) {
      const st = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.5, 0.22), lib.stone);
      slab.position.y = 0.75;
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 0.22, 16, 1, false, 0, Math.PI), lib.stone);
      arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI / 2;
      arch.position.y = 1.5;
      const figure = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.7, 3, 6), lib.graniteDark);
      figure.position.set(0, 0.85, 0.09);
      slab.castShadow = arch.castShadow = true;
      st.add(slab, arch, figure);
      st.position.x = side * gap / 2;
      grp.add(st);
    }
    grp.rotation.y = yaw;
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    return grp;
  };

  /* --- pillared audience hall --- */
  Build.pillarHall = function (engine, { pos = [0, 0], yaw = 0, w = 12, d = 16, open = true } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    const plat = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.8, d + 2), lib.stone);
    plat.position.y = 0.4;
    plat.castShadow = plat.receiveShadow = true;
    grp.add(plat);
    const cols = Math.round(w / 3), rows = Math.round(d / 3);
    const pillarGeo = new THREE.CylinderGeometry(0.24, 0.28, 3.4, 8);
    const pillars = new THREE.InstancedMesh(pillarGeo, lib.woodDark, cols * rows);
    const m4 = new THREE.Matrix4();
    let pi = 0;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const px = -w / 2 + (i + 0.5) * (w / cols), pz = -d / 2 + (j + 0.5) * (d / rows);
        if (open && i > 0 && i < cols - 1 && j > 0 && j < rows - 1) continue; // hollow center
        m4.makeTranslation(px, 0.8 + 1.7, pz);
        pillars.setMatrixAt(pi++, m4);
      }
    pillars.count = pi;
    pillars.castShadow = true;
    grp.add(pillars);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 3, 0.5, d + 3), lib.woodDark);
    roof.position.y = 0.8 + 3.4 + 0.25;
    roof.castShadow = true;
    grp.add(roof);
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.62, 2.2, 4), M.std({ map: M.tex.thatch([4, 2]), rough: 1 }));
    ridge.rotation.y = Math.PI / 4;
    ridge.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    ridge.position.y = 0.8 + 3.4 + 1.4;
    ridge.castShadow = true;
    grp.add(ridge);
    grp.rotation.y = yaw;
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    engine.addStaticBox([pos[0], 0.4, pos[1]], [(w + 2) / 2, 0.4, (d + 2) / 2], yaw);
    engine.occluders.push(roof);
    return grp;
  };

  /* --- village hut: clay cylinder + conical thatch roof --- */
  Build.hut = function (engine, { pos = [0, 0], r = 2.2, yaw = 0 } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, 2.3, 12, 1, true, Math.PI * 0.12, Math.PI * 1.76), lib.plaster);
    wall.material = M.std({ map: M.tex.plaster([3, 1]), rough: 0.95, side: THREE.DoubleSide });
    wall.position.y = 1.15;
    wall.castShadow = wall.receiveShadow = true;
    grp.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.45, 1.9, 12), M.std({ map: M.tex.thatch([6, 1]), rough: 1 }));
    roof.position.y = 2.3 + 0.95;
    roof.castShadow = true;
    grp.add(roof);
    grp.rotation.y = yaw;
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    engine.addStaticCylinder([pos[0], 1.15, pos[1]], r, 2.3);
    engine.occluders.push(wall);
    return grp;
  };

  /* --- rampart wall segment --- */
  Build.wall = function (engine, { from = [0, 0], to = [10, 0], h = 4, thick = 1.4, mat = null } = {}) {
    const lib = M.library();
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const cx = (from[0] + to[0]) / 2, cz = (from[1] + to[1]) / 2;
    const yaw = Math.atan2(to[0] - from[0], to[1] - from[1]);
    const grp = new THREE.Group();
    const wallMat = mat || M.std({ map: M.tex.brick([len / 3, h / 2.5]), rough: 0.92, bump: 0.06 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(thick, h, len), wallMat);
    body.position.y = h / 2;
    body.castShadow = body.receiveShadow = true;
    grp.add(body);
    // crenellations
    const nc = Math.floor(len / 2);
    const cren = new THREE.InstancedMesh(new THREE.BoxGeometry(thick, 0.7, 0.9), wallMat, nc);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < nc; i++) {
      m4.makeTranslation(0, h + 0.35, -len / 2 + 1 + i * 2);
      cren.setMatrixAt(i, m4);
    }
    cren.castShadow = true;
    grp.add(cren);
    grp.rotation.y = yaw;
    grp.position.set(cx, 0, cz);
    engine.scene.add(grp);
    engine.addStaticBox([cx, h / 2, cz], [thick / 2, h / 2, len / 2], yaw);
    engine.occluders.push(body);
    return grp;
  };

  /* --- gatehouse: two towers + lintel + breakable wooden gate --- */
  Build.gatehouse = function (engine, { pos = [0, 0], yaw = 0, hp = 300 } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    const brick = M.std({ map: M.tex.brick([3, 5]), rough: 0.92, bump: 0.06 });
    for (const side of [-1, 1]) {
      const tw = new THREE.Mesh(new THREE.BoxGeometry(3, 8.5, 3), brick);
      tw.position.set(side * 4, 4.25, 0);
      tw.castShadow = tw.receiveShadow = true;
      grp.add(tw);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.8, 4), lib.woodDark);
      cap.rotation.y = Math.PI / 4;
      cap.position.set(side * 4, 9.4, 0);
      cap.castShadow = true;
      grp.add(cap);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(11, 2, 2.6), brick);
    lintel.position.y = 7.4;
    lintel.castShadow = true;
    grp.add(lintel);
    // the wooden doors (destructible)
    const doorMat = M.std({ map: M.tex.woodDark([1, 2]), rough: 0.85, bump: 0.05 });
    const doors = new THREE.Group();
    for (const side of [-1, 1]) {
      const dr = new THREE.Mesh(new THREE.BoxGeometry(2.6, 6.4, 0.4), doorMat);
      dr.position.set(side * 1.32, 3.2, 0);
      dr.castShadow = true;
      doors.add(dr);
    }
    grp.add(doors);
    grp.rotation.y = yaw;
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const tp = (lx, lz) => [pos[0] + lx * cy + lz * sy, pos[1] - lx * sy + lz * cy];
    for (const side of [-1, 1]) {
      const [tx, tz] = tp(side * 4, 0);
      engine.addStaticBox([tx, 4.25, tz], [1.5, 4.25, 1.5], yaw);
    }
    const [dx, dz] = tp(0, 0);
    const doorBody = engine.addStaticBox([dx, 3.2, dz], [2.7, 3.2, 0.25], yaw);
    engine.occluders.push(grp.children[0]);
    const gate = {
      group: grp, doors, hp, maxHp: hp, broken: false,
      takeDamage(amount) {
        if (this.broken) return;
        this.hp -= amount;
        G.audio.arrowHit('wood');
        doors.rotation.x = (Math.random() - 0.5) * 0.03; // shudder
        if (this.hp <= 0) this.break_();
      },
      break_() {
        this.broken = true;
        doors.children.forEach((d, i) => {
          d.rotation.y = (i ? 1 : -1) * 1.9;
          d.position.z -= 0.8;
          d.rotation.x = 0.12;
        });
        engine.removeBody(doorBody);
        G.audio.enemyDie(); G.audio.arrowHit('wood');
        engine.events.emit('gateBroken', this);
      },
    };
    return gate;
  };

  /* --- wooden watchtower with a top platform for archers --- */
  Build.tower = function (engine, { pos = [0, 0], h = 6 } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, h, 6), lib.woodDark);
      leg.position.set(lx * 1.1, h / 2, lz * 1.1);
      leg.rotation.z = -lx * 0.06; leg.rotation.x = lz * 0.06;
      leg.castShadow = true;
      grp.add(leg);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3), lib.wood);
    deck.position.y = h;
    deck.castShadow = deck.receiveShadow = true;
    grp.add(deck);
    for (let i = 0; i < 4; i++) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3, 0.55, 0.12), lib.wood);
      rail.position.y = h + 0.55;
      rail.rotation.y = (i * Math.PI) / 2;
      rail.position.x = Math.sin((i * Math.PI) / 2 + Math.PI / 2) * 1.44;
      rail.position.z = Math.cos((i * Math.PI) / 2 + Math.PI / 2) * 1.44;
      grp.add(rail);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.4, 4), M.std({ map: M.tex.thatch([3, 1]), rough: 1 }));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + 2.4;
    roof.castShadow = true;
    grp.add(roof);
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    engine.addStaticBox([pos[0], h / 2, pos[1]], [1.3, h / 2, 1.3]);
    return { group: grp, deckY: h + 0.15 };
  };

  /* --- construction scaffolding ring (for the rising Ruwanwelisaya) --- */
  Build.scaffold = function (engine, { pos = [0, 0], radius = 12, h = 8, segments = 10 } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, h, 5);
    const poles = new THREE.InstancedMesh(poleGeo, lib.wood, segments * 2);
    const barGeo = new THREE.BoxGeometry(0.1, 0.1, 1);
    const bars = new THREE.InstancedMesh(barGeo, lib.woodDark, segments * 4);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler();
    let pi = 0, bi = 0;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      for (const rr of [radius, radius + 1.1]) {
        m4.makeTranslation(Math.sin(a) * rr, h / 2, Math.cos(a) * rr);
        poles.setMatrixAt(pi++, m4);
      }
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      for (const lvl of [0.35, 0.7]) {
        const x1 = Math.sin(a) * radius, z1 = Math.cos(a) * radius;
        const x2 = Math.sin(a2) * radius, z2 = Math.cos(a2) * radius;
        const len = Math.hypot(x2 - x1, z2 - z1);
        eu.set(0, Math.atan2(x2 - x1, z2 - z1), 0); q.setFromEuler(eu);
        m4.compose(new THREE.Vector3((x1 + x2) / 2, h * lvl, (z1 + z2) / 2), q, new THREE.Vector3(1, 1, len));
        bars.setMatrixAt(bi++, m4);
      }
    }
    poles.castShadow = bars.castShadow = true;
    grp.add(poles, bars);
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    return grp;
  };

  /* --- destructible cover barricade --- */
  Build.barricade = function (engine, { pos = [0, 0], yaw = 0, hp = 60 } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.7, 0.09), lib.wood);
      pl.position.set(-0.7 + i * 0.35, 0.85, 0);
      pl.rotation.z = (Math.random() - 0.5) * 0.12;
      pl.castShadow = true;
      grp.add(pl);
    }
    const brace = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.1), lib.woodDark);
    brace.position.set(0, 1.0, 0.08);
    brace.rotation.z = 0.1;
    grp.add(brace);
    grp.rotation.y = yaw;
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    const body = engine.addStaticBox([pos[0], 0.85, pos[1]], [0.95, 0.85, 0.15], yaw);
    const cover = {
      group: grp, hp, broken: false, pos: new THREE.Vector3(pos[0], 0.8, pos[1]),
      takeDamage(amount) {
        if (this.broken) return;
        this.hp -= amount;
        grp.rotation.z = (Math.random() - 0.5) * 0.05;
        G.audio.arrowHit('wood');
        if (this.hp <= 0) {
          this.broken = true;
          grp.children.forEach((c) => {
            c.rotation.z = U.rand(-1.4, 1.4);
            c.rotation.x = U.rand(-0.4, 0.4);
            c.position.y = 0.12;
            c.position.x += U.rand(-0.6, 0.6);
            c.position.z += U.rand(-0.5, 0.5);
          });
          engine.removeBody(body);
          G.audio.enemyDie();
        }
      },
    };
    engine.destructibles.push(cover);
    return cover;
  };

  /* --- straw training dummy --- */
  Build.dummy = function (engine, { pos = [0, 0] } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.1, 6), lib.woodDark);
    pole.position.y = 1.05;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 3, 8), M.std({ map: M.tex.thatch([2, 2]), rough: 1 }));
    torso.position.y = 1.35;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), M.std({ map: M.tex.thatch([2, 2]), rough: 1 }));
    head.position.y = 2.05;
    pole.castShadow = torso.castShadow = head.castShadow = true;
    grp.add(pole, torso, head);
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    engine.addStaticCylinder([pos[0], 1, pos[1]], 0.35, 2);
    const dummy = {
      group: grp, hits: 0, alive: true, isDummy: true,
      pos: new THREE.Vector3(pos[0], 1.2, pos[1]), radius: 0.55,
      takeDamage() {
        this.hits++;
        grp.rotation.x = 0.22; grp.rotation.z = U.rand(-0.15, 0.15);
        setTimeout(() => { grp.rotation.x = 0; grp.rotation.z = 0; }, 240);
        G.audio.arrowHit('wood');
        engine.events.emit('dummyHit', this);
      },
    };
    engine.targets.push(dummy);
    return dummy;
  };

  /* --- archery target --- */
  Build.archeryTarget = function (engine, { pos = [0, 0], yaw = 0 } = {}) {
    const grp = new THREE.Group();
    const tex = M.canvasTex('archTarget', 128, (c, s) => {
      const rings = ['#d8ceb4', '#a5291f', '#d8ceb4', '#a5291f', '#e8d9b5'];
      rings.forEach((col, i) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc(s / 2, s / 2, (s / 2) * (1 - i / rings.length), 0, Math.PI * 2);
        c.fill();
      });
    });
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 20), M.std({ map: M.tex.thatch([2, 1]), rough: 1 }));
    face.rotation.x = Math.PI / 2;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), M.std({ map: tex, rough: 0.9 }));
    disc.position.z = 0.1;
    const legA = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 5), M.library().woodDark);
    legA.position.set(-0.3, -0.75, -0.12); legA.rotation.z = 0.2;
    const legB = legA.clone(); legB.position.x = 0.3; legB.rotation.z = -0.2;
    face.castShadow = true;
    grp.add(face, disc, legA, legB);
    grp.position.set(pos[0], 1.35, pos[1]);
    grp.rotation.y = yaw;
    engine.scene.add(grp);
    const target = {
      group: grp, hits: 0, alive: true, isDummy: true,
      pos: new THREE.Vector3(pos[0], 1.35, pos[1]), radius: 0.6,
      takeDamage(_a, info = {}) {
        if (info.type !== 'arrow') return;
        this.hits++;
        G.audio.arrowHit('wood');
        engine.events.emit('targetHit', this);
      },
    };
    engine.targets.push(target);
    engine.addStaticBox([pos[0], 1.2, pos[1]], [0.55, 0.7, 0.12], yaw);
    return target;
  };

  /* --- brazier / torch with flickering flame --- */
  Build.brazier = function (engine, { pos = [0, 0], light = false, terrain = null } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.2, 0.3, 10), lib.bronze);
    bowl.position.y = 1.06;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1, 6), lib.iron);
    stem.position.y = 0.5;
    bowl.castShadow = stem.castShadow = true;
    grp.add(bowl, stem);
    const flameMat = new THREE.SpriteMaterial({
      map: M.canvasTex('flame', 64, (c, s) => {
        const g2 = c.createRadialGradient(s / 2, s * 0.62, 2, s / 2, s * 0.55, s * 0.45);
        g2.addColorStop(0, 'rgba(255,240,180,1)');
        g2.addColorStop(0.4, 'rgba(255,150,40,0.85)');
        g2.addColorStop(1, 'rgba(200,40,0,0)');
        c.fillStyle = g2; c.fillRect(0, 0, s, s);
      }),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    const flame = new THREE.Sprite(flameMat);
    flame.scale.set(0.55, 0.8, 1);
    flame.position.y = 1.42;
    grp.add(flame);
    if (light) {
      const pl = new THREE.PointLight(0xff9440, 6, 9, 2);
      pl.position.y = 1.5;
      grp.add(pl);
      grp.userData.light = pl;
    }
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    const anim = (dt, t) => {
      flame.scale.y = 0.8 + Math.sin(t * 11 + pos[0]) * 0.12;
      flame.material.opacity = 0.85 + Math.sin(t * 17 + pos[1]) * 0.1;
      if (grp.userData.light) grp.userData.light.intensity = 5.4 + Math.sin(t * 13 + pos[0] * 3) * 1.2;
    };
    (terrain || engine.terrain)?.updatables.push(anim);
    return grp;
  };

  /* --- royal banner / lion standard --- */
  Build.banner = function (engine, { pos = [0, 0], yaw = 0, color = 0xc8a12e, terrain = null } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.2, 6), lib.woodDark);
    pole.position.y = 2.1;
    pole.castShadow = true;
    grp.add(pole);
    const clothGeo = new THREE.PlaneGeometry(1.15, 1.9, 6, 6);
    const cloth = new THREE.Mesh(clothGeo, M.std({ map: M.canvasTex('banner' + color, 128, (c, s) => {
      c.fillStyle = '#' + color.toString(16).padStart(6, '0');
      c.fillRect(0, 0, s, s);
      c.fillStyle = 'rgba(60,20,5,0.85)';
      // stylized lion silhouette (Sinhala royal standard motif)
      c.beginPath();
      c.ellipse(s * 0.5, s * 0.55, s * 0.2, s * 0.13, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(s * 0.68, s * 0.42, s * 0.1, 0, Math.PI * 2);
      c.fill();
      c.fillRect(s * 0.34, s * 0.62, s * 0.06, s * 0.16);
      c.fillRect(s * 0.6, s * 0.62, s * 0.06, s * 0.16);
    }), rough: 0.9, side: THREE.DoubleSide }));
    cloth.position.set(0.6, 3.2, 0);
    grp.add(cloth);
    grp.rotation.y = yaw;
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    const base = clothGeo.attributes.position.array.slice();
    (terrain || engine.terrain)?.updatables.push((dt, t) => {
      const p = clothGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        p.array[i * 3 + 2] = Math.sin(t * 2.4 + x * 3 + pos[0]) * 0.12 * (x + 0.58);
      }
      p.needsUpdate = true;
    });
    return grp;
  };

  /* --- war elephant (Kandula, stable elephants, rideable mounts) ---
     mobile:true skips the static physics block (the mount manages its own) */
  Build.elephant = function (engine, { pos = [0, 0], yaw = 0, armored = false, scale = 1, mobile = false } = {}) {
    const grp = new THREE.Group();
    const hide = M.std({ color: 0x6f6a66, rough: 0.9 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), hide);
    body.scale.set(1.35, 1.05, 1);
    body.position.y = 2.1;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), hide);
    head.position.set(0, 2.6, 1.65);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CircleGeometry(0.6, 10), M.std({ color: 0x635e5a, rough: 0.95, side: THREE.DoubleSide }));
      ear.position.set(s * 0.8, 2.75, 1.5);
      ear.rotation.y = s * 0.5;
      grp.add(ear);
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9, 6), M.std({ color: 0xe8dfc8, rough: 0.4 }));
      tusk.position.set(s * 0.34, 2.05, 2.25);
      tusk.rotation.x = 1.9;
      grp.add(tusk);
    }
    // trunk: curved segment stack
    let ty = 2.3, tz = 2.35, tr = 0.19;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr * 0.85, 0.42, 8), hide);
      seg.position.set(0, ty, tz);
      seg.rotation.x = 0.5 + i * 0.28;
      grp.add(seg);
      ty -= 0.36; tz += 0.12 - i * 0.03; tr *= 0.85;
    }
    for (const [lx, lz] of [[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.9], [0.8, -0.9]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.7, 8), hide);
      leg.position.set(lx, 0.85, lz);
      grp.add(leg);
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 1.1, 5), hide);
    tail.position.set(0, 2.2, -1.55);
    tail.rotation.x = 0.4;
    grp.add(tail);
    grp.add(body, head);
    if (armored) {
      const caparison = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 2.6),
        M.std({ map: M.canvasTex('elephcloth', 128, M.clothPainter('#8c2f24')), rough: 0.85 }));
      caparison.position.y = 3.15;
      grp.add(caparison);
      const headplate = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.library().bronze);
      headplate.position.set(0, 2.75, 1.6);
      headplate.rotation.x = -0.6;
      grp.add(headplate);
      const howdah = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 1.5), M.library().woodDark);
      howdah.position.y = 3.6;
      grp.add(howdah);
    }
    grp.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    grp.scale.setScalar(scale);
    grp.rotation.y = yaw;
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    if (!mobile) engine.addStaticBox([pos[0], 1.5 * scale, pos[1]], [1.6 * scale, 1.5 * scale, 2 * scale], yaw);
    return grp;
  };

  /* --- Sigiriya fresco panel (respectful abstract apsara silhouettes) --- */
  Build.fresco = function (engine, { pos = [0, 0, 0], yaw = 0, seed = 5 } = {}) {
    const tex = M.canvasTex('fresco' + seed, 256, (c, s) => {
      const g2 = c.createLinearGradient(0, 0, 0, s);
      g2.addColorStop(0, '#c78d4e'); g2.addColorStop(1, '#a3652f');
      c.fillStyle = g2; c.fillRect(0, 0, s, s);
      const rng = U.mulberry(seed * 883);
      for (let i = 0; i < 3; i++) {
        const x = s * (0.2 + i * 0.3), y = s * 0.5;
        c.fillStyle = ['#e8b04e', '#d89540', '#efc069'][i % 3];
        c.beginPath(); c.ellipse(x, y, s * 0.07, s * 0.16, 0, 0, Math.PI * 2); c.fill(); // torso
        c.fillStyle = '#8a4a26';
        c.beginPath(); c.arc(x, y - s * 0.2, s * 0.05, 0, Math.PI * 2); c.fill();        // head
        c.strokeStyle = '#e8b04e'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(x - s * 0.06, y - s * 0.06);
        c.quadraticCurveTo(x - s * 0.16, y - s * 0.14 - rng() * 20, x - s * 0.2, y - s * 0.02);
        c.stroke();                                                                       // raised arm
        c.strokeStyle = '#7c3a1e'; c.lineWidth = 3;
        c.beginPath(); c.arc(x, y - s * 0.28, s * 0.07, Math.PI, 0); c.stroke();          // headdress
      }
      // weathering
      for (let i = 0; i < 500; i++) {
        c.fillStyle = 'rgba(120,70,30,0.12)';
        c.fillRect(rng() * s, rng() * s, rng() * 5, rng() * 5);
      }
    });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), M.std({ map: tex, rough: 0.9 }));
    panel.position.set(pos[0], pos[1], pos[2]);
    panel.rotation.y = yaw;
    engine.scene.add(panel);
    return panel;
  };

  /* --- Sigiriya lion-paw gateway --- */
  Build.lionPaws = function (engine, { pos = [0, 0], yaw = 0, y = 0 } = {}) {
    const mat = M.std({ map: M.tex.brick([2, 2]), color: 0xc9a26a, rough: 0.95, bump: 0.06 });
    const grp = new THREE.Group();
    for (const side of [-1, 1]) {
      const paw = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 3.4), mat);
      base.position.y = 1.2;
      paw.add(base);
      for (let t = 0; t < 4; t++) {
        const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 1.6, 8), mat);
        toe.position.set(-0.95 + t * 0.63, 0.8, 1.85);
        paw.add(toe);
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 6), M.std({ color: 0xd8cbb0, rough: 0.6 }));
        claw.position.set(-0.95 + t * 0.63, 0.3, 2.75);
        claw.rotation.x = 1.35;
        paw.add(claw);
      }
      paw.position.x = side * 3.2;
      paw.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      grp.add(paw);
    }
    grp.rotation.y = yaw;
    grp.position.set(pos[0], y, pos[1]);
    engine.scene.add(grp);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    for (const side of [-1, 1]) {
      const lx = side * 3.2;
      engine.addStaticBox([pos[0] + lx * cy, y + 1.2, pos[1] - lx * sy], [1.3, 1.2, 1.7], yaw);
    }
    return grp;
  };

  /* --- simple stone throne (Sigiriya summit) --- */
  Build.throne = function (engine, { pos = [0, 0], yaw = 0, y = 0 } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.6), lib.graniteDark);
    seat.position.y = 0.35;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 0.35), lib.graniteDark);
    back.position.set(0, 1.05, -0.62);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 1.4), lib.graniteDark);
      arm.position.set(s * 1.03, 0.95, 0);
      grp.add(arm);
    }
    seat.castShadow = back.castShadow = true;
    grp.add(seat, back);
    grp.rotation.y = yaw;
    grp.position.set(pos[0], y, pos[1]);
    engine.scene.add(grp);
    return grp;
  };

  /* --- beached war-canoe / landing boat (v0.6 Chronicles) --- */
  Build.boat = function (engine, { pos = [0, 0], yaw = 0, sail = true } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.55, 7.2, 8, 1), lib.woodDark);
    hull.rotation.z = Math.PI / 2;
    hull.scale.y = 0.6;
    hull.position.y = 0.55;
    grp.add(hull);
    for (const s of [-1, 1]) {
      const prowG = new THREE.ConeGeometry(0.5, 1.6, 8);
      prowG.rotateZ(s * Math.PI / 2);
      const prow = new THREE.Mesh(prowG, lib.woodDark);
      prow.scale.y = 0.6;
      prow.position.set(s * 4.2, 0.75, 0);
      grp.add(prow);
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.1, 1.0), lib.wood);
    deck.position.y = 0.95;
    grp.add(deck);
    if (sail) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 6), lib.woodDark);
      mast.position.y = 3.2;
      grp.add(mast);
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 5), lib.woodDark);
      yard.rotation.z = Math.PI / 2;
      yard.position.y = 5.1;
      grp.add(yard);
      const furled = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.0, 6),
        M.std({ map: M.canvasTex('sailcloth', 64, M.clothPainter('#cfc2a2')), rough: 0.95 }));
      furled.rotation.z = Math.PI / 2;
      furled.position.y = 4.85;
      grp.add(furled);
    }
    grp.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    grp.rotation.y = yaw;
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    engine.addStaticBox([pos[0], 0.8, pos[1]], [3.6, 0.8, 0.9], yaw);
    return grp;
  };

  /* --- burnable supply store (sacks + crates under thatch) --- */
  Build.supplyStore = function (engine, { pos = [0, 0], yaw = 0, hp = 80, onDestroyed = null } = {}) {
    const lib = M.library();
    const grp = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.34, 7, 6),
        M.std({ map: M.tex.thatch([1, 1]), color: 0xcbb689, rough: 1 }));
      sack.scale.y = 0.75;
      sack.position.set(U.rand(-0.5, 0.5), 0.26 + (i > 2 ? 0.45 : 0), U.rand(-0.4, 0.4));
      grp.add(sack);
    }
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), lib.wood);
    crate.position.set(0.7, 0.4, -0.3);
    grp.add(crate);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.9, 6), M.std({ map: M.tex.thatch([3, 1]), rough: 1 }));
    roof.position.y = 1.7;
    grp.add(roof);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const poleM = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.4, 5), lib.woodDark);
      poleM.position.set(Math.sin(a) * 1.0, 0.7, Math.cos(a) * 1.0);
      grp.add(poleM);
    }
    grp.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    grp.rotation.y = yaw;
    grp.position.set(pos[0], 0, pos[1]);
    engine.scene.add(grp);
    const body = engine.addStaticBox([pos[0], 0.6, pos[1]], [1.0, 0.6, 1.0], yaw);
    const store = {
      group: grp, hp, maxHp: hp, alive: true, broken: false,
      pos: new THREE.Vector3(pos[0], 0.8, pos[1]), radius: 1.5,
      takeDamage(amount) {
        if (this.broken) return;
        this.hp -= amount;
        grp.rotation.z = (Math.random() - 0.5) * 0.04;
        G.audio.arrowHit('wood');
        if (this.hp <= 0) {
          this.broken = true; this.alive = false;
          grp.traverse((c) => {
            if (c.isMesh) {
              c.material = M.std({ color: 0x241c14, rough: 1 });
              c.position.y *= 0.4;
              c.rotation.x += U.rand(-0.4, 0.4);
            }
          });
          engine.removeBody(body);
          G.audio.enemyDie(); G.audio.arrowHit('wood');
          if (onDestroyed) onDestroyed(this);
        }
      },
    };
    engine.attackables.push(store);
    return store;
  };

  /* --- crates / urns clutter --- */
  Build.crate = function (engine, { pos = [0, 0], s = 1, yaw = 0 } = {}) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), M.library().wood);
    c.position.set(pos[0], s / 2, pos[1]);
    c.rotation.y = yaw;
    c.castShadow = c.receiveShadow = true;
    engine.scene.add(c);
    engine.addStaticBox([pos[0], s / 2, pos[1]], [s / 2, s / 2, s / 2], yaw);
    return c;
  };
  Build.urn = function (engine, { pos = [0, 0], s = 1 } = {}) {
    const geo = new THREE.CylinderGeometry(0.28 * s, 0.2 * s, 0.7 * s, 10);
    const urn = new THREE.Mesh(geo, M.std({ map: M.tex.dirt([1, 1]), color: 0xb98858, rough: 0.9 }));
    urn.position.set(pos[0], 0.35 * s, pos[1]);
    urn.castShadow = true;
    engine.scene.add(urn);
    return urn;
  };

  /* --- stone stair ramp (physics = thin rotated box) --- */
  Build.stairs = function (engine, { from = [0, 0, 0], to = [0, 2, 4], width = 2.4, mat = null } = {}) {
    const lib = M.library();
    const material = mat || lib.stone;
    const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
    const runLen = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const steps = Math.max(3, Math.round(dy / 0.24));
    const grp = new THREE.Group();
    for (let i = 0; i < steps; i++) {
      const f = (i + 0.5) / steps;
      const st = new THREE.Mesh(new THREE.BoxGeometry(width, dy / steps, (runLen / steps) * 1.35), material);
      st.position.set(0, dy * f, runLen * f);
      st.castShadow = st.receiveShadow = true;
      grp.add(st);
    }
    grp.rotation.y = yaw;
    grp.position.set(from[0], from[1], from[2]);
    engine.scene.add(grp);
    // physics: one inclined box
    const slopeLen = Math.hypot(runLen, dy);
    const pitch = Math.atan2(dy, runLen);
    const mid = [from[0] + dx / 2, from[1] + dy / 2, from[2] + dz / 2];
    engine.addStaticBoxQuat(mid, [width / 2, 0.12, slopeLen / 2 + 0.3], yaw, -pitch);
    return grp;
  };
  G.Terrain = Terrain;
})();
