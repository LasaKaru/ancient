/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — entities/player.js
   First-person body: the always-visible arms + weapon models parented to the
   camera, with the full player-side animation state machine — idle sway and
   walk bob, three distinct sword combo swings, block raise, bow draw → hold →
   release (with sway that settles once fully drawn), weapon switching, and a
   small hit-flinch. The cosmetic armour colour chosen at New Game tints the
   bracers.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { THREE } = window.__MODULES__;
  const U = G.util, M = G.Mats;

  class PlayerRig {
    constructor(engine, { armorColor = 0x7a2f22 } = {}) {
      this.engine = engine;
      this.camera = engine.camera;
      this.group = new THREE.Group();
      this.camera.add(this.group);        // camera must be in the scene graph

      const skin = M.std({ color: 0x9c6b4a, rough: 0.7 });
      const bracer = M.std({ color: armorColor, rough: 0.55, metal: 0.35 });
      const bronze = M.std({ color: 0xa9793a, rough: 0.35, metal: 0.85 });
      const steel = M.std({ color: 0xc0c4ca, rough: 0.22, metal: 1 });
      const wood = M.std({ color: 0x6e4a26, rough: 0.8 });
      const grip = M.std({ color: 0x40260f, rough: 0.85 });

      /* ------------------------- sword arm ------------------------- */
      this.swordArm = new THREE.Group();
      {
        const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.34, 8), skin);
        fore.rotation.x = Math.PI / 2 - 0.3;
        fore.position.set(0, -0.1, 0.13);
        const brc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.16, 8), bracer);
        brc.rotation.x = Math.PI / 2 - 0.3;
        brc.position.set(0, -0.13, 0.2);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), skin);
        hand.position.set(0, -0.02, 0.02);
        const sword = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.014, 0.72), steel);
        blade.position.z = -0.42;
        const tipG = new THREE.ConeGeometry(0.02, 0.09, 4);
        tipG.rotateX(-Math.PI / 2);
        const tip = new THREE.Mesh(tipG, steel);
        tip.position.z = -0.82;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), bronze);
        guard.position.z = -0.05;
        const gripM = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.023, 0.13, 6), grip);
        gripM.rotation.x = Math.PI / 2;
        gripM.position.z = 0.04;
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), bronze);
        pommel.position.z = 0.12;
        sword.add(blade, tip, guard, gripM, pommel);
        sword.position.set(0, 0, 0);
        this.sword = sword;
        this.swordArm.add(fore, brc, hand, sword);
      }
      this.group.add(this.swordArm);

      /* -------------------------- bow arms -------------------------- */
      this.bowArms = new THREE.Group();
      {
        // left arm holds the bow forward
        const foreL = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.052, 0.4, 8), skin);
        foreL.rotation.x = Math.PI / 2;
        foreL.position.set(0, 0, 0.2);
        const brcL = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.06, 0.14, 8), bracer);
        brcL.rotation.x = Math.PI / 2;
        brcL.position.set(0, 0, 0.32);
        const handL = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), skin);
        handL.position.set(0, 0, -0.02);
        const bow = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.014, 5, 10, Math.PI * 0.42), wood);
        upper.rotation.z = Math.PI / 2 - Math.PI * 0.21;
        const lower = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.014, 5, 10, Math.PI * 0.42), wood);
        lower.rotation.z = Math.PI + Math.PI * 0.21 - Math.PI / 2;
        lower.rotation.y = Math.PI;
        const gripB = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), grip);
        bow.add(upper, lower, gripB);
        this.stringGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0.4, 0.1), new THREE.Vector3(0, 0, 0.1), new THREE.Vector3(0, -0.4, 0.1)]);
        this.string = new THREE.Line(this.stringGeo, new THREE.LineBasicMaterial({ color: 0xd8d2bd }));
        bow.add(this.string);
        bow.rotation.y = -Math.PI / 2;
        this.bowGroup = bow;
        this.bowRoot = new THREE.Group();
        this.bowRoot.add(bow);
        this.bowRoot.add(foreL, brcL, handL);
        this.bowArms.add(this.bowRoot);

        // nocked arrow + right (draw) hand
        this.nockedArrow = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.7, 5), M.std({ color: 0xa8813f, rough: 0.8 }));
        shaft.rotation.x = Math.PI / 2;
        shaft.position.z = -0.3;
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 5), steel);
        head.rotation.x = -Math.PI / 2;
        head.position.z = -0.68;
        this.nockedArrow.add(shaft, head);
        const handR = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 6), skin);
        handR.position.set(0, 0, 0.03);
        this.drawHand = new THREE.Group();
        this.drawHand.add(handR);
        this.bowArms.add(this.nockedArrow, this.drawHand);
      }
      this.group.add(this.bowArms);

      this.group.traverse((c) => { if (c.isMesh) { c.castShadow = false; c.frustumCulled = false; } });

      // anim state
      this.switchT = 1;         // weapon raise/lower blend
      this.releaseT = 1;        // bow release snap
      this.swayT = 0;
      this._applyWeaponVisibility(engine.combat ? engine.combat.weapon : 'sword');
    }

    onWeaponSwitch(weapon) {
      this.switchT = 0;
      this._pendingWeapon = weapon;
    }
    _applyWeaponVisibility(weapon) {
      this.swordArm.visible = weapon === 'sword';
      this.bowArms.visible = weapon === 'bow';
    }

    playSwing() { /* swing driven directly from combat state each frame */ }
    playRelease() { this.releaseT = 0; }

    update(dt) {
      const eng = this.engine, combat = eng.combat, player = eng.player;
      this.swayT += dt;

      // weapon switch raise/lower
      if (this.switchT < 1) {
        this.switchT = Math.min(1, this.switchT + dt / 0.35);
        if (this.switchT >= 0.5 && this._pendingWeapon) {
          this._applyWeaponVisibility(this._pendingWeapon);
          this._pendingWeapon = null;
        }
      }
      const raise = this.switchT < 0.5 ? (this.switchT * 2) : (1 - (this.switchT - 0.5) * 2); // 0→1→0 dip
      const lower = raise * 0.4;

      // shared movement sway / bob
      const planar = player ? Math.hypot(player.body.velocity.x, player.body.velocity.z) : 0;
      const bobA = U.clamp(planar / 7, 0, 1) * (player && player.grounded ? 1 : 0.2);
      const bob = Math.sin((player ? player.bobT : this.swayT) * 2) * 0.012 * bobA;
      const swayX = Math.sin(this.swayT * 1.7) * 0.004;
      const swayY = Math.cos(this.swayT * 1.3) * 0.004;

      /* ------------------------ sword pose ------------------------ */
      if (this.swordArm.visible) {
        let px = 0.30, py = -0.26 - lower, pz = -0.5;
        let rx = 0.5, ry = -0.35, rz = 0.1;
        if (combat.attacking) {
          const f = U.clamp(combat.attackT / 0.42, 0, 1);
          const wind = Math.min(1, f / 0.35);           // pull back
          const sw = U.clamp((f - 0.35) / 0.4, 0, 1);   // slash through
          const settle = U.clamp((f - 0.75) / 0.25, 0, 1);
          const variant = combat.combo;
          if (variant === 0) {          // horizontal right→left
            px = 0.30 + wind * 0.12 - sw * 0.5 + settle * 0.35;
            ry = -0.35 - wind * 0.5 + sw * 1.7 - settle * 1.0;
            rz = 0.1 + sw * 0.5 - settle * 0.4;
            rx = 0.5 - sw * 0.35;
          } else if (variant === 1) {   // backhand left→right
            px = 0.30 - wind * 0.42 + sw * 0.55 - settle * 0.1;
            ry = -0.35 + wind * 1.15 - sw * 1.9 + settle * 0.9;
            rz = -0.15 - sw * 0.35 + settle * 0.4;
            rx = 0.45 - sw * 0.25;
          } else {                      // overhead chop
            py = -0.26 + wind * 0.3 - sw * 0.34;
            rx = 0.5 - wind * 1.5 + sw * 2.3 - settle * 0.8;
            ry = -0.15;
            rz = 0.05;
          }
        } else if (player && player.blocking) {
          px = 0.1; py = -0.16; pz = -0.42;
          rx = 0.25; ry = 0.9; rz = 1.25;   // blade held across the view
        }
        this.swordArm.position.set(px + swayX, py + swayY + bob, pz);
        this.swordArm.rotation.set(rx, ry, rz);
      }

      /* ------------------------- bow pose ------------------------- */
      if (this.bowArms.visible) {
        const draw = combat.drawPct;
        this.releaseT = Math.min(1, this.releaseT + dt / 0.22);
        const snap = 1 - this.releaseT;                  // 1 right after release
        // sway shrinks once fully drawn (the "steady hold" reward)
        const steady = draw >= 1 ? 0.25 : 1;
        const bx = swayX * steady, by = (swayY + bob) * steady;

        // aim pose slides toward screen centre as we draw
        const cx = U.lerp(0.22, 0.055, draw);
        const cy = U.lerp(-0.24, -0.15, draw);
        const cz = -0.5;
        this.bowArms.position.set(cx + bx, cy + by - lower, cz);
        this.bowArms.rotation.set(U.lerp(0.15, 0.02, draw), U.lerp(-0.25, -0.02, draw), 0);

        // draw hand + nocked arrow pulled back with the draw (string midpoint
        // stays put — the hand/arrow sell the motion in first person)
        const pull = draw * 0.34 + snap * -0.05;
        this.drawHand.position.set(0, -0.02, 0.05 + pull);
        this.nockedArrow.visible = combat.arrows > 0 && (combat.nocked || combat.drawing) && snap < 0.4;
        this.nockedArrow.position.set(0, 0, pull);
        // bow tilts slightly with draw
        this.bowRoot.position.set(0, 0, -0.1);
        this.bowRoot.rotation.z = U.lerp(0.25, 0.02, draw);
      }
    }

    dispose() {
      if (this.group.parent) this.group.parent.remove(this.group);
    }
  }
  G.PlayerRig = PlayerRig;
})();
