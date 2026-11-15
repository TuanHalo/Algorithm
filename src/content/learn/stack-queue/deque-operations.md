---
title: "Deque Operations"
topic: "stack-queue"
order: 4
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/stack-queue/deque-operations.html"
diagram: "/diagrams/stack-queue/deque-operations-flow.html"
tags: ["stack-queue", "deque", "double-ended", "fundamentals"]
---

## 🎯 What is a Deque?

Imagine a subway car with doors open at **both** the front and the back — **passengers can step on or off from either end without squeezing past anyone inside**.
A Deque (Double-Ended Queue) combines a Stack and a Queue into one structure, giving `O(1)` insertions and removals at both ends.

## 🧠 Core Idea

> Push or pop at either `front` or `rear` in `O(1)` → Unifies Stack (`LIFO`), Queue (`FIFO`), and two-ended algorithms

## 🐍 Python Code

```python
from collections import deque


def is_palindrome_deque(word: str) -> bool:
    # A deque lets us peel both ends inward in O(1) per pop
    chars: deque[str] = deque(word.lower())

    while len(chars) > 1:
        if chars.popleft() != chars.pop():
            return False  # Outer characters mismatched

    return True


def demo_deque_ops() -> list[int]:
    dq: deque[int] = deque([20])
    dq.appendleft(10)   # Front push -> [10, 20]
    dq.append(30)       # Back push  -> [10, 20, 30]
    dq.popleft()        # Front pop  -> [20, 30]
    dq.pop()            # Back pop   -> [20]
    return list(dq)
```

## ⏱️ Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| **Push Front / Back** (`appendleft` / `append`) | `O(1)` | `O(1)` extra | Doubly-linked block pointers attach directly to head or tail |
| **Pop Front / Back** (`popleft` / `pop`) | `O(1)` | `O(1)` | Detaches head or tail element without shifting interior items |
| **Index Access** (`dq[i]`) | `O(n)` middle / `O(1)` ends | `O(1)` | Walking across internal blocks from the nearest end takes linear time |
| **Total Memory** | — | `O(n)` | Stores `n` elements across fixed-size memory blocks |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Sliding window algorithms (`Monotonic Queue`) and 0-1 BFS | Heavy random indexing by arbitrary position `dq[i]` (use a `list`) |
| Palindrome checks, undo buffers with size caps (`maxlen`), and work-stealing | Sorting or binary searching (deques lack contiguous fast slicing) |
| Replacing Python `list` whenever you need `pop(0)` or `insert(0, x)` | Cases where strict Stack-only or Queue-only encapsulation is clearer |
