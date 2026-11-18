/* Standard notation + TAB rendering using VexFlow 4 (vendored, works offline).
 *
 * A score spec:
 *   { notes: [ {n:'C4' | ['C4','E4'] | null (rest), d:'q', tab:[[stringIdx, fret], ...], chord:'C', lyric:'Twin-'} ],
 *     tab: true, time: '4/4', title: '' }
 * Durations: w h q 8 hd qd (and rests when n is null).
 */
const Notation = (() => {
  const VF = Vex.Flow;
  const BEATS = { w: 4, h: 2, q: 1, 8: 0.5, 16: 0.25, hd: 3, qd: 1.5, '8d': 0.75 };
  const registry = new Set();

  function beatsOf(d) { return BEATS[d]; }

  function splitMeasures(notes, beatsPerBar) {
    const measures = [];
    let cur = [], acc = 0;
    notes.forEach(n => {
      cur.push(n);
      acc += beatsOf(n.d);
      if (acc >= beatsPerBar - 1e-6) { measures.push(cur); cur = []; acc = 0; }
    });
    if (cur.length) measures.push(cur);
    return measures;
  }

  function makeStaveNote(n) {
    const isRest = n.n === null || n.n === undefined;
    const names = isRest ? ['B4'] : (Array.isArray(n.n) ? n.n : [n.n]);
    const dot = n.d.endsWith('d');
    const base = dot ? n.d.slice(0, -1) : n.d;
    const sn = new VF.StaveNote({
      keys: names.map(Theory.vfKey),
      duration: base + (isRest ? 'r' : ''),
      auto_stem: true,
    });
    if (!isRest) {
      names.forEach((nm, i) => {
        const p = Theory.parse(nm);
        if (p.acc !== 0) sn.addModifier(new VF.Accidental(p.acc > 0 ? '#'.repeat(p.acc) : 'b'.repeat(-p.acc)), i);
      });
    }
    if (dot) VF.Dot.buildAndAttach([sn], { all: true });
    if (n.chord) {
      const a = new VF.Annotation(n.chord.replace('b', '♭').replace('#', '♯'));
      a.setFont('sans-serif', 13, 'bold');
      a.setVerticalJustification(VF.Annotation.VerticalJustify.TOP);
      sn.addModifier(a, 0);
    }
    if (n.lyric) {
      const a = new VF.Annotation(n.lyric);
      a.setFont('sans-serif', 12);
      a.setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM);
      sn.addModifier(a, 0);
    }
    if (n.label) {
      const a = new VF.Annotation(n.label);
      a.setFont('sans-serif', 11, 'italic');
      a.setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM);
      sn.addModifier(a, 0);
    }
    return sn;
  }

  function makeTabNote(n) {
    const isRest = n.n === null || n.n === undefined || !n.tab;
    const dot = n.d.endsWith('d');
    const base = dot ? n.d.slice(0, -1) : n.d;
    if (isRest) {
      // invisible spacer of same length
      const g = new VF.GhostNote({ duration: base });
      if (dot) VF.Dot.buildAndAttach([g], { all: true });
      return g;
    }
    const tn = new VF.TabNote({
      positions: n.tab.map(([s, f]) => ({ str: 4 - s, fret: String(f) })),
      duration: base,
    });
    if (dot) VF.Dot.buildAndAttach([tn], { all: true });
    return tn;
  }

  /**
   * Render a score into `el`. Returns {items:[{beat, dur, midis, els()}], totalBeats}.
   */
  function render(el, spec) {
    registry.add(el);
    el._scoreSpec = spec;
    el.innerHTML = '';
    el.classList.add('score');
    const [bpb, beatValue] = (spec.time || '4/4').split('/').map(Number);
    const beatsPerBar = bpb * (4 / beatValue);
    const measures = spec.measures || splitMeasures(spec.notes, beatsPerBar);
    const width = Math.max(220, Math.min(spec.maxWidth || 1100, el.clientWidth || 700));
    const hasTab = spec.tab !== false;
    const hasLyrics = spec.notes ? spec.notes.some(n => n.lyric || n.label) : false;
    const staveH = 110 + (hasLyrics ? 22 : 0);
    const tabH = hasTab ? 96 : 0;
    const rowH = staveH + tabH + 10;
    const clefW = 70, timeW = 30;

    // measure widths proportional to note count
    const minW = m => 44 + m.length * (spec.noteSpacing || 34);
    const rows = [];
    let row = [], rowW = 0;
    measures.forEach((m, i) => {
      const w = minW(m) + (row.length === 0 ? clefW : 0) + (i === 0 ? timeW : 0);
      if (row.length && rowW + w > width - 20) { rows.push(row); row = []; rowW = 0; }
      row.push(m);
      rowW += minW(m) + (row.length === 1 ? clefW : 0) + (i === 0 ? timeW : 0);
    });
    if (row.length) rows.push(row);

    const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
    const height = rows.length * rowH + 20;
    renderer.resize(width, height);
    const ctx = renderer.getContext();
    ctx.setFont('sans-serif', 10);

    const items = [];
    let beat = 0;
    let mIndex = 0;
    rows.forEach((r, ri) => {
      const base = r.reduce((a, m, j) => a + minW(m) + (j === 0 ? clefW : 0) + (mIndex === 0 && j === 0 ? timeW : 0), 0);
      const stretch = spec.stretch === false && rows.length === 1 ? 1 : (width - 12) / base;
      let x = 6;
      const y = 10 + ri * rowH + (spec.notes && spec.notes.some(n => n.chord) ? 10 : 0);
      r.forEach((m, j) => {
        const first = j === 0;
        const extra = (first ? clefW : 0) + (mIndex === 0 && first ? timeW : 0);
        const w = (minW(m) + extra) * stretch;
        const stave = new VF.Stave(x, y, w);
        if (first) stave.addClef('treble');
        if (mIndex === 0 && spec.showTime !== false) stave.addTimeSignature(spec.time || '4/4');
        if (mIndex === measures.length - 1) stave.setEndBarType(VF.Barline.type.END);
        stave.setContext(ctx).draw();
        let tabStave = null;
        if (hasTab) {
          tabStave = new VF.TabStave(x, y + staveH - 18, w, { num_lines: 4 });
          // line TAB numbers up exactly under the notes (the TAB staff has no clef)
          tabStave.setNoteStartX(stave.getNoteStartX());
          if (mIndex === measures.length - 1) tabStave.setEndBarType(VF.Barline.type.END);
          tabStave.setContext(ctx).draw();
          if (first) {
            new VF.StaveConnector(stave, tabStave).setType(VF.StaveConnector.type.BRACKET).setContext(ctx).draw();
            // compact "TAB" label sized for 4 strings (VexFlow's glyph is sized for 6)
            ctx.save();
            ctx.setFont('sans-serif', 10, 'bold');
            ['T', 'A', 'B'].forEach((ch, i) => ctx.fillText(ch, x + 8, (tabStave.getYForLine(i) + tabStave.getYForLine(i + 1)) / 2 + 4));
            ctx.restore();
          }
          new VF.StaveConnector(stave, tabStave).setType(VF.StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
          new VF.StaveConnector(stave, tabStave).setType(VF.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
        }
        const sNotes = m.map(makeStaveNote);
        const tNotes = hasTab ? m.map(makeTabNote) : [];
        const voice = new VF.Voice({ num_beats: bpb, beat_value: beatValue }).setMode(VF.Voice.Mode.SOFT).addTickables(sNotes);
        const voices = [voice];
        let tVoice = null;
        if (hasTab) {
          tVoice = new VF.Voice({ num_beats: bpb, beat_value: beatValue }).setMode(VF.Voice.Mode.SOFT).addTickables(tNotes);
          voices.push(tVoice);
        }
        const beams = VF.Beam.generateBeams(sNotes.filter(n => !n.isRest()));
        const fmt = new VF.Formatter();
        fmt.joinVoices([voice]);
        if (tVoice) fmt.joinVoices([tVoice]);
        fmt.format(voices, w - (stave.getNoteStartX() - x) - 14);
        voice.draw(ctx, stave);
        if (tVoice) tVoice.draw(ctx, tabStave);
        beams.forEach(b => b.setContext(ctx).draw());

        m.forEach((n, k) => {
          const isRest = n.n === null || n.n === undefined;
          const names = isRest ? [] : (Array.isArray(n.n) ? n.n : [n.n]);
          const sn = sNotes[k], tn = tNotes[k];
          const item = {
            beat, dur: beatsOf(n.d), src: n,
            midis: names.map(Theory.toMidi),
            els: () => [sn.getSVGElement && sn.getSVGElement(), tn && tn.getSVGElement && tn.getSVGElement()].filter(Boolean),
          };
          items.push(item);
          const svgEl = sn.getSVGElement && sn.getSVGElement();
          if (svgEl && !isRest) {
            svgEl.classList.add('vf-clickable');
            svgEl.addEventListener('click', () => {
              item.midis.forEach((md, z) => Sound.pluck(md, 0, { velocity: 0.7 }));
              flash(item);
              if (spec.onNoteClick) spec.onNoteClick(item);
            });
          }
          beat += beatsOf(n.d);
        });
        x += w;
        mIndex++;
      });
    });
    const handle = { el, items, totalBeats: beat, spec };
    el._score = handle;
    return handle;
  }

  function flash(item, ms = 400) {
    item.els().forEach(e => {
      e.classList.add('vf-active');
      setTimeout(() => e.classList.remove('vf-active'), ms);
    });
  }

  function clearActive(score) {
    score.el.querySelectorAll('.vf-active').forEach(e => e.classList.remove('vf-active'));
  }

  /** Play a rendered score with highlighting. Returns sequencer handle. */
  function play(score, { bpm = 80, countIn = 4, metronome = false, onNote = null, onEnd = null, strumChords = false } = {}) {
    const [bpb] = (score.spec.time || '4/4').split('/').map(Number);
    const events = score.items.filter(it => it.midis.length).map(it => ({
      beat: it.beat, dur: it.dur, item: it,
      run: (t) => {
        const len = it.dur * 60 / bpm * 0.95;
        if (it.midis.length > 1 && strumChords) Sound.strum(it.midis, t, 'down', { length: len });
        else it.midis.forEach(m => Sound.pluck(m, t, { length: len, velocity: 0.75 }));
      },
    }));
    // chord accompaniment (soft strum on chord symbols)
    if (score.spec.accompany) {
      score.items.forEach(it => {
        if (it.src.chord) {
          events.push({ beat: it.beat, dur: 0, run: (t) => Sound.strum(Sound.chordMidis(it.src.chord), t, 'down', { velocity: 0.28, gap: 0.03 }) });
        }
      });
    }
    clearActive(score);
    return Sound.play(events, {
      bpm, countIn, beatsPerBar: bpb, metronome,
      onVisual: ev => {
        if (!ev.item) { if (onNote) onNote(ev); return; }
        clearActive(score);
        ev.item.els().forEach(e => e.classList.add('vf-active'));
        if (onNote) onNote(ev);
      },
      onEnd: () => { setTimeout(() => clearActive(score), 500); if (onEnd) onEnd(); },
    });
  }

  // re-render on resize (scores are width-responsive)
  let rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      registry.forEach(el => {
        if (!document.body.contains(el)) { registry.delete(el); return; }
        if (el._scoreSpec && !el._playing) {
          const old = el._score;
          const h = render(el, el._scoreSpec);
          if (el._onRerender) el._onRerender(h, old);
        }
      });
    }, 250);
  });

  return { render, play, flash, clearActive, beatsOf };
})();
