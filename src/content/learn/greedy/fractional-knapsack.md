---
title: "Fractional Knapsack"
topic: "greedy"
order: 2
difficulty: "beginner"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
tags: ["greedy", "knapsack", "sorting", "ratio"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (capacity is `0`) | `O(n log n)` | `O(n)` | The sort still runs, then the loop breaks on its first turn |
| Average | `O(n log n)` | `O(n)` | Sorting by `value / weight` dominates; the packing loop is one pass |
| Worst (everything fits) | `O(n log n)` | `O(n)` | The loop visits all `n` items, but the sort is still the larger cost |

## When to use

| Great for | Avoid for |
|---|---|
| Divisible cargo such as liquids, grains, bandwidth, or stock shares | Whole-object packing (`0/1` knapsack) where items cannot be split (use dynamic programming) |
| Problems where sorting once by unit value tells you what to load next | Extra constraints like item incompatibilities or per-category limits |
