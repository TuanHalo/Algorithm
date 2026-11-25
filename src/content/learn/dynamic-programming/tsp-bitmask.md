---
title: "Traveling Salesperson (Bitmask DP)"
topic: "dynamic-programming"
order: 12
difficulty: "advanced"
timeComplexity: "O(n² · 2ⁿ)"
spaceComplexity: "O(n · 2ⁿ)"
tags: ["dynamic-programming", "bitmask-dp", "graph", "tsp"]
---

## Complexity

`n` cities.

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n² · 2ⁿ)` | `O(n · 2ⁿ)` | Every mask and city is visited by the loops, even when few states are reachable |
| Average | `O(n² · 2ⁿ)` | `O(n · 2ⁿ)` | `2ⁿ · n` states, each trying up to `n` next cities |
| Worst | `O(n² · 2ⁿ)` | `O(n · 2ⁿ)` | Same loops; trying every order of the cities is `O(n!)` |

## When to use

| Great for | Avoid for |
|---|---|
| Exact answers for small sets (`n ≤ 16` or so): shortest tour, Hamiltonian path, Shortest Path Visiting All Nodes, Find the Shortest Superstring | Large graphs (`n > 20`): `2ⁿ` states no longer fit; use heuristics (nearest neighbour, 2-opt) or an ILP solver |
| Any problem where only *which* items were used and the *last* one matter: assigning tasks to people, pairing up items, choosing a subset in order | Problems where the order inside the subset never matters: a plain subset DP or a knapsack is enough |
| Printing the route: also store the `u` that won each `dp[nmask][nxt]` and walk back from the best final city | Paths where cities may be revisited freely: that’s a shortest-path problem (Dijkstra / Floyd–Warshall) |
