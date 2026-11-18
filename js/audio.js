/* Audio: a Karplus–Strong plucked-string synth that sounds pleasantly
 * ukulele-like, plus strums, a metronome click and a look-ahead scheduler
 * for play-along exercises. */
const Sound = (() => {
  let ctx = null;
  let master = null;
  const cache = new Map();
  let volume = 0.8;

  function context() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = volume;
      // gentle "body" colouring
      const body = ctx.createBiquadFilter();
      body.type = 'peaking';
      body.frequency.value = 400;
      body.Q.value = 0.9;
      body.gain.value = 3;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master.connect(body).connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function setVolume(v) {
    volume = v;
    if (master) master.gain.value = v;
  }

  /** Build (and cache) a Karplus-Strong buffer for a frequency. */
  function pluckBuffer(freq, opts = {}) {
    const c = context();
    const sr = c.sampleRate;
    const N = Math.max(2, Math.round(sr / freq));
    const key = N + ':' + (opts.bright || 0.5) + ':' + (opts.dur || 2.4);
    if (cache.has(key)) return { buffer: cache.get(key), rate: freq * N / sr };
    const dur = opts.dur || 2.4;
    const len = Math.floor(sr * dur);
    const buf = c.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const ring = new Float32Array(N);
    // excitation: noise softened with a one-pole low-pass (nylon string = mellow)
    const bright = opts.bright ?? 0.5;
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const r = Math.random() * 2 - 1;
      lp = lp + (r - lp) * (0.25 + bright * 0.6);
      ring[i] = lp;
    }
    // remove DC from excitation
    const mean = ring.reduce((a, b) => a + b, 0) / N;
    for (let i = 0; i < N; i++) ring[i] -= mean;
    // decay tuned so low and high notes fade in a similar time
    const decay = Math.pow(0.0015, 1 / (freq * 1.6));
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx];
      const nxt = ring[(idx + 1) % N];
      out[i] = cur;
      ring[idx] = decay * (0.5 * (cur + nxt));
      idx = (idx + 1) % N;
    }
    // short fade in/out to avoid clicks
    const fade = Math.floor(sr * 0.003);
    for (let i = 0; i < fade; i++) out[i] *= i / fade;
    for (let i = 0; i < fade * 10; i++) out[len - 1 - i] *= i / (fade * 10);
    // normalise
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 0) for (let i = 0; i < len; i++) out[i] /= peak;
    cache.set(key, buf);
    return { buffer: buf, rate: freq * N / sr };
  }

  /** Play a single plucked note (MIDI number). Returns the scheduled time. */
  function pluck(midi, when = 0, opts = {}) {
    const c = context();
    const t = when || c.currentTime;
    const { buffer, rate } = pluckBuffer(Theory.midiToFreq(midi), opts);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = c.createGain();
    const vel = opts.velocity ?? 0.7;
    g.gain.setValueAtTime(vel, t);
    const len = opts.length;
    if (len) {
      g.gain.setValueAtTime(vel, t + len);
      g.gain.exponentialRampToValueAtTime(0.001, t + len + 0.12);
    }
    src.connect(g).connect(master);
    src.start(t);
    src.stop(t + (len ? len + 0.15 : buffer.duration / rate));
    return t;
  }

  /** Strum a list of MIDI notes (G C E A order). dir 'down' = G→A, 'up' = A→G. */
  function strum(midis, when = 0, dir = 'down', opts = {}) {
    const c = context();
    const t0 = when || c.currentTime;
    const list = midis.map((m, i) => ({ m, i })).filter(x => x.m !== null && x.m !== undefined);
    if (dir === 'up') list.reverse();
    const gap = opts.gap ?? 0.022;
    const base = opts.velocity ?? (dir === 'up' ? 0.42 : 0.6);
    // up strums mostly catch the top strings
    list.forEach((x, k) => {
      const vel = dir === 'up' && k > 2 ? base * 0.5 : base;
      pluck(x.m, t0 + k * gap, { velocity: vel, length: opts.length, bright: dir === 'up' ? 0.6 : 0.5 });
    });
    return t0;
  }

  function chordMidis(sym) {
    return Theory.chordInfo(sym).midis;
  }

  /** Metronome click; accent = first beat of bar. */
  function click(when = 0, accent = false, vol = 0.5) {
    const c = context();
    const t = when || c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * 0.35, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.06);
  }

  /** Pure reference tone (used by tuner for very low bass notes). */
  function tone(freq, duration = 2, type = 'triangle') {
    const c = context();
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.05);
    g.gain.setValueAtTime(0.5, t + duration - 0.3);
    g.gain.linearRampToValueAtTime(0, t + duration);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + duration + 0.05);
    return { stop: () => { try { g.gain.cancelScheduledValues(0); g.gain.setTargetAtTime(0, c.currentTime, 0.03); o.stop(c.currentTime + 0.2); } catch (e) { /* already stopped */ } } };
  }

  /**
   * Sequencer. events: [{beat, dur, run(time, ev)}], plays at bpm.
   * onVisual(ev) is called (via setTimeout) when each event sounds.
   * Returns a handle with stop(). If loopBeats set, the sequence repeats.
   */
  function play(events, { bpm = 80, loopBeats = null, onVisual = null, onEnd = null, countIn = 0, beatsPerBar = 4, metronome = false } = {}) {
    const c = context();
    const spb = 60 / bpm;
    let start = c.currentTime + 0.12;
    let stopped = false;
    const timers = new Set();
    const lookahead = 0.15;
    let queue = [];
    let loopIndex = 0;
    const totalBeats = loopBeats || Math.max(0, ...events.map(e => e.beat + (e.dur || 1)));

    // count-in clicks
    for (let i = 0; i < countIn; i++) {
      const t = start + i * spb;
      click(t, i % beatsPerBar === 0, 0.6);
      const tm = setTimeout(() => { timers.delete(tm); if (!stopped && onVisual) onVisual({ countIn: countIn - i }); }, Math.max(0, (t - c.currentTime) * 1000));
      timers.add(tm);
    }
    start += countIn * spb;

    function buildQueue(offsetBeats) {
      const q = events.map(e => ({ ...e, time: start + (e.beat + offsetBeats) * spb }));
      if (metronome) {
        for (let b = 0; b < totalBeats; b++) {
          q.push({ beat: b, time: start + (b + offsetBeats) * spb, metro: true, accent: b % beatsPerBar === 0 });
        }
      }
      return q.sort((a, b) => a.time - b.time);
    }
    queue = buildQueue(0);

    const interval = setInterval(() => {
      if (stopped) return;
      const now = c.currentTime;
      while (queue.length && queue[0].time < now + lookahead) {
        const ev = queue.shift();
        if (ev.metro) {
          click(ev.time, ev.accent, 0.4);
          if (onVisual) {
            const tm = setTimeout(() => { timers.delete(tm); if (!stopped) onVisual({ beatTick: ev.beat }); }, Math.max(0, (ev.time - now) * 1000));
            timers.add(tm);
          }
          continue;
        }
        if (ev.run) ev.run(ev.time, ev);
        if (onVisual) {
          const tm = setTimeout(() => { timers.delete(tm); if (!stopped) onVisual(ev); }, Math.max(0, (ev.time - now) * 1000));
          timers.add(tm);
        }
      }
      if (!queue.length) {
        if (loopBeats) {
          loopIndex++;
          queue = buildQueue(loopIndex * loopBeats);
        } else {
          const endT = start + totalBeats * spb;
          if (now > endT) {
            handle.stop();
            if (onEnd) onEnd();
          }
        }
      }
    }, 25);

    const handle = {
      stop() {
        if (stopped) return;
        stopped = true;
        clearInterval(interval);
        timers.forEach(t => clearTimeout(t));
        timers.clear();
      },
      get stopped() { return stopped; },
    };
    return handle;
  }

  return { context, pluck, strum, chordMidis, click, tone, play, setVolume };
})();
