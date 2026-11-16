---
title: "Meeting Rooms II"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/meeting-rooms-ii/"
difficulty: "medium"
topics: ["greedy", "array", "sorting", "heap"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
diagram: "/diagrams/greedy/meeting-rooms-flow.html"
approaches:
  - name: "Min-Heap of End Times"
    timeComplexity: "O(n log n)"
    spaceComplexity: "O(n)"
    isOptimal: true
    summary: "Sort intervals by start time and maintain a min-heap of active room end times."
    tags:
      - label: "Greedy"
        topic: "greedy"
        slug: "interval-scheduling"
      - label: "Heap"
        topic: "sorting"
        slug: "heap-sort"
  - name: "Two Pointers with Chronological Events"
    timeComplexity: "O(n log n)"
    spaceComplexity: "O(n)"
    isOptimal: true
    summary: "Separate start times and end times into two sorted arrays and count active rooms with two pointers."
    tags:
      - label: "Two Pointers"
        topic: "sorting"
---

## Problem

Given an array of meeting time intervals `intervals` where `intervals[i] = [start_i, end_i]`, return *the minimum number of conference rooms required*.

### Example 1
```
Input: intervals = [[0,30],[5,10],[15,20]]
Output: 2
Explanation:
Meeting [0, 30] overlaps with [5, 10] and [15, 20]. At least two rooms are needed simultaneously.
```

### Example 2
```
Input: intervals = [[7,10],[2,4]]
Output: 1
```

## My approach

1. **Sort intervals chronologically**:
   - Sort all intervals by their start times. This allows us to process meetings in the exact chronological order in which rooms must be allocated.
2. **Min-Heap for active rooms**:
   - Maintain a min-heap `end_times` storing the finish times of all currently occupied rooms.
   - The top of the heap `end_times[0]` represents the room that becomes free earliest.
3. **Greedy room allocation**:
   - When scheduling the next meeting `[start, end]`:
     - If `end_times[0] <= start`, the earliest room has ended before or at the start time of the new meeting. We can reuse this room by popping the old end time.
     - Otherwise, no room is currently free, so a new room must be allocated.
   - Push the new meeting's `end` time into the heap.
4. **Result**:
   - The size of the heap `len(end_times)` at the end represents the peak number of rooms required simultaneously.

## My solution

```python
import heapq


def min_meeting_rooms(intervals: list[list[int]]) -> int:
    if not intervals:
        return 0

    intervals.sort(key=lambda x: x[0])
    end_times: list[int] = []

    for start, end in intervals:
        # Reuse the earliest ending room if it is free by start time
        if end_times and end_times[0] <= start:
            heapq.heappop(end_times)
        heapq.heappush(end_times, end)

    return len(end_times)
```

## AI feedback

### Strengths
- Greedy min-heap approach naturally simulates real-time resource allocation in $O(n \log n)$ time.
- By popping the top element when `end_times[0] <= start`, the heap's maximum size represents the exact peak concurrency.
- Handles arbitrary start and end ranges cleanly.

### Improvements
- If only the maximum room count is needed and meeting-to-room assignment is not required, sorting start and end arrays separately using two pointers avoids heap overhead while keeping $O(n \log n)$ time and $O(n)$ space.

### Edge cases
- `intervals` is empty: Handled immediately by returning `0`.
- Single interval: Loop runs once, pushes end time, returns `1`.
- Back-to-back meetings (`[1, 5]` and `[5, 10]`): `end_times[0] <= start` is satisfied (`5 <= 5`), so the room is reused without conflict.

### Alternative approaches
- **Chronological Two Pointers**: Extract `starts = sorted(i[0] for i in intervals)` and `ends = sorted(i[1] for i in intervals)`. Whenever `starts[s] < ends[e]`, increment active room count; otherwise, advance `e` and decrement room count.
- **Line Sweep / Difference Array**: Treat starts as `+1` events and ends as `-1` events; the prefix sum peak is the answer.
