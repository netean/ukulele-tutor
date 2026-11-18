# Ukulele Trainer

### About

I have been meaning to sit down and teach myself how to play the Ukulele I bought during Covid.
(Still haven't started)

But as an experiment one evening I wondered if Claude Opus 5.5 could build me a trainer. Didn't really think it would do as good as job as it has done.

Specifically one that would accommodate my left handed Concert Ukulele and provide some basic musical training (I used to know how to read music but need a quick refresher)
One long prompt into Claude Code and in less than hour this was created, tested and working.

It also needed to have the ability to help me tune it.

All runs in html, with a python server backend if necessary and scales really well to work on a phone screen.


#### Just to be very clear, I haven't written a single line of code nor have I reprompted Claude to do anything beyond the initial prompt.

It was created as an experiment, a simple proof of concept if you will. It just ended up being quite excellent.

#### Summary

One long prompt and <60 minutes of Claude ruminating to get this.




### Description 

An interactive ukulele course for complete beginners, drawn for **left-handed players**
(with a switch for a right-handed view), plus a microphone **tuner** that handles every
common ukulele type — including 4- and 5-string bass ukuleles.

It's a self-contained HTML app: no internet connection, accounts or installs needed.

See it in Action on Github Pages
https://netean.github.io/ukulele-tutor

## Running it (Linux)

```bash
./run-ukulele-trainer.sh
```

This starts a tiny local web server (Python 3) on `http://127.0.0.1:8765` and opens the
course in an app-style browser window (Chromium/Chrome/Brave if installed, otherwise
Firefox or your default browser). Close the window, or press Ctrl+C, to quit.

To add **Ukulele Trainer** to your desktop's application menu:

```bash
./install-desktop-entry.sh
```

You can also just open `index.html` in a browser. Everything works that way, but some
browsers will only allow microphone access for the tuner when the page is served
from `localhost`, which is what the launcher does.

Requirements: `python3` and a modern browser (Chromium-based or Firefox).

## What's inside

| Section | What you learn |
|---|---|
| 1. Meet Your Ukulele | Interactive labelled diagram, real photos of the ukulele family (soprano → bass), how to hold it left-handed, and fretting-hand finger numbers |
| 2. The Strings | G C E A with pluckable animated strings, "high G" re-entrant tuning, the musical alphabet on a playable keyboard, frets and half steps on a clickable fretboard, reading TAB, string quizzes |
| 3. Basic Chords | Reading chord charts (left- vs right-handed), C, Am, F and G with "show me" finger animations, a strumming-pattern trainer, a chord-change trainer, play-along songs |
| 4. Reading Music | Staff and treble clef (click notes to see them on the fretboard), rhythm and rests, ukulele notes in notation + TAB, note-reading quiz, two melodies with highlighted playback |
| 5. Major & Minor Chords | How triads are built (animated half-step counting), major→minor by moving one finger, an ear-training quiz, chords in notation, major/minor chord libraries, a build-any-chord tool, keys and Roman numerals |
| 6. Scales | W-W-H patterns, C/D/G major, D minor, relative minor, pentatonics, an improvisation jam over a backing track, a scale explorer, and a practice plan |
| 7. Tuner | Microphone tuner with needle, auto string detection, reference tones, A4 calibration and microphone selection |

### Tuner instrument presets

Soprano/Concert/Tenor (G4 C4 E4 A4), Low-G (G3 C4 E4 A4), D tuning (A4 D4 F♯4 B4),
Baritone (D3 G3 B3 E4), Bass ukulele (E1 A1 D2 G2), 5-string bass (B0 E1 A1 D2 G2) and
Guitalele (A2 D3 G3 C4 E4 A4).

The tuner uses the YIN pitch-detection algorithm. The analysis window, filters and
sample-rate reduction change with the instrument so that very low bass strings are
detected reliably. In synthetic tests it was accurate to within about 1 cent on every
preset, including the 31 Hz low B. Small laptop microphones pick up deep bass notes
poorly, so for a bass ukulele a headset mic or a clip-on/pickup input works best.

### Microphone troubleshooting on Linux

* Allow microphone access when the browser asks (the launcher's Chromium profile remembers it).
* Check that the right input is selected and not muted in your sound settings or `pavucontrol`.
* Choose a specific microphone under **Advanced settings** in the tuner.

## Project layout

```
index.html                  app shell
css/style.css               all styling (light + dark themes)
js/theory.js                notes, chords, scales, tunings, chord fingerings
js/audio.js                 plucked-string synth (Karplus–Strong), strums, metronome, sequencer
js/diagrams.js              SVG chord charts, fretboards, ukulele/hand/keyboard illustrations
js/notation.js              standard notation + TAB via VexFlow, with playback highlighting
js/ui.js                    widgets, quizzes, score players, progress tracking
js/sections/*.js            course content, one file per section
js/tuner.js                 microphone tuner (section 7)
vendor/vexflow.js           VexFlow 4.2.5 music engraving library (MIT)
assets/photos/              Creative Commons photos (see Credits)
run-ukulele-trainer.sh      launcher
install-desktop-entry.sh    adds a menu entry
```

Progress, theme, volume and the left/right-handed setting are saved in the browser's
local storage.

### Screenshots
<img width="1890" height="924" alt="image" src="https://github.com/user-attachments/assets/480f91d2-da62-4835-a35d-0ceee49ddd0e" />

<img width="1890" height="956" alt="image" src="https://github.com/user-attachments/assets/941c54dd-8b7c-4154-95a6-9c4189b6e4d6" />

<img width="1839" height="823" alt="image" src="https://github.com/user-attachments/assets/f21bda2c-08b0-48e9-82f1-1fcee9c93d62" />

<img width="1839" height="823" alt="image" src="https://github.com/user-attachments/assets/222dca11-802e-47a4-acc6-1c09c31b304d" />

<img width="1839" height="823" alt="image" src="https://github.com/user-attachments/assets/e46a22ca-9d8d-42d7-bda6-e57b44ad64c8" />


The Tuner
<img width="1839" height="823" alt="image" src="https://github.com/user-attachments/assets/69d30a31-20df-412e-bc9c-72cac10a10be" />



## Credits

* Music notation: [VexFlow](https://www.vexflow.com/) 4.2.5, MIT licence (`vendor/VEXFLOW-LICENSE.txt`).
* Photos from Wikimedia Commons:
  * `concert-ukulele.jpg` by Naithik Shetty, CC0 — [source](https://commons.wikimedia.org/wiki/File:Concert_sized_ukulele.jpg)
  * `uke-sizes.jpg` ("Uke sizes and scale lengths") by Lardyfatboy, CC BY-SA 4.0, modified (measurement labels changed to metric) — [source](https://commons.wikimedia.org/wiki/File:Uke_sizes_and_scale_lengths.jpg)
  * `bass-ukulele.jpg` ("Bass Ukulele") by Lardyfatboy, CC BY-SA 4.0 — [source](https://commons.wikimedia.org/wiki/File:Bass_Ukulele.JPG)
* Songs used are traditional or public domain (Row, Row, Row Your Boat; Skip to My Lou;
  Twinkle, Twinkle, Little Star; Beethoven's Ode to Joy).
