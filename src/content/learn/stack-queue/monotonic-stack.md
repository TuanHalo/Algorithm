---
title: "Monotonic Stack"
topic: "stack-queue"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/stack-queue/monotonic-stack.html"
diagram: "/diagrams/stack-queue/monotonic-stack-flow.html"
tags: ["stack-queue", "monotonic-stack", "next-greater", "amortized"]
---

## What is a monotonic stack?

Imagine people standing in a line facing right. The instant a taller newcomer walks up, every shorter person waiting ahead has found their Next Greater neighbor and leaves the line.
A Monotonic Stack keeps elements sorted inside the stack (strictly decreasing or increasing) so each element enters and leaves at most once, turning `O(n²)` nested loops into `O(n)`.

## Core idea

Keep unresolved indices in decreasing order. When a bigger number arrives, pop all smaller tops and record it as their Next Greater.

## Python code

```python
def next_greater_elements(nums: list[int]) -> list[int]:
    result = [-1] * len(nums)
    # Stack stores indices whose values are strictly decreasing
    stack: list[int] = []

    for idx, val in enumerate(nums):
        while stack and nums[stack[-1]] < val:
            waiting_idx = stack.pop()
            # Current val is the first taller element to the right
            result[waiting_idx] = val
        stack.append(idx)

    return result
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (strictly decreasing) | `O(n)` | `O(n)` | Zero pops happen; every index is pushed onto the stack once |
| Average | `O(n)` | `O(n)` | Even with nested `while` pops, each element is pushed once and popped at most once |
| Worst (increasing / spike) | `O(n)` | `O(n)` | At most `2n` total stack operations across the entire scan |

## When to use

| Great for | Avoid for |
|---|---|
| Next Greater / Next Smaller Element, Daily Temperatures, Stock Span | Finding the global maximum or minimum (one running variable takes `O(1)` space) |
| Largest Rectangle in Histogram and Trapping Rain Water | Queries needing the *k*-th largest element rather than the *nearest* taller one |
| Replacing `O(n²)` "look left/right until taller" inner scans | Unordered relationships that do not depend on left-to-right proximity |
