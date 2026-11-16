---
title: "Stock with Cooldown (State Machine DP)"
topic: "dynamic-programming"
order: 11
difficulty: "advanced"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/dynamic-programming/stock-with-cooldown.html"
diagram: "/diagrams/dynamic-programming/stock-with-cooldown-flow.html"
tags: ["dynamic-programming", "state-machine", "stock", "space-optimized"]
---

## What is State Machine DP?

Imagine trading a single stock where selling today forces you to sit out tomorrow on a mandatory 1-day cooldown. One single "best profit so far" number cannot tell you whether you currently own a share or just sold yesterday.

State Machine DP splits each day into three clear modes—`hold`, `sold`, and `rest`—so illegal moves (like buying during cooldown) become impossible by design.

## Core idea

On each day's `price`, snapshot yesterday's states and update: `hold = max(prev_hold, prev_rest - price)`, `sold = prev_hold + price`, and `rest = max(prev_rest, prev_sold)`.

## Python code

```python
def max_profit_cooldown(prices: list[int]) -> int:
    hold, sold, rest = float("-inf"), 0, 0
    for price in prices:
        prev_hold, prev_sold, prev_rest = hold, sold, rest
        hold = max(prev_hold, prev_rest - price)  # Can only buy from rest
        sold = prev_hold + price                  # Selling triggers cooldown
        rest = max(prev_rest, prev_sold)
    return int(max(sold, rest))
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Average / Worst | `O(n)` | `O(1)` | Updates three scalar state variables once per trading day |

## When to use

| Great for | Avoid for |
|---|---|
| Sequential choices governed by rules, cooldowns, transaction fees, or `k` states | Single buy-and-sell problems where tracking `min_price` in one pass suffices |
| Modeling finite-state systems (e.g., paint house colors, stock limits, decode modes) | Large transaction counts `k` where tracking `2k` states exceeds `O(n · k)` limits |
