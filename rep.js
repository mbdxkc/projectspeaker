/*
  ============================================================================
  projectspeaker.org
  ============================================================================
  @file       rep.js
  @desc       "Call your representative" (#call on index.html): finds
              the visitor's U.S. House member from their location and turns
              the section's button into a call button for that office.
  @author     mediaBrilliance digitalxtudio
  @version    1.1.0
  @updated    2026-11-07
  @privacy    Nothing happens until the visitor taps "Find my representative".
              Their coordinates then go to one place, the U.S. Census
              Bureau's geocoder, to look up the district. This site stores
              nothing and sends nothing to analytics.
  ============================================================================

  HOW IT WORKS
  1. Tap: the browser asks for location (the browser's own prompt).
  2. The coordinates go to the Census Bureau's geocoder, which returns the
     congressional district for that point, on the lines that match the
     member list: reps.json says which Congress it describes ("congress"),
     and CONFIG.lines maps that to a geocoder vintage. Until Jan. 3, 2027 that
     is the 119th Congress lines today's members were elected on; once the
     list carries the 120th Congress, the lookup uses the 120th lines, which
     several states redrew for 2026. No date is coded here: the switch
     follows the data.
     The geocoder sends no CORS headers, so it is called as JSONP: a script
     tag whose response calls a named function on this page.
  3. The district is looked up in reps.json (same folder), built from the
     public congress-legislators list by tools/reps.py and refreshed hourly.
  4. The result replaces the button with "Call Rep. Name" (a tel: link to the
     member's Washington office), plus party, district, website and what to
     say. Republicans, delegates and vacant seats each get an accurate note.

  WHEN IT CANNOT
  Location refused, no location support, a point outside any district
  (abroad), a slow or failed lookup: each shows a plain message and the two
  fallbacks that are always on the page, the Capitol switchboard and
  house.gov's find-by-address page. Without JavaScript the button stays
  hidden and those fallbacks are all a visitor sees.
*/
(function () {
  'use strict';

  /** Sources and limits. */
  var CONFIG = {
    geocoder: 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates',
    // Congress -> the geocoder vintage and layer with that Congress's lines.
    // Checked Nov. 7, 2026: ACS2025_Current serves only the 119th layer,
    // Current_Current only the 120th. A Congress missing here falls back to
    // Current_Current and its "Nth Congressional Districts" layer.
    lines: {
      119: { vintage: 'ACS2025_Current', layer: '119th Congressional Districts' },
      120: { vintage: 'Current_Current', layer: '120th Congressional Districts' }
    },
    seats: 'reps.json',
    finder: 'https://www.house.gov/representatives/find-your-representative',
    timeout: 15000                          // ms before a lookup counts as failed
  };

  /** Census state FIPS code -> [postal code, name]. States, D.C. and the five territories. */
  var STATES = {
    '01': ['AL', 'Alabama'], '02': ['AK', 'Alaska'], '04': ['AZ', 'Arizona'], '05': ['AR', 'Arkansas'],
    '06': ['CA', 'California'], '08': ['CO', 'Colorado'], '09': ['CT', 'Connecticut'], '10': ['DE', 'Delaware'],
    '11': ['DC', 'the District of Columbia'], '12': ['FL', 'Florida'], '13': ['GA', 'Georgia'], '15': ['HI', 'Hawaii'],
    '16': ['ID', 'Idaho'], '17': ['IL', 'Illinois'], '18': ['IN', 'Indiana'], '19': ['IA', 'Iowa'],
    '20': ['KS', 'Kansas'], '21': ['KY', 'Kentucky'], '22': ['LA', 'Louisiana'], '23': ['ME', 'Maine'],
    '24': ['MD', 'Maryland'], '25': ['MA', 'Massachusetts'], '26': ['MI', 'Michigan'], '27': ['MN', 'Minnesota'],
    '28': ['MS', 'Mississippi'], '29': ['MO', 'Missouri'], '30': ['MT', 'Montana'], '31': ['NE', 'Nebraska'],
    '32': ['NV', 'Nevada'], '33': ['NH', 'New Hampshire'], '34': ['NJ', 'New Jersey'], '35': ['NM', 'New Mexico'],
    '36': ['NY', 'New York'], '37': ['NC', 'North Carolina'], '38': ['ND', 'North Dakota'], '39': ['OH', 'Ohio'],
    '40': ['OK', 'Oklahoma'], '41': ['OR', 'Oregon'], '42': ['PA', 'Pennsylvania'], '44': ['RI', 'Rhode Island'],
    '45': ['SC', 'South Carolina'], '46': ['SD', 'South Dakota'], '47': ['TN', 'Tennessee'], '48': ['TX', 'Texas'],
    '49': ['UT', 'Utah'], '50': ['VT', 'Vermont'], '51': ['VA', 'Virginia'], '53': ['WA', 'Washington'],
    '54': ['WV', 'West Virginia'], '55': ['WI', 'Wisconsin'], '56': ['WY', 'Wyoming'],
    '60': ['AS', 'American Samoa'], '66': ['GU', 'Guam'], '69': ['MP', 'the Northern Mariana Islands'],
    '72': ['PR', 'Puerto Rico'], '78': ['VI', 'the U.S. Virgin Islands']
  };
  // D.C. and the territories send delegates (Puerto Rico a resident commissioner):
  // nonvoting members, who do not vote in the House floor election for speaker.
  var DELEGATE = { DC: 'Del.', AS: 'Del.', GU: 'Del.', MP: 'Del.', VI: 'Del.', PR: 'Resident Commissioner' };

  var btn = document.getElementById('rep-find');
  var out = document.getElementById('rep-out');
  if (!btn || !out) return;
  if (!('geolocation' in navigator)) return;   // the fallbacks already on the page cover it
  btn.hidden = false;

  /* -------------------------------------------------------------- helpers */

  /** 1 -> '1st', 2 -> '2nd', 11 -> '11th', 23 -> '23rd'. */
  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /** AP possessive: "Kansas'", "Missouri's". */
  function possessive(name) {
    return /s$/.test(name) ? name + '’' : name + '’s';
  }

  /** '202-225-2865' -> '(202) 225-2865', to match the switchboard number on the page. */
  function prettyPhone(p) {
    var m = /^(\d{3})-(\d{3})-(\d{4})$/.exec(p || '');
    return m ? '(' + m[1] + ') ' + m[2] + '-' + m[3] : p;
  }

  /** Builds an element with text; never innerHTML, so no data is ever parsed as markup. */
  function el(tag, text, attrs) {
    var e = document.createElement(tag);
    if (text) e.textContent = text;
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    return e;
  }

  /** Replaces the result area's content and announces it (#rep-out is aria-live). */
  function render(nodes) {
    out.textContent = '';
    nodes.forEach(function (n) { out.appendChild(n); });
    out.hidden = false;
  }

  /** Plain failure message; the switchboard and house.gov fallbacks stay below it. */
  function fail(message) {
    btn.disabled = false;
    btn.textContent = 'Try again';
    render([el('p', message, { 'class': 'rep-msg' })]);
  }

  /**
   * Calls the Census geocoder as JSONP and resolves with its parsed result.
   * A unique callback name per request; the script tag and the global are
   * removed afterwards, and a timeout rejects a request that never answers.
   */
  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      var name = 'repCb' + Date.now() + Math.floor(Math.random() * 1e6);
      var s = document.createElement('script');
      var timer = setTimeout(function () { cleanup(); reject(new Error('timeout')); }, CONFIG.timeout);
      function cleanup() { clearTimeout(timer); delete window[name]; s.remove(); }
      window[name] = function (data) { cleanup(); resolve(data); };
      s.onerror = function () { cleanup(); reject(new Error('network')); };
      s.src = url + '&format=jsonp&callback=' + name;
      document.head.appendChild(s);
    });
  }

  /* --------------------------------------------------------------- lookup */

  /**
   * Coordinates -> { postal, state, district } from the geocoder, on the
   * lines of the given Congress (reps.json's "congress", 119 if absent).
   * BASENAME is the district number ("3"), or text containing "at Large"
   * for at-large seats, D.C. and the territories, which the seat list files
   * under district 0. Resolves null when the point is in no district.
   */
  function district(lat, lon, congress) {
    var lines = CONFIG.lines[congress] ||
      { vintage: 'Current_Current', layer: ordinal(congress) + ' Congressional Districts' };
    var url = CONFIG.geocoder + '?x=' + lon + '&y=' + lat +
      '&benchmark=Public_AR_Current&vintage=' + lines.vintage +
      '&layers=' + encodeURIComponent(lines.layer);
    return jsonp(url).then(function (data) {
      var g = data && data.result && data.result.geographies;
      var d = g && g[lines.layer] && g[lines.layer][0];
      var st = d && STATES[d.STATE];
      if (!st) return null;
      var n = parseInt(d.BASENAME, 10);
      return { postal: st[0], state: st[1], district: isNaN(n) ? 0 : n };
    });
  }

  /** Shows the member, the call button and the script. */
  function show(place, seats) {
    var key = place.postal + '-' + place.district;
    var rep = seats.seats[key];
    var where = place.district
      ? possessive(place.state) + ' ' + ordinal(place.district) + ' District'
      : (DELEGATE[place.postal] ? place.state : possessive(place.state) + ' at-large district');
    btn.hidden = true;

    if (!rep) {
      render([el('p', 'The House seat for ' + where + ' is vacant right now. The switchboard and the address lookup below still work.', { 'class': 'rep-msg' })]);
      return;
    }

    var title = DELEGATE[place.postal] || 'Rep.';
    var full = title + ' ' + rep.n;
    var party = rep.p === 'Independent' ? 'an independent' : 'a ' + rep.p;
    var nodes = [];

    nodes.push(el('p', 'Your representative', { 'class': 'rep-kicker' }));
    nodes.push(el('p', full, { 'class': 'rep-name' }));
    nodes.push(el('p', party.charAt(0).toUpperCase() + party.slice(1) + ', ' + where + '.', { 'class': 'rep-where' }));

    var call = el('a', 'Call ' + full, { 'class': 'cta', href: 'tel:+1' + (rep.ph || '').replace(/\D/g, '') });
    var row = el('p', null, { 'class': 'rep-actions' });
    row.appendChild(call);
    row.appendChild(el('span', prettyPhone(rep.ph), { 'class': 'rep-phone' }));
    nodes.push(row);

    if (rep.p === 'Democrat' && DELEGATE[place.postal]) {
      nodes.push(el('p', 'As a nonvoting member, ' + full + ' does not vote in the House floor election for speaker.', { 'class': 'rep-msg' }));
    } else if (rep.p !== 'Democrat') {
      nodes.push(el('p', 'Only Democrats vote in the Democratic caucus. Every member votes for speaker on the House floor when the new Congress convenes, so the call still counts.', { 'class': 'rep-msg' }));
    }

    var script = el('p', null, { 'class': 'rep-script' });
    script.appendChild(el('strong', 'What to say: '));
    script.appendChild(document.createTextNode('“I’m a constituent. I’m asking ' + full +
      ' to support a contested election for speaker and to back a candidate other than Hakeem Jeffries.”'));
    nodes.push(script);

    var more = el('p', null, { 'class': 'src' });
    if (rep.u) {
      more.appendChild(el('a', 'Office website', { href: rep.u, target: '_blank', rel: 'noopener' }));
      more.appendChild(document.createTextNode('. '));
    }
    more.appendChild(document.createTextNode('District from the U.S. Census Bureau; member list from congress-legislators' +
      (seats.updated ? ', updated ' + seats.updated : '') + '. Not right? '));
    more.appendChild(el('a', 'Look up by address', { href: CONFIG.finder }));
    more.appendChild(document.createTextNode('.'));
    nodes.push(more);

    render(nodes);
    call.focus();
  }

  /* ---------------------------------------------------------------- click */

  btn.addEventListener('click', function () {
    btn.disabled = true;
    btn.textContent = 'Finding your representative…';
    var seatsReq = fetch(CONFIG.seats).then(function (r) {
      if (!r.ok) throw new Error('seats ' + r.status);
      return r.json();
    });
    navigator.geolocation.getCurrentPosition(function (pos) {
      // The seat list says which Congress it describes, so it arrives before
      // the district lookup, which needs those lines.
      seatsReq.then(function (seats) {
        return district(pos.coords.latitude, pos.coords.longitude, seats.congress || 119).then(function (place) {
          if (!place) { fail('That location isn’t in a U.S. congressional district. Use the switchboard or the address lookup below.'); return; }
          show(place, seats);
        });
      }).catch(function () {
        fail('The lookup didn’t go through. Use the switchboard or the address lookup below.');
      });
    }, function (err) {
      fail(err && err.code === 1
        ? 'Location is off for this site. Use the switchboard or the address lookup below.'
        : 'Your location couldn’t be found. Use the switchboard or the address lookup below.');
    }, { enableHighAccuracy: false, timeout: CONFIG.timeout, maximumAge: 600000 });
  });
})();
