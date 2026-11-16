---
title: "Minimum Meeting Rooms"
topic: "greedy"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/greedy/meeting-rooms.html"
diagram: "/diagrams/greedy/meeting-rooms-flow.html"
tags: ["greedy", "intervals", "min-heap", "scheduling"]
---

## What is minimum meeting rooms?

When a hotel hosts conferences all day, staff only need to open a new room if every current room is still occupied when the next session begins. Checking the room that clears out soonest tells you immediately whether you can reuse it.

Minimum meeting rooms finds the fewest parallel resources needed to run every scheduled interval without conflicts.

## Core idea

Sort meetings by start time and keep a min-heap of active room end times; reuse the earliest-ending room whenever `heap[0] <= start`, otherwise push a new room end time.

## Python code

```python
import heapq


def min_meeting_rooms(intervals: list[tuple[int, int]]) -> int:
    if not intervals:
        return 0

    end_times: list[int] = []
    for start, end in sorted(intervals, key=lambda item: item[0]):
        # Reuse the room that finishes earliest if it is free by start
        if end_times and end_times[0] <= start:
            heapq.heappop(end_times)
        heapq.heappush(end_times, end)

    return len(end_times)
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Average / Worst | `O(n log n)` | `O(n)` | Sorting `n` intervals and performing up to `n` heap pushes and pops each take `O(log n)` per interval |

## When to use

| Great for | Avoid for |
|---|---|
| Counting the peak number of concurrent meetings, train platforms, or CPU workers | Selecting a maximum subset on one single room (use Activity Selection sorted by end time) |
| Assigning each meeting to a specific room ID as you scan in chronological order | Static count-only queries where two sorted arrays of `starts` and `ends` suffice without a heap |
