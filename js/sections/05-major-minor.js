(() => {
  const MAJORS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb'];
  const MINORS = ['Am', 'Bm', 'Bbm', 'Cm', 'Dm', 'Em', 'Fm', 'F#m', 'Gm'];

  function recipeWidget(el) {
    el.innerHTML = `
      <div class="strum-controls">
        <label>Root note <select data-k="root">${['C', 'D', 'E', 'F', 'G', 'A'].map(r => `<option>${r}</option>`).join('')}</select></label>
        ${UI.btn('Build the MAJOR chord', 'data-k="maj"', 'play')}
        ${UI.btn('Build the MINOR chord', 'data-k="min"', 'play', 'btn-alt')}
      </div>
      <div class="kb-wrap" data-k="kb"></div>
      <div class="recipe-out" aria-live="polite"></div>`;
    const kb = el.querySelector('[data-k="kb"]');
    const out = el.querySelector('.recipe-out');
    const rootSel = el.querySelector('[data-k="root"]');
    const draw = (hl = {}, steps) => { kb.innerHTML = Diagrams.keyboard({ from: 60, to: 83, highlights: hl, steps }); };
    draw();
    let timers = [];
    function build(type) {
      timers.forEach(clearTimeout); timers = [];
      const root = rootSel.value;
      const r = 60 + Theory.parse(root).pc;
      const semis = type === 'major' ? [0, 4, 7] : [0, 3, 7];
      const names = Theory.chordNotes(root, type);
      const hl = {};
      let t = 0;
      // count half steps one key at a time
      const seq = [];
      for (let i = 0; i <= 7; i++) seq.push(r + i);
      seq.forEach((m, i) => {
        timers.push(setTimeout(() => {
          const isTone = semis.includes(i);
          if (isTone) hl[m] = { cls: i === 0 ? 'root' : 'tone', label: i === 0 ? 'R' : String(semis.indexOf(i) === 1 ? '3' : '5') };
          const cur = { ...hl, [m]: hl[m] || { cls: 'counting', label: String(i - (i > semis[1] ? semis[1] : 0)) } };
          draw(cur);
          Sound.pluck(m, 0, { velocity: isTone ? 0.75 : 0.35, length: 0.25 });
        }, t));
        t += 330;
      });
      timers.push(setTimeout(() => {
        const s1 = semis[1], s2 = semis[2] - semis[1];
        draw(hl, [[r, r + semis[1], s1 + ' half steps'], [r + semis[1], r + semis[2], s2 + ' half steps']]);
        Sound.strum([r, r + semis[1], r + semis[2]], 0, 'down', { gap: 0.01 });
        out.innerHTML = `<b>${Theory.pretty(root)} ${type}</b> = ${names.map(Theory.pretty).join(' + ')} &nbsp;→&nbsp; root, then <b>${s1}</b> half steps, then <b>${s2}</b> more.
          ${type === 'major' ? 'Sounds bright and happy.' : 'Sounds darker, sadder or more serious.'}`;
      }, t + 150));
    }
    el.querySelector('[data-k="maj"]').addEventListener('click', () => build('major'));
    el.querySelector('[data-k="min"]').addEventListener('click', () => build('minor'));
  }

  function pairRow(maj, min, explanation) {
    return `<div class="pair card">
      <div class="pair-charts">
        <div data-chord="${maj}" data-shownotes="1"></div>
        <div class="pair-arrow">→</div>
        <div data-chord="${min}" data-shownotes="1"></div>
      </div>
      <p>${explanation}</p>
      <div class="btn-row">${UI.btn(Theory.chordName(maj), `data-play-chord="${maj}"`, 'sound', 'btn-small')}${UI.btn(Theory.chordName(min), `data-play-chord="${min}"`, 'sound', 'btn-small btn-alt')}</div>
    </div>`;
  }

  function builder(el) {
    const roots = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    el.innerHTML = `
      <div class="strum-controls">
        <label>Root <select data-k="root">${roots.map(r => `<option value="${r}">${Theory.pretty(r)}</option>`).join('')}</select></label>
        <label>Type <select data-k="type">${Object.entries(Theory.CHORD_TYPES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label>
        ${UI.btn('Hear it', 'data-k="play"', 'sound')}
      </div>
      <div class="builder-out">
        <div class="builder-info"></div>
        <div class="builder-diagram"></div>
        <div class="score-paper builder-staff"></div>
      </div>
      <div class="kb-wrap builder-kb"></div>
      <h4>Every place these notes appear on your fretboard</h4>
      <p class="caption">Bigger, darker circles are the root note. Any combination of one note per string from these makes the chord.</p>
      <div class="builder-fb"></div>`;
    const rootSel = el.querySelector('[data-k="root"]');
    const typeSel = el.querySelector('[data-k="type"]');
    let current = null;
    function update() {
      const root = rootSel.value, type = typeSel.value;
      const t = Theory.CHORD_TYPES[type];
      const names = Theory.chordNotes(root, type);
      const r = 60 + Theory.parse(root).pc;
      const midis = t.semis.map(s => r + s);
      const withOct = [];
      let prev = r - 1;
      names.forEach(n => { const nm = Theory.withOctaveAbove(n, prev + 1); withOct.push(nm); prev = Theory.toMidi(nm); });
      current = midis;
      const sym = root + t.suffix;
      el.querySelector('.builder-info').innerHTML = `
        <div class="builder-name">${Theory.pretty(root)}${t.suffix}</div>
        <div class="builder-sub">${Theory.pretty(root)} ${t.label.toLowerCase()}</div>
        <table class="data compact"><tbody>${names.map((n, i) => `<tr><td><b>${Theory.pretty(n)}</b></td><td>${t.degrees[i]}</td><td>${t.semis[i]} half steps above root</td></tr>`).join('')}</tbody></table>`;
      el.querySelector('.builder-diagram').innerHTML = Theory.CHORDS[sym]
        ? Diagrams.chord(sym, { showNotes: true }) + `<p class="caption">Ukulele shape</p>`
        : `<p class="caption">No beginner shape in this guide yet — but you can build one from the fretboard below!</p>`;
      const hl = {};
      midis.forEach((m, i) => { hl[m] = { cls: i === 0 ? 'root' : 'tone', label: Theory.pretty(names[i]) }; });
      el.querySelector('.builder-kb').innerHTML = Diagrams.keyboard({ from: 60, to: 83, highlights: hl });
      Notation.render(el.querySelector('.builder-staff'), { time: '4/4', showTime: false, tab: false, maxWidth: 240, noteSpacing: 80, notes: [{ n: withOct, d: 'w' }] });
      const pcs = midis.map(m => m % 12);
      const marks = [];
      Theory.STD_MIDI.forEach((open, s) => {
        for (let f = 0; f <= 12; f++) {
          const pc = (open + f) % 12;
          const i = pcs.indexOf(pc);
          if (i >= 0) marks.push({ s, f, label: Theory.pretty(names[i]), cls: i === 0 ? 'root' : 'tone', midi: open + f });
        }
      });
      el.querySelector('.builder-fb').innerHTML = Diagrams.fretboard({ frets: 12, marks });
    }
    el.querySelector('.builder-fb').addEventListener('click', e => { const g = e.target.closest('[data-midi]'); if (g) Sound.pluck(+g.dataset.midi); });
    el.querySelector('.builder-kb').addEventListener('click', e => { const g = e.target.closest('[data-midi]'); if (g) Sound.pluck(+g.dataset.midi); });
    rootSel.addEventListener('change', update);
    typeSel.addEventListener('change', update);
    el.querySelector('[data-k="play"]').addEventListener('click', () => {
      UI.arpeggiate(current, 0.3);
      setTimeout(() => Sound.strum(current, 0, 'down', { gap: 0.015 }), current.length * 300 + 150);
    });
    update();
  }

  function keyFamilies(el) {
    const numerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi'];
    el.innerHTML = Object.entries(Theory.KEYS).map(([key, chords]) => `
      <div class="key-row card" data-key="${key}">
        <div class="key-head"><h4>Key of ${Theory.pretty(key)} major</h4>
          <div class="btn-row">${UI.btn('I – IV – V – I', `data-prog="0,3,4,0"`, 'play', 'btn-small')}${UI.btn('I – V – vi – IV', `data-prog="0,4,5,3"`, 'play', 'btn-small btn-ghost')}${UI.btn('vi – IV – I – V', `data-prog="5,3,0,4"`, 'play', 'btn-small btn-ghost')}</div>
        </div>
        <div class="key-chords">${chords.map((c, i) => `<div class="key-chord" data-i="${i}"><div class="numeral">${numerals[i]}</div><div data-chord="${c}"></div></div>`).join('')}</div>
      </div>`).join('');
    UI.hydrate(el);
    let h = null;
    el.querySelectorAll('[data-prog]').forEach(b => b.addEventListener('click', () => {
      if (h) h.stop();
      const row = b.closest('.key-row');
      const chords = Theory.KEYS[row.dataset.key];
      const idx = b.dataset.prog.split(',').map(Number);
      const events = [];
      idx.forEach((ci, k) => {
        for (let beat = 0; beat < 4; beat++) events.push({ beat: k * 4 + beat, ci, run: t => Sound.strum(Sound.chordMidis(chords[ci]), t, 'down', { velocity: beat === 0 ? 0.6 : 0.4 }) });
      });
      h = Sound.play(events, {
        bpm: 96,
        onVisual: ev => row.querySelectorAll('.key-chord').forEach(kc => kc.classList.toggle('on', +kc.dataset.i === ev.ci)),
        onEnd: () => row.querySelectorAll('.key-chord').forEach(kc => kc.classList.remove('on')),
      });
    }));
    el._stop = () => { if (h) h.stop(); };
  }

  UI.section({
    id: 'majmin', num: 5, title: 'Major & Minor Chords', short: 'Chord theory',
    blurb: 'Discover what chords are made of, hear the difference between major and minor, see chords written in notation, and build any chord yourself.',
    lessons: [
      {
        id: 'recipe', title: 'What is a chord made of?',
        render: () => `
          <p>Most chords are built from <b>three notes</b> (a “triad”). The recipe always starts from the <b>root</b> — the note that gives the chord its name.</p>
          <div class="two-col">
            <div class="card"><h4>Major chord</h4><p>Root → up <b>4</b> half steps → up <b>3</b> more.</p><p>Sound: <b>bright, happy, settled</b>.</p></div>
            <div class="card"><h4>Minor chord</h4><p>Root → up <b>3</b> half steps → up <b>4</b> more.</p><p>Sound: <b>darker, sadder, thoughtful</b>.</p></div>
          </div>
          <p>The middle note is called the <b>third</b>. It’s the <i>only</i> difference between major and minor! Watch it being built on the keyboard — each key lights up as we count the half steps.</p>
          <div class="card" data-widget="recipe"></div>`,
        mount: el => recipeWidget(el.querySelector('[data-widget="recipe"]')),
      },
      {
        id: 'one-fret', title: 'Major to minor: move one finger',
        render: () => `
          <p>Because major and minor differ by just one note, moving the <b>third down by one fret</b> turns a major chord into a minor chord. See it (and hear it!) on your ukulele:</p>
          ${pairRow('A', 'Am', 'The C♯ on the C string (fret 1) drops to C — so just <b>lift your index finger</b>.')}
          ${pairRow('D', 'Dm', 'The F♯ on the E string (fret 2) drops to F at fret 1.')}
          ${pairRow('G', 'Gm', 'The B on the A string (fret 2) drops to B♭ at fret 1.')}
          ${UI.callout('tip', 'Listen closely', 'Play the major chord, then the minor, back and forth. Can you hear the mood change? Musicians describe major as “sunshine” and minor as “clouds”.')}`,
      },
      {
        id: 'ear', title: 'Ear training: happy or sad?',
        render: () => `<p>Listen to each chord and decide: is it major (bright) or minor (dark)? Your ears will improve quickly with practice.</p>
          <div class="card" data-quiz="majmin"></div>`,
        mount: el => {
          const chords = [...MAJORS, ...MINORS];
          UI.quiz(el.querySelector('[data-quiz="majmin"]'), {
            title: 'Major or minor?', rounds: 10,
            makeQuestion: () => {
              const c = UI.pick(chords);
              const isMinor = Theory.CHORDS[c].type === 'minor';
              const play = () => Sound.strum(Sound.chordMidis(c), 0, 'down', { gap: 0.03 });
              return {
                prompt: `Listen… ${UI.btn('Play again', 'data-again', 'sound', 'btn-small btn-ghost')}`,
                mount: p => { setTimeout(play, 250); p.querySelector('[data-again]').addEventListener('click', play); },
                options: [{ label: '😀 Major (bright)', correct: !isMinor }, { label: '😢 Minor (dark)', correct: isMinor }],
                explain: `That was <b>${Theory.chordName(c)}</b>.`,
              };
            },
          });
        },
      },
      {
        id: 'notation', title: 'Chords in music notation',
        render: () => `
          <p>In standard notation, a chord is shown as notes <b>stacked on top of each other</b> — all played at the same time. The chord name is usually written above the staff too.</p>
          <p>Each example below shows two things: the three <b>chord tones</b> stacked neatly from the root, and the four notes <b>your ukulele actually plays</b> (with TAB underneath).
          They have the same letter names, just in a different order — called a <b>voicing</b>. That’s why a C chord on the ukulele contains two Cs!</p>
          <div class="chord-grid wide">${['C', 'Am', 'F', 'G'].map(c => UI.chordCard(c, { notation: true, tip: false })).join('')}</div>`,
      },
      {
        id: 'majors', title: 'Major chord library',
        render: () => `<p>The most common major chords. Each card lists the three notes in the chord and shows the notation.</p>
          <div class="chord-grid wide">${MAJORS.map(c => UI.chordCard(c, { notation: true })).join('')}</div>`,
      },
      {
        id: 'minors', title: 'Minor chord library',
        render: () => `<p>The most common minor chords. Several use a <b>barre</b> — one finger pressing down more than one string. Keep that finger straight and roll it slightly onto its bony edge.</p>
          <div class="chord-grid wide">${MINORS.map(c => UI.chordCard(c, { notation: true })).join('')}</div>`,
      },
      {
        id: 'builder', title: 'Chord builder: build any chord',
        render: () => `<p>Choose any root note and chord type. You’ll see the notes, the formula, the notation, and every place those notes appear on your fretboard.</p>
          <div class="card" data-widget="builder"></div>`,
        mount: el => builder(el.querySelector('[data-widget="builder"]')),
      },
      {
        id: 'keys', title: 'Chord families (keys)',
        render: () => `
          <p>Songs usually use chords from one “family”, called a <b>key</b>. Each key has three major chords and three minor chords that sound great together.
          Musicians number them with <b>Roman numerals</b>: capitals (I, IV, V) for major, lower case (ii, iii, vi) for minor.</p>
          <p>Press a progression button to hear how the family members work together. <b>I – IV – V – I</b> is the backbone of folk, blues and rock’n’roll; <b>I – V – vi – IV</b> is the famous pop progression.</p>
          <div data-widget="keys" data-stoppable></div>`,
        mount: el => keyFamilies(el.querySelector('[data-widget="keys"]')),
      },
    ],
  });
})();
