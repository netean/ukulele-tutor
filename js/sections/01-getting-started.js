UI.section({
  id: 'start', num: 1, title: 'Meet Your Ukulele', short: 'Getting started',
  blurb: 'Get to know your instrument: its parts, the ukulele family, how a left-handed player holds it, and how we number your fingers.',
  lessons: [
    {
      id: 'parts', title: 'Your ukulele, part by part',
      render: () => `
        <p>Before you play a note, it helps to know what everything is called. Every lesson in this guide uses these names.
        <b>Hover over or tap any part</b> of the ukulele below to learn what it does.</p>
        <div class="split">
          <div class="uke-holder">${Diagrams.ukulele()}</div>
          <div class="part-info card" aria-live="polite">
            <div class="part-info-title">Pick a part</div>
            <p class="part-info-text">Tap a label or a part of the drawing.</p>
          </div>
        </div>
        ${UI.callout('lefty', 'Left-handed note', `This drawing shows the front of a <b>left-handed</b> ukulele standing up. Because the strings are reversed compared with a right-handed ukulele, from left to right you see <b>A E C G</b>. When you hold it to play, the <b>G</b> string is the one nearest your chin.`)}
        <div class="photo-row">
          <figure><img src="assets/photos/concert-ukulele.jpg" width="960" height="1280" alt="Photo of a concert ukulele" loading="lazy"><figcaption>A real concert ukulele. Can you spot the headstock, nut, frets, sound hole and bridge?<br><small>Photo: Naithik Shetty, CC0, via Wikimedia Commons</small></figcaption></figure>
        </div>`,
      mount: el => {
        const info = el.querySelector('.part-info');
        const all = el.querySelectorAll('[data-part]');
        const show = p => {
          all.forEach(x => x.classList.toggle('active', x.dataset.part === p));
          const d = Diagrams.PARTS[p];
          info.innerHTML = `<div class="part-info-title">${d.label}</div><p class="part-info-text">${d.text}</p>`;
        };
        all.forEach(x => {
          x.addEventListener('mouseenter', () => show(x.dataset.part));
          x.addEventListener('click', () => show(x.dataset.part));
        });
      },
    },
    {
      id: 'family', title: 'The ukulele family',
      render: () => `
        <p>Ukuleles come in several sizes. The smaller ones sound bright and sweet, the bigger ones warmer and deeper.
        <b>Soprano, concert and tenor</b> ukuleles all use the same tuning, so everything in this course works on any of them.</p>
        <div class="card">${Diagrams.sizes()}</div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Type</th><th>Typical total length</th><th>Scale length*</th><th>Tuning (string nearest chin → nearest floor)</th><th>Good to know</th></tr></thead>
          <tbody>
            <tr><td><b>Soprano</b></td><td>53 cm</td><td>33 cm</td><td>G C E A</td><td>The classic “plinky” ukulele sound. Small frets — great for small hands.</td></tr>
            <tr><td><b>Concert</b></td><td>58 cm</td><td>38 cm</td><td>G C E A</td><td>A little bigger and louder. A very popular choice for beginners.</td></tr>
            <tr><td><b>Tenor</b></td><td>66 cm</td><td>43 cm</td><td>G C E A (or low G)</td><td>Fuller sound, more room for fingers. Often used by professionals.</td></tr>
            <tr><td><b>Baritone</b></td><td>76 cm</td><td>48 cm</td><td>D G B E</td><td>Tuned like the top four strings of a guitar. The chord shapes have different names.</td></tr>
            <tr><td><b>Bass (U-Bass)</b></td><td>76 cm</td><td>52 cm</td><td>E A D G</td><td>Thick rubbery strings, tuned as low as a bass guitar. Plays bass lines, not chords.</td></tr>
          </tbody></table></div>
        <p class="caption">*Scale length is the length of string that vibrates — from the nut to the saddle. It decides how far apart the frets are.</p>
        <div class="photo-row">
          <figure><img src="assets/photos/uke-sizes.jpg" width="789" height="1128" alt="Five ukuleles of different sizes photographed to the same scale" loading="lazy"><figcaption>Real ukuleles photographed to the same scale — mini, soprano, concert, tenor and baritone — with their scale-length ranges.<br><small>Photo: Lardyfatboy, CC BY-SA 4.0, via Wikimedia Commons (labels changed to metric)</small></figcaption></figure>
          <figure class="narrow"><img src="assets/photos/bass-ukulele.jpg" width="605" height="1710" alt="A bass ukulele with thick red strings" loading="lazy"><figcaption>A bass ukulele. Note the very thick strings.<br><small>Photo: Lardyfatboy, CC BY-SA 4.0, via Wikimedia Commons</small></figcaption></figure>
        </div>
        ${UI.callout('tip', 'Which one do I have?', 'If you’re not sure, measure from the top of the headstock to the bottom of the body in centimetres and compare it with the table. The built-in <a href="#/tuner">Tuner</a> has settings for every type in the table, including 4- and 5-string bass ukuleles.')}`,
    },
    {
      id: 'lefty', title: 'Playing left-handed',
      render: () => `
        <p>Good news: playing left-handed is completely normal, and the ukulele is a great instrument for it! Here’s what “left-handed” means:</p>
        <div class="two-col">
          <div class="card big-point"><div class="bp-icon">✋</div><h4>Your LEFT hand strums</h4><p>It brushes the strings over the area where the neck joins the body. This hand creates the rhythm.</p></div>
          <div class="card big-point"><div class="bp-icon">🤚</div><h4>Your RIGHT hand frets</h4><p>Its fingers press the strings against the fretboard to make different notes and chords.</p></div>
        </div>
        <div class="card center">${Diagrams.holding()}</div>
        <h3>What makes a ukulele “left-handed”?</h3>
        <p>A left-handed ukulele is strung in the reverse order to a right-handed one, so that when you hold it with the neck pointing to your <b>right</b>,
        the strings are still in the normal order for playing: <b>G</b> nearest your chin, then <b>C</b>, <b>E</b> and <b>A</b> nearest the floor.
        Many ukuleles are symmetrical, so a right-handed one can be converted by reversing the strings (a music shop can also swap the nut and saddle so the strings sit perfectly).</p>
        ${UI.callout('lefty', 'Every diagram in this guide is drawn for you', `Chord charts and fretboards are <b>mirrored for left-handed players</b> by default. If you ever look at a chord chart in a book or online, it will usually be drawn for right-handers — you’ll learn how to flip it in the chords section. You can switch this guide to right-handed view with the <b>Left-handed</b> switch at the top of the page (useful if you’re learning with a right-handed friend).`)}
        <h3>Holding it comfortably</h3>
        <ol class="steps">
          <li>Sit up straight. Rest the body of the ukulele against your tummy/chest, a little to your left.</li>
          <li>Point the neck to your right and slightly upward — about “2 o’clock”.</li>
          <li>Your left forearm rests gently on the top edge of the body, holding the ukulele against you. Your left hand hangs over the strings where the neck meets the body.</li>
          <li>Your right thumb sits behind the neck, roughly behind your middle finger. Keep your right wrist relaxed and your fingers curved like you’re holding a small ball.</li>
          <li>Don’t grip hard! The ukulele should feel balanced and light. Tension is the enemy of good playing.</li>
        </ol>
        ${UI.callout('tip', 'Strumming tip', 'Strum with the nail side of your LEFT index finger going <b>down</b> (towards the floor) and the fleshy pad coming back <b>up</b>. Move from the wrist, like shaking water off your hand.')}`,
    },
    {
      id: 'fingers', title: 'Finger numbers',
      render: () => `
        <p>Chord charts and music use numbers to tell you which finger of your <b>fretting hand</b> to use. As a left-handed player your fretting hand is your <b>right hand</b>.</p>
        <div class="split">
          <div class="card center hand-holder">${Diagrams.hand()}</div>
          <div>
            <table class="data compact">
              <thead><tr><th>Number</th><th>Finger</th></tr></thead>
              <tbody>
                <tr><td><span class="fnum">1</span></td><td>Index (pointing) finger</td></tr>
                <tr><td><span class="fnum">2</span></td><td>Middle finger</td></tr>
                <tr><td><span class="fnum">3</span></td><td>Ring finger</td></tr>
                <tr><td><span class="fnum">4</span></td><td>Little finger (pinky)</td></tr>
                <tr><td><span class="fnum">T</span></td><td>Thumb — stays behind the neck, it is not numbered</td></tr>
              </tbody>
            </table>
            ${UI.callout('tip', 'Pressing a string', 'Press with the very tip of your finger, just <b>behind</b> the fret wire (not on top of it). You only need enough pressure for the note to ring clearly. Keep your fingernails short on your fretting hand!')}
            ${UI.btn('Replay animation', 'data-replay-hand', 'replay', 'btn-ghost')}
          </div>
        </div>`,
      mount: el => {
        el.querySelector('[data-replay-hand]').addEventListener('click', () => {
          el.querySelector('.hand-holder').innerHTML = Diagrams.hand();
        });
      },
    },
  ],
});
