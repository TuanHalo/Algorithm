import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { PITCH, tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * `s` runs along the top; its index is the table's column (`right`). Below
 * it, row `dp-left` holds dp[left][right] for every right; s[left] sits in a
 * block in front of its row. Only right ≥ left matters (blank otherwise).
 * Cells show T / F once checked, `·` before.
 */
const TOP = 120;
const ROW_Y = 100;
const LETTER_X = -PITCH - 24;

type Phase = 'bare' | 'init' | 'yes' | 'no' | 'done';

interface PalState {
  readonly s: string;
  readonly phase: Phase;
  /** Checked cells: 'T' / 'F'; unchecked cells are absent. */
  readonly dp: ReadonlyMap<string, boolean>;
  readonly left?: number;
  readonly right?: number;
  readonly best: readonly [number, number];
  /** Why a "no" failed: the ends differ, or the inside isn't a palindrome. */
  readonly why?: 'ends' | 'inside';
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
}

const key = (l: number, r: number): string => `${l},${r}`;
const rowId = (l: number): string => `dp-${l}`;

/** Scene: s with the interval band, the triangular dp table, the inside read, and the variables. */
function scene(st: PalState): Entity[] {
  const { s, phase, left, right } = st;
  const n = s.length;
  const checking = (phase === 'yes' || phase === 'no') && left !== undefined && right !== undefined;
  const entities: Entity[] = [];

  const sTones: Record<number, Tone> = {};
  if (checking) {
    const endsMatch = s[left] === s[right];
    sTones[left] = endsMatch ? 'found' : 'miss';
    sTones[right] = endsMatch ? 'found' : 'miss';
  }
  if (phase === 'done') for (let k = st.best[0]; k <= st.best[1]; k += 1) sTones[k] = 'found';
  entities.push(arr('s', 0, 0, [...s], { label: 's', tones: sTones, codeVar: 's' }));
  if (checking) {
    entities.push(range('span', 's', left, right, phase === 'yes' ? 'found' : 'compare'));
    entities.push(ptr('left', 's', left, 'left', { side: 'top', tone: 'compare', codeVar: 'left' }));
    entities.push(ptr('right', 's', right, 'right', { side: 'top', tone: 'compare', codeVar: 'right' }));
  } else if (phase !== 'bare' && phase !== 'init') {
    entities.push(range('span', 's', st.best[0], st.best[1], 'found'));
  }

  for (let l = 0; l < n; l += 1) {
    const y = TOP + l * ROW_Y;
    entities.push(arr(`s-${l}`, LETTER_X, y, [s[l] ?? ''], { indexLabels: [`left=${l}`], tones: { 0: checking && l === left ? 'compare' : 'default' } }));
    const values: ScalarValue[] = [];
    const tones: Record<number, Tone> = {};
    for (let r = 0; r < n; r += 1) {
      if (r < l) {
        values.push(' ');
        tones[r] = 'muted';
        continue;
      }
      const v = st.dp.get(key(l, r));
      values.push(v === undefined ? '·' : v ? 'T' : 'F');
      tones[r] = v === undefined ? 'muted' : v ? 'done' : 'default';
    }
    if (checking && l === left && right !== undefined) tones[right] = 'active';
    if (checking && st.why !== 'ends' && left !== undefined && right !== undefined && right - left >= 2 && l === left + 1) tones[right - 1] = 'compare';
    if (phase === 'done' && l === st.best[0]) tones[st.best[1]] = 'found';
    entities.push(arr(rowId(l), 0, y, values, { label: l === 0 ? 'dp' : undefined, tones, codeVar: 'dp', showIndex: false }));
  }

  if (checking && right - left >= 2) {
    const inner = st.dp.get(key(left + 1, right - 1)) ?? false;
    const used = st.why !== 'ends';
    entities.push(
      link('inside', { entity: rowId(left + 1), index: right - 1, side: 'top' }, { entity: rowId(left), index: right, side: 'bottom' }, {
        tone: !used ? 'muted' : inner ? 'found' : 'miss',
        dashed: !inner || !used,
        flow: used && inner,
        label: 'inside',
      }),
    );
  }

  if (!st.bare) {
    const dash = '—';
    const length = checking ? right - left + 1 : undefined;
    entities.push(
      vars(
        'vals',
        tableBesideArray(n, 4),
        0,
        [
          { name: 'length', value: length ?? dash, tone: length === undefined ? 'muted' : 'default' },
          { name: 'left', value: checking ? left : dash, tone: checking ? 'default' : 'muted' },
          { name: 'right', value: checking ? right : dash, tone: checking ? 'default' : 'muted' },
          { name: 'best', value: `(${st.best[0]}, ${st.best[1]})`, tone: phase === 'done' ? 'found' : 'default' },
        ],
        { label: 'variables', width: 170 },
      ),
    );
  }
  if (st.note) entities.push(note('note', 0, TOP + n * ROW_Y + 50, st.note, { tone: st.noteTone ?? 'note' }));
  return entities;
}

/** Runs longest_palindrome(s) and records one step per interval (chapter "run", final code). */
function tracePal(s: string): Step[] {
  const steps: Step[] = [];
  const n = s.length;
  let found = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ palindromes: found, result });
  const dp = new Map<string, boolean>();
  let best: [number, number] = [0, 0];

  steps.push({
    chapter: 'run',
    short: 'Setup',
    title: `An ${n} × ${n} table, best = (0, 0)`,
    body: `Line 2: \`n = ${n}\`. Line 3 makes an ${n} × ${n} table of \`False\`. Line 4 starts \`best\` at \`(0, 0)\`, the first letter: one letter is always a palindrome.`,
    code: { view: 'final', lines: [2, 3, 4] },
    values: { 2: `n = ${n}`, 3: `dp = ${n} × ${n} False`, 4: 'best = (0, 0)' },
    metrics: metrics(),
    scene: { entities: scene({ s, phase: 'init', dp: new Map(dp), best }) },
  });

  for (let length = 1; length <= n; length += 1) {
    for (let left = 0; left + length - 1 < n; left += 1) {
      const right = left + length - 1;
      const a = s[left] ?? '';
      const b = s[right] ?? '';
      const ends = a === b;
      const inner = length <= 2 || (dp.get(key(left + 1, right - 1)) ?? false);
      const yes = ends && inner;
      dp.set(key(left, right), yes);
      if (yes) {
        best = [left, right];
        found += 1;
      }
      const lead = left === 0 ? `Line 5 moves to \`length = ${length}\`; line 6 starts at \`left = 0\`, so line 7 gives \`right = ${right}\`. ` : `Line 6 moves to \`left = ${left}\`, line 7 to \`right = ${right}\`. `;
      const lines = left === 0 ? [5, 6, 7, 8] : [6, 7, 8];
      const loopValues: Record<number, string> = left === 0 ? { 5: `length = ${length}`, 6: `left = 0`, 7: `right = ${right}` } : { 6: `left = ${left}`, 7: `right = ${right}` };
      const piece = s.slice(left, right + 1);
      let reason: string;
      if (!ends) reason = `the ends \`'${a}'\` and \`'${b}'\` differ, so \`"${piece}"\` can’t be a palindrome.`;
      else if (length === 1) reason = 'a single letter is always a palindrome.';
      else if (length === 2) reason = `both letters are \`'${a}'\`: a palindrome.`;
      else if (inner) reason = `the ends are both \`'${a}'\` and the inside \`dp[${left + 1}][${right - 1}]\` is \`True\`: \`"${piece}"\` is a palindrome.`;
      else reason = `the ends match, but the inside \`dp[${left + 1}][${right - 1}]\` is \`False\`, so \`"${piece}"\` isn’t.`;
      const checkValue = length <= 2 ? `'${a}' == '${b}' → ${ends ? 'True' : 'False'}` : `'${a}' == '${b}' and dp[${left + 1}][${right - 1}] → ${yes ? 'True' : 'False'}`;
      steps.push({
        chapter: 'run',
        short: `[${left}, ${right}] ${yes ? '✓' : '✗'}`,
        title: yes ? `"${piece}" is a palindrome` : `"${piece}" is not a palindrome`,
        body: `${lead}Line 8: ${reason}${yes ? ` Lines 9–10 mark it and record \`best = (${left}, ${right})\`.` : ''}`,
        code: { view: 'final', lines: yes ? [...lines, 9, 10] : lines },
        values: yes ? { ...loopValues, 8: checkValue, 9: `dp[${left}][${right}] = True`, 10: `best = (${left}, ${right})` } : { ...loopValues, 8: checkValue },
        metrics: metrics(),
        scene: { entities: scene({ s, phase: yes ? 'yes' : 'no', dp: new Map(dp), left, right, best, why: ends ? 'inside' : 'ends' }) },
      });
    }
  }

  const answer = s.slice(best[0], best[1] + 1);
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Longest palindrome: "${answer}"`,
    body: `Every span is checked. \`best = (${best[0]}, ${best[1]})\` is the last palindrome found, and lengths only grew, so it is a longest one. Line 11 returns **"${answer}"**.`,
    code: { view: 'final', lines: [11] },
    values: { 11: `return s[${best[0]}:${best[1] + 1}] = "${answer}"` },
    metrics: metrics(`"${answer}"`),
    scene: { entities: scene({ s, phase: 'done', dp: new Map(dp), best }) },
  });
  return steps;
}

