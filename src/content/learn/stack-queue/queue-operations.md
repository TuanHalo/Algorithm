---
title: "Queue Operations"
topic: "stack-queue"
order: 2
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/stack-queue/queue-operations.html"
diagram: "/diagrams/stack-queue/queue-operations-flow.html"
tags: ["stack-queue", "queue", "fifo", "deque"]
---

## What is a queue?

Imagine a single-lane coffee shop drive-thru. The first car to pull into line is always the first car to pick up its order and drive out.
A Queue follows the First-In, First-Out (FIFO) rule, keeping requests fair by appending at the rear and serving from the front.

## Core idea

Enqueue new items at the rear and dequeue old items from the front, using `deque` so front pops stay `O(1)`.

## Python code

```python
from collections import deque


class Queue:
    def __init__(self) -> None:
        # deque uses linked blocks so popleft() avoids O(n) list shifts
        self._items: deque[int] = deque()

    def enqueue(self, value: int) -> None:
        self._items.append(value)

    def dequeue(self) -> int | None:
        if not self._items:
            return None  # Guard against underflow on an empty queue
        return self._items.popleft()

    def front(self) -> int | None:
        return self._items[0] if self._items else None

    def is_empty(self) -> bool:
        return len(self._items) == 0
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| Enqueue (`append`) | `O(1)` | `O(1)` extra | Inserts straight onto the tail pointer of the deque |
| Dequeue (`popleft`) | `O(1)` | `O(1)` | Advances the head pointer instead of shifting every item left |
| Front / Empty | `O(1)` | `O(1)` | Reads `self._items[0]` or checks length immediately |
| Naive `list.pop(0)` | `O(n)` | `O(1)` | Must shift all `n - 1` remaining elements one slot left |

## When to use

| Great for | Avoid for |
|---|---|
| Breadth-First Search (BFS) level-by-level exploration | Most-recent-first tasks like Undo stacks or DFS backtracking |
| Task queues, print spoolers, and fair request buffering | Using a plain Python `list.pop(0)` on large queues (slow `O(n)` shifts) |
| Rate limiters and producer-consumer pipelines | Priority scheduling where urgent items must jump ahead (use a Heap) |
