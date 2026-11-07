# Posting Schedule Checker: Short Design

Date: 2026-11-06
Size: small project (short design doc, per the brainstorming skill)

## Intent and why
A demo project that exercises the installed development skills end to end.
It is also a useful tool: paste rows from a content calendar and catch
scheduling problems before posts go live.

## Goals
- Paste CSV rows into a page, press a button, see a list of problems.
- Flag three kinds of problem:
  1. Two or more posts in the same date + time slot.
  2. A row missing a required field (date, time, section, title).
  3. The same section posting twice within 2 hours.
- Checking logic is separate from the page so it can be tested on its own.

## Non-goals
- No saving, accounts, or server.
- No connection to Google Sheets (paste only).
- No editing of rows in the page.

## Anti-goals (a failure even if it technically works)
- Silent failure: a row the parser cannot read must be reported, never skipped.
- Pulling in a framework or build step for something this small.

## Constraints
- One HTML file plus one JS logic file, opened straight in a browser.
- Tests run with Node's built-in test runner (`node --test`), no installs.

## Approaches considered
| # | Approach | Trade-off |
|---|----------|-----------|
| 1 | **Single HTML page, plain JS, logic in its own file** (CHOSEN by Fitz) | Has a real UI; zero setup; logic still testable |
| 2 | Node command-line tool reading a CSV file | Easiest to test, but no interface |
| 3 | Small Java program | Matches coursework, but no interface |

## Decisions
Fitz decided: approach 1.

My calls (open to correction):
- Columns: `date, time, section, title, status`; header row required.
- Date format `YYYY-MM-DD`, time format 24-hour `HH:MM`.
- "Too close" window is 2 hours, kept as one named constant.
- Rows with status `cancelled` are ignored by the checks.
- Simple comma-separated parsing; quoted commas are out of scope.

## Left to the builder
Exact wording of messages, visual styling, file layout inside the folder.
