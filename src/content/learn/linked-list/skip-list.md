---
title: "Skip List (Probabilistic Multi-Level Search)"
topic: "linked-list"
order: 6
difficulty: "advanced"
timeComplexity: "O(log n) average search/insert/delete"
spaceComplexity: "O(n) average"
tags: ["linked-list", "skip-list", "probabilistic", "binary-search", "multi-level"]
---

## What is a Skip List?

Imagine an express subway transit system.
If your train stops at every single local station (Station 1, 2, 3, 4, ... 100), reaching Station 92 takes 92 painful stops ($O(n)$ search time in an ordinary linked list).
To fix this, the transit authority adds an **Express Track** on Level 1 that stops only at stations 10, 20, 30, ... 100.
Then they add a **High-Speed Bullet Track** on Level 2 that stops only at 1, 50, and 100.

Now, to get to Station 92:
1. Ride the Bullet Track on Level 2 to Station 50. (1 jump)
2. Switch to the Express Track on Level 1 and ride to Station 90. (4 jumps)
3. Drop down to the Local Track on Level 0 and walk to Station 92! (2 steps)

Total stops: 7 instead of 92!
This is a **Skip List**: a multi-level probabilistic data structure invented by William Pugh that allows binary-search-like **$O(\log n)$** search, insertion, and deletion over a linked list without the complex rebalancing rotations of AVL or Red-Black trees!

## Core Concept

A Skip List consists of a hierarchy of sorted linked lists arranged in levels:

Key principles:
1. **Level 0**: Contains every single element in sorted order.
2. **Higher Levels**: Act as "express lanes" containing an increasingly sparse subset of elements.
3. **Probabilistic Height (Coin Flip)**:
   When inserting a new node, its height (number of levels it participates in) is chosen by simulating independent coin flips:
   - Level 1 with probability 1/2.
   - Level 2 with probability 1/4.
   - Level $k$ with probability $(1/2)^k$.
   Because heights are randomized, the expected number of levels is $\log_2 n$, guaranteeing $O(\log n)$ average operations.
4. **Search Algorithm**:
   Start at the top-left (head of highest level). At each node:
   - If the next node's key is less than or equal to target, walk forward horizontally.
   - If the next node's key is greater than target (or null), drop down one level vertically.
   - Repeat until reaching Level 0.

## Walkthrough

Consider searching for `17` in a 3-level Skip List:

```
Level 2: [Head] ----------------------------> [12] -------------------------> [Null]
                                                │
Level 1: [Head] -------------> [6] ---------> [12] -------------> [25] -----> [Null]
                                │               │                   │
Level 0: [Head] -> [3] ------> [6] -> [9] --> [12] -> [17] -----> [25] -----> [Null]
```

Trace searching for `17`:
1. Start at `Head` on Level 2:
   - Next node is `12`. Since $12 < 17$, move forward to `[12]`.
   - From `[12]`, next node is `Null` (too far). Drop down to Level 1.
2. At `[12]` on Level 1:
   - Next node is `25`. Since $25 > 17$ (too far!), drop down to Level 0.
3. At `[12]` on Level 0:
   - Next node is `17`. Since $17 == 17$, **Target Found!**

Total comparisons: 3 steps instead of scanning 5 nodes sequentially!

## Python Code

```python
import random


class SkipNode:
    def __init__(self, key: int, level: int) -> None:
        self.key = key
        # forward[i] stores the pointer to the next node at level i
        self.forward: list[SkipNode | None] = [None] * (level + 1)


class SkipList:
    """Probabilistic multi-level Skip List supporting O(log n) average operations."""

    def __init__(self, max_level: int = 16, p: float = 0.5) -> None:
        self.max_level = max_level
        self.p = p
        # Sentinel head node containing pointers up to max_level
        self.head = SkipNode(-1, max_level)
        self.level = 0

    def _random_level(self) -> int:
        """Flips a coin to determine the height of a new node."""
        lvl = 0
        while random.random() < self.p and lvl < self.max_level:
            lvl += 1
        return lvl

    def search(self, target: int) -> bool:
        """Searches for target in O(log n) average time."""
        curr = self.head
        # Traverse from the top active level down to level 0
        for i in range(self.level, -1, -1):
            while curr.forward[i] and curr.forward[i].key < target:
                curr = curr.forward[i]
        curr = curr.forward[0]
        return curr is not None and curr.key == target

    def insert(self, key: int) -> None:
        """Inserts key into the skip list in O(log n) average time."""
        update: list[SkipNode] = [self.head] * (self.max_level + 1)
        curr = self.head

        # Record the update predecessors across all levels
        for i in range(self.level, -1, -1):
            while curr.forward[i] and curr.forward[i].key < key:
                curr = curr.forward[i]
            update[i] = curr

        new_level = self._random_level()
        if new_level > self.level:
            for i in range(self.level + 1, new_level + 1):
                update[i] = self.head
            self.level = new_level

        # Splice new node into linked lists at levels 0..new_level
        new_node = SkipNode(key, new_level)
        for i in range(new_level + 1):
            new_node.forward[i] = update[i].forward[i]
            update[i].forward[i] = new_node

    def delete(self, key: int) -> bool:
        """Deletes key from the skip list if present. Returns True if deleted."""
        update: list[SkipNode] = [self.head] * (self.max_level + 1)
        curr = self.head

        for i in range(self.level, -1, -1):
            while curr.forward[i] and curr.forward[i].key < key:
                curr = curr.forward[i]
            update[i] = curr

        target_node = curr.forward[0]
        if target_node is None or target_node.key != key:
            return False

        # Unlink target node across all levels it belongs to
        for i in range(self.level + 1):
            if update[i].forward[i] != target_node:
                break
            update[i].forward[i] = target_node.forward[i]

        # Lower active level if top levels are now empty
        while self.level > 0 and self.head.forward[self.level] is None:
            self.level -= 1

        return True
```

## Complexity

| Operation | Average Time | Worst Time | Space | Why? |
|---|---|---|---|---|
| `search` | `O(log n)` | `O(n)` | `O(1)` | Expected number of levels is $\log_{1/p}(n)$, with constant steps per level |
| `insert` | `O(log n)` | `O(n)` | `O(log n)` | Search takes $O(\log n)$ plus splicing pointers up to random height |
| `delete` | `O(log n)` | `O(n)` | `O(1)` | Search takes $O(\log n)$ plus rewiring predecessor pointers |
| Total Space | `O(n)` | `O(n log n)` | — | Sum of geometric series $\sum_{i=0}^{\infty} n \cdot (1/2)^i = 2n$ expected pointers |

*Worst case $O(n)$ only occurs if every single coin flip yields Level 0 (extremely low probability for non-trivial $n$).*

## When to Use

| Great for | Avoid for |
|---|---|
| Concurrent in-memory databases (e.g. Redis Sorted Sets `zset`, LevelDB MemTable) because lock-free skip lists are far simpler than lock-free Red-Black trees | Hard real-time systems that require strict deterministic $O(\log n)$ worst-case guarantees |
| Maintaining dynamic sorted order with high write throughput | Tiny fixed-size lists where array cache locality outpaces pointer indirection |
| Range queries over sorted items (`[lower_bound, upper_bound]`) via horizontal Level 0 scans | When memory overhead per pointer must be minimized to single bytes |
