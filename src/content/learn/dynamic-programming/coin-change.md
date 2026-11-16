---
title: "Coin Change (Min Coins)"
topic: "dynamic-programming"
order: 3
difficulty: "beginner"
timeComplexity: "O(amount · k)"
spaceComplexity: "O(amount)"
visualizer: "/visualizers/dynamic-programming/coin-change.html"
diagram: "/diagrams/dynamic-programming/coin-change-flow.html"
tags: ["dynamic-programming", "1d-dp", "unbounded-knapsack", "target-sum"]
---

## What is Coin Change?

Suppose you have coins worth `1, 3, 4` and need to make `6`. A greedy habit grabs `4` first and gets stuck paying `4 + 1 + 1` (3 coins), even though `3 + 3` makes `6` in just 2 coins.

Coin Change builds the minimum coin count for every smaller amount `1..amount`, so each larger target can stand on the best precomputed remainder `a - coin`.

## Core idea

Seed `dp[0] = 0` and `dp[1..amount] = amount + 1`, then relax `dp[a] = min(dp[a], dp[a - coin] + 1)` for every coin that fits.

## Python code

```python
def coin_change(coins: list[int], amount: int) -> int:
    dp = [amount + 1] * (amount + 1)  # Sentinel larger than any valid count
    dp[0] = 0
    for a in range(1, amount + 1):
        for coin in coins:
            if a >= coin:
                dp[a] = min(dp[a], dp[a - coin] + 1)
    return dp[amount] if dp[amount] <= amount else -1
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Average / Worst | `O(amount · k)` | `O(amount)` | Iterates `amount` sub-targets across `k` coin denominations |

## When to use

| Great for | Avoid for |
|---|---|
| Minimum-count target sums with unlimited coin reuse | Huge targets (`amount > 10⁶`) with tiny coin sets, where BFS on states may finish sooner |
| Arbitrary coin systems where greedy largest-first fails | Counting distinct coin combinations without swapping loop order (`coin` outer, `a` inner) |
