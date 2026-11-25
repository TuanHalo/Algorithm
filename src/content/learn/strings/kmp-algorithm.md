---
title: "Knuth-Morris-Pratt (KMP) Algorithm"
topic: "strings"
order: 3
difficulty: "advanced"
timeComplexity: "O(n + m)"
spaceComplexity: "O(m)"
tags: ["strings", "kmp", "prefix-function", "lps", "pattern-matching", "automata"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (no borders, e.g. `ABCD`) | `O(m)` | `O(m)` | `length` stays 0, so every turn moves `i` forward once |
| Average | `O(m)` | `O(m)` | Each turn moves `i` forward or shrinks `length`, and `length` only grows when `i` does |
| Worst | `O(m)` | `O(m)` | At most `2m` turns in total (a `AAAB…`-style pattern triggers the most fall-backs) |

## When to use

| Great for | Avoid for |
|---|---|
| Exact search of one pattern in a text with a guaranteed `O(n + m)`: run the text against `lps`, and on a mismatch set `j = lps[j - 1]` without moving the text index (the old `kmp_search`) | Thousands of patterns at once (use Aho-Corasick) |
| Streams where the input can't be re-read, since the text pointer never moves backward | Very short patterns on short texts, where the built-in `str.find` is simpler |
| Periodic strings: the string repeats with period `n − lps[n − 1]` when that divides `n` | Approximate or fuzzy matching with typos or edits |
