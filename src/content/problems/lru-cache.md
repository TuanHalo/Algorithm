---
title: "LRU Cache"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/lru-cache/"
difficulty: "medium"
topics: ["linked-list", "hash-table", "design"]
dateCompleted: "2026-11-16"
timeComplexity: "O(1)"
spaceComplexity: "O(capacity)"
diagram: "/diagrams/linked-list/lru-cache-flow.html"
approaches:
  - name: "Hash Map + Doubly Linked List"
    timeComplexity: "O(1)"
    spaceComplexity: "O(capacity)"
    isOptimal: true
    summary: "Combine hash map for O(1) lookups with doubly linked list for O(1) removal and insertion at MRU end."
    tags:
      - label: "Doubly Linked List"
        topic: "linked-list"
        slug: "doubly-linked-list"
      - label: "Hash Map"
        topic: "hashing"
        slug: "hash-map"
---

## Problem

Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

Implement the `LRUCache` class:
- `LRUCache(int capacity)` Initialize the LRU cache with positive size `capacity`.
- `int get(int key)` Return the value of the `key` if the key exists, otherwise return `-1`.
- `void put(int key, int value)` Update the value of the `key` if the `key` exists. Otherwise, add the `key-value` pair to the cache. If the number of keys exceeds the `capacity` from this operation, **evict** the least recently used key.

The functions `get` and `put` must each run in `O(1)` average time complexity.

### Example 1
```
Input:
["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]
Output:
[null, null, null, 1, null, -1, null, -1, 3, 4]

Explanation:
LRUCache lRUCache = new LRUCache(2);
lRUCache.put(1, 1); // cache is {1=1}
lRUCache.put(2, 2); // cache is {1=1, 2=2}
lRUCache.get(1);    // return 1
lRUCache.put(3, 3); // LRU key was 2, evicts key 2, cache is {1=1, 3=3}
lRUCache.get(2);    // returns -1 (not found)
lRUCache.put(4, 4); // LRU key was 1, evicts key 1, cache is {4=4, 3=3}
lRUCache.get(1);    // return -1 (not found)
lRUCache.get(3);    // return 3
lRUCache.get(4);    // return 4
```

## My approach

To achieve strict $O(1)$ time complexity for both `get` and `put`:
1. **Hash Map (`cache`)**:
   - Maps `key -> DNode`.
   - Provides $O(1)$ key lookup.
2. **Doubly Linked List (`head <-> ... <-> tail`)**:
   - Maintains recency ordering.
   - Using dummy `head` and `tail` sentinel nodes avoids edge cases when removing or inserting at list boundaries.
   - `head.next` is the **Least Recently Used (LRU)** item.
   - `tail.prev` is the **Most Recently Used (MRU)** item.
   - Unlike singly linked lists or arrays, a doubly linked list can remove any given node in $O(1)$ time because `node.prev` is directly accessible.
3. **Operations**:
   - `get(key)`: If `key` exists, move the corresponding node to the MRU tail (`_remove` then `_insert_mru`), and return its value. If not found, return `-1`.
   - `put(key, value)`: If `key` exists, update its value and move to MRU tail. If `key` is new:
     - If at capacity, evict the LRU node `head.next` and delete its entry from `cache`.
     - Create a new node, insert it at MRU tail, and store in `cache`.

## My solution

```python
class DNode:
    def __init__(self, key: int = 0, val: int = 0) -> None:
        self.key = key
        self.val = val
        self.prev: DNode | None = None
        self.next: DNode | None = None


class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.cap = capacity
        self.cache: dict[int, DNode] = {}
        # Sentinel dummy nodes
        self.head, self.tail = DNode(), DNode()
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node: DNode) -> None:
        assert node.prev is not None and node.next is not None
        node.prev.next = node.next
        node.next.prev = node.prev

    def _insert_mru(self, node: DNode) -> None:
        assert self.tail.prev is not None
        prev = self.tail.prev
        prev.next = node
        node.prev = prev
        node.next = self.tail
        self.tail.prev = node

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._insert_mru(node)
        return node.val

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            node = self.cache[key]
            node.val = value
            self._remove(node)
            self._insert_mru(node)
            return

        if len(self.cache) >= self.cap:
            # Evict least recently used (head.next)
            assert self.head.next is not None
            lru = self.head.next
            self._remove(lru)
            del self.cache[lru.key]

        new_node = DNode(key, value)
        self.cache[key] = new_node
        self._insert_mru(new_node)
```

## AI feedback

### Strengths
- Dummy head and tail nodes eliminate null checks and boundary special-casing during list manipulations.
- Storing `key` inside `DNode` enables $O(1)$ eviction from `self.cache` using `del self.cache[lru.key]`.
- Strict $O(1)$ operations with $O(\text{capacity})$ memory.

### Improvements
- In Python standard library, `collections.OrderedDict` internally implements this exact hash-map + doubly-linked list combination (`move_to_end` and `popitem(last=False)`). Implementing from scratch with `DNode` demonstrates deep mechanical understanding.

### Edge cases
- `capacity = 1`: Works without issues as dummy nodes protect boundary integrity.
- Updating an existing key with new value: Node must be updated and marked MRU without triggering eviction.

### Alternative approaches
- **`collections.OrderedDict`**: `OrderedDict` provides built-in $O(1)$ `move_to_end` and `popitem(last=False)`, achieving the same semantics in ~10 lines of code.
