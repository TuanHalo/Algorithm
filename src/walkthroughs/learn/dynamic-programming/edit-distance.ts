import { arr, defineWalkthrough, link, note, vars } from '../../../lib/walkthrough/helpers';
import { PITCH, tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * Same table layout as LCS: dp[i][j] as stacked rows (`dp-i`) under a
 * `word2` header over columns 1…n, with word1[i − 1] in a block in front of
 * row i. dp[i][j] = edits to turn word1[:i] into word2[:j].
 */
const TOP = 110;
const ROW_Y = 105;
const LETTER_X = -PITCH - 24;

type Phase = 'bare' | 'init' | 'col' | 'row' | 'match' | 'edit' | 'done';
type Edit = 'delete' | 'insert' | 'replace';

interface EditState {
  readonly w1: string;
  readonly w2: string;
  readonly phase: Phase;
  readonly dp: readonly (readonly ScalarValue[])[];
  readonly i?: number;
  readonly j?: number;
  /** In an edit step, the cheapest edit. */
  readonly best?: Edit;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
  readonly cellTones?: Readonly<Record<string, Tone>>;
}

const rowId = (i: number): string => `dp-${i}`;

/** Scene: word2 header, word1 letters, the dp rows, the reads of the current cell, and the variables. */
function scene(s: EditState): Entity[] {
  const { w1, w2, phase, i, j } = s;
  const m = w1.length;
  const n = w2.length;
  const entities: Entity[] = [];
  const active = phase === 'match' || phase === 'edit';

  const headTones: Record<number, Tone> = {};
  if (active && j !== undefined) headTones[j - 1] = phase === 'match' ? 'found' : 'miss';
  entities.push(arr('word2', PITCH, 0, [...w2], { label: 'word2', tones: headTones, codeVar: 'word2', indexLabels: [...w2].map((_, k) => `j=${k + 1}`) }));

  for (let r = 0; r <= m; r += 1) {
    const y = TOP + r * ROW_Y;
    if (r >= 1) {
      const tone: Tone = active && i === r ? (phase === 'match' ? 'found' : 'miss') : 'default';
      entities.push(arr(`w1-${r}`, LETTER_X, y, [w1[r - 1] ?? ''], { tones: { 0: tone }, indexLabels: [`i=${r}`] }));
    }
    const row = s.dp[r] ?? [];
    const values: ScalarValue[] = Array.from({ length: n + 1 }, (_, c) => row[c] ?? '?');
    const tones: Record<number, Tone> = {};
    values.forEach((v, c) => {
      tones[c] = s.cellTones?.[`${r},${c}`] ?? (v === '?' ? 'muted' : 'done');
    });
    if (phase === 'col') tones[0] = 'active';
    if (phase === 'row' && r === 0) values.forEach((_, c) => (tones[c] = 'active'));
    if (active && i !== undefined && j !== undefined) {
      if (r === i) tones[j] = 'active';
      if (r === i - 1) tones[j - 1] = 'compare';
      if (phase === 'edit') {
        if (r === i - 1) tones[j] = 'compare';
        if (r === i) tones[j - 1] = 'compare';
      }
    }
    if (phase === 'done' && r === m) tones[n] = 'found';
    entities.push(arr(rowId(r), 0, y, values, { label: r === 0 ? 'dp' : undefined, tones, codeVar: 'dp', showIndex: r === 0 }));
  }

  if (active && i !== undefined && j !== undefined) {
    const to = { entity: rowId(i), index: j, side: 'top' as const };
    const diagFrom = { entity: rowId(i - 1), index: j - 1, side: 'bottom' as const };
    if (phase === 'match') {
      entities.push(link('replace', diagFrom, to, { tone: 'found', flow: true, label: 'free' }));
    } else {
      // Only the cheapest edit is labelled; three labels around one cell would collide.
      const style = (e: Edit): { tone: Tone; dashed: boolean; flow: boolean; label?: string } => ({
        tone: s.best === e ? 'found' : 'miss',
        dashed: s.best !== e,
        flow: s.best === e,
        ...(s.best === e ? { label: e } : {}),
      });
      entities.push(link('delete', { entity: rowId(i - 1), index: j, side: 'bottom' }, to, style('delete')));
      entities.push(link('insert', { entity: rowId(i), index: j - 1, side: 'bottom' }, { entity: rowId(i), index: j, side: 'bottom' }, style('insert')));
      entities.push(link('replace', diagFrom, to, style('replace')));
    }
  }

  if (!s.bare) {
    const dash = '—';
    entities.push(
      vars(
        'vals',
        tableBesideArray(n + 1, 4),
        0,
        [
          { name: 'word1', value: `"${w1}"` },
          { name: 'word2', value: `"${w2}"` },
          { name: 'i', value: active ? (i ?? dash) : dash, tone: active ? 'default' : 'muted' },
          { name: 'j', value: active ? (j ?? dash) : dash, tone: active ? 'default' : 'muted' },
        ],
        { label: 'variables', width: 170 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, TOP + (m + 1) * ROW_Y + 70, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs min_distance(word1, word2) and records one step per decision (chapter "run", final code). */
function traceEdit(w1: string, w2: string): Step[] {
  const steps: Step[] = [];
  const m = w1.length;
  const n = w2.length;
  let edits = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ cells: edits, result });
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));
  const filled: boolean[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => false));
  const shown = (): ScalarValue[][] => dp.map((row, r) => row.map((v, c) => (filled[r]?.[c] ? v : '?')));

  steps.push({
    chapter: 'run',
    short: 'Table',
    title: `A ${m + 1} × ${n + 1} table`,
    body: `Line 2: \`m = ${m}\`, \`n = ${n}\`. Line 3 makes ${m + 1} rows of ${n + 1} cells; nothing is filled in yet.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: `m, n = ${m}, ${n}`, 3: `dp = ${m + 1} × ${n + 1}` },
    metrics: metrics(),
    scene: { entities: scene({ w1, w2, phase: 'init', dp: shown() }) },
  });
  for (let r = 0; r <= m; r += 1) {
    const row = dp[r];
    const f = filled[r];
    if (row && f) {
      row[0] = r;
      f[0] = true;
    }
  }
  steps.push({
    chapter: 'run',
    short: 'Column 0',
    title: `Column 0: delete everything, 0…${m}`,
    body: `Lines 4–5 set \`dp[i][0] = i\`: turning the first \`i\` letters of \`"${w1}"\` into an empty word takes \`i\` deletions.`,
    code: { view: 'final', lines: [4, 5] },
    values: { 5: `dp[i][0] = 0 … ${m}` },
    metrics: metrics(),
    scene: { entities: scene({ w1, w2, phase: 'col', dp: shown() }) },
  });
  const top = dp[0];
  const topFilled = filled[0];
  for (let c = 0; c <= n; c += 1) {
    if (top && topFilled) {
      top[c] = c;
      topFilled[c] = true;
    }
  }
  steps.push({
    chapter: 'run',
    short: 'Row 0',
    title: `Row 0: insert everything, 0…${n}`,
    body: `Lines 6–7 set \`dp[0][j] = j\`: building the first \`j\` letters of \`"${w2}"\` from nothing takes \`j\` insertions.`,
    code: { view: 'final', lines: [6, 7] },
    values: { 7: `dp[0][j] = 0 … ${n}` },
    metrics: metrics(),
    scene: { entities: scene({ w1, w2, phase: 'row', dp: shown() }) },
  });

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const a = w1[i - 1] ?? '';
      const b = w2[j - 1] ?? '';
      const lead = j === 1 ? `Line 8 moves to row \`i = ${i}\`; line 9 starts at \`j = 1\`. ` : `Line 9 moves to \`j = ${j}\`. `;
      const lines = j === 1 ? [8, 9, 10] : [9, 10];
      const loopValues: Record<number, string> = j === 1 ? { 8: `i = ${i}`, 9: `j = ${j}` } : { 9: `j = ${j}` };
      const diag = dp[i - 1]?.[j - 1] ?? 0;
      const row = dp[i];
      const f = filled[i];
      if (a === b) {
        if (row && f) {
          row[j] = diag;
          f[j] = true;
        }
        edits += 1;
        steps.push({
          chapter: 'run',
          short: `(${i}, ${j}) ${a}=${b}`,
          title: `'${a}' = '${b}': free, dp[${i}][${j}] = ${diag}`,
          body: `${lead}Line 10: \`word1[${i - 1}] = '${a}'\` already equals \`word2[${j - 1}] = '${b}'\`, so no edit is needed. Line 11 copies the diagonal: \`dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${diag}\`.`,
          code: { view: 'final', lines: [...lines, 11] },
          values: { ...loopValues, 10: `'${a}' == '${b}' → True`, 11: `dp[${i}][${j}] = ${diag}` },
          metrics: metrics(),
          scene: { entities: scene({ w1, w2, phase: 'match', dp: shown(), i, j }) },
        });
      } else {
        const del = dp[i - 1]?.[j] ?? 0;
        const ins = dp[i]?.[j - 1] ?? 0;
        const low = Math.min(del, ins, diag);
        const best: Edit = del === low ? 'delete' : ins === low ? 'insert' : 'replace';
        if (row && f) {
          row[j] = 1 + low;
          f[j] = true;
        }
        edits += 1;
        const how = best === 'delete' ? `delete '${a}'` : best === 'insert' ? `insert '${b}'` : `replace '${a}' with '${b}'`;
        steps.push({
          chapter: 'run',
          short: `(${i}, ${j}) ${a}≠${b}`,
          title: `'${a}' ≠ '${b}': 1 + min(${del}, ${ins}, ${diag}) = ${1 + low}`,
          body: `${lead}Line 10: \`'${a}'\` ≠ \`'${b}'\`, so one edit is needed. Line 13 picks the cheapest way to get here: delete (above, ${del}), insert (left, ${ins}) or replace (diagonal, ${diag}). Best: ${how}, \`dp[${i}][${j}] = ${1 + low}\`.`,
          code: { view: 'final', lines: [...lines, 12, 13] },
          values: { ...loopValues, 10: `'${a}' == '${b}' → False`, 13: `dp[${i}][${j}] = 1 + min(${del}, ${ins}, ${diag}) = ${1 + low}` },
          metrics: metrics(),
          scene: { entities: scene({ w1, w2, phase: 'edit', dp: shown(), i, j, best }) },
        });
      }
    }
  }

  const answer = dp[m]?.[n] ?? 0;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `"${w1}" → "${w2}": ${answer} edit${answer === 1 ? '' : 's'}`,
    body: `The table is full. Line 14 returns \`dp[${m}][${n}]\`, the edits for the whole words: **${answer}**.`,
    code: { view: 'final', lines: [14] },
    values: { 14: `return ${answer}` },
    metrics: metrics(answer),
    scene: { entities: scene({ w1, w2, phase: 'done', dp: shown() }) },
  });
  return steps;
}

