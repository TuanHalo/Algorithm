---
title: "Binary Heap (Priority Queue)"
topic: "tree"
order: 9
difficulty: "intermediate"
timeComplexity: "O(log n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/tree/binary-heap.html"
diagram: "/diagrams/tree/binary-heap-flow.html"
tags: ["tree", "heap", "priority-queue", "array"]
---

## What is a Binary Heap?

Think of a hospital triage desk: patients arrive in random order, yet the most urgent case always stays right at the front of the line without sorting everyone behind them.

A Binary Heap is a complete binary tree packed inside a flat array where every parent stays smaller (Min-Heap) or larger (Max-Heap) than its children.

## Core idea

Store tree level-order positions inside a Python `list` using `(i - 1) // 2` for parent and `2*i + 1`, `2*i + 2` for children, sifting new items up on push and sifting the root down on pop.

## Python code

```python
def heappush(heap: list[int], val: int) -> None:
    heap.append(val)
    idx = len(heap) - 1
    while idx > 0:
        parent = (idx - 1) // 2
        if heap[idx] < heap[parent]:
            heap[idx], heap[parent] = heap[parent], heap[idx]
            idx = parent
        else:
            break  # Heap order is already satisfied above


def heappop(heap: list[int]) -> int:
    top = heap[0]
    last = heap.pop()
    if heap:
        heap[0] = last
        sift_down(heap, 0)  # Restore order from root downward
    return top
```

## Complexity

| Operation | Time | Space | Why? |
|---|---|---|---|
| Peek `heap[0]` | `O(1)` | `O(1)` | Minimum (or maximum) always sits at index `0` |
| `heappush` / `heappop` | `O(log n)` | `O(1)` extra | Sifts along at most one root-to-leaf path of length `log₂(n)` |
| Bottom-up `heapify` | `O(n)` | `O(1)` extra | Most nodes sit near the bottom leaves and sift only `0` or `1` step |

## When to use

| Great for | Avoid for |
|---|---|
| Priority queues, Dijkstra's algorithm, task schedulers, and streaming top-`k` queries | Searching for an arbitrary value or printing all items sorted without popping (`O(n)` scan) |
| Production Python via the built-in `heapq` module (min-heap out of the box) | Range queries or predecessor/successor lookups (use a BST or AVL tree) |
