---
title: "Coin Change (Min Coins)"
topic: "dynamic-programming"
order: 3
difficulty: "beginner"
timeComplexity: "O(amount · k)"
spaceComplexity: "O(amount)"
tags: ["dynamic-programming", "1d-dp", "unbounded-knapsack", "target-sum"]
---

## Complexity

`k` coin values.

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(1)` | `O(1)` | `amount = 0`: one slot, the loop never runs |
| Average | `O(amount · k)` | `O(amount)` | Every amount tries every coin once, one table slot per amount |
| Worst | `O(amount · k)` | `O(amount)` | Same pair loop whether or not the amount can be paid; trying every coin recursively is exponential |

## When to use

| Great for | Avoid for |
|---|---|
| The fewest pieces that reach a target when each piece can be reused: coins, Perfect Squares, Minimum Cost For Tickets | Coin systems where greedy is proven to work (1, 5, 10, 25): taking the biggest coin first is `O(k)` |
| Counting the ways to pay instead (Coin Change II): put `coin` in the outer loop and add, `dp[a] += dp[a - coin]`, so each mix is counted once | Huge amounts (`> 10⁶`) with few coins, where the table is too big: BFS over reachable amounts or math may finish sooner |
| Coin systems where greedy fails (1, 3, 4 for 6) | Each coin usable at most once: that’s 0/1 knapsack, which loops the amounts backwards |
