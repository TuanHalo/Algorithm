---
title: "Open Addressing"
topic: "hashing"
order: 5
difficulty: "intermediate"
timeComplexity: "O(1)"
spaceComplexity: "O(m)"
visualizer: "/visualizers/hashing/open-addressing.html"
diagram: "/diagrams/hashing/open-addressing-flow.html"
tags: ["hashing", "open-addressing", "linear-probing", "quadratic-probing"]
---

## What is open addressing?

In a busy parking lot, if spot `#4` is taken, you keep driving forward (`#5`, `#6` in linear probing, or `#5`, `#8` in quadratic probing) until you find an empty space.

Open addressing stores every entry straight inside one flat array with no side chains. If someone leaves a spot early, you leave a `TOMBSTONE` marker instead of setting it to `None`, so later lookups keep driving past that gap to find keys parked farther down.

## Core idea

Step through the array using `(h + offset) % capacity` until you hit an open slot or the matching key, and mark deleted spots as `TOMBSTONE` so searches do not stop too soon.

## Python code

```python
class OpenAddressTable:
    TOMBSTONE = object()

    def __init__(self, capacity: int = 8) -> None:
        self.keys: list[object | None] = [None] * capacity
        self.vals: list[int | None] = [None] * capacity

    def _probe(self, key: int, step: int, quadratic: bool) -> int:
        offset = step * step if quadratic else step
        return (abs(key) + offset) % len(self.keys)

    def put(self, key: int, val: int, quadratic: bool = False) -> bool:
        first_tomb = -1
        for step in range(len(self.keys)):
            idx = self._probe(key, step, quadratic)
            slot = self.keys[idx]
            if slot is None:
                target = first_tomb if first_tomb != -1 else idx
                self.keys[target], self.vals[target] = key, val
                return True
            if slot is self.TOMBSTONE and first_tomb == -1:
                first_tomb = idx  # Reuse earliest tombstone if key is new
            elif slot == key:
                self.vals[idx] = val
                return True
        return False
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| Average `put` / `get` (`α < 0.7`) | `O(1)` | `O(1)` extra | Checks only a few nearby slots side by side in memory |
| Crowded table (`α -> 1`) or clumping | `O(n)` | `O(1)` extra | Occupied neighbors clump together, forcing long searches |
| Total memory | `-` | `O(m)` | Uses one flat array with zero extra node pointers |

## When to use

| Great for | Avoid for |
|---|---|
| Fast CPU-cache lookups (Python's built-in `dict` uses open addressing) | Tables that fill past `70%` capacity without resizing |
| Saving memory by avoiding linked-list pointers | Heavy delete-and-add churn if you never rehash old `TOMBSTONE` markers |
| Breaking up neighbor clumps by switching from `+i` to `+i²` probing | Workloads that need a strict cap on probe steps |
