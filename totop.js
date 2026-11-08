/*
  ============================================================================
  projectspeaker.org
  ============================================================================
  @file       totop.js
  @desc       Shows the back-to-top arrow (#to-top) once the hero (#top) has
              scrolled out of view, and hides it again when the hero returns.
  @author     mediaBrilliance digitalxtudio
  @version    1.0.0
  @updated    2026-11-07
  @a11y       The arrow is a plain link to #top with its own aria-label in the
              page's language. While hidden it is visibility: hidden, so it is
              out of the tab order and not announced. Smooth scrolling comes
              from html { scroll-behavior } in style.css, which reduced motion
              turns off.
  ============================================================================

  WHY AN OBSERVER
  An IntersectionObserver on the hero fires only when the hero crosses the
  edge of the screen, so nothing runs while the visitor scrolls. A scroll
  listener would run on every frame to answer the same question.

  WITHOUT JAVASCRIPT
  The link ships with the hidden attribute, so a visitor without scripts
  never sees an arrow that cannot appear and disappear correctly; the header
  mark already links to the top.
*/
(function () {
  'use strict';

  var link = document.getElementById('to-top');
  var hero = document.getElementById('top');
  if (!link || !hero || !('IntersectionObserver' in window)) return;

  link.hidden = false;
  new IntersectionObserver(function (entries) {
    // On screen while any part of the hero is; .is-on fades the arrow in.
    link.classList.toggle('is-on', !entries[0].isIntersecting);
  }).observe(hero);
})();
