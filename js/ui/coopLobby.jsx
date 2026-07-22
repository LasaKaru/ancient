/* ============================================================================
   WARRIORS OF TAPROBANE — ui/coopLobby.jsx
   Phase M2 — the co-op lobby: connect a friend, no server.

   Uses the WebRTC transport (net/webrtc.js) to establish a peer-to-peer link by
   copy-pasting a single code each way:
     Host → "Host a Game" mints an INVITE code → sends it to the friend →
            pastes the friend's REPLY code → Connect.
     Guest → "Join a Game" pastes the host's INVITE → mints a REPLY code →
            sends it back to the host.
   Once the DataChannel opens, both sides exchange a HELLO (name) and run a 2s
   heartbeat, so the lobby shows "Linked with <name>" and a live round-trip
   latency — proof the P2P channel is real and healthy. The shared in-battle
   simulation rides this same link and is the next step; this screen is the
   connection layer, clearly labelled Beta.
   (JSX-free React.createElement — no build step.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const { React } = window.__MODULES__;
  const h = React.createElement;
  const { useState, useRef, useEffect } = React;

  const COOP_LEVEL = 'stupa';   // the shared battle the host launches (a wave defence)

  function CoopLobby({ onBack, onHostStart, onGuestJoin }) {
    const [mode, setMode] = useState('choose');        // choose | host | join
    const [status, setStatus] = useState('idle');      // idle | working | awaiting | connecting | linked | failed
    const [myCode, setMyCode] = useState('');          // the code THIS side shares
    const [inCode, setInCode] = useState('');          // the code pasted in
    const [peerName, setPeerName] = useState(null);
    const [latency, setLatency] = useState(null);
    const peerRef = useRef(null);
    const beatRef = useRef(null);
    const keepRef = useRef(false);                     // keep the link alive when launching into a battle
    const joinRef = useRef(onGuestJoin);               // latest onGuestJoin for the message handler
    joinRef.current = onGuestJoin;
    const myName = (G.GameState && G.GameState.profile && G.GameState.profile.name) || 'Warrior';

    const stopBeat = () => { if (beatRef.current) { clearInterval(beatRef.current); beatRef.current = null; } };
    const teardown = () => { stopBeat(); try { peerRef.current && peerRef.current.close(); } catch (_) {} peerRef.current = null; };
    useEffect(() => () => { if (!keepRef.current) teardown(); else stopBeat(); }, []);   // keep the peer if launching a battle

    const startBeat = (peer) => {
      stopBeat();
      const ping = () => { if (peer.connected) peer.send({ t: 'ping', ts: (performance.now() | 0) }); else stopBeat(); };
      ping();
      beatRef.current = setInterval(ping, 2000);
    };

    const wire = (peer) => {
      peer.on('open', () => {
        setStatus('linked');
        peer.send(G.Coop.hello(peer.isHost ? 'host' : 'guest', myName));
        startBeat(peer);
        G.audio && G.audio.objectiveDone && G.audio.objectiveDone();
      });
      peer.on('message', (m) => {
        if (!m || !m.t) return;
        if (m.t === G.Coop.MSG.HELLO) setPeerName(m.name || 'Ally');
        else if (m.t === 'ping') peer.send({ t: 'pong', ts: m.ts });
        else if (m.t === 'pong') setLatency(Math.max(0, (performance.now() | 0) - m.ts));
        else if (m.t === 'start' && joinRef.current) { keepRef.current = true; joinRef.current(m.level, peerName || m.host); }
      });
      peer.on('close', () => { stopBeat(); setStatus('idle'); setPeerName(null); setLatency(null); });
    };

    const hostGame = async () => {
      if (!G.netSupported) { setStatus('failed'); return; }
      const peer = new G.NetPeer(); peerRef.current = peer; G.coopPeer = peer; wire(peer);
      setMode('host'); setStatus('working');
      try { const code = await peer.host(); setMyCode(code); setStatus('awaiting'); }
      catch (e) { console.error('[coop] host', e); setStatus('failed'); }
    };
    const hostConnect = async () => {
      if (!peerRef.current || !inCode.trim()) return;
      setStatus('connecting');
      try { await peerRef.current.accept(inCode); } catch (e) { console.error('[coop] accept', e); setStatus('failed'); }
    };
    const joinGenerate = async () => {
      if (!G.netSupported || !inCode.trim()) return;
      const peer = new G.NetPeer(); peerRef.current = peer; G.coopPeer = peer; wire(peer);
      setStatus('working');
      try { const code = await peer.guest(inCode); setMyCode(code); setStatus('connecting'); }
      catch (e) { console.error('[coop] guest', e); setStatus('failed'); }
    };

    const typingGuard = { onFocus: () => { G.uiTyping = true; }, onBlur: () => { G.uiTyping = false; } };
    const codeBox = (val, ro, onChange, ph) => h('textarea', Object.assign({
      className: 'coop-code', value: val, readOnly: ro, spellCheck: false, placeholder: ph,
      onChange: onChange ? (e) => onChange(e.target.value) : undefined,
      onClick: ro ? (e) => e.target.select() : undefined,
    }, typingGuard));
    const copy = (val) => { try { navigator.clipboard && navigator.clipboard.writeText(val); G.audio && G.audio.ui && G.audio.ui(); } catch (_) {} };

    const statusLine = () => {
      if (status === 'linked') return h('div', { className: 'coop-status ok' },
        '⚔ Linked with ' + (peerName || 'your ally') + (latency != null ? '  ·  ' + latency + ' ms' : ''));
      if (status === 'working') return h('div', { className: 'coop-status' }, 'Preparing the link…');
      if (status === 'awaiting') return h('div', { className: 'coop-status' }, 'Waiting for your friend\'s reply code…');
      if (status === 'connecting') return h('div', { className: 'coop-status' }, 'Connecting…');
      if (status === 'failed') return h('div', { className: 'coop-status bad' }, G.netSupported ? 'Link failed — check the codes and try again.' : 'This browser has no WebRTC — co-op is unavailable here.');
      return null;
    };

    let body;
    if (status === 'linked') {
      const isHost = peerRef.current && peerRef.current.isHost;
      const beginBattle = () => {
        keepRef.current = true;
        const peer = peerRef.current;
        if (peer) peer.send({ t: 'start', level: COOP_LEVEL, host: myName });
        if (onHostStart) onHostStart(COOP_LEVEL);
      };
      body = h(React.Fragment, null,
        h('div', { className: 'coop-linked-badge' }, '✓'),
        statusLine(),
        h('div', { className: 'coop-note' },
          'Your peer-to-peer link is open and healthy — no server between you. ',
          isHost
            ? 'Begin the battle and your ally will spectate your fight live; guest possession of an ally Giant rides this same link and arrives next.'
            : 'Waiting for ' + (peerName || 'the host') + ' to begin the battle — you\'ll drop straight into their fight to watch it live.'),
        isHost && onHostStart ? h('button', { className: 'menu-btn primary', onClick: beginBattle }, 'Begin Co-op Battle') : null,
        h('button', { className: 'menu-btn small', onClick: () => { teardown(); onBack(); } }, 'Leave'));
    } else if (mode === 'host') {
      body = h(React.Fragment, null,
        h('div', { className: 'coop-step' }, '1 · Send this invite code to your friend'),
        codeBox(myCode, true, null, 'generating…'),
        h('button', { className: 'menu-btn small', disabled: !myCode, onClick: () => copy(myCode) }, 'Copy invite'),
        h('div', { className: 'coop-step' }, '2 · Paste the reply they send back'),
        codeBox(inCode, false, setInCode, 'paste your friend\'s reply code'),
        h('button', { className: 'menu-btn primary', disabled: !inCode.trim() || status === 'connecting', onClick: hostConnect }, 'Connect'),
        statusLine(),
        h('button', { className: 'menu-btn small', onClick: () => { teardown(); setMode('choose'); setStatus('idle'); setMyCode(''); setInCode(''); } }, 'Back'));
    } else if (mode === 'join') {
      body = h(React.Fragment, null,
        h('div', { className: 'coop-step' }, '1 · Paste the invite code from the host'),
        codeBox(inCode, false, setInCode, 'paste the host\'s invite code'),
        h('button', { className: 'menu-btn primary', disabled: !inCode.trim() || status === 'working', onClick: joinGenerate }, 'Generate reply'),
        myCode ? h(React.Fragment, null,
          h('div', { className: 'coop-step' }, '2 · Send this reply back to the host'),
          codeBox(myCode, true, null, ''),
          h('button', { className: 'menu-btn small', onClick: () => copy(myCode) }, 'Copy reply')) : null,
        statusLine(),
        h('button', { className: 'menu-btn small', onClick: () => { teardown(); setMode('choose'); setStatus('idle'); setMyCode(''); setInCode(''); } }, 'Back'));
    } else {
      body = h(React.Fragment, null,
        h('div', { className: 'coop-note' }, 'Play beside a friend with no server between you — connect by trading one code each way.'),
        h('button', { className: 'menu-btn primary', disabled: !G.netSupported, onClick: hostGame }, 'Host a Game'),
        h('button', { className: 'menu-btn', disabled: !G.netSupported, onClick: () => { setMode('join'); setStatus('idle'); } }, 'Join a Game'),
        !G.netSupported ? h('div', { className: 'coop-status bad' }, 'This browser has no WebRTC — co-op is unavailable here.') : null,
        h('button', { className: 'menu-btn small', onClick: () => { teardown(); onBack(); } }, 'Back to Menu'));
    }

    return h('div', { className: 'screen coop-screen fade-in' },
      G.UI.KeyArtBg ? h(G.UI.KeyArtBg, { name: 'menu.jpg', dim: 0.6 }) : null,
      h('div', { className: 'panel', style: { minWidth: 460, maxWidth: 560 } },
        h('div', { className: 'menu-eyebrow' }, 'Brothers-in-Arms'),
        h('div', { className: 'menu-title', style: { fontSize: 30 } }, 'CO-OP'),
        h('div', { className: 'menu-subtitle' }, 'Connect a friend · peer-to-peer · Beta'),
        h('div', { className: 'menu-rule' }),
        body));
  }

  G.UI = G.UI || {};
  G.UI.CoopLobby = CoopLobby;
})();
