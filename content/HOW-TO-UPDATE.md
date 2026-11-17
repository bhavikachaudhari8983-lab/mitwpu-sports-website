# How to update the Sports Sphere website

You don't need to know any code. Everything that changes during the year lives in **one Google Sheet**. Change the sheet, refresh the website, and the change is live.

---

## One-time setup (done once by whoever manages the website)

1. Create a new Google Sheet called **Sports Sphere Website**.
2. Make 6 tabs, named exactly: `events`, `stats`, `sponsors`, `news`, `results`, `settings`.
3. Into each tab, import the matching file from this `content` folder (**File → Import → Upload → Replace current sheet**).
4. Click **Share → General access → Anyone with the link → Viewer**.
5. Copy the long code from the sheet's address (the part between `/d/` and `/edit`) and paste it into `assets/js/config.js`:
   ```
   sheetId: "PASTE-THE-CODE-HERE"
   ```

From then on, the website reads the sheet directly.

> Until this is done, the website reads the `.csv` files in this folder. You can edit those instead, in Excel or Google Sheets, and upload them again.

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

### 📰 Post news (`news` tab)

| date | title | summary | tag | image | link |
|---|---|---|---|---|---|
| 2027-09-01 | Hoop It Up 2027 is a wrap | 180 teams, 4 days, one champion. | Results | | (Instagram post link) |

The latest 3 appear on the home page once there are at least 2 posts.

### 🔗 Registration portal (`settings` tab, set once)

**Not in use yet: leave this empty until the registration portal is linked.** Later, write the registration portal's web address in `registration_portal` (for example `https://register.sportssphere.mitwpu.edu.in`). Every **Register** button on the website then opens the portal, events marked `portal` link to it, and a **Check my registration** link appears in the footer. Leave it empty and the Register buttons go to the events calendar instead.

### 📣 Announcement bar (`settings` tab)

- Write a message in `announcement_text` (and optionally a link in `announcement_link`). It shows at the top of every page.
- Leave it **empty**, and the bar automatically shows the next upcoming event.

### Other tabs

- **stats:** the big numbers (international players, medals, teams…). Update them each year.
- **sponsors:** add each season's sponsors. Put a logo image link in `logo` if you have one.
- **settings → contact_email:** once you add an email here, the Contact and Sponsorship forms send messages to it.

---

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
