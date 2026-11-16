---
title: "LRU Cache"
topic: "linked-list"
order: 6
difficulty: "advanced"
timeComplexity: "O(1)"
spaceComplexity: "O(capacity)"
visualizer: "/visualizers/linked-list/lru-cache.html"
diagram: "/diagrams/linked-list/lru-cache-flow.html"
tags: ["linked-list", "doubly-linked", "hash-map", "lru-cache"]
---

## What is an LRU cache?

Imagine a tiny desk that only holds 3 books. Whenever you read a book, you move it to the right edge (most recent); when a 4th book arrives, you pack away whichever book was left untouched on the far left (least recently used).
An LRU (Least Recently Used) Cache combines a Hash Map with a Doubly Linked List so both `get` and `put` run in `O(1)` time.

## Core idea

Look up nodes in `O(1)` via `cache[key]`, unlink and move touched nodes to the MRU end in `O(1)`, and evict `head.next` when capacity overflows.

## Python code

```python
class DNode:
    def __init__(self, key: int = 0, val: int = 0) -> None:
        self.key, self.val = key, val
        self.prev: DNode | None = None
        self.next: DNode | None = None


class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.cap = capacity
        self.cache: dict[int, DNode] = {}
        self.head, self.tail = DNode(), DNode()  # head.next = LRU, tail.prev = MRU
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node: DNode) -> None:
        assert node.prev is not None and node.next is not None
        node.prev.next, node.next.prev = node.next, node.prev

    def _insert_mru(self, node: DNode) -> None:
        assert self.tail.prev is not None
        prev = self.tail.prev
        prev.next = self.tail.prev = node
        node.prev, node.next = prev, self.tail

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._insert_mru(node)
        return node.val
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| `get(key)` | `O(1)` | `O(1)` extra | Hash map finds the `DNode` immediately; doubly-linked unlinking/re-inserting touches 4 pointers |
| `put(key, value)` | `O(1)` | `O(1)` extra | Inserts at `tail.prev` and evicts `head.next` in constant time |
| Total Memory | — | `O(capacity)` | Holds at most `capacity` entries across the hash map and node chain |

## When to use

| Great for | Avoid for |
|---|---|
| Bounded-memory caches where recent items are likely to be reused soon | Frequency-based workloads where an old but heavily hit item should stay (use LFU) |
| Database buffer pools and bounded memoization caches | Unbounded caches, or production Python code where `functools.lru_cache` works out of the box |
| Designs needing `O(1)` removal of arbitrary cached entries | Multi-threaded hot paths without locks or sharding |
