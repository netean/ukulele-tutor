(() => {
  /** Interactive vertical strings you can pluck (front view, headstock up). */
  function stringsWidget(el) {
    const lefty = Settings.lefty;
    const order = lefty ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const W = 420, H = 300, top = 30, bot = 230;
    const xs = [90, 170, 250, 330];
    let s = `<svg class="pluck-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Four strings — click one to pluck it">`;
    s += `<rect x="50" y="${top - 12}" width="320" height="10" rx="3" class="pl-nut"/>`;
    s += `<rect x="50" y="${bot + 2}" width="320" height="10" rx="3" class="pl-nut"/>`;
    order.forEach((si, col) => {
      const x = xs[col];
      s += `<g class="pl-string" data-s="${si}"><rect x="${x - 30}" y="${top}" width="60" height="${bot - top}" fill="transparent"/>`;
      s += `<path d="M${x},${top} Q${x},${(top + bot) / 2} ${x},${bot}" class="pl-line" style="stroke-width:${2 + [1, 2.2, 1.6, 0.8][si]}"/>`;
      s += `<text x="${x}" y="${bot + 38}" text-anchor="middle" class="pl-name">${Theory.STRING_NAMES[si]}</text>`;
      s += `<text x="${x}" y="${bot + 58}" text-anchor="middle" class="pl-num">string ${Theory.STRING_NUMBERS[si]}</text></g>`;
    });
    s += `</svg>`;
    el.innerHTML = `<div class="pluck-wrap">${s}<div class="pluck-readout" aria-live="polite"><div class="pr-note">—</div><div class="pr-sub">Click a string</div></div></div>`;
    const svg = el.querySelector('svg');
    const anims = new Map();
    function twang(si) {
      const g = svg.querySelector(`.pl-string[data-s="${si}"]`);
      const path = g.querySelector('path');
      const col = order.indexOf(si);
      const x = xs[col];
      const t0 = performance.now();
      const freq = 9 + si * 2;
      cancelAnimationFrame(anims.get(si));
      g.classList.add('active');
      const step = now => {
        const t = (now - t0) / 1000;
        const amp = 16 * Math.exp(-t * 2.4) * Math.sin(t * freq * Math.PI * 2);
        path.setAttribute('d', `M${x},${top} Q${x + amp},${(top + bot) / 2} ${x},${bot}`);
        if (t < 1.8) anims.set(si, requestAnimationFrame(step));
        else { path.setAttribute('d', `M${x},${top} Q${x},${(top + bot) / 2} ${x},${bot}`); g.classList.remove('active'); }
      };
      anims.set(si, requestAnimationFrame(step));
      Sound.pluck(Theory.STD_MIDI[si]);
      const nm = Theory.STD[si];
      el.querySelector('.pr-note').textContent = nm[0];
      el.querySelector('.pr-sub').innerHTML = `${['4th', '3rd', '2nd', '1st'][si]} string · note ${nm} · ${Theory.midiToFreq(Theory.STD_MIDI[si]).toFixed(1)} Hz`;
    }
    svg.querySelectorAll('.pl-string').forEach(g => g.addEventListener('click', () => twang(+g.dataset.s)));
    el._twang = twang;
    return el;
  }

  function tabDiagram() {
    // a hand-drawn TAB explanation
    const lines = ['A', 'E', 'C', 'G'];
    const notes = [[3, 0], [3, 0], [2, 0], [2, 3], [1, 2], [0, 0], [3, 3], [2, 1]]; // [string idx G..A, fret]
    let s = `<svg class="tab-svg" viewBox="0 0 620 170" role="img" aria-label="Example of ukulele TAB">`;
    s += `<text x="12" y="44" class="tab-T">T</text><text x="12" y="74" class="tab-T">A</text><text x="12" y="104" class="tab-T">B</text>`;
    lines.forEach((n, i) => {
      const y = 30 + i * 30;
      s += `<line x1="40" x2="600" y1="${y}" y2="${y}" class="tab-line"/><text x="608" y="${y + 5}" class="tab-sname">${n}</text>`;
    });
    s += `<line x1="40" x2="40" y1="30" y2="120" class="tab-line"/><line x1="600" x2="600" y1="30" y2="120" class="tab-line"/>`;
    notes.forEach(([si, f], i) => {
      const y = 30 + (3 - si) * 30;
      const x = 90 + i * 64;
      s += `<g class="tab-n" style="animation-delay:${i * 0.3}s"><rect x="${x - 10}" y="${y - 11}" width="20" height="22" class="tab-bg"/><text x="${x}" y="${y + 6}" text-anchor="middle">${f}</text></g>`;
    });
    s += `<text x="90" y="160" class="ann">read left → right, like words in a book</text>`;
    s += `</svg>`;
    return s;
  }

  // Score: open-string exercise
  UI.score('open-strings', () => ({
    time: '4/4', tab: true,
    notes: [
      ...Array(4).fill({ n: 'G4', d: 'q', tab: [[0, 0]] }),
      ...Array(4).fill({ n: 'C4', d: 'q', tab: [[1, 0]] }),
      ...Array(4).fill({ n: 'E4', d: 'q', tab: [[2, 0]] }),
      ...Array(4).fill({ n: 'A4', d: 'q', tab: [[3, 0]] }),
      { n: 'G4', d: 'q', tab: [[0, 0]] }, { n: 'C4', d: 'q', tab: [[1, 0]] }, { n: 'E4', d: 'q', tab: [[2, 0]] }, { n: 'A4', d: 'q', tab: [[3, 0]] },
      { n: 'A4', d: 'q', tab: [[3, 0]] }, { n: 'E4', d: 'q', tab: [[2, 0]] }, { n: 'C4', d: 'q', tab: [[1, 0]] }, { n: 'G4', d: 'q', tab: [[0, 0]] },
    ],
  }));
  UI.score('first-frets', () => ({
    time: '4/4', tab: true,
    notes: [
      { n: 'A4', d: 'q', tab: [[3, 0]] }, { n: 'A#4', d: 'q', tab: [[3, 1]] }, { n: 'B4', d: 'q', tab: [[3, 2]] }, { n: 'C5', d: 'q', tab: [[3, 3]] },
      { n: 'C5', d: 'q', tab: [[3, 3]] }, { n: 'B4', d: 'q', tab: [[3, 2]] }, { n: 'A#4', d: 'q', tab: [[3, 1]] }, { n: 'A4', d: 'q', tab: [[3, 0]] },
      { n: 'E4', d: 'q', tab: [[2, 0]] }, { n: 'F4', d: 'q', tab: [[2, 1]] }, { n: 'F#4', d: 'q', tab: [[2, 2]] }, { n: 'G4', d: 'q', tab: [[2, 3]] },
      { n: 'G4', d: 'q', tab: [[2, 3]] }, { n: 'F#4', d: 'q', tab: [[2, 2]] }, { n: 'F4', d: 'q', tab: [[2, 1]] }, { n: 'E4', d: 'q', tab: [[2, 0]] },
    ],
  }));

  UI.section({
    id: 'strings', num: 2, title: 'The Strings', short: 'Strings & notes',
    blurb: 'Meet the four strings, discover the ukulele’s famous “high G”, learn the musical alphabet, see how frets change notes, and read your first TAB.',
    lessons: [
      {
        id: 'four', title: 'Meet the four strings',
        render: () => `
          <p>Your ukulele has four strings. Each one is tuned to a different note, named with a letter: <b>G</b>, <b>C</b>, <b>E</b> and <b>A</b>.
          When you hold the ukulele to play, <b>G is the string nearest your chin</b> and <b>A is the string nearest the floor</b>.</p>
          <p>Strings are also numbered, counting from the floor upwards: <b>A = 1st string</b>, E = 2nd, C = 3rd and <b>G = 4th</b>.</p>
          <div class="card" data-widget="strings"></div>
          <p class="caption">${Settings.lefty ? 'Front view of a left-handed ukulele with the headstock pointing up — the same view used by chord charts.' : 'Front view of a right-handed ukulele with the headstock pointing up.'} Click each string to hear it.</p>
          <h3>A rhyme to remember them</h3>
          <p>The four open strings played from G to A sound like the phrase <b>“My Dog Has Fleas”</b>. Or remember the letters with <b>“Good Cats Eat Anything”</b>.</p>
          <div class="btn-row">${UI.btn('Play “My Dog Has Fleas”', 'data-mdhf', 'sound')}</div>`,
        mount: el => {
          const w = stringsWidget(el.querySelector('[data-widget="strings"]'));
          el.querySelector('[data-mdhf]').addEventListener('click', () => {
            [0, 1, 2, 3].forEach((s, i) => setTimeout(() => w._twang(s), i * 520));
          });
        },
      },
      {
        id: 'high-g', title: 'The secret of the “high G”',
        render: () => `
          <p>Here’s something that surprises guitar players: on a standard ukulele the <b>G string is not the lowest note</b>. It’s tuned <i>higher</i> than the C and E strings next to it.
          This is called <b>re-entrant tuning</b>, and it gives the ukulele its bright, sparkly sound.</p>
          <div class="two-col">
            <div class="card center"><h4>Standard (high G)</h4>${Diagrams.pitchStairs()}<p class="caption">Click the bars to hear each string.</p></div>
            <div class="card center"><h4>Low G (linear)</h4>${Diagrams.pitchStairs({ lowG: true })}<p class="caption">Some tenor players use a thicker, lower G string.</p></div>
          </div>
          <div class="btn-row">${UI.btn('Hear standard tuning', 'data-play-notes="G4 C4 E4 A4"', 'sound')}${UI.btn('Hear low-G tuning', 'data-play-notes="G3 C4 E4 A4"', 'sound', 'btn-ghost')}</div>
          ${UI.callout('info', 'Which do I have?', 'Most ukuleles come with a high G (all four strings look similar in thickness). If your G string is noticeably the thickest — or wound with metal — you have a low G. Everything in this course works with either, and the <a href="#/tuner">Tuner</a> has settings for both.')}`,
      },
      {
        id: 'alphabet', title: 'The musical alphabet',
        render: () => `
          <p>Music uses just seven letters: <b>A B C D E F G</b>. After G, the letters start again at A — just a bit higher. That repeating cycle is called an <b>octave</b>.</p>
          <div class="alpha-ring" aria-hidden="true">${['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'].map((l, i) => `<span style="animation-delay:${i * 0.18}s">${l}</span>`).join('')}</div>
          <p>Between most letters there is an “in-between” note. These are named with <b>sharps (♯)</b>, meaning “a little higher”, or <b>flats (♭)</b>, meaning “a little lower”.
          So the note between C and D can be called <b>C♯</b> (C sharp) or <b>D♭</b> (D flat) — two names for the same sound.</p>
          <p>A piano keyboard makes this easy to see. The white keys are the seven letters; the black keys are the sharps and flats. <b>Click the keys</b> to hear them.</p>
          ${UI.keyboardEl({ from: 60, to: 83, octaves: true })}
          <h3>Half steps and whole steps</h3>
          <div class="two-col">
            <div class="card"><h4>Half step (semitone)</h4><p>The smallest step in music: from one key to the very next key (black or white). On the ukulele, it’s moving <b>one fret</b>.</p>
              <p>Notice there is <b>no black key between B and C, or between E and F</b>. These pairs are only a half step apart.</p></div>
            <div class="card"><h4>Whole step (tone)</h4><p>Two half steps. Skip a key: C to D, or E to F♯. On the ukulele, it’s moving <b>two frets</b>.</p></div>
          </div>
          <div class="all-12"><b>All 12 notes:</b> C · C♯/D♭ · D · D♯/E♭ · E · F · F♯/G♭ · G · G♯/A♭ · A · A♯/B♭ · B · (then C again)</div>
          ${UI.btn('Play all 12 notes from C', 'data-play-notes="C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 C5" data-gap="0.3"', 'sound')}`,
      },
      {
        id: 'frets', title: 'Frets make new notes',
        render: () => `
          <p>When you press a string down just behind a fret, you make the vibrating part of the string shorter — and a shorter string makes a <b>higher note</b>.
          Each fret raises the note by exactly <b>one half step</b>.</p>
          <p>Below is your fretboard. It’s drawn the way you see it when you glance down at your ukulele while playing: <b>${Settings.lefty ? 'headstock on the right' : 'headstock on the left'}</b>, and the <b>A string on top</b> (the same order as TAB, which you’ll meet next).
          <b>Click anywhere on it</b> to hear that note.</p>
          <div class="card">
            <div class="fb-toolbar"><label class="chk"><input type="checkbox" data-shownames> Show all note names</label><span class="fb-readout" aria-live="polite">Click a fret…</span></div>
            <div data-widget="fb"></div>
          </div>
          <h3>Watch it climb</h3>
          <p>Press play to hear the A string go up one fret at a time — every note is one half step higher than the last.</p>
          <div class="btn-row">${UI.btn('Climb the A string', 'data-climb', 'play')}</div>
          <div data-widget="climb-fb" class="card"></div>`,
        mount: el => {
          const fbHolder = el.querySelector('[data-widget="fb"]');
          const readout = el.querySelector('.fb-readout');
          const draw = (showAll) => {
            fbHolder.innerHTML = Diagrams.fretboard({ frets: 12, clickable: true, showAll });
          };
          draw(false);
          fbHolder.addEventListener('click', e => {
            const g = e.target.closest('[data-midi]');
            if (!g) return;
            const m = +g.dataset.midi;
            Sound.pluck(m);
            const s = +g.dataset.s, f = +g.dataset.f;
            const sharp = Theory.midiName(m, false, false), flat = Theory.midiName(m, true, false);
            readout.innerHTML = `<b>${Theory.pretty(sharp)}${sharp !== flat ? ' / ' + Theory.pretty(flat) : ''}</b> — ${Theory.STRING_NAMES[s]} string, ${f === 0 ? 'open' : 'fret ' + f}`;
            fbHolder.querySelectorAll('.fb-sel').forEach(x => x.remove());
            const svg = fbHolder.querySelector('svg');
            const tmp = document.createElement('div');
            tmp.innerHTML = Diagrams.fretboard({ frets: 12, marks: [{ s, f, label: Theory.pretty(sharp), cls: 'fb-sel' }] });
            const mark = tmp.querySelector('.fb-mark');
            mark.classList.add('fb-sel');
            svg.appendChild(mark);
          });
          el.querySelector('[data-shownames]').addEventListener('change', e => draw(e.target.checked));

          const climb = el.querySelector('[data-widget="climb-fb"]');
          const drawClimb = f => {
            climb.innerHTML = Diagrams.fretboard({ frets: 12, marks: f === null ? [] : [{ s: 3, f, label: Theory.pretty(Theory.noteAt(3, f)), cls: 'active' }] });
          };
          drawClimb(null);
          let h = null;
          el.querySelector('[data-climb]').addEventListener('click', () => {
            if (h) h.stop();
            const events = [];
            for (let f = 0; f <= 12; f++) events.push({ beat: f, f, run: t => Sound.pluck(69 + f, t, { length: 0.4 }) });
            h = Sound.play(events, { bpm: 110, onVisual: ev => { if (ev.f !== undefined) drawClimb(ev.f); } });
          });
        },
      },
      {
        id: 'tab', title: 'Reading TAB',
        render: () => `
          <p><b>TAB</b> (short for tablature) is the easiest way to read ukulele music — no music theory needed! It’s a picture of your strings:</p>
          <ul class="ticks">
            <li>There are <b>four lines</b>, one for each string. The <b>top line is the A string</b> (nearest the floor), the bottom line is the G string.</li>
            <li>A <b>number</b> on a line tells you which <b>fret</b> to press on that string. <b>0</b> means play the string open (no fret).</li>
            <li>Read from <b>left to right</b>.</li>
          </ul>
          <div class="card">${tabDiagram()}</div>
          ${UI.callout('lefty', 'TAB is the same for everyone', 'TAB doesn’t change for left-handed players — it describes strings and frets, not which hand you use. Lefties and righties read exactly the same TAB.')}
          <h3>Your first exercise: open strings</h3>
          <p>Below, the top part is standard music notation (you’ll learn it later) and the bottom part is TAB. For now, just follow the TAB.
          Pluck each string with your <b>left thumb</b> or index finger. Press <b>Play</b> to hear it and watch the notes light up — then play along!</p>
          <div data-score-player="open-strings" data-bpm="70"></div>
          <h3>Exercise 2: your first fretted notes</h3>
          <p>Now use your right-hand fingers: <b>finger 1 for fret 1, finger 2 for fret 2, finger 3 for fret 3</b>. This is called “one finger per fret”.</p>
          <div data-score-player="first-frets" data-bpm="60"></div>`,
      },
      {
        id: 'quiz', title: 'Quiz: know your strings',
        render: () => `
          <p>Test yourself! Two quick quizzes — one about names, one for your ears.</p>
          <div class="two-col">
            <div class="card" data-quiz="names"></div>
            <div class="card" data-quiz="ears"></div>
          </div>`,
        mount: el => {
          UI.quiz(el.querySelector('[data-quiz="names"]'), {
            title: 'Name that string', rounds: 8,
            makeQuestion: () => {
              const si = Math.floor(Math.random() * 4);
              const askNum = Math.random() < 0.5;
              const prompt = askNum
                ? `Which note is the <b>${['4th', '3rd', '2nd', '1st'][si]}</b> string?`
                : `The highlighted string — what is it called?<div class="quiz-fig"></div>`;
              return {
                prompt,
                mount: p => {
                  const f = p.querySelector('.quiz-fig');
                  if (f) f.innerHTML = Diagrams.fretboard({ frets: 4, marks: [{ s: si, f: 0, label: '?', cls: 'active' }] });
                },
                options: ['G', 'C', 'E', 'A'].map((n, i) => ({ label: n, correct: i === si })),
                explain: `It’s the <b>${Theory.STRING_NAMES[si]}</b> string (string ${Theory.STRING_NUMBERS[si]}).`,
              };
            },
          });
          UI.quiz(el.querySelector('[data-quiz="ears"]'), {
            title: 'Which string did you hear?', rounds: 8,
            makeQuestion: () => {
              const si = Math.floor(Math.random() * 4);
              return {
                prompt: `Listen, then choose. ${UI.btn('Play again', 'data-again', 'sound', 'btn-small btn-ghost')}`,
                mount: p => {
                  setTimeout(() => Sound.pluck(Theory.STD_MIDI[si]), 250);
                  p.querySelector('[data-again]').addEventListener('click', () => Sound.pluck(Theory.STD_MIDI[si]));
                },
                options: ['G', 'C', 'E', 'A'].map((n, i) => ({ label: n, correct: i === si })),
                explain: `It was <b>${Theory.STRING_NAMES[si]}</b>. Tip: C is the lowest, A the highest.`,
              };
            },
          });
        },
      },
    ],
  });
})();
