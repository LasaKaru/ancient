/* ============================================================================
   WARRIORS OF TAPROBANE — net/coopSession.js
   Phase M2 groundwork: the co-op session protocol carried over the WebRTC
   transport (net/webrtc.js).

   Model (per the roadmap): host-authoritative. The host runs the one true
   simulation and streams a compact battle SNAPSHOT (its player + every NPC's
   transform / hp / liveness) several times a second; the guest renders that
   mirror and sends back its INPUT (movement + facing + action bits), which the
   host applies to the ally Giant the guest possesses.

   This module is pure data — it serialises and re-hydrates those messages and
   knows nothing about rendering, so the round-trip can be verified headlessly.
   Wiring the guest's mirror into the R3F render loop and the host's input-apply
   is the next step; this is the tested wire format it will ride on.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});

  const FAC = { ally: 0, enemy: 1, civilian: 2, neutral: 2 };
  const FAC_R = ['ally', 'enemy', 'civilian'];
  const r2 = (v) => Math.round((v || 0) * 100) / 100;   // 1cm precision keeps snapshots small

  const Coop = {
    MSG: { HELLO: 'h', SNAPSHOT: 's', INPUT: 'i', BYE: 'b' },
    _nextId: 0,
    _seq: 0,

    // stable per-NPC network id, assigned lazily on the host
    netId(npc) { return npc.__netId != null ? npc.__netId : (npc.__netId = ++this._nextId); },

    /* HOST → GUEST: a compact snapshot of the whole battle this frame. */
    snapshot(engine) {
      const p = engine.player;
      const pv = p && (p.pos || (p.body && p.body.position)) || { x: 0, y: 0, z: 0 };
      const npcs = [];
      const list = (engine.enemies && engine.enemies.npcs) || [];
      for (const n of list) {
        const q = n.pos || { x: 0, y: 0, z: 0 };
        npcs.push([
          this.netId(n), r2(q.x), r2(q.y), r2(q.z), r2(n.yaw),
          n.hp | 0, n.alive ? 1 : 0, FAC[n.faction] != null ? FAC[n.faction] : 1,
          n.type || 'melee',
        ]);
      }
      return {
        t: this.MSG.SNAPSHOT,
        q: ++this._seq,
        p: p ? [r2(pv.x), r2(pv.y), r2(pv.z), r2(p.yaw), p.hp | 0] : null,
        n: npcs,
      };
    },

    /* GUEST side: re-hydrate a snapshot into a plain, renderable mirror. */
    applySnapshot(snap, mirror) {
      mirror = mirror || { player: null, npcs: new Map() };
      if (snap.p) mirror.player = { x: snap.p[0], y: snap.p[1], z: snap.p[2], yaw: snap.p[3], hp: snap.p[4] };
      const seen = new Set();
      for (const a of (snap.n || [])) {
        const id = a[0]; seen.add(id);
        mirror.npcs.set(id, {
          id, x: a[1], y: a[2], z: a[3], yaw: a[4], hp: a[5],
          alive: !!a[6], faction: FAC_R[a[7]] || 'enemy', type: a[8],
        });
      }
      // drop entities the host no longer reports (despawned)
      for (const id of Array.from(mirror.npcs.keys())) if (!seen.has(id)) mirror.npcs.delete(id);
      mirror.seq = snap.q;
      return mirror;
    },

    /* GUEST → HOST: the possessing player's input for its Giant. */
    input({ move = [0, 0], yaw = 0, attack = false, sprint = false, jump = false } = {}) {
      return { t: this.MSG.INPUT, m: [r2(move[0]), r2(move[1])], y: r2(yaw), a: (attack ? 1 : 0) | (sprint ? 2 : 0) | (jump ? 4 : 0) };
    },
    readInput(msg) {
      return { move: msg.m || [0, 0], yaw: msg.y || 0, attack: !!(msg.a & 1), sprint: !!(msg.a & 2), jump: !!(msg.a & 4) };
    },

    hello(role, name) { return { t: this.MSG.HELLO, role, name: name || 'Ally' }; },
  };

  G.Coop = Coop;
})();
