---
title: "Coin Change (Greedy vs. DP)"
topic: "greedy"
order: 1
difficulty: "beginner"
timeComplexity: "O(k log k + c)"
spaceComplexity: "O(k + c)"
tags: ["greedy", "coin-change", "counterexample", "fundamentals"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (amount is `0`) | `O(k log k)` | `O(k)` | Sorting the `k` coin types still happens, but nothing is chosen |
| Average | `O(k log k + c)` | `O(k + c)` | One sort, one pass over the types, and `c` coins appended to `chosen` |
| Worst (mostly small coins) | `O(k log k + c)` | `O(k + c)` | `c` grows with the amount, for example 99 pennies for 99 cents |

## When to use

| Great for | Avoid for |
|---|---|
| Canonical coin systems like `[1, 5, 10, 25]` or powers of two, where greedy is exact | Arbitrary coin sets like `[1, 3, 4]` for target `6`, where greedy picks `4 + 1 + 1` instead of `3 + 3` |
| A quick valid change breakdown, or counts only (`remaining // coin` per type, no list) | Sets where greedy leaves a nonzero remainder although a smaller mix works, such as `[5, 4, 1]` for `8` (use dynamic programming) |
