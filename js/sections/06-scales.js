(() => {
  function stepsFor(rootMidi, semis) {
    const all = [...semis, 12];
    const out = [];
    for (let i = 0; i < all.length - 1; i++) {
      const d = all[i + 1] - all[i];
      out.push([rootMidi + all[i], rootMidi + all[i + 1], d === 1 ? 'H' : d === 2 ? 'W' : 'W+H']);
    }
    return out;
  }

  function scaleKeyboard(root, type, from = 60) {
    const t = Theory.SCALE_TYPES[type];
    const pc = Theory.parse(root).pc;
    let r = from;
    while (((r % 12) + 12) % 12 !== pc) r++;
    const kFrom = r - pc; // the C at or below the root
    const names = Theory.scaleNotes(root, type);
    const hl = {};
    [...t.semis, 12].forEach((s, i) => { hl[r + s] = { cls: i === 0 || s === 12 ? 'root' : 'tone', label: Theory.pretty(names[i % names.length]) }; });
    return Diagrams.keyboard({ from: kFrom, to: kFrom + 23, highlights: hl, steps: stepsFor(r, t.semis), flats: names.some(n => /b/.test(n)) });
  }

  /** A fingered scale lesson block: fretboard + notation/TAB player. */
  function scaleBlock(id) {
    const sc = Theory.FINGERED_SCALES[id];
    const maxF = Math.max(...sc.notes.map(n => n[2]));
    const frets = Math.max(5, maxF + 2);
    const names = sc.notes.map(n => n[0]);
    return `<div class="scale-block card" data-scale="${id}">
      <div class="scale-head"><h4>${sc.title}</h4><span class="badge">${sc.position}</span></div>
      <p>${sc.tip}</p>
      <div class="scale-notes">${names.map((n, i) => `<span class="${i === 0 || i === names.length - 1 ? 'root' : ''}">${Theory.pretty(n)}</span>`).join('<i>→</i>')}</div>
      <div class="fb-toolbar"><span>Labels:</span>
        <label class="chk"><input type="radio" name="lab-${id}" value="finger" checked> finger numbers</label>
        <label class="chk"><input type="radio" name="lab-${id}" value="name"> note names</label>
      </div>
      <div class="scale-fb" id="fb-${id}"></div>
      <div data-score-player="scale:${id}" data-bpm="70" data-fretboard-target="#fb-${id}"></div>
    </div>`;
  }

  function mountScaleBlock(block) {
    const id = block.dataset.scale;
    const sc = Theory.FINGERED_SCALES[id];
    const maxF = Math.max(...sc.notes.map(n => n[2]));
    const frets = Math.max(5, maxF + 2);
    const fb = block.querySelector('.scale-fb');
    const draw = mode => {
      const seen = new Set();
      const marks = [];
      sc.notes.forEach(([n, s, f, fi], i) => {
        const k = s + ':' + f;
        if (seen.has(k)) return;
        seen.add(k);
        marks.push({ s, f, midi: Theory.STD_MIDI[s] + f, label: mode === 'name' ? Theory.pretty(n) : (fi === 0 ? '○' : String(fi)), cls: n.replace(/\d/, '') === sc.root ? 'root' : '' });
      });
      fb.innerHTML = Diagrams.fretboard({ frets, marks });
    };
    draw('finger');
    block.querySelectorAll('input[type="radio"]').forEach(r => r.addEventListener('change', () => draw(r.value)));
    fb.addEventListener('click', e => { const g = e.target.closest('[data-midi]'); if (g) Sound.pluck(+g.dataset.midi); });
  }

  function explorer(el) {
    const roots = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    el.innerHTML = `
      <div class="strum-controls">
        <label>Root <select data-k="root">${roots.map(r => `<option value="${r}">${Theory.pretty(r)}</option>`).join('')}</select></label>
        <label>Scale <select data-k="type">${Object.entries(Theory.SCALE_TYPES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label>
        ${UI.btn('Play scale', 'data-k="play"', 'play')}
      </div>
      <div class="explorer-notes"></div>
      <div class="kb-wrap explorer-kb"></div>
      <div class="explorer-fb"></div>
      <div class="score-paper explorer-staff"></div>`;
    const rootSel = el.querySelector('[data-k="root"]');
    const typeSel = el.querySelector('[data-k="type"]');
    let seq = [];
    function update() {
      const root = rootSel.value, type = typeSel.value;
      const t = Theory.SCALE_TYPES[type];
      const names = Theory.scaleNotes(root, type);
      const r = 60 + Theory.parse(root).pc;
      seq = [...t.semis, 12].map(s => r + s);
      el.querySelector('.explorer-notes').innerHTML = `<div class="scale-notes">${names.map((n, i) => `<span class="${i === 0 ? 'root' : ''}">${Theory.pretty(n)}</span>`).join('')}<span class="root">${Theory.pretty(names[0])}</span></div>
        <div class="caption">Step pattern: ${t.pattern.join(' – ')} &nbsp;(W = whole step = 2 frets, H = half step = 1 fret)</div>`;
      el.querySelector('.explorer-kb').innerHTML = scaleKeyboard(root, type);
      const pcs = t.semis.map(s => (Theory.parse(root).pc + s) % 12);
      const marks = [];
      Theory.STD_MIDI.forEach((open, s) => {
        for (let f = 0; f <= 12; f++) {
          const i = pcs.indexOf((open + f) % 12);
          if (i >= 0) marks.push({ s, f, midi: open + f, label: Theory.pretty(names[i]), cls: i === 0 ? 'root' : 'tone' });
        }
      });
      el.querySelector('.explorer-fb').innerHTML = Diagrams.fretboard({ frets: 12, marks });
      // staff
      let prev = r - 1;
      const withOct = [...names, names[0]].map(n => { const nm = Theory.withOctaveAbove(n, prev + 1); prev = Theory.toMidi(nm); return nm; });
      Notation.render(el.querySelector('.explorer-staff'), { time: '4/4', showTime: false, tab: false, maxWidth: 760, notes: withOct.map(n => ({ n, d: 'q' })) });
    }
    rootSel.addEventListener('change', update);
    typeSel.addEventListener('change', update);
    el.querySelector('.explorer-fb').addEventListener('click', e => { const g = e.target.closest('[data-midi]'); if (g) Sound.pluck(+g.dataset.midi); });
    el.querySelector('.explorer-kb').addEventListener('click', e => { const g = e.target.closest('[data-midi]'); if (g) Sound.pluck(+g.dataset.midi); });
    el.querySelector('[data-k="play"]').addEventListener('click', () => {
      const staff = el.querySelector('.explorer-staff');
      const score = staff._score;
      Notation.play(score, { bpm: 120, countIn: 0 });
    });
    update();
  }

  function jam(el) {
    const loop = ['Am', 'G', 'F', 'G'];
    el.innerHTML = `
      <div class="strum-controls">
        ${UI.btn('Start backing track', 'data-k="go"', 'play')}
        <span class="jam-chord">Backing: ${loop.join(' → ')}</span>
        <span class="jam-now"></span>
      </div>
      <p class="caption">Click the highlighted notes below — any of them, in any order, any rhythm. Try starting and ending your phrases on <b>A</b> (the darker circles).</p>
      <div class="jam-fb"></div>`;
    const pcs = [9, 0, 2, 4, 7];
    const names = ['A', 'C', 'D', 'E', 'G'];
    const marks = [];
    Theory.STD_MIDI.forEach((open, s) => {
      for (let f = 0; f <= 12; f++) {
        const i = pcs.indexOf((open + f) % 12);
        if (i >= 0) marks.push({ s, f, midi: open + f, label: names[i], cls: i === 0 ? 'root' : 'tone' });
      }
    });
    const fb = el.querySelector('.jam-fb');
    fb.innerHTML = Diagrams.fretboard({ frets: 12, marks });
    fb.addEventListener('click', e => {
      const g = e.target.closest('[data-midi]');
      if (!g) return;
      Sound.pluck(+g.dataset.midi, 0, { velocity: 0.9 });
      g.classList.add('pulse');
      setTimeout(() => g.classList.remove('pulse'), 300);
    });
    let h = null;
    const go = el.querySelector('[data-k="go"]');
    const stop = () => { if (h) h.stop(); h = null; go.innerHTML = UI.ICONS.play + '<span>Start backing track</span>'; el.querySelector('.jam-now').textContent = ''; };
    go.addEventListener('click', () => {
      if (h) { stop(); return; }
      const events = [];
      const pat = ['D', '', 'D', 'U', '', 'U', 'D', 'U'];
      loop.forEach((c, ci) => {
        const midis = Sound.chordMidis(c);
        events.push({ beat: ci * 4, c, run: () => {} });
        pat.forEach((s, k) => { if (s) events.push({ beat: ci * 4 + k * 0.5, run: t => Sound.strum(midis, t, s === 'D' ? 'down' : 'up', { velocity: s === 'D' ? 0.32 : 0.22 }) }); });
      });
      go.innerHTML = UI.ICONS.stop + '<span>Stop</span>';
      h = Sound.play(events, { bpm: 84, loopBeats: 16, onVisual: ev => { if (ev.c) el.querySelector('.jam-now').innerHTML = `Now: <b>${ev.c}</b>`; } });
    });
    el._stop = stop;
  }

  UI.section({
    id: 'scales', num: 6, title: 'Scales', short: 'Scales',
    blurb: 'Learn what a scale is, play major, minor and pentatonic scales with notation and TAB, improvise over a backing track, and explore any scale on the fretboard.',
    lessons: [
      {
        id: 'what', title: 'What is a scale?',
        render: () => `
          <p>A <b>scale</b> is a set of notes played in order, going up or down, starting and ending on the same letter (the <b>root</b> or “home” note).
          Scales are the building blocks of melodies — most tunes use the notes of one scale. Practising them also trains your fingers and ears.</p>
          <p>Every <b>major scale</b> follows the same pattern of whole steps (<b>W</b>) and half steps (<b>H</b>):</p>
          <div class="pattern-strip">${['W', 'W', 'H', 'W', 'W', 'W', 'H'].map((s, i) => `<span class="ps-${s}" style="animation-delay:${i * 0.15}s">${s}</span>`).join('')}</div>
          <p>Starting from C, this pattern gives only white keys — C D E F G A B C. That’s why C major is the first scale everyone learns.</p>
          <div class="card">${scaleKeyboard('C', 'major')}</div>
          <div class="btn-row">${UI.btn('Hear C major', 'data-play-notes="C4 D4 E4 F4 G4 A4 B4 C5" data-gap="0.35"', 'sound')}${UI.btn('Hear it backwards', 'data-play-notes="C5 B4 A4 G4 F4 E4 D4 C4" data-gap="0.35"', 'sound', 'btn-ghost')}</div>
          ${UI.callout('info', 'Do-Re-Mi', 'You probably already know the major scale — it’s the “Do, Re, Mi, Fa, So, La, Ti, Do” song!')}`,
      },
      {
        id: 'c-major', title: 'The C major scale',
        render: () => `
          <p>Here it is on your ukulele. Follow the fretboard for the fingering, read the notation and TAB, then press Play — the fretboard lights up as each note sounds.
          The scale goes up and then back down.</p>
          ${scaleBlock('C-major')}
          ${UI.callout('tip', 'Practise like a pro', 'Start slowly with the metronome on. Aim for every note to be even in volume and length. When you can play it 3 times in a row without a mistake, speed up by 5 bpm.')}`,
        mount: el => el.querySelectorAll('.scale-block').forEach(mountScaleBlock),
      },
      {
        id: 'more-major', title: 'More major scales',
        render: () => `
          <p>The same W-W-H-W-W-W-H pattern starting on a different note gives a different major scale. Starting on D, we need two sharps (F♯ and C♯) to keep the pattern.</p>
          <div class="card">${scaleKeyboard('D', 'major')}</div>
          ${scaleBlock('D-major')}
          <p>Now move <b>up the neck</b>. On the ukulele, notes repeat higher up on other strings, so you can play a scale in many places.</p>
          ${scaleBlock('G-major')}`,
        mount: el => el.querySelectorAll('.scale-block').forEach(mountScaleBlock),
      },
      {
        id: 'minor', title: 'Minor scales',
        render: () => `
          <p>The <b>natural minor scale</b> uses a different pattern: <b>W – H – W – W – H – W – W</b>. Its third note is a half step lower than in the major scale — just like minor chords! — so it sounds darker.</p>
          <div class="pattern-strip">${['W', 'H', 'W', 'W', 'H', 'W', 'W'].map((s, i) => `<span class="ps-${s}" style="animation-delay:${i * 0.15}s">${s}</span>`).join('')}</div>
          <h3>Relative minor: a secret twin</h3>
          <p>Play the C major scale but start and end on <b>A</b>: A B C D E F G A. That’s the <b>A natural minor</b> scale — same notes, different home. A minor is called the <b>relative minor</b> of C major.
          Every major key has one: count down three half steps from the root.</p>
          <div class="card">${scaleKeyboard('A', 'minor', 57)}</div>
          <div class="btn-row">${UI.btn('Hear A natural minor', 'data-play-notes="A3 B3 C4 D4 E4 F4 G4 A4" data-gap="0.35"', 'sound')}${UI.btn('Compare: A major', 'data-play-notes="A3 B3 C#4 D4 E4 F#4 G#4 A4" data-gap="0.35"', 'sound', 'btn-ghost')}</div>
          <h3>D minor on your ukulele</h3>
          <p>On a standard (high-G) ukulele, D minor sits neatly in open position. Compare it with C major — the shape is almost the same!</p>
          ${scaleBlock('D-minor')}`,
        mount: el => el.querySelectorAll('.scale-block').forEach(mountScaleBlock),
      },
      {
        id: 'pentatonic', title: 'Pentatonic scales and improvising',
        render: () => `
          <p><b>Penta</b> means five: pentatonic scales have just five notes. By leaving out the two notes that make half steps, every note sounds good with every other — perfect for making up your own melodies (improvising).</p>
          ${scaleBlock('C-majpent')}
          <h3>A minor pentatonic</h3>
          <p><b>A minor pentatonic</b> uses exactly the same five notes as C major pentatonic (A C D E G), but with A as home. It’s the sound of blues and rock solos.</p>
          ${scaleBlock('A-minpent')}
          <h3>Jam session!</h3>
          <p>Start the backing track and improvise using the A minor pentatonic notes. There are no wrong notes here — just have fun and listen.</p>
          <div class="card" data-widget="jam" data-stoppable></div>`,
        mount: el => {
          el.querySelectorAll('.scale-block').forEach(mountScaleBlock);
          jam(el.querySelector('[data-widget="jam"]'));
        },
      },
      {
        id: 'explorer', title: 'Scale explorer',
        render: () => `<p>Choose any root and scale type to see its notes on the keyboard, every place it appears on your fretboard (frets 0–12), and how it’s written on the staff.</p>
          <div class="card" data-widget="explorer"></div>`,
        mount: el => explorer(el.querySelector('[data-widget="explorer"]')),
      },
      {
        id: 'practice', title: 'Your daily practice plan',
        render: () => `
          <p>Little and often beats long and rare. Fifteen focused minutes a day will make you a confident player in a few weeks.</p>
          <div class="practice-plan">
            <div class="pp"><div class="pp-min">2 min</div><div><b>Tune up</b><br>Use the <a href="#/tuner">Tuner</a>. Always start in tune!</div></div>
            <div class="pp"><div class="pp-min">3 min</div><div><b>Warm up with a scale</b><br>C major, slowly, up and down with the metronome.</div></div>
            <div class="pp"><div class="pp-min">4 min</div><div><b>Chord changes</b><br>Pick the two chords you find hardest and use the <a href="#/chords/changing">chord change trainer</a>.</div></div>
            <div class="pp"><div class="pp-min">4 min</div><div><b>Play a song</b><br>Play along with one of the songs. Enjoy it!</div></div>
            <div class="pp"><div class="pp-min">2 min</div><div><b>Something new</b><br>A new chord, a new strum, or a few minutes reading notation.</div></div>
          </div>
          ${UI.callout('tip', 'Sore fingertips?', 'Totally normal for the first couple of weeks — your fingertips will toughen up. Take short breaks, and never play through sharp pain.')}`,
      },
    ],
  });
})();
