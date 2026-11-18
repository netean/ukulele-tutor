/* SVG diagram builders. Every diagram respects the left-handed setting:
 * Settings.lefty === true mirrors chord charts (A E C G left→right) and puts
 * the headstock on the RIGHT of horizontal fretboards. */
const Settings = {
  lefty: true,
};

const Diagrams = (() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NAMES = Theory.STRING_NAMES; // G C E A

  // ------------------------------------------------------------------
  // Vertical chord diagram
  // ------------------------------------------------------------------
  function chord(sym, opts = {}) {
    const info = Theory.chordInfo(sym);
    const lefty = opts.lefty ?? Settings.lefty;
    const anim = opts.animate ? ' animate' : '';
    const showNotes = opts.showNotes ?? false;
    const maxFret = Math.max(...info.frets);
    const nFrets = Math.max(4, maxFret <= 4 ? 4 : 5);
    const sx = 26, gap = 28, top = 52, fh = 32;
    const W = sx * 2 + gap * 3;
    const H = top + fh * nFrets + (showNotes ? 46 : 28);
    const order = lefty ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const colOf = s => order.indexOf(s);
    const x = s => sx + colOf(s) * gap;
    let out = `<svg class="chord-diagram${anim}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(Theory.chordName(sym))} chord diagram (${lefty ? 'left' : 'right'}-handed view)" data-chord-svg="${esc(sym)}">`;
    out += `<text class="cd-title" x="${W / 2}" y="20" text-anchor="middle">${esc(Theory.pretty(info.root) + sym.slice(info.root.length))}</text>`;
    // fretboard background
    out += `<rect class="cd-board" x="${sx}" y="${top}" width="${gap * 3}" height="${fh * nFrets}"/>`;
    // nut
    out += `<rect class="cd-nut" x="${sx - 3}" y="${top - 5}" width="${gap * 3 + 6}" height="6" rx="1.5"/>`;
    for (let f = 1; f <= nFrets; f++) out += `<line class="cd-fret" x1="${sx}" x2="${sx + gap * 3}" y1="${top + f * fh}" y2="${top + f * fh}"/>`;
    for (let s = 0; s < 4; s++) out += `<line class="cd-string" data-s="${s}" x1="${x(s)}" x2="${x(s)}" y1="${top}" y2="${top + fh * nFrets}" style="stroke-width:${1.2 + (s === 1 ? 0.6 : s === 2 ? 0.4 : s === 0 ? 0.2 : 0)}"/>`;
    // fret numbers
    for (let f = 1; f <= nFrets; f++) out += `<text class="cd-fretnum" x="${lefty ? W - 6 : 6}" y="${top + f * fh - fh / 2 + 4}" text-anchor="${lefty ? 'end' : 'start'}">${f}</text>`;
    // open / muted markers
    info.frets.forEach((f, s) => {
      if (f === 0) out += `<circle class="cd-open" cx="${x(s)}" cy="${top - 15}" r="6"/>`;
      if (f < 0) out += `<text class="cd-muted" x="${x(s)}" y="${top - 10}" text-anchor="middle">×</text>`;
    });
    // barre
    let k = 0;
    if (info.barre) {
      const b = info.barre;
      const xs = [x(b.from), x(b.to)];
      const x1 = Math.min(...xs) - 11, x2 = Math.max(...xs) + 11;
      const cy = top + b.fret * fh - fh / 2;
      out += `<g class="cd-dot" style="animation-delay:${(k++) * 0.25}s"><rect class="cd-dotc cd-barre" x="${x1}" y="${cy - 11}" width="${x2 - x1}" height="22" rx="11"/>`;
      out += `<text class="cd-finger" x="${(x1 + x2) / 2}" y="${cy + 5}" text-anchor="middle">${b.finger}</text></g>`;
    }
    // dots
    info.frets.forEach((f, s) => {
      if (f <= 0) return;
      if (info.barre && info.barre.fret === f && s >= info.barre.from && s <= info.barre.to) return;
      const cy = top + f * fh - fh / 2;
      const d = (k++) * 0.25;
      out += `<g class="cd-dot" style="animation-delay:${d}s"><circle class="cd-dotc" cx="${x(s)}" cy="${cy}" r="11"/>`;
      if (info.fingers[s]) out += `<text class="cd-finger" x="${x(s)}" y="${cy + 5}" text-anchor="middle">${info.fingers[s]}</text>`;
      out += `</g>`;
    });
    // string labels
    const ly = top + fh * nFrets + 18;
    for (let s = 0; s < 4; s++) out += `<text class="cd-label" x="${x(s)}" y="${ly}" text-anchor="middle">${NAMES[s]}</text>`;
    if (showNotes) {
      info.played.forEach((n, s) => {
        if (n) out += `<text class="cd-note" x="${x(s)}" y="${ly + 18}" text-anchor="middle">${esc(Theory.pretty(n))}</text>`;
      });
    }
    out += `</svg>`;
    return out;
  }

  // ------------------------------------------------------------------
  // Horizontal fretboard (player's view; same string order as TAB: A on top)
  // marks: [{s, f, label, cls}]  s = 0..3 (G C E A)
  // ------------------------------------------------------------------
  function fretboard(opts = {}) {
    const lefty = opts.lefty ?? Settings.lefty;
    const frets = opts.frets ?? 12;
    const marks = opts.marks || [];
    const showAll = !!opts.showAll;
    const strings = opts.strings || Theory.STD_MIDI; // midi of open strings G C E A
    const names = opts.names || NAMES;
    const n = strings.length;
    const open = 46; // space for open-string notes beyond the nut
    const fw = opts.fretWidth || 58;
    const sg = 30, pad = 30;
    const boardW = fw * frets;
    const W = open + boardW + pad * 2 + 18;
    const H = sg * (n - 1) + 2 * 34 + 20;
    const y0 = 34;
    // rows: highest string index (A) on top, matching TAB
    const rows = [...Array(n).keys()].reverse();
    const yOf = s => y0 + rows.indexOf(s) * sg;
    // nut position
    const nutX = lefty ? W - pad - open : pad + open;
    const dir = lefty ? -1 : 1;
    const fx = f => nutX + dir * f * fw; // fret wire position
    const cx = f => (f === 0 ? nutX - dir * open / 2 : nutX + dir * (f - 0.5) * fw); // note centre
    let out = `<svg class="fretboard" viewBox="0 0 ${W} ${H}" style="max-width:${Math.round(W * 1.12)}px" role="img" aria-label="Fretboard diagram, ${lefty ? 'headstock on the right (left-handed)' : 'headstock on the left (right-handed)'}">`;
    const bx1 = Math.min(fx(0), fx(frets)), bx2 = Math.max(fx(0), fx(frets));
    out += `<rect class="fb-wood" x="${bx1}" y="${y0 - 16}" width="${bx2 - bx1}" height="${sg * (n - 1) + 32}" rx="3"/>`;
    // inlay markers
    [3, 5, 7, 10, 12, 15].filter(f => f <= frets).forEach(f => {
      const midY = y0 + sg * (n - 1) / 2;
      if (f === 12) {
        out += `<circle class="fb-inlay" cx="${cx(f)}" cy="${midY - sg}" r="5"/><circle class="fb-inlay" cx="${cx(f)}" cy="${midY + sg}" r="5"/>`;
      } else if (f !== 3 || opts.inlay3) {
        out += `<circle class="fb-inlay" cx="${cx(f)}" cy="${midY}" r="5"/>`;
      }
    });
    for (let f = 1; f <= frets; f++) out += `<line class="fb-fret" x1="${fx(f)}" x2="${fx(f)}" y1="${y0 - 16}" y2="${y0 + sg * (n - 1) + 16}"/>`;
    out += `<rect class="fb-nut" x="${fx(0) - 4}" y="${y0 - 18}" width="8" height="${sg * (n - 1) + 36}" rx="2"/>`;
    // fret numbers
    for (let f = 1; f <= frets; f++) out += `<text class="fb-num" x="${cx(f)}" y="${H - 6}" text-anchor="middle">${f}</text>`;
    out += `<text class="fb-num" x="${cx(0)}" y="${H - 6}" text-anchor="middle">open</text>`;
    // strings
    rows.forEach(s => {
      const y = yOf(s);
      const x1 = lefty ? bx1 : fx(0);
      const x2 = lefty ? fx(0) : bx2;
      out += `<line class="fb-string" data-s="${s}" x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" style="stroke-width:${1.3 + (rows.length - 1 - rows.indexOf(s)) * 0.25}"/>`;
      // open-string extension towards headstock
      out += `<line class="fb-string fb-string-open" x1="${fx(0)}" x2="${fx(0) - dir * open}" y1="${y}" y2="${y}"/>`;
      const lx = lefty ? W - 10 : 10;
      out += `<text class="fb-sname" x="${lx}" y="${y + 5}" text-anchor="${lefty ? 'end' : 'start'}">${esc(names[s])}</text>`;
    });
    // clickable hit areas + optional all-note labels
    if (opts.clickable || showAll) {
      rows.forEach(s => {
        for (let f = 0; f <= frets; f++) {
          const midi = strings[s] + f;
          const w = f === 0 ? open : fw;
          const x = cx(f) - w / 2;
          out += `<g class="fb-cell" data-s="${s}" data-f="${f}" data-midi="${midi}">`;
          out += `<rect x="${x}" y="${yOf(s) - sg / 2}" width="${w}" height="${sg}" fill="transparent"/>`;
          if (showAll) {
            const nm = Theory.midiName(midi, opts.flats, false);
            const natural = nm.length === 1;
            out += `<circle class="fb-all ${natural ? '' : 'fb-sharp'}" cx="${cx(f)}" cy="${yOf(s)}" r="11"/><text class="fb-all-t" x="${cx(f)}" y="${yOf(s) + 4}" text-anchor="middle">${esc(Theory.pretty(nm))}</text>`;
          }
          out += `</g>`;
        }
      });
    }
    // marks
    marks.forEach((m, i) => {
      const cls = m.cls || '';
      out += `<g class="fb-mark ${cls}" data-mark="${i}" data-s="${m.s}" data-f="${m.f}" ${m.midi !== undefined ? `data-midi="${m.midi}"` : ''}>`;
      out += `<circle cx="${cx(m.f)}" cy="${yOf(m.s)}" r="12.5"/>`;
      if (m.label !== undefined && m.label !== '') out += `<text x="${cx(m.f)}" y="${yOf(m.s) + 4.5}" text-anchor="middle">${esc(m.label)}</text>`;
      out += `</g>`;
    });
    // headstock hint
    const hx = lefty ? W - pad - open / 2 : pad + open / 2;
    out += `<text class="fb-hint" x="${hx}" y="12" text-anchor="middle">headstock ${lefty ? '→' : '←'}</text>`;
    out += `</svg>`;
    return out;
  }

  // ------------------------------------------------------------------
  // Labelled ukulele (front view, headstock up)
  // ------------------------------------------------------------------
  const PARTS = {
    headstock: { label: 'Headstock', text: 'The top end of the ukulele. It holds the tuning pegs.' },
    tuners: { label: 'Tuning pegs', text: 'Turn these to tighten (raise the pitch) or loosen (lower the pitch) each string. Also called tuners or machine heads.' },
    nut: { label: 'Nut', text: 'A small strip (often white) the strings rest on at the top of the neck. A string played without pressing any fret is an “open string” and vibrates from the nut to the saddle.' },
    neck: { label: 'Neck', text: 'The long part you hold with your fretting hand — for a left-handed player, that’s your RIGHT hand.' },
    fretboard: { label: 'Fretboard', text: 'The flat front of the neck, where you press the strings down. Also called the fingerboard.' },
    frets: { label: 'Frets', text: 'Thin metal strips across the fretboard. Pressing a string just behind a fret shortens it, making a higher note. Each fret = one half step higher.' },
    markers: { label: 'Position markers', text: 'Dots that help you find your place. Usually at frets 5, 7, 10 and 12 (and sometimes 3).' },
    body: { label: 'Body', text: 'The hollow wooden box that makes the sound louder and richer.' },
    soundhole: { label: 'Sound hole', text: 'Lets the sound out of the body. Strum near where the neck meets the body for the sweetest tone.' },
    bridge: { label: 'Bridge', text: 'Glued to the body; it anchors the strings at the bottom end.' },
    saddle: { label: 'Saddle', text: 'A thin strip on the bridge that the strings pass over. Strings vibrate between the nut and the saddle.' },
    strings: { label: 'Strings', text: 'Four nylon strings. On a left-handed ukulele, looking at the front with the headstock up, they read A E C G from left to right.' },
  };

  function ukulele(opts = {}) {
    const lefty = opts.lefty ?? Settings.lefty;
    const L = 470, nutY = 106;
    const fretY = n => nutY + L * (1 - Math.pow(2, -n / 12));
    const xs = [126, 142, 158, 174];
    const order = lefty ? ['A', 'E', 'C', 'G'] : ['G', 'C', 'E', 'A'];
    let s = `<svg class="uke-svg" viewBox="-160 0 620 650" role="img" aria-label="Labelled ukulele">`;
    s += `<defs>
      <linearGradient id="wood" x1="0" x2="1"><stop offset="0" stop-color="#b8743a"/><stop offset="0.5" stop-color="#d79a5a"/><stop offset="1" stop-color="#a8652f"/></linearGradient>
      <radialGradient id="hole"><stop offset="0" stop-color="#1b0f07"/><stop offset="1" stop-color="#3a2212"/></radialGradient>
    </defs>`;
    // body
    s += `<g class="part" data-part="body"><path class="uke-body" d="M150,330 C215,330 238,370 228,420 C222,448 210,455 218,475 C250,520 262,560 245,600 C228,642 72,642 55,600 C38,560 50,520 82,475 C90,455 78,448 72,420 C62,370 85,330 150,330 Z" fill="url(#wood)"/></g>`;
    s += `<g class="part" data-part="soundhole"><circle cx="150" cy="430" r="31" fill="url(#hole)"/><circle cx="150" cy="430" r="36" fill="none" stroke="#6b3d1b" stroke-width="2.5"/></g>`;
    // headstock
    s += `<g class="part" data-part="headstock"><path d="M116,104 L110,22 C120,8 140,16 150,8 C160,16 180,8 190,22 L184,104 Z" fill="#7a4520"/></g>`;
    // tuners
    s += `<g class="part" data-part="tuners">`;
    [40, 78].forEach(y => {
      s += `<rect x="78" y="${y - 7}" width="34" height="14" rx="5" fill="#e9e1d0" stroke="#8f8574"/><rect x="188" y="${y - 7}" width="34" height="14" rx="5" fill="#e9e1d0" stroke="#8f8574"/>`;
      s += `<circle cx="132" cy="${y}" r="6" fill="#c9c2b0" stroke="#776f60"/><circle cx="168" cy="${y}" r="6" fill="#c9c2b0" stroke="#776f60"/>`;
    });
    s += `</g>`;
    // neck/fretboard
    const endY = fretY(14);
    s += `<g class="part" data-part="neck"><path d="M114,106 L186,106 L190,${endY + 8} L110,${endY + 8} Z" fill="#8a5428"/></g>`;
    s += `<g class="part" data-part="fretboard"><path d="M118,106 L182,106 L186,${endY} L114,${endY} Z" fill="#3b2516"/></g>`;
    s += `<g class="part" data-part="frets">`;
    for (let n = 1; n <= 14; n++) {
      const y = fretY(n);
      const w = 32 + (y - 106) / (endY - 106) * 4;
      s += `<line x1="${150 - w}" x2="${150 + w}" y1="${y}" y2="${y}" stroke="#d8d8d8" stroke-width="2"/>`;
    }
    s += `</g>`;
    s += `<g class="part" data-part="markers">`;
    [5, 7, 10].forEach(n => { s += `<circle cx="150" cy="${(fretY(n) + fretY(n - 1)) / 2}" r="4.5" fill="#f3efe6"/>`; });
    const y12 = (fretY(12) + fretY(11)) / 2;
    s += `<circle cx="140" cy="${y12}" r="4" fill="#f3efe6"/><circle cx="160" cy="${y12}" r="4" fill="#f3efe6"/></g>`;
    s += `<g class="part" data-part="nut"><rect x="116" y="100" width="68" height="7" rx="2" fill="#f4f0e4" stroke="#bdb6a3"/></g>`;
    // bridge + saddle
    s += `<g class="part" data-part="bridge"><rect x="100" y="566" width="100" height="22" rx="5" fill="#3b2516"/></g>`;
    s += `<g class="part" data-part="saddle"><rect x="118" y="572" width="64" height="5" rx="2" fill="#f4f0e4"/></g>`;
    // strings
    s += `<g class="part" data-part="strings">`;
    xs.forEach((x, i) => {
      const post = i < 2 ? 132 : 168;
      const py = i % 2 === 0 ? 78 : 40;
      s += `<line x1="${x}" y1="574" x2="${x}" y2="103" stroke="#f5f1e8" stroke-width="${1.6 + (order[i] === 'C' ? 0.8 : order[i] === 'E' ? 0.5 : 0.2)}"/><line x1="${x}" y1="103" x2="${post}" y2="${py}" stroke="#f5f1e8" stroke-width="1.4"/>`;
      s += `<text class="uke-strname" x="${x}" y="612" text-anchor="middle">${order[i]}</text>`;
    });
    s += `</g>`;
    // labels: [part, label side, anchor x,y, text y]
    const labels = [
      ['headstock', 'L', 112, 60, 22], ['tuners', 'R', 222, 40, 40], ['nut', 'L', 116, 103, 104],
      ['fretboard', 'R', 186, 170, 165], ['frets', 'L', 117, fretY(3), 175], ['markers', 'R', 155, (fretY(5) + fretY(4)) / 2, 230],
      ['neck', 'L', 112, 290, 270], ['soundhole', 'R', 186, 430, 400], ['strings', 'L', 126, 500, 345],
      ['body', 'L', 60, 540, 520], ['bridge', 'R', 200, 578, 570], ['saddle', 'L', 118, 574, 600],
    ];
    labels.forEach(([p, side, ax, ay, ty]) => {
      const tx = side === 'L' ? -20 : 320;
      s += `<g class="part-label" data-part="${p}"><polyline points="${ax},${ay} ${side === 'L' ? tx + 92 : tx - 12},${ty} ${side === 'L' ? tx + 100 : tx - 4},${ty}" fill="none"/>`;
      s += `<text x="${side === 'L' ? tx + 88 : tx}" y="${ty + 5}" text-anchor="${side === 'L' ? 'end' : 'start'}">${PARTS[p].label}</text></g>`;
    });
    s += `</svg>`;
    return s;
  }

  // ------------------------------------------------------------------
  // How to hold it (abstract illustration)
  // ------------------------------------------------------------------
  function holding(opts = {}) {
    const lefty = opts.lefty ?? Settings.lefty;
    const W = 640, H = 340;
    const mx = x => (lefty ? x : W - x);
    // Drawn from the player's own point of view: for a left-handed player the
    // neck points to the RIGHT. Text is placed separately so it never mirrors.
    let s = `<svg class="hold-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="How to hold a ${lefty ? 'left' : 'right'}-handed ukulele">`;
    s += `<g transform="${lefty ? '' : `translate(${W},0) scale(-1,1)`}">`;
    s += `<g transform="rotate(-14 300 190)">`;
    // body (horizontal)
    s += `<path d="M170,190 C170,128 132,112 92,120 C70,124 62,140 48,136 C10,124 -10,150 -10,190 C-10,230 10,256 48,244 C62,240 70,256 92,260 C132,268 170,252 170,190 Z" transform="translate(70,0)" fill="#c98a4b" stroke="#8a5428" stroke-width="3"/>`;
    s += `<circle cx="190" cy="190" r="26" fill="#2b170b"/>`;
    s += `<rect x="215" y="174" width="300" height="32" fill="#3b2516"/>`;
    for (let i = 1; i <= 12; i++) { const x = 515 - 300 * (1 - Math.pow(2, -i / 12)) * 1.6; if (x > 225) s += `<line x1="${x}" x2="${x}" y1="174" y2="206" stroke="#ccc" stroke-width="2"/>`; }
    s += `<rect x="512" y="172" width="6" height="36" fill="#f4f0e4"/>`;
    s += `<path d="M518,170 L585,162 L590,218 L518,210 Z" fill="#7a4520"/>`;
    s += `<rect x="90" y="180" width="14" height="20" rx="3" fill="#3b2516"/>`;
    [178, 186, 194, 202].forEach(y => { s += `<line x1="97" x2="518" y1="${y}" y2="${y}" stroke="#f5f1e8" stroke-width="1.3"/>`; });
    s += `</g></g>`;
    // annotations (not mirrored text)
    s += `<g class="hold-ann">`;
    s += `<circle cx="${mx(440)}" cy="150" r="30" class="hand-zone fret-zone"/><text x="${mx(440)}" y="100" text-anchor="middle" class="ann-strong">${lefty ? 'RIGHT' : 'LEFT'} hand</text><text x="${mx(440)}" y="80" text-anchor="middle" class="ann">frets the notes</text>`;
    s += `<circle cx="${mx(230)}" cy="198" r="34" class="hand-zone strum-zone"/><text x="${mx(230)}" y="275" text-anchor="middle" class="ann-strong">${lefty ? 'LEFT' : 'RIGHT'} hand</text><text x="${mx(230)}" y="295" text-anchor="middle" class="ann">strums here — where the neck meets the body</text>`;
    s += `<path class="strum-arrow" d="M${mx(275)},160 L${mx(275)},236" marker-end="url(#arr)"/>`;
    s += `<defs><marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>`;
    s += `<text x="${mx(30)}" y="30" text-anchor="${lefty ? 'start' : 'end'}" class="ann">↑ ceiling side: G string (nearest your chin)</text>`;
    s += `<text x="${mx(30)}" y="330" text-anchor="${lefty ? 'start' : 'end'}" class="ann">↓ floor side: A string</text>`;
    s += `<text x="${mx(600)}" y="30" text-anchor="${lefty ? 'end' : 'start'}" class="ann">neck points to your ${lefty ? 'right' : 'left'} ${lefty ? '→' : '←'}</text>`;
    s += `</g></svg>`;
    return s;
  }

  // ------------------------------------------------------------------
  // Fretting hand with finger numbers
  // ------------------------------------------------------------------
  function hand(opts = {}) {
    const lefty = opts.lefty ?? Settings.lefty;
    const W = 260, H = 320;
    let s = `<svg class="hand-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${lefty ? 'Right' : 'Left'} hand finger numbers">`;
    s += `<g transform="${lefty ? '' : `translate(${W},0) scale(-1,1)`}">`;
    const fingers = [
      { n: 1, x: 84, y: 58, h: 128, name: 'Index' },
      { n: 2, x: 117, y: 34, h: 150, name: 'Middle' },
      { n: 3, x: 150, y: 48, h: 136, name: 'Ring' },
      { n: 4, x: 182, y: 88, h: 98, name: 'Little' },
    ];
    s += `<rect class="hand-skin" x="73" y="160" width="30" height="110" rx="15" transform="rotate(-35 88 270)"/>`;
    fingers.forEach(f => { s += `<rect class="hand-skin" x="${f.x}" y="${f.y}" width="30" height="${f.h}" rx="15"/>`; });
    s += `<rect class="hand-skin" x="78" y="150" width="138" height="140" rx="46"/>`;
    s += `<rect class="hand-palm-cover" x="80" y="152" width="134" height="40" rx="10"/>`;
    fingers.forEach((f, i) => {
      s += `<g class="finger-badge" style="animation-delay:${0.2 + i * 0.25}s"><circle cx="${f.x + 15}" cy="${f.y + 18}" r="13"/></g>`;
    });
    s += `<g class="finger-badge thumb" style="animation-delay:1.2s"><circle cx="37" cy="195" r="13"/></g>`;
    s += `</g>`;
    // text not mirrored
    const mx = x => (lefty ? x : W - x);
    fingers.forEach(f => { s += `<text class="finger-num" x="${mx(f.x + 15)}" y="${f.y + 23}" text-anchor="middle">${f.n}</text>`; });
    s += `<text class="finger-num" x="${mx(37)}" y="200" text-anchor="middle">T</text>`;
    s += `<text class="hand-caption" x="${W / 2}" y="${H - 6}" text-anchor="middle">${lefty ? 'Right' : 'Left'} hand (back view)</text>`;
    s += `</svg>`;
    return s;
  }

  // ------------------------------------------------------------------
  // Pitch "staircase" showing re-entrant tuning
  // ------------------------------------------------------------------
  function pitchStairs(opts = {}) {
    const strs = opts.lowG ? ['G3', 'C4', 'E4', 'A4'] : ['G4', 'C4', 'E4', 'A4'];
    const W = 360, H = 220, base = 190;
    const min = 52, scale = 7.5;
    let s = `<svg class="stairs-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Relative pitch of each string">`;
    s += `<line x1="20" x2="${W - 10}" y1="${base}" y2="${base}" class="axis"/>`;
    s += `<text x="12" y="20" class="ann">higher ↑</text>`;
    strs.forEach((n, i) => {
      const m = Theory.toMidi(n);
      const h = (m - min) * scale;
      const x = 50 + i * 78;
      s += `<g class="stair" data-play-note="${n}"><rect x="${x}" y="${base - h}" width="56" height="${h}" rx="6" class="stair-bar s${i}"/>`;
      s += `<text x="${x + 28}" y="${base - h - 8}" text-anchor="middle" class="stair-t">${n.replace('#', '♯')}</text>`;
      s += `<text x="${x + 28}" y="${base + 18}" text-anchor="middle" class="ann">${['4th', '3rd', '2nd', '1st'][i]} string</text></g>`;
    });
    s += `</svg>`;
    return s;
  }

  // ------------------------------------------------------------------
  // Piano keyboard. highlights: {midi: {cls, label}}
  // ------------------------------------------------------------------
  function keyboard(opts = {}) {
    const from = opts.from ?? 60, to = opts.to ?? 83;
    const hl = opts.highlights || {};
    const flats = !!opts.flats;
    const ww = 30, wh = 120, bw = 19, bh = 76;
    const isBlack = m => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
    const whites = [];
    for (let m = from; m <= to; m++) if (!isBlack(m)) whites.push(m);
    const W = whites.length * ww + 2;
    let s = `<svg class="keyboard-svg" viewBox="0 0 ${W} ${wh + 26}" role="img" aria-label="Piano keyboard">`;
    const xOfWhite = m => whites.indexOf(m) * ww + 1;
    whites.forEach(m => {
      const h = hl[m];
      s += `<g class="key white ${h ? h.cls || 'hl' : ''}" data-midi="${m}"><rect x="${xOfWhite(m)}" y="1" width="${ww}" height="${wh}" rx="3"/>`;
      if (h && h.label !== undefined) s += `<text class="key-hl" x="${xOfWhite(m) + ww / 2}" y="${wh - 26}" text-anchor="middle">${esc(h.label)}</text>`;
      const nm = Theory.midiName(m, flats, false);
      s += `<text class="key-name" x="${xOfWhite(m) + ww / 2}" y="${wh - 8}" text-anchor="middle">${nm}${(m % 12 === 0 && opts.octaves) ? Math.floor(m / 12) - 1 : ''}</text></g>`;
    });
    for (let m = from; m <= to; m++) {
      if (!isBlack(m)) continue;
      const left = m - 1;
      if (!whites.includes(left)) continue;
      const x = xOfWhite(left) + ww - bw / 2;
      const h = hl[m];
      s += `<g class="key black ${h ? h.cls || 'hl' : ''}" data-midi="${m}"><rect x="${x}" y="1" width="${bw}" height="${bh}" rx="2"/>`;
      if (h && h.label !== undefined) s += `<text class="key-hl" x="${x + bw / 2}" y="${bh - 10}" text-anchor="middle">${esc(h.label)}</text>`;
      s += `</g>`;
    }
    if (opts.steps) {
      // arcs between successive highlighted notes labelled W/H
      opts.steps.forEach(([a, b, lab], i) => {
        const xa = keyCenter(a), xb = keyCenter(b);
        const y = wh + 4;
        s += `<g class="step-arc" style="animation-delay:${i * 0.35}s"><path d="M${xa},${y} Q${(xa + xb) / 2},${y + 20} ${xb},${y}" fill="none"/><text x="${(xa + xb) / 2}" y="${y + 21}" text-anchor="middle">${lab}</text></g>`;
      });
    }
    function keyCenter(m) {
      if (!isBlack(m)) return xOfWhite(m) + ww / 2;
      return xOfWhite(m - 1) + ww;
    }
    s += `</svg>`;
    return s;
  }

  // ------------------------------------------------------------------
  // Size comparison of the ukulele family (bars to scale)
  // ------------------------------------------------------------------
  function sizes() {
    const data = [
      // [name, scale length cm, total length cm, tuning]
      ['Soprano', 33, 53, 'G C E A'], ['Concert', 38, 58, 'G C E A'], ['Tenor', 43, 66, 'G C E A (or low G)'],
      ['Baritone', 48, 76, 'D G B E'], ['Bass (U-Bass)', 52, 76, 'E A D G (very low!)'],
    ];
    const W = 740, rowH = 46;
    let s = `<svg class="sizes-svg" viewBox="0 0 ${W} ${data.length * rowH + 30}" role="img" aria-label="Ukulele sizes compared">`;
    data.forEach(([name, scaleCm, totalCm, tuning], i) => {
      const y = 14 + i * rowH;
      const scale = scaleCm / 2.54, total = totalCm / 2.54; // drawing proportions only
      const len = total * 13;
      const bodyLen = len * 0.42;
      s += `<text x="0" y="${y + 18}" class="size-name">${name}</text>`;
      s += `<g transform="translate(130,${y})"><rect class="size-neck" x="${bodyLen - 6}" y="9" width="${len - bodyLen - 22}" height="10" rx="2"/><rect class="size-head" x="${len - 30}" y="5" width="30" height="18" rx="4"/><ellipse class="size-body" cx="${bodyLen * 0.5}" cy="14" rx="${bodyLen * 0.52}" ry="${10 + scale * 0.55}"/><circle cx="${bodyLen * 0.62}" cy="14" r="${4 + scale * 0.12}" class="size-hole"/></g>`;
      s += `<text x="${130 + len + 12}" y="${y + 13}" class="size-meta">${totalCm} cm long · ${scaleCm} cm scale</text><text x="${130 + len + 12}" y="${y + 29}" class="size-tuning">${tuning}</text>`;
    });
    s += `</svg>`;
    return s;
  }

  return { chord, fretboard, ukulele, PARTS, holding, hand, pitchStairs, keyboard, sizes, esc };
})();
