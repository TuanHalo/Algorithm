---
title: "Stack Operations"
topic: "stack-queue"
order: 1
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(n)"
tags: ["stack-queue", "stack", "lifo", "fundamentals"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`pop`, `peek`, or `push` with spare room) | `O(1)` | `O(1)` | Each touches only the last slot of the list; nothing else moves |
| Average (`push`, amortized) | `O(1)` | `O(1)` | A full list grows by a factor, so the copying averages out to a constant per push |
| Worst (a `push` that grows the list) | `O(n)` | `O(n)` | Growing copies every item into a bigger block; the stack itself holds `n` items |

## When to use

| Great for | Avoid for |
|---|---|
| Undo / redo history, a browser’s Back button, depth-first search | Serving items in arrival order (use a queue) |
| Nested structure: function calls, or Valid Parentheses (push each opener, pop it on the matching closer) | Searching for a value or reaching into the middle (`O(n)`) |
| Reversing a sequence: push everything, then pop it all | Scheduling where the oldest request must not wait forever behind newer ones |
