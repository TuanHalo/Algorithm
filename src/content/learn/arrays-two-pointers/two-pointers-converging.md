---
title: "Converging Two Pointers (Opposite Direction)"
topic: "arrays-two-pointers"
order: 3
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["two-pointers", "sorted-arrays", "in-place", "two-sum", "binary-elimination"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (ends match) | `O(1)` | `O(1)` | The very first sum of the two ends is the target |
| Average | `O(n)` | `O(1)` | Each sum moves one pointer inward, ruling out one value |
| Worst (no pair) | `O(n)` | `O(1)` | The pointers meet after `n − 1` sums; only two indexes are stored |

## When to use

| Great for | Avoid for |
|---|---|
| Pair searches in a sorted array (two sum, closest pair, pair counts) | Unsorted input whose original indexes must be returned (use a hash map, as in Two Sum) |
| Problems where one comparison rules out an end: Container With Most Water, Valid Palindrome, 3Sum (fix one value, converge on the rest, `O(n²)`) | Combinations of more than three values (use backtracking or meet-in-the-middle) |
| In-place reversals and palindrome checks from both ends | Streams you can only read once, front to back |
