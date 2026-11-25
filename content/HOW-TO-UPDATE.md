# How to update the MIT-WPU Department of Sports website

You don't need to know any code. Everything that changes during the year lives in **one Google Sheet**. Change the sheet, refresh the website, and the change is live.

---

## One-time setup (done once by whoever manages the website, about 10 minutes)

You'll have a ready-made file: **MITWPU-Sports-Website-Content.xlsx**. It already has all 14 tabs (`events`, `news`, `sports`, `achievements`, `people`, `teams`, `facilities`, `gallery`, `faq`, `downloads`, `results`, `sponsors`, `stats`, `settings`), the current content, dropdowns for fixed choices, and a note on every column heading. (A developer can rebuild it at any time with `python3 tools/make_sheet_template.py`.)

1. Open **Google Drive → New → File upload** and upload `MITWPU-Sports-Website-Content.xlsx`.
2. Open it, then **File → Save as Google Sheets**. Use the new Google Sheets copy from now on.
3. **Share → General access → Anyone with the link → Viewer.** (The website reads the sheet through this link.)
4. Still in **Share**, add the Sports Office staff who will update the site as **Editors**. Only editors can change the website.
5. Copy the long code from the sheet's address (the part between `/d/` and `/edit`) and send it to the developer, who pastes it into `assets/js/config.js` and redeploys once:
   ```
   sheetId: "PASTE-THE-CODE-HERE"
   ```

From then on the website reads the sheet directly: edit, save, refresh the website.

> ⚠️ **Privacy:** anyone with the sheet's link can read it, because the website needs that. Never put private information in it: no student phone numbers, emails, ID numbers or dates of birth. Keep those in the registration system.

> Until the sheet is connected, the website reads the `.csv` files in this folder.

---

## Everyday updates

### ➕ Add an event (`events` tab), one row per event

| Column | What to write | Example |
|---|---|---|
| season | The season it belongs to | `2027-28` |
| title | Event name | `Hoop It Up` |
| start | First day, as **YYYY-MM-DD** | `2027-08-27` |
| end | Last day (same as start if one day) | `2027-08-30` |
| category | Short label | `Flagship` |
| description | One line about it | `Invitational basketball tournament` |
| flagship | `yes` for big events (they get the home-page spotlight earlier) | `yes` |
| colour | `yellow`, `orange`, `red`, `blue` or `green` | `orange` |
| register_link | When registration opens, paste the registration form link (e.g. a Google Form). (`portal` is for later, once the registration portal is linked.) | `https://forms.gle/…` |
| details_link | Optional page or post with more info | `events.html#hoop-it-up` |
| image | Optional logo or poster link | |

💡 **Tip:** in Google Sheets, select the start and end columns and choose **Format → Number → Plain text** so dates stay as `2027-08-27`.

- **Registration opens:** paste the form link in `register_link`. A **Register** button appears instantly.
- **Registration closes:** delete the link. The button changes to "Registration opens soon". Once the event's date has passed, the button disappears completely.

### 🏆 After an event: add the winners (`results` tab)

| season | event | sport | winner | runner_up | notes |
|---|---|---|---|---|---|
| 2027-28 | Hoop It Up | Basketball (Men) | MIT-WPU | COEP | Final score 72–65 |

They appear on the **Winners board** on the Events page.

### 📰 News and notices (`news` tab)

One tab holds two kinds of post, set in the **kind** column:

- **`notice`**: short and official: selection trials, circulars, schedule changes. Shown on the **Notice board** (News page and home page).
- **`story`** (or empty): event write-ups, results, achievements, press coverage. Shown as cards; the newest appear on the home page.

| date | kind | tag | title | summary | body | image | link | attachment | deadline | pinned | event | sport |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2027-07-20 | notice | Selection trials | Basketball trials: register by 5 Aug | Trials for the men's and women's teams | | | | Circular PDF link | 2027-08-05 | yes | Selection Trials | basketball |
| 2027-09-01 | story | Results | Hoop It Up 2027 is a wrap | 180 teams, 4 days, one champion | The full write-up. Start a new line for each paragraph. | Photo link | Instagram post | | | | Hoop It Up | basketball |

