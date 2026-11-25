---
title: "Separate Chaining"
topic: "hashing"
order: 4
difficulty: "intermediate"
timeComplexity: "O(1 + α)"
spaceComplexity: "O(n + m)"
tags: ["hashing", "collision-handling", "chaining", "rehashing"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(1)` | `O(n + m)` | The chain is empty, so `put` appends at once |
| Average (`α = n / m`) | `O(1 + α)` | `O(n + m)` | Only the short chain in `buckets[idx]` is walked; `_rehash` keeps `α` under 0.75 |
| Worst | `O(n)` | `O(n + m)` | A bad hash puts all `n` keys in one chain, and a rehash re-puts every key |

## When to use

| Great for | Avoid for |
|---|---|
| General hash tables with lots of adds and deletes (a delete is just removing the key from its chain) | Tight loops where jumping between separate list nodes slows the CPU |
| Tables that might briefly hold more items than buckets (`α > 1.0`) | Strict fixed-memory setups that cannot allocate extra list nodes |
| Key-value maps: store `(key, value)` pairs in the chains, as the Hash Map lesson does | Code that cannot pause for an occasional full-table resize |
