import { arr, defineWalkthrough, link, note, vars } from '../../../lib/walkthrough/helpers';
import { PITCH, tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * The table dp[i][j] as stacked rows (`dp-i`, y = TOP + i × ROW_Y). `text2`
 * runs along the top as a header over columns 1…n; each row i ≥ 1 has its
 * letter text1[i − 1] in a one-cell block in front of it.
 */
const TOP = 110;
const ROW_Y = 105;
const LETTER_X = -PITCH - 24;

type Phase = 'bare' | 'init' | 'match' | 'skip' | 'done';

interface LcsState {
  readonly t1: string;
  readonly t2: string;
  readonly phase: Phase;
  /** Filled rows; missing cells show `?`. */
  readonly dp: readonly (readonly ScalarValue[])[];
  readonly i?: number;
  readonly j?: number;
  /** In a skip step, whether the top read won (else the left one). */
  readonly fromTop?: boolean;
  /** Per-cell tone overrides "i,j" (idea chapter). */
  readonly cellTones?: Readonly<Record<string, Tone>>;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
}

const rowId = (i: number): string => `dp-${i}`;

/** Scene: text2 header, text1 letters, the dp rows, the reads of the current cell, and the variables. */
function scene(s: LcsState): Entity[] {
  const { t1, t2, phase, i, j } = s;
  const m = t1.length;
  const n = t2.length;
  const entities: Entity[] = [];
  const active = phase === 'match' || phase === 'skip';

  const headTones: Record<number, Tone> = {};
  if (active && j !== undefined) headTones[j - 1] = phase === 'match' ? 'found' : 'miss';
  entities.push(arr('text2', PITCH, 0, [...t2], { label: 'text2', tones: headTones, codeVar: 'text2', indexLabels: [...t2].map((_, k) => `j=${k + 1}`) }));

  for (let r = 0; r <= m; r += 1) {
    const y = TOP + r * ROW_Y;
    if (r >= 1) {
      const tone: Tone = active && i === r ? (phase === 'match' ? 'found' : 'miss') : 'default';
      entities.push(arr(`t1-${r}`, LETTER_X, y, [t1[r - 1] ?? ''], { tones: { 0: tone }, indexLabels: [`i=${r}`] }));
    }
    const row = s.dp[r] ?? [];
    const values: ScalarValue[] = Array.from({ length: n + 1 }, (_, c) => row[c] ?? '?');
    const tones: Record<number, Tone> = {};
    values.forEach((v, c) => {
      const override = s.cellTones?.[`${r},${c}`];
      tones[c] = override ?? (v === '?' ? 'muted' : 'done');
    });
    if (active && i !== undefined && j !== undefined) {
      if (r === i) tones[j] = 'active';
      if (phase === 'match' && r === i - 1) tones[j - 1] = 'compare';
      if (phase === 'skip') {
        if (r === i - 1) tones[j] = 'compare';
        if (r === i) tones[j - 1] = 'compare';
      }
    }
    if (phase === 'done' && r === m) tones[n] = 'found';
    entities.push(arr(rowId(r), 0, y, values, { label: r === 0 ? 'dp' : undefined, tones, codeVar: 'dp', showIndex: r === 0 }));
  }

  if (active && i !== undefined && j !== undefined) {
    const to = { entity: rowId(i), index: j, side: 'top' as const };
    if (phase === 'match') {
      entities.push(link('diag', { entity: rowId(i - 1), index: j - 1, side: 'bottom' }, to, { tone: 'found', flow: true, label: '+1' }));
    } else {
      const top = s.fromTop ?? true;
      entities.push(link('top', { entity: rowId(i - 1), index: j, side: 'bottom' }, to, { tone: top ? 'found' : 'miss', dashed: !top, flow: top, label: 'top' }));
      entities.push(link('left', { entity: rowId(i), index: j - 1, side: 'bottom' }, { entity: rowId(i), index: j, side: 'bottom' }, { tone: top ? 'miss' : 'found', dashed: top, flow: !top, label: 'left' }));
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
          { name: 'text1', value: `"${t1}"` },
          { name: 'text2', value: `"${t2}"` },
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

/** Runs lcs_length(text1, text2) and records one step per cell (chapter "run", final code). */
function traceLcs(t1: string, t2: string): Step[] {
  const steps: Step[] = [];
  const m = t1.length;
  const n = t2.length;
  let matches = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ matches, result });
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));
  /** Rows as shown: row 0 and column 0 are zeros, later cells appear as they are filled. */
  const shown = (upto: [number, number] | 'all'): ScalarValue[][] =>
    dp.map((row, r) => row.map((v, c) => (upto === 'all' || r === 0 || c === 0 || r < upto[0] || (r === upto[0] && c <= upto[1]) ? v : '?')));

  steps.push({
    chapter: 'run',
    short: 'Zeros',
    title: `A ${m + 1} × ${n + 1} table of zeros`,
    body: `Line 2: \`m = ${m}\`, \`n = ${n}\`. Line 3 builds ${m + 1} rows of ${n + 1} zeros. Row 0 and column 0 stay 0: an empty prefix shares nothing with anything.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: `m, n = ${m}, ${n}`, 3: `dp = ${m + 1} × ${n + 1} zeros` },
    metrics: metrics(),
    scene: { entities: scene({ t1, t2, phase: 'init', dp: shown([1, 0]) }) },
  });

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const a = t1[i - 1] ?? '';
      const b = t2[j - 1] ?? '';
      const lead = j === 1 ? `Line 4 moves to row \`i = ${i}\`; line 5 starts at \`j = 1\`. ` : `Line 5 moves to \`j = ${j}\`. `;
      const lines = j === 1 ? [4, 5, 6] : [5, 6];
      const loopValues: Record<number, string> = j === 1 ? { 4: `i = ${i}`, 5: `j = ${j}` } : { 5: `j = ${j}` };
      if (a === b) {
        const diag = dp[i - 1]?.[j - 1] ?? 0;
        const row = dp[i];
        if (row) row[j] = 1 + diag;
        matches += 1;
        steps.push({
          chapter: 'run',
          short: `(${i}, ${j}) ${a}=${b}`,
          title: `'${a}' = '${b}': dp[${i}][${j}] = 1 + ${diag} = ${diag + 1}`,
          body: `${lead}Line 6: \`text1[${i - 1}] = '${a}'\` equals \`text2[${j - 1}] = '${b}'\`. Line 7 uses that letter once in both and adds it to the best of the shorter prefixes: \`1 + dp[${i - 1}][${j - 1}] = ${diag + 1}\`.`,
          code: { view: 'final', lines: [...lines, 7] },
          values: { ...loopValues, 6: `'${a}' == '${b}' → True`, 7: `dp[${i}][${j}] = 1 + ${diag} = ${diag + 1}` },
          metrics: metrics(),
          scene: { entities: scene({ t1, t2, phase: 'match', dp: shown([i, j]), i, j }) },
        });
      } else {
        const top = dp[i - 1]?.[j] ?? 0;
        const left = dp[i]?.[j - 1] ?? 0;
        const fromTop = top >= left;
        const row = dp[i];
        if (row) row[j] = Math.max(top, left);
        steps.push({
          chapter: 'run',
          short: `(${i}, ${j}) ${a}≠${b}`,
          title: `'${a}' ≠ '${b}': dp[${i}][${j}] = max(${top}, ${left}) = ${Math.max(top, left)}`,
          body: `${lead}Line 6: \`'${a}'\` and \`'${b}'\` differ, so one of them isn’t in the answer. Line 9 drops one: without \`'${a}'\` (top, ${top}) or without \`'${b}'\` (left, ${left}), and keeps the better.`,
          code: { view: 'final', lines: [...lines, 8, 9] },
          values: { ...loopValues, 6: `'${a}' == '${b}' → False`, 9: `dp[${i}][${j}] = max(${top}, ${left}) = ${Math.max(top, left)}` },
          metrics: metrics(),
          scene: { entities: scene({ t1, t2, phase: 'skip', dp: shown([i, j]), i, j, fromTop }) },
        });
      }
    }
  }

  const answer = dp[m]?.[n] ?? 0;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Longest common subsequence: ${answer}`,
    body: `The table is full. Line 10 returns the bottom-right cell, \`dp[${m}][${n}]\` (whole \`text1\` against whole \`text2\`): **${answer}**.`,
    code: { view: 'final', lines: [10] },
    values: { 10: `return ${answer}` },
    metrics: metrics(answer),
    scene: { entities: scene({ t1, t2, phase: 'done', dp: shown('all') }) },
  });
  return steps;
}

