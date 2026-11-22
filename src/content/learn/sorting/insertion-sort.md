---
title: "Insertion Sort"
topic: "sorting"
order: 2
difficulty: "beginner"
timeComplexity: "O(n²)"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["sorting", "comparison", "in-place", "stable", "adaptive"]
---

## Complexity

| Case | Time | Space | Shifts | Why? |
|------|------|-------|--------|------|
| Best (already sorted) | `O(n)` | `O(1)` | `0` shifts | 1 comparison per element; while loop exits immediately |
| Average | `O(n²)` | `O(1)` | `O(n²)` | Shifts roughly half of the sorted prefix on each pass |
| Worst (reversed) | `O(n²)` | `O(1)` | `n(n-1)/2` | Every sorted element must shift right on every step |

## When to use

| Great for | Avoid for |
|---|---|
| Small arrays (`n ≤ 10,000`, fits within ~10⁸ operations) | Large datasets (`n > 10,000`, quadratic slowdown) |
| Nearly sorted or live streaming data (adapts in `O(n)` time!) | Large reverse-sorted datasets |
| Building block in hybrid sorts (Python's Timsort uses it for small runs) | Systems requiring guaranteed `O(n log n)` worst case |
