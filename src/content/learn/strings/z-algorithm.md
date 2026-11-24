---
title: "Z-Algorithm & Z-Array"
topic: "strings"
order: 4
difficulty: "advanced"
timeComplexity: "O(n + m)"
spaceComplexity: "O(n + m)"
tags: ["strings", "z-algorithm", "z-array", "pattern-matching", "linear-time"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (no repeats, e.g. `abcde`) | `O(n)` | `O(n)` | One failed comparison per index and no box ever forms |
| Average | `O(n)` | `O(n)` | Comparisons only happen at or past `right`, and `right` never moves back |
| Worst (all letters equal) | `O(n)` | `O(n)` | At most `n` successful comparisons overall, plus one failure per index |

## When to use

| Great for | Avoid for |
|---|---|
| Finding every occurrence of a pattern: run it on `pattern + "$" + text` and report each `z[i] == len(pattern)` (the old `z_search`) | When the `n + m` concatenated copy is too big for memory (KMP keeps only an `O(m)` table) |
| Everything about a string's own prefixes: border and period checks, counting prefix matches, string compression | Online streams, where the whole text must be known before the Z-array exists |
| Simpler code than KMP's fall-back logic, with the same `O(n + m)` bound | Searching a fixed dictionary of many patterns (use Aho-Corasick) |
