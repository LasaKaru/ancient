/* ============================================================================
   RAJARATA: DUTUGEMUNU'S WAR — ui/campaignMap.jsx  (added in v0.4 "Taprobane")
   The ancient-map campaign screen: a procedurally engraved chart of the
   island in the manner of the early-modern "Ancienne Isle Taprobane" plates —
   aged parchment, engraved sea, compass rose, cartouche — with the island's
   WARS pinned upon it. Filter by era (the chronicle periods), read each
   conflict's entry, and march into the playable campaigns.

   Historical entries follow the List of wars involving Sri Lanka
   (https://en.wikipedia.org/wiki/List_of_wars_involving_Sri_Lanka) and the
   Mahavamsa/Culavamsa chronicle periods. Wars beyond the Dutugemunu campaign
   are shown as chronicle records — future Chronicles campaigns per ROADMAP.md.

   ASSET SLOT: drop a public-domain scan at assets/map/taprobane.jpg (e.g. the
   1686 Mallet engraving) and it will be used as the chart automatically.
   (JSX-free React.createElement — no build step; see hud.jsx note.)
   ============================================================================ */
(function () {
  const G = (window.RAJARATA = window.RAJARATA || {});
  const React = window.__MODULES__.React;
  const h = React.createElement;

  /* ------------------------------ the wars ------------------------------ */
  const ERAS = [
    { id: 'all', label: 'All eras', years: '543 BCE – 1818 CE' },
    { id: 'anuradhapura', label: 'Anuradhapura', years: '377 BCE – 1017' },
    { id: 'polonnaruwa', label: 'Polonnaruwa', years: '1017 – 1232' },
    { id: 'transitional', label: 'Transitional', years: '1232 – 1592' },
    { id: 'kandy', label: 'Kandyan', years: '1592 – 1815' },
    { id: 'british', label: 'British Ceylon', years: '1815 – 1948' },
  ];
  const ERA_COLOR = {
    anuradhapura: '#d8a94e', polonnaruwa: '#c0632f', transitional: '#8c5aa0',
    kandy: '#4a8c5a', british: '#a03a3a', legend: '#4f8fb3',
  };

  /* map coords are fractions of the chart (x right, y down) */
  const WARS = [
    {
      id: 'dutugemunu', era: 'anuradhapura', at: [0.46, 0.30], year: '162–161 BCE',
      name: "Dutugemunu's War", sides: 'Anuradhapura Kingdom (Dutugemunu the Great) vs. Elara of the Early Cholas',
      result: 'Victory — the island united under one throne; Elara honoured in death',
      desc: 'From Ruhuna in the south, prince Dutugemunu marched north through thirty-two strongholds to end the forty-four-year rule of the just king Elara — sieging Vijithapura, meeting Elara in single combat, and raising the Ruwanwelisaya in the peace that followed.',
      playable: 'campaign',
    },
    {
      id: 'sigiriya', era: 'kandy', legend: true, at: [0.52, 0.44], year: '~477 CE · told apart',
      name: 'The Trial of the Lion Rock', sides: 'A nameless warrior vs. the guardians of Sigiriya',
      result: 'A legend outside the histories',
      desc: 'Centuries after Dutugemunu, King Kashyapa raised a palace upon the Lion Rock. The bards say its painted maidens and spectral watch test any soul who dares the climb. A mythic chapter, deliberately set apart from the campaign calendar.',
      playable: 'sigiriya',
    },
    {
      id: 'chola110', era: 'anuradhapura', at: [0.50, 0.22], year: '110 CE',
      name: '110 Chola Invasion', sides: 'Anuradhapura Kingdom vs. Early Cholas',
      result: 'Chola victory',
      desc: 'A Chola expedition falls upon Rajarata and carries away captives across the strait.',
    },
    {
      id: 'gajabahu', era: 'anuradhapura', at: [0.40, 0.16], year: '~120 CE',
      name: "Gajabahu's Crossing", sides: 'Anuradhapura Kingdom (Gajabahu I) vs. Early Cholas',
      result: 'Victory — the twelve thousand brought home',
      desc: 'King Gajabahu I crossed to the Chola country and returned with the captives taken in his father\'s day — one of the great sea-tales of the chronicle age.',
      playable: 'gajabahu',
    },
    {
      id: 'pandya846', era: 'anuradhapura', at: [0.44, 0.26], year: '846 CE',
      name: 'The Pandyan Sack', sides: 'Anuradhapura Kingdom (Sena I) vs. Pandya dynasty (Srimara Srivallabha)',
      result: 'Pandyan victory — Anuradhapura plundered',
      desc: 'Srimara Srivallabha broke the Sinhalese line at Mahatalita and plundered the sacred city, until treaty restored the land. Play the defence of the relics: carry the casket to the inner refuge and hold the sacred precinct through the onslaught.',
      playable: 'pandyanSack',
    },
    {
      id: 'chola946', era: 'anuradhapura', at: [0.52, 0.27], year: '946 CE',
      name: "Udaya's Counterstroke", sides: 'Anuradhapura Kingdom (Udaya IV, General Viduragga) vs. Chola Empire (Parantaka I)',
      result: 'Anuradhapura victory — the plunder recovered',
      desc: 'Parantaka I sacked the capital but could not hold it; General Viduragga struck back into Chola country and compelled the return of what was seized. Play the recovery raid: storm the shore, get the plundered chests down to the boats, and break the Chola shore-captain.',
      playable: 'udayaCounterstroke',
    },
    {
      id: 'conquest', era: 'anuradhapura', at: [0.47, 0.36], year: '992–1017',
      name: 'The Chola Conquest', sides: 'Anuradhapura Kingdom & Pandyan allies vs. Chola Empire (Rajaraja I, Rajendra I)',
      result: 'Chola victory — Anuradhapura destroyed, Rajarata annexed',
      desc: 'The thousand-year city fell. Polonnaruwa became a Chola provincial capital and the north lay under the tiger banner for two generations.',
    },
    {
      id: 'vijayabahu', era: 'polonnaruwa', at: [0.56, 0.40], year: '1017–1070',
      name: "Vijayabahu's Liberation", sides: 'Sinhalese resistance (Vijayabahu I) vs. Chola Empire',
      result: 'Victory — Polonnaruwa freed, the crown restored',
      desc: 'From Ruhuna\'s hills a fifty-year resistance grew into open war, until Vijayabahu I drove the Cholas from the island and was crowned in liberated Polonnaruwa.',
      playable: 'vijayabahu',
    },
    {
      id: 'parakramabahu', era: 'polonnaruwa', at: [0.58, 0.44], year: '1153–1186',
      name: "Parakramabahu's Wars", sides: 'Polonnaruwa Kingdom (Parakramabahu the Great) vs. Pagan kingdom · Chola & Pandya interventions',
      result: 'Victory abroad and at home',
      desc: 'The great unifier turned the island\'s strength outward — expeditions against Pagan in Burma (1164) and into the Pandyan civil war, while the tanks and walls of Polonnaruwa rose to their height. Play a battle of the unification war: force the river ford, throw down the rival\'s gate (ride the war elephant through it), raise the lion over his court, and break the pretender\'s champion.',
      playable: 'parakramabahuWars',
    },
    {
      id: 'magha', era: 'polonnaruwa', at: [0.53, 0.34], year: '1215',
      name: 'The Invasion of Kalinga Magha', sides: 'Polonnaruwa Kingdom vs. Eastern Ganga dynasty (Kalinga Magha)',
      result: 'Defeat — Rajarata abandoned',
      desc: 'Magha\'s host sacked Polonnaruwa, burned the libraries, and drove the court south — the bitter end of the Rajarata civilisation and the beginning of the drift to the south-west. Play the last stand at the citadel: hold long enough for the Sacred Tooth and the royal line to escape over the causeway.',
      playable: 'brokenThrone',
    },
    {
      id: 'tambralinga', era: 'transitional', at: [0.37, 0.55], year: '1247 & 1262',
      name: 'The Tambralinga Invasions', sides: 'Kingdom of Dambadeniya (Parakramabahu II) vs. Tambralinga (Chandrabhanu)',
      result: 'Both invasions repelled',
      desc: 'Twice Chandrabhanu of Tambralinga landed seeking the Tooth Relic; twice Dambadeniya threw him back into the sea. Play the defence: bear the Tooth up to the summit shrine, hold the rock-gate through the Javaka assault, then sally down to the sand to cast down his standard and break him.',
      playable: 'dambadeniyaShield',
    },
    {
      id: 'yapahuwa', era: 'transitional', at: [0.43, 0.50], year: '1277–1288',
      name: 'Yapahuwa & the Tooth', sides: 'Kurunegala-era kingdom (Bhuvanekabahu I) vs. Pandya dynasty (Arya Chakravarti)',
      result: 'Defeat — then the Relic recovered by embassy',
      desc: 'The Pandyan expedition plundered the rock-fortress of Yapahuwa and bore off the Sacred Tooth; Parakramabahu III went in person to the Pandyan court and persuaded its return — the Dambadeniya–Kurunegala age\'s strangest victory.',
      playable: 'yapahuwa',
    },
    {
      id: 'kotteJaffna', era: 'transitional', at: [0.42, 0.10], year: '1449–1454',
      name: 'The Kotte Conquest of Jaffna', sides: 'Kingdom of Kotte (Prince Sapumal) vs. Jaffna kingdom & Vanni chiefs',
      result: 'Kotte victory',
      desc: 'Parakramabahu VI\'s adopted son Sapumal took the northern kingdom, and for a span one throne again spoke for the whole island.',
    },
    {
      id: 'mulleriyawa', era: 'transitional', at: [0.32, 0.66], year: '1559',
      name: 'Battle of Mulleriyawa', sides: 'Kingdom of Sitawaka (Rajasinha I) vs. Portuguese Empire',
      result: 'Sitawaka victory — a musket line broken by swords',
      desc: 'In the marshes east of Colombo the Sitawaka host annihilated a Portuguese field army — remembered as one of the fiercest days of the Sinhalese–Portuguese wars.',
      playable: 'mulleriyawa',
    },
    {
      id: 'kandyDutch', era: 'kandy', at: [0.48, 0.62], year: '1670–1766',
      name: 'The Kandyan–Dutch Wars', sides: 'Kingdom of Kandy (Rajasinha II, Kirti Sri Rajasinha) vs. Dutch East India Company',
      result: 'Dutch hold the coasts; the mountain kingdom endures',
      desc: 'A century of forest ambush and burned lowlands: the Company took every harbour, but the drums in the hills never stopped.',
    },
    {
      id: 'kandy1803', era: 'kandy', at: [0.46, 0.66], year: '1803–1805',
      name: 'First Anglo-Kandyan War', sides: 'Kingdom of Kandy (Sri Vikrama Rajasinha) vs. United Kingdom',
      result: 'Kandyan victory',
      desc: 'The first British march on Kandy ended in disaster in the passes — the mountain kingdom\'s last great victory.',
      playable: 'angloKandyan',
    },
    {
      id: 'uva1818', era: 'british', at: [0.52, 0.68], year: '1815–1818',
      name: 'The Fall of Kandy & the Uva Rising', sides: 'Kingdom of Kandy (Keppetipola Disawe) vs. United Kingdom (Brownrigg)',
      result: 'British victory — the last kingdom ends',
      desc: 'The convention of 1815 gave the kingdom away; the great rising of 1817–18 in Uva–Wellassa fought to take it back, and its suppression closed two thousand three hundred years of Lankan kingship.',
    },
  ];
  G.WARS = WARS;

  /* --------------------- the engraved chart (canvas) --------------------- */
  let chartURL = null;
  function paintChart() {
    if (chartURL) return chartURL;
    const W = 900, H = 1150;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const rng = G.util.mulberry(1686);

    // parchment
    const bg = c.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, H * 0.75);
    bg.addColorStop(0, '#e8d9b0'); bg.addColorStop(1, '#c9b27f');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(120,90,40,${rng() * 0.05})`;
      c.beginPath(); c.arc(rng() * W, rng() * H, rng() * 8, 0, 7); c.fill();
    }

    // sea: engraved horizontal strokes
    const seaTop = 40, seaLeft = 40, seaRight = W - 40, seaBot = H - 40;
    c.save();
    c.beginPath(); c.rect(seaLeft, seaTop, seaRight - seaLeft, seaBot - seaTop); c.clip();
    c.fillStyle = 'rgba(122,146,150,0.30)';
    c.fillRect(seaLeft, seaTop, seaRight - seaLeft, seaBot - seaTop);
    c.strokeStyle = 'rgba(60,80,90,0.25)';
    c.lineWidth = 0.7;
    for (let y = seaTop; y < seaBot; y += 5) {
      c.beginPath();
      for (let x = seaLeft; x <= seaRight; x += 14) {
        const yy = y + Math.sin(x * 0.05 + y) * 1.2;
        x === seaLeft ? c.moveTo(x, yy) : c.lineTo(x, yy);
      }
      c.stroke();
    }

    // the island (stylised Taprobane outline; x,y as fractions)
    const pts = [
      [0.47, 0.055], [0.50, 0.075], [0.52, 0.11], [0.56, 0.16], [0.585, 0.22],
      [0.615, 0.28], [0.60, 0.315], [0.635, 0.345], [0.65, 0.42], [0.655, 0.50],
      [0.64, 0.58], [0.615, 0.66], [0.575, 0.74], [0.52, 0.80], [0.455, 0.835],
      [0.39, 0.81], [0.34, 0.765], [0.305, 0.70], [0.285, 0.62], [0.29, 0.53],
      [0.305, 0.44], [0.325, 0.35], [0.35, 0.26], [0.375, 0.175], [0.385, 0.115],
      [0.415, 0.085], [0.44, 0.095], [0.455, 0.07],
    ];
    const px = (p) => [p[0] * W, p[1] * H];
    c.beginPath();
    pts.forEach((p, i) => { const [x, y] = px(p); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath();
    const land = c.createLinearGradient(0, H * 0.1, 0, H * 0.85);
    land.addColorStop(0, '#d8cfa0'); land.addColorStop(0.5, '#cfd0a0'); land.addColorStop(1, '#c8c294');
    c.fillStyle = land; c.fill();
    c.strokeStyle = '#4a3a20'; c.lineWidth = 2.4; c.stroke();
    c.strokeStyle = 'rgba(74,58,32,0.5)'; c.lineWidth = 5.5; c.stroke(); // coastal shade band
    c.strokeStyle = '#4a3a20'; c.lineWidth = 2.0; c.stroke();

    // central highlands: engraved mountain marks
    c.fillStyle = '#8a7a4e'; c.strokeStyle = '#5c4a28'; c.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const mx = (0.44 + (rng() - 0.5) * 0.10) * W;
      const my = (0.62 + (rng() - 0.5) * 0.10) * H;
      const s = 7 + rng() * 9;
      c.beginPath(); c.moveTo(mx - s, my); c.lineTo(mx, my - s * 1.3); c.lineTo(mx + s, my);
      c.closePath(); c.fill(); c.stroke();
    }
    // rivers
    c.strokeStyle = 'rgba(70,100,110,0.8)'; c.lineWidth = 1.2;
    for (const [sx, sy, ex, ey] of [[0.46, 0.60, 0.62, 0.47], [0.44, 0.62, 0.30, 0.55], [0.47, 0.64, 0.50, 0.80]]) {
      c.beginPath(); c.moveTo(sx * W, sy * H);
      c.quadraticCurveTo(((sx + ex) / 2 + 0.03) * W, ((sy + ey) / 2) * H, ex * W, ey * H);
      c.stroke();
    }

    // region names
    c.fillStyle = 'rgba(74,50,20,0.85)';
    const label = (t, x, y, size = 17, angle = 0) => {
      c.save(); c.translate(x * W, y * H); c.rotate(angle);
      c.font = `italic ${size}px Georgia`;
      c.textAlign = 'center'; c.fillText(t, 0, 0); c.restore();
    };
    label('RAJARATA', 0.47, 0.27, 21);
    label('Anuradhapura', 0.44, 0.315, 13);
    label('Polonnaruwa', 0.56, 0.385, 13);
    label('Jaffna', 0.44, 0.115, 14);
    label('Kurunegala', 0.415, 0.515, 13);
    label('Dambadeniya', 0.375, 0.555, 12);
    label('Sigiriya', 0.525, 0.425, 12);
    label('KANDY', 0.475, 0.635, 16);
    label('Kotte', 0.315, 0.675, 13);
    label('Sitawaka', 0.36, 0.645, 12);
    label('RUHUNA', 0.50, 0.76, 18);
    label('MARE INDICUM', 0.28, 0.90, 20, -0.06);
    label('SINUS BENGALICUS', 0.76, 0.30, 15, 1.35);

    // compass rose
    const cxp = 0.78 * W, cyp = 0.78 * H, R = 52;
    c.strokeStyle = '#4a3a20'; c.fillStyle = '#4a3a20'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(cxp, cyp, R, 0, 7); c.stroke();
    c.beginPath(); c.arc(cxp, cyp, R * 0.62, 0, 7); c.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const long = i % 4 === 0 ? R : i % 2 === 0 ? R * 0.8 : R * 0.62;
      c.beginPath(); c.moveTo(cxp, cyp);
      c.lineTo(cxp + Math.sin(a) * long, cyp - Math.cos(a) * long);
      c.stroke();
    }
    c.beginPath(); c.moveTo(cxp, cyp - R - 14); c.lineTo(cxp - 6, cyp - R + 2); c.lineTo(cxp + 6, cyp - R + 2); c.closePath(); c.fill();
    c.font = 'bold 14px Georgia'; c.textAlign = 'center'; c.fillText('N', cxp, cyp - R - 20);

    // little ships & a sea-serpent flourish
    const ship = (sx, sy, s = 1) => {
      c.save(); c.translate(sx * W, sy * H); c.scale(s, s);
      c.strokeStyle = '#4a3a20'; c.fillStyle = 'rgba(74,58,32,0.75)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-14, 4); c.quadraticCurveTo(0, 10, 14, 4); c.lineTo(10, 0); c.lineTo(-12, 0); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -16); c.stroke();
      c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(10, -11, 1, -4); c.closePath(); c.fill();
      c.restore();
    };
    ship(0.20, 0.35); ship(0.74, 0.58, 0.85); ship(0.24, 0.72, 0.8);
    c.strokeStyle = '#4a3a20'; c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i <= 30; i++) {
      const x = (0.66 + i * 0.004) * W;
      const y = (0.13 + Math.sin(i * 0.7) * 0.012) * H;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();

    // sea-lane invasion arrows (v0.4 §3.1) — the routes the island's foes sailed
    const seaArrow = (x0, y0, x1, y1, text) => {
      c.save();
      c.strokeStyle = 'rgba(140,40,25,0.72)'; c.fillStyle = 'rgba(140,40,25,0.72)'; c.lineWidth = 2.2;
      const ax0 = x0 * W, ay0 = y0 * H, ax1 = x1 * W, ay1 = y1 * H;
      const mx = (ax0 + ax1) / 2, my = (ay0 + ay1) / 2 - Math.hypot(ax1 - ax0, ay1 - ay0) * 0.2;
      c.setLineDash([7, 5]);
      c.beginPath(); c.moveTo(ax0, ay0); c.quadraticCurveTo(mx, my, ax1, ay1); c.stroke();
      c.setLineDash([]);
      const ang = Math.atan2(ay1 - my, ax1 - mx);
      c.beginPath(); c.moveTo(ax1, ay1);
      c.lineTo(ax1 - Math.cos(ang - 0.42) * 13, ay1 - Math.sin(ang - 0.42) * 13);
      c.lineTo(ax1 - Math.cos(ang + 0.42) * 13, ay1 - Math.sin(ang + 0.42) * 13);
      c.closePath(); c.fill();
      if (text) { c.font = 'italic 11px Georgia'; c.textAlign = 'center'; c.fillText(text, mx, my - 5); }
      c.restore();
    };
    seaArrow(0.30, 0.04, 0.44, 0.19, 'Chola · Pandya');       // South India across the strait
    seaArrow(0.87, 0.23, 0.60, 0.37, 'Kalinga Magha');         // from the Bay of Bengal
    seaArrow(0.08, 0.82, 0.30, 0.66, 'European fleets');       // Portuguese / Dutch / British

    // border with degree ticks (engraved plate frame)
    c.strokeStyle = '#3a2c14'; c.lineWidth = 3;
    c.strokeRect(seaLeft, seaTop, seaRight - seaLeft, seaBot - seaTop);
    c.strokeRect(seaLeft - 12, seaTop - 12, seaRight - seaLeft + 24, seaBot - seaTop + 24);
    c.lineWidth = 1;
    for (let x = seaLeft; x < seaRight; x += 22) {
      c.strokeRect(x, seaTop - 12, 11, 12);
      c.strokeRect(x, seaBot, 11, 12);
    }
    for (let y = seaTop; y < seaBot; y += 22) {
      c.strokeRect(seaLeft - 12, y, 12, 11);
      c.strokeRect(seaRight, y, 12, 11);
    }

    // cartouche
    c.save();
    c.translate(0.685 * W, 0.115 * H);
    c.fillStyle = '#b98a8a';
    c.strokeStyle = '#3a2c14'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-135, -46); c.lineTo(135, -46); c.lineTo(150, 0); c.lineTo(135, 46); c.lineTo(-135, 46); c.lineTo(-150, 0);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f0e6cc';
    c.beginPath();
    c.moveTo(-127, -38); c.lineTo(127, -38); c.lineTo(140, 0); c.lineTo(127, 38); c.lineTo(-127, 38); c.lineTo(-140, 0);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#3a2c14'; c.textAlign = 'center';
    c.font = '13px Georgia'; c.fillText('ANCIENNE ISLE', 0, -16);
    c.font = 'bold 26px Georgia'; c.fillText('TAPROBANE', 0, 10);
    c.font = 'italic 11px Georgia'; c.fillText('the wars of Lanka, charted', 0, 28);
    c.restore();

    chartURL = cv.toDataURL('image/png');
    return chartURL;
  }

  /* ------------------------------ component ------------------------------ */
  function CampaignMap({ progress, onPlay, onBack }) {
    const [era, setEra] = React.useState('all');
    const [sel, setSel] = React.useState('dutugemunu');
    const [chart, setChart] = React.useState(null);

    React.useEffect(() => {
      // ASSET SLOT: real engraving beats the procedural one when present
      const img = new Image();
      img.onload = () => setChart('assets/map/taprobane.jpg');
      img.onerror = () => setChart(paintChart());
      img.src = 'assets/map/taprobane.jpg';
    }, []);

    const selected = WARS.find((w) => w.id === sel) || null;
    const visible = WARS.filter((w) => era === 'all' || w.era === era);
    const order = G.Levels.order.filter((id) => !G.Levels.defs[id].bonus && !G.Levels.defs[id].standalone);

    const pinState = (w) => {
      if (w.playable === 'campaign') {
        const allDone = order.every((id) => progress.completed[id]);
        return allDone ? 'done' : 'open';
      }
      if (w.playable) {
        if (w.id === 'sigiriya' && !progress.bonusUnlocked) return 'locked';
        return progress.completed[w.playable] ? 'done' : 'open';
      }
      return 'record';
    };

    return h('div', { className: 'screen map-screen fade-in' },
      h('div', { className: 'map-chart-wrap' },
        chart ? h('img', { className: 'map-chart', src: chart, alt: 'Taprobane' }) : null,
        // war pins
        chart ? visible.map((w) => {
          const st = pinState(w);
          return h('div', {
            key: w.id,
            className: 'map-pin' + (sel === w.id ? ' sel' : '') + (st === 'record' ? ' record' : ''),
            style: {
              left: (w.at[0] * 100) + '%', top: (w.at[1] * 100) + '%',
              '--pin': w.legend ? ERA_COLOR.legend : ERA_COLOR[w.era],
            },
            onClick: () => { G.audio.ui(); setSel(w.id); },
            title: w.name,
          },
            h('span', { className: 'map-pin-dot' }, st === 'done' ? '✓' : st === 'open' ? '⚔' : st === 'locked' ? '🔒' : '◆'),
            h('span', { className: 'map-pin-label' }, w.name));
        }) : null),

      // era filter rail
      h('div', { className: 'map-eras' },
        h('div', { className: 'map-eras-h' }, 'CHRONICLE ERAS'),
        ERAS.map((e) => h('button', {
          key: e.id,
          className: 'map-era-btn' + (era === e.id ? ' on' : ''),
          onClick: () => { G.audio.ui(); setEra(e.id); if (sel && e.id !== 'all' && selected && selected.era !== e.id) setSel(null); },
        },
          h('div', { className: 'me-name' }, e.label),
          h('div', { className: 'me-years' }, e.years))),
        h('button', { className: 'menu-btn small', style: { marginTop: 14 }, onClick: () => { G.audio.ui(); onBack(); } }, 'Back to Menu')),

      // chronicle panel
      selected ? h('div', { className: 'map-panel' },
        h('div', { className: 'brief-chapter' }, selected.year),
        h('div', { className: 'map-panel-title' }, selected.name),
        h('div', { className: 'map-panel-sides' }, selected.sides),
        h('div', { className: 'menu-rule', style: { width: '90%' } }),
        h('div', { className: 'map-panel-desc' }, selected.desc),
        h('div', { className: 'map-panel-result' }, '⚑ ' + selected.result),
        selected.playable === 'campaign'
          ? h('div', null,
            h('div', { className: 'brief-objectives-h' }, 'The Campaign'),
            order.map((id, i) => {
              const def = G.Levels.defs[id];
              const locked = (i + 1) > progress.unlocked;
              const done = !!progress.completed[id];
              return h('button', {
                key: id, disabled: locked,
                className: 'menu-btn small' + (done ? ' primary' : ''),
                onClick: () => { G.audio.uiConfirm(); onPlay(id); },
              }, `${def.chapter} — ${def.title}` + (done ? '  ✓' : locked ? '  🔒' : ''));
            }))
          : selected.playable
            ? h('button', {
              className: 'menu-btn primary',
              disabled: pinState(selected) === 'locked',
              onClick: () => { G.audio.uiConfirm(); onPlay(selected.playable); },
            }, pinState(selected) === 'locked' ? 'Finish the campaign to unlock'
              : selected.legend ? 'Enter the Legend' : 'March to War')
            : h('div', { className: 'map-panel-record' },
              'Recorded in the chronicles. This war becomes a playable Chronicles campaign in a later chapter of development — see ROADMAP.md.'),
      ) : h('div', { className: 'map-panel map-panel-empty' },
        h('div', { className: 'map-panel-desc' }, 'Choose a war upon the chart. Pins bearing ⚔ are playable now; ◆ marks are chronicle records awaiting their campaign.')),
    );
  }

  G.UI = G.UI || {};
  G.UI.CampaignMap = CampaignMap;
})();
