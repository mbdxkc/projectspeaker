/*
  ============================================================================
  projectspeaker.org
  ============================================================================
  @file       band.js
  @desc       The marching band that parades across the header, its march, and
              the two header toggles that control them: Sound and Motion.
  @author     mediaBrilliance digitalxtudio
  @version    1.0.0
  @updated    2026-11-07
  @a11y       The band is decorative (aria-hidden, no pointer events). Both
              toggles are real buttons with aria-pressed and a label in the
              page's language. Motion off stops the parade, the headline
              rotation (rotor.js reads the same class) and smooth scrolling.
              Sound never starts on its own: the visitor turns it on.
  ============================================================================

  WHEN THE BAND MARCHES
  Once per page load, at a random moment 3 to 20 seconds after the page is
  ready, if Motion is on and the tab is visible. Turning Sound on before then
  sends the band out at once, with the march. It crosses the header left to
  right in 16 seconds, the length of the march.

  THE TOGGLES
  #pref-sound and #pref-motion in the header. Their state lives on <html> as
  classes (sound-on, motion-off, motion-on) and in localStorage, so a choice
  holds on the next visit; if storage is blocked, the defaults apply:
  Sound off, Motion on, or Motion off when the device asks for reduced motion.
  "motion-on" records an explicit choice to override that device setting.

  THE MUSIC
  An original march in B-flat, 16 bars of 2/4 at 120 beats a minute, played
  by the Web Audio API: brass-like melody, oom-pah bass, bass drum on the
  beat, snare off the beat, rolls at the phrase ends and a cymbal at both
  ends. No audio file is downloaded. Browsers allow sound only after a tap or
  key press, which pressing the Sound button is.

  THE DRAWING
  One SVG, built below from small helpers: a drum major twirling a baton, a
  majorette in a sequined dress, a flag bearer, two trumpets, a sousaphone, a
  snare, a bass drum and two dancers swinging folding chairs, with smoke
  puffs behind and sparkles on the costumes. Every moving part is animated in
  style.css ("Marching band"), and only while the band is out.
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
    duration: 16,      // seconds to cross; also the length of the march
    bpm: 120,
    volume: 0.16
  };

  /* ---------------------------------------------------------- preferences */

  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem(key, v); } catch (e) { /* defaults next time */ } }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = load('ps-motion') ? load('ps-motion') === 'on' : !reduce;
  var sound = load('ps-sound') === 'on';

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

  /* --------------------------------------------------------------- music */

  var ctx = null;        // the AudioContext, made on the first Sound press
  var playing = null;    // { stop } for the march in progress

  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // The march: [MIDI note, beats]. Four phrases of four bars; each bar is two beats.
  var MELODY = [
    [70, 1], [74, .5], [77, .5], [82, 1.5], [81, .5], [79, .5], [77, .5], [75, .5], [74, .5], [72, 2],
    [72, 1], [75, .5], [79, .5], [84, 1.5], [82, .5], [81, .5], [79, .5], [77, .5], [75, .5], [74, 2],
    [77, .5], [77, .5], [79, .5], [81, .5], [82, 1], [77, 1], [79, .5], [81, .5], [82, .5], [84, .5], [86, 2],
    [84, .5], [82, .5], [81, .5], [79, .5], [77, 1], [74, 1], [72, .5], [74, .5], [76, .5], [72, .5], [70, 2]
  ];
  // Bass root per bar (B-flat, E-flat, F, C chords) and its third in semitones (3 = minor).
  var ROOTS = [46, 46, 51, 53, 48, 53, 53, 46, 53, 46, 53, 46, 53, 46, 48, 46];
  var THIRDS = [4, 4, 4, 4, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];

  /**
   * Schedules the march from `offset` seconds in, so pressing Sound
   * mid-parade joins the music where the band is. Returns { stop }.
   */
  function march(offset) {
    var beat = 60 / CONFIG.bpm;
    var t0 = ctx.currentTime + 0.05 - offset;
    var out = ctx.createGain();
    out.gain.value = CONFIG.volume;
    var comp = ctx.createDynamicsCompressor();
    out.connect(comp);
    comp.connect(ctx.destination);
    var noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noise.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    function at(t) { return t0 + t; }
    function live(t) { return at(t) >= ctx.currentTime; }

    // A brass-like note: two detuned saws through a lowpass, with a short swell.
    function brass(m, t, d, level, cutoff) {
      if (!live(t)) return;
      var g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = cutoff;
      g.gain.setValueAtTime(0, at(t));
      g.gain.linearRampToValueAtTime(level, at(t) + 0.025);
      g.gain.setTargetAtTime(level * 0.7, at(t) + 0.03, 0.1);
      g.gain.setTargetAtTime(0, at(t + d) - 0.04, 0.03);
      [-6, 6].forEach(function (cents) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = freq(m); o.detune.value = cents;
        o.connect(f); o.start(at(t)); o.stop(at(t + d) + 0.2);
      });
      f.connect(g); g.connect(out);
    }
    // Filtered noise: snare, roll strokes and cymbal.
    function hiss(t, d, level, hp) {
      if (!live(t)) return;
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = 'highpass'; f.frequency.value = hp;
      g.gain.setValueAtTime(level, at(t));
      g.gain.exponentialRampToValueAtTime(0.001, at(t + d));
      s.connect(f); f.connect(g); g.connect(out);
      s.start(at(t)); s.stop(at(t + d) + 0.05);
    }
    // Bass drum: a sine that drops in pitch.
    function thump(t) {
      if (!live(t)) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(120, at(t));
      o.frequency.exponentialRampToValueAtTime(45, at(t) + 0.14);
      g.gain.setValueAtTime(0.9, at(t));
      g.gain.exponentialRampToValueAtTime(0.001, at(t) + 0.22);
      o.connect(g); g.connect(out); o.start(at(t)); o.stop(at(t) + 0.25);
    }

    var t = 0;
    MELODY.forEach(function (n) {
      brass(n[0], t, n[1] * beat * 0.95, 0.5, 2400);
      brass(n[0] - 12, t, n[1] * beat * 0.95, 0.18, 1400);   // an octave down, for body
      t += n[1] * beat;
    });
    for (var bar = 0; bar < 16; bar++) {
      var b = bar * 2 * beat, r = ROOTS[bar];
      brass(r, b, beat * 0.45, 0.55, 700);                    // oom
      brass(r + 7, b + beat, beat * 0.45, 0.45, 700);         // oom on beat 2, the fifth
      [0.5, 1.5].forEach(function (off) {                      // pah: the chord, off the beat
        brass(r + 12 + THIRDS[bar], b + off * beat, beat * 0.3, 0.14, 1600);
        brass(r + 19, b + off * beat, beat * 0.3, 0.12, 1600);
      });
      thump(b); thump(b + beat);
      hiss(b + 0.5 * beat, 0.09, 0.32, 1800);
      hiss(b + 1.5 * beat, 0.09, 0.32, 1800);
      if (bar % 4 === 3 && bar < 15) {                         // roll into the next phrase
        for (var k = 0; k < 8; k++) hiss(b + k * beat / 4, 0.06, 0.18 + k * 0.02, 2200);
      }
    }
    hiss(0, 1.4, 0.35, 5000);                                  // cymbal at the top
    hiss(15 * 2 * beat, 2, 0.4, 5000);                         // and at the last bar

    return {
      stop: function () {
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
        setTimeout(function () { out.disconnect(); }, 1000);
      }
    };
  }

  function startMusic(offset) {
    if (!sound || playing) return;
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    ctx.resume();
    playing = march(offset || 0);
    var left = (CONFIG.duration - (offset || 0)) * 1000;
    setTimeout(function () { stopMusic(); }, left + 300);
  }
  function stopMusic() {
    if (playing) { playing.stop(); playing = null; }
  }

  /* ------------------------------------------------------------- drawing */

  var NAVY = '#10213f', BLUE = '#1f4fbf', GOLD = '#d8b86a', IVORY = '#f5f2ea', RED = '#c8102e';
  var SKIN = ['#8d5524', '#e0ac69', '#5c3a1e', '#f1c27d', '#c68642', '#ffdbac', '#a0662f', '#e8b98a', '#6b4423', '#d9a066', '#f0c8a0'];
  var SLOT = 34;

  function spark(x, y, d) {
    return '<path class="b-spark" style="animation-delay:' + d + 's" transform="translate(' + x + ' ' + y + ')" ' +
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
    return '<g class="b-note" style="animation-delay:' + d + 's" transform="translate(' + x + ' ' + y + ')">' +
      '<path d="M0 0v-6l4-1.2v6" stroke="' + GOLD + '" stroke-width="1.2" fill="none"/>' +
      '<ellipse cx="-1" cy="0" rx="1.6" ry="1.2" fill="' + GOLD + '"/><ellipse cx="3" cy="-1.2" rx="1.6" ry="1.2" fill="' + GOLD + '"/></g>';
  }
  function chair() {
    return '<g class="b-chair"><path d="M-6 0h12M-5 0v-9h10v9M-5 0l9 9M5 0l-9 9" stroke="#c9ccd3" stroke-width="1.6" ' +
      'stroke-linecap="round" fill="none"/><rect x="-6.5" y="-1.2" width="13" height="2.4" rx="1" fill="#9aa0aa"/></g>';
  }

  /** One marcher in a 34-unit slot, facing right (the way the band moves). */
  function marcher(i, kind) {
    var s = SKIN[i % SKIN.length], parts = [], top = '';
    switch (kind) {
      case 'major':
        top = jacket(NAVY) + spark(14, 27, 0) + spark(22, 33, .4) + head(s) + shako(true) + arm(24, 26, 29, 21, NAVY) +
          '<g transform="translate(29 20)"><g class="b-baton"><rect x="-12" y="-.9" width="24" height="1.8" rx=".9" fill="' + IVORY + '"/>' +
          '<circle cx="-12" cy="0" r="2" fill="' + GOLD + '"/><circle cx="12" cy="0" r="2" fill="' + GOLD + '"/></g></g>';
        break;
      case 'majorette':
        top = '<path d="M12 23h13l4 19H8z" fill="' + GOLD + '"/>' + spark(13, 30, .1) + spark(19, 26, .5) + spark(24, 35, .2) +
          spark(16, 38, .7) + spark(21, 31, .9) + head(s) + '<circle cx="18.5" cy="12.5" r="3" fill="#2b1a10"/>' +
          arm(24, 26, 28, 22, s) + '<g transform="translate(28 21)"><g class="b-baton"><rect x="-8" y="-.8" width="16" height="1.6" ' +
          'rx=".8" fill="' + IVORY + '"/><circle cx="-8" cy="0" r="1.6" fill="#fff"/><circle cx="8" cy="0" r="1.6" fill="#fff"/></g></g>';
        break;
      case 'flag':
        top = jacket(BLUE) + spark(15, 30, .3) + head(s) + shako(false) + '<path d="M27-5V44" stroke="#8a6a2b" stroke-width="1.6"/>' +
          '<g class="b-flag"><rect x="27" y="-5" width="16" height="11" fill="' + IVORY + '"/>' +
          '<path d="M27-3.4h16M27-.3h16M27 2.8h16" stroke="' + RED + '" stroke-width="1.6"/>' +
          '<rect x="27" y="-5" width="7" height="5.6" fill="' + BLUE + '"/></g>' + arm(24, 27, 27, 24, BLUE);
        break;
      case 'trumpet':
        top = jacket(BLUE) + spark(14, 33, i * .15) + head(s) + shako(false) + arm(24, 27, 24, 20, BLUE) +
          '<rect x="22" y="18.3" width="9" height="2" rx="1" fill="' + GOLD + '"/><path d="M31 19.3 36 15.8V22.8z" fill="' + GOLD + '"/>' +
          note(36, 12, i * .2);
        break;
      case 'sousa':
        top = jacket(BLUE) + head(s) + shako(false) + '<circle cx="17" cy="31" r="11" fill="none" stroke="' + GOLD + '" stroke-width="3"/>' +
          '<path d="M24 22 33 8 37 13z" fill="' + GOLD + '"/><ellipse cx="35" cy="10.5" rx="3.6" ry="2.6" fill="#a8873f"/>' +
          note(36, 5, .5);
        break;
      case 'snare':
        top = jacket(BLUE) + spark(13, 28, .6) + head(s) + shako(false) +
          '<rect x="19" y="33" width="13" height="7" rx="2" fill="' + IVORY + '" stroke="' + GOLD + '" stroke-width="1.2"/>' +
          '<path class="b-stick" d="M23 28l4 5" stroke="#6b4a1f" stroke-width="1.4" stroke-linecap="round"/>' +
          '<path class="b-stick b-stick2" d="M29 28l-2 5" stroke="#6b4a1f" stroke-width="1.4" stroke-linecap="round"/>';
        break;
      case 'bass':
        top = jacket(BLUE) + head(s) + shako(false) + '<circle cx="24" cy="32" r="10" fill="' + IVORY + '" stroke="' + BLUE + '" stroke-width="2.2"/>' +
          '<path d="M24 27.5l1.3 2.9 3.1.3-2.4 2 .8 3.1-2.8-1.7-2.8 1.7.8-3.1-2.4-2 3.1-.3z" fill="' + RED + '"/>' +
          '<g class="b-mallet"><path d="M33 25l-3 6" stroke="#6b4a1f" stroke-width="1.4"/><circle cx="29.6" cy="31.6" r="1.8" fill="' + IVORY + '"/></g>';
        break;
      case 'chair':
        top = '<rect x="11" y="23" width="15" height="19" rx="3" fill="' + GOLD + '"/>' + spark(14, 28, i * .1) + spark(22, 35, .3 + i * .1) +
          spark(18, 31, .8) + head(s) + '<rect x="13.5" y="13.5" width="10" height="2" rx="1" fill="' + RED + '"/>' +
          arm(12, 25, 14, 6, s) + arm(25, 25, 23, 6, s) + '<g transform="translate(18.5 3)">' + chair() + '</g>';
        break;
    }
    parts.push('<g transform="translate(' + (24 + i * SLOT) + ' 0)"><g class="b-bob" style="animation-delay:' + (i % 2 ? -.25 : 0) + 's">');
    parts.push(legs(kind === 'majorette' ? s : IVORY) + top + '</g></g>');
    return parts.join('');
  }

  function smoke() {
    var p = '';
    for (var k = 0; k < 6; k++) {
      p += '<circle class="b-puff" style="animation-delay:' + (k * .27).toFixed(2) + 's" cx="' + (8 + (k % 3) * 6) + '" cy="' +
        (50 - (k % 2) * 8) + '" r="5" fill="#e9ecf2"/>';
    }
    return p;
  }

  var LINEUP = ['chair', 'chair', 'bass', 'snare', 'sousa', 'trumpet', 'trumpet', 'flag', 'majorette', 'major'];
  var W = 24 + LINEUP.length * SLOT + 14;
  var svg = '<svg viewBox="0 -10 ' + W + ' 72" height="100%" preserveAspectRatio="xMinYMax meet" focusable="false">' +
    smoke() + LINEUP.map(function (k, i) { return marcher(i, k); }).join('') + '</svg>';

  var band = document.createElement('div');
  band.className = 'band';
  band.setAttribute('aria-hidden', 'true');
  band.innerHTML = '<div class="band-track">' + svg + '</div>';   // constant markup built above; no data
  header.appendChild(band);
  var track = band.firstChild;

  /* -------------------------------------------------------------- parade */

  var marched = false, startedAt = 0;

  function parade() {
    if (marched || !motion) return;
    marched = true;
    startedAt = Date.now();
    track.style.animationDuration = CONFIG.duration + 's';
    band.classList.add('is-on');
    startMusic(0);
  }
  track.addEventListener('animationend', function (e) {
    if (e.target === track) band.classList.remove('is-on');
  });

  function scheduleParade() {
    var wait = CONFIG.delayMin + Math.random() * (CONFIG.delayMax - CONFIG.delayMin);
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
    if (band.classList.contains('is-on')) startMusic((Date.now() - startedAt) / 1000);   // join the band where it is
    else if (!marched && motion) parade();                                               // send it out now
    else startMusic(0);                                                                   // the march alone
  });

  motionBtn.addEventListener('click', function () {
    motion = !motion;
    save('ps-motion', motion ? 'on' : 'off');
    apply();
    if (!motion) band.classList.remove('is-on');
  });
})();
