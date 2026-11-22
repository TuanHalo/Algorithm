---
title: "Exponential Search"
topic: "searching"
order: 6
difficulty: "intermediate"
timeComplexity: "O(log i)"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["searching", "unbounded", "doubling", "sorted"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (index `0`) | `O(1)` | `O(1)` | Upfront check catches `arr[0] == target` immediately |
| Average (target at `i`) | `O(log i)` | `O(1)` | Doubling takes `log₂ i` steps; Binary Search runs on a slice of size `~i / 2` |
| Worst (near end / missing) | `O(log n)` | `O(1)` | Range expands up to `n`, then Binary Search finishes in `O(log n)` |

## When to use

| Great for | Avoid for |
|---|---|
| Unbounded or infinite sorted streams where `len(arr)` isn't known upfront | Unsorted data (both doubling and Binary Search break without sorted order) |
| Sorted arrays where targets usually appear close to index `0` (`O(log i)` < `O(log n)`) | Uniformly spaced numeric arrays where Interpolation Search hits in `O(log log n)` |
| | Tiny arrays where extra bound-doubling logic adds unnecessary branches |
