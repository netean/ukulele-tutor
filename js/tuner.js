/* Chromatic/instrument tuner using the microphone.
 * Pitch detection: YIN (de Cheveigné & Kawahara, 2002) with parabolic
 * interpolation. The search range, analysis window, filtering and
 * decimation are adapted to the selected instrument so that very low bass
 * ukulele strings (E1 = 41 Hz, B0 = 31 Hz) are detected reliably. */
const Tuner = (() => {
  function yin(buf, sr, minF, maxF, threshold = 0.12) {
    const tauMin = Math.max(2, Math.floor(sr / maxF));
    const tauMax = Math.min(Math.floor(sr / minF), Math.floor(buf.length / 2));
    const W = buf.length - tauMax - 1;
    if (W < tauMax) return null;
    const cmnd = new Float32Array(tauMax + 2);
    cmnd[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= tauMax + 1; tau++) {
      let sum = 0;
      for (let j = 0; j < W; j++) {
        const x = buf[j] - buf[j + tau];
        sum += x * x;
      }
      running += sum;
      cmnd[tau] = running > 0 ? (sum * tau) / running : 1;
    }
    let tau = -1;
    for (let t = tauMin; t <= tauMax; t++) {
      if (cmnd[t] < threshold) {
        while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
        tau = t;
        break;
      }
    }
    if (tau < 0) {
      let best = 1, bt = -1;
      for (let t = tauMin; t <= tauMax; t++) if (cmnd[t] < best) { best = cmnd[t]; bt = t; }
      if (best < 0.35) tau = bt; else return null;
    }
    let better = tau;
    if (tau > 1 && tau < tauMax) {
      const s0 = cmnd[tau - 1], s1 = cmnd[tau], s2 = cmnd[tau + 1];
      const den = s0 + s2 - 2 * s1;
      if (den !== 0) better = tau + (s0 - s2) / (2 * den);
    }
    return { freq: sr / better, clarity: 1 - cmnd[tau] };
  }

  function config(inst) {
    const freqs = inst.strings.map(n => Theory.midiToFreq(Theory.toMidi(n)));
    const lo = Math.min(...freqs), hi = Math.max(...freqs);
    const minF = lo / 1.5, maxF = hi * 1.5;
    let fftSize = 4096, dec = 1;
    if (lo < 80) { fftSize = 16384; dec = 4; } else if (lo < 160) { fftSize = 8192; dec = 2; }
    return { freqs, minF, maxF, fftSize, dec, lowpass: Math.min(5000, maxF * 4), highpass: Math.max(20, minF * 0.7) };
  }

  function gaugeSvg() {
    let s = `<svg class="gauge" viewBox="0 0 320 190" role="img" aria-label="Tuning needle">`;
    const cx = 160, cy = 170, R = 140;
    const ang = c => (c / 50) * 60 * Math.PI / 180;
    const pt = (c, r) => [cx + r * Math.sin(ang(c)), cy - r * Math.cos(ang(c))];
    // zones
    const arc = (c1, c2, r, cls) => {
      const [x1, y1] = pt(c1, r), [x2, y2] = pt(c2, r);
      return `<path class="${cls}" d="M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}"/>`;
    };
    s += arc(-50, -15, R, 'gz-far') + arc(-15, -5, R, 'gz-near') + arc(-5, 5, R, 'gz-good') + arc(5, 15, R, 'gz-near') + arc(15, 50, R, 'gz-far');
    for (let c = -50; c <= 50; c += 5) {
      const big = c % 25 === 0;
      const [x1, y1] = pt(c, R - 14), [x2, y2] = pt(c, R - (big ? 32 : 22));
      s += `<line class="g-tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      if (big) { const [tx, ty] = pt(c, R - 46); s += `<text class="g-lbl" x="${tx}" y="${ty + 4}" text-anchor="middle">${c > 0 ? '+' + c : c}</text>`; }
    }
    s += `<text class="g-side" x="34" y="182">♭ too low</text><text class="g-side" x="286" y="182" text-anchor="end">too high ♯</text>`;
    s += `<g class="needle" style="transform-origin:${cx}px ${cy}px"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - R + 8}"/><circle cx="${cx}" cy="${cy}" r="9"/></g>`;
    s += `</svg>`;
    return s;
  }

  function mount(root) {
    const instSaved = (() => { try { return localStorage.getItem('uke-tuner-inst'); } catch (e) { return null; } })();
    let inst = Theory.INSTRUMENTS.find(i => i.id === instSaved) || Theory.INSTRUMENTS[0];
    let a4 = 440;
    let stream = null, ctx = null, analyser = null, srcNode = null, filters = [];
    let raf = null, lastRun = 0;
    let cfg = config(inst);
    let history = [];
    let manualIdx = null;
    let inTuneSince = null;
    const tuned = new Set();
    let smoothCents = 0;
    let refLoop = null;

    root.innerHTML = `
      <div class="tuner">
        <div class="tuner-left">
          <h4>1. Choose your instrument</h4>
          <div class="inst-list">${Theory.INSTRUMENTS.map(i => `
            <label class="inst ${i.id === inst.id ? 'on' : ''}"><input type="radio" name="inst" value="${i.id}" ${i.id === inst.id ? 'checked' : ''}>
              <span><b>${i.name}</b><small>${i.sub}</small></span></label>`).join('')}</div>
          <p class="inst-info caption"></p>
          <details class="tuner-adv"><summary>Advanced settings</summary>
            <label>Reference pitch A4 = <input type="number" min="415" max="466" step="1" value="440" data-k="a4"> Hz</label>
            <label>Microphone <select data-k="dev"><option value="">Default</option></select></label>
          </details>
        </div>
        <div class="tuner-main card">
          <h4>2. Turn on the microphone and play one string</h4>
          <div class="btn-row">${UI.btn('Start tuner', 'data-k="mic"', 'mic', 'btn-big')}<label class="chk"><input type="checkbox" data-k="auto" checked> Auto-detect string</label></div>
          <div class="tuner-display">
            <div class="t-note">–</div>
            <div class="t-target"></div>
            ${gaugeSvg()}
            <div class="t-cents">&nbsp;</div>
            <div class="t-status" aria-live="polite">Press <b>Start tuner</b> and allow microphone access.</div>
            <div class="t-freq"></div>
            <div class="level"><div class="level-bar"></div></div>
          </div>
          <h4>3. Strings ${'<small>(nearest your chin → nearest the floor)</small>'}</h4>
          <div class="t-strings"></div>
          <div class="btn-row"><label class="chk"><input type="checkbox" data-k="loop"> Repeat reference note</label></div>
          <p class="caption">Click a string to hear its reference note and to tune that string only. Tip: turn off “Repeat reference note” while using the microphone.</p>
        </div>
      </div>`;

    const $ = s => root.querySelector(s);
    const noteEl = $('.t-note'), targetEl = $('.t-target'), centsEl = $('.t-cents'), statusEl = $('.t-status'), freqEl = $('.t-freq');
    const needle = $('.needle'), levelBar = $('.level-bar'), display = $('.tuner-display');

    function drawStrings() {
      $('.inst-info').textContent = inst.info;
      $('.t-strings').innerHTML = inst.strings.map((n, i) => {
        const f = Theory.midiToFreq(Theory.toMidi(n), a4);
        return `<button class="t-string ${manualIdx === i ? 'sel' : ''} ${tuned.has(i) ? 'done' : ''}" data-i="${i}">
          <span class="ts-name">${Theory.pretty(n)}<sub>${n.replace(/^[A-G][#b]?/, '')}</sub></span><span class="ts-hz">${f.toFixed(1)} Hz</span><span class="ts-ok">${UI.ICONS.check}</span></button>`;
      }).join('');
      root.querySelectorAll('.t-string').forEach(b => b.addEventListener('click', () => {
        const i = +b.dataset.i;
        manualIdx = manualIdx === i && $('[data-k="auto"]').checked ? null : i;
        if (manualIdx !== null) $('[data-k="auto"]').checked = false;
        playRef(i);
        drawStrings();
      }));
    }

    function playRef(i) {
      const m = Theory.toMidi(inst.strings[i]);
      const freq = Theory.midiToFreq(m, a4);
      const once = () => Sound.pluck(Theory.freqToMidi(freq), 0, { velocity: 0.85 });
      once();
      if (refLoop) clearInterval(refLoop);
      refLoop = null;
      if ($('[data-k="loop"]').checked) refLoop = setInterval(once, 2200);
    }

    function setInst(id) {
      inst = Theory.INSTRUMENTS.find(i => i.id === id);
      try { localStorage.setItem('uke-tuner-inst', id); } catch (e) { /* ignore */ }
      root.querySelectorAll('.inst').forEach(l => l.classList.toggle('on', l.querySelector('input').value === id));
      cfg = config(inst);
      tuned.clear();
      manualIdx = null;
      history = [];
      drawStrings();
      if (stream) restartGraph();
    }

    root.querySelectorAll('input[name="inst"]').forEach(r => r.addEventListener('change', () => setInst(r.value)));
    $('[data-k="a4"]').addEventListener('change', e => { a4 = Math.min(466, Math.max(415, +e.target.value || 440)); drawStrings(); });
    $('[data-k="auto"]').addEventListener('change', e => { if (e.target.checked) { manualIdx = null; drawStrings(); } });
    $('[data-k="loop"]').addEventListener('change', e => { if (!e.target.checked && refLoop) { clearInterval(refLoop); refLoop = null; } });
    $('[data-k="mic"]').addEventListener('click', () => (stream ? stopMic() : startMic()));
    $('[data-k="dev"]').addEventListener('change', () => { if (stream) { stopMic(); startMic(); } });

    async function listDevices() {
      try {
        const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput');
        const sel = $('[data-k="dev"]');
        const cur = sel.value;
        sel.innerHTML = '<option value="">Default</option>' + devs.map((d, i) => `<option value="${d.deviceId}">${UI.esc(d.label || 'Microphone ' + (i + 1))}</option>`).join('');
        sel.value = cur;
      } catch (e) { /* ignore */ }
    }

    async function startMic() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusEl.innerHTML = '<b class="no">Microphone not available.</b> Open the guide with the <code>run-ukulele-trainer.sh</code> launcher (it serves the page from <code>http://localhost</code>, which browsers allow to use the microphone).';
        return;
      }
      try {
        const dev = $('[data-k="dev"]').value;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: dev ? { exact: dev } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      } catch (e) {
        stream = null;
        statusEl.innerHTML = `<b class="no">Couldn’t use the microphone</b> (${UI.esc(e.name || e.message)}). Check that a microphone is connected, that your browser has permission, and on Linux that it isn’t muted in your sound settings (e.g. <code>pavucontrol</code>).`;
        return;
      }
      ctx = Sound.context();
      srcNode = ctx.createMediaStreamSource(stream);
      restartGraph();
      listDevices();
      $('[data-k="mic"]').innerHTML = UI.ICONS.stop + '<span>Stop tuner</span>';
      display.classList.add('live');
      statusEl.textContent = 'Listening… pluck one string and let it ring.';
      loop();
    }

    function restartGraph() {
      if (!srcNode) return;
      srcNode.disconnect();
      filters.forEach(f => f.disconnect());
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = cfg.highpass; hp.Q.value = 0.7;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cfg.lowpass; lp.Q.value = 0.7;
      analyser = ctx.createAnalyser();
      analyser.fftSize = cfg.fftSize;
      analyser.smoothingTimeConstant = 0;
      srcNode.connect(hp).connect(lp).connect(analyser);
      filters = [hp, lp];
      history = [];
    }

    function stopMic() {
      cancelAnimationFrame(raf);
      raf = null;
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = null;
      if (srcNode) srcNode.disconnect();
      filters.forEach(f => f.disconnect());
      srcNode = null;
      $('[data-k="mic"]').innerHTML = UI.ICONS.mic + '<span>Start tuner</span>';
      display.classList.remove('live', 'good', 'near', 'far');
      statusEl.textContent = 'Tuner stopped.';
      noteEl.textContent = '–';
      targetEl.textContent = '';
      centsEl.innerHTML = '&nbsp;';
      freqEl.textContent = '';
      levelBar.style.width = '0%';
      needle.style.transform = 'rotate(0deg)';
    }

    let buf = null;
    function loop(now = 0) {
      raf = requestAnimationFrame(loop);
      if (now - lastRun < 45) return;
      lastRun = now;
      if (!buf || buf.length !== analyser.fftSize) buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);
      levelBar.style.width = Math.min(100, rms * 600) + '%';
      if (rms < 0.004) { idle(); return; }
      let data = buf, sr = ctx.sampleRate;
      if (cfg.dec > 1) {
        const n = Math.floor(buf.length / cfg.dec);
        data = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          let s = 0;
          for (let k = 0; k < cfg.dec; k++) s += buf[i * cfg.dec + k];
          data[i] = s / cfg.dec;
        }
        sr = sr / cfg.dec;
      }
      const r = yin(data, sr, cfg.minF, cfg.maxF);
      if (!r || r.clarity < 0.75) { return; }
      // stability: reset history on big jumps (new string)
      if (history.length) {
        const med = median(history);
        if (Math.abs(1200 * Math.log2(r.freq / med)) > 80) history = [];
      }
      history.push(r.freq);
      if (history.length > 7) history.shift();
      if (history.length < 2) return;
      show(median(history));
    }

    let idleTimer = null;
    function idle() {
      if (idleTimer) return;
      idleTimer = setTimeout(() => {
        idleTimer = null;
        if (!stream) return;
        history = [];
        display.classList.remove('good', 'near', 'far');
        statusEl.textContent = 'Listening… pluck one string and let it ring.';
        inTuneSince = null;
      }, 900);
    }

    function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

    function show(freq) {
      clearTimeout(idleTimer); idleTimer = null;
      const midiF = Theory.freqToMidi(freq, a4);
      const nearest = Math.round(midiF);
      noteEl.innerHTML = `${Theory.pretty(Theory.midiName(nearest))}<sub>${Math.floor(nearest / 12) - 1}</sub>`;
      freqEl.textContent = freq.toFixed(1) + ' Hz';
      // choose target string
      const targets = inst.strings.map(n => Theory.midiToFreq(Theory.toMidi(n), a4));
      let idx = manualIdx;
      if (idx === null) {
        let best = Infinity;
        targets.forEach((t, i) => { const d = Math.abs(Math.log2(freq / t)); if (d < best) { best = d; idx = i; } });
      }
      const cents = 1200 * Math.log2(freq / targets[idx]);
      smoothCents = smoothCents * 0.5 + cents * 0.5;
      const shown = Math.max(-50, Math.min(50, smoothCents));
      needle.style.transform = `rotate(${(shown / 50) * 60}deg)`;
      targetEl.innerHTML = `Tuning the <b>${Theory.pretty(inst.strings[idx])}</b> string (${idx + 1} of ${inst.strings.length})`;
      centsEl.textContent = (cents > 0 ? '+' : '') + cents.toFixed(0) + ' cents';
      root.querySelectorAll('.t-string').forEach(b => b.classList.toggle('hearing', +b.dataset.i === idx));
      display.classList.remove('good', 'near', 'far');
      const a = Math.abs(cents);
      if (a <= 5) {
        display.classList.add('good');
        statusEl.innerHTML = '<b>In tune!</b> 🎉';
        if (!inTuneSince) inTuneSince = performance.now();
        if (performance.now() - inTuneSince > 600 && !tuned.has(idx)) { tuned.add(idx); drawStrings(); }
      } else {
        inTuneSince = null;
        display.classList.add(a <= 15 ? 'near' : 'far');
        const big = a > 50 ? (a > 600 ? ' (a long way off — is this the right string?)' : ' — keep going') : '';
        statusEl.innerHTML = cents < 0
          ? `<b>Too low (flat)</b> — slowly <b>tighten</b> this string${big}`
          : `<b>Too high (sharp)</b> — slowly <b>loosen</b> this string${big}`;
      }
    }

    drawStrings();
    return { stop: () => { stopMic(); if (refLoop) clearInterval(refLoop); refLoop = null; } };
  }

  return { mount, yin, config };
})();

