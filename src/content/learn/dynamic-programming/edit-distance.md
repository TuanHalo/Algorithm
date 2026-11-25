---
title: "Edit Distance (Levenshtein)"
topic: "dynamic-programming"
order: 8
difficulty: "intermediate"
timeComplexity: "O(m · n)"
spaceComplexity: "O(m · n)"
tags: ["dynamic-programming", "2d-dp", "string-dp", "levenshtein"]
---

## Complexity

`m` and `n` are the two word lengths.

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(m · n)` | `O(m · n)` | Every prefix pair gets its cell, even for identical words |
| Average | `O(m · n)` | `O(m · n)` | One comparison and at most a 3-way `min` per cell |
| Worst | `O(m · n)` | `O(m · n)` | Same table; one row plus a saved diagonal brings space to `O(min(m, n))`, plain recursion is about `O(3^(m + n))` |

## When to use

| Great for | Avoid for |
|---|---|
| Spell checkers, fuzzy search, “did you mean”, DNA mutation distance | Equal-length strings where only replacements are allowed: Hamming distance is one `O(n)` pass |
| Custom costs: give insert, delete and replace their own weights in line 13; One Edit Distance and Delete Operation for Two Strings are close cousins | Long documents (`m, n > 10⁴`): use a band around the diagonal or Myers’ bit-parallel algorithm |
| Listing the edits: keep the table and walk back from `dp[m][n]` along the cheapest reads | Swapping two neighbouring letters as one edit: that’s Damerau–Levenshtein, which adds a fourth read |
