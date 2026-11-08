/*
  ============================================================================
  projectspeaker.org
  ============================================================================
  @file       band.js
  @desc       The parade behind the header text (marching band and a crowd
              of protesters), its march, and the header Play/Pause button.
  @author     mediaBrilliance digitalxtudio
  @version    3.6.0
  @updated    2026-11-07
  @a11y       The parade is decorative (aria-hidden, no pointer events,
              behind the header text at reduced opacity). Play/Pause is a
              real button whose label says what it will do, in the page's
              language. Pause stops the parade and sound, holds the headline
              rotation (rotor.js reads the same class) and is remembered;
              reduced motion on the device counts as paused. The march is
              silent: all sound is off (CONFIG.drums, horns and chant are
              false; the code stays so any of it can return). When on, it
              plays only once the browser allows sound, after a tap or key.
  ============================================================================

  WHEN THE BAND MARCHES
  Once per page load, at a random moment 3 to 20 seconds after the page is
  ready, unless the visitor has paused it and the tab is visible. Play sends
  a new one out at any time. It crosses left to right at
  about 50 px a second, so the crossing takes longer on a wide screen; the
  time is rounded to whole bars of music so the band and the march end
  together.

  THE LINEUP
  Built fresh on every load. Front to back: drum major, majorette, flag
  bearer, three trumpets, a solo snare, sometimes the serious trombonist,
  two sousaphones, the drumline (three snares, tenors, three bass drums in
  graded sizes, cymbals), another solo snare, a trumpet and two dancers
  swinging folding chairs, with smoke puffs behind. Rows sit 58 units apart.
  The band is trained, so it holds formation (small drift, tempos within 5%),
  but not perfect: now and then a straggler drifts back and catches up, one
  or two marchers trip, one turns the wrong way for a beat, a few are out of
  step, and the drum major sometimes fumbles the baton. The crowd around it
  is dealt fresh on every pass: trail length, spacing, height, depth and
  what each person is doing. The serious
  trombonist (about two loads in five) has sunglasses, a level gaze, no
  bounce and a slide that never misses.

  THE BANNERS
  Cheerleaders lead the parade: three carry a long banner reading "TELL ME
  WHAT DEMOCRACY LOOKS LIKE" overhead, and tumblers cartwheel, back-flip and
  toe-touch ahead of it. Ordinary citizens bring up the rear with "THIS IS
  WHAT DEMOCRACY LOOKS LIKE!" Both banners ripple: each is drawn once and
  shown through fourteen slices that bob a beat apart (banner()).

  THE CROWD
  Hundreds of pro-democracy protesters with signs, flags, raised fists and
  one megaphone: a dim back row walking behind the band, a front row among
  the musicians, and a long trail behind the band that thins into
  stragglers. They bob in clusters of about five, one animation per
  cluster. The whole scene is built when the parade starts (build), not at
  page load, so its 2,500 or so nodes cost nothing until then.

  THE PLAY/PAUSE BUTTON
  #pref-play, right of "Sign the petition". It shows Play while nothing is
  moving and Pause while the parade crosses (data-state idle or playing;
  the label comes from data-play and data-pause, in the page's language).
  Pause stops the parade and any sound, adds motion-off to <html> (rotor.js
  holds the headline; style.css drops fades) and is remembered as
  ps-parade=off, so the parade does not start by itself next time; Play
  sends a newly dealt parade across at once and clears that. With no choice
  stored, reduced motion on the device counts as paused.

  THE MUSIC
  An original march in G minor, 4/4 at 96 beats a minute (an easy Sunday
  tempo), synthesized with
  the Web Audio API and scheduled bar by bar to the length of the parade:
  two bars of drumline cadence, then an eight-bar strain repeated as needed,
  then an ending. After the intro, every twelve bars open with four of
  chant over the drums: "Tell me what democracy looks like!" from the
  megaphone, "This is what democracy looks like!" from the crowd, twice.
  The crowd is fourteen voices of different pitch shouting each syllable
  through formant filters set to its vowel, a hair apart; the browser's
  speech voice says the words on top where speechSynthesis exists. Brass is built to sound blown, not held: one clean voice
  per player (stacked detuned saws read as an accordion), a pitch scoop into
  each note and a small fall off it, brightness that flares on the tongued
  attack and settles, light saturation and a presence peak for the bell, and
  vibrato only late in long notes. Three trumpets play the tune, trombones punch chords off the
  beat, sousaphones walk the bass. Under them a full drumline: a three-snare
  line in sixteenths with accents, ghosts and rolls, four tuned tenors, five
  split bass drums playing a melody of their own, and cymbal crashes and
  taps, all panned across the stereo field. No audio file is downloaded.
  Browsers allow sound only after a tap, click or key press on the page. If
  the band steps out before one, the march waits and starts at the first
  one, at the bar the band has reached. On iPhone the page asks to play as
  media (navigator.audioSession), so the silent switch does not mute it.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.querySelector('.site-header');
  var btn = document.getElementById('pref-play');
  if (!header || !btn) return;

  var CONFIG = {
    delayMin: 3000,    // ms after the page is ready before the band can start
    delayMax: 20000,
    speed: 50,         // px a second across the screen: an easy Sunday parade
    bpm: 96,           // the drums, and every step and stick, at a stroll
    volume: 0.2,
    serious: 0.4,      // chance the serious trombonist marches this load
    drums: false,      // the drumline; off (Valdez, Nov. 7: "lose all the sound"). true brings it back
    horns: false,      // the brass tune; off for now
    chant: false       // the democracy chant; off for now
  };

  /* ---------------------------------------------------------- preferences */

  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem(key, v); } catch (e) { /* defaults next time */ } }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // "motion" is false once the visitor has pressed Pause (remembered as
  // ps-parade=off) or, with no choice yet, when the device asks for reduced
  // motion. It stops the parade starting on its own and holds the rotor.
  var motion = load('ps-parade') ? load('ps-parade') === 'on' : !reduce;
  var sound = true;   // whatever is switched on in CONFIG plays whenever the parade does

  /** Mirrors the state onto <html> (rotor.js and style.css read it) and the button. */
  function apply() {
    root.classList.toggle('motion-off', !motion);
    root.classList.toggle('motion-on', motion && reduce);   // explicit override of the device setting
    var on = band.classList.contains('is-on');
    btn.setAttribute('data-state', on ? 'playing' : 'idle');
    var label = btn.getAttribute(on ? 'data-pause' : 'data-play');
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* --------------------------------------------------------------- score */

  var BEAT = 60 / CONFIG.bpm, BAR = 4 * BEAT, STEP = BEAT / 4;   // a sixteenth

  // The strain: eight bars of [MIDI note, beats] for the trumpets (0 = rest),
  // and each bar's chord as [root, third] (3 minor, 4 major).
  var STRAIN = [
    [[67, 1], [70, .5], [74, .5], [79, 1.5], [77, .5]],
    [[75, 1], [74, 1], [72, .75], [70, .25], [72, 1]],
    [[74, 1.5], [74, .5], [75, .5], [74, .5], [72, .5], [70, .5]],
    [[69, 2], [62, .5], [66, .5], [69, .5], [72, .5]],
    [[79, 1], [78, .5], [79, .5], [82, 1.5], [81, .5]],
    [[79, 1], [77, 1], [75, 1], [74, 1]],
    [[72, .5], [74, .5], [75, .5], [77, .5], [79, 1], [74, 1]],
    [[79, 2], [0, 1], [67, .5], [67, .5]]
  ];
  var CHORDS = [[55, 3], [48, 3], [55, 3], [50, 4], [55, 3], [51, 4], [48, 3], [55, 3]];

  // Drum patterns, one character per sixteenth. Snares: A accent, x tap,
  // g ghost, R a two-stroke roll. Tenors: x hit (drums rotate). Bass drums:
  // a digit is which of the five drums, high (0) to low (4).
  var PAT = {
    intro1: { sn: 'A...A...A.A.AxAx', tn: 'x...x...x.x.xxxx', bd: '4...4...3.2.1.0.' },
    intro2: { sn: 'AxAxAxAxRRRRRRRR', tn: 'x.x.x.x.xxxxxxxx', bd: '4.3.2.1.0.0.0.0.' },
    groove: { sn: 'A.gxA.gxAgxgA.xx', tn: 'x.x.xx.x.x.xx.x.', bd: '4...2.3.1...0.21' },
    fill:   { sn: 'AxgxAxgxRRRRAxAx', tn: 'xxxxxxxxx.x.x.x.', bd: '4.3.2.1.0.0.4.4.' },
    ending: { sn: 'A...A...RRRRRRRR', tn: 'x...x...xxxxxxxx', bd: '4...4...4.3.2.1.' }
  };

  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* --------------------------------------------------------------- music */

  var ctx = null;        // the AudioContext, made on the first Sound press
  var playing = null;    // { stop } for the march in progress

  /**
   * Schedules a march `bars` long, starting `offset` seconds in (pressing
   * Sound mid-parade joins at the bar the band is on). Returns { stop }.
   */
  function march(bars, offset) {
    var t0 = ctx.currentTime + 0.06 - offset;
    var now = ctx.currentTime;
    var out = ctx.createGain();
    out.gain.value = CONFIG.volume;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    out.connect(comp); comp.connect(ctx.destination);

    var noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var nd = noise.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    function at(t) { return t0 + t; }
    function live(t) { return at(t) >= now; }
    // Stereo position; plain gain where StereoPanner is missing.
    function pan(p) {
      if (!ctx.createStereoPanner) return out;
      var s = ctx.createStereoPanner(); s.pan.value = p; s.connect(out); return s;
    }
    function burst(t, len, level, type, f, q, dest) {
      var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q;
      g.gain.setValueAtTime(level, at(t));
      g.gain.exponentialRampToValueAtTime(0.001, at(t) + len);
      s.connect(fl); fl.connect(g); g.connect(dest);
      s.start(at(t), Math.random()); s.stop(at(t) + len + 0.02);
    }
    function tone(t, f0, f1, len, level, type, dest) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, at(t));
      o.frequency.exponentialRampToValueAtTime(f1, at(t) + len * 0.7);
      g.gain.setValueAtTime(level, at(t));
      g.gain.exponentialRampToValueAtTime(0.001, at(t) + len);
      o.connect(g); g.connect(dest); o.start(at(t)); o.stop(at(t) + len + 0.02);
    }

    var snareDest = [pan(-0.45), pan(0), pan(0.45)];
    var tenorDest = pan(0.3), cymDest = pan(-0.2);
    var bassDest = [pan(-0.5), pan(-0.25), pan(0), pan(0.25), pan(0.5)];
    var trpDest = [pan(-0.35), pan(0.05), pan(0.35)], tbnDest = [pan(-0.15), pan(0.2)], souDest = pan(0);

    // Snare: a tight band of noise for the wires and a short tone for the head.
    function snare(t, v, d) {
      if (!live(t)) return;
      burst(t, 0.12, v * 0.55, 'bandpass', 3200, 0.9, d);
      tone(t, 210, 160, 0.06, v * 0.35, 'triangle', d);
    }
    function tenor(t, n, v) {
      if (!live(t)) return;
      var f = [330, 262, 220, 175][n % 4];
      tone(t, f, f * 0.88, 0.2, v * 0.6, 'sine', tenorDest);
      burst(t, 0.03, v * 0.25, 'highpass', 2500, 0, tenorDest);
    }
    function bassDrum(t, n, v) {
      if (!live(t)) return;
      var f = [98, 82, 69, 58, 49][n];
      tone(t, f, f * 0.6, 0.32, v * 0.95, 'sine', bassDest[n]);
      burst(t, 0.04, v * 0.2, 'lowpass', 900, 0, bassDest[n]);
    }
    function cymbal(t, len, v) {
      if (!live(t)) return;
      burst(t, len, v * 0.5, 'highpass', 6500, 0, cymDest);
      burst(t, len * 0.6, v * 0.25, 'bandpass', 9000, 0.6, cymDest);
    }
    // Brass. One clean voice per player, never a stack of detuned saws: that
    // beating is what made the first version sound like an accordion. What
    // makes it a horn instead: the pitch scoops up into the note and falls a
    // hair at the end; the tone is darker when soft and flares bright on the
    // tongued attack (the filter follows the breath); a little saturation and
    // a presence peak near 1.4 kHz give the bell its edge.
    var curve = new Float32Array(1024);
    for (var ci = 0; ci < 1024; ci++) { var xv = ci / 511.5 - 1; curve[ci] = Math.tanh(2.2 * xv) / Math.tanh(2.2); }
    function brass(m, t, d, v, dest, peak, body) {
      if (!CONFIG.horns || !m || !live(t)) return;
      var f = freq(m), start = at(t), end = start + d;
      var o = ctx.createOscillator(), drive = ctx.createWaveShaper(), lp = ctx.createBiquadFilter();
      var bell = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.detune.value = rand(-2, 2);                              // players are close, not chorused
      o.frequency.setValueAtTime(f * 0.977, start);              // scoop up about 40 cents
      o.frequency.exponentialRampToValueAtTime(f, start + 0.06);
      o.frequency.setTargetAtTime(f * 0.985, end - 0.02, 0.03);  // and fall off the release
      if (d > 0.6) {                                             // late, shallow vibrato on long notes only
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 5.2; lg.gain.value = f * 0.003;
        lfo.connect(lg); lg.connect(o.frequency); lfo.start(start + 0.3); lfo.stop(end + 0.1);
      }
      drive.curve = curve;
      var dark = Math.min(f * 1.6, 700), bright = Math.min(f * 9, peak), held = Math.min(f * 5.5, body);
      lp.type = 'lowpass'; lp.Q.value = 0.7;
      lp.frequency.setValueAtTime(dark, start);
      lp.frequency.exponentialRampToValueAtTime(bright, start + 0.05);   // the attack flares
      lp.frequency.setTargetAtTime(held, start + 0.06, 0.12);           // then settles to the held tone
      lp.frequency.setTargetAtTime(dark, end - 0.05, 0.03);             // and darkens as the breath stops
      bell.type = 'peaking'; bell.frequency.value = 1400; bell.Q.value = 1; bell.gain.value = 5;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(v * 1.1, start + 0.03);       // tongued attack, a touch over
      g.gain.setTargetAtTime(v * 0.8, start + 0.035, 0.1);
      g.gain.setTargetAtTime(0.0001, end - 0.03, 0.025);
      o.connect(drive); drive.connect(lp); lp.connect(bell); bell.connect(g); g.connect(dest);
      o.start(start); o.stop(end + 0.2);
      burst(t, 0.03, v * 0.12, 'bandpass', 2200, 1.2, dest);           // the tongue
    }

    function drums(t, p, bar, fill) {
      for (var s = 0; s < 16; s++) {
        var ts = t + s * STEP, c = p.sn[s];
        if (c !== '.') {
          for (var k = 0; k < 3; k++) {                       // three snares, a hair apart
            var j = ts + rand(0, 0.006), v = (c === 'A' ? 1 : c === 'x' ? 0.62 : c === 'g' ? 0.28 : 0.5) * rand(0.88, 1);
            if (c === 'R') { snare(j, v * 0.8, snareDest[k]); snare(j + STEP / 2, v, snareDest[k]); }
            else snare(j, v, snareDest[k]);
          }
        }
        if (p.tn[s] === 'x') tenor(ts, fill ? 3 - (s % 4) : [0, 2, 1, 3][(s + bar) % 4], s % 4 ? 0.6 : 0.9);
        var b = p.bd[s];
        if (b !== '.') bassDrum(ts, +b, 0.9);
      }
    }

    // The chant. "Tell me what democracy looks like!" from a megaphone,
    // "This is what democracy looks like!" back from the crowd, one bar each
    // over the drums. Each syllable is a burst of voices through two formant
    // filters tuned to its vowel, so it reads as people shouting on the beat;
    // the browser's own speech voice says the words on top, where it can.
    var VOWEL = { e: [550, 1800], i: [300, 2300], a: [640, 1190], I: [400, 1900], o: [750, 1100],
      '@': [500, 1500], u: [450, 1050], ai: [700, 1200, 300, 2200] };
    // [sixteenth, vowel, consonant (t click, s hiss, - soft), pitch, length in sixteenths]
    var CALL = [[0, 'e', 't', 1, 2], [2, 'i', '-', 1, 2], [4, 'a', '-', 1, 2], [6, 'I', 't', 1, 1], [7, 'o', '-', 1.12, 1],
      [8, '@', '-', 1, 2], [10, 'i', 's', 1, 2], [12, 'u', '-', 1.05, 2], [14, 'ai', '-', 0.95, 2]];
    var ANSWER = [[0, 'I', 's', 1.05, 2], [2, 'I', 's', 1, 2], [4, 'a', '-', 1, 2], [6, 'I', 't', 1, 1], [7, 'o', '-', 1.12, 1],
      [8, '@', '-', 1, 2], [10, 'i', 's', 1, 2], [12, 'u', 's', 1.05, 2], [14, 'ai', 't', 0.95, 2]];
    var megaphone = ctx.createWaveShaper(); megaphone.curve = curve;
    var horn = ctx.createBiquadFilter(); horn.type = 'bandpass'; horn.frequency.value = 1300; horn.Q.value = 0.7;
    megaphone.connect(horn); horn.connect(pan(-0.2));

    function shout(t, words, crowd) {
      if (!live(t + BAR)) return;
      var sides = crowd ? [pan(-0.5), pan(0.5)] : [megaphone];
      sides.forEach(function (dest, side) {
        var f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), mix = ctx.createGain();
        f1.type = f2.type = 'bandpass'; f1.Q.value = 5; f2.Q.value = 7;
        mix.gain.value = crowd ? 3.2 : 4;
        f1.connect(mix); f2.connect(mix); mix.connect(dest);
        words.forEach(function (w) {
          var v = VOWEL[w[1]], st = at(t + w[0] * STEP), len = w[4] * STEP;
          f1.frequency.setValueAtTime(v[0], st); f2.frequency.setValueAtTime(v[1], st);
          if (v[2]) { f1.frequency.linearRampToValueAtTime(v[2], st + len); f2.frequency.linearRampToValueAtTime(v[3], st + len); }
          if (w[2] === 's') burst(t + w[0] * STEP, 0.07, crowd ? 0.22 : 0.3, 'highpass', 4500, 0, dest);
          if (w[2] === 't') burst(t + w[0] * STEP, 0.025, crowd ? 0.3 : 0.4, 'bandpass', 3000, 1, dest);
        });
        var n = crowd ? 14 : 2;
        for (var k = 0; k < n; k++) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          var base = crowd ? rand(100, 250) : 165 + k * 3;
          o.type = 'sawtooth';
          g.gain.value = 0;
          words.forEach(function (w) {
            var st = at(t + w[0] * STEP) + (crowd ? rand(0, 0.035) : 0), len = w[4] * STEP * 0.8;
            o.frequency.setValueAtTime(base * w[3] * rand(0.98, 1.02), st);
            g.gain.setTargetAtTime(crowd ? 0.22 : 0.45, st, 0.012);
            g.gain.setTargetAtTime(0, st + len, 0.03);
          });
          o.connect(g); g.connect(f1); g.connect(f2);
          o.start(at(t)); o.stop(at(t + BAR));
        }
      });
      // The words themselves, where the browser has a speech voice.
      say(crowd ? 'This is what democracy looks like!' : 'Tell me what democracy looks like!', at(t), crowd);
    }

    var talk = [];
    function say(text, when, crowd) {
      if (!window.speechSynthesis) return;
      var ms = (when - ctx.currentTime) * 1000 - 60;
      talk.push(setTimeout(function () {
        var u = new SpeechSynthesisUtterance(text);
        var voices = speechSynthesis.getVoices().filter(function (v) { return /^en(-|_)US/i.test(v.lang); });
        if (voices.length) u.voice = voices[crowd ? Math.min(1, voices.length - 1) : 0];
        u.lang = 'en-US'; u.rate = crowd ? 1.15 : 1.25; u.pitch = crowd ? 0.85 : 1.15; u.volume = 1;
        speechSynthesis.speak(u);
      }, Math.max(0, ms)));
    }

    var total = bars * BAR;
    for (var bar = 0; bar < bars; bar++) {
      var t = bar * BAR;
      if (bar < 2) { drums(t, bar ? PAT.intro2 : PAT.intro1, bar, bar === 1); continue; }
      if (bar === bars - 1) {
        drums(t, PAT.ending, bar, true);
        var c = CHORDS[0];
        [c[0] + 12, c[0] + 12 + c[1], c[0] + 19].forEach(function (m, i) { brass(m + 12, t, 2 * BEAT, 0.3, trpDest[i], 4200, 2400); });
        [c[0] + c[1], c[0] + 7].forEach(function (m, i) { brass(m, t, 2 * BEAT, 0.3, tbnDest[i], 2600, 1400); });
        brass(c[0] - 12, t, 2 * BEAT, 0.4, souDest, 900, 500);
        cymbal(t, 1.6, 1);
        continue;
      }
      // After the intro, a cycle of twelve bars: four of chant over the
      // drums (call, answer, call, answer), then the eight-bar strain.
      var k12 = (bar - 2) % 12;
      if (k12 < 4) {
        drums(t, k12 === 3 ? PAT.fill : PAT.groove, bar, k12 === 3);
        if (CONFIG.chant) shout(t, k12 % 2 ? ANSWER : CALL, k12 % 2 === 1);
        if (k12 === 0) cymbal(t, 1.2, 0.8);
        cymbal(t + BEAT, 0.22, 0.3); cymbal(t + 3 * BEAT, 0.22, 0.3);
        continue;
      }
      var n = k12 - 4, fill = n === 3 || n === 7;
      drums(t, fill ? PAT.fill : PAT.groove, bar, fill);
      // Trumpets: the tune, three players.
      var tt = t;
      STRAIN[n].forEach(function (note) {
        var len = note[1] * BEAT;
        for (var k = 0; k < 3; k++) brass(note[0], tt + rand(0, 0.008), len * (len > BEAT ? 0.92 : 0.7), 0.27, trpDest[k], 4600, 2500);
        tt += len;
      });
      // Trombones: the chord punched on 1, the and of 2, and 4.
      var ch = CHORDS[n], tri = [ch[0] + ch[1], ch[0] + 7, ch[0] + 12];
      [0, 6, 12].forEach(function (s) {
        tri.forEach(function (m, i) { brass(m, t + s * STEP, STEP * 1.6, 0.2, tbnDest[i % 2], 2800, 1300); });
      });
      // Sousaphones: root on 1 and 3, a pickup into the next bar.
      brass(ch[0] - 12, t, BEAT * 0.9, 0.55, souDest, 1000, 520);
      brass(ch[0] - 5, t + 2 * BEAT, BEAT * 0.9, 0.5, souDest, 1000, 520);
      brass(ch[0] - 10, t + 3.5 * BEAT, BEAT * 0.45, 0.45, souDest, 1000, 520);
      // Cymbals: crash at each phrase, taps on 2 and 4.
      if (n % 4 === 0) cymbal(t, 1.4, 0.9);
      cymbal(t + BEAT, 0.22, 0.3); cymbal(t + 3 * BEAT, 0.22, 0.3);
    }
    // The button: one last hit as the band leaves.
    for (var k = 0; k < 5; k++) bassDrum(total, k, 0.8);
    for (var k2 = 0; k2 < 3; k2++) snare(total, 1, snareDest[k2]);
    [67, 70, 74, 79].forEach(function (m, i) { brass(m, total, 0.45, 0.25, trpDest[i % 3], 4200, 2400); });
    brass(43, total, 0.5, 0.45, souDest, 900, 500);
    cymbal(total, 1.8, 1);

    return {
      stop: function () {
        talk.forEach(clearTimeout);
        if (window.speechSynthesis) speechSynthesis.cancel();
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
        setTimeout(function () { out.disconnect(); }, 1200);
      }
    };
  }

  /**
   * Plays the march `bars` long from `offset` seconds in. Browsers keep
   * audio silent until the visitor has tapped, clicked or pressed a key on
   * the page, so when the band steps out before that, the context stays
   * suspended and nothing is scheduled; the first tap or key press then
   * starts the march at the bar the band has reached (armUnlock). Scheduling
   * into a suspended context instead would start the tune from bar 1 under a
   * band already halfway across.
   */
  function startMusic(bars, offset) {
    if (!(CONFIG.drums || CONFIG.horns || CONFIG.chant) || !sound || playing) return;
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      // iPhone and iPad: play as media, so the ring/silent switch does not
      // mute Web Audio (Safari 17+; elsewhere the property does not exist).
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
      ctx = new AC();
    }
    if (ctx.state !== 'running') {
      ctx.resume().then(function () {
        if (ctx.state === 'running') startMusic(bars, elapsed(offset));
      }, function () { /* still locked; armUnlock waits for a gesture */ });
      armUnlock();
      return;
    }
    playing = march(bars, offset || 0);
    clearTimeout(stopTimer);
    stopTimer = setTimeout(stopMusic, (bars * BAR - (offset || 0)) * 1000 + 2500);
  }
  var stopTimer = 0, armed = false;

  /** Seconds into the parade now, or the given offset when the band is not out. */
  function elapsed(fallback) {
    return band.classList.contains('is-on') ? (Date.now() - startedAt) / 1000 : (fallback || 0);
  }

  /** Waits for the visitor's first tap, click or key press, then joins the band. */
  function armUnlock() {
    if (armed) return;
    armed = true;
    function go() {
      ['pointerdown', 'keydown', 'touchend'].forEach(function (t) { window.removeEventListener(t, go, true); });
      armed = false;
      if (!ctx || !sound) return;
      ctx.resume().then(function () {
        if (band.classList.contains('is-on')) startMusic(bars, elapsed(0));
      });
    }
    ['pointerdown', 'keydown', 'touchend'].forEach(function (t) { window.addEventListener(t, go, true); });
  }
  function stopMusic() {
    if (playing) { playing.stop(); playing = null; }
  }

  /* ------------------------------------------------------------- drawing */

  var NAVY = '#10213f', BLUE = '#1f4fbf', GOLD = '#d8b86a', IVORY = '#f5f2ea', RED = '#c8102e', WOOD = '#6b4a1f';
  var SKIN = ['#8d5524', '#e0ac69', '#5c3a1e', '#f1c27d', '#c68642', '#ffdbac', '#a0662f', '#e8b98a', '#6b4423', '#d9a066', '#f0c8a0'];
  var GAP = 58;          // units between rows of the band; wide on purpose

  function spark(x, y, d) {
    // Position on the wrapper, twinkle on the star: see pompom().
    return '<g transform="translate(' + x + ' ' + y + ')"><path class="b-spark" style="animation-delay:' + d.toFixed(2) + 's" ' +
      'd="M0-2.6L.6-.6 2.6 0 .6.6 0 2.6-.6.6-2.6 0-.6-.6z" fill="#fff"/></g>';
  }
  function legs(pants) {
    return ['b-la', 'b-lb'].map(function (c, i) {
      var x = i ? 19 : 13;
      return '<g class="b-leg ' + c + '"><rect x="' + x + '" y="40" width="4.6" height="17" rx="1.6" fill="' + pants + '"/>' +
        '<rect x="' + (x - 1) + '" y="55.5" width="7.4" height="3.6" rx="1.3" fill="#111"/></g>';
    }).join('');
  }
  function shako(tall) {
    var top = tall ? 1 : 5;
    return '<rect x="13.5" y="' + top + '" width="10" height="' + (14 - top) + '" rx="1.5" fill="' + IVORY + '"/>' +
      '<rect x="12.5" y="13" width="12" height="2" rx="1" fill="#111"/>' +
      '<rect x="13.5" y="' + (top + 2) + '" width="10" height="1.4" fill="' + GOLD + '"/>' +
      '<path class="b-plume" d="M18.5 ' + top + 'c-3-4 2-6 0-' + (tall ? 11 : 9) + '" stroke="' + RED + '" stroke-width="3.2" ' +
      'stroke-linecap="round" fill="none"/>';
  }
  function jacket(color) {
    return '<rect x="11" y="23" width="15" height="19" rx="3" fill="' + color + '"/>' +
      '<path d="M12.5 24.5 24.5 40.5" stroke="' + IVORY + '" stroke-width="1.6"/>' +
      '<circle cx="18.5" cy="27" r=".9" fill="' + GOLD + '"/><circle cx="18.5" cy="31" r=".9" fill="' + GOLD + '"/>' +
      '<circle cx="18.5" cy="35" r=".9" fill="' + GOLD + '"/>';
  }
  function head(skin) { return '<circle cx="18.5" cy="18.5" r="5" fill="' + skin + '"/>'; }
  function arm(x1, y1, x2, y2, color) {
    return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" stroke="' + color + '" stroke-width="3.4" stroke-linecap="round"/>';
  }
  function note(x, y, d) {
    return '<g transform="translate(' + x + ' ' + y + ')"><g class="b-note" style="animation-delay:' + d.toFixed(2) + 's">' +
      '<path d="M0 0v-6l4-1.2v6" stroke="' + GOLD + '" stroke-width="1.2" fill="none"/>' +
      '<ellipse cx="-1" cy="0" rx="1.6" ry="1.2" fill="' + GOLD + '"/><ellipse cx="3" cy="-1.2" rx="1.6" ry="1.2" fill="' + GOLD + '"/></g></g>';
  }
  function sticks(x, y) {
    return '<path class="b-stick" d="M' + x + ' ' + y + 'l4 5" stroke="' + WOOD + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path class="b-stick b-stick2" d="M' + (x + 6) + ' ' + y + 'l-2 5" stroke="' + WOOD + '" stroke-width="1.4" stroke-linecap="round"/>';
  }
  function chair() {
    return '<g class="b-chair"><path d="M-6 0h12M-5 0v-9h10v9M-5 0l9 9M5 0l-9 9" stroke="#c9ccd3" stroke-width="1.6" ' +
      'stroke-linecap="round" fill="none"/><rect x="-6.5" y="-1.2" width="13" height="2.4" rx="1" fill="#9aa0aa"/></g>';
  }

  /** The upper body and instrument for one kind of marcher, facing right. */
  function figure(kind, s, i) {
    switch (kind) {
      case 'major':
        return jacket(NAVY) + spark(14, 27, 0) + spark(22, 33, .4) + head(s) + shako(true) + arm(24, 26, 29, 21, NAVY) +
          '<g transform="translate(29 20)"><g class="' + (Math.random() < 0.5 ? 'b-fumble' : '') + '" style="animation-delay:' + rand(4, 14).toFixed(2) + 's">' +
          '<g class="b-baton"><rect x="-12" y="-.9" width="24" height="1.8" rx=".9" fill="' + IVORY + '"/>' +
          '<circle cx="-12" cy="0" r="2" fill="' + GOLD + '"/><circle cx="12" cy="0" r="2" fill="' + GOLD + '"/></g></g></g>';
      case 'majorette':
        return '<path d="M12 23h13l4 19H8z" fill="' + GOLD + '"/>' + spark(13, 30, .1) + spark(19, 26, .5) + spark(24, 35, .2) +
          spark(16, 38, .7) + spark(21, 31, .9) + head(s) + '<circle cx="18.5" cy="12.5" r="3" fill="#2b1a10"/>' +
          arm(24, 26, 28, 22, s) + '<g transform="translate(28 21)"><g class="b-baton"><rect x="-8" y="-.8" width="16" height="1.6" ' +
          'rx=".8" fill="' + IVORY + '"/><circle cx="-8" cy="0" r="1.6" fill="#fff"/><circle cx="8" cy="0" r="1.6" fill="#fff"/></g></g>';
      case 'flag':
        return jacket(BLUE) + spark(15, 30, .3) + head(s) + shako(false) + '<path d="M27-5V44" stroke="#8a6a2b" stroke-width="1.6"/>' +
          '<g class="b-flag"><rect x="27" y="-5" width="16" height="11" fill="' + IVORY + '"/>' +
          '<path d="M27-3.4h16M27-.3h16M27 2.8h16" stroke="' + RED + '" stroke-width="1.6"/>' +
          '<rect x="27" y="-5" width="7" height="5.6" fill="' + BLUE + '"/></g>' + arm(24, 27, 27, 24, BLUE);
      case 'trumpet':
        return jacket(BLUE) + spark(14, 33, i * .15 % 1) + head(s) + shako(false) +
          '<g class="b-toot" style="' + clock(2.4, 5) + '">' + arm(24, 27, 24, 20, BLUE) +
          '<rect x="22" y="18.3" width="9" height="2" rx="1" fill="' + GOLD + '"/><path d="M31 19.3 36 15.8V22.8z" fill="' + GOLD + '"/></g>' +
          note(36, 12, i * .2 % 1.2);
      case 'serious':
        // Sunglasses, brows set, mouth flat, slide dead on the beat.
        return jacket(NAVY) + head(s) + shako(false) +
          '<rect x="15" y="16.6" width="8.6" height="2.4" rx="1" fill="#000"/>' +
          '<path d="M15 15.4l3.4.8M23.6 15.4l-3.4.8" stroke="#000" stroke-width="1"/>' +
          '<path d="M17 21.6h3.8" stroke="#3a2416" stroke-width=".9"/>' +
          arm(24, 27, 24, 21, NAVY) +
          '<path d="M23 20.4h10M25 22.6h8" stroke="' + GOLD + '" stroke-width="1.3"/><path d="M33 21.5 39 17V26z" fill="' + GOLD + '"/>' +
          '<g class="b-slide"><path d="M26 20.4h9v2.2h-9" stroke="' + GOLD + '" stroke-width="1.1" fill="none"/></g>';
      case 'sousa':
        return jacket(BLUE) + head(s) + shako(false) + '<circle cx="17" cy="31" r="11" fill="none" stroke="' + GOLD + '" stroke-width="3"/>' +
          '<path d="M24 22 33 8 37 13z" fill="' + GOLD + '"/><ellipse cx="35" cy="10.5" rx="3.6" ry="2.6" fill="#a8873f"/>' +
          note(36, 5, (i * .3) % 1.2);
      case 'snare':
        return jacket(BLUE) + spark(13, 28, (i * .2) % 1) + head(s) + shako(false) +
          '<rect x="19" y="33" width="13" height="7" rx="2" fill="' + IVORY + '" stroke="' + GOLD + '" stroke-width="1.2"/>' +
          '<path d="M19 36.5h13" stroke="' + RED + '" stroke-width="1"/>' + sticks(22, 28);
      case 'tenor':
        return jacket(BLUE) + head(s) + shako(false) +
          '<circle cx="21" cy="35" r="3.4" fill="' + IVORY + '" stroke="' + GOLD + '"/><circle cx="27.5" cy="35" r="3" fill="' + IVORY + '" stroke="' + GOLD + '"/>' +
          '<circle cx="23" cy="40" r="2.8" fill="' + IVORY + '" stroke="' + GOLD + '"/><circle cx="29" cy="40" r="2.4" fill="' + IVORY + '" stroke="' + GOLD + '"/>' +
          sticks(21, 28);
      case 'bass1': case 'bass2': case 'bass3':
        var r = { bass1: 7.5, bass2: 9.5, bass3: 11.5 }[kind];
        return jacket(BLUE) + head(s) + shako(false) +
          '<circle cx="' + (20 + r * 0.4) + '" cy="33" r="' + r + '" fill="' + IVORY + '" stroke="' + BLUE + '" stroke-width="2.2"/>' +
          '<path transform="translate(' + (20 + r * 0.4) + ' 33) scale(' + (r / 10) + ')" d="M0-4.5l1.3 2.9 3.1.3-2.4 2 .8 3.1L0 2.1-2.8 3.8l.8-3.1-2.4-2 3.1-.3z" fill="' + RED + '"/>' +
          '<g class="b-mallet"><path d="M' + (25 + r) + ' 25l-3 6" stroke="' + WOOD + '" stroke-width="1.4"/><circle cx="' + (21.6 + r) + '" cy="31.6" r="1.8" fill="' + IVORY + '"/></g>';
      case 'cymbal':
        return jacket(BLUE) + head(s) + shako(false) + arm(13, 27, 13, 31, BLUE) + arm(24, 27, 26, 31, BLUE) +
          '<g class="b-cym"><ellipse cx="13" cy="33" rx="1.6" ry="6" fill="' + GOLD + '"/></g>' +
          '<g class="b-cym b-cym2"><ellipse cx="27" cy="33" rx="1.6" ry="6" fill="' + GOLD + '"/></g>' + spark(20, 30, .2);
      case 'chair':
        return '<rect x="11" y="23" width="15" height="19" rx="3" fill="' + GOLD + '"/>' + spark(14, 28, (i * .1) % 1) +
          spark(22, 35, (.3 + i * .1) % 1) + spark(18, 31, .8) + head(s) + '<rect x="13.5" y="13.5" width="10" height="2" rx="1" fill="' + RED + '"/>' +
          arm(12, 25, 14, 6, s) + arm(25, 25, 23, 6, s) + '<g transform="translate(18.5 3)">' + chair() + '</g>';
    }
    return '';
  }

  /* ------------------------------------------------------------- the crowd */

  var SHIRTS = ['#1f4fbf', '#c8102e', '#f5f2ea', '#d8b86a', '#3c7a5a', '#6a4c93', '#e07a5f', '#2a9d8f', '#264653', '#f4a261', '#8d99ae'];
  var SIGNS = ['#f5f2ea', '#ffffff', '#d8b86a', '#1f4fbf', '#c8102e', '#f4a261'];
  var HAIR = ['#1b1209', '#3a2416', '#6b4423', '#b07a3c', '#d9c28a', '#9a9a9a', '#2b1a10'];

  /** One pick from a list. */
  function any(list) { return list[Math.floor(Math.random() * list.length)]; }

  /** An inline animation clock: a random period in seconds and a random start within it. */
  function clock(min, max) {
    var d = rand(min, max);
    return 'animation-duration:' + d.toFixed(2) + 's;animation-delay:-' + rand(0, d).toFixed(2) + 's';
  }

  /**
   * Everyone's own pace. The whole parade crosses on one track, so each
   * person also drifts by --drift units over the crossing (b-pace, timed to
   * the parade): some gain ground, some lose it, and the parade loosens as
   * it goes instead of moving as one block. --t scales every rhythm inside
   * the figure (step, legs, sticks, batons), so nobody plays or marches in
   * lockstep with a neighbour.
   */
  function pace(spread, inner, tempo) {
    var k = tempo || 0.15;   // the crowd varies about 15%; the trained band about 5%
    return '<g class="b-pace" style="--drift:' + rand(-spread, spread).toFixed(1) + 'px;--t:' + rand(1 - k, 1 + k).toFixed(2) + '">' + inner + '</g>';
  }

  // What a protester is doing, and how often each is dealt out.
  var ACTS = ['sign', 'sign', 'sign', 'sign', 'sign', 'fist', 'fist', 'fist', 'flag', 'flag', 'clap', 'clap',
    'wave', 'wave', 'walk', 'walk', 'drum', 'drum', 'drum', 'drum', 'drum', 'tamb', 'tamb', 'horn'];

  /**
   * One protester, facing right, feet at y 60 in a 62-unit figure, drawn
   * simpler than a marcher (they are many and small), doing one thing on
   * their own clock: raising and lowering a sign, pumping a fist in bursts,
   * waving a flag or a hand, clapping, walking, or playing a hand drum, a
   * tambourine or a horn.
   */
  function protester(kind) {
    var skin = any(SKIN), shirt = any(SHIRTS), hair = any(HAIR), g = '';
    var limb = 'stroke="' + skin + '" stroke-width="2.6" stroke-linecap="round" fill="none"';
    g += '<rect x="9" y="46" width="3.4" height="13" rx="1.2" fill="#2b2f3a"/><rect x="13.2" y="46" width="3.4" height="13" rx="1.2" fill="#2b2f3a"/>';
    g += '<rect x="7" y="30" width="11" height="17" rx="3" fill="' + shirt + '"/>';
    g += '<circle cx="12.5" cy="25" r="4.3" fill="' + skin + '"/>';
    g += Math.random() < 0.3 ? '<path d="M8 24a4.6 4.6 0 0 1 9.2 0h2.4" stroke="' + any(SHIRTS) + '" stroke-width="2.4" fill="none"/>'
      : '<path d="M8.2 24.5a4.3 4.3 0 0 1 8.6-1.5c-2-1-5-1.2-8.6 1.5z" fill="' + hair + '"/>';
    if (kind !== 'clap' && kind !== 'walk') g += '<path d="M9 33l-1.4 8" ' + limb + '/>';   // the other arm, hanging
    switch (kind) {
      case 'sign':
        var c = any(SIGNS), ink = c === '#1f4fbf' || c === '#c8102e' ? '#ffffff' : '#10213f';
        g += '<g class="b-raise" style="' + clock(2, 5) + '"><path d="M16 33l3-10" ' + limb + '/><path d="M19.5 27V9" stroke="#8a6a2b" stroke-width="1.2"/>' +
          '<rect x="11" y="0" width="17" height="10" rx="1" fill="' + c + '"/>' +
          (Math.random() < 0.3 ? '<path d="M19.5 2.2l.9 2 2.2.2-1.7 1.4.6 2.2-2-1.2-2 1.2.6-2.2-1.7-1.4 2.2-.2z" fill="' + ink + '"/>'
            : '<path d="M13.5 3.2h12M13.5 5.4h9M13.5 7.6h11" stroke="' + ink + '" stroke-width="1.1"/>') + '</g>';
        break;
      case 'fist':
        g += '<g class="b-fist" style="' + clock(2.4, 6) + '"><path d="M16 33l1.5-13" ' + limb + '/><circle cx="17.6" cy="18.6" r="2.3" fill="' + skin + '"/></g>';
        break;
      case 'flag':
        g += '<g class="b-raise" style="' + clock(3, 6) + '"><path d="M16 33l2-8" ' + limb + '/><path d="M18.5 30V8" stroke="#8a6a2b" stroke-width="1"/>' +
          '<g class="b-flag" style="' + clock(.6, 1) + '"><rect x="18.5" y="8" width="10" height="6.5" fill="#f5f2ea"/>' +
          '<path d="M18.5 9.2h10M18.5 11.3h10M18.5 13.4h10" stroke="#c8102e" stroke-width="1"/><rect x="18.5" y="8" width="4.4" height="3.4" fill="#1f4fbf"/></g></g>';
        break;
      case 'clap':
        g += '<g class="b-clap" style="' + clock(.3, .5) + '"><path d="M8.5 33l3.8-5M16.5 33l-3.2-5" ' + limb + '/></g>';
        break;
      case 'wave':
        g += '<g class="b-hand" style="' + clock(.5, .9) + '"><path d="M16 33l2-12" ' + limb + '/><circle cx="18.2" cy="20.4" r="1.9" fill="' + skin + '"/></g>';
        break;
      case 'walk':
        g += '<g class="b-swing" style="' + clock(.9, 1.3) + '"><path d="M9 33l-1 8M16 33l1 8" ' + limb + '/></g>';
        break;
      case 'drum':
        g += '<ellipse cx="18" cy="39" rx="4.4" ry="2.4" fill="#d8b86a" stroke="#8a6a2b" stroke-width=".8"/>' +
          '<g class="b-tap" style="' + clock(.2, .34) + '"><path d="M16 33l3 3" ' + limb + '/><path d="M19 36l3.5-3" stroke="#6b4a1f" stroke-width="1.1"/></g>';
        break;
      case 'tamb':
        g += '<g class="b-raise" style="' + clock(1.8, 3.6) + '"><path d="M16 33l2-11" ' + limb + '/>' +
          '<g class="b-shake" style="' + clock(.14, .22) + '"><circle cx="18.5" cy="19" r="3.6" fill="none" stroke="#d8b86a" stroke-width="1.6"/>' +
          '<circle cx="15.2" cy="19" r=".9" fill="#e8e8e8"/><circle cx="21.8" cy="19" r=".9" fill="#e8e8e8"/></g></g>';
        break;
      case 'horn':
        g += '<g class="b-toot" style="' + clock(1.6, 3.6) + '"><path d="M16 32l3-5" ' + limb + '/><path d="M16.5 26l11-3.4v5.8z" fill="#d8b86a"/></g>';
        break;
      case 'mega':
        g += '<path d="M16 32l3-6" ' + limb + '/><path d="M17 24.5l7-3.5v9l-7-3.5z" fill="#e8e8e8"/>' +
          '<path class="b-shout" d="M26 22.5c2 1.5 2 4.5 0 6M28.5 21c3 2.5 3 6.5 0 9" stroke="#ffffff" stroke-width=".9" fill="none"/>';
        break;
    }
    return g;
  }

  /** A crowd row from x0 to x1; when thinning (the trail), spacing grows toward x0. */
  function crowdRow(x0, x1, opts) {
    var out = '', x = x1;
    while (x > x0) {
      var tail = opts.thin ? 1 + Math.pow((x1 - x) / (x1 - x0), 2) * 6 : 1;
      var stray = opts.thin && tail > 3.5 && Math.random() < 0.5;
      var body = '<g class="b-walk" style="' + clock(.6, .85) + '">' + protester(any(ACTS)) + '</g>';
      var y = opts.y + rand(-3, 3), sc = opts.scale * rand(0.92, 1.08);   // nobody stands on a grid
      out += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + sc.toFixed(3) + ')">' +
        pace(stray ? 50 : 34, stray ? '<g class="b-stray" style="' + clock(2.6, 4.2) + '">' + body + '</g>' : body) + '</g>';
      x -= rand(opts.gap[0], opts.gap[1]) * tail;
    }
    return out;
  }

  /* ------------------------------------------------------------ banners */

  var BANNER_H = 13;

  /**
   * A long banner reading `text`, `len` units wide, its top at y -9, that
   * ripples along its length (top at y -7, clear of the header edge at the
   * top of a ripple). The cloth and lettering are drawn once in
   * <defs>; narrow slices each show their own part of it through a nested
   * <svg> window and bob a beat after the slice before, so the wave travels
   * down the banner while the words stay whole.
   */
  function banner(id, text, len, cloth, ink) {
    var N = 14, w = len / N, out = '<defs><g id="' + id + '">' +
      '<rect x="0" y="0" width="' + len + '" height="' + BANNER_H + '" rx="1.5" fill="' + cloth + '" stroke="' + GOLD + '" stroke-width="1"/>' +
      '<text x="' + (len / 2) + '" y="9.4" text-anchor="middle" textLength="' + (len - 22) + '" lengthAdjust="spacingAndGlyphs" ' +
      'font-family="Oswald, Arial Narrow, sans-serif" font-weight="700" font-size="8.4" fill="' + ink + '">' + text + '</text>' +
      '<path d="M5 6.5l.8 1.6 1.8.2-1.3 1.2.4 1.8-1.7-.9-1.6.9.4-1.8-1.4-1.2 1.8-.2zM' + (len - 6) + ' 6.5l.8 1.6 1.8.2-1.3 1.2.4 1.8-1.7-.9-1.6.9.4-1.8-1.4-1.2 1.8-.2z" fill="' + RED + '" transform="translate(0 -3)"/>' +
      '</g></defs>';
    for (var k = 0; k < N; k++) {
      out += '<g class="b-ripple" style="animation-delay:-' + (k * 0.11).toFixed(2) + 's">' +
        '<svg x="' + (k * w).toFixed(2) + '" y="-7" width="' + (w + 0.6).toFixed(2) + '" height="' + BANNER_H + '" ' +
        'viewBox="' + (k * w).toFixed(2) + ' 0 ' + (w + 0.6).toFixed(2) + ' ' + BANNER_H + '" overflow="hidden"><use href="#' + id + '"/></svg></g>';
    }
    return out;
  }

  /** A pom-pom: a burst of strands around a ball, shaking on its own clock. */
  function pompom(x, y, c) {
    // Position outside, motion inside: a CSS animation's transform replaces
    // the element's own transform attribute, so one group cannot do both.
    return '<g transform="translate(' + x + ' ' + y + ')"><g class="b-pom" style="' + clock(.24, .4) + '">' +
      '<circle r="3.2" fill="' + c + '"/><circle cx="-2.4" cy="-1.6" r="1.4" fill="#fff" opacity=".6"/>' +
      '<path d="M0-4.6V4.6M-4.6 0H4.6M-3.3-3.3l6.6 6.6M3.3-3.3l-6.6 6.6" stroke="' + c + '" stroke-width="1.1"/></g></g>';
  }

  /**
   * A cheerleader in a 36-unit slot, facing right: white top with a gold
   * chevron, blue pleated skirt, ponytail. Poses: carry (both hands up on a
   * banner pole), cart (arms and legs spread, cartwheeling), flip (tucked,
   * back handspring), jump (toe-touch, pom-poms high).
   */
  function cheerleader(pose) {
    var s = any(SKIN), hair = any(HAIR), pom = Math.random() < 0.5 ? GOLD : BLUE;
    var limb = 'stroke="' + s + '" stroke-width="3" stroke-linecap="round" fill="none"';
    var legsStraight = '<path d="M15 44v13M21 44v13" ' + limb + '/><path d="M12.5 57.5h5M18.5 57.5h5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>';
    var legsSpread = '<path d="M15 44l-6 13M21 44l6 13" ' + limb + '/>';
    var body = '<path d="M10 40h17l2.5 6h-22z" fill="' + BLUE + '"/><path d="M13 40l-1 6M18.5 40v6M24 40l1 6" stroke="#163c96" stroke-width=".8"/>' +
      '<rect x="11.5" y="24" width="14" height="17" rx="3" fill="' + IVORY + '"/><path d="M12 28l6.5 5 6.5-5" stroke="' + GOLD + '" stroke-width="1.8" fill="none"/>' +
      '<circle cx="18.5" cy="18.5" r="5" fill="' + s + '"/><path d="M13.6 17.5a5 5 0 0 1 9.8 0c-3-1.6-6.6-1.6-9.8 0z" fill="' + hair + '"/>' +
      '<path d="M22.8 15c4 0 5 4 3.4 8" stroke="' + hair + '" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
      '<circle cx="23.2" cy="14.8" r="1.2" fill="' + RED + '"/>';
    switch (pose) {
      case 'carry':
        // The pole stands off the shoulder, held up in one hand, so the arm never crosses the face;
        // the other hand keeps a pom-pom at the hip.
        return legsStraight + body + '<path d="M27.5 6V38" stroke="#8a6a2b" stroke-width="1.4"/>' +
          '<path d="M24.5 26l2.8-11" ' + limb + '/><path d="M12.5 27l-3 9" ' + limb + '/>' + pompom(9, 37, pom);
      case 'jump':
        return '<g class="b-hop" style="' + clock(1.1, 1.8) + '">' + legsStraight + body + '<path d="M12.5 26l-5-12M24.5 26l5-12" ' + limb + '/>' +
          pompom(7, 12, pom) + pompom(30, 12, pom) + '</g>';
      case 'cart':
        return '<g class="b-cart" style="' + clock(1.4, 2.2) + '">' + legsSpread + body + '<path d="M12.5 26l-7-9M24.5 26l7-9" ' + limb + '/>' +
          pompom(5, 16, pom) + pompom(32, 16, pom) + '</g>';
      case 'flip':
        return '<g class="b-flip" style="' + clock(1.6, 2.4) + '">' + legsStraight + body + '<path d="M12.5 26l-4-10M24.5 26l4-10" ' + limb + '/>' +
          pompom(8, 15, pom) + pompom(29, 15, pom) + '</g>';
    }
    return '';
  }

  /** An ordinary citizen holding a banner pole up with both hands (protester proportions). */
  function citizen() {
    var skin = any(SKIN), shirt = any(SHIRTS), hair = any(HAIR);
    var limb = 'stroke="' + skin + '" stroke-width="2.6" stroke-linecap="round" fill="none"';
    return '<rect x="9" y="46" width="3.4" height="13" rx="1.2" fill="#2b2f3a"/><rect x="13.2" y="46" width="3.4" height="13" rx="1.2" fill="#2b2f3a"/>' +
      '<rect x="7" y="30" width="11" height="17" rx="3" fill="' + shirt + '"/><circle cx="12.5" cy="25" r="4.3" fill="' + skin + '"/>' +
      '<path d="M8.2 24.5a4.3 4.3 0 0 1 8.6-1.5c-2-1-5-1.2-8.6 1.5z" fill="' + hair + '"/>' +
      '<path d="M19.5 6V44" stroke="#8a6a2b" stroke-width="1.3"/><path d="M16.5 33l2.8-17" ' + limb + '/><path d="M9 33l-1.4 8" ' + limb + '/>';
  }

  /**
   * The whole scene, back to front, the way it is drawn (the parade moves
   * right, so the front is the largest x): the trail of protesters, the
   * back row walking behind the band, the band, then the front row among
   * the musicians. Stragglers, missteps and out-of-step marchers are dealt
   * out at random each load. Built when the parade starts, not at page
   * load, so the hundreds of figures cost nothing until they are needed.
   */
  function scene() {
    // The drumline is the heart of it: five snares, two tenors, five bass
    // drums high to low, two cymbals, and solo snares among the horns.
    var rows = ['chair', 'chair', 'trumpet', 'snare', 'cymbal', 'cymbal', 'bass3', 'bass3', 'bass2', 'bass2', 'bass1', 'tenor',
      'tenor', 'snare', 'snare', 'snare', 'snare', 'snare', 'sousa', 'sousa'];
    if (Math.random() < CONFIG.serious) rows.push('serious');
    rows = rows.concat(['snare', 'trumpet', 'trumpet', 'trumpet', 'flag', 'majorette', 'major']);
    var strays = [], trips = [];
    while (strays.length < (Math.random() < 0.6 ? 1 : 0)) {
      var a = Math.floor(rand(0, rows.length - 1));
      if (rows[a] !== 'serious' && strays.indexOf(a) < 0) strays.push(a);
    }
    while (trips.length < 1 + (Math.random() < 0.5 ? 1 : 0)) {
      var b = Math.floor(rand(0, rows.length));
      if (rows[b] !== 'serious' && trips.indexOf(b) < 0) trips.push(b);
    }
    // The crowd is dealt fresh on every pass: trail length, rows, spacing.
    var TRAIL = rand(620, 900), x = TRAIL + 30, parts = [];
    var oops = Math.random() < 0.6 ? Math.floor(rand(0, rows.length)) : -1;
    if (rows[oops] === 'serious') oops = -1;
    rows.forEach(function (kind, i) {
      var s = SKIN[(i * 7) % SKIN.length];
      var stray = strays.indexOf(i) >= 0, trip = trips.indexOf(i) >= 0, serious = kind === 'serious';
      if (stray) x += rand(14, 26);                                     // a straggler leaves a hole
      var off = serious ? 0 : (Math.random() < 0.25 ? -rand(.1, .4) : 0);   // some march out of step
      var who = '<g class="' + (stray ? 'b-stray' : '') + '" style="animation-delay:-' + rand(0, 3).toFixed(2) + 's">' +
        '<g class="' + (trip ? 'b-trip' : '') + '" style="animation-delay:' + rand(1.5, 9).toFixed(2) + 's">' +
        '<g class="' + (serious ? 'b-steady' : 'b-bob') + '" style="animation-delay:' + off.toFixed(2) + 's">' +
        legs(kind === 'majorette' ? s : IVORY) + figure(kind, s, i) + '</g></g></g>';
      // A trained band: small drift and tempo spread, so the rows hold. The
      // serious trombonist keeps perfect time; one marcher a pass may turn the
      // wrong way for a beat (b-oops).
      if (i === oops) who = '<g class="b-oops" style="animation-delay:' + rand(3, 12).toFixed(2) + 's">' + who + '</g>';
      parts.push('<g transform="translate(' + x.toFixed(1) + ' 0)">' + (serious ? who : pace(7, who, 0.05)) + '</g>');
      x += GAP + rand(-3, 3);
    });
    var end = x + 10;
    var smoke = '';
    for (var k = 0; k < 7; k++) {
      smoke += '<circle class="b-puff" style="animation-delay:' + (k * .23).toFixed(2) + 's" cx="' + (TRAIL + 6 + (k % 3) * 7) + '" cy="' +
        (50 - (k % 2) * 9) + '" r="5.5" fill="#e9ecf2"/>';
    }
    // Behind the band: a dim back row the whole length, and the far rows of the trail.
    var back = '<g opacity=".72">' + crowdRow(0, TRAIL, { y: 22, scale: .6, gap: [10, 16], thin: true }) +
      crowdRow(TRAIL, end - 20, { y: 22, scale: .6, gap: [14, 21] }) + '</g>' +
      crowdRow(0, TRAIL, { y: 16, scale: .72, gap: [11, 18], thin: true });
    // In front: the near row of the trail, and protesters walking among the musicians.
    var front = crowdRow(0, TRAIL, { y: 14, scale: .82, gap: [12, 20], thin: true }) +
      crowdRow(TRAIL + 40, end - 30, { y: 15, scale: .78, gap: [34, 52] });
    // The one with the megaphone leads the call, near the front of the trail.
    var mega = '<g transform="translate(' + (TRAIL - 34) + ' 14) scale(.82)">' +
      pace(20, '<g class="b-walk" style="' + clock(.46, .56) + '">' + protester('mega') + '</g>') + '</g>';
    // Leading: cheerleaders. Three carry "Tell me what democracy looks like"
    // overhead; tumblers cartwheel, flip and jump ahead of it.
    var FRONT_LEN = 200, lead = '<g transform="translate(' + (end + 24).toFixed(1) + ' 0)">' +
      banner('ban-tell', 'TELL ME WHAT DEMOCRACY LOOKS LIKE', FRONT_LEN, IVORY, NAVY);
    [6 - 27.5, FRONT_LEN / 2 - 27.5, FRONT_LEN - 6 - 27.5].forEach(function (cx) {   // poles at x 27.5 in the figure
      lead += '<g transform="translate(' + cx.toFixed(1) + ' 0)">' + pace(4, '<g class="b-bob">' + cheerleader('carry') + '</g>', 0.05) + '</g>';
    });
    ['jump', 'cart', 'flip', 'cart', 'jump'].forEach(function (pose, k) {
      lead += '<g transform="translate(' + (FRONT_LEN + 22 + k * rand(30, 40)).toFixed(1) + ' 0)">' + pace(10, cheerleader(pose), 0.1) + '</g>';
    });
    lead += '</g>';
    var leadEnd = end + 24 + FRONT_LEN + 22 + 5 * 40 + 20;
    // Bringing up the rear: ordinary citizens holding "This is what
    // democracy looks like!" behind the last of the stragglers.
    var REAR_LEN = 220, rear = banner('ban-this', 'THIS IS WHAT DEMOCRACY LOOKS LIKE!', REAR_LEN, '#1f4fbf', '#ffffff');
    [6 - 19.5, REAR_LEN / 3 - 19.5, 2 * REAR_LEN / 3 - 19.5, REAR_LEN - 6 - 19.5].forEach(function (cx) {   // poles at x 19.5
      rear += '<g transform="translate(' + cx.toFixed(1) + ' 0)">' + pace(5, '<g class="b-walk" style="' + clock(.6, .8) + '">' + citizen() + '</g>', 0.08) + '</g>';
    });
    var SHIFT = REAR_LEN + 50;   // the rest of the parade starts after the rear banner
    return {
      svg: '<g transform="translate(24 0)">' + rear + '</g>' +
        '<g transform="translate(' + SHIFT + ' 0)">' + back + smoke + parts.join('') + front + mega + lead + '</g>',
      width: SHIFT + leadEnd
    };
  }

  var band = document.createElement('div');
  band.className = 'band';
  band.setAttribute('aria-hidden', 'true');
  header.appendChild(band);
  var track = null;
  apply();
  btn.hidden = false;

  /** Draws a freshly dealt scene into the header (each parade is a new crowd). */
  function build() {
    var made = scene();
    band.innerHTML = '<div class="band-track"><svg viewBox="0 -10 ' + made.width.toFixed(0) + ' 72" height="100%" ' +
      'preserveAspectRatio="xMinYMax meet" focusable="false">' + made.svg + '</svg></div>';   // constant markup built above; no data
    track = band.firstChild;
    track.addEventListener('animationend', function (e) {
      if (e.target === track) { band.classList.remove('is-on'); apply(); }
    });
  }

  /* -------------------------------------------------------------- parade */

  var marched = false, startedAt = 0, bars = 0;

  /** Sends a parade across now. The automatic one runs once per load; Play can repeat it. */
  function parade() {
    if (band.classList.contains('is-on')) return;
    marched = true;
    build();
    // Crossing time from the distance, rounded to whole bars of the march.
    // The band must be displayed to measure (paused, it is display: none).
    var dist = window.innerWidth + track.getBoundingClientRect().width;
    bars = Math.max(6, Math.round(dist / CONFIG.speed / BAR));
    startedAt = Date.now();
    track.style.animationDuration = (bars * BAR).toFixed(3) + 's';
    track.style.setProperty('--dur', (bars * BAR).toFixed(3) + 's');   // each person's drift spans the crossing
    band.classList.add('is-on');
    apply();
    startMusic(bars, 0);
  }
  function scheduleParade() {
    var wait = rand(CONFIG.delayMin, CONFIG.delayMax);
    setTimeout(function go() {
      if (document.hidden) { document.addEventListener('visibilitychange', go, { once: true }); return; }
      if (motion && !marched) parade();
    }, wait);
  }
  if (document.readyState === 'complete') scheduleParade();
  else window.addEventListener('load', scheduleParade);

  /* ---------------------------------------------------------- play/pause */

  // Play when nothing is moving: a new parade, now, and the visitor's choice
  // to have motion is remembered. Pause while it is moving: the parade and
  // any sound stop, the rotor holds, and the parade will not start on its
  // own again until Play is pressed.
  btn.addEventListener('click', function () {
    if (band.classList.contains('is-on')) {
      band.classList.remove('is-on');
      stopMusic();
      motion = false;
      save('ps-parade', 'off');
    } else {
      motion = true;
      save('ps-parade', 'on');
      apply();   // unhide the band first: parade() measures it, and a hidden band measures 0
      parade();
    }
    apply();
  });
})();
