---
title: "Separate Chaining"
topic: "hashing"
order: 4
difficulty: "intermediate"
timeComplexity: "O(1 + α)"
spaceComplexity: "O(n + m)"
visualizer: "/visualizers/hashing/separate-chaining.html"
diagram: "/diagrams/hashing/separate-chaining-flow.html"
tags: ["hashing", "collision-handling", "chaining", "rehashing"]
---

## What is separate chaining?

When two roommates share apartment mailbox `#3`, the mail carrier does not throw a letter away; both letters simply sit stacked together inside cubby `#3`.

Separate chaining solves hash collisions the same way. Each bucket holds a short list (or chain) of entries, and when the average stack grows past `0.75` items per bucket, the table doubles in size and re-sorts every item.

## Core idea

Let colliding keys sit together in the same bucket's list, and double the number of buckets whenever `size / len(buckets) > 0.75`.

## Python code

```python
class ChainedHashTable:
    def __init__(self, capacity: int = 4) -> None:
        self.buckets: list[list[tuple[str, int]]] = [[] for _ in range(capacity)]
        self.size = 0

    def put(self, key: str, value: int) -> None:
        idx = sum(ord(c) for c in key) % len(self.buckets)
        for i, (k, _) in enumerate(self.buckets[idx]):
            if k == key:
                self.buckets[idx][i] = (key, value)
                return
        self.buckets[idx].append((key, value))
        self.size += 1
        if self.size / len(self.buckets) > 0.75:
            self._rehash()  # Keep average chain length under 1

    def _rehash(self) -> None:
        old_buckets = self.buckets
        self.buckets = [[] for _ in range(len(old_buckets) * 2)]
        self.size = 0
        for chain in old_buckets:
            for key, val in chain:
                self.put(key, val)
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| Average lookup / insert (`α = n / m`) | `O(1 + α)` | `O(1)` extra | Only walks the short chain in `buckets[idx]` |
| Worst lookup / insert | `O(n)` | `O(1)` extra | A bad hash function dumps all `n` items into one long chain |
| Average insert with table doubling | `O(1)` | `O(n + m)` | Rare `O(n + m)` resizes spread across many fast inserts |

## When to use

| Great for | Avoid for |
|---|---|
| General hash tables with lots of adds and deletes | Tight loops where jumping between separate list pointers slows the CPU |
| Tables that might briefly hold more items than buckets (`α > 1.0`) | Strict fixed-memory setups that cannot allocate extra list nodes |
| Easy deletes, because you just remove the item from its bucket list | Code that cannot pause for an occasional full-table resize |