/** Full edit-distance table. */
function editTable(w1: string, w2: string): number[][] {
  const dp = Array.from({ length: w1.length + 1 }, (_, i) => Array.from({ length: w2.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= w1.length; i += 1) {
    for (let j = 1; j <= w2.length; j += 1) {
      const row = dp[i];
      if (!row) continue;
      const diag = dp[i - 1]?.[j - 1] ?? 0;
      row[j] = w1[i - 1] === w2[j - 1] ? diag : 1 + Math.min(dp[i - 1]?.[j] ?? 0, row[j - 1] ?? 0, diag);
    }
  }
  return dp;
}

/** How often the naive recursion visits each (i, j). */
function naiveCalls(w1: string, w2: string): number[][] {
  const calls = Array.from({ length: w1.length + 1 }, () => Array.from({ length: w2.length + 1 }, () => 0));
  const go = (i: number, j: number): void => {
    const row = calls[i];
    if (row) row[j] = (row[j] ?? 0) + 1;
    if (i === 0 || j === 0) return;
    if (w1[i - 1] === w2[j - 1]) go(i - 1, j - 1);
    else {
      go(i - 1, j);
      go(i, j - 1);
      go(i - 1, j - 1);
    }
  };
  go(w1.length, w2.length);
  return calls;
}

const W1 = 'ros';
const W2 = 'horse';
const RUN = traceEdit(W1, W2);
const startMetrics = { cells: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 11;
const TABLE = editTable(W1, W2);
const CALLS = naiveCalls(W1, W2);
const TOTAL_CALLS = CALLS.flat().reduce((x, y) => x + y, 0);
const UNKNOWN = TABLE.map((row) => row.map(() => '?'));

/** Scene of run step k (0-based), so build steps show the moment they describe. */
function at(k: number): Step['scene'] {
  return RUN[k]?.scene ?? { entities: [] };
}

/** Run index of cell (i, j). */
const cellStep = (i: number, j: number): number => 2 + (i - 1) * W2.length + j;

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
/** Trace inputs encode letters as 1–26 (1 = a). */
function decode(codes: readonly number[], label: string): string {
  if (codes.some((c) => c < 1 || c > 26)) throw new Error(`${label}: use 1 to 26 for the letters a to z.`);
  return codes.map((c) => LETTERS[c - 1] ?? '').join('');
}

export default defineWalkthrough({
  id: 'learn/dynamic-programming/edit-distance',
  title: 'Edit Distance, the cheapest of three edits',
  summary: 'From the idea to the code: count the fewest single-letter inserts, deletes and replacements that turn one word into another, one prefix pair at a time.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def min_distance(word1: str, word2: str) -> int:
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]`,
  },
  snapshots: {
    brute: `def min_distance(word1: str, word2: str) -> int:
    def dist(i: int, j: int) -> int:
        if i == 0 or j == 0:
            return i + j  # Insert or delete whatever is left
        if word1[i - 1] == word2[j - 1]:
            return dist(i - 1, j - 1)
        return 1 + min(dist(i - 1, j), dist(i, j - 1), dist(i - 1, j - 1))
    return dist(len(word1), len(word2))`,
  },
  metrics: [
    { key: 'cells', label: 'Cells filled' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'dp[i][j] being filled' },
    { tone: 'compare', label: 'cells it reads' },
    { tone: 'done', label: 'filled' },
    { tone: 'muted', label: 'not yet' },
    { tone: 'miss', label: 'letters differ / dearer edit' },
    { tone: 'found', label: 'letters match / cheapest edit / answer' },
  ],
  goals: [
    { text: 'See why plain recursion repeats prefix pairs', step: 2 },
    { text: 'Read delete, insert and replace off the table', step: 4 },
    { text: 'Fill every cell, one decision at a time', step: BUILD_END + cellStep(1, 1) + 1 },
    { text: 'Know why a match costs nothing', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'The fewest edits from one word to another',
      body: 'An edit inserts, deletes or replaces one letter. Line 1 takes `word1` and `word2` and returns the fewest edits that turn `word1` into `word2`.\n\nHere `"ros"` → `"horse"` takes **3**: replace r with h (`"hos"`), insert r (`"hors"`), insert e (`"horse"`).',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ w1: W1, w2: W2, phase: 'bare', dp: UNKNOWN, bare: true, note: 'ros → hos → hors → horse\n1 replace + 2 inserts = 3' }) },
    },
    {
      chapter: 'idea',
      short: 'Recursion',
      title: 'The obvious way: try all three edits, recursively',
      body: `Compare the last letters. Equal: nothing to do, shorten both. Different: try all three edits (line 7). Each cell shows how often \`dist(i, j)\` runs: ${TOTAL_CALLS} calls for these tiny words (red: repeats).\n\nEvery mismatch branches three ways: about **\`O(3^(m + n))\`**.`,
      code: { view: 'snapshot', id: 'brute', lines: [5, 6, 7] },
      metrics: startMetrics,
      scene: {
        entities: scene({
          w1: W1,
          w2: W2,
          phase: 'bare',
          dp: CALLS,
          bare: true,
          cellTones: Object.fromEntries(CALLS.flatMap((row, r) => row.map((v, c) => [`${r},${c}`, v > 1 ? 'miss' : v === 1 ? 'done' : 'muted'] as const))),
          note: 'number = calls of dist(i, j)\nonly 4 × 6 = 24 pairs exist',
          noteTone: 'miss',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Edges',
      title: 'Against an empty word, count the letters',
      body: 'Let `dp[i][j]` be the edits that turn the first `i` letters of `word1` into the first `j` letters of `word2`. Against an empty prefix the answer is fixed: delete all `i` letters (**column 0 = i**) or insert all `j` (**row 0 = j**).\n\nThat’s different from LCS, where empty prefixes are worth 0.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          w1: W1,
          w2: W2,
          phase: 'bare',
          bare: true,
          dp: TABLE.map((row, r) => row.map((v, c) => (r === 0 || c === 0 ? v : '?'))),
          note: '"ros" → "": 3 deletes\n"" → "horse": 5 inserts',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Three edits',
      title: 'Otherwise: the cheapest of three edits, plus one',
      body: 'Same last letter: it costs nothing, so **dp[i][j] = dp[i − 1][j − 1]**. Different: the last edit was a **delete** (above), an **insert** (left) or a **replace** (diagonal), so **dp[i][j] = 1 + min(above, left, diagonal)**.\n\nFill rows top to bottom, left to right, and all three are ready.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ w1: W1, w2: W2, phase: 'edit', dp: TABLE, i: 1, j: 1, best: 'replace', bare: true, note: '"r" → "h": r ≠ h\ndelete 1+1, insert 1+1, replace 1+0\n→ dp[1][1] = 1' }) },
    },
    {
      chapter: 'build',
      short: 'Table',
      title: 'Lines 2–3: an (m + 1) × (n + 1) table',
      body: 'One extra row and column stand for the empty prefixes, so `dp[i − 1]` and `[j − 1]` always exist.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['m, n = len(word1), len(word2)', 'dp = [[0] * (n + 1) for _ in range(m + 1)]'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Column 0',
      title: 'Lines 4–5: column 0 deletes everything',
      body: '`dp[i][0] = i`: `i` deletions empty the first `i` letters of `word1`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [4, 5] },
      metrics: startMetrics,
      changes: ['for i in range(m + 1): dp[i][0] = i'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Row 0',
      title: 'Lines 6–7: row 0 inserts everything',
      body: '`dp[0][j] = j`: `j` insertions build the first `j` letters of `word2` from nothing.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['for j in range(n + 1): dp[0][j] = j'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Loops',
      title: 'Lines 8–9: every other cell, row by row',
      body: 'Line 8 walks the rows from 1, line 9 the columns from 1, so the cell above, to the left and on the diagonal are always filled first.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['for i in range(1, m + 1)', 'for j in range(1, n + 1)'],
      scene: at(cellStep(1, 1)),
    },
    {
      chapter: 'build',
      short: 'Match',
      title: 'Lines 10–11: same letter, no edit',
      body: '`word1[i − 1]` and `word2[j − 1]` are the prefixes’ last letters. When they match, line 11 copies the diagonal.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], lines: [10, 11] },
      metrics: startMetrics,
      changes: ['if word1[i - 1] == word2[j - 1]: dp[i][j] = dp[i - 1][j - 1]'],
      scene: at(cellStep(2, 2)),
    },
    {
      chapter: 'build',
      short: 'Edit',
      title: 'Lines 12–13: otherwise the cheapest edit plus one',
      body: 'Line 13 is the three-way rule: delete (above), insert (left) or replace (diagonal), plus 1 for the edit itself.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], lines: [12, 13] },
      metrics: startMetrics,
      changes: ['else: dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])'],
      scene: at(cellStep(1, 2)),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 14: the whole words',
      body: '`dp[m][n]` turns all of `word1` into all of `word2`, so line 14 returns it.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [14] },
      metrics: startMetrics,
      changes: ['return dp[m][n]'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One cell per prefix pair: O(m · n)',
      body: 'Each of the `(m + 1)(n + 1)` cells does one comparison and at most a 3-way `min`, so it’s **`O(m · n)` time** and **`O(m · n)` space** (one row plus a saved diagonal is enough for the number alone).\n\nSwitch to **🧪 Try your own** to compare your own words.',
      code: { view: 'final', lines: [8, 9, 13] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ w1: W1, w2: W2, phase: 'done', dp: TABLE, note: `recursion: ${TOTAL_CALLS} calls here\ntable: 15 cells after the edges\n10-letter words: ~3²⁰ calls vs 100 cells`, noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Free match',
      title: 'Why a match copies the diagonal for free',
      body: 'When the last letters agree, keeping both costs nothing, and the diagonal is never worse than paying an edit to reach this cell another way. That is the key decision.\n\nAdding 1 here too would charge for letters that already match: `"ros"` → `"ros"` would cost 3 instead of 0.',
      code: { view: 'final', lines: [10, 11] },
      values: { 11: "dp[2][2] = dp[1][1] = 1 ('o' = 'o')" },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ w1: W1, w2: W2, phase: 'match', dp: TABLE, i: 2, j: 2, note: '"ro" → "ho": o = o, no edit\ndp[2][2] = dp[1][1] = 1 (r → h)' }) },
    },
  ],
  trace: {
    title: 'Run min_distance on your own letters (1 = a, 2 = b, …)',
    inputs: [
      { name: 'word1', label: 'word1 letters (1–26)', kind: 'numbers', default: '3, 1, 20' },
      { name: 'word2', label: 'word2 letters (1–26)', kind: 'numbers', default: '3, 21, 20' },
    ],
    presets: [
      { label: '"ros" → "horse"', values: { word1: '18, 15, 19', word2: '8, 15, 18, 19, 5' } },
      { label: 'Same word', values: { word1: '3, 1, 20', word2: '3, 1, 20' } },
      { label: 'Nothing shared', values: { word1: '1, 2', word2: '3, 4, 5' } },
      { label: 'One letter', values: { word1: '1', word2: '2, 1, 2' } },
    ],
    maxItems: 6,
    run: (values) => {
      const a = values['word1'];
      const b = values['word2'];
      if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) throw new Error('Enter at least one letter in each word.');
      if (a.length > 4) throw new Error('word1: up to 4 letters, so the table fits on the stage.');
      return traceEdit(decode(a, 'word1'), decode(b, 'word2'));
    },
  },
});
