---
title: "Hash Set"
topic: "hashing"
order: 3
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/hashing/hash-set.html"
diagram: "/diagrams/hashing/hash-set-flow.html"
tags: ["hashing", "hash-set", "deduplication", "membership"]
---

## What is a hash set?

A bouncer with a VIP guest list only checks if your name is on the sheet, and skips writing it down a second time if it is already there.

A hash set keeps unique keys with no extra values attached. Checking `"is this item already in the set?"` (`contains`), adding, and removing all run in `O(1)` average time.

## Core idea

Hash the value to pick one bucket, then skip `add` if the value is already inside so duplicates never pile up.

## Python code

```python
class HashSet:
    def __init__(self, capacity: int = 8) -> None:
        self.buckets: list[list[int]] = [[] for _ in range(capacity)]

    def _index(self, key: int) -> int:
        return abs(key) % len(self.buckets)

    def add(self, key: int) -> bool:
        bucket = self.buckets[self._index(key)]
        if key in bucket:
            return False  # Ignore duplicates so every key stays unique
        bucket.append(key)
        return True

    def contains(self, key: int) -> bool:
        return key in self.buckets[self._index(key)]

    def remove(self, key: int) -> bool:
        bucket = self.buckets[self._index(key)]
        if key not in bucket:
            return False
        bucket.remove(key)
        return True
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| `add` / `contains` / `remove` (Average) | `O(1)` | `O(1)` extra | Checks only one bucket instead of scanning every stored item |
| `add` / `contains` / `remove` (Worst) | `O(n)` | `O(1)` extra | All items hash into the same bucket |
| Removing duplicates from `n` items | `O(n)` | `O(n)` | Runs one `O(1)` check and insert per item |

## When to use

| Great for | Avoid for |
|---|---|
| Removing duplicates or checking `"have I seen this before?"` in `O(1)` | Counting how many times each item shows up (use a Hash Map instead) |
| Remembering visited nodes in graph search or cycle checks | Looking up items by position like `arr[i]` |
| Finding common or missing items between two lists | Keeping elements in sorted order |
