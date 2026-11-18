/* Shared UI helpers, widget hydration and course registry. */
const UI = (() => {
  const sections = [];
  const scores = {}; // id -> () => spec
  const esc = Diagrams.esc;

  const ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" fill="currentColor"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  };

  function section(def) { sections.push(def); }
  function score(id, fn) { scores[id] = fn; }

  // ---------------- progress ----------------
  const PKEY = 'uke-trainer-progress';
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ }
  }
  function isDone(key) { return !!loadProgress()[key]; }
  function setDone(key, v) {
    const p = loadProgress();
    if (v) p[key] = true; else delete p[key];
    saveProgress(p);
    document.dispatchEvent(new CustomEvent('progress-changed'));
  }

  // ---------------- small builders ----------------
  function btn(label, attrs = '', icon = 'play', cls = '') {
    return `<button class="btn ${cls}" ${attrs}>${icon ? ICONS[icon] : ''}<span>${label}</span></button>`;
  }
  function callout(kind, title, html) {
    return `<div class="callout callout-${kind}"><div class="callout-title">${title}</div><div>${html}</div></div>`;
  }
  function chordCard(sym, { animate = true, showNotes = true, tip = true, notation = false } = {}) {
    const info = Theory.chordInfo(sym);
    return `<div class="chord-card" data-card="${esc(sym)}">
      <div data-chord="${esc(sym)}" data-anim="${animate ? 1 : 0}" data-shownotes="${showNotes ? 1 : 0}"></div>
      <div class="chord-card-body">
        <div class="chord-card-name">${esc(Theory.chordName(sym))}</div>
        <div class="chord-card-notes">Notes: ${info.notes.map(n => `<b>${Theory.pretty(n)}</b>`).join(' · ')}</div>
        ${tip ? `<p class="chord-tip">${info.tip}</p>` : ''}
        <div class="btn-row">${btn('Strum', `data-play-chord="${esc(sym)}"`, 'sound', 'btn-small')}${btn('One string at a time', `data-arp-chord="${esc(sym)}"`, 'play', 'btn-small btn-ghost')}${animate ? btn('Show me', `data-replay-chord="${esc(sym)}"`, 'replay', 'btn-small btn-ghost') : ''}</div>
        ${notation ? `<div class="mini-score" data-score="chord:${esc(sym)}"></div>` : ''}
      </div>
    </div>`;
  }
  function fretboardEl(opts) { return `<div class="fb-wrap" data-fretboard='${esc(JSON.stringify(opts))}'></div>`; }
  function keyboardEl(opts) { return `<div class="kb-wrap" data-keyboard='${esc(JSON.stringify(opts))}'></div>`; }

  // vibrate strings on a chord diagram
  function vibrate(svg) {
    if (!svg) return;
    svg.classList.remove('vibrate');
    void svg.getBoundingClientRect();
    svg.classList.add('vibrate');
    setTimeout(() => svg.classList.remove('vibrate'), 1400);
  }

  function arpeggiate(midis, gap = 0.38) {
    const c = Sound.context();
    let t = c.currentTime + 0.05;
    midis.forEach(m => { if (m !== null) { Sound.pluck(m, t, { velocity: 0.7 }); t += gap; } });
  }

  // ---------------- hydration ----------------
  function hydrate(root) {
    root.querySelectorAll('[data-chord]').forEach(el => {
      const sym = el.dataset.chord;
      el.innerHTML = Diagrams.chord(sym, { animate: el.dataset.anim === '1', showNotes: el.dataset.shownotes === '1' });
      el.classList.add('chord-holder');
      el.title = 'Click to hear ' + Theory.chordName(sym);
      el.addEventListener('click', () => { Sound.strum(Sound.chordMidis(sym)); vibrate(el.querySelector('svg')); });
    });
    root.querySelectorAll('[data-play-chord]').forEach(b => b.addEventListener('click', () => {
      const sym = b.dataset.playChord;
      Sound.strum(Sound.chordMidis(sym));
      const card = b.closest('[data-card]');
      if (card) vibrate(card.querySelector('svg'));
    }));
    root.querySelectorAll('[data-arp-chord]').forEach(b => b.addEventListener('click', () => arpeggiate(Sound.chordMidis(b.dataset.arpChord))));
    root.querySelectorAll('[data-replay-chord]').forEach(b => b.addEventListener('click', () => {
      const card = b.closest('[data-card]');
      const holder = card.querySelector('.chord-holder');
      holder.innerHTML = Diagrams.chord(b.dataset.replayChord, { animate: true, showNotes: holder.dataset.shownotes === '1' });
    }));
    root.querySelectorAll('[data-play-notes]').forEach(b => b.addEventListener('click', () => {
      const midis = b.dataset.playNotes.split(/\s+/).map(Theory.toMidi);
      if (b.dataset.mode === 'together') Sound.strum(midis, 0, 'down', { gap: 0.012 });
      else arpeggiate(midis, parseFloat(b.dataset.gap || '0.45'));
    }));
    root.querySelectorAll('[data-play-note]').forEach(b => b.addEventListener('click', () => Sound.pluck(Theory.toMidi(b.dataset.playNote))));
    root.querySelectorAll('[data-fretboard]').forEach(el => {
      const opts = JSON.parse(el.dataset.fretboard);
      el.innerHTML = Diagrams.fretboard(opts);
      wireFretboard(el, opts);
    });
    root.querySelectorAll('[data-keyboard]').forEach(el => {
      const opts = JSON.parse(el.dataset.keyboard);
      el.innerHTML = Diagrams.keyboard(opts);
      el.querySelectorAll('.key').forEach(k => k.addEventListener('click', () => {
        Sound.pluck(+k.dataset.midi);
        k.classList.add('pressed');
        setTimeout(() => k.classList.remove('pressed'), 300);
      }));
    });
    root.querySelectorAll('[data-score]').forEach(el => {
      const fn = scoreSpec(el.dataset.score);
      if (!fn) return;
      const spec = fn();
      Notation.render(el, spec);
    });
    root.querySelectorAll('[data-score-player]').forEach(el => scorePlayer(el));
    root.querySelectorAll('.part, .part-label').forEach(p => {
      // ukulele parts interactivity is wired by the section itself
    });
  }

  function scoreSpec(id) {
    if (scores[id]) return scores[id];
    const [kind, arg] = id.split(':');
    if (kind === 'chord') return () => chordScore(arg);
    if (kind === 'scale') return () => scaleScore(arg);
    return null;
  }

  function chordScore(sym) {
    const info = Theory.chordInfo(sym);
    // chord tones in root position from octave 4
    const rootN = info.notes[0] + '4';
    const rootM = Theory.toMidi(rootN);
    const triad = info.notes.map((n, i) => (i === 0 ? rootN : Theory.withOctaveAbove(n, rootM + 1)));
    const played = info.played.filter(Boolean);
    const playedSorted = [...played].sort((a, b) => Theory.toMidi(a) - Theory.toMidi(b));
    const tab = info.frets.map((f, s) => [s, f]).filter(([, f]) => f >= 0);
    return {
      time: '4/4', showTime: false, tab: true, noteSpacing: 60, maxWidth: 520,
      notes: [
        { n: triad, d: 'h', label: 'chord tones' },
        { n: playedSorted, d: 'h', tab, label: 'on your uke' },
      ],
    };
  }

  function scaleScore(id) {
    const sc = Theory.FINGERED_SCALES[id];
    const up = sc.notes.map(([n, s, f]) => ({ n, d: 'q', tab: [[s, f]] }));
    const down = [...sc.notes].reverse().slice(1).map(([n, s, f]) => ({ n, d: 'q', tab: [[s, f]] }));
    const all = [...up, ...down];
    // pad to whole bars
    const total = all.length;
    const rem = (4 - (total % 4)) % 4;
    if (rem) { all[all.length - 1] = { ...all[all.length - 1], d: rem === 1 ? 'h' : rem === 2 ? 'hd' : 'w' }; }
    return { time: '4/4', tab: true, notes: all, accompany: false };
  }

  function wireFretboard(el, opts) {
    el.addEventListener('click', e => {
      const g = e.target.closest('[data-midi]');
      if (!g) return;
      const midi = +g.dataset.midi;
      Sound.pluck(midi);
      g.classList.add('pulse');
      setTimeout(() => g.classList.remove('pulse'), 400);
      el.dispatchEvent(new CustomEvent('fret-click', { detail: { s: +g.dataset.s, f: +g.dataset.f, midi }, bubbles: true }));
    });
  }

  /**
   * Player bar for a score. Markup:
   * <div data-score-player="scoreId" data-bpm="70" data-fretboard-target="#id" data-accompany="1"></div>
   */
  function scorePlayer(el) {
    const id = el.dataset.scorePlayer;
    const fn = scoreSpec(id);
    const bpm0 = +(el.dataset.bpm || 70);
    el.innerHTML = `<div class="player-bar">
        ${btn('Play', 'data-act="play"', 'play')}
        <label class="tempo">Speed <input type="range" min="40" max="160" value="${bpm0}" data-act="bpm"> <output>${bpm0}</output> bpm</label>
        <label class="chk"><input type="checkbox" data-act="metro"> Metronome</label>
        ${el.dataset.accompany ? `<label class="chk"><input type="checkbox" data-act="acc" checked> Chord backing</label>` : ''}
        <span class="countin" aria-live="polite"></span>
      </div>
      <div class="score-paper"><div class="score-target"></div></div>`;
    const target = el.querySelector('.score-target');
    const spec = fn();
    let score = Notation.render(target, spec);
    target._onRerender = h => { score = h; };
    const playB = el.querySelector('[data-act="play"]');
    const bpmI = el.querySelector('[data-act="bpm"]');
    const out = el.querySelector('output');
    const ci = el.querySelector('.countin');
    bpmI.addEventListener('input', () => { out.textContent = bpmI.value; });
    let handle = null;
    const fbSel = el.dataset.fretboardTarget;
    function stop() {
      if (handle) handle.stop();
      handle = null;
      target._playing = false;
      playB.innerHTML = ICONS.play + '<span>Play</span>';
      ci.textContent = '';
      if (fbSel) document.querySelectorAll(fbSel + ' .fb-mark').forEach(m => m.classList.remove('active'));
      Notation.clearActive(score);
    }
    playB.addEventListener('click', () => {
      if (handle) { stop(); return; }
      const accEl = el.querySelector('[data-act="acc"]');
      score.spec.accompany = accEl ? accEl.checked : false;
      target._playing = true;
      playB.innerHTML = ICONS.stop + '<span>Stop</span>';
      let noteIdx = -1;
      handle = Notation.play(score, {
        bpm: +bpmI.value, countIn: 4, metronome: el.querySelector('[data-act="metro"]').checked,
        onNote: ev => {
          if (ev.countIn) { ci.textContent = 'Get ready… ' + ev.countIn; return; }
          if (ev.beatTick !== undefined) return;
          ci.textContent = '';
          if (fbSel && ev.item) {
            noteIdx++;
            const marks = document.querySelectorAll(fbSel + ' .fb-mark');
            marks.forEach(m => m.classList.remove('active'));
            const tab = ev.item.src.tab;
            if (tab) tab.forEach(([s, f]) => {
              const m = document.querySelector(`${fbSel} .fb-mark[data-s="${s}"][data-f="${f}"]`);
              if (m) m.classList.add('active');
            });
          }
        },
        onEnd: () => stop(),
      });
    });
    el._stop = stop;
  }

  // ---------------- quiz helper ----------------
  function quiz(el, { makeQuestion, rounds = 10, title = 'Quiz' }) {
    let score = 0, n = 0, current = null, answered = false;
    el.classList.add('quiz');
    function next() {
      if (n >= rounds) {
        el.innerHTML = `<div class="quiz-done"><div class="quiz-score">${score} / ${rounds}</div><p>${score === rounds ? 'Perfect! 🎉' : score >= rounds * 0.7 ? 'Great work!' : 'Keep practising — you’ll get there!'}</p>${btn('Try again', 'data-q="again"', 'replay')}</div>`;
        el.querySelector('[data-q="again"]').addEventListener('click', () => { score = 0; n = 0; next(); });
        return;
      }
      answered = false;
      current = makeQuestion();
      el.innerHTML = `<div class="quiz-head"><span>${title}</span><span>Question ${n + 1} of ${rounds} · Score ${score}</span></div>
        <div class="quiz-prompt">${current.prompt}</div>
        <div class="quiz-options">${current.options.map((o, i) => `<button class="quiz-opt" data-i="${i}">${o.label}</button>`).join('')}</div>
        <div class="quiz-feedback" aria-live="polite"></div>`;
      if (current.mount) current.mount(el.querySelector('.quiz-prompt'));
      el.querySelectorAll('.quiz-opt').forEach(b => b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const i = +b.dataset.i;
        const ok = current.options[i].correct;
        if (ok) score++;
        n++;
        el.querySelectorAll('.quiz-opt').forEach((x, j) => {
          if (current.options[j].correct) x.classList.add('correct');
          else if (j === i) x.classList.add('wrong');
        });
        const fb = el.querySelector('.quiz-feedback');
        fb.innerHTML = (ok ? '<b class="ok">Correct!</b> ' : '<b class="no">Not quite.</b> ') + (current.explain || '') + ` ${btn(n >= rounds ? 'See score' : 'Next', 'data-q="next"', null, 'btn-small')}`;
        fb.querySelector('[data-q="next"]').addEventListener('click', next);
        if (current.after) current.after(ok);
      }));
    }
    next();
  }

  function shuffle(a) {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];

  return { section, sections, score, scores, btn, callout, chordCard, fretboardEl, keyboardEl, hydrate, vibrate, arpeggiate, scorePlayer, quiz, shuffle, pick, ICONS, isDone, setDone, loadProgress, esc };
})();
