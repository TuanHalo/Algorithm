---
title: "Circular Queue"
topic: "stack-queue"
order: 3
difficulty: "intermediate"
timeComplexity: "O(1)"
spaceComplexity: "O(k)"
visualizer: "/visualizers/stack-queue/circular-queue.html"
diagram: "/diagrams/stack-queue/circular-queue-flow.html"
tags: ["stack-queue", "queue", "ring-buffer", "modulo"]
---

## What is a circular queue?

Imagine a rotating sushi conveyor belt with `k` fixed plates. Once a guest takes a plate from the front, that empty spot wraps around to hold a fresh dish at the rear.
A Circular Queue reuses freed array slots with modulo arithmetic (`% capacity`), giving strict `O(1)` operations inside a fixed memory budget.

## Core idea

Track `front` and `size` inside a fixed array, wrap indices with `% capacity`, and reuse freed slots without shifting elements.

## Python code

```python
class CircularQueue:
    def __init__(self, capacity: int) -> None:
        self._buf: list[int | None] = [None] * capacity
        self._cap = capacity
        self._front = 0
        self._size = 0

    def enqueue(self, value: int) -> bool:
        if self._size == self._cap:
            return False  # Buffer full; cannot overwrite unread items
        rear = (self._front + self._size) % self._cap
        self._buf[rear] = value
        self._size += 1
        return True

    def dequeue(self) -> int | None:
        if self._size == 0:
            return None
        val = self._buf[self._front]
        self._buf[self._front] = None
        # Wrap front pointer back to index 0 after reaching capacity - 1
        self._front = (self._front + 1) % self._cap
        self._size -= 1
        return val
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| Enqueue | `O(1)` | `O(1)` extra | Computes `(front + size) % cap` directly with no allocations |
| Dequeue | `O(1)` | `O(1)` | Reads `buf[front]` and wraps `front` by one modulo step |
| Peek Front / Rear | `O(1)` | `O(1)` | Direct index lookup at `front` or `(front + size - 1) % cap` |
| Total Buffer | — | `O(k)` | Allocates one fixed array of size `k = capacity` upfront |

## When to use

| Great for | Avoid for |
|---|---|
| Audio/video streaming buffers and bounded producer-consumer rings | Workloads where queue size grows unpredictably past any fixed limit |
| Embedded or low-latency systems avoiding dynamic memory resizing | Scenarios needing frequent random insertions in the middle |
| Sliding logs or keeping the latest `k` network packets / events | Simple one-off Python scripts where `collections.deque` suffices |
