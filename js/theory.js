/* Music theory core: note names, pitches, chords, scales and tunings.
 * Strings are always indexed in the order G, C, E, A (index 0..3) for
 * standard ukulele data. "String number" in the traditional sense is the
 * reverse: A = string 1, E = 2, C = 3, G = 4.
 */
const Theory = (() => {
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  /** Parse "Bb", "F#", "C#4", "Eb5" into parts. */
  function parse(name) {
    const m = /^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d)?$/.exec(name.trim());
    if (!m) throw new Error('Bad note name: ' + name);
    const letter = m[1].toUpperCase();
    const accStr = m[2] || '';
    const acc = accStr.startsWith('#') ? accStr.length : -accStr.length;
    const pc = (LETTER_PC[letter] + acc + 12) % 12;
    const octave = m[3] !== undefined ? parseInt(m[3], 10) : null;
    return { letter, acc, pc, octave };
  }

  /** Note name with octave -> MIDI number (C4 = 60). Handles B#/Cb octave edge. */
  function toMidi(name) {
    const p = parse(name);
    return (p.octave + 1) * 12 + LETTER_PC[p.letter] + p.acc;
  }

  function midiToFreq(midi, a4 = 440) {
    return a4 * Math.pow(2, (midi - 69) / 12);
  }

  function freqToMidi(freq, a4 = 440) {
    return 69 + 12 * Math.log2(freq / a4);
  }

  function midiName(midi, flats = false, withOctave = true) {
    const pc = ((midi % 12) + 12) % 12;
    const oct = Math.floor(midi / 12) - 1;
    const n = (flats ? FLAT_NAMES : SHARP_NAMES)[pc];
    return withOctave ? n + oct : n;
  }

  /** Display form: "Bb" -> "B♭", "F#4" -> "F♯4" (octave dropped unless keepOctave). */
  function pretty(name, keepOctave = false) {
    let s = name.replace(/^([A-G])##/, '$1𝄪').replace(/^([A-G])#/, '$1♯').replace(/^([A-G])bb/, '$1𝄫').replace(/^([A-G])b/, '$1♭');
    if (!keepOctave) s = s.replace(/-?\d+$/, '');
    return s;
  }

  /** Name for a pitch class, choosing letter `letter` (for correct spelling). */
  function spellPc(pc, letter) {
    let diff = (pc - LETTER_PC[letter] + 12) % 12;
    if (diff > 6) diff -= 12;
    const acc = diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff);
    return letter + acc;
  }

  /** Spell a set of notes from a root using semitone offsets and letter steps. */
  function spell(root, semis, letterSteps) {
    const r = parse(root);
    const li = LETTERS.indexOf(r.letter);
    return semis.map((s, i) => spellPc((r.pc + s) % 12, LETTERS[(li + letterSteps[i]) % 7]));
  }

  /** VexFlow key format: "F#4" -> "f#/4" */
  function vfKey(nameWithOctave) {
    const p = parse(nameWithOctave);
    const acc = p.acc > 0 ? '#'.repeat(p.acc) : 'b'.repeat(-p.acc);
    return p.letter.toLowerCase() + acc + '/' + p.octave;
  }

  /** Given note name (no octave) and a minimum MIDI, return name with octave at/above min. */
  function withOctaveAbove(name, minMidi) {
    for (let o = 0; o < 9; o++) {
      const n = name + o;
      if (toMidi(n) >= minMidi) return n;
    }
    return name + 4;
  }

  // ---------------- Intervals & formulas ----------------
  const CHORD_TYPES = {
    major: { label: 'Major', suffix: '', semis: [0, 4, 7], steps: [0, 2, 4], degrees: ['1 (root)', '3 (major third)', '5 (fifth)'] },
    minor: { label: 'Minor', suffix: 'm', semis: [0, 3, 7], steps: [0, 2, 4], degrees: ['1 (root)', '♭3 (minor third)', '5 (fifth)'] },
    dom7: { label: 'Seventh (dominant 7)', suffix: '7', semis: [0, 4, 7, 10], steps: [0, 2, 4, 6], degrees: ['1', '3', '5', '♭7'] },
    min7: { label: 'Minor seventh', suffix: 'm7', semis: [0, 3, 7, 10], steps: [0, 2, 4, 6], degrees: ['1', '♭3', '5', '♭7'] },
    maj7: { label: 'Major seventh', suffix: 'maj7', semis: [0, 4, 7, 11], steps: [0, 2, 4, 6], degrees: ['1', '3', '5', '7'] },
    dim: { label: 'Diminished', suffix: 'dim', semis: [0, 3, 6], steps: [0, 2, 4], degrees: ['1', '♭3', '♭5'] },
  };

  const SCALE_TYPES = {
    major: { label: 'Major', semis: [0, 2, 4, 5, 7, 9, 11], steps: [0, 1, 2, 3, 4, 5, 6], pattern: ['W', 'W', 'H', 'W', 'W', 'W', 'H'] },
    minor: { label: 'Natural minor', semis: [0, 2, 3, 5, 7, 8, 10], steps: [0, 1, 2, 3, 4, 5, 6], pattern: ['W', 'H', 'W', 'W', 'H', 'W', 'W'] },
    majpent: { label: 'Major pentatonic', semis: [0, 2, 4, 7, 9], steps: [0, 1, 2, 4, 5], pattern: ['W', 'W', 'W+H', 'W', 'W+H'] },
    minpent: { label: 'Minor pentatonic', semis: [0, 3, 5, 7, 10], steps: [0, 2, 3, 4, 6], pattern: ['W+H', 'W', 'W', 'W+H', 'W'] },
    blues: { label: 'Blues', semis: [0, 3, 5, 6, 7, 10], steps: [0, 2, 3, 3, 4, 6], pattern: ['W+H', 'W', 'H', 'H', 'W+H', 'W'] },
    chromatic: { label: 'Chromatic (every note)', semis: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], steps: null, pattern: Array(12).fill('H') },
  };

  const ROOTS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  function chordNotes(root, type) {
    const t = CHORD_TYPES[type];
    return spell(root, t.semis, t.steps);
  }

  function scaleNotes(root, type) {
    const t = SCALE_TYPES[type];
    if (!t.steps) {
      const flats = /b/.test(root) || root === 'F';
      return t.semis.map(s => (flats ? FLAT_NAMES : SHARP_NAMES)[(parse(root).pc + s) % 12]);
    }
    if (type === 'blues') {
      // spell the blue note as a flattened 5th
      const base = spell(root, [0, 3, 5, 7, 10], [0, 2, 3, 4, 6]);
      const b5 = spellPc((parse(root).pc + 6) % 12, LETTERS[(LETTERS.indexOf(parse(root).letter) + 4) % 7]);
      return [base[0], base[1], base[2], b5, base[3], base[4]];
    }
    return spell(root, t.semis, t.steps);
  }

  // ---------------- Tunings (for lessons and tuner) ----------------
  // strings listed from the string nearest your chin to the one nearest the floor
  const INSTRUMENTS = [
    {
      id: 'standard', name: 'Soprano / Concert / Tenor', sub: 'Standard “re-entrant” tuning — G C E A', default: true,
      strings: ['G4', 'C4', 'E4', 'A4'],
      info: 'The most common ukulele tuning. The G string is tuned higher than the C string, giving the bright, classic ukulele sound. Used on soprano, concert and most tenor ukuleles.',
    },
    {
      id: 'lowg', name: 'Concert / Tenor — Low G', sub: 'Linear tuning — G C E A (low G)',
      strings: ['G3', 'C4', 'E4', 'A4'],
      info: 'Same notes as standard, but the G string is tuned an octave lower (it needs a thicker, often wound string). Gives a fuller, deeper sound.',
    },
    {
      id: 'dtuning', name: 'Soprano — D tuning', sub: 'Traditional “D6” tuning — A D F♯ B',
      strings: ['A4', 'D4', 'F#4', 'B4'],
      info: 'An older soprano tuning, every string one whole step higher than standard. Found in many vintage songbooks.',
    },
    {
      id: 'baritone', name: 'Baritone', sub: 'D G B E — like the top 4 guitar strings',
      strings: ['D3', 'G3', 'B3', 'E4'],
      info: 'The largest regular ukulele. Tuned like the highest four strings of a guitar, so chord shapes have different names from a standard ukulele.',
    },
    {
      id: 'bass', name: 'Bass ukulele (U-Bass)', sub: '4-string bass — E A D G',
      strings: ['E1', 'A1', 'D2', 'G2'],
      info: 'Bass ukuleles (U-Bass and similar) use thick rubber or wound strings and are tuned exactly like a 4-string bass guitar — very low! Play each string firmly and let it ring; the tuner needs a moment to hear these deep notes.',
    },
    {
      id: 'bass5', name: '5-string bass ukulele', sub: 'B E A D G',
      strings: ['B0', 'E1', 'A1', 'D2', 'G2'],
      info: 'A 5-string bass ukulele adds a very deep low B string. The low B is close to the limit of what laptop microphones can hear — a clip-on pickup or headset mic helps.',
    },
    {
      id: 'guitalele', name: 'Guitalele (6-string)', sub: 'A D G C E A',
      strings: ['A2', 'D3', 'G3', 'C4', 'E4', 'A4'],
      info: 'A six-string hybrid of guitar and ukulele, tuned like a guitar with a capo on the 5th fret.',
    },
  ];

  const STD = ['G4', 'C4', 'E4', 'A4'];
  const STD_MIDI = STD.map(toMidi); // [67, 60, 64, 69]
  const STRING_NAMES = ['G', 'C', 'E', 'A'];
  const STRING_NUMBERS = [4, 3, 2, 1];

  /** Note at string index (G=0..A=3) and fret, standard tuning. */
  function noteAt(stringIdx, fret, flats = false) {
    return midiName(STD_MIDI[stringIdx] + fret, flats);
  }

  // ---------------- Chord library (standard tuning, frets G C E A) ----------------
  // fingers: 0 = open, 1 index, 2 middle, 3 ring, 4 little finger. x = muted (-1)
  const CHORDS = {
    // Majors
    C: { type: 'major', frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], tip: 'Just one finger! Your ring finger on the 3rd fret of the A string (the string nearest the floor).' },
    D: { type: 'major', frets: [2, 2, 2, 0], fingers: [1, 2, 3, 0], tip: 'Three fingers in a neat row on the 2nd fret. Squeeze them in — angle your hand slightly so they fit.' },
    E: { type: 'major', frets: [4, 4, 4, 2], fingers: [2, 3, 4, 1], tip: 'A famously tricky chord. Take your time; many players use E7 instead to begin with.' },
    F: { type: 'major', frets: [2, 0, 1, 0], fingers: [2, 0, 1, 0], tip: 'Index finger on the 1st fret of the E string, middle finger on the 2nd fret of the G string.' },
    G: { type: 'major', frets: [0, 2, 3, 2], fingers: [0, 1, 3, 2], tip: 'Makes a little triangle. Index on C string (fret 2), middle on A string (fret 2), ring on E string (fret 3).' },
    A: { type: 'major', frets: [2, 1, 0, 0], fingers: [2, 1, 0, 0], tip: 'Middle finger on the G string 2nd fret, index on the C string 1st fret.' },
    Bb: { type: 'major', frets: [3, 2, 1, 1], fingers: [3, 2, 1, 1], barre: { fret: 1, from: 2, to: 3, finger: 1 }, tip: 'Your first “barre”: lay your index finger flat across the E and A strings at fret 1.' },
    // Minors
    Am: { type: 'minor', frets: [2, 0, 0, 0], fingers: [2, 0, 0, 0], tip: 'One finger — middle finger on the 2nd fret of the G string (the string nearest your chin).' },
    Bm: { type: 'minor', frets: [4, 2, 2, 2], fingers: [3, 1, 1, 1], barre: { fret: 2, from: 1, to: 3, finger: 1 }, tip: 'Index finger barres the C, E and A strings at fret 2; ring finger on the G string at fret 4.' },
    Bbm: { type: 'minor', frets: [3, 1, 1, 1], fingers: [3, 1, 1, 1], barre: { fret: 1, from: 1, to: 3, finger: 1 }, tip: 'Index finger barres three strings at fret 1, ring finger on the G string at fret 3.' },
    Cm: { type: 'minor', frets: [0, 3, 3, 3], fingers: [0, 1, 1, 1], barre: { fret: 3, from: 1, to: 3, finger: 1 }, tip: 'Barre the C, E and A strings at fret 3 and let the G string ring open.' },
    Dm: { type: 'minor', frets: [2, 2, 1, 0], fingers: [2, 3, 1, 0], tip: 'Like F with one extra finger: ring finger on the C string, 2nd fret.' },
    Em: { type: 'minor', frets: [0, 4, 3, 2], fingers: [0, 3, 2, 1], tip: 'A diagonal staircase: index fret 2 (A), middle fret 3 (E), ring fret 4 (C).' },
    Fm: { type: 'minor', frets: [1, 0, 1, 3], fingers: [1, 0, 2, 4], tip: 'Index on G string fret 1, middle on E string fret 1, little finger on A string fret 3.' },
    'F#m': { type: 'minor', frets: [2, 1, 2, 0], fingers: [2, 1, 3, 0], tip: 'Index on C string fret 1, middle on G string fret 2, ring on E string fret 2.' },
    Gm: { type: 'minor', frets: [0, 2, 3, 1], fingers: [0, 2, 3, 1], tip: 'Index on the A string fret 1, middle on the C string fret 2, ring on the E string fret 3.' },
    // Sevenths
    C7: { type: 'dom7', frets: [0, 0, 0, 1], fingers: [0, 0, 0, 1], tip: 'Index finger on the A string, 1st fret. Easy!' },
    A7: { type: 'dom7', frets: [0, 1, 0, 0], fingers: [0, 1, 0, 0], tip: 'Index finger on the C string, 1st fret.' },
    D7: { type: 'dom7', frets: [2, 2, 2, 3], fingers: [1, 1, 1, 2], barre: { fret: 2, from: 0, to: 2, finger: 1 }, tip: 'Index finger barres G, C and E at fret 2; middle finger on A string fret 3.' },
    E7: { type: 'dom7', frets: [1, 2, 0, 2], fingers: [1, 2, 0, 3], tip: 'Index on G fret 1, middle on C fret 2, ring on A fret 2.' },
    G7: { type: 'dom7', frets: [0, 2, 1, 2], fingers: [0, 2, 1, 3], tip: 'A triangle pointing the other way from G. Index on E fret 1, middle on C fret 2, ring on A fret 2.' },
    Am7: { type: 'min7', frets: [0, 0, 0, 0], fingers: [0, 0, 0, 0], tip: 'No fingers at all — just strum the open strings!' },
  };

  function chordRootAndType(sym) {
    const m = /^([A-G][#b]?)(.*)$/.exec(sym);
    return { root: m[1], suffix: m[2] };
  }

  function chordInfo(sym) {
    const c = CHORDS[sym];
    const { root } = chordRootAndType(sym);
    const t = CHORD_TYPES[c.type];
    const notes = chordNotes(root, c.type);
    // pitches as played (G C E A order)
    const midis = c.frets.map((f, i) => (f < 0 ? null : STD_MIDI[i] + f));
    const flats = notes.some(n => /b/.test(n));
    const played = midis.map(m => {
      if (m === null) return null;
      // spell played note using chord spelling where possible
      const pc = m % 12;
      const match = notes.find(n => parse(n).pc === pc);
      const oct = Math.floor(m / 12) - 1;
      // fix octave for B#/Cb style spellings
      const name = match || midiName(m, flats, false);
      const p = parse(name);
      let o = oct;
      if (p.letter === 'B' && p.acc > 0 && pc < 3) o -= 1;
      if (p.letter === 'C' && p.acc < 0 && pc > 9) o += 1;
      return name + o;
    });
    return { sym, root, type: c.type, typeLabel: t.label, notes, degrees: t.degrees, midis, played, ...c };
  }

  function chordName(sym) {
    const { root, suffix } = chordRootAndType(sym);
    const label = { '': 'major', m: 'minor', '7': 'seven', m7: 'minor seven' }[suffix] || suffix;
    return pretty(root) + ' ' + label;
  }

  // ---------------- Fingered scales (standard tuning) ----------------
  // each note: [name, stringIdx (0=G..3=A), fret, finger]
  const FINGERED_SCALES = {
    'C-major': {
      title: 'C major scale', root: 'C', type: 'major', position: 'Open position',
      notes: [['C4', 1, 0, 0], ['D4', 1, 2, 2], ['E4', 2, 0, 0], ['F4', 2, 1, 1], ['G4', 2, 3, 3], ['A4', 3, 0, 0], ['B4', 3, 2, 2], ['C5', 3, 3, 3]],
      tip: 'Uses open strings plus fingers 1, 2 and 3. Fret 1 = finger 1, fret 2 = finger 2, fret 3 = finger 3 — one finger per fret.',
    },
    'D-major': {
      title: 'D major scale', root: 'D', type: 'major', position: '2nd position (index finger on fret 2)',
      notes: [['D4', 1, 2, 1], ['E4', 1, 4, 3], ['F#4', 2, 2, 1], ['G4', 2, 3, 2], ['A4', 2, 5, 4], ['B4', 3, 2, 1], ['C#5', 3, 4, 3], ['D5', 3, 5, 4]],
      tip: 'Slide your hand up so your index finger sits over fret 2. Each finger looks after one fret: 1→fret 2, 2→fret 3, 3→fret 4, 4→fret 5. No open strings!',
    },
    'G-major': {
      title: 'G major scale', root: 'G', type: 'major', position: '7th position (index finger on fret 7)',
      notes: [['G4', 1, 7, 1], ['A4', 1, 9, 3], ['B4', 2, 7, 1], ['C5', 2, 8, 2], ['D5', 2, 10, 4], ['E5', 3, 7, 1], ['F#5', 3, 9, 3], ['G5', 3, 10, 4]],
      tip: 'This is a “moveable” shape — it uses no open strings, so you can slide the exact same finger pattern to any fret to play other major scales. Start on fret 5 of the C string and it becomes F major!',
    },
    'D-minor': {
      title: 'D natural minor scale', root: 'D', type: 'minor', position: 'Open position',
      notes: [['D4', 1, 2, 2], ['E4', 2, 0, 0], ['F4', 2, 1, 1], ['G4', 2, 3, 3], ['A4', 3, 0, 0], ['Bb4', 3, 1, 1], ['C5', 3, 3, 3], ['D5', 3, 5, 4]],
      tip: 'Almost the same as C major, but listen to the darker, sadder sound. The last note needs a stretch with your little finger to fret 5.',
    },
    'C-majpent': {
      title: 'C major pentatonic', root: 'C', type: 'majpent', position: 'Open position',
      notes: [['C4', 1, 0, 0], ['D4', 1, 2, 2], ['E4', 2, 0, 0], ['G4', 2, 3, 3], ['A4', 3, 0, 0], ['C5', 3, 3, 3]],
      tip: 'The C major scale with F and B removed. With no half steps, it is almost impossible to play a “wrong” note!',
    },
    'A-minpent': {
      title: 'A minor pentatonic', root: 'A', type: 'minpent', position: 'Single-string version (A string)',
      notes: [['A4', 3, 0, 0], ['C5', 3, 3, 3], ['D5', 3, 5, 1], ['E5', 3, 7, 3], ['G5', 3, 10, 1], ['A5', 3, 12, 3]],
      tip: 'All on one string — slide your hand up the neck as you go. This is a great way to see the gaps between the notes.',
    },
  };

  // ---------------- Keys ----------------
  const KEYS = {
    C: ['C', 'Dm', 'Em', 'F', 'G', 'Am'],
    G: ['G', 'Am', 'Bm', 'C', 'D', 'Em'],
    F: ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm'],
    D: ['D', 'Em', 'F#m', 'G', 'A', 'Bm'],
  };

  return {
    LETTERS, SHARP_NAMES, FLAT_NAMES, CHORD_TYPES, SCALE_TYPES, ROOTS, INSTRUMENTS, CHORDS, FINGERED_SCALES, KEYS,
    STD, STD_MIDI, STRING_NAMES, STRING_NUMBERS,
    parse, toMidi, midiToFreq, freqToMidi, midiName, pretty, spell, spellPc, vfKey, withOctaveAbove,
    chordNotes, scaleNotes, chordInfo, chordName, chordRootAndType, noteAt,
  };
})();
