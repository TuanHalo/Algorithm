---
title: "Doubly Linked List"
topic: "linked-list"
order: 2
difficulty: "beginner"
timeComplexity: "O(1) ends / O(n) search"
spaceComplexity: "O(n)"
visualizer: "/visualizers/linked-list/doubly-linked-list.html"
diagram: "/diagrams/linked-list/doubly-linked-list-flow.html"
tags: ["linked-list", "doubly-linked", "sentinel", "pointers"]
---

## What is a doubly linked list?

Imagine train cars coupled at both the front and the back. You can walk forward or backward between cars, and uncouple any car in the middle once you are standing beside it.
A Doubly Linked List gives every node both `prev` and `next` pointers. That lets you insert or delete in `O(1)` at either end or on any node you already hold.

## Core idea

Keep two sentinel boundary nodes (`head` and `tail`) so every real node sits between valid neighbors and never needs `None` edge-case branches.

## Python code

```python
class DNode:
    def __init__(
        self, val: int, prev: "DNode | None" = None, next: "DNode | None" = None
    ) -> None:
        self.val = val
        self.prev = prev
        self.next = next


class DoublyLinkedList:
    def __init__(self) -> None:
        # Sentinels eliminate empty-list and head/tail null checks
        self.head = DNode(0)
        self.tail = DNode(0)
        self.head.next, self.tail.prev = self.tail, self.head

    def _insert_between(self, val: int, left: DNode, right: DNode) -> DNode:
        node = DNode(val, prev=left, next=right)
        left.next = right.prev = node
        return node

    def unlink(self, node: DNode) -> int:
        assert node.prev is not None and node.next is not None
        node.prev.next = node.next
        node.next.prev = node.prev
        return node.val

    def push_front(self, val: int) -> DNode:
        assert self.head.next is not None
        return self._insert_between(val, self.head, self.head.next)

    def push_back(self, val: int) -> DNode:
        assert self.tail.prev is not None
        return self._insert_between(val, self.tail.prev, self.tail)
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| Push Front / Push Back | `O(1)` | `O(1)` extra | Splices directly beside `self.head` or `self.tail` sentinels |
| Pop Front / Pop Back / Unlink Node | `O(1)` | `O(1)` | Given a node reference, `node.prev` and `node.next` rewire in constant time |
| Search by value | `O(n)` | `O(1)` | Still traverses node-by-node from `head` or `tail` |
| Total Memory | — | `O(n)` | Stores two pointers (`prev`, `next`) per node instead of one |

## When to use

| Great for | Avoid for |
|---|---|
| `O(1)` removal of an arbitrary node when paired with a hash map (`LRU Cache`) | Memory-tight environments where a second pointer per node costs too much |
| Deques and browser Back/Forward history | Random-access lookups by index `i` (use a dynamic array) |
| Using sentinel `head` and `tail` nodes to avoid empty-list special cases | Front-only chains where a Singly Linked List is enough |
