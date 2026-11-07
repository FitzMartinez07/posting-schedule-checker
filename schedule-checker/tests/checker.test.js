const test = require('node:test');
const assert = require('node:assert');
const { checkSchedule } = require('../src/checker.js');

const H = 'date,time,section,title,status\n';
const CLEAN =
  H +
  '2026-11-12,09:00,News,Budget,approved\n' +
  '2026-11-12,13:00,Arts,Gallery,approved';

test('a clean schedule reports nothing', () => {
  assert.deepStrictEqual(checkSchedule(CLEAN), []);
});

test('empty or wrong header is reported on line 1 and nothing else', () => {
  for (const text of ['', 'a,b\n1,2']) {
    const problems = checkSchedule(text);
    assert.strictEqual(problems.length, 1);
    assert.strictEqual(problems[0].type, 'bad-header');
    assert.deepStrictEqual(problems[0].lines, [1]);
  }
});

test('a blank required field is a missing-field problem naming the field', () => {
  const problems = checkSchedule(H + '2026-11-12,,News,Budget,approved');
  assert.strictEqual(problems.length, 1);
  assert.strictEqual(problems[0].type, 'missing-field');
  assert.deepStrictEqual(problems[0].lines, [2]);
  assert.match(problems[0].message, /time/);
});

test('Windows line endings and trailing blank lines create no problems', () => {
  assert.deepStrictEqual(checkSchedule(CLEAN.replace(/\n/g, '\r\n') + '\r\n\r\n'), []);
});

test('rows the parser cannot read are reported, never skipped', () => {
  const bad = {
    'impossible date': '2026-13-45,09:00,News,Budget,approved',
    'impossible time': '2026-11-12,25:99,News,Budget,approved',
    'too few columns': '2026-11-12,09:00,News',
    'too many columns': '2026-11-12,09:00,News,Budget,approved,extra',
  };
  for (const [name, row] of Object.entries(bad)) {
    const problems = checkSchedule(H + row);
    assert.strictEqual(problems.length, 1, name);
    assert.strictEqual(problems[0].type, 'unreadable-row', name);
    assert.deepStrictEqual(problems[0].lines, [2], name);
  }
});

test('two posts in the same date+time slot are one same-slot problem', () => {
  const problems = checkSchedule(
    H + '2026-11-12,09:00,News,Budget,approved\n2026-11-12,09:00,Arts,Gallery,approved'
  );
  assert.strictEqual(problems.length, 1);
  assert.strictEqual(problems[0].type, 'same-slot');
  assert.deepStrictEqual(problems[0].lines, [2, 3]);
});

test('three posts in one slot are a single problem listing all three lines', () => {
  const problems = checkSchedule(
    H +
      '2026-11-12,09:00,News,A,approved\n' +
      '2026-11-12,09:00,Arts,B,approved\n' +
      '2026-11-12,09:00,Sports,C,approved'
  );
  assert.strictEqual(problems.length, 1);
  assert.deepStrictEqual(problems[0].lines, [2, 3, 4]);
});

test('a cancelled post does not clash with an approved one', () => {
  assert.deepStrictEqual(
    checkSchedule(H + '2026-11-12,09:00,News,A,Cancelled\n2026-11-12,09:00,Arts,B,approved'),
    []
  );
});

test('same section 90 minutes apart is a section-too-close problem', () => {
  const problems = checkSchedule(
    H + '2026-11-12,09:00,News,A,approved\n2026-11-12,10:30,News,B,approved'
  );
  assert.strictEqual(problems.length, 1);
  assert.strictEqual(problems[0].type, 'section-too-close');
  assert.deepStrictEqual(problems[0].lines, [2, 3]);
});

test('exactly 120 minutes apart is allowed', () => {
  assert.deepStrictEqual(
    checkSchedule(H + '2026-11-12,09:00,News,A,approved\n2026-11-12,11:00,News,B,approved'),
    []
  );
});

test('the gap is measured across midnight', () => {
  const problems = checkSchedule(
    H + '2026-11-12,23:30,News,A,approved\n2026-11-13,00:30,News,B,approved'
  );
  assert.deepStrictEqual(problems.map((p) => p.type), ['section-too-close']);
});

test('section names match ignoring case and surrounding spaces', () => {
  const problems = checkSchedule(
    H + '2026-11-12,09:00,News,A,approved\n2026-11-12,10:00, news ,B,approved'
  );
  assert.deepStrictEqual(problems.map((p) => p.type), ['section-too-close']);
});

test('same section in the identical slot is reported once, as same-slot', () => {
  const problems = checkSchedule(
    H + '2026-11-12,09:00,News,A,approved\n2026-11-12,09:00,News,B,approved'
  );
  assert.deepStrictEqual(problems.map((p) => p.type), ['same-slot']);
});

test('a cancelled post is ignored by the too-close check', () => {
  assert.deepStrictEqual(
    checkSchedule(H + '2026-11-12,09:00,News,A,approved\n2026-11-12,10:00,News,B,Cancelled'),
    []
  );
});

test('tab-separated rows pasted from a spreadsheet are read like commas', () => {
  const tsv = CLEAN.replace(/,/g, '\t');
  assert.deepStrictEqual(checkSchedule(tsv), []);
  const problems = checkSchedule(tsv.replace('13:00', '09:00'));
  assert.deepStrictEqual(problems.map((p) => p.type), ['same-slot']);
});

test('the US spelling "Canceled" is ignored like "Cancelled"', () => {
  assert.deepStrictEqual(
    checkSchedule(H + '2026-11-12,09:00,News,A,Canceled\n2026-11-12,09:00,Arts,B,approved'),
    []
  );
});