- **tag** is the type shown on the coloured label (Selection trials, Circular, Schedule change, Results, Achievement, Event update, Media…). Stories can be filtered by it.
- **deadline**: the notice shows "Closes in 3 days" (red when it's close) and moves to **Past notices** by itself after that date.
- **pinned** = `yes`: a notice stays at the top of the board; a story becomes the big **featured** story on the News page. A pinned notice, or one closing within 14 days, also appears in the announcement bar at the top of every page.
- Posts from the last 7 days get a **New** badge automatically.
- **attachment**: a link to the circular PDF (Google Drive share link works) adds a **Download** button.
- **event** / **sport**: write the event's title (as in `events`) or the sport's slug, and the post also appears on that event's or sport's page.
- Every post gets its own page with a **WhatsApp share** button. If you leave **body** empty, the page shows the summary and a "Read the full story" button to the **link**.

### 🔗 Registration portal (`settings` tab, set once)

**Not in use yet: leave this empty until the registration portal is linked.** Later, write the registration portal's web address in `registration_portal` (for example `https://mitwpu-sports-platform.vercel.app`). Every **Register** button on the website then opens the portal, events marked `portal` link to it, and a **Check my registration** link appears in the footer. Leave it empty and the Register buttons go to the events calendar instead.

### 📣 Announcement bar (`settings` tab)

- Write a message in `announcement_text` (and optionally a link in `announcement_link`). It shows at the top of every page.
- Leave it **empty**, and the bar automatically shows the next upcoming event.

### Other tabs

- **stats:** the big numbers (international players, medals, teams…). Update them each year.
- **sponsors:** add each season's sponsors. Put a logo image link in `logo` if you have one.
- **settings → contact_email:** once you add an email here, the Contact and Sponsorship forms send messages to it.

---

### 🟢 Status column (every tab)

Every tab has a **status** column:

| status | What happens |
|---|---|
| *(empty)* or `published` | Shown everywhere |
| `draft` | Hidden everywhere: use it while you're still writing something |
| `archived` | Kept on its own page (the archive), but no longer on the home page |

Never delete old rows: archive them instead, so the site keeps its history.

### 🏅 Sports (`sports` tab)

| slug | name | category | gender | women | icon | summary | about | training | venue |
|---|---|---|---|---|---|---|---|---|---|
| `basketball` | Basketball | `team` | M & W | `yes` | `basketball` | One line for the card | A paragraph for the sport's own page | Training timings and coach | The facility's slug, e.g. `dronacharya-sports-complex` |

- **category**: `team`, `individual` or `mind` (used by the filter buttons).
- **icon**: one of football, cricket, basketball, volleyball, kabaddi, swimming, badminton, tabletennis, chess, esports, medal, trophy.
- Each sport gets its own page automatically (for example `sport.html?s=basketball`), showing its teams, coaches, venue, achievements, events and photos.
- Until **about** and **training** are filled in, the sport's page says "Awaiting confirmation" in those places.

### 🏆 Achievements (`achievements` tab)

| year | date | sport | title | level | type | winner | competition | description | image | link |
|---|---|---|---|---|---|---|---|---|---|---|
| 2027 | 2027-02-10 | Chess | Gold at the AIU Chess Championship | National | Team | MIT-WPU women's chess team | AIU West Zone | One or two sentences | Photo link | News link |

The Achievements page can be filtered by sport, year and level. The newest three appear on the home page. **Only add achievements the Sports Office has confirmed.**

### 👥 People (`people` tab): leadership, Sports Office team, coaches, athletes

| name | role | group | sport | bio | photo | order |
|---|---|---|---|---|---|---|
| Dr. A. B. Example | Head Coach | `coach` | Basketball | Short bio | Photo link | 1 |

- **group** decides where the person appears: `leadership` and `coordinator` / `core team` → About page; `coach` and `athlete` → Teams & coaches page and the sport's page.
- **order** sorts people within a group (1 first).
- Publish athlete profiles **only with the athlete's permission**.

### 🛡️ Teams (`teams` tab)

| sport | name | gender | captain | coach | description | achievements | photo |
|---|---|---|---|---|---|---|---|
| basketball | MIT-WPU Men's Basketball | Men | (name) | (name) | One line | Gold, West Zone 2027; Runners-up, Hoop It Up 2026 | Team photo link |

Separate several achievements with `;`. Teams appear on the Teams page, the sport's page and the home page.

### 🏟️ Facilities (`facilities` tab)

| slug | name | type | sports | description | location | features | guidelines | photo | map_link |
|---|---|---|---|---|---|---|---|---|---|
| dronacharya-sports-complex | Dronacharya Sports Complex | Sports complex | Basketball; Badminton | A paragraph | Address | Floodlights; Changing rooms | Sports shoes only; Book through the Sports Office | Photo link | Google Maps link |

Separate items in **sports**, **features** and **guidelines** with `;`.

### 📸 Gallery (`gallery` tab)

| title | type | url | thumbnail | sport | event | season | date | caption |
|---|---|---|---|---|---|---|---|---|
| Hoop It Up final | `photo` | Photo link | | Basketball | Hoop It Up | 2026-27 | 2026-08-31 | Short caption |
| Summit highlights | `video` | YouTube link | | | Sports Summit | 2026-27 | | |

- **Photos:** a Google Drive share link works (set the file to "Anyone with the link can view"), as does any direct image link.
- **Videos:** paste a YouTube link; the thumbnail is fetched automatically.
- Write the **event** exactly as it's written in the `events` tab, so the photos also show on that event's page.

### ❓ FAQ (`faq` tab)

| question | answer | category | order |
|---|---|---|---|
| How do I book a court? | Book through the Sports Office… | Facilities | 1 |

Questions appear on the FAQ page grouped by **category**, and the `Trials & teams` ones also on the Sports page. **Only add answers the Sports Office has confirmed.**

### 📄 Downloads (`downloads` tab)

| title | category | file | date | description |
|---|---|---|---|---|
| Hoop It Up 2027 rulebook | Rulebook | PDF link (Google Drive share link works) | 2027-07-01 | Rules, eligibility and format |

Files appear on the FAQ & downloads page. For a notice with a deadline, use the `attachment` column in `news` instead.

### 📅 Extra event columns

`events` also has **sport** (the sport's slug, e.g. `basketball`), **venue** and **about** (a longer write-up for the event's own page). Every event gets its own page automatically, with its results and photos.

## What updates by itself (no action needed)

- Events are marked **Completed**, **Happening now**, **Next up** or **Upcoming** based on today's date.
- The home page **spotlight with a countdown** switches to the next big event automatically. During the event it shows **"Happening now"**.
- The **season** shown across the site (for example "Season 2027–28") follows your events.
- Each **past season** gets its own tab in the calendar, so the website builds an archive over the years.
- The event dates shown on the Hoop It Up and Summit sections update to that year's dates.

## Checking how the site will look on a future date

Add `?preview-date=2027-08-25` to the end of any page address, for example
`https://yourwebsite/index.html?preview-date=2027-08-25`

## Starting a new season (once a year, about 15 minutes)

1. Add the new season's events in `events` (season = `2027-28`).
2. Update `stats` and `sponsors`.
3. Paste the form link in `register_link` as registrations open.
4. Add results and news as the season goes on.

Old seasons stay in the sheet, so don't delete them. They become the archive.
