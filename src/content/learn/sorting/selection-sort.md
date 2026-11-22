---
title: "Selection Sort"
topic: "sorting"
order: 3
difficulty: "beginner"
timeComplexity: "O(n²)"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["sorting", "comparison", "in-place", "unstable"]
---

## Complexity

| Case | Time | Space | Swaps | Why? |
|------|------|-------|-------|------|
| Best | `O(n²)` | `O(1)` | `O(1)` (0 swaps) | Scans all elements; already sorted, no swaps needed |
| Average | `O(n²)` | `O(1)` | `O(n)` (≤ n - 1) | Compares `n(n-1)/2` pairs, but swaps at most once per pass |
| Worst | `O(n²)` | `O(1)` | `O(n)` (≤ n - 1) | Same number of comparisons even when reversed |

## When to use

| Great for | Avoid for |
|---|---|
| Small arrays (`n ≤ 10,000`, within ~10⁸ operations) | Large datasets (`n > 10,000`, nested loops become slow) |
| Write-sensitive memory (Flash / EEPROM, minimizes write cycles) | When maintaining original order of identical values is required (unstable) |
| Situations where swapping is very costly compared to comparisons | Nearly sorted data (unlike Bubble/Insertion Sort, cannot stop early) |
