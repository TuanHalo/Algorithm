---
title: "Radix Sort"
topic: "sorting"
order: 9
difficulty: "advanced"
timeComplexity: "O(d · (n + k))"
spaceComplexity: "O(n + k)"
verified: "2026-11-22"
tags: ["sorting", "non-comparison", "linear-time", "radix", "counting-sort"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(d · (n + k))` | `O(n + k)` | $d$ passes of counting sort over $n$ elements with base $k = 10$ |
| Average | `O(d · (n + k))` | `O(n + k)` | Unaffected by initial distribution; always performs $d$ passes |
| Worst | `O(d · (n + k))` | `O(n + k)` | When max element has large $d$, runtime is linear in $d \cdot n$ |

*Note: In computer architecture, keys are often sorted base $2^{16}$ or base $256$, where $k = 256$ and $d \le 4$ or $8$, achieving true $O(n)$ wall-clock throughput on 32-bit and 64-bit integers.*

## When to use

| Great for | Avoid for |
|---|---|
| Fixed-width integer arrays (e.g. 32-bit or 64-bit IDs, timestamps) | Floating-point numbers with arbitrary precision or exponents |
| Sorting strings of uniform length (e.g. zip codes, hashes) | Numbers with massive value ranges where $d \gg \log n$ |
| Scenarios where $O(n \log n)$ comparison bound is too slow | Memory-constrained systems where allocating auxiliary $O(n)$ buffers is prohibited |
