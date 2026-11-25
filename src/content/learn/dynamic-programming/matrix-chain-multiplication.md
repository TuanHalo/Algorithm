---
title: "Matrix Chain Multiplication (Interval DP)"
topic: "dynamic-programming"
order: 10
difficulty: "advanced"
timeComplexity: "O(n³)"
spaceComplexity: "O(n²)"
tags: ["dynamic-programming", "interval-dp", "matrix-chain", "optimization"]
---

## Complexity

`n` matrices.

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n³)` | `O(n²)` | Every chain still tries every split, whatever the sizes |
| Average | `O(n³)` | `O(n²)` | About `n²/2` chains, up to `n` splits each, one table cell per chain |
| Worst | `O(n³)` | `O(n²)` | Same loops; the plain recursion makes about `3ⁿ` calls, and there are Catalan-many (about `4ⁿ`) groupings |

## When to use

| Great for | Avoid for |
|---|---|
| Interval DP that splits `[i, j]` into `[i, k]` and `[k + 1, j]`: Burst Balloons, Minimum Cost to Cut a Stick, Minimum Score Triangulation, Boolean Parenthesization | Just two matrices: there is only one way, `a·b·c` |
| Printing the best grouping: also store the winning `k` in `split[i][j]` and rebuild `(left × right)` recursively from `split[1][n]` | Non-associative operations, where regrouping changes the result |
| Parsing (the CYK algorithm fills the same triangle) | Long chains (`n` in the thousands): `O(n³)` is too slow; Hu–Shing solves it in `O(n log n)` |
