---
title: "Heap Sort"
topic: "sorting"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["sorting", "heap", "binary-tree", "in-place", "unstable"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n log n)` | `O(1)` | Even on sorted input, extracting `n` roots requires `O(log n)` sifting each |
| Average | `O(n log n)` | `O(1)` | Bottom-up heap build is `O(n)`, followed by `n - 1` `O(log n)` extractions |
| Worst | `O(n log n)` | `O(1)` | Tree height is always `log₂(n)`, guaranteeing no quadratic worst case |

## When to use

| Great for | Avoid for |
|---|---|
| Strict memory limits + worst-case guarantees (`O(1)` space and `O(n log n)` time) | General-purpose arrays where Quick Sort wins on CPU cache locality |
| Embedded systems or real-time deadlines (never degrades to `O(n²)`) | When stable sorting is required (long-distance swaps reorder duplicates) |
| Finding the top `k` largest or smallest items without sorting everything | Nearly sorted arrays (still rebuilds the heap and sifts every element) |
