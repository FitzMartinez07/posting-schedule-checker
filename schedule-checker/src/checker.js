// Classic script so index.html works from file:// (ES modules need a server).
(function (root) {
  const MIN_GAP_MINUTES = 120;
  const HEADER = ['date', 'time', 'section', 'title', 'status'];
  const REQUIRED = HEADER.slice(0, 4);

  const problem = (type, lines, message) => ({ type, lines, message });

  // Builds minutes-since-epoch (UTC) and rejects impossible dates/times by round-tripping.
  function toMinutes(date, time) {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const t = /^(\d{2}):(\d{2})$/.exec(time);
    if (!d || !t) return null;
    const [y, mo, da, h, mi] = [...d.slice(1), ...t.slice(1)].map(Number);
    const when = new Date(Date.UTC(y, mo - 1, da, h, mi));
    const same =
      when.getUTCFullYear() === y && when.getUTCMonth() === mo - 1 &&
      when.getUTCDate() === da && when.getUTCHours() === h && when.getUTCMinutes() === mi;
    return same ? when.getTime() / 60000 : null;
  }

  function parseRows(text) {
    const lines = text.split(/\r?\n/);
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

    const sep = (lines[0] || '').includes('\t') ? '\t' : ','; // spreadsheets paste tabs
    const header = lines.length ? lines[0].split(sep).map((c) => c.trim().toLowerCase()) : [];
    if (header.join() !== HEADER.join()) {
      return { rows: [], problems: [problem('bad-header', [1], 'Line 1: header must be ' + HEADER.join(','))] };
    }

    const rows = [];
    const problems = [];
    lines.slice(1).forEach((raw, i) => {
      const line = i + 2;
      if (raw.trim() === '') return;
      const cols = raw.split(sep).map((c) => c.trim());
      if (cols.length !== HEADER.length) {
        problems.push(problem('unreadable-row', [line], `Line ${line}: expected ${HEADER.length} columns, found ${cols.length}`));
        return;
      }
      const [date, time, section, title, status] = cols;
      const missing = REQUIRED.filter((_, k) => cols[k] === '');
      if (missing.length) {
        problems.push(problem('missing-field', [line], `Line ${line}: missing ${missing.join(', ')}`));
        return;
      }
      const minutes = toMinutes(date, time);
      if (minutes === null) {
        problems.push(problem('unreadable-row', [line], `Line ${line}: date or time is not a real YYYY-MM-DD / HH:MM value`));
        return;
      }
      rows.push({ line, date, time, section, title, status, minutes });
    });
    return { rows, problems };
  }

  const isActive = (r) => !/^cancell?ed$/i.test(r.status);

  function checkSchedule(text) {
    const { rows, problems } = parseRows(text);
    const active = rows.filter(isActive);

    const slots = new Map();
    for (const r of active) slots.set(r.minutes, [...(slots.get(r.minutes) || []), r]);
    for (const group of slots.values()) {
      if (group.length < 2) continue;
      const { date, time } = group[0];
      problems.push(problem('same-slot', group.map((r) => r.line),
        `Lines ${group.map((r) => r.line).join(', ')}: ${group.length} posts at ${date} ${time} (${group.map((r) => r.section).join(', ')})`));
    }

    const bySection = new Map();
    for (const r of active) {
      const key = r.section.toLowerCase();
      bySection.set(key, [...(bySection.get(key) || []), r]);
    }
    for (const list of bySection.values()) {
      list.sort((a, b) => a.minutes - b.minutes);
      for (let i = 1; i < list.length; i++) {
        const gap = list[i].minutes - list[i - 1].minutes;
        if (gap > 0 && gap < MIN_GAP_MINUTES) { // gap 0 is already a same-slot problem
          const lines = [list[i - 1].line, list[i].line].sort((a, b) => a - b);
          problems.push(problem('section-too-close', lines,
            `Lines ${lines.join(', ')}: ${list[i].section} posts only ${gap} minutes apart (minimum ${MIN_GAP_MINUTES})`));
        }
      }
    }
    return problems;
  }

  const api = { MIN_GAP_MINUTES, checkSchedule };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ScheduleChecker = api;
})(typeof window !== 'undefined' ? window : globalThis);
