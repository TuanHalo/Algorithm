---
title: "Dynamic-Size Sliding Window"
topic: "arrays-two-pointers"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(min(n, Σ))"
tags: ["sliding-window", "dynamic-size", "two-pointers", "substrings", "amortized"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n)` | `O(1)` | `right` still visits every value once |
| Average | `O(n)` | `O(1)` | Each value joins the window once and leaves it at most once |
| Worst | `O(n)` | `O(1)` | `right` moves `n` times and `left` at most `n` times: about `2n` steps despite the nested `while`. A window over characters needs `O(Σ)` space for its counts |

## When to use

| Great for | Avoid for |
|---|---|
| The shortest or longest run of neighbours that meets a condition which only gets "more true" as the window grows (sum ≥ target over positive numbers) | Subsequences that may skip values (use dynamic programming or greedy) |
| String windows with letter counts or "no repeats" (Longest Substring Without Repeating Characters, Minimum Window Substring) | Lists with negative numbers, where growing can lower the sum (use prefix sums with a hash map) |
| Problems where both edges only ever move forward | Trees and graphs, where paths don’t form a line |
