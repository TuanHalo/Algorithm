---
title: "Array Memory Layout & Pointer Arithmetic"
topic: "arrays-two-pointers"
order: 1
difficulty: "beginner"
timeComplexity: "O(1) access, O(n) insert/delete"
spaceComplexity: "O(n)"
tags: ["arrays", "memory", "cache-locality", "pointers", "dynamic-array"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (read `arr[i]`, or append with a free slot) | `O(1)` | `O(1)` | A read is one address calculation, `start + i × slot size`; an append is one write |
| Average (append, amortized) | `O(1)` | `O(1)` | Doubling means the copies add up to less than `2n` over `n` appends |
| Worst (append that resizes, or insert / delete at index `k`) | `O(n)` | `O(n)` | A resize copies every value into a block twice as big; an insert or delete shifts the `n − k` values after `k` |

## When to use

| Great for | Avoid for |
|---|---|
| Frequent reads by index | Frequent inserts or deletes at the front or middle (each shifts everything after it) |
| Scanning millions of values in order: neighbours share cache lines, so sequential reads are fast | Systems that can’t tolerate an occasional `O(n)` pause for a resize |
| Collections whose size is fixed or grows mostly at the end | Hard real-time code that needs a guaranteed `O(1)` worst-case insert |
