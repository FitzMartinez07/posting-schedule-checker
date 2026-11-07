# Posting Schedule Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single page where you paste content-calendar CSV rows and see scheduling problems listed.

**Architecture:** All checking lives in `src/checker.js`, a classic script (no ES modules, so `index.html` works from `file://`) that exports through `module.exports` under Node and `window.ScheduleChecker` in the browser. `index.html` only reads the textarea, calls `checkSchedule`, and renders the result.

**Tech Stack:** Plain HTML/CSS/JavaScript; Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-06-schedule-checker-design.md`

## Global Constraints

- One HTML file plus one JS logic file, opened straight in a browser. No framework, no build step.
- Tests run with `node --test`, no installs.
- Columns: `date, time, section, title, status`; header row required.
- Date `YYYY-MM-DD`, time 24-hour `HH:MM`.
- "Too close" window is 2 hours, kept as one named constant: `MIN_GAP_MINUTES = 120`.
- Rows with status `cancelled` are ignored by the checks.
- Simple comma-separated parsing; quoted commas are out of scope.
- A row the parser cannot read is reported, never skipped.
- Plan calls: a gap of exactly 120 minutes is NOT flagged; two posts from the same section in the same slot are reported only as `same-slot`.

## Review Focus

1. Windows line endings (`\r\n`) and trailing blank lines must not create bogus problems.
2. Impossible dates/times (`2026-13-45`, `25:99`) are reported as `unreadable-row`, not accepted.
3. Section names compare ignoring case and surrounding spaces (`News` vs ` news `); status `Cancelled` counts as `cancelled`.
4. Exactly 120 minutes apart is fine; 23:30 and 00:30 on the next day are 60 minutes apart and flagged.
5. A row with too many or too few columns (including one with a quoted comma) is reported as `unreadable-row`.

---

### Task 1: Parsing, header, and per-row problems

**Files:**
- Create: `src/checker.js`, `tests/checker.test.js`

**Interfaces:**
- Produces: `MIN_GAP_MINUTES: number`; `checkSchedule(text: string): Problem[]`; `Problem = { type: 'bad-header'|'unreadable-row'|'missing-field'|'same-slot'|'section-too-close', lines: number[], message: string }` (`lines` are 1-based line numbers of the pasted text). Internal helper `parseRows(text): { rows: Row[], problems: Problem[] }` with `Row = { line, date, time, section, title, status, minutes }` where `minutes` is minutes since the Unix epoch (UTC) for date+time.

- [ ] **Step 1: Write failing tests** (`const H = 'date,time,section,title,status\n'`)
  - clean: `H + '2026-11-12,09:00,News,Budget,approved\n2026-11-12,13:00,Arts,Gallery,approved'` → `[]`
  - `''` and `'a,b\n1,2'` → one problem, `type 'bad-header'`, `lines [1]`
  - `H + '2026-11-12,,News,Budget,approved'` → one `missing-field`, `lines [2]`, message contains `time`
  - same clean text joined with `\r\n` plus two trailing blank lines → `[]`
  - dates `2026-13-45` and time `25:99` → each `unreadable-row`; `H + '2026-11-12,09:00,News'` (3 columns) and a 6-column row → `unreadable-row`
- [ ] **Step 2: Run** `node --test` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `parseRows` and `checkSchedule` in `src/checker.js` (UMD guard at the bottom). Validate dates by building `Date.UTC(...)` and checking the parts round-trip; split on `/\r?\n/` and drop trailing blank lines.
- [ ] **Step 4: Run** `node --test` — Expected: PASS.
- [ ] **Step 5: Commit** — `git init` first, then `git add -A && git commit -m "feat: parse schedule and report bad rows"`

### Task 2: Same-slot check

**Files:** Modify `src/checker.js`; Test `tests/checker.test.js`

**Interfaces:** Consumes `parseRows` rows (`minutes`, `status`, `line`). Produces `type 'same-slot'` problems, one per slot, `lines` sorted ascending.

- [ ] **Step 1: Write failing tests:** two rows same date+time, sections News/Arts → one `same-slot`, `lines [2,3]`; three rows same slot → one problem, `lines [2,3,4]`; a `Cancelled` row sharing a slot with an approved row → `[]`.
- [ ] **Step 2: Run** `node --test` — Expected: the three new tests FAIL.
- [ ] **Step 3: Implement** the check inside `checkSchedule`: group non-cancelled rows by `minutes`, report groups of 2+.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: flag posts in the same slot"`

### Task 3: Same-section-too-close check

**Files:** Modify `src/checker.js`; Test `tests/checker.test.js`

**Interfaces:** Consumes rows as above and `MIN_GAP_MINUTES`. Produces `type 'section-too-close'` problems, `lines` = the two rows involved.

- [ ] **Step 1: Write failing tests:** News 09:00 and 10:30 → `section-too-close`, `lines [2,3]`; News 09:00 and 11:00 → `[]`; `2026-11-12,23:30` and `2026-11-13,00:30` same section → flagged; `News` and ` news ` at 09:00/10:00 → flagged; same section, identical slot → exactly one problem, of type `same-slot`.
- [ ] **Step 2: Run** `node --test` — Expected: new tests FAIL.
- [ ] **Step 3: Implement:** group non-cancelled rows by `section.trim().toLowerCase()`, sort by `minutes`, compare neighbours with gap `> 0 && < MIN_GAP_MINUTES`.
- [ ] **Step 4: Run** — Expected: all PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: flag same section posting too close together"`

### Task 4: The page

**Files:** Create `index.html`

**Interfaces:** Consumes `window.ScheduleChecker.checkSchedule(text)`.

- [ ] **Step 1: Write `index.html`:** `<textarea id="input">`, `<button id="check">Check schedule</button>`, `<ul id="results" aria-live="polite">`. Load `src/checker.js` with a classic `<script src>`. Empty textarea shows "Paste some rows first." Zero problems shows "No problems found." Otherwise show "N problems found" and one `<li>` per problem with its line numbers; set text with `textContent`, never `innerHTML`. Style following the frontend-design skill; label every control.
- [ ] **Step 2: Verify** `node --test` still passes, then open `index.html` and paste a sample with one clash, one missing field, one too-close pair — Expected: three problems listed with correct line numbers.
- [ ] **Step 3: Review** the page against the web-design-guidelines skill and fix findings.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: add schedule checker page"`
