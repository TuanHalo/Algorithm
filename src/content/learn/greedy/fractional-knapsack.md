---
title: "Fractional Knapsack"
topic: "greedy"
order: 2
difficulty: "beginner"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/greedy/fractional-knapsack.html"
diagram: "/diagrams/greedy/fractional-knapsack-flow.html"
tags: ["greedy", "knapsack", "sorting", "ratio"]
---

## What is fractional knapsack?

Imagine filling a backpack at a spice market where you can scoop any fraction of a bag of saffron, cinnamon, or peppercorns up to your weight limit. You get the most value by scooping the priciest spice per gram first until it runs out, then moving to the next best price per gram.

Fractional knapsack maximizes total value inside a weight capacity when items can be split into smaller pieces.

## Core idea

Sort items by value per unit weight (`value / weight`) from highest to lowest, take whole items while they fit, and take a fraction of the next item to fill whatever space remains.

## Python code

```python
def fractional_knapsack(
    items: list[tuple[int, int]],
    capacity: int,
) -> float:
    # Sort by value density so every kilogram added gives maximum return
    ranked = sorted(items, key=lambda item: item[0] / item[1], reverse=True)
    total_value = 0.0
    remaining = capacity

    for value, weight in ranked:
        if remaining == 0:
            break
        take = min(weight, remaining)
        total_value += value * (take / weight)
        remaining -= take

    return total_value
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Average / Worst | `O(n log n)` | `O(n)` | Sorting `n` items by `value / weight` dominates the single linear packing pass |
| In-place sort | `O(n log n)` | `O(1)` extra | Sorting the input list in place avoids allocating a separate `ranked` copy |

## When to use

| Great for | Avoid for |
|---|---|
| Divisible cargo such as liquids, grains, bandwidth, or stock shares | Whole-object packing (`0/1` knapsack) where items cannot be split (use dynamic programming) |
| Situations where sorting once by unit value immediately tells you what to load next | Problems with extra constraints like item incompatibilities or per-category limits |
