/* MIT-WPU Department of Sports — site interactions (no dependencies) */
(function () {
  document.documentElement.classList.remove('no-js');

  /* Header: transparent over hero, solid after scrolling */
  var header = document.querySelector('[data-header]');
  function onScroll() {
    if (header) header.classList.toggle('is-solid', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile navigation */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    }
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) setOpen(false); });
  }

  /* Dropdown menus: hover/focus open them on desktop; the chevron button opens them for touch and keyboard */
  document.querySelectorAll('.has-sub').forEach(function (li) {
    var btn = li.querySelector('.sub-toggle');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !li.classList.contains('is-open');
      document.querySelectorAll('.has-sub.is-open').forEach(function (o) { o.classList.remove('is-open'); o.querySelector('.sub-toggle').setAttribute('aria-expanded', 'false'); });
      li.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('.has-sub')) return;
    document.querySelectorAll('.has-sub.is-open').forEach(function (o) { o.classList.remove('is-open'); o.querySelector('.sub-toggle').setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var o = document.querySelector('.has-sub.is-open'); if (!o) return;
    o.classList.remove('is-open'); var b = o.querySelector('.sub-toggle'); b.setAttribute('aria-expanded', 'false'); b.focus();
  });

  /* Outlined watermark words (page heroes, footer): sized so the whole word is always visible */
  function fitWords() {
    document.querySelectorAll('.hero-mark').forEach(function (el) {
      var hero = el.parentElement, wide = window.innerWidth > 760;
      var avail = wide ? hero.clientWidth * 0.62 : hero.clientWidth - 32;
      fit(el, wide ? Math.min(210, hero.clientHeight * 0.5) : 110, avail);
    });
    document.querySelectorAll('.footer-word').forEach(function (el) {
      var cs = getComputedStyle(el.parentElement);
      fit(el, 232, el.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    });
  }
  function fit(el, max, avail) {
    el.style.fontSize = max + 'px';
    var w = el.scrollWidth;
    if (w > avail) el.style.fontSize = Math.max(24, Math.floor(max * avail / w)) + 'px';
  }
  window.ssFit = fitWords;
  fitWords();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWords);
  var fitTimer; window.addEventListener('resize', function () { clearTimeout(fitTimer); fitTimer = setTimeout(fitWords, 120); });

  /* Reveal-on-scroll */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Count-up numbers: <strong data-count="1983">1983</strong> */
  var counters = document.querySelectorAll('[data-count]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target, end = parseInt(el.getAttribute('data-count'), 10);
        var start = parseInt(el.getAttribute('data-from') || '0', 10);
        var suffix = el.querySelector('sup') ? el.querySelector('sup').outerHTML : '';
        var t0 = null, dur = 1400;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
          el.innerHTML = Math.round(start + (end - start) * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        co.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* Filters (events / sports) */
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var target = document.querySelector(group.getAttribute('data-filter-group'));
    if (!target) return;
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;
      var value = btn.getAttribute('data-filter');
      group.querySelectorAll('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      target.querySelectorAll('[data-cat]').forEach(function (item) {
        var show = value === 'all' || item.getAttribute('data-cat').split(' ').indexOf(value) > -1;
        item.hidden = !show;
      });
    });
  });

  /* Forms — client-side validation.
     TODO(backend): connect to the university's form endpoint / CRM.
     Set data-endpoint="https://..." on the <form> to POST real submissions. */
  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (input) {
        var field = input.closest('.field');
        var valid = input.type === 'checkbox' ? input.checked : input.checkValidity() && input.value.trim() !== '';
        if (field) field.classList.toggle('invalid', !valid);
        if (!valid && ok) { input.focus(); ok = false; }
      });
      if (!ok) return;

      var endpoint = form.getAttribute('data-endpoint');
      var mailto = form.getAttribute('data-mailto'); /* set by content.js from settings.contact_email */
      if (!endpoint && mailto) {
        var lines = [], subject = form.getAttribute('data-subject') || 'Website enquiry';
        form.querySelectorAll('input,select,textarea').forEach(function (el) {
          if (!el.name || !el.value) return;
          var lab = form.querySelector('label[for="' + el.id + '"]');
          lines.push((lab ? lab.textContent : el.name) + ': ' + el.value);
        });
        window.location.href = 'mailto:' + mailto + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
        var box0 = form.querySelector('.form-success');
        if (box0) box0.textContent = 'Your email app should open with the message ready. Just press send.';
        form.classList.add('is-sent');
        return;
      }
      var done = function () { form.classList.add('is-sent'); form.reset(); };
      if (endpoint) {
        fetch(endpoint, { method: 'POST', body: new FormData(form) }).then(done).catch(function () {
          alert('Sorry, something went wrong. Please try again or email us directly.');
        });
      } else {
        /* No backend connected yet: be honest instead of pretending it was sent */
        var msg = form.getAttribute('data-pending'), box = form.querySelector('.form-success');
        if (msg && box) box.textContent = msg;
        form.classList.add('is-sent');
      }
    });
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid') && e.target.checkValidity()) field.classList.remove('invalid');
    });
  });

  /* Sponsorship "Enquire" buttons preselect the package */
  document.querySelectorAll('[data-tier]').forEach(function (b) {
    b.addEventListener('click', function () {
      var sel = document.getElementById('p-tier'); if (sel) sel.value = b.getAttribute('data-tier');
    });
  });

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
