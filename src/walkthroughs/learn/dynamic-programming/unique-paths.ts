import { arr, defineWalkthrough, link, note, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * The grid is drawn as stacked rows (`row-k`, y = k × ROW_Y). The code keeps
 * a single row, `dp`: it sits on the grid row being computed, and when the
 * loop moves down it slides to the next row, leaving a copy of its old values
 * behind. That copy is what "old dp[c] is the cell above" means.
 */
const ROW_Y = 130;

type Phase = 'bare' | 'init' | 'row' | 'add' | 'done';

interface GridState {
  readonly rows: number;
  readonly cols: number;
  readonly phase: Phase;
  /** Grid row the dp row sits on. */
  readonly r?: number;
  /** Cell being updated. */
  readonly c?: number;
  readonly dp?: readonly number[];
  /** Finished rows above dp, row 0 first. */
  readonly above?: readonly (readonly number[])[];
  /** A whole table instead of dp (idea chapter). */
  readonly table?: readonly (readonly ScalarValue[])[];
  /** Cell of `table` to explain with arcs from above and from the left. */
  readonly focus?: readonly [number, number];
  /** Per-cell tones for `table`. */
  readonly tableTones?: readonly (readonly Tone[])[];
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
}

const rowId = (k: number): string => `row-${k}`;

/** Scene: the grid rows, the dp row, the two reads of an update, and the variables right of the top row. */
function scene(s: GridState): Entity[] {
  const { rows, cols, phase, r, c } = s;
  const entities: Entity[] = [];
  const blank = (): string[] => Array.from({ length: cols }, () => '?');

  for (let k = 0; k < rows; k += 1) {
    const y = k * ROW_Y;
    if (s.table) {
      const values = s.table[k] ?? blank();
      const tones: Record<number, Tone> = {};
      (s.tableTones?.[k] ?? []).forEach((t, j) => (tones[j] = t));
      entities.push(arr(rowId(k), 0, y, values, { label: `row ${k}`, tones }));
      continue;
    }
    if (r !== undefined && k === r) continue;
    const old = s.above?.[k];
    if (old) {
      const tones: Record<number, Tone> = {};
      old.forEach((_, j) => (tones[j] = 'done'));
      if (phase === 'add' && c !== undefined && k === (r ?? 0) - 1) tones[c] = 'compare';
      entities.push(arr(rowId(k), 0, y, old, { label: `row ${k}`, tones }));
    } else {
      const tones: Record<number, Tone> = {};
      for (let j = 0; j < cols; j += 1) tones[j] = 'muted';
      entities.push(arr(rowId(k), 0, y, blank(), { label: `row ${k}`, tones }));
    }
  }

  if (s.dp && r !== undefined) {
    const tones: Record<number, Tone> = {};
    s.dp.forEach((_, j) => {
      if (phase === 'row') tones[j] = j === 0 ? 'done' : 'muted';
      else if (phase === 'add' && c !== undefined) tones[j] = j < c ? 'done' : j === c ? 'active' : 'muted';
      else tones[j] = 'done';
    });
    if (phase === 'add' && c !== undefined) tones[c - 1] = 'compare';
    if (phase === 'done') tones[cols - 1] = 'found';
    entities.push(arr('dp', 0, r * ROW_Y, s.dp, { label: 'dp', tones, codeVar: 'dp' }));
    if (phase === 'add' && c !== undefined && r > 0) {
      entities.push(link('top', { entity: rowId(r - 1), index: c, side: 'bottom' }, { entity: 'dp', index: c, side: 'top' }, { tone: 'compare', flow: true, label: 'top' }));
      entities.push(link('left', { entity: 'dp', index: c - 1, side: 'bottom' }, { entity: 'dp', index: c, side: 'bottom' }, { tone: 'compare', flow: true, label: 'left' }));
    }
  }

  if (s.table && s.focus) {
    const [fr, fc] = s.focus;
    if (fr > 0) entities.push(link('top', { entity: rowId(fr - 1), index: fc, side: 'bottom' }, { entity: rowId(fr), index: fc, side: 'top' }, { tone: 'compare', flow: true, label: 'top' }));
    if (fc > 0) entities.push(link('left', { entity: rowId(fr), index: fc - 1, side: 'bottom' }, { entity: rowId(fr), index: fc, side: 'bottom' }, { tone: 'compare', flow: true, label: 'left' }));
  }

  if (!s.bare) {
    const dash = '—';
    entities.push(
      vars(
        'vals',
        tableBesideArray(cols, 4),
        0,
        [
          { name: 'rows', value: rows },
          { name: 'cols', value: cols },
          { name: 'r', value: r !== undefined && phase !== 'init' && phase !== 'done' ? r : dash, tone: r !== undefined && phase !== 'init' && phase !== 'done' ? 'default' : 'muted' },
          { name: 'c', value: c ?? dash, tone: c === undefined ? 'muted' : 'default' },
        ],
        { label: 'variables', width: 150 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, rows * ROW_Y + 30, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs unique_paths(rows, cols) and records one step per decision (chapter "run", final code). */
function tracePaths(rows: number, cols: number): Step[] {
  const steps: Step[] = [];
  let additions = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ additions, result });
  const dp = Array.from({ length: cols }, () => 1);
  const above: number[][] = [];

  steps.push({
    chapter: 'run',
    short: 'Row 0',
    title: `Row 0: ${cols} cell${cols === 1 ? '' : 's'}, one path each`,
    body: `Line 2 builds \`dp = [1] * ${cols}\`. Along the top row the robot can only keep going right, so every cell there has exactly one path.`,
    code: { view: 'final', lines: [2] },
    values: { 2: `dp = [${dp.join(', ')}]` },
    metrics: metrics(),
    scene: { entities: scene({ rows, cols, phase: 'init', r: 0, dp: [...dp], above: [] }) },
  });

  for (let r = 1; r < rows; r += 1) {
    above.push([...dp]);
    steps.push({
      chapter: 'run',
      short: `Row ${r}`,
      title: `Move down to row ${r}`,
      body:
        cols === 1
          ? `Line 3 sets \`r = ${r}\`. Line 4’s \`range(1, 1)\` is empty: a single column has one path, straight down, so \`dp[0]\` stays 1.`
          : `Line 3 sets \`r = ${r}\`. \`dp\` still holds row ${r - 1}, so each old \`dp[c]\` is the count of the cell **above**. \`dp[0]\` stays 1: the first column has one path, straight down.`,
      code: { view: 'final', lines: [3] },
      values: { 3: `r = ${r}` },
      metrics: metrics(),
      scene: { entities: scene({ rows, cols, phase: 'row', r, dp: [...dp], above: above.map((row) => [...row]) }) },
    });
    for (let c = 1; c < cols; c += 1) {
      const top = dp[c] ?? 0;
      const left = dp[c - 1] ?? 0;
      dp[c] = top + left;
      additions += 1;
      steps.push({
        chapter: 'run',
        short: `(${r}, ${c})`,
        title: `Cell (${r}, ${c}): ${top} + ${left} = ${top + left}`,
        body: `Line 4 sets \`c = ${c}\`. Line 5 adds the cell above (old \`dp[${c}]\` = ${top}) and the cell to the left (new \`dp[${c - 1}]\` = ${left}): \`dp[${c}] = ${top + left}\`.`,
        code: { view: 'final', lines: [4, 5] },
        values: { 4: `c = ${c}`, 5: `dp[${c}] = ${top} + ${left} = ${top + left}` },
        metrics: metrics(),
        scene: { entities: scene({ rows, cols, phase: 'add', r, c, dp: [...dp], above: above.map((row) => [...row]) }) },
      });
    }
  }

  const answer = dp[cols - 1] ?? 0;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `${answer} path${answer === 1 ? '' : 's'} to the corner`,
    body: `${rows === 1 ? 'Line 3’s `range(1, 1)` is empty, so there are no more rows. ' : 'The last row is done. '}Line 6 returns \`dp[-1]\`, the bottom-right cell: **${answer}**.`,
    code: { view: 'final', lines: [6] },
    values: { 6: `return ${answer}` },
    metrics: metrics(answer),
    scene: { entities: scene({ rows, cols, phase: 'done', r: rows - 1, dp: [...dp], above: above.map((row) => [...row]) }) },
  });
  return steps;
}

/** Full table of path counts. */
function pathTable(rows: number, cols: number): number[][] {
  const t: number[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row: number[] = [];
    for (let c = 0; c < cols; c += 1) row.push(r === 0 || c === 0 ? 1 : (t[r - 1]?.[c] ?? 0) + (row[c - 1] ?? 0));
    t.push(row);
  }
  return t;
}

/** How many times the naive walk(r, c) is called for each cell. */
function walkCalls(rows: number, cols: number): number[][] {
  const calls = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  const walk = (r: number, c: number): void => {
    const row = calls[r];
    if (row) row[c] = (row[c] ?? 0) + 1;
    if (r === rows - 1 || c === cols - 1) return;
    walk(r + 1, c);
    walk(r, c + 1);
  };
  walk(0, 0);
  return calls;
}

const ROWS = 3;
const COLS = 4;
const RUN = tracePaths(ROWS, COLS);
const startMetrics = { additions: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 8;
const CALLS = walkCalls(ROWS, COLS);
const TOTAL_CALLS = CALLS.flat().reduce((a, b) => a + b, 0);
const TABLE = pathTable(ROWS, COLS);

/** Scene of run step k (0-based), so build steps show the moment they describe. */
function at(k: number): Step['scene'] {
  return RUN[k]?.scene ?? { entities: [] };
}

export default defineWalkthrough({
  id: 'learn/dynamic-programming/unique-paths',
  title: 'Unique Paths, one row at a time',
  summary: 'From the idea to the code: count a robot’s right-and-down routes through a grid by adding the counts from above and from the left, keeping just one row.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def unique_paths(rows: int, cols: int) -> int:
    dp = [1] * cols  # The top row has 1 straight-right path per cell
    for r in range(1, rows):
        for c in range(1, cols):
            dp[c] += dp[c - 1]  # Old dp[c] is the cell above, dp[c - 1] the cell to the left
    return dp[-1]`,
  },
  snapshots: {
    brute: `def unique_paths(rows: int, cols: int) -> int:
    def walk(r: int, c: int) -> int:
        if r == rows - 1 or c == cols - 1:
            return 1  # On the last row or column: one straight path left
        return walk(r + 1, c) + walk(r, c + 1)  # Step down, or step right
    return walk(0, 0)`,
  },
  metrics: [
    { key: 'additions', label: 'Additions' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'cell being counted' },
    { tone: 'compare', label: 'top and left' },
    { tone: 'done', label: 'counted' },
    { tone: 'muted', label: 'not yet' },
    { tone: 'miss', label: 'visited again' },
    { tone: 'found', label: 'answer' },
  ],
  goals: [
    { text: 'See why walking every route repeats work', step: 2 },
    { text: 'Count a cell from above plus from the left', step: 3 },
    { text: 'Watch one row roll down the grid', step: BUILD_END + 2 },
    { text: 'Know why the inner loop goes left to right', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Count the robot’s routes',
      body: 'A robot starts in the top-left cell `S` of a grid and must reach the bottom-right cell `F`, moving only **right** or **down**.\n\nLine 1 takes the grid size and returns how many different routes exist. Here `rows = 3`, `cols = 4`, and the answer is **10**.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: {
        entities: scene({
          rows: ROWS,
          cols: COLS,
          phase: 'bare',
          bare: true,
          table: [['S', '·', '·', '·'], ['·', '·', '·', '·'], ['·', '·', '·', 'F']],
          tableTones: [['active'], [], ['default', 'default', 'default', 'found']],
          note: 'moves: right or down only\nevery route: 2 downs + 3 rights\nhow many routes? (expected 10)',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Walk all',
      title: 'The obvious way: walk every route',
      body: `Lines 2–5 try both moves from every cell. Each cell shows how often \`walk\` is called there: ${TOTAL_CALLS} calls for this small grid, and (1, 2) is solved **3 times** (red).\n\nThe calls grow with the number of routes, about \`C(rows + cols, rows)\`: **exponential** in the grid size.`,
      code: { view: 'snapshot', id: 'brute', lines: [3, 5] },
      metrics: startMetrics,
      scene: {
        entities: scene({
          rows: ROWS,
          cols: COLS,
          phase: 'bare',
          bare: true,
          table: CALLS,
          tableTones: CALLS.map((row) => row.map((n) => (n > 1 ? 'miss' : n === 1 ? 'done' : 'muted'))),
          note: 'number = calls of walk(r, c)\nred: the same cell solved again\n20 × 20 grid: ~10¹¹ calls',
          noteTone: 'miss',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Top + left',
      title: 'A cell’s routes come from above or from the left',
      body: 'The robot enters cell (r, c) either from the cell above or from the cell to its left, so **paths(r, c) = paths(r − 1, c) + paths(r, c − 1)**. The top row and the left column have one route each.\n\nFill the table row by row, left to right, and both numbers are always ready: one addition per cell.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          rows: ROWS,
          cols: COLS,
          phase: 'bare',
          bare: true,
          table: TABLE,
          focus: [2, 2],
          tableTones: TABLE.map((row, k) => row.map((_, j) => (k === 2 && j === 2 ? 'active' : (k === 1 && j === 2) || (k === 2 && j === 1) ? 'compare' : 'done'))),
          note: 'paths(r, c) = paths(r − 1, c) + paths(r, c − 1)\npaths(2, 2) = 3 + 3 = 6\nrow 0 and column 0: 1 each',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'One row',
      title: 'Keep one row and let it roll down',
      body: 'Row r only reads row r − 1. So keep one list `dp`: before cell c is updated, `dp[c]` still holds the cell **above**, and `dp[c − 1]` already holds the new cell to the **left**.\n\nOne addition, `dp[c] += dp[c − 1]`, does the whole recurrence.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ rows: ROWS, cols: COLS, phase: 'add', r: 2, c: 2, dp: [1, 4, 6, 4], above: [[1, 1, 1, 1], [1, 2, 3, 4]], bare: true, note: 'dp[2] before: 3 (the cell above)\ndp[1] now: 3 (the cell to the left)\ndp[2] after: 3 + 3 = 6' }) },
    },
    {
      chapter: 'build',
      short: 'Top row',
      title: 'Line 2: the top row is all ones',
      body: 'Along the top row the robot can only go right, so each cell has one route: `dp = [1] * cols`.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: startMetrics,
      changes: ['dp = [1] * cols'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Loops',
      title: 'Lines 3–4: every row below, every column after the first',
      body: 'Line 3 walks the rows from 1 down; line 4 walks the columns from 1 right. Column 0 is skipped: its single route straight down keeps `dp[0] = 1`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['for r in range(1, rows)', 'for c in range(1, cols)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Add',
      title: 'Line 5: top plus left',
      body: 'Line 5 is the recurrence on one row: old `dp[c]` (above) plus `dp[c − 1]` (left, already updated), stored back in `dp[c]`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [5] },
      metrics: startMetrics,
      changes: ['dp[c] += dp[c - 1]'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 6: the last cell is the corner',
      body: 'After the last row, `dp[-1]` is the bottom-right cell, and line 6 returns it.\n\nThat’s the whole function. Now let’s run it on a 3 × 4 grid.',
      code: { view: 'final', lines: [6] },
      metrics: startMetrics,
      changes: ['return dp[-1]'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One addition per cell: O(rows · cols)',
      body: 'Every cell outside the first row and column costs one addition, so it’s **`O(rows · cols)` time**. Only one row is stored: **`O(cols)` space**, instead of the whole table.\n\nSwitch to **🧪 Try your own** to run it on other grid sizes.',
      code: { view: 'final', lines: [3, 4, 5] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ rows: ROWS, cols: COLS, phase: 'done', r: ROWS - 1, dp: [1, 3, 6, 10], above: [[1, 1, 1, 1], [1, 2, 3, 4]], note: `walking every route: ${TOTAL_CALLS} calls\nthis loop: 6 additions\n20 × 20: 10¹¹ calls vs 361 additions`, noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Left to right',
      title: 'Why the inner loop runs left to right',
      body: 'Line 5 needs the **new** value on the left and the **old** value above. Going left to right, `dp[c − 1]` has just been updated while `dp[c]` hasn’t, so both are right.\n\nThat is the key decision. Run `c` from right to left and `dp[c − 1]` would still be the old row: cell (2, 2) would get 3 + 2 = 5 instead of 6.',
      code: { view: 'final', lines: [4, 5] },
      values: { 5: 'dp[2] = 3 (above) + 3 (left, new) = 6' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ rows: ROWS, cols: COLS, phase: 'add', r: 2, c: 2, dp: [1, 3, 6, 4], above: [[1, 1, 1, 1], [1, 2, 3, 4]], note: 'left to right: 3 + 3 = 6 ✓\nright to left: dp[1] is still 2\n3 + 2 = 5 ✗' }) },
    },
  ],
  trace: {
    title: 'Run unique_paths on your own grid',
    inputs: [
      { name: 'rows', label: 'rows (1 to 5)', kind: 'number', default: '4' },
      { name: 'cols', label: 'cols (1 to 7)', kind: 'number', default: '4' },
    ],
    presets: [
      { label: 'One row', values: { rows: '1', cols: '5' } },
      { label: 'One column', values: { rows: '4', cols: '1' } },
      { label: '1 × 1', values: { rows: '1', cols: '1' } },
      { label: 'Lesson example', values: { rows: '3', cols: '4' } },
      { label: '3 × 7', values: { rows: '3', cols: '7' } },
    ],
    run: (values) => {
      const rows = values['rows'];
      const cols = values['cols'];
      if (typeof rows !== 'number' || rows < 1 || rows > 5) throw new Error('Pick rows from 1 to 5, so the grid fits on the stage.');
      if (typeof cols !== 'number' || cols < 1 || cols > 7) throw new Error('Pick cols from 1 to 7, so the grid fits on the stage.');
      return tracePaths(rows, cols);
    },
  },
});
