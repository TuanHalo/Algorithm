---
title: "Merge Intervals"
topic: "greedy"
order: 5
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/greedy/merge-intervals.html"
diagram: "/diagrams/greedy/merge-intervals-flow.html"
tags: ["greedy", "intervals", "sorting", "merging"]
---

## What is merge intervals?

If three teammates mark busy blocks on a calendar from 9:00 to 10:30, 10:00 to 11:00, and 13:00 to 14:00, the room is actually booked for two clean blocks: 9:00 to 11:00 and 13:00 to 14:00.

Merge intervals turns a list of overlapping or touching ranges into the smallest set of disjoint ranges that cover the exact same span.

## Core idea

Sort all intervals by start time, then scan left to right and either stretch the last merged interval's end when `start <= merged[-1][1]` or append a new interval.

## Python code

```python
def merge_intervals(
    intervals: list[tuple[int, int]],
) -> list[tuple[int, int]]:
    if not intervals:
        return []

    ordered = sorted(intervals, key=lambda item: item[0])
    merged: list[tuple[int, int]] = [ordered[0]]

    for start, end in ordered[1:]:
        prev_start, prev_end = merged[-1]
        if start <= prev_end:
            # Overlap: extend the current block instead of opening a new one
            merged[-1] = (prev_start, max(prev_end, end))
        else:
            merged.append((start, end))

    return merged
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Unsorted input | `O(n log n)` | `O(n)` | Sorting `n` intervals by start time takes `O(n log n)`; `merged` holds at most `n` ranges |
| Already sorted by start | `O(n)` | `O(n)` | A single left-to-right pass checks and merges adjacent intervals |

## When to use

| Great for | Avoid for |
|---|---|
| Combining overlapping calendar blocks, IP ranges, or memory segments | Keeping individual intervals distinct to count peak concurrency (use Minimum Meeting Rooms) |
| Preprocessing messy interval lists before binary searching or inserting a new range | Dynamic range queries with frequent point updates (use an interval tree or segment tree) |
