"""
Builds the Google Sheet template for the MIT-WPU Department of Sports website from the current /content tables.

    python3 tools/make_sheet_template.py  [output.xlsx]

Needs openpyxl (pip install openpyxl). The Sports Office imports the .xlsx into Google Sheets once
(see content/HOW-TO-UPDATE.md, "Setting up the Google Sheet"). Every tab keeps the exact name and
column headings the website reads, every cell is plain text (so dates stay 2027-08-27), and the
columns with fixed choices have dropdowns.
"""
import csv, os, sys
from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "MITWPU-Sports-Website-Content.xlsx")
ROWS = 400  # rows prepared with text format and dropdowns

NAVY, CREAM = "11468F", "FFF6E6"  # MIT-WPU Navy Blue, peach tint
STATUS = ["published", "draft", "archived"]
COLOURS = ["yellow", "orange", "red", "blue", "green"]
ICONS = ["football", "cricket", "basketball", "volleyball", "kabaddi", "swimming", "badminton", "tabletennis", "chess", "esports", "medal", "trophy"]

# tab: (help for the tab, {column: help}, {column: (choices, strict)})
TABS = {
    "events": ("One row per event. The calendar, home page, event pages and countdown all read this tab.", {
        "season": "Academic season, e.g. 2027-28", "title": "Event name", "start": "First day, YYYY-MM-DD", "end": "Last day, YYYY-MM-DD (same as start if one day)",
        "category": "Short label, e.g. Flagship, Trials, Campus", "description": "One line about the event", "flagship": "yes for big events",
        "colour": "Accent colour", "register_link": "Registration form link when registration opens; empty when closed",
        "details_link": "Optional page or post with more info", "image": "Optional logo/poster link", "sport": "Sport slug, e.g. basketball",
        "venue": "Where it happens", "about": "Longer write-up for the event page", "status": "published / draft / archived"},
        {"flagship": (["yes", "no"], True), "colour": (COLOURS, True), "status": (STATUS, True)}),
    "news": ("News and notices. kind = notice (notice board) or story (news cards with their own page).", {
        "date": "YYYY-MM-DD", "kind": "notice or story", "tag": "Type label, e.g. Selection trials, Circular, Results",
        "title": "Headline", "summary": "One or two sentences", "body": "Full text; start a new line for each paragraph",
        "image": "Photo link (Google Drive share link works)", "link": "Optional original post / press link",
        "attachment": "Circular PDF link", "deadline": "YYYY-MM-DD; notice moves to Past notices after this",
        "pinned": "yes = top of the notice board / featured story", "event": "Event title as in the events tab",
        "sport": "Sport slug", "slug": "Leave empty (made automatically)", "status": "published / draft / archived"},
        {"kind": (["notice", "story"], True), "pinned": (["yes", "no"], True), "status": (STATUS, True),
         "tag": (["Selection trials", "Circular", "Notice", "Schedule change", "Event update", "Results", "Achievement", "Media", "Venue"], False)}),
    "sports": ("Sports list. Each sport gets its own page (sport.html?s=slug).", {
        "slug": "Short id, lowercase, e.g. table-tennis", "name": "Display name", "category": "team / individual / mind",
        "gender": "Label on the card, e.g. M & W", "women": "yes if there are women's events", "icon": "Icon name",
        "summary": "One line for the card", "about": "Paragraph for the sport page", "training": "Training timings and coach",
        "venue": "Facility slug, e.g. dronacharya-sports-complex", "status": "published / draft / archived"},
        {"category": (["team", "individual", "mind"], True), "women": (["yes", "no"], True), "icon": (ICONS, True), "status": (STATUS, True)}),
    "achievements": ("Only achievements confirmed by the Sports Office.", {
        "year": "e.g. 2027", "date": "Optional, YYYY-MM-DD", "sport": "Sport name, or Multi-sport", "title": "Short headline",
        "level": "International / National / State / Zonal / University", "type": "Team or Individual", "winner": "Team or athlete names",
        "competition": "Competition name", "description": "One or two sentences", "image": "Photo link", "link": "News/source link",
        "status": "published / draft / archived"},
        {"level": (["International", "National", "State", "Zonal", "University"], False), "type": (["Team", "Individual"], True), "status": (STATUS, True)}),
    "people": ("Leadership, Sports Office team, coaches and athletes. Publish athlete profiles only with the athlete's permission.", {
        "name": "Full name", "role": "Designation", "group": "Where they appear", "sport": "Sport (for coaches/athletes)",
        "bio": "Short bio", "photo": "Photo link", "order": "1 = first within the group", "status": "published / draft / archived"},
        {"group": (["leadership", "coordinator", "core team", "coach", "athlete"], True), "status": (STATUS, True)}),
    "teams": ("Official university teams.", {
        "sport": "Sport slug", "name": "Team name", "gender": "Men / Women / Mixed", "captain": "Captain's name", "coach": "Coach's name",
        "description": "One line", "achievements": "Separate with ;", "photo": "Team photo link", "status": "published / draft / archived"},
        {"gender": (["Men", "Women", "Mixed"], False), "status": (STATUS, True)}),
    "facilities": ("Sports venues.", {
        "slug": "Short id, e.g. dronacharya-sports-complex", "name": "Venue name", "type": "e.g. Sports complex, Indoor hall",
        "sports": "Separate with ;", "description": "Paragraph", "location": "Address / campus location", "features": "Separate with ;",
        "guidelines": "Rules for using it, separate with ;", "photo": "Photo link", "map_link": "Google Maps link", "status": "published / draft / archived"},
        {"status": (STATUS, True)}),
    "gallery": ("Photos (Google Drive share links work) and videos (YouTube links).", {
        "title": "Caption title", "type": "photo or video", "url": "Photo or YouTube link", "thumbnail": "Optional; YouTube thumbnails are automatic",
        "sport": "Sport name", "event": "Event title as in the events tab", "season": "e.g. 2026-27", "date": "YYYY-MM-DD",
        "caption": "Short caption", "status": "published / draft / archived"},
        {"type": (["photo", "video"], True), "status": (STATUS, True)}),
    "faq": ("Questions and answers on the FAQ page. Only answers the Sports Office has confirmed.", {
        "question": "The question", "answer": "The answer", "category": "Group heading, e.g. Trials & teams, Events, Joining, Contact",
        "order": "1 = first within the category", "status": "published / draft / archived"},
        {"category": (["Trials & teams", "Events", "Joining", "Facilities", "Certificates", "Contact"], False), "status": (STATUS, True)}),
    "downloads": ("Files on the FAQ & downloads page: rulebooks, circulars, forms. Link to a PDF (Google Drive share link works).", {
        "title": "File name shown on the site", "category": "e.g. Rulebook, Circular, Form", "file": "Link to the file",
        "date": "YYYY-MM-DD", "description": "Optional one line", "status": "published / draft / archived"},
        {"category": (["Rulebook", "Circular", "Form", "Schedule", "Other"], False), "status": (STATUS, True)}),
    "results": ("Winners of MIT-WPU events (Winners board and event pages).", {
        "season": "e.g. 2026-27", "event": "Event title as in the events tab", "sport": "e.g. Basketball (Men)", "winner": "Winner",
        "runner_up": "Runner-up", "notes": "e.g. final score", "status": "published / draft / archived"},
        {"status": (STATUS, True)}),
    "sponsors": ("Sponsors shown on the home and partner pages.", {
        "name": "Sponsor name", "tagline": "Short line under the name", "logo": "Logo image link", "link": "Sponsor website", "status": "published / draft / archived"},
        {"status": (STATUS, True)}),
    "stats": ("The big numbers. Update once a season.", {
        "value": "Number", "suffix": "e.g. +", "label": "What it counts", "colour": "Accent colour"},
        {"colour": (COLOURS, True)}),
    "settings": ("Site settings: one value per row. Don't rename the keys.", {
        "key": "Setting name (don't change)", "value": "Value"}, {}),
}


