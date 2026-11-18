(() => {
  const STRUMS = {
    downs: { name: 'All downs', slots: ['D', '', 'D', '', 'D', '', 'D', ''], text: 'Four steady down strums per bar. Start here!' },
    du: { name: 'Down-ups', slots: ['D', 'U', 'D', 'U', 'D', 'U', 'D', 'U'], text: 'Down on the numbers, up on the “ands”. Your hand never stops moving.' },
    swing: { name: 'Down, down-up', slots: ['D', '', 'D', 'U', 'D', '', 'D', 'U'], text: 'A friendly pattern that suits lots of songs.' },
    island: { name: 'Island strum', slots: ['D', '', 'D', 'U', '', 'U', 'D', 'U'], text: 'The classic ukulele groove: down, down-up, (miss), up-down-up. Keep your hand moving on the missed strum — just don’t touch the strings.' },
  };
  const COUNTS = ['1', '&', '2', '&', '3', '&', '4', '&'];

  function strumWidget(el) {
    el.innerHTML = `
      <div class="strum-controls">
        <label>Pattern <select data-k="pattern">${Object.entries(STRUMS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select></label>
        <label>Chord <select data-k="chord">${['C', 'Am', 'F', 'G', 'C7', 'G7', 'Am7'].map(c => `<option>${c}</option>`).join('')}</select></label>
        <label class="tempo">Speed <input type="range" min="40" max="140" value="70" data-k="bpm"> <output>70</output> bpm</label>
        ${UI.btn('Start', 'data-k="go"', 'play')}
      </div>
      <p class="strum-text"></p>
      <div class="strum-stage">
        <div class="strum-pattern"></div>
        <div class="strum-hand" aria-hidden="true"><div class="strum-pick"></div></div>
      </div>`;
    const pat = el.querySelector('[data-k="pattern"]');
    const chordSel = el.querySelector('[data-k="chord"]');
    const bpm = el.querySelector('[data-k="bpm"]');
    const go = el.querySelector('[data-k="go"]');
    const box = el.querySelector('.strum-pattern');
    const hand = el.querySelector('.strum-hand');
    const draw = () => {
      const p = STRUMS[pat.value];
      el.querySelector('.strum-text').textContent = p.text;
      box.innerHTML = p.slots.map((s, i) => `<div class="slot ${s ? 's-' + s : 's-miss'}" data-i="${i}"><div class="arrow">${s === 'D' ? '↓' : s === 'U' ? '↑' : '·'}</div><div class="count">${COUNTS[i]}</div></div>`).join('');
    };
    draw();
    pat.addEventListener('change', draw);
    bpm.addEventListener('input', () => { el.querySelector('output').textContent = bpm.value; });
    let h = null;
    const stop = () => { if (h) h.stop(); h = null; go.innerHTML = UI.ICONS.play + '<span>Start</span>'; box.querySelectorAll('.slot').forEach(s => s.classList.remove('on')); };
    go.addEventListener('click', () => {
      if (h) { stop(); return; }
      const p = STRUMS[pat.value];
      const midis = Sound.chordMidis(chordSel.value);
      const events = p.slots.map((s, i) => ({
        beat: i * 0.5, i, s,
        run: t => { if (s) Sound.strum(midis, t, s === 'D' ? 'down' : 'up', { length: 0.5 * 60 / +bpm.value * 0.95 + (s === 'D' ? 0.15 : 0) }); },
      }));
      go.innerHTML = UI.ICONS.stop + '<span>Stop</span>';
      h = Sound.play(events, {
        bpm: +bpm.value, loopBeats: 4, metronome: true, countIn: 4,
        onVisual: ev => {
          if (ev.i === undefined) return;
          box.querySelectorAll('.slot').forEach(x => x.classList.toggle('on', +x.dataset.i === ev.i));
          hand.classList.remove('down', 'up');
          void hand.offsetWidth;
          hand.classList.add(ev.i % 2 === 0 ? 'down' : 'up');
          hand.classList.toggle('ghost', !ev.s);
        },
      });
    });
    el._stop = stop;
  }

  const PROGRESSIONS = [
    ['C', 'Am'], ['C', 'F'], ['Am', 'F'], ['C', 'G'], ['F', 'G'], ['C', 'G7'],
    ['C', 'Am', 'F', 'G'], ['C', 'G', 'Am', 'F'], ['C', 'F', 'C', 'G'], ['Am', 'F', 'C', 'G'],
  ];

  function changeTrainer(el) {
    el.innerHTML = `
      <div class="strum-controls">
        <label>Chords <select data-k="prog">${PROGRESSIONS.map((p, i) => `<option value="${i}">${p.join(' → ')}</option>`).join('')}</select></label>
        <label>Beats per chord <select data-k="beats"><option>8</option><option selected>4</option><option>2</option></select></label>
        <label class="tempo">Speed <input type="range" min="40" max="140" value="60" data-k="bpm"> <output>60</output> bpm</label>
        <label class="chk"><input type="checkbox" data-k="strum" checked> Strum along</label>
        ${UI.btn('Start', 'data-k="go"', 'play')}
      </div>
      <div class="change-stage">
        <div class="change-now"><div class="lbl">Now</div><div class="cd-big"></div></div>
        <div class="change-next"><div class="lbl">Next</div><div class="cd-small"></div><div class="beat-dots"></div></div>
      </div>`;
    const sel = el.querySelector('[data-k="prog"]');
    const beatsSel = el.querySelector('[data-k="beats"]');
    const bpm = el.querySelector('[data-k="bpm"]');
    const go = el.querySelector('[data-k="go"]');
    const now = el.querySelector('.cd-big');
    const next = el.querySelector('.cd-small');
    const dots = el.querySelector('.beat-dots');
    const show = (i) => {
      const p = PROGRESSIONS[+sel.value];
      now.innerHTML = Diagrams.chord(p[i % p.length], { showNotes: false, animate: true });
      next.innerHTML = Diagrams.chord(p[(i + 1) % p.length], { showNotes: false });
      const b = +beatsSel.value;
      dots.innerHTML = Array(b).fill(0).map(() => '<span></span>').join('');
    };
    show(0);
    sel.addEventListener('change', () => show(0));
    beatsSel.addEventListener('change', () => show(0));
    bpm.addEventListener('input', () => { el.querySelector('output').textContent = bpm.value; });
    let h = null;
    const stop = () => { if (h) h.stop(); h = null; go.innerHTML = UI.ICONS.play + '<span>Start</span>'; };
    go.addEventListener('click', () => {
      if (h) { stop(); return; }
      const p = PROGRESSIONS[+sel.value];
      const b = +beatsSel.value;
      const strum = el.querySelector('[data-k="strum"]').checked;
      const events = [];
      p.forEach((c, ci) => {
        for (let k = 0; k < b; k++) {
          events.push({ beat: ci * b + k, ci, k, run: t => { if (strum) Sound.strum(Sound.chordMidis(c), t, 'down', { velocity: k === 0 ? 0.6 : 0.42 }); } });
        }
      });
      go.innerHTML = UI.ICONS.stop + '<span>Stop</span>';
      let lastCi = -1;
      h = Sound.play(events, {
        bpm: +bpm.value, loopBeats: p.length * b, metronome: !strum, countIn: 4,
        onVisual: ev => {
          if (ev.ci === undefined) return;
          if (ev.ci !== lastCi) { show(ev.ci); lastCi = ev.ci; }
          dots.querySelectorAll('span').forEach((d, j) => d.classList.toggle('on', j <= ev.k));
          next.classList.toggle('soon', ev.k >= b - 1);
        },
      });
    });
    el._stop = stop;
  }

  // ---------------- songs ----------------
  const SONGS = [
    {
      id: 'row', title: 'Row, Row, Row Your Boat', chords: ['C'], bpm: 80, level: 'One chord!',
      lyrics: '[C:8]Row, row, row your boat, [C:8]gently down the stream.\n[C:8]Merrily, merrily, merrily, merrily, [C:8]life is but a dream.',
      note: 'Traditional. Strum C four times per box. Count “1, 2, 3, 4” out loud as you play.',
    },
    {
      id: 'skip', title: 'Skip to My Lou', chords: ['C', 'G7'], bpm: 90, level: 'Two chords',
      lyrics: '[C:8]Lou, Lou, skip to my Lou, [G7:8]Lou, Lou, skip to my Lou,\n[C:8]Lou, Lou, skip to my Lou, [G7:4]skip to my Lou, my [C:4]darling.',
      note: 'Traditional American folk song. Changing from C to G7 is a great first chord change.',
    },
    {
      id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', chords: ['C', 'F', 'G'], bpm: 80, level: 'Three chords',
      lyrics: '[C:4]Twinkle, twinkle, [F:2]little [C:2]star, [F:2]how I [C:2]wonder [G:2]what you [C:2]are.\n[C:2]Up a[F:2]bove the [C:2]world so [G:2]high, [C:2]like a [F:2]diamond [C:2]in the [G:2]sky.\n[C:4]Twinkle, twinkle, [F:2]little [C:2]star, [F:2]how I [C:2]wonder [G:2]what you [C:2]are.',
      note: 'Traditional. The chords change every 2 beats here — slow the speed down until it feels easy.',
    },
    {
      id: 'four', title: 'The Four-Chord Loop', chords: ['C', 'G', 'Am', 'F'], bpm: 76, level: 'Four chords',
      lyrics: '[C:4]1 2 3 4 [G:4]1 2 3 4 [Am:4]1 2 3 4 [F:4]1 2 3 4\n[C:4]1 2 3 4 [G:4]1 2 3 4 [Am:4]1 2 3 4 [F:4]1 2 3 4',
      note: 'These four chords, in this order, are used in hundreds of famous pop songs. Once you can play this loop smoothly, you can play along with a huge amount of music!',
    },
  ];

  function parseSong(lyrics) {
    const lines = lyrics.split('\n');
    const timeline = [];
    const html = lines.map(line => {
      const parts = line.split(/(\[[^\]]+\])/).filter(Boolean);
      let out = '';
      let pendingChord = null;
      parts.forEach(p => {
        const m = /^\[([^:\]]+)(?::(\d+))?\]$/.exec(p);
        if (m) {
          pendingChord = { c: m[1], beats: +(m[2] || 4), idx: timeline.length };
          timeline.push(pendingChord);
        } else if (pendingChord) {
          out += `<span class="lc" data-ti="${pendingChord.idx}"><span class="lc-chord">${Theory.pretty(pendingChord.c.match(/^[A-G][#b]?/)[0]) + pendingChord.c.replace(/^[A-G][#b]?/, '')}</span>${UI.esc(p)}</span>`;
          pendingChord = null;
        } else {
          out += UI.esc(p);
        }
      });
      return `<div class="lyric-line">${out}</div>`;
    }).join('');
    return { html, timeline };
  }

  function songPlayer(el, song) {
    const { html, timeline } = parseSong(song.lyrics);
    el.innerHTML = `
      <div class="song-head"><h4>${song.title}</h4><span class="badge">${song.level}</span></div>
      <p class="caption">${song.note}</p>
      <div class="song-chords">${song.chords.map(c => `<div class="mini-chord" data-chord="${c}"></div>`).join('')}</div>
      <div class="player-bar">
        ${UI.btn('Play along', 'data-k="go"', 'play')}
        <label class="tempo">Speed <input type="range" min="40" max="140" value="${song.bpm}" data-k="bpm"> <output>${song.bpm}</output> bpm</label>
        <label>Strum <select data-k="pattern"><option value="downs">All downs</option><option value="swing">Down, down-up</option><option value="du">Down-ups</option></select></label>
        <span class="countin"></span>
      </div>
      <div class="song-body"><div class="lyrics">${html}</div><div class="song-now"></div></div>`;
    UI.hydrate(el.querySelector('.song-chords'));
    const go = el.querySelector('[data-k="go"]');
    const bpm = el.querySelector('[data-k="bpm"]');
    const nowBox = el.querySelector('.song-now');
    const ci = el.querySelector('.countin');
    bpm.addEventListener('input', () => { el.querySelector('output').textContent = bpm.value; });
    let h = null;
    const stop = () => { if (h) h.stop(); h = null; go.innerHTML = UI.ICONS.play + '<span>Play along</span>'; el.querySelectorAll('.lc.on').forEach(x => x.classList.remove('on')); ci.textContent = ''; };
    go.addEventListener('click', () => {
      if (h) { stop(); return; }
      const pattern = STRUMS[el.querySelector('[data-k="pattern"]').value].slots;
      const events = [];
      let beat = 0;
      timeline.forEach((t, ti) => {
        const midis = Sound.chordMidis(t.c);
        events.push({ beat, ti, c: t.c, run: () => {} });
        for (let k = 0; k < t.beats * 2; k++) {
          const s = pattern[k % 8];
          if (s) events.push({ beat: beat + k * 0.5, run: tm => Sound.strum(midis, tm, s === 'D' ? 'down' : 'up', { velocity: s === 'D' ? 0.5 : 0.36 }) });
        }
        beat += t.beats;
      });
      go.innerHTML = UI.ICONS.stop + '<span>Stop</span>';
      h = Sound.play(events, {
        bpm: +bpm.value, countIn: 4,
        onVisual: ev => {
          if (ev.countIn) { ci.textContent = 'Get ready… ' + ev.countIn; return; }
          if (ev.ti === undefined) return;
          ci.textContent = '';
          el.querySelectorAll('.lc').forEach(x => x.classList.toggle('on', +x.dataset.ti === ev.ti));
          nowBox.innerHTML = Diagrams.chord(ev.c, {});
        },
        onEnd: stop,
      });
    });
    el._stop = stop;
  }

  function chordChartExplainer() {
    // big annotated chord diagram (C chord) + mirror comparison
    return `<div class="explainer">
      <div class="explainer-fig">${Diagrams.chord('C', { showNotes: false })}</div>
      <ul class="explainer-list">
        <li><b>Vertical lines</b> are the strings. ${Settings.lefty ? 'Left-handed charts read <b>A E C G</b> from left to right.' : 'Right-handed charts read <b>G C E A</b> from left to right.'}</li>
        <li><b>The thick bar at the top</b> is the nut. Imagine the ukulele standing up in front of you, facing you.</li>
        <li><b>Horizontal lines</b> are the frets. The numbers at the side are fret numbers.</li>
        <li><b>Filled dots</b> show where to press. The number inside tells you which finger (1 = index).</li>
        <li><b>Open circles (○)</b> above the nut mean play that string open — no finger.</li>
      </ul>
    </div>`;
  }

  UI.section({
    id: 'chords', num: 3, title: 'Basic Chords', short: 'First chords',
    blurb: 'Read chord charts (the left-handed way), learn your first four chords, strum in rhythm, switch smoothly between chords and play your first songs.',
    onLeave: root => root.querySelectorAll('[data-stoppable]').forEach(x => x._stop && x._stop()),
    lessons: [
      {
        id: 'charts', title: 'Reading chord charts',
        render: () => `
          <p>A <b>chord</b> is several notes played together. On the ukulele you make a chord by pressing a shape with your fretting hand and strumming all four strings.
          A <b>chord chart</b> (or chord diagram) is a picture of that shape.</p>
          <div class="card">${chordChartExplainer()}</div>
          <h3>Left-handed vs right-handed charts</h3>
          <p>Most chord charts you’ll find in books and online are drawn for right-handed players. A left-handed chart is simply a <b>mirror image</b>.
          Here is the same chord — G major — both ways:</p>
          <div class="mirror-row">
            <figure class="card">${Diagrams.chord('G', { lefty: true })}<figcaption><b>Left-handed</b><br>A E C G</figcaption></figure>
            <div class="mirror-icon" aria-hidden="true">⇆</div>
            <figure class="card">${Diagrams.chord('G', { lefty: false })}<figcaption><b>Right-handed</b> (books)<br>G C E A</figcaption></figure>
          </div>
          ${UI.callout('lefty', 'How to flip a right-handed chart in your head', 'Look at the letters under the chart. Whatever is shown on the <b>G string</b> (far left on a right-handed chart) goes on your G string — the string nearest your chin. The easiest trick: <b>read the chart by string name, not by position</b>. Or hold the book up to a mirror!')}`,
      },
      {
        id: 'first-four', title: 'Your first four chords: C, Am, F and G',
        render: () => `
          <p>These four chords are the foundation of thousands of songs. Learn them in this order — each one builds on the last.
          Click a chart (or the <b>Strum</b> button) to hear what it should sound like, and <b>Show me</b> to watch the fingers go on one at a time.</p>
          <div class="chord-grid">${['C', 'Am', 'F', 'G'].map(c => UI.chordCard(c)).join('')}</div>
          ${UI.callout('tip', 'Check every string rings', 'After making a chord shape, pick each string one at a time. If one sounds buzzy or dead, press a little harder, move your fingertip closer to the fret, or arch your finger so it doesn’t touch the string next to it.')}
          ${UI.callout('info', 'Notice something?', 'Am → F: you just add one finger! C and Am each use only one finger. Look for “anchor” fingers that stay put when you change chords — it makes changing much faster.')}`,
      },
      {
        id: 'strumming', title: 'Strumming and rhythm',
        render: () => `
          <p>Rhythm is what makes chords into music. We count music in <b>beats</b> — usually 4 beats in each <b>bar</b>, counted “1, 2, 3, 4”.
          To fit in up-strums we count the halfway points too: “1 <i>and</i> 2 <i>and</i> 3 <i>and</i> 4 <i>and</i>”.</p>
          <ul class="ticks">
            <li><b>↓ Down strums</b> land on the numbers. Brush down towards the floor with the nail of your left index finger.</li>
            <li><b>↑ Up strums</b> land on the “ands”. Brush back up with the fleshy pad of your finger.</li>
            <li>Your left hand keeps swinging down-up-down-up like a pendulum, <b>even when it doesn’t touch the strings</b>. That’s the secret to steady rhythm.</li>
          </ul>
          <div class="card" data-widget="strum" data-stoppable></div>`,
        mount: el => strumWidget(el.querySelector('[data-widget="strum"]')),
      },
      {
        id: 'changing', title: 'Changing chords smoothly',
        render: () => `
          <p>Switching between chords in time is the biggest challenge for every beginner — and it gets easier with practice, we promise!</p>
          <ol class="steps">
            <li>Start <b>slowly</b>. It’s better to play slowly without stopping than fast with gaps.</li>
            <li>Watch the <b>Next</b> chord — it glows on the last beat, so start moving early.</li>
            <li>Move all your fingers at once, as a shape, instead of one at a time.</li>
            <li>Practise just two chords for a minute a day. Speed comes on its own.</li>
          </ol>
          <div class="card" data-widget="change" data-stoppable></div>`,
        mount: el => changeTrainer(el.querySelector('[data-widget="change"]')),
      },
      {
        id: 'songs', title: 'Your first songs',
        render: () => `
          <p>Time to play some real music! Each song shows the chords you need, then the words with the chord written above the place it changes.
          Press <b>Play along</b> — the current chord lights up and the chart appears on the right.</p>
          ${SONGS.map(s => `<div class="card song" data-song="${s.id}" data-stoppable></div>`).join('')}`,
        mount: el => SONGS.forEach(s => songPlayer(el.querySelector(`[data-song="${s.id}"]`), s)),
      },
      {
        id: 'more', title: 'More useful beginner chords',
        render: () => `
          <p>Once you’re comfortable with C, Am, F and G, add these. The <b>“seventh”</b> chords (C7, G7, A7, E7) have a bluesy, “leading somewhere” sound and are often easier to play than their plain versions!</p>
          <div class="chord-grid">${['C7', 'G7', 'A7', 'E7', 'Am7', 'Dm', 'Em', 'D', 'A'].map(c => UI.chordCard(c)).join('')}</div>`,
      },
    ],
  });
})();
