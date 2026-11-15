---
title: "Monotonic Queue"
topic: "stack-queue"
order: 7
difficulty: "advanced"
timeComplexity: "O(n)"
spaceComplexity: "O(k)"
visualizer: "/visualizers/stack-queue/monotonic-queue.html"
diagram: "/diagrams/stack-queue/monotonic-queue-flow.html"
tags: ["stack-queue", "monotonic-queue", "sliding-window", "deque"]
---

## What is a monotonic queue?

Imagine a rolling leaderboard for the last `k` minutes. Expired scores drop off the front as time moves on, and any older, smaller score becomes useless the moment a higher score arrives.
A Monotonic Queue uses a `deque` of indices in decreasing value order so the front always holds the exact maximum of the current window in `O(1)` amortized time.

## Core idea

Evict expired indices from the front, pop smaller values from the back, and read the window maximum directly at `dq[0]`.

## Python code

```python
from collections import deque


def sliding_window_max(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()  # Indices kept in decreasing value order
    maxes: list[int] = []

    for idx, val in enumerate(nums):
        # Drop index that slid out of the left edge of [idx - k + 1, idx]
        if dq and dq[0] <= idx - k:
            dq.popleft()
        # Older smaller values can never beat val while it stays in window
        while dq and nums[dq[-1]] <= val:
            dq.pop()
        dq.append(idx)
        if idx >= k - 1:
            maxes.append(nums[dq[0]])

    return maxes
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (strictly increasing) | `O(n)` | `O(1)` deque | Each new element pops the single old element, keeping deque size 1 |
| Average | `O(n)` | `O(k)` | Each index is appended once and popped at most once from either end |
| Worst (strictly decreasing) | `O(n)` | `O(k)` | Deque holds at most `k` active indices before front eviction kicks in |

## When to use

| Great for | Avoid for |
|---|---|
| Sliding Window Maximum / Minimum over fixed or bounded windows `k` | Dynamic median queries inside a window (use two Heaps instead) |
| DP optimization over bounded lookback ranges (`dp[i] = min(dp[j]) + cost`) | Arbitrary non-sliding range max queries (use Segment Tree / Sparse Table) |
| Subarray bounded-difference problems (`max - min <= limit`) with two deques | Static whole-array max (a single `max(nums)` loop uses `O(1)` memory) |
