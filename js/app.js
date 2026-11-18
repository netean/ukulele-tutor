/* App shell: routing, sidebar, home page, settings. */
(() => {
  const content = document.getElementById('content');
  const nav = document.getElementById('nav');
  let currentSection = null;

  // ---------------- settings ----------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  Settings.lefty = store.get('uke-lefty', true);
  const theme = store.get('uke-theme', 'auto');
  applyTheme(theme);

  function applyTheme(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const sel = document.getElementById('theme');
    if (sel) sel.value = t;
  }

  const leftyBox = document.getElementById('lefty');
  leftyBox.checked = Settings.lefty;
  leftyBox.addEventListener('change', () => {
    Settings.lefty = leftyBox.checked;
    store.set('uke-lefty', Settings.lefty);
    const y = window.scrollY;
    route.force = true;
    route();
    route.force = false;
    window.scrollTo(0, y);
  });
  document.getElementById('theme').addEventListener('change', e => { store.set('uke-theme', e.target.value); applyTheme(e.target.value); });
  const vol = document.getElementById('volume');
  vol.value = store.get('uke-volume', 0.8);
  Sound.setVolume(+vol.value);
  vol.addEventListener('input', () => { Sound.setVolume(+vol.value); store.set('uke-volume', +vol.value); });
  document.getElementById('menu-btn').addEventListener('click', () => document.body.classList.toggle('nav-open'));

  // ---------------- sidebar ----------------
  function lessonKey(s, l) { return s.id + '/' + l.id; }
  function sectionProgress(s) {
    const ls = s.lessons.filter(l => !l.noProgress);
    const done = ls.filter(l => UI.isDone(lessonKey(s, l))).length;
    return { done, total: ls.length };
  }
  function renderNav(activeId, activeLesson) {
    const all = UI.sections.flatMap(s => s.lessons.filter(l => !l.noProgress).map(l => lessonKey(s, l)));
    const doneAll = all.filter(UI.isDone).length;
    nav.innerHTML = `
      <a class="nav-home ${!activeId ? 'on' : ''}" href="#/">Home</a>
      <div class="nav-progress"><div class="np-bar"><div style="width:${(doneAll / all.length) * 100}%"></div></div><span>${doneAll} of ${all.length} lessons complete</span></div>
      ${UI.sections.map(s => {
        const p = sectionProgress(s);
        const on = s.id === activeId;
        return `<div class="nav-sec ${on ? 'on' : ''}">
          <a href="#/${s.id}" class="nav-sec-link"><span class="nav-num ${p.total && p.done === p.total ? 'done' : ''}">${p.total && p.done === p.total ? UI.ICONS.check : s.num}</span><span>${s.title}</span></a>
          ${on ? `<div class="nav-lessons">${s.lessons.map(l => `<a href="#/${s.id}/${l.id}" class="${UI.isDone(lessonKey(s, l)) ? 'done' : ''} ${activeLesson === l.id ? 'cur' : ''}" data-lesson="${l.id}">${UI.isDone(lessonKey(s, l)) ? UI.ICONS.check : '<i></i>'}<span>${l.title}</span></a>`).join('')}</div>` : ''}
        </div>`;
      }).join('')}`;
  }

  // ---------------- pages ----------------
  function home() {
    const firstUndone = (() => {
      for (const s of UI.sections) for (const l of s.lessons) if (!l.noProgress && !UI.isDone(lessonKey(s, l))) return [s, l];
      return null;
    })();
    content.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <div class="eyebrow">A left-handed ukulele course</div>
          <h1>Learn the ukulele<br>from the very first note</h1>
          <p>No experience and no music reading needed. Work through the sections in order — each one builds on the last — with interactive diagrams, sounds, animations and play-alongs.</p>
          <div class="btn-row">
            ${firstUndone ? `<a class="btn btn-big" href="#/${firstUndone[0].id}/${firstUndone[1].id}">${UI.ICONS.play}<span>${UI.loadProgress && Object.keys(UI.loadProgress()).length ? 'Continue: ' + firstUndone[1].title : 'Start lesson 1'}</span></a>` : `<span class="badge">Course complete — amazing! 🎉</span>`}
            <a class="btn btn-big btn-ghost" href="#/tuner">${UI.ICONS.mic}<span>Tune my ukulele</span></a>
          </div>
        </div>
        <div class="hero-art">${Diagrams.chord('C', { animate: true, showNotes: true })}</div>
      </section>
      <h2 class="home-h">Your learning path</h2>
      <div class="path">
        ${UI.sections.map(s => {
          const p = sectionProgress(s);
          return `<a class="path-card" href="#/${s.id}">
            <div class="pc-num">${s.num}</div>
            <div class="pc-body"><h3>${s.title}</h3><p>${s.blurb}</p>
            ${p.total ? `<div class="pc-prog"><div class="np-bar"><div style="width:${(p.done / p.total) * 100}%"></div></div><span>${p.done}/${p.total}</span></div>` : '<div class="pc-prog"><span>Tool</span></div>'}</div>
          </a>`;
        }).join('')}
      </div>
      <h2 class="home-h">Before you start</h2>
      <div class="three-col">
        <div class="card"><h4>🔊 Sound on</h4><p>Almost everything makes a sound — click chord charts, fretboards, strings, keys and notes on the staff. Headphones help you hear the details.</p></div>
        <div class="card"><h4>🫲 Left-handed by default</h4><p>All chord charts and fretboards are drawn for left-handed players. Use the switch in the top bar if you want the right-handed view.</p></div>
        <div class="card"><h4>✅ Track your progress</h4><p>Press “Mark lesson complete” at the end of each lesson. Your progress is saved on this computer.</p></div>
      </div>`;
    UI.hydrate(content);
  }

  function sectionPage(s, lessonId) {
    const idx = UI.sections.indexOf(s);
    const prev = UI.sections[idx - 1], next = UI.sections[idx + 1];
    content.innerHTML = `
      <header class="sec-head">
        <div class="sec-num">Section ${s.num}</div>
        <h1>${s.title}</h1>
        <p>${s.blurb}</p>
        <div class="sec-toc">${s.lessons.map((l, i) => `<a href="#/${s.id}/${l.id}" class="chip ${UI.isDone(lessonKey(s, l)) ? 'done' : ''}">${s.num}.${i + 1} ${l.title}</a>`).join('')}</div>
      </header>
      ${s.lessons.map((l, i) => `
        <article class="lesson" id="lesson-${l.id}" data-lesson="${l.id}">
          <h2><span class="lnum">${s.num}.${i + 1}</span> ${l.title}</h2>
          <div class="lesson-body">${l.render()}</div>
          ${l.noProgress ? '' : `<div class="lesson-foot"><button class="btn btn-done ${UI.isDone(lessonKey(s, l)) ? 'is-done' : ''}" data-done="${l.id}">${UI.ICONS.check}<span>${UI.isDone(lessonKey(s, l)) ? 'Completed' : 'Mark lesson complete'}</span></button></div>`}
        </article>`).join('')}
      <nav class="sec-pager">
        ${prev ? `<a class="btn btn-ghost" href="#/${prev.id}">← ${prev.title}</a>` : '<span></span>'}
        ${next ? `<a class="btn" href="#/${next.id}">Next: ${next.title} →</a>` : '<a class="btn" href="#/">Back to home</a>'}
      </nav>`;
    s.lessons.forEach(l => {
      const el = content.querySelector(`#lesson-${l.id} .lesson-body`);
      UI.hydrate(el);
      if (l.mount) {
        try { l.mount(el, content); } catch (e) { console.error('Lesson mount failed', l.id, e); el.insertAdjacentHTML('beforeend', `<p class="no">Something went wrong loading this activity: ${UI.esc(e.message)}</p>`); }
      }
    });
    content.querySelectorAll('[data-done]').forEach(b => b.addEventListener('click', () => {
      const key = s.id + '/' + b.dataset.done;
      const v = !UI.isDone(key);
      UI.setDone(key, v);
      b.classList.toggle('is-done', v);
      b.querySelector('span').textContent = v ? 'Completed' : 'Mark lesson complete';
      if (v) { b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 600); }
      renderNav(s.id, b.dataset.done);
      content.querySelectorAll('.sec-toc .chip').forEach((c, i) => c.classList.toggle('done', UI.isDone(lessonKey(s, s.lessons[i]))));
    }));
    if (lessonId) {
      const t = document.getElementById('lesson-' + lessonId);
      if (t) {
        const go = () => t.scrollIntoView({ behavior: 'instant', block: 'start' });
        requestAnimationFrame(go);
        // re-align once images and notation have settled
        setTimeout(go, 250);
        content.querySelectorAll('img').forEach(img => { if (!img.complete) img.addEventListener('load', () => { if (Math.abs(t.getBoundingClientRect().top - 80) < 400) go(); }, { once: true }); });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }

  function leaveCurrent() {
    if (currentSection && currentSection.onLeave) {
      try { currentSection.onLeave(content); } catch (e) { console.error(e); }
    }
    content.querySelectorAll('[data-stoppable], [data-score-player]').forEach(x => { if (x._stop) x._stop(); });
  }

  let lastRouteSection = undefined;
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const s = UI.sections.find(x => x.id === parts[0]);
    const lessonId = parts[1];
    // navigating between lessons of the same section: just scroll
    if (s && s === lastRouteSection && content.querySelector('.sec-head') && !route.force) {
      renderNav(s.id, lessonId);
      const t = lessonId && document.getElementById('lesson-' + lessonId);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.classList.remove('nav-open');
      return;
    }
    leaveCurrent();
    currentSection = s || null;
    lastRouteSection = s;
    renderNav(s ? s.id : null, lessonId);
    if (s) sectionPage(s, lessonId); else { home(); window.scrollTo(0, 0); }
    document.title = (s ? s.title + ' · ' : '') + 'Ukulele Trainer';
    document.body.classList.remove('nav-open');
  }
  window.addEventListener('hashchange', route);

  // highlight current lesson in sidebar while scrolling
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.dataset.lesson;
        nav.querySelectorAll('.nav-lessons a').forEach(a => a.classList.toggle('cur', a.dataset.lesson === id));
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' }) : null;
  const mo = new MutationObserver(() => { if (io) { io.disconnect(); content.querySelectorAll('.lesson').forEach(l => io.observe(l)); } });
  mo.observe(content, { childList: true });

  // unlock audio on first interaction (browsers require a user gesture)
  document.addEventListener('pointerdown', () => Sound.context(), { once: true });

  route();
})();
