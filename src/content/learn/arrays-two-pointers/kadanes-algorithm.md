---
title: "Kadane's Algorithm (Maximum Subarray)"
topic: "arrays-two-pointers"
order: 7
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["arrays", "dynamic-programming", "greedy", "maximum-subarray", "kadane"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n)` | `O(1)` | Every value still gets its extend-or-restart choice |
| Average | `O(n)` | `O(1)` | One `max` and one comparison per value, with two running numbers |
| Worst | `O(n)` | `O(1)` | Never more than one pass; trying every run would be `O(n²)`, divide and conquer `O(n log n)` |

## When to use

| Great for | Avoid for |
|---|---|
| The biggest sum of a contiguous run when values can be negative (also returning where it starts and ends: reset the start on every restart) | All non-negative values: the whole list is the answer |
| Variants: circular arrays (total minus the smallest run), maximum product (track both the biggest and smallest product) | Subsequences that may skip values: just add up every positive number |
| 2D grids, by collapsing pairs of rows into a 1D list and running Kadane on it | Problems that need the run’s length bounded (use a sliding window or prefix sums) |
