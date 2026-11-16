---
title: "Merge Intervals"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/merge-intervals/"
difficulty: "medium"
topics: ["greedy", "array", "sorting"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
diagram: "/diagrams/greedy/merge-intervals-flow.html"
approaches:
  - name: "Sort by Start Time"
    timeComplexity: "O(n log n)"
    spaceComplexity: "O(n)"
    isOptimal: true
    summary: "Sort intervals by start time and merge consecutive overlapping intervals in a single pass."
    tags:
      - label: "Greedy"
        topic: "greedy"
        slug: "interval-scheduling"
      - label: "Sorting"
        topic: "sorting"
        slug: "merge-sort"
---

## Problem

Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return *an array of the non-overlapping intervals that cover all the intervals in the input*.

### Example 1
```
Input: intervals = [[1,3],[2,6],[8,10],[15,18]]
Output: [[1,6],[8,10],[15,18]]
Explanation: Since intervals [1,3] and [2,6] overlap, merge them into [1,6].
```

### Example 2
```
Input: intervals = [[1,4],[4,5]]
Output: [[1,5]]
Explanation: Intervals [1,4] and [4,5] are considered overlapping.
```

## My approach

1. **Sort intervals**:
   - Sort intervals ascendingly by their starting coordinates `intervals.sort(key=lambda x: x[0])`.
   - Once sorted, any intervals that can possibly overlap will appear consecutively.
2. **Linear merge pass**:
   - Initialize the `merged` output list with the first interval.
   - For each subsequent interval `[start, end]`:
     - Compare `start` against the end time of the most recently merged interval `merged[-1][1]`.
     - **Overlap (`start <= merged[-1][1]`)**: The current interval overlaps with or touches the previous one. Extend the previous interval's end time: `merged[-1][1] = max(merged[-1][1], end)`.
     - **No overlap (`start > merged[-1][1]`)**: The previous interval is finished. Append `[start, end]` as a new disjoint interval in `merged`.

## My solution

```python
def merge(intervals: list[list[int]]) -> list[list[int]]:
    if not intervals:
        return []

    intervals.sort(key=lambda item: item[0])
    merged: list[list[int]] = [intervals[0]]

    for start, end in intervals[1:]:
        prev_start, prev_end = merged[-1]
        if start <= prev_end:
            # Overlap: extend the current block's end boundary
            merged[-1][1] = max(prev_end, end)
        else:
            merged.append([start, end])

    return merged
```

## AI feedback

### Strengths
- Sorting by start time transforms a quadratic interval-comparison problem into a linear scan.
- Using `max(prev_end, end)` handles both partial overlaps (e.g., `[1, 4]` and `[2, 6]`) and completely nested intervals (e.g., `[1, 8]` and `[2, 4]`).
- Appending directly to `merged` provides clean $O(n)$ space complexity for the result.

### Improvements
- In Python, mutably updating `merged[-1][1]` avoids reallocating lists or tuples.
- When the input is already guaranteed to be sorted by start time, the algorithm runs in optimal $O(n)$ time.

### Edge cases
- Single interval: Returns `[intervals[0]]` without entering loop.
- Touching intervals (`[1, 4]` and `[4, 5]`): `start <= prev_end` evaluates to `4 <= 4` (True), properly merging into `[1, 5]`.
- Completely enclosed intervals (`[1, 10]` and `[2, 5]`): `max(10, 5)` preserves `10`.

### Alternative approaches
- **Connected Components (Graph)**: Build a graph where overlapping intervals share an undirected edge, then compute connected components. Requires $O(n^2)$ time, which is suboptimal compared to sorting.