/** Full LCS table. */
function lcsTable(t1: string, t2: string): number[][] {
  const dp = Array.from({ length: t1.length + 1 }, () => Array.from({ length: t2.length + 1 }, () => 0));
  for (let i = 1; i <= t1.length; i += 1) {
    for (let j = 1; j <= t2.length; j += 1) {
      const row = dp[i];
      if (!row) continue;
      row[j] = t1[i - 1] === t2[j - 1] ? 1 + (dp[i - 1]?.[j - 1] ?? 0) : Math.max(dp[i - 1]?.[j] ?? 0, row[j - 1] ?? 0);
    }
  }
  return dp;
}

/** How often the naive recursion visits each (i, j). */
function naiveCalls(t1: string, t2: string): number[][] {
  const calls = Array.from({ length: t1.length + 1 }, () => Array.from({ length: t2.length + 1 }, () => 0));
  const go = (i: number, j: number): void => {
    const row = calls[i];
    if (row) row[j] = (row[j] ?? 0) + 1;
    if (i === 0 || j === 0) return;
    if (t1[i - 1] === t2[j - 1]) go(i - 1, j - 1);
    else {
      go(i - 1, j);
      go(i, j - 1);
    }
  };
  go(t1.length, t2.length);
  return calls;
}

const T1 = 'ace';
const T2 = 'abcde';
const RUN = traceLcs(T1, T2);
const startMetrics = { matches: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 9;
const TABLE = lcsTable(T1, T2);
const CALLS = naiveCalls(T1, T2);
const TOTAL_CALLS = CALLS.flat().reduce((x, y) => x + y, 0);
const UNKNOWN = TABLE.map((row) => row.map(() => '?'));

/** Scene of run step k (0-based), so build steps show the moment they describe. */
function at(k: number): Step['scene'] {
  return RUN[k]?.scene ?? { entities: [] };
}

/** Run index of cell (i, j). */
const cellStep = (i: number, j: number): number => (i - 1) * T2.length + j;

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
/** Trace inputs encode letters as 1–26 (1 = a). */
function decode(codes: readonly number[], label: string): string {
  if (codes.some((c) => c < 1 || c > 26)) throw new Error(`${label}: use 1 to 26 for the letters a to z.`);
  return codes.map((c) => LETTERS[c - 1] ?? '').join('');
}

export default defineWalkthrough({
  id: 'learn/dynamic-programming/longest-common-subsequence',
  title: 'Longest Common Subsequence, a table of prefixes',
  summary: 'From the idea to the code: find the longest sequence of letters two strings share in order, by comparing every pair of prefixes in a table.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def lcs_length(text1: str, text2: str) -> int:
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = 1 + dp[i - 1][j - 1]  # Match extends both prefixes
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]`,
  },
  snapshots: {
    brute: `def lcs_length(text1: str, text2: str) -> int:
    def lcs(i: int, j: int) -> int:
        if i == 0 or j == 0:
            return 0  # An empty prefix shares nothing
        if text1[i - 1] == text2[j - 1]:
            return 1 + lcs(i - 1, j - 1)
        return max(lcs(i - 1, j), lcs(i, j - 1))  # Drop one last letter
    return lcs(len(text1), len(text2))`,
  },
  metrics: [
    { key: 'matches', label: 'Matches' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'dp[i][j] being filled' },
    { tone: 'compare', label: 'cells it reads' },
    { tone: 'done', label: 'filled' },
    { tone: 'muted', label: 'not yet' },
    { tone: 'miss', label: 'letters differ / losing read' },
    { tone: 'found', label: 'letters match / winning read / answer' },
  ],
  goals: [
    { text: 'See why plain recursion repeats prefix pairs', step: 2 },
    { text: 'Match: extend the diagonal by one', step: 3 },
    { text: 'No match: drop a letter, keep the better', step: 4 },
    { text: 'Know why a match reads the diagonal', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'The longest subsequence two strings share',
      body: 'A subsequence keeps the letters’ order but may skip some. Line 1 takes two strings and returns the length of the longest subsequence of **both**.\n\nHere `text1 = "ace"` and `text2 = "abcde"`: all of `"ace"` appears in order inside `"abcde"`, so the answer is **3**.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ t1: T1, t2: T2, phase: 'bare', dp: UNKNOWN, bare: true, note: 'a b c d e\na · c · e  → "ace", length 3' }) },
    },
    {
      chapter: 'idea',
      short: 'Recursion',
      title: 'The obvious way: compare the last letters, recurse',
      body: `Look at the last letters of the two prefixes: equal, keep it and shorten both; different, try dropping either (line 7). Each cell shows how often \`lcs(i, j)\` runs: ${TOTAL_CALLS} calls, the same pairs again and again (red).\n\nWith no matches every call branches twice: up to **\`O(2^(m + n))\`**.`,
      code: { view: 'snapshot', id: 'brute', lines: [5, 6, 7] },
      metrics: startMetrics,
      scene: {
        entities: scene({
          t1: T1,
          t2: T2,
          phase: 'bare',
          dp: CALLS,
          bare: true,
          cellTones: Object.fromEntries(CALLS.flatMap((row, r) => row.map((v, c) => [`${r},${c}`, v > 1 ? 'miss' : v === 1 ? 'done' : 'muted'] as const))),
          note: 'number = calls of lcs(i, j)\nonly (m + 1)(n + 1) = 24 pairs exist',
          noteTone: 'miss',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Match',
      title: 'Same last letter: use it, then the shorter prefixes',
      body: 'Let `dp[i][j]` be the LCS of the first `i` letters of `text1` and the first `j` of `text2`. If those last letters match, using the letter in both is never worse: **dp[i][j] = 1 + dp[i − 1][j − 1]**, the diagonal.\n\nRow 0 and column 0 are empty prefixes: 0.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ t1: T1, t2: T2, phase: 'match', dp: TABLE, i: 2, j: 3, bare: true, note: '"ac" vs "abc": both end in c\ndp[2][3] = 1 + dp[1][2] = 1 + 1 = 2' }) },
    },
    {
      chapter: 'idea',
      short: 'No match',
      title: 'Different last letters: drop one, keep the better',
      body: 'If the last letters differ, at least one of them isn’t in the answer. Drop the one from `text1` (the cell **above**) or from `text2` (the cell to the **left**): **dp[i][j] = max(dp[i − 1][j], dp[i][j − 1])**.\n\nFill rows top to bottom, left to right, and all three reads are always ready.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ t1: T1, t2: T2, phase: 'skip', dp: TABLE, i: 2, j: 4, fromTop: false, bare: true, note: '"ac" vs "abcd": c ≠ d\nmax(top 1, left 2) = 2' }) },
    },
    {
      chapter: 'build',
      short: 'Table',
      title: 'Lines 2–3: an (m + 1) × (n + 1) table of zeros',
      body: 'One extra row and column for the empty prefixes, so `dp[i − 1]` and `[j − 1]` always exist. Everything starts at 0.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['m, n = len(text1), len(text2)', 'dp = [[0] * (n + 1) for _ in range(m + 1)]'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Loops',
      title: 'Lines 4–5: every prefix pair, row by row',
      body: 'Line 4 walks the rows (prefixes of `text1`), line 5 the columns (prefixes of `text2`), both from 1.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [4, 5] },
      metrics: startMetrics,
      changes: ['for i in range(1, m + 1)', 'for j in range(1, n + 1)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Match',
      title: 'Lines 6–7: matching letters take the diagonal',
      body: '`text1[i − 1]` and `text2[j − 1]` are the last letters of the two prefixes (strings count from 0). A match is the first rule: `1 + dp[i − 1][j − 1]`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['if text1[i - 1] == text2[j - 1]', 'dp[i][j] = 1 + dp[i - 1][j - 1]'],
      scene: at(cellStep(1, 1)),
    },
    {
      chapter: 'build',
      short: 'Skip',
      title: 'Lines 8–9: otherwise the better neighbour',
      body: 'Different letters use the second rule: the bigger of the cell above and the cell to the left.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['else: dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])'],
      scene: at(cellStep(1, 2)),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 10: the whole strings',
      body: '`dp[m][n]` compares the full strings, so line 10 returns it.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [10] },
      metrics: startMetrics,
      changes: ['return dp[m][n]'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One cell per prefix pair: O(m · n)',
      body: 'Each of the `m · n` cells does one comparison and one read, so it’s **`O(m · n)` time** and **`O(m · n)` space** for the table (two rows are enough if only the length is needed).\n\nSwitch to **🧪 Try your own** to compare your own words.',
      code: { view: 'final', lines: [4, 5, 6] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ t1: T1, t2: T2, phase: 'done', dp: TABLE, note: `recursion: ${TOTAL_CALLS} calls here\ntable: 3 × 5 = 15 cells\nm = n = 30: ~10¹⁸ calls vs 900 cells`, noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Diagonal',
      title: 'Why a match reads the diagonal, not a neighbour',
      body: 'The diagonal `dp[i − 1][j − 1]` has neither matched letter yet, so adding 1 uses the letter exactly once in each string. That is the key decision.\n\nTaking `left + 1` instead can count a letter twice: for `"a"` vs `"aa"`, `dp[1][1] = 1`, and `left + 1` would make `dp[1][2] = 2`, but `"a"` has only one a.',
      code: { view: 'final', lines: [6, 7] },
      values: { 7: 'dp[2][3] = 1 + dp[1][2] = 2' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ t1: T1, t2: T2, phase: 'match', dp: TABLE, i: 2, j: 3, note: '"a" vs "aa": diagonal + 1 = 1 ✓\nleft + 1 = 2 ✗ (one a, used twice)' }) },
    },
  ],
  trace: {
    title: 'Run lcs_length on your own letters (1 = a, 2 = b, …)',
    inputs: [
      { name: 'text1', label: 'text1 letters (1–26)', kind: 'numbers', default: '1, 2, 3' },
      { name: 'text2', label: 'text2 letters (1–26)', kind: 'numbers', default: '2, 1, 3, 1' },
    ],
    presets: [
      { label: '"ace" / "abcde"', values: { text1: '1, 3, 5', text2: '1, 2, 3, 4, 5' } },
      { label: 'No common letter', values: { text1: '1, 2', text2: '3, 4, 5' } },
      { label: 'Same string', values: { text1: '3, 1, 2', text2: '3, 1, 2' } },
      { label: 'Repeated letters', values: { text1: '1, 1', text2: '2, 1, 1, 1' } },
    ],
    maxItems: 6,
    run: (values) => {
      const a = values['text1'];
      const b = values['text2'];
      if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) throw new Error('Enter at least one letter in each string.');
      if (a.length > 4) throw new Error('text1: up to 4 letters, so the table fits on the stage.');
      return traceLcs(decode(a, 'text1'), decode(b, 'text2'));
    },
  },
});
