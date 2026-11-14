---
title: "Exponential Search"
topic: "searching"
order: 6
difficulty: "intermediate"
timeComplexity: "O(log i)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/searching/exponential-search.html"
diagram: "/diagrams/searching/exponential-search-flow.html"
tags: ["searching", "unbounded", "doubling", "sorted"]
---

## 🎯 What is Exponential Search?

Imagine guessing a huge secret number by jumping **1, 2, 4, 8, 16… steps at a time until you overshoot, then playing Binary Search inside that tight range**.
Exponential Search shines on **unbounded or massive sorted lists** where the target often sits near the front, because it never even touches elements far past the answer.

## 🧠 Core Idea

> Double `bound` (`1, 2, 4, 8…`) until `arr[bound] > target` → Binary Search inside `[bound // 2, min(bound, n - 1)]`

## 🐍 Python Code

```python
def exponential_search(arr: list[int], target: int) -> int:
    n = len(arr)
    if n == 0:
        return -1
    if arr[0] == target:
        return 0

    bound = 1
    # Double the range while still below target
    while bound < n and arr[bound] <= target:
        bound *= 2

    low = bound // 2
    high = min(bound, n - 1)
    while low <= high:
        mid = low + (high - low) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
```

## ⏱️ Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| **Best** (index `0`) | `O(1)` | `O(1)` | Upfront check catches `arr[0] == target` immediately |
| **Average** (target at `i`) | `O(log i)` | `O(1)` | Doubling takes `log₂ i` steps; Binary Search runs on a slice of size `~i / 2` |
| **Worst** (near end / missing) | `O(log n)` | `O(1)` | Range expands up to `n`, then Binary Search finishes in `O(log n)` |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Unbounded or infinite sorted streams where `len(arr)` isn't known upfront | Unsorted data (both doubling and Binary Search break without sorted order) |
| Sorted arrays where targets usually appear close to index `0` (`O(log i)` < `O(log n)`) | Uniformly spaced numeric arrays where Interpolation Search hits in `O(log log n)` |
| Two-stage range discovery before calling Binary Search | Tiny arrays where extra bound-doubling logic adds unnecessary branches |

