import { arr, defineWalkthrough, note, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const ROW_DEADLINE = 0;
const ROW_PROFIT = 130;
const ROW_SLOTS = 260;
const NOTE_Y = 390;

/** A job (its id is its input position), keyed so sorting slides both rows together. */
interface Job {
  readonly deadline: number;
  readonly profit: number;
  readonly id: number;
}

/** `free` / `taken`: line 10 looked at slot `t`. `place`: lines 11–13 ran. `discard`: no slot was left. */
type Phase = 'free' | 'taken' | 'place' | 'discard';

interface SeqState {
  readonly jobs: readonly Job[];
  /** Job id in each slot (index 0 is never used), or null while the slot is free. */
  readonly slots: readonly (number | null)[];
  readonly total: number;
  /** Position of the job being scheduled, and the slot being looked at. */
  readonly at?: number;
  readonly t?: number;
  readonly phase?: Phase;
  /** Job ids that were placed (done) or discarded (muted) before `at`. */
  readonly placed: readonly number[];
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Before the code has `slots` and `total_profit`. */
  readonly bare?: boolean;
  readonly rowId?: string;
  readonly finished?: boolean;
}

/** Scene for one moment: deadline, profit and slot rows, tones for placed / discarded jobs, and the variables. */
function scene(s: SeqState): Entity[] {
  const prefix = s.rowId ?? 'jobs';
  const tones: Record<number, Tone> = {};
  s.jobs.forEach((job, k) => {
    const before = s.finished || (s.at !== undefined && k < s.at);
    if (before) tones[k] = s.placed.includes(job.id) ? 'done' : 'muted';
  });
  if (s.at !== undefined && !s.finished) tones[s.at] = s.phase === 'discard' ? 'miss' : 'active';

  const slotTones: Record<number, Tone> = { 0: 'muted' };
  s.slots.forEach((slot, t) => {
    if (t > 0 && slot !== null) slotTones[t] = 'done';
  });
  if (s.t !== undefined && s.t > 0) slotTones[s.t] = s.phase === 'free' ? 'compare' : s.phase === 'taken' ? 'miss' : s.phase === 'place' ? 'active' : (slotTones[s.t] ?? 'default');

  const keys = s.jobs.map((j) => j.id);
  const ids = s.jobs.map((j) => j.id);
  const entities: Entity[] = [
    arr(`${prefix}-deadline`, 0, ROW_DEADLINE, s.jobs.map((j) => j.deadline), { label: 'deadlines (job id below)', tones, itemKeys: keys, indexLabels: ids }),
    arr(`${prefix}-profit`, 0, ROW_PROFIT, s.jobs.map((j) => j.profit), { label: 'profits', tones, codeVar: 'profits', itemKeys: keys, indexLabels: ids }),
  ];
  if (!s.bare) {
    entities.push(arr('slots', 0, ROW_SLOTS, s.slots.map((v) => (v === null ? '—' : v)), { label: 'slots (job id in each time slot)', tones: slotTones, codeVar: 'slots' }));
  }

  const cur = s.at === undefined ? undefined : s.jobs[s.at];
  const showCur = cur !== undefined && !s.finished;
  const x = tableBesideArray(Math.max(s.jobs.length, s.slots.length), 4);
  const rows: VarRow[] = [
    { name: 'job', value: showCur ? cur.id : '—', tone: showCur ? 'default' : 'muted' },
    { name: 't', value: s.t ?? '—', tone: s.t === undefined ? 'muted' : 'default' },
    { name: 'total_profit', value: s.total, tone: s.finished ? 'found' : 'default' },
  ];
  if (!s.bare) entities.push(vars('vals', x, 0, rows, { label: 'variables', width: 190 }));
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs job sequencing on any input and records one step per decision (chapter "run", final code). */
function traceJobs(deadlines: readonly number[], profits: readonly number[]): Step[] {
  const jobs: Job[] = profits.map((profit, id) => ({ deadline: deadlines[id] ?? 1, profit, id }));
  const order = [...jobs].sort((a, b) => b.profit - a.profit);
  const slots: (number | null)[] = Array<number | null>(Math.max(...deadlines) + 1).fill(null);
  const steps: Step[] = [];
  const placed: number[] = [];
  let total = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ placed: placed.length, totalProfit: total, result });
  const snap = (extra: Partial<SeqState>): Entity[] => scene({ jobs: order, slots: [...slots], total, placed: [...placed], ...extra });

  steps.push({
    chapter: 'run',
    short: 'Sort by profit',
    title: 'Sort the jobs by profit, highest first',
    body: `Line 3 sorts the job ids by \`profits[j]\`, biggest first. The jobs now read ${order.map((j) => `#${j.id} (${j.profit})`).join(', ')}.`,
    code: { view: 'final', lines: [3] },
    values: { 3: `order = ${JSON.stringify(order.map((j) => j.id))}` },
    metrics: metrics(),
    scene: { entities: scene({ jobs: order, slots, total, placed: [], bare: true }) },
  });
  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `${slots.length - 1} empty slots, no profit yet`,
    body: `Line 4 makes one slot per time unit up to the latest deadline, plus an unused slot 0 so \`slots[t]\` means time slot \`t\`. Line 5 starts \`total_profit = 0\`.`,
    code: { view: 'final', lines: [4, 5] },
    values: { 4: `slots = ${JSON.stringify(slots).replace(/null/g, 'None')}`, 5: 'total_profit = 0' },
    metrics: metrics(),
    scene: { entities: snap({}) },
  });

  order.forEach((job, at) => {
    let first = true;
    let done = false;
    for (let t = job.deadline; t >= 1; t -= 1) {
      const lines = first ? [7, 9, 10] : [9, 10];
      const free = slots[t] === null;
      const intro = first ? `Line 7 takes job #${job.id} (deadline ${job.deadline}, profit ${job.profit}). Line 9 starts at its deadline, \`t = ${t}\`.` : `Line 9 moves to \`t = ${t}\`.`;
      steps.push({
        chapter: 'run',
        short: free ? `Slot ${t} free` : `Slot ${t} taken`,
        title: free ? `Slot ${t} is free for job #${job.id}` : `Slot ${t} already holds job #${slots[t]}`,
        body: `${intro} Line 10: \`slots[${t}] is None\` is ${free ? 'true' : 'false'}.${free ? '' : t > 1 ? '\n\nAn earlier slot may still do, so the loop tries one slot earlier.' : '\n\nThere is no earlier slot left.'}`,
        code: { view: 'final', lines },
        values: first ? { 7: `job = ${job.id}`, 9: `t = ${t}`, 10: `slots[${t}] is None → ${free ? 'True' : 'False'}` } : { 9: `t = ${t}`, 10: `slots[${t}] is None → ${free ? 'True' : 'False'}` },
        metrics: metrics(),
        scene: { entities: snap({ at, t, phase: free ? 'free' : 'taken' }) },
      });
      first = false;
      if (free) {
        slots[t] = job.id;
        total += job.profit;
        placed.push(job.id);
        steps.push({
          chapter: 'run',
          short: `Job ${job.id} → ${t}`,
          title: `Schedule job #${job.id} in slot ${t}: +${job.profit}`,
          body: `Line 11 stores job ${job.id} in \`slots[${t}]\`. Line 12 adds its profit: \`total_profit = ${total}\`. Line 13 \`break\`s out of the slot loop, because the job has its place.`,
          code: { view: 'final', lines: [11, 12, 13] },
          values: { 11: `slots[${t}] = ${job.id}`, 12: `total_profit = ${total}`, 13: 'break' },
          changes: [`slots[${t}] = ${job.id}`, `total_profit = ${total}`],
          metrics: metrics(),
          scene: { entities: snap({ at, t, phase: 'place' }) },
        });
        done = true;
        break;
      }
    }
    if (!done) {
      steps.push({
        chapter: 'run',
        short: `Drop job ${job.id}`,
        title: `No free slot by deadline ${job.deadline}: drop job #${job.id}`,
        body: `Line 9: \`t\` has run down to 0 without finding a free slot, so the inner loop ends and the job is **discarded**. It would have earned ${job.profit}, but every slot up to its deadline holds a more profitable job.`,
        code: { view: 'final', lines: [9] },
        values: { 9: `range(${job.deadline}, 0, -1) is exhausted` },
        metrics: metrics(),
        scene: { entities: snap({ at, phase: 'discard' }) },
      });
    }
  });

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${total}`,
    body: `Line 15 returns **${total}**, the profit of the ${placed.length} job${placed.length === 1 ? '' : 's'} that got a slot.`,
    code: { view: 'final', lines: [15] },
    values: { 15: `return ${total}` },
    metrics: metrics(total),
    scene: { entities: snap({ finished: true }) },
  });
  return steps;
}

const DEADLINES = [1, 2, 2, 1, 3] as const;
const PROFITS = [19, 100, 27, 25, 15] as const;
const RUN = traceJobs(DEADLINES, PROFITS);
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { placed: 0, totalProfit: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const toJobs = (d: readonly number[], p: readonly number[]): Job[] => p.map((profit, id) => ({ deadline: d[id] ?? 1, profit, id }));
const STORY_JOBS = toJobs(DEADLINES, PROFITS);
const SORTED_JOBS: Job[] = [...STORY_JOBS].sort((a, b) => b.profit - a.profit);

export default defineWalkthrough({
  id: 'learn/greedy/job-sequencing',
  title: 'Job Sequencing with Deadlines, latest free slot first',
  summary: 'From a bakery with deadlines to the code: take jobs by profit and give each the latest free slot before its deadline.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def job_sequencing(deadlines: list[int], profits: list[int]) -> int:
    # Most profitable job first: it gets the first pick of the slots
    order = sorted(range(len(profits)), key=lambda j: profits[j], reverse=True)
    slots: list[int | None] = [None] * (max(deadlines) + 1)
    total_profit = 0

    for job in order:
        # Latest free slot before the deadline keeps earlier slots open
        for t in range(deadlines[job], 0, -1):
            if slots[t] is None:
                slots[t] = job
                total_profit += profits[job]
                break

    return total_profit`,
  },
  metrics: [
    { key: 'placed', label: 'Jobs scheduled' },
    { key: 'totalProfit', label: 'Profit so far' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'job / slot being filled' },
    { tone: 'compare', label: 'free slot found' },
    { tone: 'miss', label: 'slot taken, job dropped' },
    { tone: 'done', label: 'scheduled' },
    { tone: 'muted', label: 'dropped or unused' },
    { tone: 'found', label: 'final profit' },
  ],
  goals: [
    { text: 'See why a job takes the latest free slot', step: 3 },
    { text: 'Build the nested loop one idea at a time', step: 4 },
    { text: 'Follow every slot check, placement and drop', step: 9 },
    { text: 'Know why the latest slot is safe', step: 24 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Choose bakery orders that fit before their deadlines',
      body: 'Every cake takes **one hour**, has a **deadline** (an hour number) and pays a **profit** if it is ready by then. Only one cake can bake per hour.\n\nLine 1 takes the `deadlines` and `profits` of the jobs and returns the biggest total profit. Five jobs are drawn here, with their ids under the cells.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ jobs: STORY_JOBS, slots: [], total: 0, placed: [], bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Earliest slot?',
      title: 'Using the earliest free slot wastes room for urgent jobs',
      body: 'Take a 100-profit job with deadline 2 and a 25-profit job with deadline 1. If the big job grabs **slot 1**, the urgent one has nowhere to go: profit **100**.\n\nIf the big job waits in slot 2, both fit: **125**.',
      code: { view: 'signature' },
      metrics: { placed: 1, totalProfit: 100, result: '—' },
      scene: {
        entities: scene({
          jobs: toJobs([2, 1], [100, 25]),
          slots: [null, 0, null],
          total: 100,
          placed: [0],
          rowId: 'trap',
          note: 'earliest slot: 100\nlatest slot: 100 + 25 = 125',
          noteTone: 'miss',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Latest slot',
      title: 'Best profit first, in the latest slot it can have',
      body: 'Go through the jobs from the most profitable. Each takes the **latest free slot at or before its deadline**, which keeps the earlier slots open for jobs with tighter deadlines.\n\nIf every slot up to the deadline is taken, the job can’t be scheduled and is dropped. A dropped job never beats the ones already placed, since those pay more.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ jobs: SORTED_JOBS, slots: [], total: 0, placed: [], bare: true, note: 'sorted by profit: 100, 27, 25, 19, 15' }) },
    },
    {
      chapter: 'build',
      short: 'Rank',
      title: 'Lines 2–3: put the jobs in order of profit',
      body: '`order` holds the job ids, sorted so that `profits[j]` is largest first. Sorting ids instead of the lists keeps each job’s deadline reachable as `deadlines[job]`.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [3] },
      metrics: startMetrics,
      changes: ['order = job ids by profit, high to low'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Slots',
      title: 'Lines 4–5: one slot per hour, and a profit counter',
      body: '`slots` has an entry for every hour up to the latest deadline, all `None` (free). Slot 0 is never used, so `slots[t]` means hour `t`. `total_profit` starts at 0.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [4, 5] },
      metrics: startMetrics,
      changes: ['slots = [None] * (max(deadlines) + 1)', 'total_profit = 0'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Search slots',
      title: 'Lines 7–9: for each job, count down from its deadline',
      body: 'The outer loop takes jobs in profit order. `range(deadlines[job], 0, -1)` tries the deadline first, then each earlier hour down to 1: the latest slot comes first.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9], lines: [7, 9] },
      metrics: startMetrics,
      changes: ['for job in order', 'for t in range(deadlines[job], 0, -1)'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Place it',
      title: 'Lines 10–12: use the first free slot and count the profit',
      body: 'If `slots[t]` is still `None`, the job takes it (line 11) and its profit is added (line 12).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12], lines: [10, 11, 12] },
      metrics: { placed: 1, totalProfit: 100, result: '—' },
      changes: ['slots[t] = job', 'total_profit += profits[job]'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Break, return',
      title: 'Lines 13 and 15: stop searching once placed, then return',
      body: '`break` ends the slot search as soon as the job has a place, so it never takes two slots. When every job has been tried, `total_profit` is the answer. A job whose search runs out of slots simply isn’t placed.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [13, 15] },
      metrics: FINAL_METRICS,
      changes: ['break', 'return total_profit'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'The sort plus the slot searches: O(n log n + n·d)',
      body: 'Sorting `n` jobs costs `O(n log n)`. Each job may scan up to `d` slots, where `d` is the latest deadline, so the searches cost `O(n · d)`. `slots` takes `O(d)` space.\n\nSwitch to **🧪 Try your own** to schedule your own jobs.',
      code: { view: 'final', lines: [3, 9] },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          jobs: SORTED_JOBS,
          slots: [null, 2, 1, 4],
          total: 142,
          placed: [1, 2, 4],
          finished: true,
          note: 'n = 5 jobs, d = 3 slots\n3 jobs scheduled: 100 + 27 + 15',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'why',
      short: 'Why latest',
      title: 'Line 9 counts down so urgent jobs keep their early slots',
      body: 'In the run, job #1 (profit 100, deadline 2) took slot 2, not slot 1. Slot 1 stayed free for job #2 (deadline 2) when slot 2 was gone.\n\nThat is the key decision: the **latest** free slot never blocks a job that is more urgent, and trying jobs in profit order means a dropped job can never be better than the ones already scheduled.',
      code: { view: 'final', lines: [9, 10, 11] },
      values: { 9: 'range(2, 0, -1) → 2, 1', 11: 'slots[2] = 1: slot 1 stays open for job #2' },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          jobs: SORTED_JOBS,
          slots: [null, null, 1, null],
          total: 100,
          at: 0,
          t: 2,
          phase: 'place',
          placed: [],
          note: 'slot 2 for the 100 job\nslot 1 left open for tighter deadlines',
          noteTone: 'found',
        }),
      },
    },
  ],
  trace: {
    title: 'Run job sequencing on your own jobs',
    inputs: [
      { name: 'deadlines', label: 'Deadlines (1 to 8)', kind: 'numbers', default: '1, 2, 2, 1, 3' },
      { name: 'profits', label: 'Profits (same count)', kind: 'numbers', default: '19, 100, 27, 25, 15' },
    ],
    presets: [
      { label: 'Five orders', values: { deadlines: '1, 2, 2, 1, 3', profits: '19, 100, 27, 25, 15' } },
      { label: 'All fit', values: { deadlines: '1, 2, 3', profits: '5, 6, 7' } },
      { label: 'One slot only', values: { deadlines: '1, 1, 1', profits: '5, 9, 7' } },
      { label: 'Late deadlines', values: { deadlines: '4, 4, 4, 4', profits: '10, 20, 30, 40' } },
      { label: 'Single job', values: { deadlines: '3', profits: '8' } },
    ],
    maxItems: 6,
    run: (values) => {
      const d = values['deadlines'];
      const p = values['profits'];
      if (!Array.isArray(d) || !Array.isArray(p) || d.length === 0) throw new Error('Enter deadlines and profits.');
      if (d.length !== p.length) throw new Error('Give one profit for every deadline.');
      if (d.some((x) => x < 1 || x > 8)) throw new Error('Deadlines must be from 1 to 8.');
      return traceJobs(d, p);
    },
  },
});
