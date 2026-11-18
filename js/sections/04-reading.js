(() => {
  // positions for first-position naturals (stringIdx, fret)
  const POS = {
    C4: [1, 0], D4: [1, 2], E4: [2, 0], F4: [2, 1], G4: [2, 3], A4: [3, 0], B4: [3, 2], C5: [3, 3], D5: [3, 5], E5: [3, 7], F5: [3, 8], G5: [3, 10], A5: [3, 12],
  };
  const n = (name, d, extra = {}) => ({ n: name, d, tab: name ? [POS[name] || [0, 0]] : null, ...extra });

  UI.score('staff-notes', () => ({
    time: '4/4', showTime: false, tab: false, noteSpacing: 30,
    notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'].map(x => ({ n: x, d: 'q', label: x.replace(/\d/, '') })),
  }));

  UI.score('rhythm', () => ({
    time: '4/4', tab: true, noteSpacing: 40,
    notes: [
      { n: 'A4', d: 'w', tab: [[3, 0]], label: '1 2 3 4' },
      { n: 'A4', d: 'h', tab: [[3, 0]], label: '1 2' }, { n: 'A4', d: 'h', tab: [[3, 0]], label: '3 4' },
      ...['1', '2', '3', '4'].map(c => ({ n: 'A4', d: 'q', tab: [[3, 0]], label: c })),
      ...['1', '&', '2', '&', '3', '&', '4', '&'].map(c => ({ n: 'A4', d: '8', tab: [[3, 0]], label: c })),
    ],
  }));

  UI.score('rests', () => ({
    time: '4/4', tab: true, noteSpacing: 40,
    notes: [
      { n: 'C4', d: 'q', tab: [[1, 0]], label: '1' }, { n: null, d: 'q', label: '(2)' }, { n: 'C4', d: 'q', tab: [[1, 0]], label: '3' }, { n: null, d: 'q', label: '(4)' },
      { n: 'E4', d: 'q', tab: [[2, 0]], label: '1' }, { n: 'E4', d: 'q', tab: [[2, 0]], label: '2' }, { n: null, d: 'h', label: '(3 4)' },
      { n: 'A4', d: 'qd', tab: [[3, 0]], label: '1 (&)' }, { n: 'A4', d: '8', tab: [[3, 0]], label: '2&' }, { n: 'A4', d: 'h', tab: [[3, 0]], label: '3 4' },
    ],
  }));

  UI.score('first-position', () => ({
    time: '4/4', tab: true, noteSpacing: 44,
    notes: [
      n('C4', 'h', { label: 'C' }), n('D4', 'h', { label: 'D' }),
      n('E4', 'q', { label: 'E' }), n('F4', 'q', { label: 'F' }), n('G4', 'h', { label: 'G' }),
      n('A4', 'q', { label: 'A' }), n('B4', 'q', { label: 'B' }), n('C5', 'h', { label: 'C' }),
      { n: 'G4', d: 'q', tab: [[0, 0]], label: 'G' }, { n: 'A4', d: 'q', tab: [[0, 2]], label: 'A' }, { n: 'B4', d: 'h', tab: [[0, 4]], label: 'B' },
    ],
  }));

  // Twinkle Twinkle (traditional) — uses the open G string for G4
  const TW = (name, d, lyric, chord) => ({ n: name, d, lyric, chord, tab: [name === 'G4' ? [0, 0] : POS[name]] });
  UI.score('twinkle', () => {
    const a = [
      ['C4', 'q', 'Twin-', 'C'], ['C4', 'q', 'kle'], ['G4', 'q', 'twin-'], ['G4', 'q', 'kle'],
      ['A4', 'q', 'lit-', 'F'], ['A4', 'q', 'tle'], ['G4', 'h', 'star,', 'C'],
      ['F4', 'q', 'how', 'F'], ['F4', 'q', 'I'], ['E4', 'q', 'won-', 'C'], ['E4', 'q', 'der'],
      ['D4', 'q', 'what', 'G'], ['D4', 'q', 'you'], ['C4', 'h', 'are.', 'C'],
    ];
    const b = [
      ['G4', 'q', 'Up', 'C'], ['G4', 'q', 'a-'], ['F4', 'q', 'bove', 'F'], ['F4', 'q', 'the'],
      ['E4', 'q', 'world', 'C'], ['E4', 'q', 'so'], ['D4', 'h', 'high,', 'G'],
      ['G4', 'q', 'like', 'C'], ['G4', 'q', 'a'], ['F4', 'q', 'dia-', 'F'], ['F4', 'q', 'mond'],
      ['E4', 'q', 'in', 'C'], ['E4', 'q', 'the'], ['D4', 'h', 'sky.', 'G'],
    ];
    return { time: '4/4', tab: true, notes: [...a, ...b, ...a].map(x => TW(...x)) };
  });

  // Ode to Joy (Beethoven) — public domain
  UI.score('ode', () => {
    const p1 = [['E4', 'q', 'C'], ['E4', 'q'], ['F4', 'q'], ['G4', 'q'], ['G4', 'q', 'G'], ['F4', 'q'], ['E4', 'q'], ['D4', 'q'], ['C4', 'q', 'C'], ['C4', 'q'], ['D4', 'q'], ['E4', 'q']];
    const end1 = [['E4', 'qd', 'G'], ['D4', '8'], ['D4', 'h']];
    const end2 = [['D4', 'qd', 'G'], ['C4', '8'], ['C4', 'h', 'C']];
    return { time: '4/4', tab: true, notes: [...p1, ...end1, ...p1, ...end2].map(([nm, d, c]) => ({ n: nm, d, chord: c, tab: [POS[nm]] })) };
  });

  UI.section({
    id: 'reading', num: 4, title: 'Reading Music', short: 'Notation',
    blurb: 'Now that you can play, learn to read standard music notation: the staff, note names, rhythm and how ukulele notes are written — then play your first melodies.',
    lessons: [
      {
        id: 'staff', title: 'The staff and the treble clef',
        render: () => `
          <p>Written music sits on a <b>staff</b> (or stave): five lines with four spaces between them. Each line and each space is a different note.
          <b>The higher a note sits on the staff, the higher it sounds.</b></p>
          <p>The curly symbol at the start is the <b>treble clef</b> (also called the G clef — its curl wraps around the G line). Ukulele music is always written in treble clef.</p>
          <div class="two-col">
            <div class="card"><h4>Notes in the spaces</h4><p>From the bottom up the spaces spell <b class="big">F A C E</b> — “face”.</p></div>
            <div class="card"><h4>Notes on the lines</h4><p>From the bottom up: <b class="big">E G B D F</b> — “<b>E</b>very <b>G</b>ood <b>B</b>oy <b>D</b>eserves <b>F</b>ruit”.</p></div>
          </div>
          <p>Notes below the staff get little extra lines of their own called <b>ledger lines</b>. Your ukulele’s lowest note, <b>middle C</b> (the open C string), sits on one ledger line below the staff.</p>
          <p><b>Click any note</b> below to hear it and see where it lives on your ukulele.</p>
          <div class="score-paper" data-widget="staff"></div>
          <div class="card"><div class="fb-readout" data-k="where">Click a note on the staff above…</div><div data-k="fb"></div></div>`,
        mount: el => {
          const target = el.querySelector('[data-widget="staff"]');
          const fb = el.querySelector('[data-k="fb"]');
          const where = el.querySelector('[data-k="where"]');
          fb.innerHTML = Diagrams.fretboard({ frets: 12 });
          const spec = UI.scores['staff-notes']();
          spec.onNoteClick = item => {
            const m = item.midis[0];
            const marks = [];
            Theory.STD_MIDI.forEach((open, s) => { const f = m - open; if (f >= 0 && f <= 12) marks.push({ s, f, label: Theory.pretty(Theory.midiName(m, false, false)), cls: 'active' }); });
            fb.innerHTML = Diagrams.fretboard({ frets: 12, marks });
            where.innerHTML = `<b>${Theory.midiName(m)}</b> can be played in ${marks.length} place${marks.length > 1 ? 's' : ''} on your ukulele: ${marks.map(k => `${Theory.STRING_NAMES[k.s]} string ${k.f === 0 ? 'open' : 'fret ' + k.f}`).join(', ')}.`;
          };
          Notation.render(target, spec);
        },
      },
      {
        id: 'rhythm', title: 'Note lengths and rhythm',
        render: () => `
          <p>The <b>shape</b> of a note tells you how long to hold it, counted in beats. Most music has <b>4 beats in a bar</b> — that’s what the <b>4/4</b> time signature at the start means.
          Bar lines (vertical lines) divide the music into bars.</p>
          <div class="table-wrap"><table class="data rhythm-table">
            <thead><tr><th>Name</th><th>Looks like</th><th>Lasts</th><th>Count</th></tr></thead>
            <tbody>
              <tr><td>Whole note</td><td>Hollow oval, no stem</td><td>4 beats</td><td>1-2-3-4</td></tr>
              <tr><td>Half note</td><td>Hollow oval with a stem</td><td>2 beats</td><td>1-2</td></tr>
              <tr><td>Quarter note</td><td>Filled oval with a stem</td><td>1 beat</td><td>1</td></tr>
              <tr><td>Eighth note</td><td>Filled, stem + flag (or joined by a beam)</td><td>½ beat</td><td>1 &amp;</td></tr>
            </tbody></table></div>
          <p>Here is one bar of each, all played on the open A string. Press play, turn on the metronome, and count out loud.</p>
          <div data-score-player="rhythm" data-bpm="70"></div>
          <h3>Rests and dots</h3>
          <p>A <b>rest</b> means silence for that many beats — keep counting but don’t play. A <b>dot</b> after a note makes it half as long again: a dotted quarter note lasts 1½ beats.</p>
          <div data-score-player="rests" data-bpm="70"></div>`,
      },
      {
        id: 'uke-notes', title: 'Ukulele notes on the staff',
        render: () => `
          <p>Let’s connect the staff to your fingers. These are the notes in “first position” — near the headstock — for each string. Play through them slowly, saying the note names aloud.</p>
          <div data-score-player="first-position" data-bpm="60" data-fretboard-target="#fp-fb"></div>
          <div class="card" id="fp-fb">${Diagrams.fretboard({ frets: 5, marks: [
            { s: 1, f: 0, label: 'C' }, { s: 1, f: 2, label: 'D' }, { s: 2, f: 0, label: 'E' }, { s: 2, f: 1, label: 'F' }, { s: 2, f: 3, label: 'G' },
            { s: 3, f: 0, label: 'A' }, { s: 3, f: 2, label: 'B' }, { s: 3, f: 3, label: 'C' }, { s: 0, f: 0, label: 'G' }, { s: 0, f: 2, label: 'A' }, { s: 0, f: 4, label: 'B' },
          ] })}</div>
          ${UI.callout('info', 'The same note in two places', 'Because of the high G string, the notes G, A and B can be played on the G string <i>or</i> on the E/A strings — they’re exactly the same pitch. The notation is the same; the TAB tells you which string to use.')}`,
      },
      {
        id: 'note-quiz', title: 'Quiz: name that note',
        render: () => `<p>A note appears on the staff — what is it? Remember <b>FACE</b> for the spaces and <b>Every Good Boy Deserves Fruit</b> for the lines.</p>
          <div class="card" data-quiz="notes"></div>`,
        mount: el => {
          const pool = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'];
          UI.quiz(el.querySelector('[data-quiz="notes"]'), {
            title: 'Name that note', rounds: 10,
            makeQuestion: () => {
              const nm = UI.pick(pool);
              return {
                prompt: '<div class="score-paper quiz-staff"></div>',
                mount: p => Notation.render(p.querySelector('.quiz-staff'), { time: '4/4', showTime: false, tab: false, maxWidth: 260, stretch: false, notes: [{ n: nm, d: 'w' }] }),
                options: Theory.LETTERS.map(L => ({ label: L, correct: L === nm[0] })),
                explain: `It’s <b>${nm[0]}</b>${['E4', 'G4', 'B4', 'D5', 'F5'].includes(nm) ? ' (on a line)' : ['F4', 'A4', 'C5', 'E5'].includes(nm) ? ' (in a space)' : ''}.`,
                after: () => Sound.pluck(Theory.toMidi(nm)),
              };
            },
          });
        },
      },
      {
        id: 'melodies', title: 'Your first melodies',
        render: () => `
          <p>Put it all together! These melodies use only the notes you’ve just learned. Read the notation, check the TAB if you get stuck, and follow the highlighted note.
          Tick <b>Chord backing</b> to hear the chords (written above the staff) underneath.</p>
          <h3>Twinkle, Twinkle, Little Star <small>(traditional)</small></h3>
          <p>The G notes use your <b>open G string</b> — the high G makes this tune easy!</p>
          <div data-score-player="twinkle" data-bpm="80" data-accompany="1"></div>
          <h3>Ode to Joy <small>(Beethoven)</small></h3>
          <p>Watch for the <b>dotted quarter note</b> followed by an <b>eighth note</b> near the end of each line: long–short.</p>
          <div data-score-player="ode" data-bpm="80" data-accompany="1"></div>
          ${UI.callout('tip', 'Try this', 'Once you can play the melody, ask a friend to strum the chords while you play the tune — or record yourself strumming and play the melody over the top!')}`,
      },
    ],
  });
})();
