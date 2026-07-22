/* ============================================================================
   WARRIORS OF TAPROBANE — net/webrtc.js
   Phase M2 groundwork: a no-server, manual-signalling WebRTC transport.

   Keeps the project's "no build step, no server" promise: two players connect
   by copy-pasting a single invite/reply code (a base64 blob of the full SDP,
   ICE candidates baked in via non-trickle gathering — no signalling server, no
   STUN required on a LAN/loopback; a public STUN is used by default to help NAT
   traversal on the open internet).

   This file is transport only — it opens an ordered DataChannel and moves JSON
   messages. The co-op session protocol that rides on top lives in
   net/coopSession.js. Exposed as `G.NetPeer` (a class, one per connection) plus
   a convenience singleton `G.Net` for the game's single co-op link.
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});

  const DEFAULT_ICE = [{ urls: 'stun:stun.l.google.com:19302' }];

  // pack/unpack an RTCSessionDescription to a compact copy-paste code
  const encode = (desc) => {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify({ t: desc.type, s: desc.sdp })))); }
    catch (_) { return btoa(JSON.stringify({ t: desc.type, s: desc.sdp })); }
  };
  const decode = (code) => {
    let raw;
    try { raw = decodeURIComponent(escape(atob(code.trim()))); } catch (_) { raw = atob(code.trim()); }
    const o = JSON.parse(raw);
    return { type: o.t, sdp: o.s };
  };

  // resolve once ICE gathering is done (non-trickle → the code is self-contained)
  const gathered = (pc) => new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', done); resolve(); } };
    pc.addEventListener('icegatheringstatechange', done);
    // safety: some stacks never flip to 'complete' — cap the wait
    setTimeout(resolve, 4000);
  });

  class NetPeer {
    constructor(opts = {}) {
      this.isHost = false;
      this.connected = false;
      this.pc = null;
      this.dc = null;
      this._ice = opts.iceServers || DEFAULT_ICE;
      this._handlers = { open: [], message: [], close: [] };
    }

    on(ev, cb) { (this._handlers[ev] || (this._handlers[ev] = [])).push(cb); return this; }
    _emit(ev, arg) { for (const cb of (this._handlers[ev] || [])) { try { cb(arg); } catch (e) { console.error('[net]', e); } } }

    _bindChannel(dc) {
      this.dc = dc;
      dc.onopen = () => { this.connected = true; this._emit('open'); };
      dc.onclose = () => { this.connected = false; this._emit('close'); };
      dc.onmessage = (m) => {
        let data = m.data;
        try { data = JSON.parse(m.data); } catch (_) {}
        this._emit('message', data);
      };
    }

    _newPC() {
      const pc = new RTCPeerConnection({ iceServers: this._ice });
      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          if (this.connected) { this.connected = false; this._emit('close'); }
        }
      };
      this.pc = pc;
      return pc;
    }

    /* host: create the invite code (offer). Later feed the guest's reply to accept(). */
    async host() {
      this.isHost = true;
      const pc = this._newPC();
      this._bindChannel(pc.createDataChannel('coop', { ordered: true }));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await gathered(pc);
      return encode(pc.localDescription);
    }
    async accept(replyCode) { await this.pc.setRemoteDescription(decode(replyCode)); }

    /* guest: take the host's invite code, return the reply code (answer). */
    async guest(inviteCode) {
      this.isHost = false;
      const pc = this._newPC();
      pc.ondatachannel = (e) => this._bindChannel(e.channel);
      await pc.setRemoteDescription(decode(inviteCode));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await gathered(pc);
      return encode(pc.localDescription);
    }

    send(obj) {
      if (!this.dc || this.dc.readyState !== 'open') return false;
      try { this.dc.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); return true; }
      catch (_) { return false; }
    }

    close() {
      try { this.dc && this.dc.close(); } catch (_) {}
      try { this.pc && this.pc.close(); } catch (_) {}
      this.connected = false;
    }
  }

  G.NetPeer = NetPeer;
  G.Net = new NetPeer();
  G.netSupported = typeof RTCPeerConnection !== 'undefined';
})();
