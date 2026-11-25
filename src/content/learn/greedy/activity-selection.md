---
title: "Activity Selection"
topic: "greedy"
order: 3
difficulty: "beginner"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
tags: ["greedy", "intervals", "scheduling", "sorting"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (already sorted by end time) | `O(n)` | `O(n)` | Sorting an ordered list is a single check, then one scan |
| Average | `O(n log n)` | `O(n)` | Sorting `n` intervals by end time dominates; `selected` holds up to `n` |
| Worst (nothing overlaps) | `O(n log n)` | `O(n)` | Every interval is kept, so `selected` grows to `n` |

## When to use

| Great for | Avoid for |
|---|---|
| Maximizing the count of non-overlapping intervals on one machine or room | Weighted interval scheduling where each task has a different payout (sort plus DP) |
| Dropping the fewest intervals to remove overlaps (`total - selected`) | Finding how many rooms are needed to run every interval at once (Minimum Meeting Rooms) |
