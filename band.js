/*
  ============================================================================
  projectspeaker.org
  ============================================================================
  @file       band.js
  @desc       The marching band that parades behind the header text, its
              march, and the two header toggles that control them: Sound and
              Motion.
  @author     mediaBrilliance digitalxtudio
  @version    2.2.0
  @updated    2026-11-07
  @a11y       The band is decorative (aria-hidden, no pointer events, behind
              the header text at reduced opacity). Both toggles are real
              buttons with aria-pressed and a label in the page's language.
              Motion off stops the parade, the headline rotation (rotor.js
              reads the same class) and smooth scrolling. Sound is on by
              default and plays only once the browser allows it, after the
              visitor's first tap or key press; the header toggle stops it.
  ============================================================================

  WHEN THE BAND MARCHES
  Once per page load, at a random moment 3 to 20 seconds after the page is
  ready, if Motion is on and the tab is visible. Turning Sound on before then
  sends the band out at once, with the march. It crosses left to right at
  about 70 px a second, so the crossing takes longer on a wide screen; the
  time is rounded to whole bars of music so the band and the march end
  together.

  THE LINEUP
  Built fresh on every load. Front to back: drum major, majorette, flag
  bearer, three trumpets, a solo snare, sometimes the serious trombonist,
  two sousaphones, the drumline (three snares, tenors, three bass drums in
  graded sizes, cymbals), another solo snare, a trumpet and two dancers
  swinging folding chairs, with smoke puffs behind. Rows sit far apart, one
  or two stragglers drift behind and catch up, a few marchers are out of
  step, and two or three trip once somewhere in the crossing. The serious
  trombonist (about two loads in five) has sunglasses, a level gaze, no
  bounce and a slide that never misses.

  THE TOGGLES
  #pref-sound and #pref-motion in the header. Their state lives on <html> as
  classes (sound-on, motion-off, motion-on) and in localStorage, so a choice
  holds on the next visit; if storage is blocked, the defaults apply:
  Sound on, Motion on, or Motion off when the device asks for reduced motion.
  "motion-on" records an explicit choice to override that device setting.

  THE MUSIC
  An original march in G minor, 4/4 at 136 beats a minute, synthesized with
  the Web Audio API and scheduled bar by bar to the length of the parade:
  two bars of drumline cadence, then an eight-bar strain repeated as needed,
  then an ending. Brass is built to sound blown, not held: one clean voice
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
  var soundBtn = document.getElementById('pref-sound');
  var motionBtn = document.getElementById('pref-motion');
  if (!header || !soundBtn || !motionBtn) return;

  var CONFIG = {
    delayMin: 3000,    // ms after the page is ready before the band can start
    delayMax: 20000,
    speed: 70,         // px a second across the screen
    bpm: 136,
    volume: 0.2,
    serious: 0.4       // chance the serious trombonist marches this load
  };

  /* ---------------------------------------------------------- preferences */

  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem(key, v); } catch (e) { /* defaults next time */ } }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = load('ps-motion') ? load('ps-motion') === 'on' : !reduce;
  var sound = load('ps-sound') !== 'off';   // on unless the visitor turned it off

  /** Mirrors the state onto <html> and the buttons. */
  function apply() {
    root.classList.toggle('motion-off', !motion);
    root.classList.toggle('motion-on', motion && reduce);   // explicit override of the device setting
    root.classList.toggle('sound-on', sound);
    motionBtn.setAttribute('aria-pressed', String(motion));
    soundBtn.setAttribute('aria-pressed', String(sound));
  }
  apply();
  soundBtn.hidden = false;
  motionBtn.hidden = false;

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
      if (!m || !live(t)) return;
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
      var n = (bar - 2) % 8, fill = n === 3 || n === 7;
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
    if (!sound || playing) return;
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
  var GAP = 46;          // units between rows; wide on purpose

  function spark(x, y, d) {
    return '<path class="b-spark" style="animation-delay:' + d.toFixed(2) + 's" transform="translate(' + x + ' ' + y + ')" ' +
      'd="M0-2.6L.6-.6 2.6 0 .6.6 0 2.6-.6.6-2.6 0-.6-.6z" fill="#fff"/>';
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
    return '<g class="b-note" style="animation-delay:' + d.toFixed(2) + 's" transform="translate(' + x + ' ' + y + ')">' +
      '<path d="M0 0v-6l4-1.2v6" stroke="' + GOLD + '" stroke-width="1.2" fill="none"/>' +
      '<ellipse cx="-1" cy="0" rx="1.6" ry="1.2" fill="' + GOLD + '"/><ellipse cx="3" cy="-1.2" rx="1.6" ry="1.2" fill="' + GOLD + '"/></g>';
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
          '<g transform="translate(29 20)"><g class="b-baton"><rect x="-12" y="-.9" width="24" height="1.8" rx=".9" fill="' + IVORY + '"/>' +
          '<circle cx="-12" cy="0" r="2" fill="' + GOLD + '"/><circle cx="12" cy="0" r="2" fill="' + GOLD + '"/></g></g>';
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
        return jacket(BLUE) + spark(14, 33, i * .15 % 1) + head(s) + shako(false) + arm(24, 27, 24, 20, BLUE) +
          '<rect x="22" y="18.3" width="9" height="2" rx="1" fill="' + GOLD + '"/><path d="M31 19.3 36 15.8V22.8z" fill="' + GOLD + '"/>' +
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

  /**
   * Back to front, the way it is drawn (the band moves right, so the front
   * is the largest x). Stragglers, missteps and out-of-step marchers are
   * dealt out at random each load.
   */
  function lineup() {
    var rows = ['chair', 'chair', 'trumpet', 'snare', 'cymbal', 'bass3', 'bass2', 'bass1', 'tenor', 'snare', 'snare', 'snare',
      'sousa', 'sousa'];
    if (Math.random() < CONFIG.serious) rows.push('serious');
    rows = rows.concat(['snare', 'trumpet', 'trumpet', 'trumpet', 'flag', 'majorette', 'major']);
    var strays = [], trips = [];
    while (strays.length < 1 + (Math.random() < 0.5 ? 1 : 0)) {
      var a = Math.floor(rand(0, rows.length - 1));
      if (rows[a] !== 'serious' && strays.indexOf(a) < 0) strays.push(a);
    }
    while (trips.length < 2 + (Math.random() < 0.5 ? 1 : 0)) {
      var b = Math.floor(rand(0, rows.length));
      if (rows[b] !== 'serious' && trips.indexOf(b) < 0) trips.push(b);
    }
    var x = 30, parts = [];
    rows.forEach(function (kind, i) {
      var s = SKIN[(i * 7) % SKIN.length];
      var stray = strays.indexOf(i) >= 0, trip = trips.indexOf(i) >= 0, serious = kind === 'serious';
      if (stray) x += rand(14, 26);                                     // a straggler leaves a hole
      var off = serious ? 0 : (Math.random() < 0.25 ? -rand(.1, .4) : 0);   // some march out of step
      parts.push('<g transform="translate(' + x.toFixed(1) + ' 0)">' +
        '<g class="' + (stray ? 'b-stray' : '') + '" style="animation-delay:-' + rand(0, 3).toFixed(2) + 's">' +
        '<g class="' + (trip ? 'b-trip' : '') + '" style="animation-delay:' + rand(1.5, 9).toFixed(2) + 's">' +
        '<g class="' + (serious ? 'b-steady' : 'b-bob') + '" style="animation-delay:' + off.toFixed(2) + 's">' +
        legs(kind === 'majorette' ? s : IVORY) + figure(kind, s, i) + '</g></g></g></g>');
      x += GAP + rand(-3, 3);
    });
    var smoke = '';
    for (var k = 0; k < 7; k++) {
      smoke += '<circle class="b-puff" style="animation-delay:' + (k * .23).toFixed(2) + 's" cx="' + (6 + (k % 3) * 7) + '" cy="' +
        (50 - (k % 2) * 9) + '" r="5.5" fill="#e9ecf2"/>';
    }
    return { svg: smoke + parts.join(''), width: x + 10 };
  }

  var made = lineup();
  var band = document.createElement('div');
  band.className = 'band';
  band.setAttribute('aria-hidden', 'true');
  band.innerHTML = '<div class="band-track"><svg viewBox="0 -10 ' + made.width.toFixed(0) + ' 72" height="100%" ' +
    'preserveAspectRatio="xMinYMax meet" focusable="false">' + made.svg + '</svg></div>';   // constant markup built above; no data
  header.appendChild(band);
  var track = band.firstChild;

  /* -------------------------------------------------------------- parade */

  var marched = false, startedAt = 0, bars = 0;

  function parade() {
    if (marched || !motion) return;
    marched = true;
    // Crossing time from the distance, rounded to whole bars of the march.
    var dist = window.innerWidth + track.getBoundingClientRect().width;
    bars = Math.max(6, Math.round(dist / CONFIG.speed / BAR));
    startedAt = Date.now();
    track.style.animationDuration = (bars * BAR).toFixed(3) + 's';
    band.classList.add('is-on');
    startMusic(bars, 0);
  }
  track.addEventListener('animationend', function (e) {
    if (e.target === track) band.classList.remove('is-on');
  });

  function scheduleParade() {
    var wait = rand(CONFIG.delayMin, CONFIG.delayMax);
    setTimeout(function go() {
      if (document.hidden) { document.addEventListener('visibilitychange', go, { once: true }); return; }
      parade();
    }, wait);
  }
  if (document.readyState === 'complete') scheduleParade();
  else window.addEventListener('load', scheduleParade);

  /* ------------------------------------------------------------- toggles */

  soundBtn.addEventListener('click', function () {
    sound = !sound;
    save('ps-sound', sound ? 'on' : 'off');
    apply();
    if (!sound) { stopMusic(); return; }
    if (band.classList.contains('is-on')) startMusic(bars, (Date.now() - startedAt) / 1000);   // join the band where it is
    else if (!marched && motion) parade();                                                      // send it out now
    else startMusic(10, 0);                                                                      // the march alone
  });

  motionBtn.addEventListener('click', function () {
    motion = !motion;
    save('ps-motion', motion ? 'on' : 'off');
    apply();
    if (!motion) band.classList.remove('is-on');
  });
})();
