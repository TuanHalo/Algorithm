---
title: "Traveling Salesperson (Bitmask DP)"
topic: "dynamic-programming"
order: 12
difficulty: "advanced"
timeComplexity: "O(n² · 2ⁿ)"
spaceComplexity: "O(n · 2ⁿ)"
visualizer: "/visualizers/dynamic-programming/tsp-bitmask.html"
diagram: "/diagrams/dynamic-programming/tsp-bitmask-flow.html"
tags: ["dynamic-programming", "bitmask-dp", "graph", "tsp"]
---

## What is Bitmask DP?

Suppose a courier must visit `n` cities once and return home with minimum total mileage. Checking every route order takes `O(n!)`, which explodes past 10 cities, even though two prefixes visiting the **same set of cities** and ending at the **same city** have the exact same future options.

Bitmask DP packs the visited set into the bits of an integer `mask` (`0..(1 << n) - 1`), collapsing `O(n!)` permutations into `O(n² · 2ⁿ)` states.

## Core idea

Store `dp[mask][u]` as the cheapest path visiting cities in `mask` and ending at `u`, then extend each `(mask, u)` to every unvisited city `nxt` via `mask | (1 << nxt)`.

## Python code

```python
def tsp_bitmask(dist: list[list[int]]) -> int:
    n = len(dist)
    inf = 10**9
    dp = [[inf] * n for _ in range(1 << n)]
    dp[1][0] = 0  # Start at city 0 with bit 0 set
    for mask in range(1, 1 << n):
        for u in range(n):
            if not (mask & (1 << u)) or dp[mask][u] == inf:
                continue
            for nxt in range(n):
                if not (mask & (1 << nxt)):
                    nmask = mask | (1 << nxt)
                    dp[nmask][nxt] = min(dp[nmask][nxt], dp[mask][u] + dist[u][nxt])
    full = (1 << n) - 1
    return min(dp[full][u] + dist[u][0] for u in range(n))
```

## Complexity

| Approach | Time | Space | Why? |
|---|---|---|---|
| Brute-force permutations | `O(n!)` | `O(n)` | Explores every city ordering separately without merging shared subsets |
| Held-Karp Bitmask DP | `O(n² · 2ⁿ)` | `O(n · 2ⁿ)` | `2ⁿ` masks × `n` ending cities × `n` next-city transitions |

## When to use

| Great for | Avoid for |
|---|---|
| Small-`n` (`n ≤ 16`) exact tour, Hamiltonian path, or subset-pairing problems | Large graphs (`n > 20`) where `2ⁿ` blows up memory — use heuristics or ILP solvers |
| Problems where order matters only via the last element and visited subset | Unordered counting problems where plain 1D/2D DP without bitmasks works |
