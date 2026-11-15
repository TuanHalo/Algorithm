---
title: "Stack Operations"
topic: "stack-queue"
order: 1
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/stack-queue/stack-operations.html"
diagram: "/diagrams/stack-queue/stack-operations-flow.html"
tags: ["stack-queue", "stack", "lifo", "fundamentals"]
---

## 🎯 What is a Stack?

Imagine a spring-loaded stack of cafeteria trays — **you only ever place a new tray on top and lift the top tray off first**.
A Stack follows the **Last-In, First-Out (LIFO)** rule, so the newest item waiting on top is always the first one to leave.

## 🧠 Core Idea

> Push onto the top → Peek or Pop only from the top → Never reach into the middle

## 🐍 Python Code

```python
class Stack:
    def __init__(self) -> None:
        # Python lists append and pop at the tail in O(1) amortized time
        self._items: list[int] = []

    def push(self, value: int) -> None:
        self._items.append(value)

    def pop(self) -> int | None:
        if not self._items:
            return None  # Guard against popping from an empty stack
        return self._items.pop()

    def peek(self) -> int | None:
        return self._items[-1] if self._items else None

    def is_empty(self) -> bool:
        return len(self._items) == 0
```

## ⏱️ Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| **Push** (`append`) | `O(1)` amortized | `O(1)` extra | Writes directly to the end slot; occasional array resize averages out |
| **Pop** (`pop`) | `O(1)` | `O(1)` | Removes the top element without shifting earlier items |
| **Peek / Empty** | `O(1)` | `O(1)` | Reads `self._items[-1]` or checks length in one step |
| **Total Memory** | — | `O(n)` | Stores `n` currently active items in the backing list |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Undo/redo history, browser back buttons, and DFS traversal | Serving items strictly in arrival order (use a Queue instead) |
| Tracking nested state like function calls and balanced brackets | Random access or searching for values buried in the middle (`O(n)`) |
| Reversing a sequence naturally without manual index swaps | Fixed-order task scheduling where older requests must not starve |
