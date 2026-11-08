/*
  ============================================================================
  projectspeaker.org
  ============================================================================
  @file       rotor.js
  @desc       Rotates the hero of index.html: the headline (#rotor),
              its caption (#rotor-cap) and the "From the record" link
              (#rotor-ref) change together, so a headline is never on screen
              with another headline's caption or source.
  @author     mediaBrilliance digitalxtudio
  @version    1.1.0
  @updated    2026-11-07
  @a11y       Pause button (WCAG 2.2.2), hover and focus hold the current line,
              reduced motion never rotates, screen readers always read line 1
  ============================================================================

  HOW THE MARKUP PAIRS UP
  Headline N and caption N are the Nth .rotor-line in #rotor and #rotor-cap.
  Each headline's data-ref names the record item it comes from: N links to
  #item-N in "Hakeem Jeffries' record"; 0 links to #act, the petition section.
  Only line 1 ("Earmarked.") is exposed to screen readers. The other lines
  carry aria-hidden, so the page never announces a sentence that changes
  under the listener.

  ORDER
  "Earmarked." opens every cycle, and holds 10 seconds on first load. The other nine follow in a fresh random
  order, each shown once, then the cycle starts again with "Earmarked.".

  WHEN IT STOPS
  It holds while the pointer is over the headline or caption, while the
  record link has keyboard focus, while the tab is in the background and
  while the Pause button is pressed. Under prefers-reduced-motion it never
  starts, and the page keeps "Earmarked.".

  LANGUAGE
  The words the script writes come from data attributes in the markup, so the
  Spanish page (es/index.html) runs this same file: data-item and data-ask on
  #rotor-ref, data-pause and data-play on the Pause button. English is the
  fallback when an attribute is missing.

  WITHOUT JAVASCRIPT
  The markup already shows line 1 (class is-on), and the Pause button ships
  with the hidden attribute, so a visitor without scripts sees a complete,
  still hero with no control that does nothing.
*/
(function () {
  'use strict';

  /** Timing and sizing. fade must equal the .5s transition on .rotor-line in style.css. */
  var CONFIG = {
    interval: 6000,   // ms each headline stays up
    firstHold: 10000, // ms "Earmarked." holds on first load, before any motion
    fade: 500,        // ms to fade out before the next line fades in
    maxScale: 2.5,    // the most fit() will enlarge a line over the stylesheet size
    fitSteps: 12      // binary-search passes per line; 12 halvings is sub-pixel
  };

  var head = document.getElementById('rotor');
  var cap = document.getElementById('rotor-cap');
  var ref = document.getElementById('rotor-ref');
  var btn = document.getElementById('rotor-pause');
  if (!head || !cap || !ref || !btn) return;

  // Words this script writes, from the markup (see LANGUAGE above).
  var WORDS = {
    item: ref.getAttribute('data-item') || 'From the record: item ',
    ask: ref.getAttribute('data-ask') || 'The ask: sign the petition',
    pause: btn.getAttribute('data-pause') || 'Pause headlines',
    play: btn.getAttribute('data-play') || 'Play headlines'
  };

  var heads = head.querySelectorAll('.rotor-line');
  var caps = cap.querySelectorAll('.rotor-line');
  // A headline without its caption, or the reverse, would pair the wrong
  // fact with the wrong words. Refuse to rotate rather than risk it.
  if (heads.length < 2 || heads.length !== caps.length) return;

  /* --------------------------------------------------------------- sizing */

  /**
   * True when a headline fits the box: no taller than the tallest line and
   * no wider than the headline column.
   *
   * Width is checked against the column (#rotor), not the line itself. A grid
   * item grows with its own text, so a line's own width can never say it is
   * too wide; that is how an oversized "Earmarked." once pushed a 390px phone
   * screen to 446px.
   *
   * @param {HTMLElement} el  one .rotor-line
   * @param {number} h        the box height in px
   * @returns {boolean}
   */
  function fits(el, h) {
    return el.offsetHeight <= h + 1 && el.scrollWidth <= head.clientWidth + 1;
  }

  /**
   * Sizes every headline to fill the same box.
   *
   * 1. Clear any earlier sizing, so every line starts at the stylesheet size.
   * 2. The box is the height of the tallest line at that size (all lines share
   *    one grid cell, so the cell is already that tall).
   * 3. For each line, binary-search the largest font size that still fits.
   *    Two-line headlines already fill the box and stay put; one-line
   *    headlines such as "Earmarked." grow until they fill it or hit the
   *    column edge.
   *
   * Runs once the web font has loaded, since a fallback font measures
   * differently, and again on every resize.
   */
  function fit() {
    var i;
    for (i = 0; i < heads.length; i++) heads[i].style.fontSize = '';
    var base = parseFloat(getComputedStyle(head).fontSize);
    var box = 0;
    for (i = 0; i < heads.length; i++) box = Math.max(box, heads[i].offsetHeight);
    for (i = 0; i < heads.length; i++) {
      var el = heads[i];
      var lo = base;                      // known to fit
      var hi = base * CONFIG.maxScale;    // assumed not to
      for (var step = 0; step < CONFIG.fitSteps; step++) {
        var mid = (lo + hi) / 2;
        el.style.fontSize = mid + 'px';
        if (fits(el, box)) lo = mid; else hi = mid;
      }
      el.style.fontSize = lo + 'px';
    }
  }

  // Refit at most once per frame while the window is being resized.
  var resizePending = false;
  window.addEventListener('resize', function () {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(function () { resizePending = false; fit(); });
  });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit);

  // Sizing applies to everyone; rotation stops here for reduced motion.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ------------------------------------------------------------- rotation */

  var cur = 0;          // index of the line on screen
  var bag = [];         // lines still to show this cycle, popped from the end
  var paused = false;   // set by the Pause button, stays until pressed again
  var held = false;     // set by hover or focus, clears when they end

  /**
   * Swaps to line i: fades the current headline, caption and link out,
   * waits for the fade to finish, then fades line i in. Waiting for a full
   * fade-out means two headlines never overlap on screen.
   *
   * @param {number} i  index of the next line
   */
  function show(i) {
    var was = cur;
    cur = i;
    heads[was].classList.remove('is-on');
    caps[was].classList.remove('is-on');
    ref.classList.add('is-out');
    setTimeout(function () {
      heads[i].classList.add('is-on');
      caps[i].classList.add('is-on');
      var n = Number(heads[i].getAttribute('data-ref'));
      ref.href = n ? '#item-' + n : '#act';
      // Two digits, to match the record's 01, 02 ... counter labels.
      ref.textContent = n ? WORDS.item + (n < 10 ? '0' + n : n) : WORDS.ask;
      ref.classList.remove('is-out');
    }, CONFIG.fade);
  }

  /** Fills the bag with lines 1 to 9 in random order (Fisher-Yates shuffle). */
  function refill() {
    for (var k = 1; k < heads.length; k++) bag.push(k);
    for (var j = bag.length - 1; j > 0; j--) {
      var r = Math.floor(Math.random() * (j + 1));
      var tmp = bag[j]; bag[j] = bag[r]; bag[r] = tmp;
    }
  }
  refill();

  // Each tick shows the next line from the bag. When the bag is empty the
  // cycle is over: "Earmarked." (line 0) comes back and the bag refills.
  function tick() {
    if (paused || held || document.hidden) return;
    if (bag.length) { show(bag.pop()); return; }
    show(0);
    refill();
  }
  // The opening headline holds longer than the rest, so a first-time visitor
  // reads it and the page has settled before anything moves.
  setTimeout(function () {
    tick();
    setInterval(tick, CONFIG.interval);
  }, CONFIG.firstHold);

  // Hold while someone is reading or about to follow the link.
  function hold() { held = true; }
  function release() { held = false; }
  [head, cap].forEach(function (el) {
    el.addEventListener('mouseenter', hold);
    el.addEventListener('mouseleave', release);
  });
  ref.addEventListener('focus', hold);
  ref.addEventListener('blur', release);

  // The button only appears once there is something for it to pause.
  btn.hidden = false;
  btn.addEventListener('click', function () {
    paused = !paused;
    btn.setAttribute('aria-pressed', String(paused));
    btn.textContent = paused ? WORDS.play : WORDS.pause;
  });
})();
