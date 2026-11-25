---
title: "Skip List (Probabilistic Multi-Level Search)"
topic: "linked-list"
order: 6
difficulty: "advanced"
timeComplexity: "O(log n) average"
spaceComplexity: "O(n) average"
tags: ["linked-list", "skip-list", "probabilistic", "binary-search", "multi-level"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (in the top lane) | `O(log n)` | `O(1)` | Still one check per lane on the way down |
| Average | `O(log n)` | `O(1)` | About `log₂ n` lanes, about 2 moves on each |
| Worst (bad coin flips) | `O(n)` | `O(1)` | Every node stuck on level 0: a plain list |

## When to use

| Great for | Avoid for |
|---|---|
| A sorted set with fast search, insert and delete and no tree rotations: `insert` and `delete` reuse this search, recording the node before the key on every lane (Redis sorted sets, LevelDB's memtable) | Hard real-time code that needs a guaranteed `O(log n)` worst case (use a balanced tree) |
| Range queries: search for the lower bound, then walk level 0 | Small or fixed data, where a sorted array with Binary Search is simpler and cache-friendly |
| Concurrent indexes, where lock-free skip lists are far simpler than lock-free balanced trees | Memory-tight data: about `2n` forward links on average |
