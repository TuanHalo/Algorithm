---
title: "Merge Sort"
topic: "sorting"
order: 7
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
verified: "2026-11-22"
tags: ["sorting", "divide-and-conquer", "stable", "recursion"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n log n)` | `O(n)` | Always divides into `log₂(n)` levels and does `O(n)` merge work per level |
| Average | `O(n log n)` | `O(n)` | Every level of the recursion tree processes all `n` elements during merge |
| Worst | `O(n log n)` | `O(n)` | Always splits down the middle, guaranteeing balanced halves in every case |

## When to use

| Great for | Avoid for |
|---|---|
| Large datasets (`n > 10,000`, guaranteed `O(n log n)` speed with no worst-case drop) | Memory-constrained systems (requires `O(n)` extra memory buffer) |
| Stable sorting needs (preserves relative order of equal elements) | Tiny arrays (`n < 20`, where Insertion Sort overhead is lower) |
| Sorting linked lists or external disk files (streaming sequential merges) | When in-place sorting (`O(1)` extra space) is strictly required |
