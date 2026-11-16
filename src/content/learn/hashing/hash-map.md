---
title: "Hash Map"
topic: "hashing"
order: 2
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/hashing/hash-map.html"
diagram: "/diagrams/hashing/hash-map-flow.html"
tags: ["hashing", "hash-map", "dictionary", "lookup"]
---

## What is a hash map?

In a school locker room, your name maps to one locker number, so you go straight to your door instead of checking every locker down the hall.

A hash map stores `(key, value)` pairs inside an array of buckets. Because it hashes the key straight to one bucket, `put`, `get`, and `delete` take `O(1)` time on average.

## Core idea

Hash `key` to jump right to its bucket, then add, update, read, or delete that `(key, value)` pair without checking unrelated buckets.

## Python code

```python
class HashMap:
    def __init__(self, capacity: int = 8) -> None:
        self.capacity = capacity
        self.buckets: list[list[tuple[str, int]]] = [[] for _ in range(capacity)]

    def _index(self, key: str) -> int:
        return sum(ord(ch) for ch in key) % self.capacity

    def put(self, key: str, value: int) -> None:
        bucket = self.buckets[self._index(key)]
        for idx, (k, _) in enumerate(bucket):
            if k == key:
                bucket[idx] = (key, value)  # Update existing key in place
                return
        bucket.append((key, value))

    def get(self, key: str) -> int | None:
        for k, v in self.buckets[self._index(key)]:
            if k == key:
                return v
        return None
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| `put` / `get` / `delete` (Average) | `O(1)` | `O(1)` extra | Jumps straight to one bucket with only a few items inside |
| `put` / `get` / `delete` (Worst) | `O(n)` | `O(1)` extra | Every key lands in the exact same bucket |
| Total memory | `-` | `O(n)` | Holds `n` `(key, value)` pairs in the bucket array |

## When to use

| Great for | Avoid for |
|---|---|
| Fast `key -> value` lookups, caches, and pair-sum checks like Two Sum | Keeping keys sorted or quickly finding the smallest and largest keys |
| Counting how many times each word or number appears | Devices with tight memory where empty buckets waste space |
| Replacing slow `O(n²)` nested loops with a single `O(n)` pass | Autocomplete by prefix, where a Trie fits better |
