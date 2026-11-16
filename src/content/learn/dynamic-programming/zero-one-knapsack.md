---
title: "0/1 Knapsack"
topic: "dynamic-programming"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n · W)"
spaceComplexity: "O(W)"
visualizer: "/visualizers/dynamic-programming/zero-one-knapsack.html"
diagram: "/diagrams/dynamic-programming/zero-one-knapsack-flow.html"
tags: ["dynamic-programming", "knapsack", "2d-dp", "space-optimized"]
---

## What is 0/1 Knapsack?

Imagine packing a backpack with a strict weight limit for a trip: each item is either packed once (`1`) or left behind (`0`). Grabbing the most valuable item per pound greedily can leave awkward empty space that a better pair of items would fill.

0/1 Knapsack evaluates every item against every capacity `0..W` and keeps the higher value between skipping the item or packing it.

## Core idea

Process one item `(wt, val)` at a time and loop capacity **backward** from `cap` down to `wt` with `dp[w] = max(dp[w], val + dp[w - wt])`.

## Python code

```python
def knapsack_01(weights: list[int], values: list[int], cap: int) -> int:
    dp = [0] * (cap + 1)
    for wt, val in zip(weights, values):
        for w in range(cap, wt - 1, -1):  # Reverse prevents reusing the same item
            dp[w] = max(dp[w], val + dp[w - wt])
    return dp[cap]
```

## Complexity

| Approach | Time | Space | Why? |
|---|---|---|---|
| 2D `dp[i][w]` table | `O(n · W)` | `O(n · W)` | Fills `n` item rows across `W + 1` capacities (needed for traceback) |
| 1D Reverse Sweep | `O(n · W)` | `O(W)` | Overwrites one capacity array safely from right to left |

## When to use

| Great for | Avoid for |
|---|---|
| Maximizing value under an integer budget where items cannot be split or repeated | Fractional items (take part of an item) — sort by `value / weight` with Greedy instead |
| Budget, cargo, and resource allocation problems with small integer capacities | Massive capacities (`W > 10⁷`) with few items, where meet-in-the-middle (`O(2^(n/2))`) wins |
