---
title: "Counting Sort"
topic: "sorting"
order: 5
difficulty: "intermediate"
timeComplexity: "O(n + k)"
spaceComplexity: "O(n + k)"
verified: "2026-11-22"
tags: ["sorting", "non-comparison", "linear-time", "stable"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n + k)` | `O(n + k)` | Scans `n` elements and `k` value buckets regardless of input order |
| Average | `O(n + k)` | `O(n + k)` | Linear passes over input (`n`) and bucket range (`k = max(arr)`) |
| Worst | `O(n + k)` | `O(n + k)` | Never compares pairs; runtime depends only on array size `n` and range `k` |

## When to use

| Great for | Avoid for |
|---|---|
| Non-negative integers within a small, bounded range (`k ≤ 10⁶`, e.g. ages, grades, bytes) | Huge value ranges (`max(arr) = 10⁹`, wastes massive memory on empty buckets) |
| Large datasets with many duplicate values (`n` big, `k` small) | Floating-point numbers, strings, or arbitrary objects without integer keys |
| As the stable digit-by-digit subroutine inside Radix Sort | Strict `O(1)` in-place memory environments |
