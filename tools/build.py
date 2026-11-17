"""
Sports Sphere site generator.
Edit content here, then run from the project root:

    python3 tools/build.py

It rewrites the 7 HTML pages (shared header/footer stay identical).
Works on Python 3.8+ with no extra packages.

Content source: Sports Sphere Sponsorship Docket 2026-27 (supplied by the client),
plus public MIT-WPU facts where noted.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --------------------------------------------------------------- content tables (/content/*.csv)
# The same tables are read live in the browser by assets/js/content.js (or from the Google Sheet
# set in assets/js/config.js). What's built here is the no-JavaScript / search-engine fallback.
import csv, datetime
def read_csv(name):
    path = os.path.join(ROOT, "content", name + ".csv")
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8-sig") as f:
        return [{k.strip().lower(): (v or "").strip() for k, v in r.items() if k} for r in csv.DictReader(f)]

def pdate(v):
    v = (v or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.datetime.strptime(v, fmt).date()
        except ValueError:
            pass
    return None

MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
def drange(a, b):
    if a == b:
        return str(a.day), "%s %d" % (MON[a.month - 1], a.year), "%d %s %d" % (a.day, MONL[a.month - 1], a.year)
    if (a.month, a.year) == (b.month, b.year):
        return "%d–%d" % (a.day, b.day), "%s %d" % (MON[a.month - 1], a.year), "%d–%d %s %d" % (a.day, b.day, MONL[a.month - 1], a.year)
    return ("%d %s–%d %s" % (a.day, MON[a.month - 1], b.day, MON[b.month - 1]), str(b.year),
            "%d %s – %d %s %d" % (a.day, MONL[a.month - 1], b.day, MONL[b.month - 1], b.year))

EVENTS = []
for r in read_csv("events"):
    st = pdate(r.get("start"))
    if not st or not r.get("title"):
        continue
    EVENTS.append(dict(r, start_d=st, end_d=pdate(r.get("end")) or st))
EVENTS.sort(key=lambda e: e["start_d"])
BUILD_DAY = datetime.date.today()
_up = [e for e in EVENTS if e["end_d"] >= BUILD_DAY]
CURRENT_SEASON = (_up[0] if _up else (EVENTS[-1] if EVENTS else {"season": ""}))["season"]
SEASON_TXT = CURRENT_SEASON.replace("-", "–")
def season_span():
    return '<span data-season-text>' + SEASON_TXT + '</span>'

def event_by(key):
    m = [e for e in EVENTS if key.lower() in e["title"].lower()]
    up = [e for e in m if e["end_d"] >= BUILD_DAY]
    return (up[0] if up else (m[-1] if m else None))
def date_of(key, fmt="long"):
    e = event_by(key)
    if not e:
        return '<span data-date-of="%s" data-format="%s"></span>' % (key, fmt)
    d, mth, lng = drange(e["start_d"], e["end_d"])
    txt = {"long": lng, "short": d + " " + mth, "year": str(e["start_d"].year)}[fmt]
    return '<span data-date-of="%s" data-format="%s">%s</span>' % (key, fmt, txt)

# --------------------------------------------------------------- palette (from the logo ring)
YELLOW, ORANGE, RED, BLUE, GREEN = "#F6C343", "#F08A2E", "#D83B3B", "#2F80C9", "#6DB33F"
RING = [YELLOW, ORANGE, RED, BLUE, GREEN]

# --------------------------------------------------------------- icons
def svg(inner, sw="1.6"):
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw +
            '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>')

I = {
    "arrow": svg('<path d="M5 12h14M13 6l6 6-6 6"/>', "2.4"),
    "football": svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4z"/><path d="M12 7.5V2.6M15.8 10.3l4.6-1.5M14.3 14.7l2.9 4M9.7 14.7l-2.9 4M8.2 10.3L3.6 8.8"/>'),
    "cricket": svg('<path d="M14.5 3.5l6 6-9.8 9.8a2 2 0 0 1-2.8 0l-3.2-3.2a2 2 0 0 1 0-2.8z"/><path d="M5.8 18.2L2.5 21.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'),
    "basketball": svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19M5.3 5.3a9.5 9.5 0 0 1 0 13.4M18.7 5.3a9.5 9.5 0 0 0 0 13.4"/>'),
    "volleyball": svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 12a9 9 0 0 0-1-9.4M12 12a9 9 0 0 0 8.7 3.4M12 12a9 9 0 0 1-7.6 6M12 12c3-1.5 5-4.5 5.3-8M12 12c-3.2.2-6.2-1.3-8-4.2"/>'),
    "badminton": svg('<path d="M8 21.5a2.5 2.5 0 1 0 0-5"/><path d="M6 17l9-14 6.5 4.2-12 11.8"/><path d="M10.4 10l5.1 3.4M13 6.2l5.6 3.6"/>'),
    "tabletennis": svg('<circle cx="10" cy="10" r="6.8"/><path d="M14.8 14.8l5.2 5.2a1.4 1.4 0 0 1-2 2l-5.2-5.2"/><circle cx="19.5" cy="5" r="1.8"/>'),
    "chess": svg('<path d="M9 2.5h6M12 2.5v4M8.5 6.5h7l-1.5 6h-4zM9.5 12.5l-1.5 6h8l-1.5-6M6 21.5h12M7 18.5h10v3H7z"/>'),
    "kabaddi": svg('<circle cx="8" cy="4.5" r="2"/><circle cx="17" cy="6" r="2"/><path d="M8 7v6l-3 8M8 13l3 3v5M8 9l5-1M17 8.5V14l2 7M17 14l-3 2.5-1.5 4.5M17 10l-4-2"/>'),
    "swimming": svg('<circle cx="16.5" cy="6" r="2"/><path d="M3 11.5l5.5-3 3.5 3.5M2 16c1.7 0 1.7 1.2 3.4 1.2S7.1 16 8.8 16s1.7 1.2 3.4 1.2S13.9 16 15.6 16s1.7 1.2 3.4 1.2S20.3 16 22 16M2 20c1.7 0 1.7 1.2 3.4 1.2S7.1 20 8.8 20s1.7 1.2 3.4 1.2S13.9 20 15.6 20s1.7 1.2 3.4 1.2S20.3 20 22 20"/>'),
    "esports": svg('<path d="M6.5 7.5h11a4 4 0 0 1 3.9 4.8l-.9 4.3a2.3 2.3 0 0 1-4 1l-1.8-2.1H9.3l-1.8 2.1a2.3 2.3 0 0 1-4-1l-.9-4.3a4 4 0 0 1 3.9-4.8z"/><path d="M8 10.5v3M6.5 12h3M15.5 11.2h.01M17.5 13h.01"/>'),
    "medal": svg('<circle cx="12" cy="15" r="6"/><path d="M8.5 10.2L5 2.5h4.5l2.5 5M15.5 10.2L19 2.5h-4.5L12 7.5M12 12.2l.9 1.9 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z"/>', "1.8"),
    "trophy": svg('<path d="M7 3.5h10v5a5 5 0 0 1-10 0zM7 5.5H3.5v1.5A3.5 3.5 0 0 0 7 10.5M17 5.5h3.5v1.5a3.5 3.5 0 0 1-3.5 3.5M12 13.5v4M8 21h8l-1-3.5H9z"/>', "2"),
    "camera": svg('<path d="M3 7.5h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>'),
    "pin": svg('<path d="M12 21.5s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9.5" r="2.5"/>', "2"),
    "phone": svg('<path d="M21 16.5v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.7 2 2 0 0 1 3.1 1.5h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.1 9.4a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>', "2"),
    "mail": svg('<path d="M3 5.5h18v13H3z"/><path d="M3 6l9 7 9-7"/>', "2"),
    "users": svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.6a6.5 6.5 0 0 1 3 5.9"/>', "2"),
    "flag": svg('<path d="M5 21.5V3.5M5 4h11l-2 4 2 4H5"/>', "2"),
    "globe": svg('<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5a14.5 14.5 0 0 1 0 19M12 2.5a14.5 14.5 0 0 0 0 19"/>', "2"),
    "clipboard": svg('<rect x="5" y="4" width="14" height="17.5" rx="2"/><path d="M9 4V2.5h6V4M8.5 10l2 2 4-4M8.5 16h7"/>', "2"),
    "megaphone": svg('<path d="M3 10v4h3l7 4.5v-13L6 10zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>', "2"),
    "chart": svg('<path d="M4 20.5V14M9.3 20.5V10.5M14.6 20.5V7M20 20.5V3.5"/>', "2.4"),
    "handshake": svg('<path d="M2.5 11l4-4 3 1.5 3-1.5 2 0 4.5 4.5M2.5 11l6.5 6.5a1.6 1.6 0 0 0 2.3 0l.3-.3a1.6 1.6 0 0 0 2.3 0l.4-.4a1.6 1.6 0 0 0 0-2.3M21.5 11l-3.5 3.5M9.5 8.5l-2 2a1.4 1.4 0 0 0 2 2l2.5-2"/>', "2"),
    "cap": svg('<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/>', "2"),
    "eye": svg('<path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2"/>', "2"),
    "target": svg('<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>', "2"),
    "check": svg('<path d="M4.5 12.5l5 5 10-11"/>', "2.8"),
    "ig": svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>', "2"),
    "fb": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8.5V6.6c0-.9.6-1.1 1-1.1h2.5V1.6L14 1.5C10.2 1.5 9.4 4.3 9.4 6.1v2.4H7v4h2.4V22.5H14V12.5h3.1l.4-4z"/></svg>',
    "yt": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15V9l5.8 3z"/></svg>',
    "li": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V21h-4z"/></svg>',
}
ARROW = I["arrow"]

def streaks(cls=""):
    return ('<div class="streaks' + ((" " + cls) if cls else "") +
            '" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>')

def media(label, cls="", icon="camera", color=ORANGE):
    # Photo slot. Replace with: <div class="media"><img src="assets/img/photos/NAME.webp" alt="..."></div>
    return ('<div class="media ph ' + cls + '" data-label="' + label + '" role="img" aria-label="' + label +
            ' (photo coming soon)" style="--c:' + color + '"><span class="ph-icon">' + I[icon] + '</span></div>')

# --------------------------------------------------------------- social
IG = [  # from the QR codes supplied by the client
    ("sportssphere__mitwpu", "Sports Sphere", "Everything Sports Sphere: events, registrations, match days and results.", ORANGE),
    ("hoopitup_mitwpu", "Hoop It Up", "Fixtures, highlights and winners from our basketball championship.", BLUE),
    ("mitwpusummit", "Sports Summit", "The flagship national-level multi-sport event, Sports for Peace.", RED),
]
def ig_url(h):
    return "https://www.instagram.com/" + h + "/"

# --------------------------------------------------------------- layout
NAV = [("index.html", "Home"), ("about.html", "About"), ("sports.html", "Sports"),
       ("events.html", "Events"), ("partner.html", "Partner"), ("contact.html", "Contact")]

WORDMARK = ('<a href="index.html" class="wordmark" aria-label="Sports Sphere home">'
            '<img class="wm-badge" src="assets/img/logo/sports-sphere-badge.webp" alt="" width="60" height="60">'
            '<span class="wm-text"><b>Sports</b><b>Sphere</b></span></a>')

def header(active):
    cur = ' aria-current="page"'
    links = ''.join('<li><a href="%s"%s>%s</a></li>' % (h, cur if h == active else "", t) for h, t in NAV)
    return ('<a class="skip-link" href="#main">Skip to content</a>\n'
            '<header class="site-header" data-header>\n  <div class="announce" data-render="announcement" hidden></div>\n  <div class="container header-inner">\n'
            '    <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu"><span></span><span></span></button>\n'
            '    ' + WORDMARK + '\n'
            '    <nav id="site-nav" class="site-nav" aria-label="Primary"><ul>' + links + '</ul>'
            '<a class="btn btn-primary btn-sm" href="join.html"' + (cur if active == "join.html" else "") + '>Join Sports Sphere ' + ARROW + '</a></nav>\n'
            '    <!-- Official MIT-WPU logo: always top-right (Brand Book 2026, p.8), min 60px -->\n'
            '    <a href="https://mitwpu.edu.in" class="brand-logo" target="_blank" rel="noopener" aria-label="MIT World Peace University (opens in new tab)">'
            '<img src="assets/img/logo/mitwpu-logo-color.webp" alt="MIT-WPU" width="65" height="62"></a>\n'
            '  </div>\n</header>')

FOOTER = ('<div class="ring-bar" aria-hidden="true"></div>\n<footer class="site-footer">\n  <div class="container">\n'
          '    <div class="footer-top">\n      <div class="footer-brand">' + WORDMARK +
          '<p class="tagline">Fueling passion. Building champions.</p>'
          '<p>MIT-WPU\'s official sports management &amp; event platform, uniting athletes, institutions and brands through the culture of collegiate sport.</p>'
          '<img class="footer-mit" src="assets/img/logo/mitwpu-logo-white.webp" alt="MIT-WPU" width="74" height="70"></div>\n'
          '      <div><h4>Explore</h4><ul class="footer-links"><li><a href="about.html">About us</a></li><li><a href="sports.html">Sports</a></li><li><a href="events.html">Season calendar</a></li><li><a href="events.html#hoop-it-up">Hoop It Up</a></li><li><a href="events.html#summit">Sports Summit</a></li></ul></div>\n'
          '      <div><h4>Get involved</h4><ul class="footer-links"><li><a href="join.html">Join Sports Sphere</a></li><li><a href="events.html#calendar" data-register>Register for an event</a></li><li hidden><a href="#" data-portal-status hidden>Check my registration</a></li><li><a href="partner.html">Become a sponsor</a></li><li><a href="partner.html#tiers">Sponsorship packages</a></li><li><a href="contact.html">Contact us</a></li></ul></div>\n'
          '      <div><h4>Follow us</h4><ul class="footer-links ig-links">' +
          ''.join('<li><a href="%s" target="_blank" rel="noopener">%s@%s</a></li>' % (ig_url(h), I["ig"], h) for h, _, _, _ in IG) +
          '</ul><p class="footer-small">MIT World Peace University<br>S. No. 124, Paud Road, Kothrud, Pune 411038</p>'
          '<div class="socials" aria-label="MIT-WPU social media">'
          '<a href="https://www.facebook.com/MIT-WPUOfficial/" target="_blank" rel="noopener" aria-label="MIT-WPU on Facebook">' + I["fb"] + '</a>'
          '<a href="https://www.youtube.com/c/MITWorldPeaceUniversity" target="_blank" rel="noopener" aria-label="MIT-WPU on YouTube">' + I["yt"] + '</a>'
          '<a href="https://www.linkedin.com/school/mitwpuofficial/" target="_blank" rel="noopener" aria-label="MIT-WPU on LinkedIn">' + I["li"] + '</a>'
          '</div></div>\n'
          '    </div>\n    <div class="footer-word" aria-hidden="true">Sports Sphere</div>\n'
          '    <div class="footer-bottom"><span>&copy; <span data-year>2026</span> Sports Sphere · MIT World Peace University</span><a href="https://mitwpu.edu.in" target="_blank" rel="noopener">www.mitwpu.edu.in</a></div>\n'
          '  </div>\n</footer>')

def page(fname, title, desc, body):
    full = "Sports Sphere · MIT-WPU | Fueling Passion, Building Champions" if fname == "index.html" else title + " | Sports Sphere · MIT-WPU"
    html = ('<!doctype html>\n<html lang="en" class="no-js">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>' + full + '</title>\n<meta name="description" content="' + desc + '">\n'
            '<meta name="theme-color" content="#151C4F">\n<meta property="og:type" content="website">\n'
            '<meta property="og:title" content="' + full + '">\n<meta property="og:description" content="' + desc + '">\n'
            '<!-- TODO: make og:image an absolute URL once the domain is known -->\n<meta property="og:image" content="assets/img/logo/sports-sphere-logo.png">\n'
            '<link rel="icon" href="assets/img/favicon.png" type="image/png">\n'
            '<link rel="apple-touch-icon" href="assets/img/logo/sports-sphere-badge.png">\n'
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            '<link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;0,900;1,700;1,900&display=swap" rel="stylesheet">\n'
            '<link rel="stylesheet" href="' + asset("assets/css/style.css") + '">\n</head>\n<body>\n'
            + header(fname) + '\n<main id="main">\n' + body + '\n</main>\n' + FOOTER +
            '\n<script src="' + asset("assets/js/config.js") + '" defer></script>\n<script src="' + asset("assets/js/content.js") + '" defer></script>\n<script src="' + asset("assets/js/main.js") + '" defer></script>\n</body>\n</html>\n')
    with open(os.path.join(ROOT, fname), "w") as f:
        f.write(html)

import hashlib as _hashlib


def asset(path):
    """Link to a CSS/JS file with a version stamp (hash of its contents). Browsers keep cached copies of these
    files; the stamp changes whenever the file changes, so visitors always get the current version."""
    with open(os.path.join(ROOT, path), "rb") as f:
        return path + "?v=" + _hashlib.sha256(f.read()).hexdigest()[:10]


def page_hero(crumb, eyebrow, title_html, lead):
    return ('<section class="page-hero">' + streaks("right") + '<div class="container">'
            '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><span>' + crumb + '</span></nav>'
            '<span class="eyebrow">' + eyebrow + '</span><h1 class="h1">' + title_html + '</h1>'
            '<p class="lead">' + lead + '</p></div></section>')

def head(eyebrow, title_html, right=""):
    return ('<div class="section-head"><div><span class="eyebrow reveal">' + eyebrow + '</span>'
            '<h2 class="h2 reveal">' + title_html + '</h2></div>' + right + '</div>')

def cta(title="Your game<br>starts here.", lead="Athlete, organiser, creator or brand: there's a place for you in the Sphere. Enter the next event, join the team behind the games, or partner with us this season."):
    return ('<section class="cta">' + streaks("right") + '<div class="container cta-grid">'
            '<div class="reveal"><h2 class="h1">' + title + '</h2><p class="lead">' + lead + '</p>'
            '<div class="hero-actions"><a class="btn btn-light" href="join.html">Join Sports Sphere ' + ARROW + '</a>'
            '<a class="btn btn-ghost on-grad" href="events.html#calendar" data-register>Register for an event</a>'
            '<a class="btn btn-ghost on-grad" href="partner.html">Become a sponsor</a></div></div>'
            '<div class="steps reveal" data-delay="1">'
            '<div class="step"><b>1</b><div><h3>Pick your event</h3><p>Trials, Hoop It Up, Sports Summit and more all season.</p></div></div>'
            '<div class="step"><b>2</b><div><h3>Register</h3><p>Sign up your team or yourself in two minutes.</p></div></div>'
            '<div class="step"><b>3</b><div><h3>Compete</h3><p>Play, win and create your own legacy.</p></div></div>'
            '</div></div></section>')

# --------------------------------------------------------------- data (Sponsorship Docket 2026-27)
COLOR_NAMES = {"yellow": YELLOW, "orange": ORANGE, "red": RED, "blue": BLUE, "green": GREEN}
def cname(c):
    c = (c or "").strip().lower()
    return COLOR_NAMES.get(c, c if c.startswith("#") else ORANGE)

def stats_html():
    out = []
    for i, r in enumerate(read_csv("stats")):
        v, sup = r.get("value", ""), r.get("suffix", "")
        cnt = ' data-count="%s"' % v if v.isdigit() else ""
        out.append('<div class="stat reveal" data-delay="%d" style="--c:%s"><strong%s>%s%s</strong><span>%s</span></div>'
                   % (i % 4, cname(r.get("colour")), cnt, v, ("<sup>%s</sup>" % sup) if sup else "", r.get("label", "")))
    return '<div class="stats" data-render="stats">' + ''.join(out) + '</div>'

# Official sports list. (M) men's, (W) women's.
SPORTS = [
    ("football", "Football", "M &amp; W", "team women", "Fast feet, big goals. Men's and women's squads on the turf."),
    ("cricket", "Cricket", "Men's", "team", "Nets, leagues and the battle for the university XI."),
    ("basketball", "Basketball", "M &amp; W", "team women", "The home of Hoop It Up. Fast breaks and full-court battles."),
    ("volleyball", "Volleyball", "M &amp; W", "team women", "Spike, block, dig. High-flying court action."),
    ("kabaddi", "Kabaddi", "Men's", "team", "Raw power and quick thinking in India's own contact sport."),
    ("swimming", "Swimming", "Individual", "individual women", "Stroke technique, endurance and race day in the pool."),
    ("badminton", "Badminton", "M &amp; W", "individual women", "Lightning rallies on indoor courts, singles and doubles."),
    ("tabletennis", "Table Tennis", "M &amp; W", "individual women", "Reflexes, spin and pure precision."),
    ("chess", "Chess", "Team", "mind", "Team chess, where strategy wins championships."),
    ("esports", "E-Sports", "Per event", "mind", "Competitive gaming, with titles announced per event."),
]
def sport_cards(items, with_cat=False):
    out = []
    for n, (key, name, tag, cat, blurb) in enumerate(items):
        c = (' data-cat="' + cat + '"') if with_cat else ""
        out.append('<article class="sport-card reveal"' + c + ' style="--c:' + RING[n % 5] + '"><span class="tag">' + tag +
                   '</span><div class="icon">' + I[key] + '</div><div><h3>' + name + '</h3><p>' + blurb + '</p></div></article>')
    return "\n".join(out)

TAPE_ITEMS = ["Fueling passion", "Hoop It Up", "Sports Summit", "Building champions", "Football", "Cricket", "Basketball",
              "Student driven", "Volleyball", "Kabaddi", "Uniting sports", "Badminton", "Chess", "Creating legacies", "E-Sports"]
tape_html = ''.join('<span>' + t + '</span>' for t in TAPE_ITEMS)
TAPE = ('<div class="tape-wrap" aria-hidden="true"><div class="tape alt"><div class="tape-track" style="animation-direction:reverse">'
        + tape_html + tape_html + '</div></div><div class="tape"><div class="tape-track">' + tape_html + tape_html + '</div></div></div>')

VALUES = [  # the logo ribbon
    ("01", "Student driven", "Built and run with students at the centre, from the organising teams to the athletes on court.", ORANGE),
    ("02", "Uniting sports", "Ten sports, every faculty, colleges from across the country. One platform that brings them all together.", BLUE),
    ("03", "Creating legacies", "Trophies, records and memories that last long after the final whistle.", GREEN),
]
def value_cards():
    return "".join('<div class="value reveal" data-delay="%d" style="--c:%s"><span class="num">%s</span><h3>%s</h3><p>%s</p></div>'
                   % (i, c, n, t, d) for i, (n, t, d, c) in enumerate(VALUES))

DIFFERENT = [
    ("globe", "National reach", "Bringing together institutions and athletes from across the country.", BLUE),
    ("clipboard", "Professional event management", "Well-planned tournaments with experienced organising teams and high operational standards.", ORANGE),
    ("users", "Youth engagement", "Direct access to students, athletes, faculty, alumni and sports enthusiasts.", GREEN),
    ("eye", "Brand visibility", "Integrated branding across venues, digital media, merchandise and event experiences.", RED),
]
def feature_items(items):
    return "".join('<li class="reveal" style="--c:%s"><span class="fi">%s</span><div><h3>%s</h3><p>%s</p></div></li>'
                   % (c, I[ic], t, d) for ic, t, d, c in items)

WHY = [
    ("users", "Direct youth access", "Reach an engaged, high-energy university audience of students, athletes and campus influencers.", ORANGE),
    ("megaphone", "National visibility", "Associate with a flagship, multi-city intercollegiate portfolio spanning several sports.", RED),
    ("flag", "Brand activation on ground", "On-site branding, booths and experiential zones across match days and finals.", YELLOW),
    ("chart", "Digital amplification", "Consistent visibility across Sports Sphere's growing Instagram community and event content.", BLUE),
    ("handshake", "Community &amp; CSR value", "Association with sportsmanship, inclusivity and causes like National Sports Day.", GREEN),
    ("cap", "Access to academia", "A direct line into MIT-WPU's student ecosystem and partner institutions across India.", ORANGE),
]
def why_cards():
    return "".join('<div class="why reveal" data-delay="%d" style="--c:%s"><span class="fi">%s</span><h3>%s</h3><p>%s</p></div>'
                   % (i % 3, c, I[ic], t, d) for i, (ic, t, d, c) in enumerate(WHY))

TIERS = [  # name, price, benefits count, description, colour, featured
    ("Co-Host / Platinum", "&#8377;5,00,000", "12+", "The highest level of brand visibility across Sports Sphere's flagship events: prime logo placement, exclusive branding locations, stage recognition alongside dignitaries, volunteer jersey branding, premium digital promotions, exhibition space and strategic brand activations.", "#8A93B8", True),
    ("Gold", "&#8377;3,50,000", "7+", "Premium visibility across all major sporting events: prime logo placement, digital billboards, social media promotions, exhibition space and extensive on-ground branding throughout the season.", YELLOW, False),
    ("Co-Sponsor / Principal", "&#8377;1,00,000", "6+", "Become a key event partner with prominent logo placement, exhibition space, on-ground branding, customisable activations and strong visibility across Sports Sphere events.", ORANGE, False),
    ("Silver", "&#8377;50,000", "4+", "Event branding, venue signage, posters, social media promotion and shared sponsor branding across selected sporting events.", "#A9B0C2", False),
    ("Bronze", "&#8377;25,000", "3+", "Shared sponsor branding, social media promotion, product display and visibility during selected sporting events.", "#C98A55", False),
    ("Custom", "&#8377;20,000+", "3+", "A package built around your goals and budget: choose from branding, product displays, digital promotions, activity sponsorships and custom activations.", GREEN, False),
]
def tier_cards():
    out = []
    for i, (name, price, ben, desc, c, feat) in enumerate(TIERS):
        out.append('<article class="tier reveal%s" data-delay="%d" style="--c:%s">%s<h3>%s</h3><p class="price">%s</p>'
                   '<p class="ben"><b>%s</b> benefits</p><p class="desc">%s</p>'
                   '<a class="btn %s btn-sm" href="#enquire" data-tier="%s">Enquire ' % (" featured" if feat else "", i % 3, c,
                   '<span class="ribbon">Top tier</span>' if feat else "", name, price, ben, desc, "btn-primary" if feat else "btn-dark", name)
                   + ARROW + '</a></article>')
    return "".join(out)

# Benefit comparison: Platinum, Gold, Co-Sponsor, Silver, Bronze, Custom ("y" = included, "o" = optional, "" = no)
COMPARE = [
    ("Prime logo placement", "yyy   "),
    ("Branding locations", "y    o"),
    ("Stage recognition", "y    o"),
    ("Volunteer jersey branding", "y     "),
    ("Exhibition stall", "yyy  o"),
    ("Digital billboard", "yy   o"),
    ("Social media promotion", "yyyyyy"),
    ("Shared banner / checker board", "yyyyyy"),
    ("Posters &amp; venue signage", "yyyy o"),
    ("Product display", "yyyyyy"),
    ("Custom brand activation", "y     "),
]
def compare_table():
    heads = ["Platinum", "Gold", "Co-Sponsor", "Silver", "Bronze", "Custom"]
    rows = []
    for label, marks in COMPARE:
        cells = []
        for m in marks:
            if m == "y":
                cells.append('<td><span class="tick" aria-label="Included">' + I["check"] + '</span></td>')
            elif m == "o":
                cells.append('<td><span class="opt">Optional</span></td>')
            else:
                cells.append('<td><span class="dash" aria-label="Not included">–</span></td>')
        rows.append('<tr><th scope="row">' + label + '</th>' + ''.join(cells) + '</tr>')
    return ('<div class="table-wrap reveal"><table class="compare"><thead><tr><th scope="col">Benefit</th>' +
            ''.join('<th scope="col">' + h + '</th>' for h in heads) + '</tr></thead><tbody>' + ''.join(rows) + '</tbody></table></div>')

def sponsor_strip():
    out = []
    for r in read_csv("sponsors"):
        inner = ('<img src="%s" alt="%s" loading="lazy">' % (r["logo"], r["name"])) if r.get("logo") else \
                '<b>%s</b><span>%s</span>' % (r.get("name", ""), r.get("tagline", ""))
        out.append(('<a class="sponsor" href="%s" target="_blank" rel="noopener">%s</a>' % (r["link"], inner)) if r.get("link")
                   else '<div class="sponsor">%s</div>' % inner)
    return ('<div class="sponsors" data-render="sponsors">' + ''.join(out) +
            '</div><p class="footnote center mt-2">Trusted by leading brands in healthcare, fitness &amp; sports</p>')

TESTIMONIALS = [
    ("Partnering with Sports Sphere gave our brand meaningful visibility among students and sports enthusiasts. The engagement throughout the event exceeded our expectations.", "Sponsorship Partner", ORANGE),
    ("Sports Sphere delivered outstanding brand exposure through on-ground activations and digital promotions. The event was exceptionally organised, and our partnership generated strong engagement with our target audience.", "Brand Partner", BLUE),
    ("Competing at Sports Sphere was an incredible experience. The tournament was professionally organised, and every match reflected the spirit of sportsmanship and excellence.", "Student Athlete, MIT-WPU", GREEN),
]
def testimonials():
    return '<div class="quotes">' + ''.join('<figure class="quote reveal" data-delay="%d" style="--c:%s"><blockquote>%s</blockquote><figcaption>%s</figcaption></figure>'
                                         % (i, c, q, who) for i, (q, who, c) in enumerate(TESTIMONIALS)) + '</div>'

def event_rows(events):
    out = []
    for e in events:
        d, mth, _ = drange(e["start_d"], e["end_d"])
        link = e.get("register_link") or e.get("details_link")
        btn = ('<a class="btn btn-dark btn-sm" href="%s">%s</a>' % (link, "Register" if e.get("register_link") else "Details")) if link \
              else '<span class="soon">Registration opens soon</span>'
        out.append('<article class="event-row" style="--c:%s"><div class="event-date"><strong>%s</strong><span>%s</span></div>'
                   '<div class="event-info"><h3>%s</h3><p>%s</p></div><span class="pill">%s</span><span class="status"></span>%s</article>'
                   % (cname(e.get("colour")), d, mth, e["title"], e.get("description", ""), e.get("category", ""), btn))
    return "\n".join(out)

def news_html(limit=3):
    rows = sorted(read_csv("news"), key=lambda r: pdate(r.get("date")) or datetime.date.min, reverse=True)[:limit]
    out = []
    for r in rows:
        dd = pdate(r.get("date"))
        img = ('<div class="media"><img src="%s" alt="" loading="lazy"></div>' % r["image"]) if r.get("image") else \
              '<div class="media news-ph"><span>%s</span></div>' % (r.get("tag") or "News")
        body = img + '<div class="news-meta">%s<span>%s</span></div><h3>%s</h3><p>%s</p>' % (
            ('<span class="pill">%s</span>' % r["tag"]) if r.get("tag") else "", ("%d %s %d" % (dd.day, MON[dd.month - 1], dd.year)) if dd else "",
            r.get("title", ""), r.get("summary", ""))
        out.append(('<a class="news-card" href="%s" target="_blank" rel="noopener">%s</a>' % (r["link"], body)) if r.get("link") else '<article class="news-card">%s</article>' % body)
    return "".join(out), len(read_csv("news"))

def flagship_cards():
    return ('<div class="flagships">'
            '<a class="flag-card hoop reveal" href="events.html#hoop-it-up"><img src="assets/img/logo/hoop-it-up.webp" alt="Hoop It Up logo" width="200" height="179" loading="lazy">'
            '<div><span class="flag-date">' + date_of("Hoop It Up", "short") + '</span><h3>Hoop It Up</h3><p>Sports Sphere\'s premier intercollegiate basketball tournament and a tribute to National Sports Day.</p>'
            '<div class="flag-stats"><span><b>160+</b> teams</span><span><b>100+</b> matches</span></div><span class="link-arrow">Explore ' + ARROW + '</span></div></a>'
            '<a class="flag-card summit-card reveal" data-delay="1" href="events.html#summit"><div class="summit-mark"><small>MIT-WPU</small>SUMMIT<em>' + date_of("Sports Summit", "year") + '</em></div>'
            '<div><span class="flag-date">' + date_of("Sports Summit", "short") + '</span><h3>Sports Summit</h3><p>Our flagship national-level multi-sport event, built on the philosophy of Sports for Peace.</p>'
            '<div class="flag-stats"><span><b>National</b> reach</span><span><b>Multi-sport</b> format</span></div><span class="link-arrow">Explore ' + ARROW + '</span></div></a>'
            '</div>')

def ig_cards():
    return '<div class="ig-grid">' + ''.join(
        '<a class="ig-card reveal" data-delay="%d" href="%s" target="_blank" rel="noopener" style="--c:%s"><span class="fi">%s</span><div><b>@%s</b><h3>%s</h3><p>%s</p></div></a>'
        % (i, ig_url(h), c, I["ig"], h, name, d) for i, (h, name, d, c) in enumerate(IG)) + '</div>'

HONOURS = [  # public MIT-WPU news
    ("2026", "Double gold in chess", "MIT-WPU won gold in both the men's and women's chess events at the Vishwanath Sports Meet 2026.", YELLOW),
    ("2025", "Runners-up overall", "Second place overall at the Vishwanath Sports Meet 2025, against 5,000+ athletes from 140+ institutions.", ORANGE),
    ("2026", "Stars on the world stage", "Four MIT-WPU athletes were honoured at the Dronacharya Sports Complex inauguration for international achievements.", BLUE),
]
def honour_cards():
    return "\n".join('<article class="honour reveal" data-delay="%d" style="--c:%s"><span class="year">%s</span><div class="medal">%s</div><h3>%s</h3><p>%s</p></article>'
                     % (i, c, y, I["medal"], t, d) for i, (y, t, d, c) in enumerate(HONOURS))

def field(id_, label, inner, full=False):
    return '<div class="field%s"><label for="%s">%s</label>%s</div>' % (" full" if full else "", id_, label, inner)

# ================================================================= HOME
NEWS_HTML, NEWS_COUNT = news_html()
home = ('<section class="hero"><div class="container hero-grid"><div class="hero-copy">'
        '<span class="eyebrow reveal">MIT-WPU\'s Sports Management &amp; Event Platform</span>'
        '<h1 class="display reveal" data-delay="1">Fueling<br><span class="grad">passion.</span><br>Building<br><span class="grad-champ">champions.</span></h1>'
        '<p class="lead reveal" data-delay="2">Sports Sphere unites athletes, institutions and brands through the culture of collegiate sport, with professionally managed events all season long.</p>'
        '<div class="hero-actions reveal" data-delay="3"><a class="btn btn-primary" href="events.html">See the season ' + ARROW + '</a>'
        '<a class="btn btn-ghost" href="partner.html">Partner with us</a></div>'
        '<div class="chips reveal" data-delay="3">'
        '<span class="chip"><i style="background:' + YELLOW + '"></i><b>12</b>International players</span>'
        '<span class="chip"><i style="background:' + RED + '"></i><b>26</b>International medals</span>'
        '<span class="chip"><i style="background:' + BLUE + '"></i><b>160+</b>Teams at Hoop It Up</span></div></div>'
        '<div class="hero-visual reveal" data-delay="1"><div class="hero-logo">' + streaks("right") +
        '<img src="assets/img/logo/sports-sphere-logo.webp" fetchpriority="high" alt="Sports Sphere, MIT-WPU. Fueling passion, building champions. Student driven, uniting sports, creating legacies." width="617" height="617"></div></div>'
        '</div></section>\n'
        + TAPE +
        '<section class="section spot-section" data-spotlight-wrap hidden><div class="container" data-render="spotlight"></div></section>\n' +
        '\n<section class="section"><div class="container"><div class="split">'
        '<div><span class="eyebrow reveal">Who we are</span><h2 class="h2 reveal">More than<br><span class="grad">a game.</span></h2>'
        '<div class="prose mt-2 reveal"><p class="lead">Sports Sphere is MIT-WPU\'s official sports management platform, delivering professionally managed events that promote excellence, engagement and the spirit of sport.</p>'
        '<p>From selection trials to the national-level Sports Summit, we run a year-round calendar backed by state-of-the-art infrastructure and professional coaching, nurturing athletes through training and competition.</p></div>'
        '<a class="link-arrow mt-3 reveal" href="about.html">Our story ' + ARROW + '</a></div>'
        '<div class="media-wrap reveal" data-delay="1">' + streaks("right") + media("Match day · Sports Sphere photography", "tall slant", "camera", ORANGE) +
        '<div class="stamp"><strong>26</strong><span>International medals</span></div></div></div>'
        '<div class="values">' + value_cards() + '</div></div></section>\n'
        '<section class="section surface tight"><div class="container">' + stats_html() + '</div></section>\n'
        '<section class="section"><div class="container">' + head("Flagship events", "Our<br><span class='grad'>big stages</span>",
                                                                   '<a class="link-arrow reveal" href="events.html">Full season ' + ARROW + '</a>')
        + flagship_cards() + '</div></section>\n'
        '<section class="section surface"><div class="container">' + head("Season " + season_span(), "Next<br><span class='grad'>up</span>",
                                                                           '<a class="btn btn-ghost reveal" href="events.html#calendar">Full calendar ' + ARROW + '</a>')
        + '<div class="event-list" data-render="next" data-limit="4">' + event_rows([e for e in EVENTS if e["end_d"] >= BUILD_DAY][:4]) + '</div></div></section>\n'
        '<section class="section"><div class="container">' + head("Pick your sport", "Find your<br><span class='grad'>game.</span>",
                                                                   '<div class="reveal"><p class="lead">Ten sports across the Sports Sphere portfolio, with men\'s and women\'s events.</p><a class="link-arrow mt-2" href="sports.html">All sports ' + ARROW + '</a></div>')
        + '<div class="sports-grid">' + sport_cards(SPORTS[:8]) + '</div></div></section>\n'
        '<section class="section night"><div class="container on-dark">' + head("For brands", "Why partner<br><span class='grad'>with us</span>",
                                                                                 '<div class="reveal"><p class="lead">Put your brand at the heart of passion, performance and purpose.</p><a class="btn btn-primary mt-2" href="partner.html">Sponsorship packages ' + ARROW + '</a></div>')
        + '<div class="why-grid">' + why_cards() + '</div></div></section>\n'
        '<section class="section"><div class="container">' + head("Previous sponsors", "Trusted<br><span class='grad'>by</span>") + sponsor_strip() + '</div></section>\n'
        '<section class="section" data-news-wrap' + ('' if NEWS_COUNT >= 2 else ' hidden') + '><div class="container">' + head("Latest", "Fresh off<br><span class='grad'>the field</span>") + '<div class="news-grid" data-render="news" data-limit="3" data-min="2">' + NEWS_HTML + '</div></div></section>\n'
        '<section class="section cream"><div class="container">' + head("Follow the action", "Join us on<br><span class='grad'>Instagram</span>") + ig_cards() + '</div></section>\n'
        + cta())
page("index.html", "Home", "Sports Sphere is MIT-WPU's official sports management and event platform, home of Hoop It Up and the Sports Summit. Fueling passion, building champions.", home)

# ================================================================= ABOUT
about = (page_hero("About", "About us", "We are<br><span class='grad'>Sports Sphere.</span>",
                   "MIT-WPU's official sports management and event platform, uniting athletes, institutions and brands through the culture of collegiate sport.") +
         '<section class="section"><div class="container split">'
         '<div><span class="eyebrow reveal">Our story</span><h2 class="h2 reveal">Sport is in<br><span class="grad">our DNA</span></h2>'
         '<div class="prose mt-2 reveal"><p class="lead">MIT World Peace University is a leading multidisciplinary university committed to academic excellence and holistic student development.</p>'
         '<p>Sports Sphere is its official sports management platform. We deliver professionally managed events that promote excellence, engagement and the spirit of sport, from university selection trials to the national-level Sports Summit.</p>'
         '<p>Our athletes train year-round with state-of-the-art infrastructure and professional coaching. Today <strong>12 international players</strong> represent India across multiple sports, with <strong>26 international medals</strong> between them.</p></div></div>'
         '<div class="media-wrap reveal" data-delay="1">' + streaks("right") + media("Team photo", "tall slant", "camera", BLUE) + '<div class="stamp"><strong>12</strong><span>International players</span></div></div>'
         '</div></section>'
         '<section class="section night"><div class="container on-dark"><div class="vm">'
         '<div class="vm-card reveal" style="--c:' + YELLOW + '"><span class="fi">' + I["eye"] + '</span><span class="eyebrow">Our vision</span><p>To become India\'s leading university sports platform, fostering competitive excellence, encouraging holistic development, and building long-term partnerships with institutions and industry leaders.</p></div>'
         '<div class="vm-card reveal" data-delay="1" style="--c:' + GREEN + '"><span class="fi">' + I["target"] + '</span><span class="eyebrow">Our mission</span><p>To deliver professionally managed sporting events that celebrate talent, promote inclusivity, and strengthen the culture of sport in higher education, through innovation, collaboration and excellence.</p></div>'
         '</div></div></section>'
         '<section class="section"><div class="container">' + head("What drives us", "Three things<br><span class='grad'>we live by</span>") +
         '<div class="values">' + value_cards() + '</div></div></section>'
         '<section class="section surface"><div class="container split top"><div><span class="eyebrow reveal">Our edge</span>'
         '<h2 class="h2 reveal">What makes us<br><span class="grad">different</span></h2><p class="lead mt-2 reveal">A year-round portfolio of professionally managed events designed to inspire athletes, engage communities and create meaningful brand partnerships.</p></div>'
         '<ul class="feature-list">' + feature_items(DIFFERENT) + '</ul></div></section>'
         '<section class="section tight"><div class="container">' + stats_html() + '</div></section>'
         '<section class="section surface"><div class="container">' + head("Recent glory", "Hall of<br><span class='grad-champ'>fame</span>") +
         '<div class="honour-grid">' + honour_cards() + '</div></div></section>'
         '<section class="section cream"><div class="container">' + head("The people", "Leadership", '<p class="lead reveal">Sports Sphere core team profiles are coming soon.</p>') +
         '<div class="people">'
         '<div class="person reveal">' + media("Portrait", "", "users", YELLOW) + '<h3>Prof. Dr. Vishwanath D. Karad</h3><p>Founder &amp; Chief Patron, MAEER\'s MIT · President, MIT-WPU</p></div>'
         '<div class="person reveal" data-delay="1">' + media("Portrait", "", "users", ORANGE) + '<h3>Dr. Rahul V. Karad</h3><p>Executive President, MIT-WPU</p></div>'
         '<div class="person reveal" data-delay="2">' + media("Portrait", "", "users", BLUE) + '<h3>Dr. Popat Dhanve</h3><p>Director of Sports</p></div>'
         '<div class="person reveal" data-delay="3">' + media("Portrait", "", "users", GREEN) + '<h3>Mr. Vilas Kathure</h3><p>Department of Sports</p></div>'
         '</div></div></section>' + cta())
page("about.html", "About us", "About Sports Sphere, MIT-WPU's official sports management and event platform: our vision, mission, values and track record.", about)

# ================================================================= SPORTS
sports = (page_hero("Sports", "Sports list", "Find your<br><span class='grad'>game.</span>",
                    "Ten sports across the Sports Sphere event portfolio, with men's and women's competition. Pick yours.") +
          '<section class="section"><div class="container">'
          '<div class="filters" data-filter-group="#sports-list" role="group" aria-label="Filter sports">'
          '<button class="filter-btn" data-filter="all" aria-pressed="true">All</button><button class="filter-btn" data-filter="team" aria-pressed="false">Team</button>'
          '<button class="filter-btn" data-filter="individual" aria-pressed="false">Individual</button><button class="filter-btn" data-filter="mind" aria-pressed="false">Mind &amp; e-sports</button>'
          '<button class="filter-btn" data-filter="women" aria-pressed="false">Women\'s events</button></div>'
          '<h2 class="visually-hidden">All sports</h2><div class="sports-grid" id="sports-list">' + sport_cards(SPORTS, True) + '</div>'
          '<p class="footnote mt-2">M = men\'s, W = women\'s. E-Sports titles are announced per event.</p></div></section>'
          '<section class="section cream" id="venues"><div class="container">' + head("Where we play", "Built for<br><span class='grad'>champions</span>",
                                                                                       '<p class="lead reveal">State-of-the-art sports infrastructure with professional coaching, nurturing athletes through year-round training and competitions.</p>') +
          '<div class="gallery">' + media("Dronacharya Sports Complex", "g-wide g-tall", "camera", BLUE) + media("Basketball courts", "", "camera", ORANGE) +
          media("Football ground", "", "camera", GREEN) + media("Swimming pool", "g-wide", "camera", RED) + '</div></div></section>'
          '<section class="section" id="join"><div class="container split top"><div><span class="eyebrow reveal">Get in the game</span>'
          '<h2 class="h2 reveal">How to make<br><span class="grad">the team</span></h2><p class="lead mt-2 reveal">Selection trials for the university teams run at the start of every season (usually in August). Check the calendar for the dates and the registration form.</p>'
          '<a class="btn btn-primary mt-3 reveal" href="events.html#calendar">See trial dates ' + ARROW + '</a></div>'
          '<div class="faq reveal" data-delay="1">'
          '<details open><summary>Who can try out?</summary><p>Every enrolled MIT-WPU student, from any faculty, programme or year.</p></details>'
          '<details><summary>Can other colleges take part?</summary><p>Yes. Hoop It Up and the Sports Summit are intercollegiate events that bring in teams from across the state and the country.</p></details>'
          '<details><summary>What happens after selection?</summary><p>Selected athletes join the Athlete Induction Programme, then train and compete for MIT-WPU through the season.</p></details>'
          '<details><summary>Are there women\'s events?</summary><p>Yes. Football, basketball, volleyball, badminton and table tennis all run men\'s and women\'s competition, and there\'s a dedicated women\'s wrestling championship.</p></details>'
          '</div></div></section>' + cta())
page("sports.html", "Sports", "The sports covered by Sports Sphere at MIT-WPU: football, cricket, basketball, volleyball, kabaddi, swimming, badminton, table tennis, chess and e-sports.", sports)

# ================================================================= EVENTS
events = (page_hero("Events", "Season " + season_span(), "Game<br><span class='grad'>on.</span>",
                    "A year-round portfolio of professionally managed sporting events, designed to inspire athletes, engage communities and create meaningful brand partnerships.") +
          '<section class="section" id="hoop-it-up"><div class="container"><article class="hoop-feature reveal">'
          '<div class="hoop-logo"><img src="assets/img/logo/hoop-it-up.webp" alt="MIT-WPU Hoop It Up, Inter University Basketball Championship" width="400" height="357"></div>'
          '<div class="hoop-body on-dark"><span class="eyebrow">Flagship · ' + date_of("Hoop It Up") + '</span><h2 class="h1">Hoop It Up</h2>'
          '<p class="sub">Invitational State-Level Basketball Tournament</p>'
          '<p>Hoop It Up began as a tribute to National Sports Day, celebrated on the birth anniversary of the legendary Indian hockey icon Major Dhyan Chand: a day to honour sportsmanship, dedication and athletic excellence.</p>'
          '<p>It has grown into a grand affair. It is now Sports Sphere\'s premier intercollegiate basketball tournament, with high-energy competition and a spectator experience that celebrates basketball culture on campus.</p>'
          '<div class="flag-stats big"><span><b>160+</b> teams</span><span><b>100+</b> matches</span></div>'
          '<div class="hero-actions"><a class="btn btn-primary" href="' + ig_url("hoopitup_mitwpu") + '" target="_blank" rel="noopener">@hoopitup_mitwpu ' + ARROW + '</a></div></div>'
          '</article></div></section>'
          '<section class="section" id="summit" style="padding-top:0"><div class="container"><article class="summit reveal"><div class="summit-body on-dark"><span class="eyebrow">Flagship · ' + date_of("Sports Summit") + '</span>'
          '<h2 class="h1">Sports Summit</h2><p class="lead">MIT-WPU Sports Summit is our flagship national-level sporting event, bringing together athletes, universities and colleges from across India. Built on the philosophy of <b>"Sports for Peace"</b>, it celebrates competition, teamwork, leadership and excellence.</p>'
          '<div class="summit-tags"><span>Sports for Peace</span><span>National reach</span><span>Multi-sport format</span><span>Brand visibility</span></div>'
          '<div class="hero-actions"><a class="btn btn-primary" href="' + ig_url("mitwpusummit") + '" target="_blank" rel="noopener">@mitwpusummit ' + ARROW + '</a>'
          '<a class="btn btn-ghost" href="partner.html">Sponsor the Summit</a></div></div>'
          '<div class="summit-side">' + streaks("right") + '<span class="big">' + date_of("Sports Summit", "year") + '</span><p>National level · Sports for Peace</p></div></article></div></section>'
          '<section class="section surface" id="calendar"><div class="container">' + head("Planning ahead", "Annual event<br><span class='grad'>calendar</span>",
                                                                                         '<p class="lead reveal">Every fixture of the season, from trials to World Yoga Day. Past seasons stay here as an archive.</p>') +
          '<div class="filters" data-render="season-tabs" role="group" aria-label="Choose season"></div>'
          '<div class="event-list" data-render="calendar">' + event_rows([e for e in EVENTS if e["season"] == CURRENT_SEASON]) + '</div></div></section>'
          '<section class="section" id="results" data-results-wrap><div class="container">' + head("Results", "Winners<br><span class='grad-champ'>board</span>", '<p class="lead reveal">Champions of every Sports Sphere event, season after season.</p>') + '<div class="results" data-render="results"><p class="empty">Winners are posted here after every event.</p></div></div></section>'
          '<section class="section surface" id="register"><div class="container split top"><div>'
          '<span class="eyebrow reveal">How to register</span><h2 class="h2 reveal">Three steps<br><span class="grad">to game day</span></h2>'
          '<p class="lead mt-2 reveal">When registration opens for an event, a <b>Register</b> button appears next to it in the calendar above. Registration details for each event are also shared on @sportssphere__mitwpu.</p>'
          '<a class="btn btn-primary mt-3 reveal" href="#calendar">See open events ' + ARROW + '</a></div>'
          '<ul class="feature-list">' + feature_items([("clipboard", "1. Find your event", "Pick an event in the calendar. If registration is open, you\'ll see a Register button.", ORANGE),
                                                       ("users", "2. Register and get verified", "The button opens the registration form for that event. Fill it in before registration closes.", BLUE),
                                                       ("trophy", "3. Get ready", "Watch for your confirmation, then follow @sportssphere__mitwpu for fixtures, results and live updates.", GREEN)]) + '</ul>'
          '</div></section>')
page("events.html", "Events", "Sports Sphere's season at MIT-WPU: Hoop It Up, the Sports Summit, interdepartmental sports, marathon, awards and more.", events)

# ================================================================= PARTNER
TIER_OPTS = "".join('<option>%s</option>' % t[0] for t in TIERS)
partner = (page_hero("Partner", "Sponsorship " + season_span(), "Partner<br><span class='grad'>with us.</span>",
                     "Align your brand with one of the country's most vibrant youth communities, with visibility across on-ground activations, digital platforms and media outreach.") +
           '<section class="section"><div class="container">' + head("The opportunity", "Why partner<br><span class='grad'>with us</span>",
                                                                       '<p class="lead reveal">Position your brand at the heart of passion, performance and purpose.</p>') +
           '<div class="why-grid light">' + why_cards() + '</div></div></section>'
           '<section class="section surface tight"><div class="container">' + stats_html() + '</div></section>'
           '<section class="section" id="tiers"><div class="container">' + head("Partnership tiers", "Sponsorship<br><span class='grad'>packages</span>",
                                                                                 '<p class="lead reveal">Six ways to partner, from a season-long co-host to a custom package built around your goals.</p>') +
           '<div class="tiers">' + tier_cards() + '</div></div></section>'
           '<section class="section surface"><div class="container">' + head("Compare", "Benefits<br><span class='grad'>at a glance</span>") + compare_table() + '</div></section>'
           '<section class="section"><div class="container">' + head("Track record", "Previous<br><span class='grad'>sponsors</span>") + sponsor_strip() + '</div></section>'
           '<section class="section cream"><div class="container">' + head("Testimonials", "What partners<br><span class='grad'>say</span>") + testimonials() + '</div></section>'
           '<section class="section" id="enquire"><div class="container split top"><div><span class="eyebrow reveal">Sponsorship enquiry</span>'
           '<h2 class="h2 reveal">Let\'s build<br><span class="grad">something big</span></h2><p class="lead mt-2 reveal">Tell us about your brand and goals. Our team will send the full sponsorship docket and set up a call.</p>'
           '<ul class="feature-list">' + feature_items([("trophy", "Flagship properties", "Hoop It Up and the national-level Sports Summit.", ORANGE),
                                                        ("chart", "Year-round visibility", "A full calendar of events, every season.", BLUE)]) + '</ul></div>'
           '<div class="form-card reveal" data-delay="1"><form class="form" data-validate novalidate data-subject="Sponsorship enquiry" data-pending="Thanks for your interest! Our enquiry inbox is being connected. In the meantime, message @sportssphere__mitwpu on Instagram and our partnerships team will get back to you.">'
           + field("p-name", "Your name", '<input id="p-name" name="name" type="text" autocomplete="name" required><span class="err">Please enter your name.</span>')
           + field("p-company", "Company / Brand", '<input id="p-company" name="company" type="text" autocomplete="organization" required><span class="err">Please enter your company.</span>')
           + field("p-email", "Work email", '<input id="p-email" name="email" type="email" autocomplete="email" required><span class="err">Please enter a valid email.</span>')
           + field("p-phone", "Phone", '<input id="p-phone" name="phone" type="tel" autocomplete="tel" pattern="[0-9+ ]{10,15}" required><span class="err">Please enter a valid phone number.</span>')
           + field("p-tier", "Package of interest", '<select id="p-tier" name="tier" required><option value="">Choose a package</option>' + TIER_OPTS + '<option>Not sure yet</option></select><span class="err">Please choose a package.</span>', True)
           + field("p-msg", "Your goals (optional)", '<textarea id="p-msg" name="message"></textarea>', True) +
           '<button class="btn btn-primary" type="submit">Send enquiry ' + ARROW + '</button>'
           '<div class="form-success" role="status">Thank you! Our partnerships team will be in touch shortly.</div>'
           '</form></div></div></section>')
page("partner.html", "Partner with us", "Sponsor Sports Sphere at MIT-WPU. Packages from Rs 20,000 to Rs 5,00,000 across Hoop It Up, the Sports Summit and more.", partner)

# ================================================================= CONTACT
contact = (page_hero("Contact", "Get in touch", "Let's talk<br><span class='grad'>sport.</span>",
                     "Questions about events, registrations or sponsorship? Drop us a line or find us on Instagram.") +
           '<section class="section"><div class="container split top"><div>'
           '<span class="eyebrow reveal">Find us</span><h2 class="h2 reveal">Come say<br><span class="grad">hello</span></h2><div class="contact-list">'
           '<div class="contact-item reveal" style="--c:' + ORANGE + '"><span class="fi">' + I["pin"] + '</span><div><span>Institution</span><p>MIT World Peace University, S. No. 124, Paud Road, Kothrud, Pune 411038</p></div></div>'
           + ''.join('<div class="contact-item reveal" style="--c:%s"><span class="fi">%s</span><div><span>Instagram · %s</span><a href="%s" target="_blank" rel="noopener">@%s</a></div></div>'
                     % (c, I["ig"], name, ig_url(h), h) for h, name, _, c in IG) +
           '<!-- TODO: official Sports Sphere email and phone (docket leaves them blank) -->'
           '<div class="contact-item reveal" style="--c:' + GREEN + '"><span class="fi">' + I["mail"] + '</span><div><span>Email</span><p data-render="email">Coming soon</p></div></div>'
           '</div></div>'
           '<div class="form-card reveal" data-delay="1"><h3 class="h3" style="margin-bottom:22px">Send us a message</h3><form class="form" data-validate novalidate data-subject="Website message" data-pending="Thanks! Our contact inbox is being connected. In the meantime, message @sportssphere__mitwpu on Instagram and we will reply there.">'
           + field("c-name", "Full name", '<input id="c-name" name="name" type="text" autocomplete="name" required><span class="err">Please enter your name.</span>')
           + field("c-email", "Email", '<input id="c-email" name="email" type="email" autocomplete="email" required><span class="err">Please enter a valid email.</span>')
           + field("c-topic", "Topic", '<select id="c-topic" name="topic" required><option value="">Choose a topic</option><option>Event registration</option><option>Joining Sports Sphere</option><option>Hoop It Up</option><option>Sports Summit</option><option>Sponsorship &amp; partnerships</option><option>Media &amp; press</option><option>Something else</option></select><span class="err">Please choose a topic.</span>', True)
           + field("c-msg", "Message", '<textarea id="c-msg" name="message" required></textarea><span class="err">Please write a message.</span>', True) +
           '<button class="btn btn-primary" type="submit">Send it ' + ARROW + '</button>'
           '<div class="form-success" role="status">Message received. We\'ll get back to you soon.</div></form></div>'
           '</div></section>'
           '<section class="section" style="padding-top:0"><div class="container reveal"><iframe class="map-frame" title="Map: MIT World Peace University, Kothrud, Pune" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=MIT+World+Peace+University,+Kothrud,+Pune&amp;output=embed"></iframe></div></section>')
page("contact.html", "Contact", "Contact Sports Sphere at MIT World Peace University, Pune: events, registrations and sponsorship.", contact)

# ================================================================= JOIN
# "Join Sports Sphere": for students who want to be part of the team behind the games (not athletes:
# athletes register for each tournament from the events calendar). Separate from the tournament platform.
# PROVISIONAL: the list of teams below is a placeholder until the Sports Office confirms who can join and how.
JOIN_AREAS = [
    ("clipboard", "Event management", "Plan and run match days: schedules, venues, registration desks and teams on the ground.", ORANGE),
    ("camera", "Media &amp; photography", "Shoot photos and video at events and build the season's highlights.", RED),
    ("eye", "Design &amp; content", "Posters, social posts, certificates and event branding.", BLUE),
    ("megaphone", "Social media &amp; marketing", "Run our Instagram, promote events and grow the community.", GREEN),
    ("handshake", "Sponsorship &amp; partnerships", "Pitch to brands and look after our sponsors during the season.", ORANGE),
    ("users", "Event volunteer", "Help out at a single event, with no season-long commitment.", BLUE),
]
JOIN_PENDING = ("Thanks! Applications aren't being collected online yet, so this form hasn't been sent anywhere. "
                "Please message @sportssphere__mitwpu on Instagram with your name and the team you'd like to join, and we'll get back to you.")
YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Postgraduate", "Other"]

join = (page_hero("Join", "Join Sports Sphere", "Be part of<br><span class='grad'>the team.</span>",
                  "Not on the field? Sports Sphere runs on students who organise, film, design and host. Join the team behind the games.") +
        '<section class="section"><div class="container">' + head("Ways to get involved", "Find your<br><span class='grad'>role</span>",
                                                                  '<p class="lead reveal">Choose the team that suits you. No experience needed for most roles, just energy and time.</p>') +
        '<div class="why-grid light">' + "".join('<div class="why reveal" data-delay="%d" style="--c:%s"><span class="fi">%s</span><h3>%s</h3><p>%s</p></div>'
                                                  % (i % 3, c, I[ic], t, d) for i, (ic, t, d, c) in enumerate(JOIN_AREAS)) + '</div></div></section>'
        '<section class="section surface" id="apply"><div class="container split top"><div>'
        '<span class="eyebrow reveal">How it works</span><h2 class="h2 reveal">Three steps<br><span class="grad">to the team</span></h2>'
        '<ul class="feature-list">' + feature_items([("clipboard", "1. Apply", "Fill in the form. It takes about two minutes.", ORANGE),
                                                     ("mail", "2. Hear back", "The Sports Sphere team reviews applications and contacts you by email or phone.", BLUE),
                                                     ("flag", "3. Get started", "Meet the team and help out at your first event.", GREEN)]) + '</ul>'
        '<div class="note-card reveal"><h3>Want to compete?</h3><p>This form is for the team behind the games. Athletes register for each tournament separately, from the '
        '<a href="events.html#calendar">events calendar</a>.</p></div></div>'
        '<div class="form-card reveal" data-delay="1"><h3 class="h3" style="margin-bottom:22px">Apply to join</h3>'
        '<form class="form" data-validate novalidate data-subject="Join Sports Sphere application" data-pending="' + JOIN_PENDING + '">'
        + field("j-name", "Full name", '<input id="j-name" name="name" type="text" autocomplete="name" required><span class="err">Please enter your name.</span>')
        + field("j-email", "Email", '<input id="j-email" name="email" type="email" autocomplete="email" required><span class="err">Please enter a valid email.</span>')
        + field("j-phone", "Mobile number", '<input id="j-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" pattern="[+]?[0-9 ]{10,15}" required><span class="err">Please enter a 10-digit mobile number.</span>')
        + field("j-prn", "PRN (optional)", '<input id="j-prn" name="prn" type="text" inputmode="numeric" autocomplete="off">')
        + field("j-inst", "School and programme", '<input id="j-inst" name="programme" type="text" placeholder="e.g. B.Tech, Computer Engg." required><span class="err">Please enter your school and programme.</span>')
        + field("j-year", "Year of study", '<select id="j-year" name="year" required><option value="">Choose your year</option>' + "".join("<option>%s</option>" % y for y in YEARS) + '</select><span class="err">Please choose your year.</span>')
        + field("j-area", "Team you'd like to join", '<select id="j-area" name="team" required><option value="">Choose a team</option>' + "".join("<option>%s</option>" % t for _, t, _, _ in JOIN_AREAS) + '<option>Not sure yet</option></select><span class="err">Please choose a team.</span>', True)
        + field("j-msg", "About you", '<textarea id="j-msg" name="about" placeholder="Your skills, past experience, or why you want to join." required></textarea><span class="err">Please tell us a little about yourself.</span>', True) +
        '<div class="field full check"><div class="check-row"><input id="j-consent" name="consent" type="checkbox" value="Yes" required>'
        '<label for="j-consent">Sports Sphere may contact me about this application.</label></div><span class="err">Please tick this so we can contact you.</span></div>'
        '<button class="btn btn-primary" type="submit">Send application ' + ARROW + '</button>'
        '<div class="form-success" role="status">Application received. We\'ll be in touch soon.</div></form></div>'
        '</div></section>')
page("join.html", "Join Sports Sphere", "Join the student team behind Sports Sphere at MIT-WPU: event management, media, design, marketing, sponsorship and volunteering.", join)

# Remove pages that no longer exist
old = os.path.join(ROOT, "achievements.html")
if os.path.exists(old):
    os.remove(old)

print("Built 7 pages in", ROOT)
