---
title: "Unique Paths (2D Grid DP)"
topic: "dynamic-programming"
order: 5
difficulty: "intermediate"
timeComplexity: "O(m · n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/dynamic-programming/unique-paths.html"
diagram: "/diagrams/dynamic-programming/unique-paths-flow.html"
tags: ["dynamic-programming", "2d-dp", "grid", "space-optimized"]
---

## What is Unique Paths?

Picture a robot in the top-left corner of a grid that can only step right or down to reach the bottom-right corner. Any square can only be entered from the square directly above it or directly to its left.

Unique Paths counts every valid route by summing those two incoming paths at each cell, and compresses the entire 2D table into a single 1D row.

## Core idea

Seed a single row `dp = [1] * cols` and sweep downward, updating `dp[c] += dp[c - 1]` so old `dp[c]` acts as top and `dp[c - 1]` acts as left.

## Python code

```python
def unique_paths(rows: int, cols: int) -> int:
    dp = [1] * cols  # First row only has 1 straight-right path per cell
    for _ in range(1, rows):
        for c in range(1, cols):
            dp[c] += dp[c - 1]
    return dp[-1]
```

## Complexity

| Approach | Time | Space | Why? |
|---|---|---|---|
| Full 2D `dp[r][c]` | `O(m · n)` | `O(m · n)` | Visits every grid cell once and stores the whole grid |
| 1D Rolling Row | `O(m · n)` | `O(n)` | Only the current row and overwritten previous row values are needed |

## When to use

| Great for | Avoid for |
|---|---|
| Counting paths or minimizing path sums on monotonic grids (right/down only) | Grids allowing 4-way movement (up/down/left/right), which need BFS or Dijkstra |
| Learning how 2D grid recurrences compress to a 1D rolling row | Open obstacle-free math-only queries where `comb(m + n - 2, m - 1)` runs in `O(min(m, n))` |
