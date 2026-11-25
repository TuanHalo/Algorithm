---
title: "0/1 Knapsack"
topic: "dynamic-programming"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n · W)"
spaceComplexity: "O(W)"
tags: ["dynamic-programming", "knapsack", "2d-dp", "space-optimized"]
---

## Complexity

`n` items, capacity `W`.

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n)` | `O(W)` | Every item is heavier than `W`: line 4’s range is empty for each one |
| Average | `O(n · W)` | `O(W)` | Each item checks the capacities from `W` down to its weight, one row kept |
| Worst | `O(n · W)` | `O(W)` | Light items check almost every capacity; the full 2D table needs `O(n · W)` space, trying every subset `O(2ⁿ)` time |

## When to use

| Great for | Avoid for |
|---|---|
| Picking items at most once under an integer budget: Partition Equal Subset Sum (`dp` of booleans, `cap = total / 2`), Target Sum, Last Stone Weight II | Items you can split (fractional knapsack): sort by `value / weight` and take greedily |
| Unlimited copies of each item (unbounded knapsack, Coin Change): loop the capacities **upwards** instead | Huge capacities (`W > 10⁷`) with few items: meet in the middle, `O(2^(n/2))`, is smaller |
| Listing which items were packed: keep the full 2D table and walk it back from `dp[n][W]` | Non-integer weights, which can’t index a table |
