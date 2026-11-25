---
title: "Bellman-Ford Shortest Path"
topic: "graph"
order: 11
difficulty: "advanced"
timeComplexity: "O(V · E)"
spaceComplexity: "O(V)"
tags: ["graph", "bellman-ford", "negative-weights", "shortest-path"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(E)` | `O(V)` | With an early exit (stop when a pass changes nothing), one pass can be enough; the code above always runs all passes |
| Average | `O(V Â· E)` | `O(V)` | `V âˆ’ 1` sweeps over all `E` edges, plus one check sweep |
| Worst | `O(V Â· E)` | `O(V)` | An unlucky edge order fixes only one more edge of a long shortest path per pass |

## When to use

| Great for | Avoid for |
|---|---|
| Weighted graphs with negative edges, and detecting negative cycles (currency arbitrage) | Large graphs with non-negative weights: Dijkstra is far faster |
| Cheapest paths with at most `k` edges ("at most k stops"): run `k` passes, each on a copy of `dist` | All-pairs distances on a small dense graph: Floyd-Warshall fits directly |