/** Final dp for s. */
function palTable(s: string): Map<string, boolean> {
  const dp = new Map<string, boolean>();
  for (let length = 1; length <= s.length; length += 1) {
    for (let l = 0; l + length - 1 < s.length; l += 1) {
      const r = l + length - 1;
      dp.set(key(l, r), s[l] === s[r] && (length <= 2 || (dp.get(key(l + 1, r - 1)) ?? false)));
    }
  }
  return dp;
}

const S = 'babad';
const RUN = tracePal(S);
const startMetrics = { palindromes: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 8;
const TABLE = palTable(S);
const EMPTY = new Map<string, boolean>();
/** Table as it stands after every span of length < k is checked. */
const upTo = (k: number): Map<string, boolean> => new Map([...TABLE].filter(([kk]) => {
  const [l, r] = kk.split(',').map(Number);
  return (r ?? 0) - (l ?? 0) + 1 < k;
}));

/** Scene of run step k (0-based), so build steps show the moment they describe. */
function at(k: number): Step['scene'] {
  return RUN[k]?.scene ?? { entities: [] };
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
/** Trace inputs encode letters as 1–26 (1 = a). */
function decode(codes: readonly number[]): string {
  if (codes.some((c) => c < 1 || c > 26)) throw new Error('Use 1 to 26 for the letters a to z.');
  return codes.map((c) => LETTERS[c - 1] ?? '').join('');
}

export default defineWalkthrough({
  id: 'learn/dynamic-programming/longest-palindromic-substring',
  title: 'Longest Palindromic Substring, span by span',
  summary: 'From the idea to the code: find the longest substring that reads the same both ways, by deciding every span from its two ends and the span inside it, shortest spans first.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def longest_palindrome(s: str) -> str:
    n = len(s)
    dp = [[False] * n for _ in range(n)]
    best = (0, 0)
    for length in range(1, n + 1):  # Short spans must finish before longer ones
        for left in range(n - length + 1):
            right = left + length - 1
            if s[left] == s[right] and (length <= 2 or dp[left + 1][right - 1]):
                dp[left][right] = True
                best = (left, right)
    return s[best[0] : best[1] + 1]`,
  },
  snapshots: {
    brute: `def longest_palindrome(s: str) -> str:
    best = s[:1]
    for left in range(len(s)):
        for right in range(left + 1, len(s)):
            piece = s[left : right + 1]
            if piece == piece[::-1] and len(piece) > len(best):  # O(n) check
                best = piece
    return best`,
  },
  metrics: [
    { key: 'palindromes', label: 'Palindromes' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'dp[left][right] being checked' },
    { tone: 'compare', label: 'span / inside read' },
    { tone: 'done', label: 'palindrome (T)' },
    { tone: 'default', label: 'not one (F)' },
    { tone: 'muted', label: 'not checked / unused' },
    { tone: 'miss', label: 'ends differ / inside fails' },
    { tone: 'found', label: 'ends match / answer' },
  ],
  goals: [
    { text: 'See why checking every substring is O(n³)', step: 2 },
    { text: 'Decide a span from its ends and its inside', step: 3 },
    { text: 'Watch a long span reuse a short one', step: BUILD_END + 1 + 5 + 4 + 1 + 1 }, // "aba" reads "b"
    { text: 'Know why the loop goes by length', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'The longest piece that reads the same both ways',
      body: 'A palindrome reads the same forwards and backwards, like `"aba"`. Line 1 takes a string `s` and returns its longest **contiguous** palindrome.\n\nHere `"babad"` has two of length 3, `"bab"` and `"aba"`; this code returns **"aba"**, the last one it finds.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: [...scene({ s: S, phase: 'bare', dp: EMPTY, best: [0, 0], bare: true, note: '"bab" (0–2) and "aba" (1–3)\nboth length 3' }), range('span', 's', 1, 3, 'found')] },
    },
    {
      chapter: 'idea',
      short: 'Every piece',
      title: 'The obvious way: test every substring',
      body: 'Lines 3–6 cut out every substring and reverse it to check: about `n²/2` pieces, each checked in `O(n)`, so **`O(n³)`**.\n\nAnd it repeats itself: checking `"babab"` re-reads `"aba"` in its middle, which was already checked on its own.',
      code: { view: 'snapshot', id: 'brute', lines: [3, 4, 6] },
      metrics: startMetrics,
      scene: { entities: [...scene({ s: S, phase: 'bare', dp: EMPTY, best: [0, 0], bare: true, note: '15 pieces × up to 5 letters each\n"bab" checked, then again inside\na longer piece', noteTone: 'miss' }), range('span', 's', 0, 2, 'miss')] },
    },
    {
      chapter: 'idea',
      short: 'Ends + inside',
      title: 'A span is a palindrome if its ends match and its inside is one',
      body: 'Peel off the two end letters: `s[left..right]` is a palindrome exactly when **s[left] == s[right]** and the inside **s[left + 1..right − 1]** is one. Spans of length 1 and 2 have no inside to check.\n\nStore each answer in `dp[left][right]` and decide short spans before long ones, so the inside is always known.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ s: S, phase: 'yes', dp: upTo(4), left: 1, right: 3, best: [0, 2], bare: true, note: '"aba": a = a, inside "b" is T\n→ dp[1][3] = T' }) },
    },
    {
      chapter: 'build',
      short: 'Setup',
      title: 'Lines 2–4: the table and the best span',
      body: 'Line 3 makes an `n × n` table of `False`, `dp[left][right]` for every span. Line 4 starts `best` at the first letter.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3, 4] },
      metrics: startMetrics,
      changes: ['n = len(s)', 'dp = [[False] * n for _ in range(n)]', 'best = (0, 0)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Loops',
      title: 'Lines 5–7: every span, shortest first',
      body: 'Line 5 walks the lengths from 1 to `n`; line 6 slides `left` along, and line 7 works out where the span ends.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: startMetrics,
      changes: ['for length in range(1, n + 1)', 'for left in range(n - length + 1)', 'right = left + length - 1'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Check',
      title: 'Line 8: ends match, and the inside is a palindrome',
      body: 'Line 8 is the rule. `length <= 2` skips the inside check for spans that have none.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8], lines: [8] },
      metrics: startMetrics,
      changes: ['if s[left] == s[right] and (length <= 2 or dp[left + 1][right - 1])'],
      scene: at(1 + 5 + 4 + 1),
    },
    {
      chapter: 'build',
      short: 'Record',
      title: 'Lines 9–10: mark it, remember it',
      body: 'A palindrome is marked `True` for longer spans to reuse, and saved as `best`. Lengths only grow, so the last one saved is a longest.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], lines: [9, 10] },
      metrics: startMetrics,
      changes: ['dp[left][right] = True', 'best = (left, right)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 11: cut out the best span',
      body: 'Line 11 slices `best` out of `s` (the end is exclusive, hence `+ 1`).\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [11] },
      metrics: startMetrics,
      changes: ['return s[best[0] : best[1] + 1]'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One check per span: O(n²)',
      body: 'There are `n(n + 1)/2` spans and each is decided with one comparison and one table read, so it’s **`O(n²)` time** and **`O(n²)` space** for the table. Testing every substring directly is `O(n³)`.\n\nSwitch to **🧪 Try your own** to search your own letters.',
      code: { view: 'final', lines: [5, 6, 8] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ s: S, phase: 'done', dp: TABLE, best: [1, 3], note: '5 letters: 15 spans, 15 checks\nn = 1000: 5·10⁵ checks vs ~1.7·10⁸', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'By length',
      title: 'Why the outer loop goes by length',
      body: 'Line 8 reads `dp[left + 1][right − 1]`, a span two letters shorter. Looping by length (the comment on line 5) guarantees it was decided earlier. That is the key decision.\n\nLoop row by row from `left = 0` instead, and deciding `dp[0][2]` (`"bab"`) would read `dp[1][1]` before row 1 is filled: still `False`, so `"bab"` would be missed.',
      code: { view: 'final', lines: [5, 8] },
      values: { 8: 'dp[0][2] reads dp[1][1], decided at length 1' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ s: S, phase: 'yes', dp: TABLE, left: 0, right: 2, best: [1, 3], why: 'inside', note: 'length 3 reads length 1: ready ✓\nrow by row: dp[1][1] not set yet\n→ "bab" would be missed ✗' }) },
    },
  ],
  trace: {
    title: 'Run longest_palindrome on your own letters (1 = a, 2 = b, …)',
    inputs: [{ name: 's', label: 'letters (1–26)', kind: 'numbers', default: '3, 2, 2, 4' }],
    presets: [
      { label: '"babad"', values: { s: '2, 1, 2, 1, 4' } },
      { label: '"cbbd" (even)', values: { s: '3, 2, 2, 4' } },
      { label: 'One letter', values: { s: '1' } },
      { label: 'No repeats', values: { s: '1, 2, 3, 4' } },
      { label: 'All the same', values: { s: '1, 1, 1, 1' } },
    ],
    maxItems: 6,
    run: (values) => {
      const codes = values['s'];
      if (!Array.isArray(codes) || codes.length === 0) throw new Error('Enter at least one letter.');
      return tracePal(decode(codes));
    },
  },
});