def read_csv(name):
    path = os.path.join(ROOT, "content", name + ".csv")
    with open(path, newline="", encoding="utf-8-sig") as f:
        r = csv.reader(f)
        rows = list(r)
    return rows[0], rows[1:]


def main():
    wb = Workbook()
    intro = wb.active
    intro.title = "READ ME"
    lines = [
        ("MIT-WPU Department of Sports website: content", Font(bold=True, size=16, color=NAVY)),
        ("Each tab below feeds one part of the website. Changes appear on the site within a minute of saving.", None),
        ("", None),
        ("Rules", Font(bold=True, size=12, color=NAVY)),
        ("1. Never rename a tab or a column heading: the website looks them up by name.", None),
        ("2. Dates are written YYYY-MM-DD, e.g. 2027-08-27. The cells are plain text so Google doesn't change them.", None),
        ("3. status: published (or empty) = shown; draft = hidden; archived = kept on its page but off the home page.", None),
        ("4. Don't delete old rows; archive them, so the site keeps its history.", None),
        ("5. Hover over a column heading to see what goes in it. Columns with fixed choices have a dropdown.", None),
        ("6. Photo links: a Google Drive file shared as 'Anyone with the link can view' works.", None),
        ("", None),
        ("Full guide: content/HOW-TO-UPDATE.md in the website project.", Font(italic=True, color="5A6080")),
    ]
    for i, (text, font) in enumerate(lines, 1):
        c = intro.cell(row=i, column=1, value=text)
        if font:
            c.font = font
    intro.column_dimensions["A"].width = 110
    for tab, (about, helps, choices) in TABS.items():
        head, rows = read_csv(tab)
        ws = wb.create_sheet(tab)
        ws.append(head)
        for r in rows:
            ws.append([v for v in r] + [""] * (len(head) - len(r)))
        ws.freeze_panes = "A2"
        for j, h in enumerate(head, 1):
            col = get_column_letter(j)
            cell = ws.cell(row=1, column=j)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor=NAVY)
            cell.alignment = Alignment(vertical="center")
            if h in helps:
                cell.comment = Comment(helps[h], "MIT-WPU Sports")
            width = max([len(h)] + [len(str(ws.cell(row=i, column=j).value or "")) for i in range(2, min(ws.max_row, 30) + 1)])
            ws.column_dimensions[col].width = min(60, max(12, width + 2))
            for i in range(2, ROWS + 2):  # plain text everywhere, so dates and slugs stay exactly as typed
                c = ws.cell(row=i, column=j)
                c.number_format = "@"
                c.alignment = Alignment(wrap_text=False, vertical="top")
                if c.value is not None and not isinstance(c.value, str):
                    c.value = str(c.value)
            if h in choices:
                opts, strict = choices[h]
                dv = DataValidation(type="list", formula1='"' + ",".join(opts) + '"', allow_blank=True, showErrorMessage=strict)
                if strict:
                    dv.error, dv.errorTitle = "Choose one of: " + ", ".join(opts), "Not allowed"
                ws.add_data_validation(dv)
                dv.add("%s2:%s%d" % (col, col, ROWS + 1))
        ws.row_dimensions[1].height = 22
        ws.sheet_properties.tabColor = NAVY if tab in ("events", "news") else "FFA500"
        first = ws.cell(row=1, column=1)  # the tab's purpose goes in the first heading's note (no extra columns: the site reads every column)
        first.comment = Comment(about + "\n\n" + helps.get(head[0], ""), "MIT-WPU Sports")
    wb.save(OUT)
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
