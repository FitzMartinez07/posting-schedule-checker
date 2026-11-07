# Posting Schedule Checker

Paste rows from a content calendar and see scheduling problems before posts go live. It runs entirely in your browser: no server, no install, no build step.

## What it checks

| Problem | Meaning |
|---|---|
| Same slot | Two or more posts share the same date and time |
| Too close | The same section posts twice less than 2 hours apart (exactly 2 hours is fine) |
| Missing field | A row has no date, time, section, or title |
| Unreadable row | Wrong number of columns, or an impossible date or time such as `2026-13-45` or `25:99` |
| Header | The first line is not the expected header |

Posts with the status `cancelled` (or `canceled`) are ignored by the checks. A row the checker cannot read is always reported, never skipped.

## How to use

1. Open `index.html` in a browser.
2. Paste your rows, header included. Comma-separated text and tab-separated text copied from a spreadsheet both work.
3. Press **Check schedule**.

Expected columns, in this order:

```
date,time,section,title,status
2026-11-12,09:00,News,Budget story,approved
2026-11-12,09:00,Arts,Gallery opening,approved
```

Dates are `YYYY-MM-DD` and times are 24-hour `HH:MM`. That sample reports one problem: two posts in the same slot.

## Run the tests

Requires Node.js 18 or newer (developed on Node 22). No packages to install.

```
node --test
```

## Project layout

```
index.html            the page (input box, button, results list)
src/checker.js        all checking logic, usable from the page and from Node
tests/checker.test.js tests for the checker
docs/superpowers/     the design doc and implementation plan this was built from
```

## Known limits

- Quoted cells that contain commas are not supported; such a row is reported as unreadable.
- Times must be 24-hour with two-digit hours (`09:00`, not `9:00` or `9:00 AM`).
- The header must be exactly the five columns above; extra columns are rejected.
- Problems are listed in the order they are found, not by row number.
- The page has only been tried in Chromium.

## Built with

Plain HTML, CSS, and JavaScript, using Node's built-in test runner.
