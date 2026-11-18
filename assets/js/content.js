/* Sports Sphere — live content.
   Reads the content tables (events, stats, sponsors, news, results, settings, sports, people, achievements,
   facilities, teams, gallery) from a Google Sheet (if set in config.js) or from the /content CSV files, then renders:
   season calendar + archive, "next up", spotlight countdown, announcement bar, results, news, stats, sponsors,
   event and sport detail pages, achievements, people, teams, facilities, gallery and site search.
   Every table can have a "status" column: draft (hidden everywhere), archived (kept on archive/listing pages,
   hidden from the home page and teasers) or empty/published.
   Only the tables a page actually uses are loaded. JS-rendered markup never uses .reveal (it would stay invisible). */
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
  function blank(u) { return isExternal(u) ? ' target="_blank" rel="noopener"' : ''; }
  function slugify(v) { return String(v || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function param(k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } }
  function fmtDate(d) { return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : ''; }
  function list(v) { return String(v || '').split(/\s*[;|\n]\s*/).filter(Boolean); }
  function words(v) { return String(v || '').toLowerCase().split(/\s+/).filter(Boolean); }
  /* Google Drive share links → a direct image; anything else must be a safe URL */
  function imgUrl(u) {
    u = safeUrl(u); var m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
    return m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1600' : u;
  }
  function youtubeId(u) { var m = String(u || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/); return m ? m[1] : ''; }
  /* status column: draft rows never show; archived rows only on listing/archive pages */
  function stateOf(r) { var v = String(r.status || '').trim().toLowerCase(); return /^(draft|hidden|unpublished)$/.test(v) ? 'draft' : /^archived?$/.test(v) ? 'archived' : 'published'; }
  function listed(rows) { return rows.filter(function (r) { return stateOf(r) !== 'draft'; }); }
  function fresh(rows) { return rows.filter(function (r) { return stateOf(r) === 'published'; }); }
  var ICONS = {}; try { ICONS = JSON.parse((document.getElementById('ss-icons') || {}).textContent || '{}'); } catch (e) { ICONS = {}; }
  function icon(k) { return ICONS[k] || ICONS.trophy || ''; }
  function initials(n) { return String(n || '').replace(/^(prof|dr|mr|mrs|ms|shri|smt)\.?\s+/gi, '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function emptyMsg(t) { return '<p class="empty">' + t + '</p>'; }
  /* A clearly labelled gap the Sports Office still has to fill — never shown as if it were real content */
  function pendingNote(t) { return '<div class="pending-note"><span class="pn-icon" aria-hidden="true"></span><div><b>Awaiting confirmation</b><p>' + t + '</p></div></div>'; }
  function hideWrap(box, hide) { var w = box.closest('[data-hide-empty]'); if (w) w.hidden = hide; }
  function sameSport(v, sp) { var k = slugify(v); return !!k && (k === sp.slug || k === slugify(sp.name)); }

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
      else action = '<a class="btn btn-ghost btn-sm" href="event.html?e=' + esc(e.slug) + '">Details</a>';
    } else action = '<a class="link-arrow" href="event.html?e=' + esc(e.slug) + '">' + (e.hasResults ? 'Results' : 'Details') + ' ' + ARROW + '</a>';
    return '<article class="' + cls + '" style="--c:' + e.colour + '"><div class="event-date"><strong>' + esc(r.day) + '</strong><span>' + esc(r.month) + '</span></div>' +
      '<div class="event-info"><h3><a href="event.html?e=' + esc(e.slug) + '">' + esc(e.title) + '</a></h3><p>' + esc(e.description) + '</p></div>' +
      (e.category ? '<span class="pill">' + esc(e.category) + '</span>' : '<span></span>') + '<span class="status">' + label + '</span>' + action + '</article>';
  }

  function renderCalendar(events) {
    var box = document.querySelector('[data-render="calendar"]'); if (!box) return;
    var seasons = []; events.forEach(function (e) { if (seasons.indexOf(e.season) < 0) seasons.push(e.season); });
    var current = currentSeason(events);
    var tabs = document.querySelector('[data-render="season-tabs"]');
    var stTabs = document.querySelector('[data-render="status-tabs"]'), want = param('show') || 'all', shown = current;
    var LABEL = { all: 'All', upcoming: 'Upcoming', live: 'Happening now', past: 'Completed' };
    function draw(season) {
      shown = season;
      var all = events.filter(function (e) { return e.season === season; });
      var next = all.filter(function (e) { return status(e) !== 'past'; })[0];
      var list = all.filter(function (e) { return want === 'all' || status(e) === want; });
      if (stTabs) {
        stTabs.innerHTML = ['all', 'upcoming', 'live', 'past'].map(function (k) {
          var n = k === 'all' ? all.length : all.filter(function (e) { return status(e) === k; }).length;
          return '<button class="filter-btn" data-status="' + k + '" aria-pressed="' + (k === want) + '">' + LABEL[k] + ' <span class="count">' + n + '</span></button>';
        }).join('');
      }
      box.innerHTML = list.length ? list.map(function (e) { return eventRow(e, e === next && status(e) === 'upcoming'); }).join('') :
        '<p class="empty">' + (all.length ? 'No ' + LABEL[want].toLowerCase() + ' events in this season.' : 'The calendar for this season is coming soon.') + '</p>';
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
    if (stTabs) stTabs.onclick = function (ev) { var b = ev.target.closest('[data-status]'); if (!b) return; want = b.getAttribute('data-status'); draw(shown); };
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

  function renderAnnouncement(events, settings, news) {
    var bar = document.querySelector('[data-render="announcement"]'); if (!bar) return;
    var text = settings.announcement_text, link = safeUrl(settings.announcement_link);
    var urgent = activeNotices(prepNews(fresh(news || []))).filter(function (n) { return n.pin || (n._dl && daysTo(n._dl) <= 14); })[0];
    if (!text && urgent) { text = 'Notice: ' + urgent.title + (urgent._dl ? ' · ' + deadlineLabel(urgent) : ''); link = urgent.href; }
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

  /* ---------- news: notices (short, dated, deadlines) and stories (each with its own page) ---------- */
  var TYPE_COLOURS = { 'selection trials': 'orange', trials: 'orange', notice: 'blue', circular: 'blue', 'schedule change': 'red', results: 'green', result: 'green',
    achievement: 'yellow', 'event update': 'orange', venue: 'blue', media: 'red', press: 'red' };
  function typeColour(t) {
    var k = String(t || '').trim().toLowerCase(); if (TYPE_COLOURS[k]) return colour(TYPE_COLOURS[k]);
    var h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 5;
    return colour(['orange', 'blue', 'green', 'red', 'yellow'][h]);
  }
  function daysTo(d) { return Math.round((d - TODAY) / 864e5); }
  function prepNews(rows) {
    return rows.filter(function (n) { return n.title; }).map(function (n) {
      n._d = parseDate(n.date); n._dl = parseDate(n.deadline);
      n.kind = /^notice$/i.test(String(n.kind || '').trim()) ? 'notice' : 'story';
      n.type = n.tag || (n.kind === 'notice' ? 'Notice' : 'News');
      n.pin = yes(n.pinned);
      n.slug = slugify(n.slug || (n.title + ' ' + String(n.date || '').trim()));
      n.href = 'article.html?n=' + n.slug;
      n.isNew = !!n._d && daysTo(n._d) <= 0 && daysTo(n._d) >= -7;
      n.closed = !!n._dl && daysTo(n._dl) < 0;
      return n;
    }).sort(function (a, b) { return (b._d || 0) - (a._d || 0); });
  }
  function deadlineLabel(n) {
    if (!n._dl) return '';
    var d = daysTo(n._dl);
    return d < 0 ? 'Closed ' + fmtDate(n._dl) : d === 0 ? 'Closes today' : d === 1 ? 'Closes tomorrow' : d <= 14 ? 'Closes in ' + d + ' days' : 'Closes ' + fmtDate(n._dl);
  }
  function typeChip(n) { return '<span class="type-chip" style="--c:' + typeColour(n.type) + '">' + esc(n.type) + '</span>'; }
  function badges(n) {
    return (n.pin && !n.closed ? '<span class="badge pin">Pinned</span>' : '') + (n.isNew ? '<span class="badge new">New</span>' : '') +
      (n._dl ? '<span class="badge deadline' + (n.closed ? ' closed' : daysTo(n._dl) <= 3 ? ' urgent' : '') + '">' + esc(deadlineLabel(n)) + '</span>' : '');
  }
  function newsCard(n, featured) {
    var img = imgUrl(n.image);
    var media = img ? '<div class="media"><img src="' + esc(img) + '" alt="" loading="lazy"></div>' : '<div class="media news-ph" style="--c:' + typeColour(n.type) + '"><span>' + esc(n.type) + '</span></div>';
    return '<a class="news-card' + (featured ? ' featured' : '') + '" href="' + esc(n.href) + '">' + media + '<div class="news-body"><div class="news-meta">' + typeChip(n) +
      '<span>' + esc(fmtDate(n._d)) + '</span>' + badges(n) + '</div><h3>' + esc(n.title) + '</h3>' + (n.summary ? '<p>' + esc(n.summary) + '</p>' : '') +
      (featured ? '<span class="link-arrow">Read the story ' + ARROW + '</span>' : '') + '</div></a>';
  }
  function noticeRow(n) {
    var d = n._d, att = safeUrl(n.attachment);
    return '<li class="notice' + (n.pin && !n.closed ? ' is-pinned' : '') + (n.closed ? ' is-closed' : '') + '" style="--c:' + typeColour(n.type) + '">' +
      '<div class="n-date">' + (d ? '<b>' + d.getDate() + '</b><span>' + MONTHS[d.getMonth()] + '</span>' : '') + '</div>' +
      '<div class="n-body"><div class="news-meta">' + typeChip(n) + badges(n) + '</div><h3><a href="' + esc(n.href) + '">' + esc(n.title) + '</a></h3>' + (n.summary ? '<p>' + esc(n.summary) + '</p>' : '') + '</div>' +
      (att ? '<a class="n-file" href="' + esc(att) + '" target="_blank" rel="noopener" aria-label="Download: ' + esc(n.title) + '">' + icon('clipboard') + '<span>Download</span></a>' : '') + '</li>';
  }
  /* Notice board: active notices (pinned first, then soonest deadline, then newest); closed ones go to "past notices" */
  function activeNotices(items) {
    return items.filter(function (n) { return n.kind === 'notice' && !n.closed; }).sort(function (a, b) {
      return (b.pin - a.pin) || ((a._dl || 9e15) - (b._dl || 9e15)) || ((b._d || 0) - (a._d || 0));
    });
  }
  function renderNotices(rows) {
    document.querySelectorAll('[data-render="notices"]').forEach(function (box) {
      var limit = +box.getAttribute('data-limit'), items = prepNews(limit ? fresh(rows) : listed(rows));
      var act = activeNotices(items), past = items.filter(function (n) { return n.kind === 'notice' && n.closed; });
      var shown = limit ? act.slice(0, limit) : act;
      box.innerHTML = (shown.length ? '<ul class="notice-list">' + shown.map(noticeRow).join('') + '</ul>' :
          '<p class="empty small">No open notices right now. Selection trials, circulars and schedule changes appear here.</p>') +
        (!limit && past.length ? '<details class="past-notices"><summary>Past notices (' + past.length + ')</summary><ul class="notice-list">' + past.map(noticeRow).join('') + '</ul></details>' : '') +
        (limit && act.length > limit ? '<a class="link-arrow mt-2" href="news.html#notices">All notices ' + ARROW + '</a>' : '');
      box.setAttribute('data-count', shown.length);
    });
  }
  /* Stories on the news page: a featured story, then a filterable grid (type, year, search) */
  function renderNewsPage(rows) {
    var box = document.querySelector('[data-render="news-page"]'); if (!box) return;
    var items = prepNews(listed(rows)).filter(function (n) { return n.kind === 'story'; });
    if (!items.length) { box.innerHTML = emptyMsg('No stories yet. Event write-ups, results and achievements will appear here. Follow @sportssphere__mitwpu for the latest.'); return; }
    var types = uniq(items, 'type'), years = uniq(items.map(function (n) { return { y: n._d ? String(n._d.getFullYear()) : '' }; }), 'y').sort().reverse();
    var f = { type: param('type'), year: '' }, q = '';
    var feat = items.filter(function (n) { return n.pin; })[0] || items[0];
    box.innerHTML = '<div data-feature></div><div class="toolbar">' +
      (types.length > 1 ? '<div class="filters" role="group" aria-label="Filter stories by type">' + ['All'].concat(types).map(function (t) { var v = t === 'All' ? '' : t; return '<button class="filter-btn" data-type="' + esc(v) + '" aria-pressed="' + (v === f.type) + '">' + esc(t) + '</button>'; }).join('') + '</div>' : '') +
      filterSelect('year', 'Year', years, '') + '<label class="search-field"><span class="visually-hidden">Search stories</span><input type="search" placeholder="Search stories" data-q></label></div>' +
      '<p class="result-count" aria-live="polite" data-count></p><div class="news-grid wide" data-list></div>';
    var out = box.querySelector('[data-list]'), cnt = box.querySelector('[data-count]'), fb = box.querySelector('[data-feature]');
    function draw() {
      var ws = words(q), filtering = f.type || f.year || ws.length;
      var shown = items.filter(function (n) {
        var hay = (n.title + ' ' + n.summary + ' ' + n.body + ' ' + n.type).toLowerCase();
        return (!f.type || n.type === f.type) && (!f.year || (n._d && String(n._d.getFullYear()) === f.year)) && ws.every(function (w) { return hay.indexOf(w) > -1; });
      });
      fb.innerHTML = filtering ? '' : newsCard(feat, true);
      var grid = filtering ? shown : shown.filter(function (n) { return n !== feat; });
      out.innerHTML = grid.length ? grid.map(function (n) { return newsCard(n); }).join('') : (filtering ? emptyMsg('No stories match your search.') : '');
      cnt.textContent = filtering ? shown.length + (shown.length === 1 ? ' story' : ' stories') : '';
    }
    var fl = box.querySelector('.filters');
    if (fl) fl.onclick = function (ev) { var b = ev.target.closest('[data-type]'); if (!b) return; f.type = b.getAttribute('data-type'); fl.querySelectorAll('[data-type]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); draw(); };
    box.querySelectorAll('[data-f]').forEach(function (s) { s.onchange = function () { f[s.getAttribute('data-f')] = s.value; draw(); }; });
    box.querySelector('[data-q]').oninput = function (ev) { q = ev.target.value; draw(); };
    draw();
  }
  /* Home + related lists: latest stories */
  function renderNews(rows) {
    var items = prepNews(rows).filter(function (n) { return n.kind === 'story'; });
    document.querySelectorAll('[data-render="news"]').forEach(function (box) {
      var limit = +box.getAttribute('data-limit') || 3;
      box.innerHTML = items.slice(0, limit).map(function (n) { return newsCard(n); }).join('');
      box.setAttribute('data-count', Math.min(limit, items.length));
    });
  }
  function storyList(items) { return '<div class="news-grid wide">' + items.map(function (n) { return newsCard(n); }).join('') + '</div>'; }

  /* ---------- one news item: article.html?n=<slug> ---------- */
  function renderArticle(d) {
    var box = document.querySelector('[data-render="article"]'); if (!box) return;
    var all = prepNews(listed(d.news)), key = slugify(param('n')), n = all.filter(function (x) { return x.slug === key; })[0];
    if (!n) { box.innerHTML = notFound('Story not found', 'It may have been renamed or removed. All news and notices are on the news page.', 'news.html', 'News & notices'); return; }
    setTitle(n.title);
    var img = imgUrl(n.image), att = safeUrl(n.attachment), link = safeUrl(n.link);
    var ev = n.event ? d.events.filter(function (e) { return slugify(e.title) === slugify(n.event); }).sort(function (a, b) { return Math.abs(a.start - (n._d || TODAY)) - Math.abs(b.start - (n._d || TODAY)); })[0] : null;
    var sp = n.sport ? d.sports.filter(function (s) { return sameSport(n.sport, s); })[0] : null;
    var paras = String(n.body || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var more = all.filter(function (x) { return x !== n && x.kind === n.kind && (x.kind === 'story' || !x.closed); }).slice(0, 3);
    var share = location.href.split('#')[0];
    var facts = [['Published', fmtDate(n._d)], ['Type', n.type]];
    if (n._dl) facts.push(['Deadline', fmtDate(n._dl) + (n.closed ? ' (closed)' : '')]);
    box.innerHTML = '<section class="page-hero article-hero" data-mark="' + esc(n.kind === 'notice' ? 'Notice' : 'News') + '"><span class="hero-mark" aria-hidden="true">' + (n.kind === 'notice' ? 'Notice' : 'News') + '</span><div class="container">' + crumbs([['News', 'news.html'], [n.title]]) +
      '<div class="news-meta">' + typeChip(n) + '<span>' + esc(fmtDate(n._d)) + '</span>' + badges(n) + '</div><h1 class="h1 article-title">' + esc(n.title) + '</h1>' +
      (n.summary ? '<p class="lead">' + esc(n.summary) + '</p>' : '') + '</div></section>' +
      '<section class="section article-section"><div class="container article-grid"><article class="article-main">' +
      (img ? '<figure class="article-img"><img src="' + esc(img) + '" alt=""></figure>' : '') +
      (paras.length ? '<div class="prose">' + paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' : '') +
      ((att || link) ? '<div class="hero-actions">' + (att ? '<a class="btn btn-primary" href="' + esc(att) + '" target="_blank" rel="noopener">Download the notice ' + ARROW + '</a>' : '') +
        (link ? '<a class="btn btn-ghost" href="' + esc(link) + '"' + blank(link) + '>' + (paras.length ? 'Original source' : 'Read the full story') + '</a>' : '') + '</div>' : '') +
      (!paras.length && !link && !att ? '<p class="awaiting">More details will be added by the Sports Office.</p>' : '') +
      '<div class="share"><span>Share</span><a class="share-btn wa" href="https://wa.me/?text=' + encodeURIComponent(n.title + ' ' + share) + '" target="_blank" rel="noopener">WhatsApp</a>' +
      '<button type="button" class="share-btn" data-copy="' + esc(share) + '">Copy link</button></div></article>' +
      '<aside class="article-aside"><dl class="fact-list">' + facts.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') +
      (ev ? '<div><dt>Event</dt><dd><a href="event.html?e=' + esc(ev.slug) + '">' + esc(ev.title) + '</a></dd></div>' : '') +
      (sp ? '<div><dt>Sport</dt><dd><a href="sport.html?s=' + esc(sp.slug) + '">' + esc(sp.name) + '</a></dd></div>' : '') + '</dl>' +
      '<a class="link-arrow mt-2" href="news.html">All news &amp; notices ' + ARROW + '</a></aside></div></section>' +
      (more.length ? '<section class="section surface"><div class="container">' + sectionHead('Keep reading', 'More<br><span class="grad">' + (n.kind === 'notice' ? 'notices' : 'news') + '</span>') + storyList(more) + '</div></section>' : '');
    var cp = box.querySelector('[data-copy]');
    if (cp) cp.onclick = function () {
      var done = function () { cp.textContent = 'Link copied'; setTimeout(function () { cp.textContent = 'Copy link'; }, 2000); };
      if (navigator.clipboard) navigator.clipboard.writeText(cp.getAttribute('data-copy')).then(done, function () { prompt('Copy this link', cp.getAttribute('data-copy')); });
      else prompt('Copy this link', cp.getAttribute('data-copy'));
    };
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

  /* ---------- shared bits for the new sections ---------- */
  function statusPill(e) {
    var st = status(e);
    return '<span class="status-pill is-' + st + '">' + (st === 'live' ? '<i class="live-dot"></i>Happening now' : st === 'past' ? 'Completed' : 'Upcoming') + '</span>';
  }
  function filterSelect(key, label, values, chosen) {
    if (values.length < 2) return '';
    return '<label class="select-field"><span>' + esc(label) + '</span><select data-f="' + key + '"><option value="">All</option>' +
      values.map(function (v) { return '<option' + (v === chosen ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select></label>';
  }
  function uniq(rows, key) { var out = []; rows.forEach(function (r) { var v = String(r[key] || '').trim(); if (v && out.indexOf(v) < 0) out.push(v); }); return out; }
  function sectionHead(eyebrow, title) { return '<div class="section-head"><div><span class="eyebrow">' + eyebrow + '</span><h2 class="h2">' + title + '</h2></div></div>'; }
  function crumbs(parts) {
    return '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a>' + parts.map(function (p, i) {
      return '<span>/</span>' + (p[1] && i < parts.length - 1 ? '<a href="' + p[1] + '">' + esc(p[0]) + '</a>' : '<span>' + esc(p[0]) + '</span>');
    }).join('') + '</nav>';
  }
  function setTitle(t) { document.title = t + ' | Sports Sphere · MIT-WPU'; }

  /* ---------- achievements ---------- */
  function achievementCard(a) {
    var url = safeUrl(a.link), img = imgUrl(a.image);
    return '<article class="ach-card" style="--c:' + colour(a.level === 'International' ? 'red' : a.level === 'National' ? 'orange' : 'blue') + '">' +
      (img ? '<div class="media"><img src="' + esc(img) + '" alt="" loading="lazy"></div>' : '') +
      '<div class="ach-body"><div class="ach-meta"><span class="year">' + esc(a.year) + '</span>' + (a.sport ? '<span class="pill">' + esc(a.sport) + '</span>' : '') +
      (a.level ? '<span class="pill soft">' + esc(a.level) + '</span>' : '') + '<span class="medal">' + icon('medal') + '</span></div>' +
      '<h3>' + esc(a.title) + '</h3>' + (a.winner ? '<p class="who">' + esc(a.winner) + '</p>' : '') +
      (a.competition ? '<p class="comp">' + esc(a.competition) + '</p>' : '') + (a.description ? '<p>' + esc(a.description) + '</p>' : '') +
      (url ? '<a class="link-arrow" href="' + esc(url) + '"' + blank(url) + '>Read more ' + ARROW + '</a>' : '') + '</div></article>';
  }
  function sortAch(rows) { return rows.slice().sort(function (a, b) { return (String(b.date || b.year)).localeCompare(String(a.date || a.year)); }); }
  function renderAchievements(rows) {
    document.querySelectorAll('[data-render="achievements"]').forEach(function (box) {
      var limit = +box.getAttribute('data-limit');
      if (limit) { // teaser: newest published only
        var top = sortAch(fresh(rows)).slice(0, limit);
        box.innerHTML = top.map(achievementCard).join(''); hideWrap(box, !top.length); return;
      }
      var items = sortAch(listed(rows));
      if (!items.length) { box.innerHTML = emptyMsg('Achievements are added here as the Sports Office confirms them.'); return; }
      var f = { sport: param('sport'), year: param('year'), level: '' }, q = param('q');
      var years = uniq(items, 'year').sort().reverse(), sports = uniq(items, 'sport').sort(), levels = uniq(items, 'level');
      box.innerHTML = '<div class="toolbar">' + filterSelect('sport', 'Sport', sports, f.sport) + filterSelect('year', 'Year', years, f.year) + filterSelect('level', 'Level', levels, '') +
        '<label class="search-field"><span class="visually-hidden">Search achievements</span><input type="search" placeholder="Search achievements" value="' + esc(q) + '" data-q></label></div>' +
        '<p class="result-count" aria-live="polite" data-count></p><div class="ach-grid" data-list></div>';
      var out = box.querySelector('[data-list]'), cnt = box.querySelector('[data-count]');
      function draw() {
        var ws = words(q), shown = items.filter(function (a) {
          var hay = [a.title, a.winner, a.competition, a.description, a.sport, a.year].join(' ').toLowerCase();
          return (!f.sport || a.sport === f.sport) && (!f.year || a.year === f.year) && (!f.level || a.level === f.level) && ws.every(function (w) { return hay.indexOf(w) > -1; });
        });
        out.innerHTML = shown.length ? shown.map(achievementCard).join('') : emptyMsg('No achievements match these filters.');
        cnt.textContent = shown.length + (shown.length === 1 ? ' achievement' : ' achievements');
      }
      box.querySelectorAll('[data-f]').forEach(function (s) { s.onchange = function () { f[s.getAttribute('data-f')] = s.value; draw(); }; });
      box.querySelector('[data-q]').oninput = function (ev) { q = ev.target.value; draw(); };
      draw();
    });
  }

  /* ---------- people (leadership, coordinators, coaches, athletes) ---------- */
  function personCard(p) {
    var img = imgUrl(p.photo);
    return '<article class="person-card">' + (img ? '<div class="avatar"><img src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy"></div>' : '<div class="avatar initials" aria-hidden="true">' + esc(initials(p.name)) + '</div>') +
      '<div><h3>' + esc(p.name) + '</h3>' + (p.role ? '<p class="role">' + esc(p.role) + '</p>' : '') + (p.sport ? '<span class="pill">' + esc(p.sport) + '</span>' : '') +
      (p.bio ? '<p class="bio">' + esc(p.bio) + '</p>' : '') + '</div></article>';
  }
  function renderPeople(rows) {
    document.querySelectorAll('[data-render="people"]').forEach(function (box) {
      var groups = (box.getAttribute('data-group') || '').split(','), sport = box.getAttribute('data-sport');
      var items = listed(rows).filter(function (p) { return groups.indexOf(String(p.group || '').trim().toLowerCase()) > -1 && (!sport || sameSport(p.sport, { slug: sport, name: sport })); })
        .sort(function (a, b) { return (+a.order || 999) - (+b.order || 999) || a.name.localeCompare(b.name); });
      box.innerHTML = items.length ? items.map(personCard).join('') : pendingNote(box.getAttribute('data-empty') || 'Profiles are being prepared by the Sports Office.');
      box.classList.toggle('is-empty', !items.length);
    });
  }

  /* ---------- teams ---------- */
  function teamCard(t, sportName) {
    var img = imgUrl(t.photo), facts = [];
    if (t.gender) facts.push('<li><b>Category</b>' + esc(t.gender) + '</li>');
    if (t.captain) facts.push('<li><b>Captain</b>' + esc(t.captain) + '</li>');
    if (t.coach) facts.push('<li><b>Coach</b>' + esc(t.coach) + '</li>');
    return '<article class="team-card">' + (img ? '<div class="media"><img src="' + esc(img) + '" alt="' + esc(t.name) + '" loading="lazy"></div>' : '') +
      '<div class="team-body">' + (sportName ? '<span class="pill">' + esc(sportName) + '</span>' : '') + '<h3>' + esc(t.name) + '</h3>' +
      (facts.length ? '<ul class="facts">' + facts.join('') + '</ul>' : '') + (t.description ? '<p>' + esc(t.description) + '</p>' : '') +
      (t.achievements ? '<ul class="ticks">' + list(t.achievements).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') + '</div></article>';
  }
  function renderTeams(rows, sports) {
    document.querySelectorAll('[data-render="teams"]').forEach(function (box) {
      var limit = +box.getAttribute('data-limit'), items = limit ? fresh(rows) : listed(rows);
      var nameOf = function (v) { var s = sports.filter(function (sp) { return sameSport(v, sp); })[0]; return s ? s.name : v; };
      if (limit) { box.innerHTML = items.slice(0, limit).map(function (t) { return teamCard(t, nameOf(t.sport)); }).join(''); hideWrap(box, !items.length); return; }
      if (!items.length) { box.innerHTML = pendingNote('Official university team profiles (squads, captains and coaches) are being prepared by the Sports Office and will appear here once approved.'); return; }
      var names = uniq(items.map(function (t) { return { s: nameOf(t.sport) }; }), 's').sort(), chosen = param('sport') ? nameOf(param('sport')) : '';
      box.innerHTML = '<div class="toolbar">' + filterSelect('sport', 'Sport', names, chosen) + '</div><div class="team-grid" data-list></div>';
      var out = box.querySelector('[data-list]');
      function draw() { out.innerHTML = items.filter(function (t) { return !chosen || nameOf(t.sport) === chosen; }).map(function (t) { return teamCard(t, nameOf(t.sport)); }).join(''); }
      var sel = box.querySelector('[data-f]'); if (sel) sel.onchange = function () { chosen = sel.value; draw(); };
      draw();
    });
  }

  /* ---------- facilities ---------- */
  function facilityCard(f, full) {
    var img = imgUrl(f.photo), map = safeUrl(f.map_link), feats = list(f.features), rules = list(f.guidelines);
    return '<article class="facility-card" id="' + esc(f.slug || slugify(f.name)) + '">' +
      (img ? '<div class="media"><img src="' + esc(img) + '" alt="' + esc(f.name) + '" loading="lazy"></div>' : '<div class="media ph" role="img" aria-label="' + esc(f.name) + ' (photo coming soon)"><span class="ph-icon">' + icon('camera') + '</span></div>') +
      '<div class="facility-body">' + (f.type ? '<span class="pill">' + esc(f.type) + '</span>' : '') + '<h3>' + esc(f.name) + '</h3>' + (f.description ? '<p>' + esc(f.description) + '</p>' : '') +
      (f.location ? '<p class="loc">' + icon('pin') + '<span>' + esc(f.location) + (map ? ' · <a href="' + esc(map) + '" target="_blank" rel="noopener">Open in Maps</a>' : '') + '</span></p>' : '') +
      (f.sports ? '<p class="sports-line"><b>Sports:</b> ' + esc(list(f.sports.replace(/,/g, ';')).join(', ')) + '</p>' : '') +
      (full && feats.length ? '<ul class="ticks">' + feats.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (full && rules.length ? '<details class="rules"><summary>Facility guidelines</summary><ul>' + rules.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>' : '') +
      (full && !feats.length && !rules.length ? '<p class="awaiting">Venue details, photos and usage guidelines: awaiting confirmation from the Sports Office.</p>' : '') +
      (!full ? '<a class="link-arrow" href="facilities.html#' + esc(f.slug || slugify(f.name)) + '">View facility ' + ARROW + '</a>' : '') + '</div></article>';
  }
  function renderFacilities(rows) {
    document.querySelectorAll('[data-render="facilities"]').forEach(function (box) {
      var limit = +box.getAttribute('data-limit'), items = limit ? fresh(rows).slice(0, limit) : listed(rows);
      box.innerHTML = items.length ? items.map(function (f) { return facilityCard(f, !limit); }).join('') : pendingNote('Facility information is being prepared by the Sports Office.');
      if (limit) { hideWrap(box, !items.length); box.classList.toggle('full', items.length === 1); }
      if (!limit && location.hash) { var el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
    });
  }

  /* ---------- gallery ---------- */
  function galleryItem(g, i) {
    var yt = youtubeId(g.url), url = safeUrl(g.url), thumb = imgUrl(g.thumbnail) || (yt ? 'https://img.youtube.com/vi/' + yt + '/hqdefault.jpg' : (g.type === 'video' ? '' : imgUrl(g.url)));
    var cap = [g.event, g.season && g.season.replace('-', '–')].filter(Boolean).join(' · ');
    var inner = (thumb ? '<img src="' + esc(thumb) + '" alt="' + esc(g.title || g.caption || 'Sports Sphere') + '" loading="lazy">' : '<span class="ph-icon">' + icon('camera') + '</span>') +
      (g.type === 'video' || yt ? '<span class="play" aria-hidden="true"></span>' : '') + '<span class="g-cap"><b>' + esc(g.title) + '</b>' + (cap ? '<small>' + esc(cap) + '</small>' : '') + '</span>';
    if (g.type === 'video' || yt || !thumb) return url ? '<a class="g-item" href="' + esc(url) + '" target="_blank" rel="noopener">' + inner + '</a>' : '';
    return '<button type="button" class="g-item" data-i="' + i + '">' + inner + '</button>';
  }
  function renderGallery(rows) {
    document.querySelectorAll('[data-render="gallery"]').forEach(function (box) {
      var limit = +box.getAttribute('data-limit'), items = (limit ? fresh(rows) : listed(rows)).filter(function (g) { return safeUrl(g.url); })
        .sort(function (a, b) { return String(b.date || b.season).localeCompare(String(a.date || a.season)); });
      var lockSport = box.getAttribute('data-sport'), lockEvent = box.getAttribute('data-event');
      if (lockSport) items = items.filter(function (g) { return sameSport(g.sport, { slug: lockSport, name: lockSport }); });
      if (lockEvent) items = items.filter(function (g) { return slugify(g.event) === slugify(lockEvent); });
      if (limit || lockSport || lockEvent) {
        var few = items.slice(0, limit || 8);
        box.innerHTML = '<div class="g-grid">' + few.map(galleryItem).join('') + '</div>'; hideWrap(box, !few.length); bindLightbox(box, few); return;
      }
      if (!items.length) { box.innerHTML = emptyMsg('Photos and videos from our events are coming soon. Follow @sportssphere__mitwpu on Instagram for match-day moments.'); return; }
      var f = { sport: param('sport'), event: param('event'), season: param('season') };
      box.innerHTML = '<div class="toolbar">' + filterSelect('sport', 'Sport', uniq(items, 'sport').sort(), f.sport) + filterSelect('event', 'Event', uniq(items, 'event').sort(), f.event) +
        filterSelect('season', 'Academic year', uniq(items, 'season').sort().reverse(), f.season) + '</div><p class="result-count" aria-live="polite" data-count></p><div class="g-grid" data-list></div>';
      var out = box.querySelector('[data-list]'), cnt = box.querySelector('[data-count]');
      function draw() {
        var shown = items.filter(function (g) { return (!f.sport || g.sport === f.sport) && (!f.event || g.event === f.event) && (!f.season || g.season === f.season); });
        out.innerHTML = shown.length ? shown.map(galleryItem).join('') : emptyMsg('Nothing matches these filters yet.');
        cnt.textContent = shown.length + (shown.length === 1 ? ' item' : ' items'); bindLightbox(out, shown);
      }
      box.querySelectorAll('[data-f]').forEach(function (s) { s.onchange = function () { f[s.getAttribute('data-f')] = s.value; draw(); }; });
      draw();
    });
  }
  function bindLightbox(scope, items) {
    scope.onclick = function (ev) {
      var b = ev.target.closest('button.g-item'); if (!b) return;
      var g = items[+b.getAttribute('data-i')], dlg = document.getElementById('lightbox');
      if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'lightbox'; dlg.className = 'lightbox'; document.body.appendChild(dlg);
        dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); }); }
      dlg.innerHTML = '<button type="button" class="lb-close" data-close aria-label="Close">×</button><figure><img src="' + esc(imgUrl(g.url)) + '" alt="' + esc(g.title || g.caption || '') + '">' +
        '<figcaption><b>' + esc(g.title) + '</b>' + (g.caption ? ' ' + esc(g.caption) : '') + '</figcaption></figure>';
      if (dlg.showModal) dlg.showModal(); else window.open(imgUrl(g.url), '_blank');
    };
  }

  /* ---------- sports grid (only re-drawn from a Google Sheet; the built page already has the CSV version) ---------- */
  function sportCard(sp, i) {
    var cat = [sp.category, yes(sp.women) ? 'women' : ''].filter(Boolean).join(' ');
    return '<a class="sport-card" href="sport.html?s=' + esc(sp.slug) + '" data-cat="' + esc(cat) + '" style="--c:' + ['#F6C343', '#F08A2E', '#D83B3B', '#2F80C9', '#6DB33F'][i % 5] + '">' +
      '<span class="tag">' + esc(sp.gender) + '</span><div class="icon">' + icon(sp.icon || sp.slug) + '</div><div><h3>' + esc(sp.name) + '</h3><p>' + esc(sp.summary) + '</p></div></a>';
  }
  function renderSportsGrid(sports) {
    document.querySelectorAll('[data-render="sports-grid"]').forEach(function (box) {
      var limit = +box.getAttribute('data-limit'); box.innerHTML = sports.slice(0, limit || 99).map(sportCard).join('');
    });
  }

  /* ---------- sport detail page: sport.html?s=football ---------- */
  function renderSportDetail(d) {
    var box = document.querySelector('[data-render="sport-detail"]'); if (!box) return;
    var key = slugify(param('s')), sp = d.sports.filter(function (x) { return x.slug === key || slugify(x.name) === key; })[0];
    if (!sp) { box.innerHTML = notFound('Sport not found', 'This sport isn\'t on our list (yet).', 'sports.html', 'All sports'); return; }
    setTitle(sp.name);
    var c = '#F08A2E';
    var teams = listed(d.teams).filter(function (t) { return sameSport(t.sport, sp); });
    var coaches = listed(d.people).filter(function (p) { return /coach/i.test(p.group) && sameSport(p.sport, sp); });
    var ach = sortAch(listed(d.achievements).filter(function (a) { return sameSport(a.sport, sp); }));
    var fac = listed(d.facilities).filter(function (f) { return (sp.venue && slugify(sp.venue) === f.slug) || list(String(f.sports).replace(/,/g, ';')).some(function (v) { return sameSport(v, sp); }); });
    var evs = d.events.filter(function (e) { return sameSport(e.sport, sp) || e.title.toLowerCase().indexOf(sp.name.toLowerCase()) > -1; });
    var upcoming = evs.filter(function (e) { return status(e) !== 'past'; }), trials = d.events.filter(function (e) { return /trial/i.test(e.category + ' ' + e.title) && status(e) !== 'past'; })[0];
    box.innerHTML = '<section class="page-hero sport-hero" data-mark="' + esc(sp.name) + '" style="--c:' + c + '"><span class="hero-mark" aria-hidden="true">' + esc(sp.name) + '</span><div class="container">' + crumbs([['Sports', 'sports.html'], [sp.name]]) +
      '<div class="sport-hero-grid"><div><span class="eyebrow">' + esc({ team: 'Team sport', individual: 'Individual sport', mind: 'Mind sport' }[sp.category] || 'Sport') + ' · ' + esc(sp.gender) + '</span>' +
      '<h1 class="h1">' + esc(sp.name) + '</h1><p class="lead">' + esc(sp.summary) + '</p></div><div class="sport-hero-icon" aria-hidden="true">' + icon(sp.icon || sp.slug) + '</div></div></div></section>' +
      '<section class="section"><div class="container split top"><div>' + sectionHead('About', 'The<br><span class="grad">game</span>') +
      (sp.about ? '<div class="prose mt-2"><p>' + esc(sp.about) + '</p></div>' : pendingNote('A full description of ' + esc(sp.name) + ' at MIT-WPU is being prepared by the Sports Office.')) + '</div>' +
      '<div>' + sectionHead('Get in the game', 'Training &amp;<br><span class="grad">trials</span>') +
      (sp.training ? '<div class="prose mt-2"><p>' + esc(sp.training) + '</p></div>' : pendingNote('Training timings and coaching details for ' + esc(sp.name) + ' are awaiting confirmation.')) +
      '<p class="mt-2">University teams are picked at the selection trials at the start of each season.' + (trials ? ' Next trials: <a href="event.html?e=' + esc(trials.slug) + '"><b>' + esc(range(trials).long) + '</b></a>.' : '') + '</p>' +
      '<a class="btn btn-primary mt-2" href="events.html#calendar">See the calendar ' + ARROW + '</a></div></div></section>' +
      '<section class="section surface"><div class="container">' + sectionHead('University teams', 'Our<br><span class="grad">squads</span>') +
      (teams.length ? '<div class="team-grid">' + teams.map(function (t) { return teamCard(t, ''); }).join('') + '</div>' : pendingNote('Team profiles for ' + esc(sp.name) + ' will appear here once approved by the Sports Office.')) +
      (coaches.length ? '<h3 class="h3 mt-3">Coaches</h3><div class="people-grid mt-2">' + coaches.map(personCard).join('') + '</div>' : '') + '</div></section>' +
      '<section class="section"><div class="container">' + sectionHead('Where we play', 'Venue') +
      (fac.length ? '<div class="facility-grid">' + fac.map(function (f) { return facilityCard(f, false); }).join('') + '</div>' : pendingNote('The venue for ' + esc(sp.name) + ' is awaiting confirmation. See <a href="facilities.html">all facilities</a>.')) + '</div></section>' +
      (ach.length ? '<section class="section surface"><div class="container">' + sectionHead('Achievements', 'Hall of<br><span class="grad-champ">fame</span>') + '<div class="ach-grid">' + ach.slice(0, 6).map(achievementCard).join('') + '</div>' +
        '<a class="link-arrow mt-3" href="achievements.html?sport=' + encodeURIComponent(ach[0].sport) + '">All ' + esc(sp.name) + ' achievements ' + ARROW + '</a></div></section>' : '') +
      '<section class="section"><div class="container">' + sectionHead('Events', esc(sp.name) + '<br><span class="grad">on the calendar</span>') +
      (evs.length ? '<div class="event-list">' + (upcoming.length ? upcoming : evs.slice(-3)).map(function (e) { return eventRow(e, false); }).join('') + '</div>' : emptyMsg('No ' + esc(sp.name) + ' events on the calendar yet.')) + '</div></section>' +
      (function () { var rel = prepNews(listed(d.news)).filter(function (x) { return x.sport && sameSport(x.sport, sp); }).slice(0, 3);
        return rel.length ? '<section class="section"><div class="container">' + sectionHead('News', esc(sp.name) + '<br><span class="grad">news</span>') + storyList(rel) + '</div></section>' : ''; })() +
      '<section class="section surface" data-hide-empty hidden><div class="container">' + sectionHead('Gallery', 'In<br><span class="grad">action</span>') + '<div data-render-local="gallery" data-sport="' + esc(sp.slug) + '"></div></div></section>';
    var g = box.querySelector('[data-render-local="gallery"]'); g.setAttribute('data-render', 'gallery'); renderGallery(d.gallery);
  }
  function notFound(title, text, href, label) {
    return '<section class="page-hero"><div class="container"><h1 class="h1">' + esc(title) + '</h1><p class="lead">' + esc(text) + '</p><a class="btn btn-primary mt-3" href="' + href + '">' + esc(label) + ' ' + ARROW + '</a></div></section>';
  }

  /* ---------- event detail page: event.html?e=hoop-it-up-2026-08-28 ---------- */
  function renderEventDetail(d) {
    var box = document.querySelector('[data-render="event-detail"]'); if (!box) return;
    var key = param('e'), e = d.events.filter(function (x) { return x.slug === key; })[0];
    if (!e) { box.innerHTML = notFound('Event not found', 'This event may have been renamed or moved. The calendar has every event.', 'events.html#calendar', 'Event calendar'); return; }
    setTitle(e.title);
    var st = status(e), r = range(e), sp = d.sports.filter(function (x) { return sameSport(e.sport, x); })[0];
    var results = listed(d.results).filter(function (x) { return slugify(x.event) === slugify(e.title) && (!x.season || x.season === e.season); });
    var more = d.events.filter(function (x) { return x !== e && x.season === e.season && status(x) !== 'past'; }).slice(0, 3);
    var btns = '';
    if (st !== 'past' && e.register) btns += '<a class="btn btn-primary" href="' + esc(e.register) + '"' + blank(e.register) + '>Register ' + ARROW + '</a>';
    if (e.details && !/^events\.html/.test(e.details)) btns += '<a class="btn btn-ghost" href="' + esc(e.details) + '"' + blank(e.details) + '>More details</a>';
    if (/^events\.html#/.test(e.details)) btns += '<a class="btn btn-ghost" href="' + esc(e.details) + '">About ' + esc(e.title) + '</a>';
    var facts = [['Dates', r.long], ['Status', st === 'live' ? 'Happening now' : st === 'past' ? 'Completed' : 'Upcoming'], ['Season', e.season.replace('-', '–')]];
    if (e.category) facts.push(['Category', e.category]);
    facts.push(['Venue', e.venue || 'To be announced']);
    box.innerHTML = '<section class="page-hero event-hero" data-mark="Events" style="--c:' + e.colour + '"><span class="hero-mark" aria-hidden="true">Events</span><div class="container">' + crumbs([['Events', 'events.html'], [e.title]]) +
      '<div class="event-hero-grid"><div>' + statusPill(e) + '<h1 class="h1">' + esc(e.title) + '</h1><p class="lead">' + esc(e.description) + '</p>' +
      (btns ? '<div class="hero-actions">' + btns + '</div>' : (st !== 'past' ? '<p class="soon mt-2">Registration opens soon. Follow @sportssphere__mitwpu for the announcement.</p>' : '')) + '</div>' +
      (e.image ? '<div class="event-hero-img"><img src="' + esc(imgUrl(e.image)) + '" alt="' + esc(e.title) + '"></div>' : '<div class="event-date big"><strong>' + esc(r.day) + '</strong><span>' + esc(r.month) + '</span></div>') +
      '</div></div></section>' +
      '<section class="section"><div class="container split top"><div>' + sectionHead('About the event', 'Event<br><span class="grad">details</span>') +
      (e.about ? '<div class="prose mt-2"><p>' + esc(e.about) + '</p></div>' : pendingNote(st === 'past' ? 'A write-up of this event will be added by the Sports Office.' : 'The full schedule, format and venue will be shared by the Sports Office closer to the date.')) + '</div>' +
      '<dl class="fact-list">' + facts.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') +
      (sp ? '<div><dt>Sport</dt><dd><a href="sport.html?s=' + esc(sp.slug) + '">' + esc(sp.name) + '</a></dd></div>' : '') + '</dl></div></section>' +
      '<section class="section surface"><div class="container">' + sectionHead('Results', 'Winners') +
      (results.length ? '<div class="results"><article class="result-card"><header><span>' + esc(e.season.replace('-', '–')) + '</span><h3>' + esc(e.title) + '</h3></header><ul>' +
        results.map(function (x) { return '<li><b>' + esc(x.sport || 'Overall') + '</b><span class="gold">' + esc(x.winner) + '</span>' + (x.runner_up ? '<span class="silver">' + esc(x.runner_up) + '</span>' : '') + (x.notes ? '<em>' + esc(x.notes) + '</em>' : '') + '</li>'; }).join('') +
        '</ul></article></div>' : emptyMsg(st === 'past' ? 'Results for this event haven\'t been posted yet.' : 'Results will be posted here after the event.')) + '</div></section>' +
      '<section class="section" data-hide-empty hidden><div class="container">' + sectionHead('Gallery', 'Photos &amp;<br><span class="grad">videos</span>') + '<div data-render-local="gallery" data-event="' + esc(e.title) + '"></div></div></section>' +
      (function () { var rel = prepNews(listed(d.news)).filter(function (x) { return x.event && slugify(x.event) === slugify(e.title); }).slice(0, 3);
        return rel.length ? '<section class="section"><div class="container">' + sectionHead('News', 'From<br><span class="grad">the event</span>') + storyList(rel) + '</div></section>' : ''; })() +
      (more.length ? '<section class="section surface"><div class="container">' + sectionHead('Also this season', 'Coming<br><span class="grad">up</span>') + '<div class="event-list">' + more.map(function (x) { return eventRow(x, false); }).join('') + '</div></div></section>' : '');
    var g = box.querySelector('[data-render-local="gallery"]'); g.setAttribute('data-render', 'gallery'); renderGallery(d.gallery);
  }

  /* ---------- site search: search.html?q= ---------- */
  var PAGES = [
    ['About Sports Sphere', 'about.html', 'vision mission objectives responsibilities leadership history milestones department'],
    ['Sports', 'sports.html', 'sports list trials team individual'], ['Events and calendar', 'events.html', 'calendar season schedule register'],
    ['Achievements', 'achievements.html', 'medals awards honours results'], ['Teams and coaches', 'teams.html', 'squads athletes coaches captains'],
    ['Facilities', 'facilities.html', 'venues infrastructure dronacharya complex grounds courts'], ['News and notices', 'news.html', 'notices trials updates announcements'],
    ['Gallery', 'gallery.html', 'photos videos pictures'], ['Partner with us', 'partner.html', 'sponsor sponsorship packages brands'],
    ['Join Sports Sphere', 'join.html', 'volunteer join team apply'], ['Contact', 'contact.html', 'email address location instagram']
  ];
  function renderSearch(d) {
    var box = document.querySelector('[data-render="search"]'); if (!box) return;
    var idx = [];
    PAGES.forEach(function (p) { idx.push({ type: 'Page', title: p[0], text: p[2], url: p[1] }); });
    d.sports.forEach(function (s) { idx.push({ type: 'Sport', title: s.name, text: s.summary + ' ' + s.about, url: 'sport.html?s=' + s.slug }); });
    d.events.forEach(function (e) { idx.push({ type: 'Event', title: e.title, text: e.description + ' ' + e.category + ' ' + e.season + ' ' + range(e).long, url: 'event.html?e=' + e.slug, sub: range(e).long }); });
    prepNews(listed(d.news)).forEach(function (n) { idx.push({ type: n.kind === 'notice' ? 'Notice' : 'News', title: n.title, text: n.summary + ' ' + n.type + ' ' + n.body, url: n.href, sub: fmtDate(n._d) }); });
    listed(d.achievements).forEach(function (a) { idx.push({ type: 'Achievement', title: a.title, text: [a.winner, a.competition, a.description, a.sport, a.year].join(' '), url: 'achievements.html?q=' + encodeURIComponent(a.title), sub: a.year }); });
    listed(d.facilities).forEach(function (f) { idx.push({ type: 'Facility', title: f.name, text: f.description + ' ' + f.sports + ' ' + f.location, url: 'facilities.html#' + (f.slug || slugify(f.name)) }); });
    listed(d.people).forEach(function (p) { idx.push({ type: 'People', title: p.name, text: p.role + ' ' + p.sport + ' ' + p.bio, url: /leader/i.test(p.group) ? 'about.html#people' : 'teams.html', sub: p.role }); });
    listed(d.teams).forEach(function (t) { idx.push({ type: 'Team', title: t.name, text: [t.sport, t.captain, t.coach, t.description].join(' '), url: 'teams.html?sport=' + encodeURIComponent(t.sport) }); });
    var input = box.querySelector('input'), out = box.querySelector('[data-results]');
    function draw() {
      var q = input.value.trim(), ws = words(q);
      try { history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname); } catch (e) { }
      if (!ws.length) { out.innerHTML = ''; return; }
      var hits = idx.filter(function (x) { var hay = (x.title + ' ' + x.text + ' ' + x.type).toLowerCase(); return ws.every(function (w) { return hay.indexOf(w) > -1; }); })
        .sort(function (a, b) { var t = function (x) { return ws.every(function (w) { return x.title.toLowerCase().indexOf(w) > -1; }) ? 0 : 1; }; return t(a) - t(b); });
      out.innerHTML = '<p class="result-count" aria-live="polite">' + hits.length + (hits.length === 1 ? ' result' : ' results') + ' for “' + esc(q) + '”</p>' +
        (hits.length ? '<ul class="search-results">' + hits.slice(0, 60).map(function (x) {
          return '<li><a href="' + esc(x.url) + '"' + blank(x.url) + '><span class="pill">' + esc(x.type) + '</span><b>' + esc(x.title) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</a></li>';
        }).join('') + '</ul>' : emptyMsg('Nothing found. Try another word, or browse the <a href="events.html">calendar</a> and <a href="sports.html">sports</a>.'));
    }
    input.value = param('q'); input.oninput = draw; draw();
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
  /* Which tables does this page need? (announcement bar, dates and forms need events + settings on every page) */
  var NEED = { calendar: [], next: [], spotlight: [], stats: ['stats'], sponsors: ['sponsors'], news: ['news'], 'news-page': ['news'], results: ['results'],
    achievements: ['achievements'], people: ['people'], teams: ['teams', 'sports'], facilities: ['facilities'], gallery: ['gallery'], 'sports-grid': ['sports'],
    'sport-detail': ['sports', 'teams', 'people', 'achievements', 'facilities', 'gallery', 'results'], 'event-detail': ['sports', 'results', 'gallery'], article: ['sports'], notices: [],
    search: ['sports', 'news', 'achievements', 'facilities', 'people', 'teams'] };
  var tables = ['events', 'settings', 'news'];
  document.querySelectorAll('[data-render]').forEach(function (el) { (NEED[el.getAttribute('data-render')] || []).forEach(function (t) { if (tables.indexOf(t) < 0) tables.push(t); }); });
  if (document.querySelector('[data-render="calendar"],[data-render="event-detail"]') && tables.indexOf('results') < 0) tables.push('results');

  Promise.all(tables.map(load)).then(function (res) {
    var d = {}; tables.forEach(function (t, i) { d[t] = res[i]; });
    ['stats', 'sponsors', 'news', 'results', 'sports', 'people', 'achievements', 'facilities', 'gallery', 'teams'].forEach(function (t) { d[t] = d[t] || []; });
    var settings = {}; d.settings.forEach(function (r) { if (r.key) settings[r.key.trim()] = r.value; });
    var portal = portalBase(settings.registration_portal);
    var withResults = {}; listed(d.results).forEach(function (r) { withResults[slugify(r.event) + '|' + (r.season || '')] = 1; withResults[slugify(r.event) + '|'] = 1; });
    var events = listed(d.events).map(function (r) {
      var s = parseDate(r.start); if (!s || !r.title) return null;
      var season = r.season || String(s.getFullYear());
      return { season: season, title: r.title, start: s, end: parseDate(r.end) || s, category: r.category, description: r.description, about: r.about, sport: r.sport, venue: r.venue,
               flagship: yes(r.flagship), colour: colour(r.colour), register: registerLink(r.register_link, portal), details: safeUrl(r.details_link), image: safeUrl(r.image),
               slug: slugify(r.title) + '-' + r.start.trim().slice(0, 10).replace(/[^\d-]/g, ''), hasResults: !!(withResults[slugify(r.title) + '|' + season] || withResults[slugify(r.title) + '|']) };
    }).filter(Boolean).sort(function (a, b) { return a.start - b.start; });
    var sports = listed(d.sports).filter(function (s) { return s.name; }).map(function (s) { s.slug = slugify(s.slug || s.name); return s; });
    d.events = events; d.sports = sports;

    var cur = currentSeason(events);
    if (cur) document.querySelectorAll('[data-season-text]').forEach(function (el) { el.textContent = cur.replace('-', '–'); });
    renderAnnouncement(events, settings, d.news);
    renderSpotlight(events);
    renderNext(events);
    renderCalendar(events);
    renderDates(events);
    renderResults(listed(d.results), events);
    renderNews(fresh(d.news));
    renderNotices(d.news);
    renderNewsPage(d.news);
    renderArticle(d);
    document.querySelectorAll('[data-news-wrap]').forEach(function (w) { w.hidden = !w.querySelector('.news-card,.notice'); });
    renderAchievements(d.achievements);
    renderPeople(d.people);
    renderTeams(d.teams, sports);
    renderFacilities(d.facilities);
    renderGallery(d.gallery);
    renderSportDetail(d);
    renderEventDetail(d);
    renderSearch(d);
    /* Sections that only hold "awaiting confirmation" notes get less height */
    document.querySelectorAll('.section').forEach(function (sec) {
      var real = sec.querySelector('.ach-card,.team-card,.person-card,.facility-card,.g-item,.news-card,.event-row,.result-card,.prose,.sport-card,.stat,.form,.why,.value,.timeline,.feature-list,.vm,.tier,.sponsor,.ig-card,.split');
      sec.classList.toggle('is-pending', !!sec.querySelector('.pending-note') && !real);
    });
    if (CFG.sheetId) { renderStats(fresh(d.stats)); renderSponsors(fresh(d.sponsors)); renderSportsGrid(fresh(sports)); } // otherwise the page already shows the same local data
    applySettings(settings);
    applyPortal(portal);
    if (window.ssFit) window.ssFit();
    document.documentElement.classList.add('content-ready');
  });
})();
