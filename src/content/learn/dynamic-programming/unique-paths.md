---
title: "Unique Paths (2D Grid DP)"
topic: "dynamic-programming"
order: 5
difficulty: "intermediate"
timeComplexity: "O(m · n)"
spaceComplexity: "O(n)"
tags: ["dynamic-programming", "2d-dp", "grid", "space-optimized"]
---

## Complexity

`m` rows, `n` columns.

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n)` | `O(n)` | A single row: building `dp` is the whole job, the loop never runs |
| Average | `O(m · n)` | `O(n)` | One addition per cell outside the first row and column, one row kept |
| Worst | `O(m · n)` | `O(n)` | Never more than one pass over the grid; a full 2D table would need `O(m · n)` space, walking every route is exponential |

## When to use

| Great for | Avoid for |
|---|---|
| Counting or minimizing over right / down paths: Minimum Path Sum (`dp[c] = grid[r][c] + min(dp[c], dp[c - 1])`), Unique Paths II with obstacles (set `dp[c] = 0` on a blocked cell) | Grids that allow moves up or left too: paths can loop, so use BFS or Dijkstra |
| Learning to roll a 2D table into one row: keep the full table when you must trace a route back | Open grids where only the count is needed: `comb(m + n − 2, m − 1)` answers in `O(min(m, n))` |
