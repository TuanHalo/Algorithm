---
title: "Queue Operations"
topic: "stack-queue"
order: 2
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(n)"
tags: ["stack-queue", "queue", "fifo", "deque"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`dequeue`, `front`, or `enqueue` with spare room) | `O(1)` | `O(1)` | A deque changes or reads one end without moving anything else |
| Average | `O(1)` | `O(1)` | Every operation touches only the front or the back |
| Worst (an `enqueue` that starts a new block) | `O(1)` | `O(n)` | A deque grows one fixed-size block at a time, so it never copies the values it holds; the queue itself holds `n` values |

## When to use

| Great for | Avoid for |
|---|---|
| Breadth-first search, level by level | Most-recent-first work: undo history or depth-first backtracking (use a stack) |
| Task queues, print spoolers, fair request buffers | Priority scheduling where urgent items must jump ahead (use a heap) |
| Rate limiters and producer–consumer pipelines | A plain list with `pop(0)` on a long line (every serve shifts the rest) |