UI.section({
  id: 'tuner', num: 7, title: 'Tuner', short: 'Tune up',
  blurb: 'Tune your ukulele with your computer’s microphone. Works for soprano, concert, tenor, low-G, baritone, guitalele and 4- or 5-string bass ukuleles.',
  onLeave: root => { if (root._tuner) root._tuner.stop(); },
  lessons: [
    {
      id: 'tool', title: 'Tune your ukulele', noProgress: true,
      render: () => `<div data-widget="tuner"></div>`,
      mount: (el, root) => { root._tuner = Tuner.mount(el.querySelector('[data-widget="tuner"]')); },
    },
    {
      id: 'how', title: 'How to tune (step by step)',
      render: () => `
        <ol class="steps">
          <li>Find a quiet room. Choose your ukulele type above and press <b>Start tuner</b>. Allow microphone access if your browser asks.</li>
          <li>Hold the ukulele near your computer’s microphone (about 30 cm away).</li>
          <li>Pluck <b>one</b> string firmly with your thumb and let it ring. The tuner shows the note it hears and which string you’re tuning.</li>
          <li>Watch the needle:
            <ul>
              <li>Needle on the <b>left</b> (too low, “flat”) → <b>tighten</b> that string’s tuning peg a little.</li>
              <li>Needle on the <b>right</b> (too high, “sharp”) → <b>loosen</b> it a little.</li>
              <li>Needle in the <b>green</b> middle → in tune! The string gets a tick.</li>
            </ul></li>
          <li>Turn the peg in <b>small</b> amounts and pluck again after each turn. Follow the string from the nut up to the headstock to make sure you’re turning the right peg.</li>
          <li>Tune all strings, then check them all once more — tuning one string can slightly change the others.</li>
        </ol>
        ${UI.callout('tip', 'Which way do I turn?', 'Pegs turn different ways on different ukuleles, and a left-handed ukulele may be the opposite of a friend’s right-handed one. Just turn a tiny bit and watch the needle: if it moves the wrong way, turn the other way.')}
        ${UI.callout('warn', 'New strings', 'New nylon strings stretch a lot during their first week and will keep going flat. That’s normal — just tune up each time you play. Never tighten far above the target note: strings can snap.')}
        <h3>Tuning by ear</h3>
        <p>No microphone? Click a string button on the tuner to hear its note (tick “Repeat reference note” to keep it playing), then turn the peg until your string sounds the same. When two notes are almost the same you’ll hear a slow “wah-wah” wobble — tune until it disappears.</p>
        <h3>Tuning the strings to each other</h3>
        <p>Once one string is right, you can tune the others to it (standard G C E A tuning):</p>
        <div class="table-wrap"><table class="data compact"><thead><tr><th>Press…</th><th>…and it should match</th></tr></thead><tbody>
          <tr><td>C string, fret 4 (E)</td><td>open E string</td></tr>
          <tr><td>E string, fret 5 (A)</td><td>open A string</td></tr>
          <tr><td>E string, fret 3 (G)</td><td>open G string (high G)</td></tr>
        </tbody></table></div>`,
    },
  ],
});
