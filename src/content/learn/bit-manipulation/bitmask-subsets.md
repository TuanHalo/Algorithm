---
title: "Bitmask Dynamic Programming & Subset Iteration"
topic: "bit-manipulation"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n * 2^n)"
spaceComplexity: "O(n)"
tags: ["bitmask", "subsets", "combinatorics", "state-compression", "traveling-salesperson"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n · 2^n)` | `O(n)` extra | Even a short list visits all `2^n` masks and tests `n` bits in each |
| Average | `O(n · 2^n)` | `O(n)` extra | The same work for every input of size `n`; the returned lists hold up to `n · 2^n` numbers |
| Worst | `O(n · 2^n)` | `O(n)` extra | Practical limit about `n ≤ 20` (a million masks) |

## When to use

| Great for | Avoid for |
|---|---|
| Listing or checking every subset when `n ≤ 20` | `n` above about 25: `2^n` masks are too many to visit |
| Bitmask DP over visited sets, such as Traveling Salesperson (`dp[mask][last]`, `O(n² · 2^n)`) or job assignment | Problems with a greedy or polynomial solution |
| Walking the submasks of one mask with `sub = (sub - 1) & mask` (`O(3^n)` over all masks) and fast set operations: union `a \| b`, intersection `a & b`, difference `a & ~b` | Sets with sparse members or more than 64 elements (use a `set` or `bitarray`) |
