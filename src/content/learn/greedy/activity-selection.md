---
title: "Activity Selection"
topic: "greedy"
order: 3
difficulty: "beginner"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/greedy/activity-selection.html"
diagram: "/diagrams/greedy/activity-selection-flow.html"
tags: ["greedy", "intervals", "scheduling", "sorting"]
---

## What is activity selection?

Suppose you have one conference room for the day and a list of meeting requests, each with a start time and an end time. Picking the meeting that ends earliest frees up the room as soon as possible, leaving the largest window for later meetings.

Activity selection picks the maximum number of non-overlapping intervals you can schedule on a single resource.

## Core idea

Sort all intervals by their end time ascending, then walk through them and accept each interval whose start is at or after the previous chosen end time.

## Python code

```python
def activity_selection(
    intervals: list[tuple[int, int]],
) -> list[tuple[int, int]]:
    # Earliest end time leaves maximum room for remaining intervals
    ordered = sorted(intervals, key=lambda interval: interval[1])
    selected: list[tuple[int, int]] = []
    last_end = float("-inf")

    for start, end in ordered:
        if start >= last_end:
            selected.append((start, end))
            last_end = end

    return selected
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Unsorted input | `O(n log n)` | `O(n)` | Sorting `n` intervals by end time takes `O(n log n)` and `selected` holds up to `n` intervals |
| Already sorted by end time | `O(n)` | `O(n)` | Skips sorting and scans each interval once in a single pass |

## When to use

| Great for | Avoid for |
|---|---|
| Maximizing the count of non-overlapping intervals on one machine or room | Weighted interval scheduling where each task has a different payout (requires sorting plus DP) |
| Dropping minimum intervals to remove overlaps (`total - selected` count) | Finding how many rooms are needed to run every interval at once (use Minimum Meeting Rooms) |
