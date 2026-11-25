---
title: "Deque Operations"
topic: "stack-queue"
order: 4
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
tags: ["stack-queue", "deque", "double-ended", "fundamentals"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (the outer pair differs) | `O(n)` | `O(n)` | Copying `nums` into the deque is `O(n)`; the loop stops after one comparison |
| Average | `O(n)` | `O(n)` | Each value is popped at most once, and `popleft()` / `pop()` are `O(1)` |
| Worst (a palindrome) | `O(n)` | `O(n)` | All `n / 2` pairs are compared; on a list, `pop(0)` would make this `O(n²)` |

## When to use

| Great for | Avoid for |
|---|---|
| Work at both ends: palindrome checks, sliding-window maximum (a monotonic queue), 0-1 BFS (`appendleft` for 0-cost edges) | Random access by position (`dq[i]` walks from the nearest end; use a `list`) |
| Replacing `list.pop(0)` or `list.insert(0, x)` anywhere | Sorting or binary search (no fast slicing) |
| Bounded history: `deque(maxlen=k)` drops the oldest item automatically | Code that only ever uses one end (a plain stack or queue reads clearer) |
