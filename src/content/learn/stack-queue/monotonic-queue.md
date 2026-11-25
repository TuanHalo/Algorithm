---
title: "Monotonic Queue"
topic: "stack-queue"
order: 7
difficulty: "advanced"
timeComplexity: "O(n)"
spaceComplexity: "O(k)"
tags: ["stack-queue", "monotonic-queue", "sliding-window", "deque"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (strictly increasing) | `O(n)` | `O(1)` | Each newcomer pops the one before it, so `dq` never holds more than one index |
| Average | `O(n)` | `O(k)` | Each index is appended once and removed at most once, from the front or the back |
| Worst (strictly decreasing) | `O(n)` | `O(k)` | Nothing is popped from the back, so `dq` fills to `k` indices and the front evicts one per step |

## When to use

| Great for | Avoid for |
|---|---|
| Sliding Window Maximum or Minimum (flip `<=` to `>=` for the minimum) | The median of a window (use two heaps) |
| DP with a bounded look-back, such as `dp[i] = max(dp[j]) + cost` for `j` in the last `k` | Range maximum over arbitrary ranges, not a sliding one (use a segment tree or sparse table) |
| “max − min ≤ limit” subarray problems, with one decreasing and one increasing deque | The maximum of the whole list (one `max(nums)` pass, `O(1)` space) |
