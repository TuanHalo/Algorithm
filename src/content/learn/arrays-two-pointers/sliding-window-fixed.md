---
title: "Fixed-Size Sliding Window"
topic: "arrays-two-pointers"
order: 5
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1) to O(k)"
tags: ["sliding-window", "fixed-size", "subarrays", "moving-average", "anagrams"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`k > n`) | `O(1)` | `O(1)` | No window fits, so line 3 returns straight away |
| Average | `O(n)` | `O(1)` | The first window costs `k − 1` additions, then each slide costs one add and one subtract |
| Worst | `O(n)` | `O(1)` | About `2n` operations whatever `k` is; re-summing every window would be `O(n·k)` |

## When to use

| Great for | Avoid for |
|---|---|
| A fixed window length `k`: `k`-day moving averages, length-`k` substrings, anagram search with letter counts (`O(n·Σ)` time, `O(Σ)` space) | Windows whose length depends on a condition ("shortest subarray with sum ≥ S": use a dynamic window) |
| Window state you can undo in `O(1)` when a value leaves (sums, counts) | State you can’t undo cheaply, like a window maximum (needs a monotonic queue) |
