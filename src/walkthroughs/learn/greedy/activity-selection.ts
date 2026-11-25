import { arr, defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, MapEntry, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const ROW_START = 0;
const ROW_END = 130;
const NOTE_Y = 260;

/** An interval with a stable key, so sorting slides both rows together. */
interface Interval {
  readonly start: number;
  readonly end: number;
  readonly id: number;
}

/** `test`: line 11 is comparing start with last_end (verdict in `ok`). `add`: line 12–13 just ran. */
type Phase = 'test' | 'add' | 'done';

interface ActState {
  /** Intervals as drawn: input order before line 6 sorts them, by end time after. */
  readonly rows: readonly Interval[];
  /** Positions (in `rows`) of the intervals already selected. */
  readonly picked: readonly number[];
  readonly lastEnd?: number;
  /** Position of the interval being looked at. */
  readonly at?: number;
  readonly phase?: Phase;
  /** Verdict of the `start >= last_end` test. */
  readonly ok?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code has `selected` and `last_end`: only the intervals. */
  readonly bare?: boolean;
  readonly rowId?: string;
}

const show = (x: number | undefined): string | number => (x === undefined ? '-∞' : x);

/** Scene for one moment: start and end rows, tones for picked / skipped, the `selected` table and the variables. */
function scene(s: ActState): Entity[] {
  const prefix = s.rowId ?? 'ordered';
  const tones: Record<number, Tone> = {};
  s.rows.forEach((_, k) => {
    const isPicked = s.picked.includes(k);
    if (s.phase === 'done') tones[k] = isPicked ? 'found' : 'muted';
    else if (s.at !== undefined && k < s.at) tones[k] = isPicked ? 'done' : 'muted';
  });
  if (s.at !== undefined && s.phase !== 'done') tones[s.at] = s.phase === 'test' && s.ok === false ? 'miss' : 'active';
  if (s.phase === 'add' && s.at !== undefined) tones[s.at] = 'active';

  const keys = s.rows.map((r) => r.id);
  const entities: Entity[] = [
    arr(`${prefix}-start`, 0, ROW_START, s.rows.map((r) => r.start), { label: 'start', tones, codeVar: 'ordered', itemKeys: keys, showIndex: false }),
    arr(`${prefix}-end`, 0, ROW_END, s.rows.map((r) => r.end), { label: 'end', tones, itemKeys: keys, showIndex: false }),
  ];

  const cur = s.at === undefined ? undefined : s.rows[s.at];
  const showCur = cur !== undefined && s.phase !== 'done';
  const x = tableBesideArray(s.rows.length, 4);
  if (!s.bare) {
    const rows: VarRow[] = [
      { name: 'start', value: showCur ? cur.start : '—', tone: showCur ? 'default' : 'muted' },
      { name: 'end', value: showCur ? cur.end : '—', tone: showCur ? 'default' : 'muted' },
      { name: 'last_end', value: show(s.lastEnd), tone: s.phase === 'test' && s.ok === false ? 'miss' : s.phase === 'test' && s.ok ? 'found' : 'default' },
    ];
    entities.push(vars('vals', x, 0, rows, { label: 'variables', width: 180 }));
    const entries: MapEntry[] = s.picked.map((k) => ({
      key: s.rows[k]?.start ?? 0,
      value: s.rows[k]?.end ?? 0,
      tone: s.phase === 'add' && k === s.at ? 'active' : s.phase === 'done' ? 'found' : 'done',
    }));
    entities.push(map('selected', x, 150, 'selected (start → end)', entries, { width: 180, codeVar: 'selected' }));
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs activity selection on any input and records one step per decision (chapter "run", final code). */
function traceActivities(starts: readonly number[], ends: readonly number[]): Step[] {
  const items: Interval[] = starts.map((start, id) => ({ start, end: ends[id] ?? start, id }));
  const rows = [...items].sort((a, b) => a.end - b.end);
  const steps: Step[] = [];
  const picked: number[] = [];
  let lastEnd: number | undefined;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ selected: picked.length, lastEnd: show(lastEnd), result });
  const pair = (r: Interval): string => `(${r.start}, ${r.end})`;

  const already = rows.every((r, k) => r.id === items[k]?.id);
  steps.push({
    chapter: 'run',
    short: 'Sort by end',
    title: 'Sort the intervals by their end time',
    body: `Line 6 sorts by \`interval[1]\`, the end time. The ends now read ${rows.map((r) => r.end).join(', ')}.${already ? ' They were already in that order.' : ' Each interval slides into place, start and end together.'}`,
    code: { view: 'final', lines: [6] },
    values: { 6: `ordered by end: ${rows.map(pair).join(' ')}` },
    metrics: metrics(),
    scene: { entities: scene({ rows, picked: [] }) },
  });
  steps.push({
    chapter: 'run',
    short: 'Start',
    title: 'Nothing selected, the room is free from the start',
    body: 'Line 7 starts with an empty `selected` list. Line 8 sets `last_end = -inf`: no meeting has used the room yet, so any start time is fine.',
    code: { view: 'final', lines: [7, 8] },
    values: { 7: 'selected = []', 8: 'last_end = -inf' },
    metrics: metrics(),
    scene: { entities: scene({ rows, picked: [] }) },
  });

  rows.forEach((r, at) => {
    const ctx = { rows, at } as const;
    const ok = r.start >= (lastEnd ?? Number.NEGATIVE_INFINITY);
    const lastText = lastEnd === undefined ? '-inf' : String(lastEnd);
    const intro = at === 0 ? 'Line 10 takes the first interval' : 'Line 10 takes the next interval';
    steps.push({
      chapter: 'run',
      short: ok ? `${r.start} ≥ ${lastText}` : `${r.start} < ${lastText}`,
      title: ok ? `Start ${r.start} is at or after ${lastText}: no overlap` : `Start ${r.start} is before ${lastEnd}: it overlaps`,
      body: ok
        ? `${intro}: \`start = ${r.start}\`, \`end = ${r.end}\`. Line 11: \`${r.start} >= ${lastText}\` is true, so the room is free when it starts.`
        : `${intro}: \`start = ${r.start}\`, \`end = ${r.end}\`. Line 11: \`${r.start} >= ${lastText}\` is false.\n\nThe room is still busy until ${lastEnd}, so this interval is **skipped** and the loop goes on.`,
      code: { view: 'final', lines: [10, 11] },
      values: { 10: `start, end = ${r.start}, ${r.end}`, 11: `${r.start} >= ${lastText} → ${ok ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ ...ctx, picked, lastEnd, phase: 'test', ok }) },
    });
    if (!ok) return;
    picked.push(at);
    const before = lastText;
    lastEnd = r.end;
    steps.push({
      chapter: 'run',
      short: `Pick ${pair(r)}`,
      title: `Select ${pair(r)}: the room is busy until ${r.end}`,
      body: `Line 12 appends \`(${r.start}, ${r.end})\` to \`selected\`. Line 13 moves \`last_end\` from ${before} to ${r.end}, so the next start must be at least ${r.end}.`,
      code: { view: 'final', lines: [12, 13] },
      values: { 12: `selected += [${pair(r)}]`, 13: `last_end = ${r.end}` },
      changes: [`selected: ${picked.length} interval${picked.length === 1 ? '' : 's'}`, `last_end = ${r.end}`],
      metrics: metrics(),
      scene: { entities: scene({ ...ctx, picked, lastEnd, phase: 'add' }) },
    });
  });

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${picked.length} interval${picked.length === 1 ? '' : 's'}`,
    body: `Line 15 returns **${picked.map((k) => pair(rows[k] ?? { start: 0, end: 0, id: 0 })).join(', ')}**: ${picked.length} non-overlapping interval${picked.length === 1 ? '' : 's'} out of ${rows.length}.`,
    code: { view: 'final', lines: [15] },
    values: { 15: `return ${picked.length} interval${picked.length === 1 ? '' : 's'}` },
    metrics: metrics(`${picked.length} interval${picked.length === 1 ? '' : 's'}`),
    scene: { entities: scene({ rows, picked, lastEnd, phase: 'done' }) },
  });
  return steps;
}

const STARTS = [5, 1, 8, 0, 3, 5] as const;
const ENDS = [7, 2, 9, 6, 4, 9] as const;
const RUN = traceActivities(STARTS, ENDS);
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { selected: 0, lastEnd: '-∞', result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const toRows = (starts: readonly number[], ends: readonly number[]): Interval[] => starts.map((start, id) => ({ start, end: ends[id] ?? start, id }));
const STORY_ROWS = toRows(STARTS, ENDS);
const SORTED_ROWS: Interval[] = [...STORY_ROWS].sort((a, b) => a.end - b.end);

export default defineWalkthrough({
  id: 'learn/greedy/activity-selection',
  title: 'Activity Selection, the earliest end time wins',
  summary: 'From a booked-out room to the code: sort the requests by end time and keep every interval that starts after the last one ended.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `Interval = tuple[int, int]


def activity_selection(intervals: list[Interval]) -> list[Interval]:
    # Earliest end time leaves the most room for the intervals after it
    ordered = sorted(intervals, key=lambda interval: interval[1])
    selected: list[Interval] = []
    last_end = float("-inf")

    for start, end in ordered:
        if start >= last_end:
            selected.append((start, end))
            last_end = end

    return selected`,
  },
  metrics: [
    { key: 'selected', label: 'Selected' },
    { key: 'lastEnd', label: 'Room free from' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'interval being looked at' },
    { tone: 'done', label: 'selected' },
    { tone: 'miss', label: 'overlaps, skipped' },
    { tone: 'muted', label: 'already passed' },
    { tone: 'found', label: 'final selection' },
  ],
  goals: [
    { text: 'See why the earliest end time is the safe choice', step: 3 },
    { text: 'Build the sort and the scan one idea at a time', step: 4 },
    { text: 'Follow every pick and every skip', step: 9 },
    { text: 'Know why comparing with last_end is enough', step: 23 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Book as many meetings as possible in one room',
      body: 'One conference room, six meeting requests, each with a **start** and an **end** time. Two meetings can share the room only if they don’t overlap.\n\nLine 4 takes the `intervals` as (start, end) pairs and returns the biggest set that doesn’t overlap. Here the requests are drawn as a start row over an end row.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ rows: STORY_ROWS, picked: [], bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Early start?',
      title: 'Taking the earliest start first can block everything',
      body: 'Given (1, 10), (2, 3) and (4, 5), the earliest start is (1, 10). It keeps the room busy all the way to 10, so the other two never fit: **1 meeting**.\n\nSkipping it would fit two. Starting early says nothing about when the room frees up.',
      code: { view: 'signature' },
      metrics: { selected: 1, lastEnd: 10, result: '—' },
      scene: {
        entities: scene({
          rows: toRows([1, 2, 4], [10, 3, 5]),
          picked: [0],
          phase: 'done',
          bare: true,
          rowId: 'trap',
          note: 'earliest start: (1, 10) → 1 meeting\n(2, 3) and (4, 5) → 2 meetings',
          noteTone: 'miss',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Earliest end',
      title: 'The interval that ends first frees the room soonest',
      body: 'Sort by **end** time. The first interval ends before every other one, so choosing it blocks the room for the shortest possible time. Any best schedule can swap its first meeting for it without losing a meeting.\n\nThen repeat on what is left: keep the next interval that starts after the room frees up.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({ rows: SORTED_ROWS, picked: [], bare: true, note: '(1, 2) ends first: the room is\nfree again as early as possible' }),
      },
    },
    {
      chapter: 'build',
      short: 'Sort',
      title: 'Lines 5–6: order the intervals by end time',
      body: 'The `key` picks `interval[1]`, the end. This sort is the greedy rule: from here on, the scan only has to be fair about start times.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6], lines: [6] },
      metrics: startMetrics,
      changes: ['ordered = intervals sorted by end time'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Room state',
      title: 'Lines 7–8: what we picked, and when the room frees up',
      body: '`selected` collects the meetings we keep. `last_end` is the end of the latest one, starting at minus infinity so the first interval always passes.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8], lines: [7, 8] },
      metrics: startMetrics,
      changes: ['selected = []', 'last_end = -inf'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Overlap test',
      title: 'Lines 10–11: does this interval start after the room frees up?',
      body: 'The loop unpacks each (start, end). `start >= last_end` means the previous meeting is over, so there is no overlap. A start equal to `last_end` is fine: back to back.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 10, 11], lines: [10, 11] },
      metrics: startMetrics,
      changes: ['for start, end in ordered', 'if start >= last_end'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Keep it',
      title: 'Lines 12–13: keep the interval and move the busy-until time',
      body: 'Line 12 adds the interval to `selected`. Line 13 sets `last_end = end`. Skipped intervals do neither, and the loop simply moves on.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 10, 11, 12, 13], lines: [12, 13] },
      metrics: { selected: 1, lastEnd: 2, result: '—' },
      changes: ['selected.append((start, end))', 'last_end = end'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 15: return what was kept',
      body: 'When every interval has been looked at, `selected` is the largest non-overlapping set.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [15] },
      metrics: FINAL_METRICS,
      changes: ['return selected'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'The sort costs O(n log n); the scan is one pass',
      body: 'Sorting `n` intervals by end time is `O(n log n)`. The loop looks at each interval once, so the scan is `O(n)`. `ordered` and `selected` take `O(n)` space.\n\nSwitch to **🧪 Try your own** to schedule your own meetings.',
      code: { view: 'final', lines: [6, 10] },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          rows: SORTED_ROWS,
          picked: [0, 1, 3, 4],
          lastEnd: 9,
          phase: 'done',
          note: 'n = 6 intervals → 1 sort + 6 turns\n4 meetings kept',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Last end only',
      title: 'Sorted by end, one number (last_end) is all line 11 needs',
      body: 'Line 11 compares only with `last_end`, never with every earlier pick. That is safe because the order is by end: the last selected interval ends **latest** of all the selected ones, so a start at or after it clears every one of them.\n\nThat is the key decision: the sort on line 6 turns an all-pairs overlap check into a single comparison.',
      code: { view: 'final', lines: [6, 11] },
      values: { 6: 'ends: 2, 4, 6, 7, 9, 9', 11: '8 >= 7 → True: clear of (1,2), (3,4), (5,7)' },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          rows: SORTED_ROWS,
          picked: [0, 1, 3],
          lastEnd: 7,
          at: 4,
          phase: 'test',
          ok: true,
          note: '(8, 9): start 8 ≥ last_end 7\nso it also clears 2 and 4',
          noteTone: 'found',
        }),
      },
    },
  ],
  trace: {
    title: 'Run activity selection on your own intervals',
    inputs: [
      { name: 'starts', label: 'Start times', kind: 'numbers', default: '5, 1, 8, 0, 3, 5' },
      { name: 'ends', label: 'End times (same count, none before its start)', kind: 'numbers', default: '7, 2, 9, 6, 4, 9' },
    ],
    presets: [
      { label: 'Six requests', values: { starts: '5, 1, 8, 0, 3, 5', ends: '7, 2, 9, 6, 4, 9' } },
      { label: 'All overlap', values: { starts: '1, 2, 3', ends: '4, 5, 6' } },
      { label: 'Back to back', values: { starts: '1, 2, 3', ends: '2, 3, 4' } },
      { label: 'Same end time', values: { starts: '1, 2, 3', ends: '5, 5, 5' } },
      { label: 'Early-start trap', values: { starts: '1, 2, 4', ends: '10, 3, 5' } },
      { label: 'One interval', values: { starts: '4', ends: '9' } },
    ],
    maxItems: 8,
    run: (values) => {
      const starts = values['starts'];
      const ends = values['ends'];
      if (!Array.isArray(starts) || !Array.isArray(ends) || starts.length === 0) throw new Error('Enter start times and end times.');
      if (starts.length !== ends.length) throw new Error('Give one end time for every start time.');
      if (starts.some((s, i) => s > (ends[i] ?? s))) throw new Error('Every interval must end at or after its start.');
      return traceActivities(starts, ends);
    },
  },
});
