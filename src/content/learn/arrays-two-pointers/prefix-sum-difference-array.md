---
title: "Prefix Sum & Difference Array"
topic: "arrays-two-pointers"
order: 2
difficulty: "beginner"
timeComplexity: "O(1) range queries / updates"
spaceComplexity: "O(n)"
tags: ["arrays", "prefix-sum", "difference-array", "range-queries", "precomputation"]
---

## Complexity

`n` values, `Q` queries or range updates.

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n + Q)` | `O(n)` | `n` additions build the table once; every query or update after that is `O(1)` |
| Average | `O(n + Q)` | `O(n)` | The work doesn’t depend on the values or on how wide the ranges are |
| Worst | `O(n + Q)` | `O(n)` | Even a range covering the whole list is one subtraction (or two writes); doing each range directly would be `O(Q·n)` |

## When to use

| Great for | Avoid for |
|---|---|
| A list that doesn’t change, with many range-sum queries | Updates mixed with queries, where each answer must see the latest values (use a Fenwick tree or segment tree) |
| Many range additions applied first, with the final values read once at the end | Reading the list after every single update (each read would need a rebuild) |
| Counting runs with sum `k`: store prefix sums in a hash map | Tight memory where an extra `n + 1` numbers don’t fit |
