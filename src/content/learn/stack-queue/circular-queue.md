---
title: "Circular Queue"
topic: "stack-queue"
order: 3
difficulty: "intermediate"
timeComplexity: "O(1)"
spaceComplexity: "O(k)"
tags: ["stack-queue", "queue", "ring-buffer", "modulo"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (a refused `enqueue` or an empty `dequeue`) | `O(1)` | `O(k)` | One comparison of `_size` and the call returns |
| Average | `O(1)` | `O(k)` | One `%`, one read or write, one counter update; nothing shifts |
| Worst | `O(1)` | `O(k)` | Wrapping costs the same `%`; the `k` slots are reserved once, up front |

## When to use

| Great for | Avoid for |
|---|---|
| Fixed-size buffers: audio / video streaming, producer–consumer rings | Queues that must grow past any fixed limit (use `collections.deque`) |
| Embedded or low-latency code that can’t afford resizing | Inserting or removing in the middle |
| Keeping only the latest `k` events or packets (overwrite instead of refusing when full) | One-off Python scripts, where `collections.deque(maxlen=k)` already does this |
