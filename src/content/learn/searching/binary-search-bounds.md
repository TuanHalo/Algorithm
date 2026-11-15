---
title: "Binary Search Bounds"
topic: "searching"
order: 3
difficulty: "intermediate"
timeComplexity: "O(log n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/searching/binary-search-bounds.html"
diagram: "/diagrams/searching/binary-search-bounds-flow.html"
tags: ["searching", "binary-search", "bounds", "duplicates"]
---

## What is binary search bounds?

Imagine finding the first or last student who scored `90` in a sorted gradebook full of ties. Spotting one `90` isn't enough; you still have to check left or right for earlier or later copies.
Binary Search Bounds modifies standard Binary Search so that instead of stopping on the first match, it saves the index and keeps narrowing the window.

## Core idea

Record the match in `ans`, shrink the window left (`high = mid - 1`) to find the first occurrence or right (`low = mid + 1`) to find the last, and return `ans`.

## Python code

```python
def find_bound(arr: list[int], target: int, find_first: bool = True) -> int:
    low, high = 0, len(arr) - 1
    ans = -1  # Track the best matching index seen so far

    while low <= high:
        mid = low + (high - low) // 2
        if arr[mid] == target:
            ans = mid
            # Keep searching one side to tighten the boundary
            if find_first:
                high = mid - 1
            else:
                low = mid + 1
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return ans
```

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(log n)` | `O(1)` | Even after a hit, we keep halving until `low > high` to prove no better bound exists |
| Average | `O(log n)` | `O(1)` | Every iteration cuts the remaining search window in half |
| Worst | `O(log n)` | `O(1)` | Runs at most `⌊log₂ n⌋ + 1` iterations regardless of duplicate count |

## When to use

| Great for | Avoid for |
|---|---|
| Counting frequency of a target in a sorted list (`last - first + 1`) | Unsorted arrays (boundaries have no meaning without sorted order) |
| Finding insertion indices or ranges (`bisect_left` / `bisect_right`) | Datasets where any arbitrary matching index is already good enough |
| Problems asking for "minimum valid capacity" or "maximum feasible size" | Tiny arrays (`n < 16`) where a single scan is simpler and equally fast |

