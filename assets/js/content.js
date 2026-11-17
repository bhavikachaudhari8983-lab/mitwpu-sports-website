/* Sports Sphere — live content.
   Reads events / stats / sponsors / news / results / settings from a Google Sheet
   (if set in config.js) or from the /content CSV files, then renders:
   season calendar + archive, "next up", spotlight countdown, announcement bar,
   results, news, stats, sponsors, event dates inside the page, and the email fallback for forms. */
(function () {
  'use strict';
  var CFG = window.SS_CONFIG || {};
  var COLORS = { yellow: '#F6C343', orange: '#F08A2E', red: '#D83B3B', blue: '#2F80C9', green: '#6DB33F', navy: '#151C4F' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  /* Preview the site on another date: add ?preview-date=2027-07-01 to the URL */
  var pv = (location.search.match(/[?&]preview-date=(\d{4}-\d{2}-\d{2})/) || [])[1];
  if (pv) { var pp = pv.split('-'); TODAY = new Date(+pp[0], +pp[1] - 1, +pp[2]); }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { u = String(u || '').trim(); return /^(https?:\/\/|mailto:|tel:|[a-z0-9_\-\/]+\.html|#|assets\/)/i.test(u) ? u : ''; }
  function colour(c) { c = String(c || '').trim().toLowerCase(); return COLORS[c] || (/^#[0-9a-f]{3,8}$/i.test(c) ? c : COLORS.orange); }
  function yes(v) { return /^(y|yes|true|1)$/i.test(String(v || '').trim()); }
  function isExternal(u) { return /^https?:\/\//i.test(u); }

  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false, i, c;
    text = String(text || '').replace(/^﻿/, '');
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim().toLowerCase().replace(/\s+/g, '_'); });
    return rows.slice(1).filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); }).map(function (r) {
      var o = {}; head.forEach(function (h, j) { o[h] = (r[j] || '').trim(); }); return o;
    });
  }

  function parseDate(s) {
    s = String(s || '').trim(); var m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))) return new Date(+m[3], +m[2] - 1, +m[1]); // DD/MM/YYYY (India)
    var d = new Date(s); return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function range(e) {
    var a = e.start, b = e.end;
    if (a.getTime() === b.getTime()) return { day: String(a.getDate()), month: MONTHS[a.getMonth()] + ' ' + a.getFullYear(), long: a.getDate() + ' ' + MONTHS_LONG[a.getMonth()] + ' ' + a.getFullYear() };
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
      return { day: a.getDate() + '–' + b.getDate(), month: MONTHS[a.getMonth()] + ' ' + a.getFullYear(), long: a.getDate() + '–' + b.getDate() + ' ' + MONTHS_LONG[a.getMonth()] + ' ' + a.getFullYear() };
    return { day: a.getDate() + ' ' + MONTHS[a.getMonth()] + '–' + b.getDate() + ' ' + MONTHS[b.getMonth()], month: String(b.getFullYear()),
             long: a.getDate() + ' ' + MONTHS_LONG[a.getMonth()] + ' – ' + b.getDate() + ' ' + MONTHS_LONG[b.getMonth()] + ' ' + b.getFullYear() };
  }
  function status(e) { return TODAY < e.start ? 'upcoming' : (TODAY > e.end ? 'past' : 'live'); }

  /* ---------- loading ---------- */
  function fetchText(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }); }
  function load(tab) {
    var local = function () { return fetchText('content/' + tab + '.csv').then(parseCSV).catch(function () { return []; }); };
    if (!CFG.sheetId) return local();
    var url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(CFG.sheetId) + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(tab);
    return fetchText(url).then(function (t) {
      if (/^\s*</.test(t)) throw new Error('not csv'); // sheet not shared publicly
      return parseCSV(t);
    }).catch(local);
  }

  /* ---------- renderers ---------- */
  function eventRow(e, isNext) {
    var st = status(e), r = range(e), cls = 'event-row' + (st === 'past' ? ' is-past' : '') + (st === 'live' ? ' is-live' : '') + (isNext ? ' is-next' : '');
    var label = st === 'past' ? 'Completed' : st === 'live' ? 'Happening now' : isNext ? 'Next up' : 'Upcoming';
    var action = '';
    if (st !== 'past') {
      if (e.register) action = '<a class="btn btn-dark btn-sm" href="' + esc(e.register) + '"' + (isExternal(e.register) ? ' target="_blank" rel="noopener"' : '') + '>Register</a>';
      else if (e.details) action = '<a class="btn btn-dark btn-sm" href="' + esc(e.details) + '">Details</a>';
      else action = '<span class="soon">Registration opens soon</span>';
    } else if (e.details) action = '<a class="link-arrow" href="' + esc(e.details) + '">Details ' + ARROW + '</a>';
    return '<article class="' + cls + '" style="--c:' + e.colour + '"><div class="event-date"><strong>' + esc(r.day) + '</strong><span>' + esc(r.month) + '</span></div>' +
      '<div class="event-info"><h3>' + esc(e.title) + '</h3><p>' + esc(e.description) + '</p></div>' +
      (e.category ? '<span class="pill">' + esc(e.category) + '</span>' : '<span></span>') + '<span class="status">' + label + '</span>' + action + '</article>';
  }

  function renderCalendar(events) {
    var box = document.querySelector('[data-render="calendar"]'); if (!box) return;
    var seasons = []; events.forEach(function (e) { if (seasons.indexOf(e.season) < 0) seasons.push(e.season); });
    var current = currentSeason(events);
    var tabs = document.querySelector('[data-render="season-tabs"]');
    function draw(season) {
      var list = events.filter(function (e) { return e.season === season; });
      var next = list.filter(function (e) { return status(e) !== 'past'; })[0];
      box.innerHTML = list.length ? list.map(function (e) { return eventRow(e, e === next && status(e) === 'upcoming'); }).join('') :
        '<p class="empty">The calendar for this season is coming soon.</p>';
      var label = document.querySelector('[data-render="season-label"]'); if (label) label.textContent = 'Season ' + season.replace('-', '–');
    }
    if (tabs) {
      tabs.innerHTML = seasons.length > 1 ? seasons.slice().reverse().map(function (s) {
        return '<button class="filter-btn" data-season="' + esc(s) + '" aria-pressed="' + (s === current) + '">' + esc(s.replace('-', '–')) + (s === current ? ' · Current' : '') + '</button>';
      }).join('') : '';
      tabs.onclick = function (ev) {
        var b = ev.target.closest('[data-season]'); if (!b) return;
        tabs.querySelectorAll('[data-season]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        draw(b.getAttribute('data-season'));
      };
    }
    draw(current);
  }

  function currentSeason(events) {
    var up = events.filter(function (e) { return status(e) !== 'past'; })[0];
    return up ? up.season : (events.length ? events[events.length - 1].season : '');
  }

  function renderNext(events) {
    document.querySelectorAll('[data-render="next"]').forEach(function (box) {
      var limit = +box.getAttribute('data-limit') || 4;
      var up = events.filter(function (e) { return status(e) !== 'past'; }).slice(0, limit);
      var firstUpcoming = up.filter(function (e) { return status(e) === 'upcoming'; })[0];
      box.innerHTML = up.length ? up.map(function (e) { return eventRow(e, e === firstUpcoming); }).join('') :
        '<p class="empty">This season is a wrap. The next season\'s calendar is coming soon. Follow us on Instagram for the first announcement.</p>';
    });
  }

  function pickSpotlight(events) {
    var live = events.filter(function (e) { return status(e) === 'live'; });
    var flag = live.filter(function (e) { return e.flagship; })[0] || live[0];
    if (flag) return flag;
    var up = events.filter(function (e) { return status(e) === 'upcoming'; });
    var days = function (e) { return (e.start - TODAY) / 864e5; };
    return up.filter(function (e) { return e.flagship && days(e) <= 75; })[0] || up.filter(function (e) { return days(e) <= 30; })[0] || null;
  }

  var timer = null;
  function renderSpotlight(events) {
    var box = document.querySelector('[data-render="spotlight"]'); if (!box) return;
    var wrap = box.closest('[data-spotlight-wrap]') || box;
    var e = pickSpotlight(events);
    if (!e) { wrap.hidden = true; return; }
    var st = status(e), r = range(e);
    var btns = '';
    if (e.register) btns += '<a class="btn btn-primary" href="' + esc(e.register) + '"' + (isExternal(e.register) ? ' target="_blank" rel="noopener"' : '') + '>Register now ' + ARROW + '</a>';
    if (e.details) btns += '<a class="btn btn-ghost" href="' + esc(e.details) + '">Event details</a>';
    if (!btns) btns = '<a class="btn btn-ghost" href="events.html#calendar">Full calendar</a>';
    box.innerHTML = '<article class="spotlight on-dark" style="--c:' + e.colour + '">' +
      (e.image ? '<div class="spot-img"><img src="' + esc(e.image) + '" alt="" loading="lazy"></div>' : '<div class="spot-img"><img src="assets/img/logo/sports-sphere-logo.webp" alt="" loading="lazy"></div>') +
      '<div class="spot-body"><span class="spot-label">' + (st === 'live' ? '<i class="live-dot"></i>Happening now' : 'Next up · ' + esc(e.category || 'Event')) + '</span>' +
      '<h2 class="h2">' + esc(e.title) + '</h2><p class="spot-date">' + esc(r.long) + '</p><p class="spot-desc">' + esc(e.description) + '</p>' +
      '<div class="hero-actions">' + btns + '</div></div>' +
      (st === 'live' ? '' : '<div class="countdown" aria-label="Countdown"><div><b data-cd="d">0</b><span>Days</span></div><div><b data-cd="h">0</b><span>Hours</span></div><div><b data-cd="m">0</b><span>Mins</span></div></div>') +
      '</article>';
    wrap.hidden = false;
    if (st !== 'live') {
      var tick = function () {
        var now = new Date(); if (pv) { var real = new Date(); real.setHours(0, 0, 0, 0); now = new Date(now.getTime() + (TODAY - real)); }
        var diff = Math.max(0, e.start - now), s = Math.floor(diff / 1000);
        var set = function (k, v) { var el = box.querySelector('[data-cd="' + k + '"]'); if (el) el.textContent = v; };
        set('d', Math.floor(s / 86400)); set('h', Math.floor(s % 86400 / 3600)); set('m', Math.floor(s % 3600 / 60));
      };
      tick(); clearInterval(timer); timer = setInterval(tick, 30000);
    }
  }

  function renderAnnouncement(events, settings) {
    var bar = document.querySelector('[data-render="announcement"]'); if (!bar) return;
    var text = settings.announcement_text, link = safeUrl(settings.announcement_link);
    if (!text) {
      var e = events.filter(function (x) { return status(x) !== 'past'; })[0];
      if (!e) return;
      text = (status(e) === 'live' ? 'Happening now: ' : 'Next up: ') + e.title + ' · ' + range(e).long;
      link = link || e.register || e.details || 'events.html#calendar';
    }
    bar.innerHTML = '<div class="container"><span class="announce-dot"></span>' +
      (link ? '<a href="' + esc(link) + '"' + (isExternal(link) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(text) + ' ' + ARROW + '</a>' : '<span>' + esc(text) + '</span>') + '</div>';
    bar.hidden = false;
    document.documentElement.classList.add('has-announce');
  }

  function renderDates(events) {
    document.querySelectorAll('[data-date-of]').forEach(function (el) {
      var key = el.getAttribute('data-date-of').toLowerCase();
      var list = events.filter(function (e) { return e.title.toLowerCase().indexOf(key) > -1; });
      var e = list.filter(function (x) { return status(x) !== 'past'; })[0] || list[list.length - 1];
      if (!e) return;
      var fmt = el.getAttribute('data-format');
      el.textContent = fmt === 'year' ? String(e.start.getFullYear()) : fmt === 'short' ? (range(e).day + ' ' + range(e).month) : range(e).long;
    });
  }

  function renderStats(rows) {
    if (!rows.length) return;
    document.querySelectorAll('[data-render="stats"]').forEach(function (box) {
      box.innerHTML = rows.map(function (s) {
        return '<div class="stat" style="--c:' + colour(s.colour) + '"><strong>' + esc(s.value) + (s.suffix ? '<sup>' + esc(s.suffix) + '</sup>' : '') + '</strong><span>' + esc(s.label) + '</span></div>';
      }).join('');
    });
  }

  function renderSponsors(rows) {
    if (!rows.length) return;
    document.querySelectorAll('[data-render="sponsors"]').forEach(function (box) {
      box.innerHTML = rows.map(function (s) {
        var inner = s.logo ? '<img src="' + esc(safeUrl(s.logo)) + '" alt="' + esc(s.name) + '" loading="lazy">' : '<b>' + esc(s.name) + '</b><span>' + esc(s.tagline) + '</span>';
        var url = safeUrl(s.link);
        return url ? '<a class="sponsor" href="' + esc(url) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<div class="sponsor">' + inner + '</div>';
      }).join('');
    });
  }

  function renderNews(rows) {
    var items = rows.map(function (n) { n._d = parseDate(n.date); return n; }).filter(function (n) { return n.title; })
      .sort(function (a, b) { return (b._d || 0) - (a._d || 0); });
    document.querySelectorAll('[data-render="news"]').forEach(function (box) {
      var limit = +box.getAttribute('data-limit') || 3, wrap = box.closest('[data-news-wrap]');
      if (items.length < (+box.getAttribute('data-min') || 1)) { if (wrap) wrap.hidden = true; return; }
      box.innerHTML = items.slice(0, limit).map(function (n) {
        var url = safeUrl(n.link), d = n._d ? n._d.getDate() + ' ' + MONTHS[n._d.getMonth()] + ' ' + n._d.getFullYear() : '';
        var img = n.image ? '<div class="media"><img src="' + esc(safeUrl(n.image)) + '" alt="" loading="lazy"></div>' : '<div class="media news-ph"><span>' + esc(n.tag || 'News') + '</span></div>';
        var body = img + '<div class="news-meta">' + (n.tag ? '<span class="pill">' + esc(n.tag) + '</span>' : '') + '<span>' + esc(d) + '</span></div><h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + '</p>';
        return url ? '<a class="news-card" href="' + esc(url) + '"' + (isExternal(url) ? ' target="_blank" rel="noopener"' : '') + '>' + body + '</a>' : '<article class="news-card">' + body + '</article>';
      }).join('');
      if (wrap) wrap.hidden = false;
    });
  }

  function renderResults(rows, events) {
    var box = document.querySelector('[data-render="results"]'); if (!box) return;
    var wrap = box.closest('[data-results-wrap]');
    if (!rows.length) {
      box.innerHTML = '<p class="empty">Winners are posted here after every event. Follow us on Instagram for live scores and match-day updates.</p>';
      return;
    }
    var groups = {}, order = [];
    rows.forEach(function (r) { var k = (r.season || '') + '|' + r.event; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(r); });
    order.reverse();
    box.innerHTML = order.map(function (k) {
      var parts = k.split('|'), list = groups[k];
      return '<article class="result-card"><header><span>' + esc((parts[0] || '').replace('-', '–')) + '</span><h3>' + esc(parts[1]) + '</h3></header><ul>' +
        list.map(function (r) {
          return '<li><b>' + esc(r.sport || 'Overall') + '</b><span class="gold">' + esc(r.winner) + '</span>' + (r.runner_up ? '<span class="silver">' + esc(r.runner_up) + '</span>' : '') + (r.notes ? '<em>' + esc(r.notes) + '</em>' : '') + '</li>';
        }).join('') + '</ul></article>';
    }).join('');
    if (wrap) wrap.hidden = false;
  }

  /* ---------- registration portal ---------- */
  // settings.registration_portal = the portal's web address, e.g. https://register.sportssphere.mitwpu.edu.in
  function portalBase(u) {
    u = String(u || '').trim().replace(/\/+$/, '');
    return /^https:\/\/[^\s/]+/i.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(u) ? u : '';
  }
  // An event's register_link: the word "portal" → the portal's registration page; otherwise any link (e.g. a Google Form).
  function registerLink(v, portal) {
    if (String(v || '').trim().toLowerCase() === 'portal') return portal ? portal + '/register' : '';
    return safeUrl(v);
  }
  // General "Register" buttons (header, footer, banners) and "Check status" links go to the portal once it's set.
  function applyPortal(portal) {
    if (!portal) return;
    document.querySelectorAll('[data-register]').forEach(function (a) { a.setAttribute('href', portal + '/register'); });
    document.querySelectorAll('[data-portal-status]').forEach(function (a) { a.setAttribute('href', portal + '/status'); a.hidden = false; a.closest('li') && (a.closest('li').hidden = false); });
  }

  function applySettings(settings) {
    if (settings.contact_email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(settings.contact_email)) {
      document.querySelectorAll('form[data-validate]').forEach(function (f) { f.setAttribute('data-mailto', settings.contact_email); });
      document.querySelectorAll('[data-render="email"]').forEach(function (el) {
        el.innerHTML = '<a href="mailto:' + esc(settings.contact_email) + '">' + esc(settings.contact_email) + '</a>';
      });
    }
  }

  /* ---------- go ---------- */
  Promise.all(['events', 'stats', 'sponsors', 'news', 'results', 'settings'].map(load)).then(function (d) {
    var settings = {}; d[5].forEach(function (r) { if (r.key) settings[r.key.trim()] = r.value; });
    var portal = portalBase(settings.registration_portal);
    var events = d[0].map(function (r) {
      var s = parseDate(r.start); if (!s || !r.title) return null;
      return { season: r.season || String(s.getFullYear()), title: r.title, start: s, end: parseDate(r.end) || s, category: r.category, description: r.description,
               flagship: yes(r.flagship), colour: colour(r.colour), register: registerLink(r.register_link, portal), details: safeUrl(r.details_link), image: safeUrl(r.image) };
    }).filter(Boolean).sort(function (a, b) { return a.start - b.start; });

    var cur = currentSeason(events);
    if (cur) document.querySelectorAll('[data-season-text]').forEach(function (el) { el.textContent = cur.replace('-', '–'); });
    renderAnnouncement(events, settings);
    renderSpotlight(events);
    renderNext(events);
    renderCalendar(events);
    renderDates(events);
    renderResults(d[4], events);
    renderNews(d[3]);
    if (CFG.sheetId) { renderStats(d[1]); renderSponsors(d[2]); } // otherwise the page already shows the same local data
    applySettings(settings);
    applyPortal(portal);
    document.documentElement.classList.add('content-ready');
  });
})();
