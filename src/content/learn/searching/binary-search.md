---
title: "Binary Search"
topic: "searching"
order: 2
difficulty: "beginner"
timeComplexity: "O(log n)"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["searching", "divide-and-conquer", "sorted", "iterative"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (middle item) | `O(1)` | `O(1)` | First midpoint check hits the target immediately |
| Average | `O(log n)` | `O(1)` | Each comparison cuts the remaining search window in half |
| Worst (missing or edge) | `O(log n)` | `O(1)` | Halving continues at most `⌊log₂ n⌋ + 1` steps until `low > high` |

## When to use

| Great for | Avoid for |
|---|---|
| Large, static sorted arrays with fast random index access (`arr[mid]`) and repeated lookups | Unsorted lists where a one-off `O(n)` scan is faster than `O(n log n)` sorting |
| Monotonic search spaces ("first valid value" or numeric root finding) | Linked lists (no `O(1)` middle indexing makes jumping slow) |
| | Tiny arrays (`n < 16`) where Linear Search has lower constant overhead |
