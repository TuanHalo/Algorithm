---
title: "Knuth-Morris-Pratt (KMP) Algorithm"
topic: "strings"
order: 3
difficulty: "advanced"
timeComplexity: "O(n + m)"
spaceComplexity: "O(m)"
tags: ["strings", "kmp", "prefix-function", "lps", "pattern-matching", "automata"]
---

## Intuition & Analogy

Imagine you are searching for the word `"PARTICIPATE"` in a long book. You read letter by letter and successfully match `"PARTICIPAT"`, but the very next letter in the book is `'O'` instead of `'E'`.
A naive reader panics, rewinds their reading finger back to the second letter (`'A'`) of `"PARTICIPAT"`, and starts reading all over again.

A clever reader notices: *“I already know what was just read! Does the end of what I matched look like the beginning of what I am hunting for?”*
The **Knuth-Morris-Pratt (KMP)** algorithm precomputes this self-similarity. When a mismatch occurs, the text pointer **never moves backward**. Instead, the pattern pointer intelligently shifts forward to the longest prefix that is also a suffix.

## Core Concept

### 1. Longest Prefix Suffix (LPS) Array
For a pattern `P` of length $m$, `lps[i]` stores the length of the longest proper prefix of `P[0..i]` that is also a suffix of `P[0..i]`:
- A **proper prefix** is a prefix that is not the entire string itself.
- For example, in `"ABABA"`:
  - `i = 0`: `"A"` $\to 0$
  - `i = 1`: `"AB"` $\to 0$
  - `i = 2`: `"ABA"` $\to 1$ (prefix `"A"`, suffix `"A"`)
  - `i = 3`: `"ABAB"` $\to 2$ (prefix `"AB"`, suffix `"AB"`)
  - `i = 4`: `"ABABA"` $\to 3$ (prefix `"ABA"`, suffix `"ABA"`)
  $\implies \text{LPS} = [0, 0, 1, 2, 3]$.

### 2. Search Invariant
During matching:
- If `text[i] == pattern[j]`, advance both `i += 1` and `j += 1`.
- If `j == m`, a match is found; record index and set `j = lps[j - 1]`.
- If mismatch occurs when `j > 0`, fall back: `j = lps[j - 1]` without touching `i`.
- If mismatch occurs when `j == 0`, simply advance `i += 1`.

Because `i` only moves forward from $0$ to $n-1$, and `j` only decreases through previous valid prefix lengths, total transitions are strictly bounded by $2n + 2m$.

## Step-by-Step Walkthrough

Find pattern `P = "ABABC"` in text `T = "ABABDABABC"`:
1. **LPS Table**:
   - `P = "A B A B C"`
   - `LPS = [0, 0, 1, 2, 0]`

2. **Matching Phase**:
   - Match `P[0..3]` with `T[0..3]` (`"ABAB"`).
   - At $i = 4$, `T[4] = 'D'`, but `P[4] = 'C'` $\implies$ Mismatch!
   - Fallback: `j = lps[3] = 2` (Pattern falls back to index 2, pointing to `'A'`).
   - Notice: $i$ remains at 4 (`'D'`)! We did NOT rewind to index 1.
   - Now compare `T[4] = 'D'` with `P[2] = 'A'`. Mismatch!
   - Fallback: `j = lps[1] = 0`.
   - Compare `T[4] = 'D'` with `P[0] = 'A'`. Mismatch with `j == 0` $\implies i += 1$ ($i = 5$).
   - Match `T[5..9]` (`"ABABC"`) with `P[0..4]` $\implies$ Match found at index 5!

## Python Code

```python
def compute_lps(pattern: str) -> list[int]:
    """Computes the Longest Prefix Suffix (LPS) array for KMP in O(m) time."""
    m = len(pattern)
    lps = [0] * m
    length = 0  # Length of previous longest prefix suffix
    i = 1

    while i < m:
        if pattern[i] == pattern[length]:
            length += 1
            lps[i] = length
            i += 1
        else:
            if length != 0:
                length = lps[length - 1]
            else:
                lps[i] = 0
                i += 1

    return lps


def kmp_search(text: str, pattern: str) -> list[int]:
    """Finds all 0-based occurrences of pattern in text in O(n + m) time."""
    n, m = len(text), len(pattern)
    if m == 0:
        return []

    lps = compute_lps(pattern)
    matches: list[int] = []

    i = 0  # Index in text
    j = 0  # Index in pattern

    while i < n:
        if text[i] == pattern[j]:
            i += 1
            j += 1

        if j == m:
            matches.append(i - j)
            j = lps[j - 1]  # Reset j to find next overlapping match
        elif i < n and text[i] != pattern[j]:
            if j != 0:
                j = lps[j - 1]
            else:
                i += 1

    return matches
```

## Complexity Table

| Component | Time Complexity | Space Complexity | Why? |
|---|---|---|---|
| LPS Precomputation | $O(m)$ | $O(m)$ | Pattern pointer advances or falls back via LPS |
| Text Scanning | $O(n)$ | $O(1)$ auxiliary | Text index $i$ is strictly non-decreasing |
| Total KMP Pipeline | $O(n + m)$ | $O(m)$ | Guaranteed linear runtime without hash collisions |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Single exact pattern search where worst-case $O(n + m)$ runtime must be guaranteed | Searching for thousands of patterns simultaneously (use Aho-Corasick or Suffix Automaton) |
| Periodic string analysis (detecting if a string consists of repeating substrings: $n \% (n - \text{lps}[n-1]) == 0$) | Very short patterns on small texts where standard library search has lower constant overhead |
| Streaming inputs where backtracking the input source stream is physically impossible | Approximate or fuzzy string matching with edits/typos |
