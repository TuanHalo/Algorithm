---
title: "Coin Change (Greedy vs. DP)"
topic: "greedy"
order: 1
difficulty: "beginner"
timeComplexity: "O(k log k + c)"
spaceComplexity: "O(k + c)"
visualizer: "/visualizers/greedy/coin-change-greedy.html"
diagram: "/diagrams/greedy/coin-change-greedy-flow.html"
tags: ["greedy", "coin-change", "counterexample", "fundamentals"]
---

## What is greedy coin change?

When a cashier hands back 63 cents in US coins, they grab two quarters, one dime, and three pennies without testing smaller combinations first.

Greedy coin change builds a target amount by always picking the largest coin that still fits. That local rule gives the fewest coins for standard currencies like US or Euro coins, though it can miss the best answer on custom coin sets.

## Core idea

Sort the coin values from largest to smallest, repeatedly take the biggest coin that does not exceed the remaining amount, and stop when the balance hits zero.

## Python code

```python
def coin_change_greedy(coins: list[int], amount: int) -> list[int] | None:
    chosen: list[int] = []
    remaining = amount

    for coin in sorted(coins, reverse=True):
        if coin <= 0 or coin > remaining:
            continue
        count = remaining // coin  # Take as many of the largest coin as fit
        chosen.extend([coin] * count)
        remaining -= count * coin

    return chosen if remaining == 0 else None
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Sorting + greedy pass | `O(k log k + c)` | `O(k + c)` | Sorts `k` coin types once, then appends `c` chosen coins to the result list |
| Returning counts only | `O(k log k)` | `O(k)` | Divides `remaining // coin` once per coin type instead of building a list of length `c` |

## When to use

| Great for | Avoid for |
|---|---|
| Canonical coin systems like `[1, 5, 10, 25]` or powers of two where greedy is exact | Arbitrary coin sets like `[1, 3, 4]` for target `6`, where greedy picks `4 + 1 + 1` instead of `3 + 3` |
| Quick baseline estimates when you only need a valid change breakdown fast | Cases where greedy leaves a nonzero remainder even though smaller coins could sum to `amount` (use dynamic programming) |
