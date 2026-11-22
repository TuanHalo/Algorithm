---
title: "Quick Sort"
topic: "sorting"
order: 8
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(log n)"
verified: "2026-11-22"
tags: ["sorting", "divide-and-conquer", "in-place", "unstable"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n log n)` | `O(log n)` | Pivot splits array into two nearly equal halves at every level |
| Average | `O(n log n)` | `O(log n)` | Balanced partitions on typical data; excellent hardware cache locality |
| Worst | `O(n²)` | `O(n)` | Sorted array with last-element pivot produces skewed 1-element partitions |

## When to use

| Great for | Avoid for |
|---|---|
| General high-speed sorting (very small constant factor and CPU cache-friendly) | Scenarios where worst-case `O(n²)` time is unacceptable (use Merge Sort or Heap Sort) |
| In-place sorting needs (requires only `O(log n)` call stack vs Merge Sort's `O(n)`) | Strict stable sorting needs (partition swaps can change relative order of duplicates) |
| Standard numeric and primitive array sorting | Predictably pre-sorted data when using naive last-element pivot selection |
