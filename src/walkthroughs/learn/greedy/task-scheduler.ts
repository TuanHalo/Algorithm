import { arr, defineWalkthrough, note, range, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const ROW_SCHEDULE = 150;
const NOTE_Y = 290;
const MAX_CELLS = 16;

const letter = (i: number): string => String.fromCharCode(65 + i);
const IDLE = '—';

/** The frame shape: (max_freq - 1) frames of n + 1 slots, then a last row with the busiest tasks. */
function skeleton(freqs: readonly number[], n: number): string[] {
  const top = Math.max(...freqs);
  const busiest = freqs.flatMap((f, i) => (f === top ? [letter(i)] : []));
  const size = Math.max(n + 1, busiest.length);
  const out: string[] = [];
  for (let f = 0; f < top - 1; f += 1) out.push(...busiest, ...Array<string>(size - busiest.length).fill(IDLE));
  out.push(...busiest);
  return out;
}

/** A real schedule: each tick runs the cooled-down task with the most runs left, or idles. */
function simulate(freqs: readonly number[], n: number): string[] {
  const left = [...freqs];
  const last = freqs.map(() => Number.NEGATIVE_INFINITY);
  const out: string[] = [];
  for (let t = 0; left.some((r) => r > 0); t += 1) {
    let best = -1;
    left.forEach((r, i) => {
      if (r > 0 && t - (last[i] ?? 0) > n && (best < 0 || r > (left[best] ?? 0))) best = i;
    });
    if (best < 0) out.push(IDLE);
    else {
      out.push(letter(best));
      left[best] = (left[best] ?? 1) - 1;
      last[best] = t;
    }
  }
  return out;
}

type Mode = 'none' | 'frames' | 'full';

interface SchedState {
  readonly freqs: readonly number[];
  readonly n: number;
  readonly maxFreq?: number;
  readonly maxCount?: number;
  readonly frames?: number;
  readonly mode: Mode;
  /** Highlight the busiest tasks in `frequencies` and the schedule. */
  readonly highlight?: boolean;
  readonly verdict?: Tone;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code has any variables: only the input. */
  readonly bare?: boolean;
  readonly rowId?: string;
}

/** Scene for one moment: the task counts, the schedule (frame shape or full), and the variables. */
function scene(s: SchedState): Entity[] {
  const top = Math.max(...s.freqs);
  const tones: Record<number, Tone> = {};
  if (s.highlight) s.freqs.forEach((f, i) => (tones[i] = f === top ? 'compare' : 'default'));
  const entities: Entity[] = [
    arr(`${s.rowId ?? 'frequencies'}`, 0, 0, s.freqs, { label: 'frequencies', tones, codeVar: 'frequencies', indexLabels: s.freqs.map((_, i) => letter(i)) }),
  ];
  const cells = s.mode === 'none' ? [] : s.mode === 'frames' ? skeleton(s.freqs, s.n) : simulate(s.freqs, s.n);
  if (cells.length > 0) {
    const cellTones: Record<number, Tone> = {};
    const busiest = new Set(s.freqs.flatMap((f, i) => (f === top ? [letter(i)] : [])));
    cells.forEach((c, i) => {
      cellTones[i] = c === IDLE ? 'muted' : s.highlight && busiest.has(c) ? 'compare' : 'default';
    });
    entities.push(arr('schedule', 0, ROW_SCHEDULE, cells, { label: 'schedule (one slot per interval)', tones: cellTones }));
    const busyCount = busiest.size;
    const size = Math.max(s.n + 1, busyCount);
    const idleNeeded = s.mode === 'frames' || cells.includes(IDLE);
    if (idleNeeded && top > 1) {
      for (let f = 0; f < top - 1; f += 1) entities.push(range(`frame-${f}`, 'schedule', f * size, f * size + size - 1, 'compare'));
    }
  }

  const rows: VarRow[] = s.bare
    ? [{ name: 'n', value: s.n }]
    : [
        { name: 'n', value: s.n },
        { name: 'max_freq', value: s.maxFreq ?? '—', tone: s.maxFreq === undefined ? 'muted' : 'default' },
        { name: 'max_freq_count', value: s.maxCount ?? '—', tone: s.maxCount === undefined ? 'muted' : 'default' },
        { name: 'frames', value: s.frames ?? '—', tone: s.verdict ?? (s.frames === undefined ? 'muted' : 'default') },
      ];
  entities.push(vars('vals', tableBesideArray(Math.max(s.freqs.length, 3), rows.length), 0, rows, { label: 'variables', width: 200 }));
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs the task scheduler formula on any input and records one step per decision (chapter "run", final code). */
function traceTasks(freqs: readonly number[], n: number): Step[] {
  const top = Math.max(...freqs);
  const count = freqs.filter((f) => f === top).length;
  const frames = (top - 1) * (n + 1) + count;
  const total = freqs.reduce((a, b) => a + b, 0);
  const result = Math.max(total, frames);
  const names = freqs.flatMap((f, i) => (f === top ? [letter(i)] : [])).join(', ');
  const base = { freqs, n } as const;
  const steps: Step[] = [];
  const metrics = (extra: Record<string, string | number> = {}): Record<string, string | number> => ({ maxFreq: '—', frames: '—', result: '—', ...extra });

  steps.push({
    chapter: 'run',
    short: 'max_freq',
    title: `The busiest task runs ${top} times`,
    body: `Line 2 takes the biggest count in \`frequencies\`: \`max_freq = ${top}\`. That task sets how many frames the schedule needs.`,
    code: { view: 'final', lines: [2] },
    values: { 2: `max_freq = max(${JSON.stringify(freqs)}) = ${top}` },
    metrics: metrics({ maxFreq: top }),
    scene: { entities: scene({ ...base, maxFreq: top, highlight: true, mode: 'none' }) },
  });
  steps.push({
    chapter: 'run',
    short: 'How many tie',
    title: `${count} task${count === 1 ? '' : 's'} run${count === 1 ? 's' : ''} ${top} times: ${names}`,
    body: `Line 3 counts how many tasks reach that maximum: \`max_freq_count = ${count}\`. They all have to appear in the last row.`,
    code: { view: 'final', lines: [3] },
    values: { 3: `max_freq_count = ${count}` },
    metrics: metrics({ maxFreq: top }),
    scene: { entities: scene({ ...base, maxFreq: top, maxCount: count, highlight: true, mode: 'none' }) },
  });
  steps.push({
    chapter: 'run',
    short: 'frames',
    title: `(${top} - 1) * (${n} + 1) + ${count} = ${frames}`,
    body: `Line 5: ${top - 1} full frame${top - 1 === 1 ? '' : 's'} of \`n + 1 = ${n + 1}\` slots, then a last row with the ${count} busiest task${count === 1 ? '' : 's'}. \`frames = ${top - 1} * ${n + 1} + ${count} = ${frames}\`.\n\nThe empty slots in the frames are idle time unless other tasks fill them.`,
    code: { view: 'final', lines: [5] },
    values: { 5: `frames = ${top - 1} * ${n + 1} + ${count} = ${frames}` },
    metrics: metrics({ maxFreq: top, frames }),
    scene: { entities: scene({ ...base, maxFreq: top, maxCount: count, frames, highlight: true, mode: 'frames' }) },
  });
  const overflow = total >= frames;
  steps.push({
    chapter: 'run',
    short: 'Compare',
    title: overflow ? `${total} tasks fill every frame: no idle needed` : `Only ${total} tasks for ${frames} slots: idle fills the gap`,
    body: overflow
      ? `Line 6 also adds up \`sum(frequencies) = ${total}\`. That is at least \`frames = ${frames}\`, so the other tasks fill every empty slot, and extra ones simply make the schedule longer. The answer is the task count.`
      : `Line 6 also adds up \`sum(frequencies) = ${total}\`. That is less than \`frames = ${frames}\`, so some frame slots stay empty: the CPU idles there. The answer is \`frames\`.`,
    code: { view: 'final', lines: [6] },
    values: { 6: `max(${total}, ${frames}) = ${result}` },
    metrics: metrics({ maxFreq: top, frames }),
    scene: { entities: scene({ ...base, maxFreq: top, maxCount: count, frames, highlight: true, mode: 'full', verdict: overflow ? 'found' : 'miss' }) },
  });
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${result}`,
    body: `Line 6 returns **${result}** intervals: the larger of the task count and the frame length.`,
    code: { view: 'final', lines: [6] },
    values: { 6: `return ${result}` },
    metrics: metrics({ maxFreq: top, frames, result }),
    scene: { entities: scene({ ...base, maxFreq: top, maxCount: count, frames, mode: 'full', verdict: 'found' }) },
  });
  return steps;
}

const FREQS = [3, 3, 1, 1] as const;
const COOLDOWN = 2;
const RUN = traceTasks(FREQS, COOLDOWN);
const at = (i: number): Step['scene'] => RUN[i]?.scene ?? { entities: [] };
const startMetrics = { maxFreq: '—', frames: '—', result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const OVERFLOW = [2, 2, 2, 2] as const;

export default defineWalkthrough({
  id: 'learn/greedy/task-scheduler',
  title: 'Task Scheduler, the busiest task sets the frames',
  summary: 'From a cooling CPU to the code: find the busiest task, lay out its frames, and see when other tasks fill every gap.',
  minutes: 6,
  code: {
    lang: 'python',
    source: `def least_interval(frequencies: list[int], n: int) -> int:
    max_freq = max(frequencies)
    max_freq_count = frequencies.count(max_freq)
    # (max_freq - 1) full frames of n + 1 slots, then one last row
    frames = (max_freq - 1) * (n + 1) + max_freq_count
    return max(sum(frequencies), frames)`,
  },
  metrics: [
    { key: 'maxFreq', label: 'Busiest count' },
    { key: 'frames', label: 'Frame length' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'busiest task / frame' },
    { tone: 'muted', label: 'idle slot' },
    { tone: 'miss', label: 'idle time needed' },
    { tone: 'found', label: 'no idle needed' },
  ],
  goals: [
    { text: 'See why the busiest task sets the schedule length', step: 3 },
    { text: 'Build the formula one piece at a time', step: 5 },
    { text: 'Follow max_freq, the frames and the final max', step: 9 },
    { text: 'Know when no idle time is needed', step: 15 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Run all tasks with a cooling gap between repeats',
      body: 'A CPU has tasks A, A, A, B, B, B, C and D. After it runs a task it must wait **n = 2** intervals before that same task runs again; in between it can run something else or idle.\n\nLine 1 takes `frequencies`, how many times each task appears (A: 3, B: 3, C: 1, D: 1), plus `n`, and returns the fewest intervals needed.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ freqs: FREQS, n: COOLDOWN, mode: 'none', bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Simulate',
      title: 'The obvious way: simulate every interval',
      body: 'Each interval, pick the task that has cooled down and has the most runs left; if none has, idle. For this input it gives **A B C A B D A B**.\n\nIt works, but it needs a counter and a cooldown timer for every task. There is a formula that skips all of that.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ freqs: FREQS, n: COOLDOWN, mode: 'full', bare: true, note: 'tick by tick: 8 intervals,\ntimers for every task' }) },
    },
    {
      chapter: 'idea',
      short: 'Frames',
      title: 'The busiest task decides the shape',
      body: 'A and B both run 3 times. Between two runs of the same task there must be 2 other slots, so a frame of **n + 1 = 3 slots** starts with each busiest task: `A B _`.\n\nThere are `max_freq − 1 = 2` full frames. The last run needs no cooldown after it, so the last row only holds the busiest tasks: `A B`. Total: `2 × 3 + 2 = 8`.',
      code: { view: 'signature' },
      metrics: { maxFreq: 3, frames: 8, result: '—' },
      scene: { entities: scene({ freqs: FREQS, n: COOLDOWN, mode: 'frames', highlight: true, bare: true, note: '(3 − 1) frames × 3 slots\n+ 2 busiest in the last row = 8' }) },
    },
    {
      chapter: 'idea',
      short: 'Fill gaps',
      title: 'Other tasks fill the idle slots, or add intervals',
      body: 'The two empty slots take C and D, so nothing idles and the answer is 8, which is also the number of tasks.\n\nWith many more task types than gaps, the extra tasks don’t fit in the frames at all and simply lengthen the schedule. The answer can never be below the task count, so it is the larger of the two numbers.',
      code: { view: 'signature' },
      metrics: { maxFreq: 3, frames: 8, result: '—' },
      scene: { entities: scene({ freqs: FREQS, n: COOLDOWN, mode: 'full', highlight: true, bare: true, note: 'C and D fill both gaps\n8 tasks, 8 intervals' }) },
    },
    {
      chapter: 'build',
      short: 'Busiest',
      title: 'Line 2: how often does the busiest task run?',
      body: '`max(frequencies)` is the number of times the most frequent task has to run. It fixes how many frames there are.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: { maxFreq: 3, frames: '—', result: '—' },
      changes: ['max_freq = max(frequencies)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Ties',
      title: 'Line 3: how many tasks share that count?',
      body: 'Every task that runs `max_freq` times needs a slot in the last row. `frequencies.count(max_freq)` counts them.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [3] },
      metrics: { maxFreq: 3, frames: '—', result: '—' },
      changes: ['max_freq_count = frequencies.count(max_freq)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Frames',
      title: 'Lines 4–5: frames of n + 1 slots, plus the last row',
      body: '`(max_freq - 1) * (n + 1)` is the length of the full frames. Adding `max_freq_count` covers the last row. This is the shortest schedule if the other tasks just fill the gaps.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [5] },
      metrics: { maxFreq: 3, frames: 8, result: '—' },
      changes: ['frames = (max_freq - 1) * (n + 1) + max_freq_count'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Take the max',
      title: 'Line 6: never fewer intervals than there are tasks',
      body: 'If there are more tasks than the frames hold, nothing idles and the answer is the task count `sum(frequencies)`. So the answer is the larger of that and `frames`.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [6] },
      metrics: FINAL_METRICS,
      changes: ['return max(sum(frequencies), frames)'],
      scene: at(3),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One pass over the counts: O(m) time, O(1) space',
      body: 'With `m` distinct task types, `max`, `count` and `sum` each walk the counts once: `O(m)` time and `O(1)` extra space. Building `frequencies` from a task list is one more `O(len(tasks))` pass (a `Counter`).\n\nSwitch to **🧪 Try your own** to try other counts and cooldowns.',
      code: { view: 'final', lines: [2, 3, 6] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ freqs: FREQS, n: COOLDOWN, mode: 'full', maxFreq: 3, maxCount: 2, frames: 8, note: 'm = 4 task types\n3 quick passes over the counts', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Overflow',
      title: 'Line 6’s max: with many task types, nothing idles',
      body: 'Take four tasks that each run twice with `n = 1`. Line 5 gives `(2 − 1) × 2 + 4 = 6`, but there are 8 tasks, so line 6 returns **8**: A B C D A B C D, with no idle slot.\n\nThat is the key decision: the frame count is only a floor. When the other tasks outnumber the idle slots, the answer is simply the number of tasks.',
      code: { view: 'final', lines: [5, 6] },
      values: { 5: 'frames = (2 - 1) * (1 + 1) + 4 = 6', 6: 'max(8, 6) = 8' },
      metrics: { maxFreq: 2, frames: 6, result: 8 },
      scene: { entities: scene({ freqs: OVERFLOW, n: 1, mode: 'full', maxFreq: 2, maxCount: 4, frames: 6, verdict: 'found', note: 'frames = 6 but 8 tasks\nno idle slot is ever needed', noteTone: 'found', rowId: 'overflow' }) },
    },
  ],
  trace: {
    title: 'Run the task scheduler on your own counts',
    inputs: [
      { name: 'frequencies', label: 'How many times each task appears', kind: 'numbers', default: '3, 3, 1, 1' },
      { name: 'n', label: 'Cooldown n (0 to 6)', kind: 'number', default: '2' },
    ],
    presets: [
      { label: 'Fits exactly', values: { frequencies: '3, 3, 1, 1', n: '2' } },
      { label: 'Idle needed', values: { frequencies: '3, 3', n: '2' } },
      { label: 'No cooldown', values: { frequencies: '3, 3, 1', n: '0' } },
      { label: 'Many types', values: { frequencies: '2, 2, 2, 2', n: '1' } },
      { label: 'One task type', values: { frequencies: '4', n: '3' } },
    ],
    maxItems: 6,
    run: (values) => {
      const f = values['frequencies'];
      const n = values['n'];
      if (!Array.isArray(f) || f.length === 0 || typeof n !== 'number') throw new Error('Enter the task counts and a cooldown.');
      if (f.some((x) => x < 1)) throw new Error('Each task must appear at least once.');
      if (n < 0 || n > 6) throw new Error('Pick a cooldown from 0 to 6.');
      const total = f.reduce((a, b) => a + b, 0);
      const frames = (Math.max(...f) - 1) * (n + 1) + f.filter((x) => x === Math.max(...f)).length;
      if (total > MAX_CELLS || frames > MAX_CELLS) throw new Error(`That schedule is longer than ${MAX_CELLS} intervals, which is too long to draw. Try smaller counts.`);
      return traceTasks(f, n);
    },
  },
});
