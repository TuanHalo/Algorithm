---
title: "Quick Sort"
topic: "sorting"
order: 5
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(log n)"
visualizer: "/visualizers/sorting/quick-sort.html"
diagram: "/diagrams/sorting/quick-sort-flow.html"
tags: ["sorting", "divide-and-conquer", "in-place", "unstable"]
---

## 🎯 What is Quick Sort?

Imagine sorting a crowd by height around a reference person (the Pivot) — **everyone shorter stands on the left, and everyone taller stands on the right**.
Quick Sort picks a pivot, rearranges the list in-place so smaller items move left and larger move right, then repeats the process on each side.

## 🧠 Core Idea

> Pick a pivot → Partition smaller items left and larger right → Recurse on both sides

## 🐍 Python Code

```python
def quick_sort(arr: list[int], low: int = 0, high: int | None = None) -> list[int]:
    if high is None:
        high = len(arr) - 1

    if low < high:
        # Partition array and place pivot in its final sorted spot
        pivot_idx = partition(arr, low, high)
        # Recursively sort the subarrays on either side of pivot
        quick_sort(arr, low, pivot_idx - 1)
        quick_sort(arr, pivot_idx + 1, high)
    return arr


def partition(arr: list[int], low: int, high: int) -> int:
    pivot = arr[high]  # Choose last element as pivot
    i = low - 1        # Boundary for elements <= pivot

    for j in range(low, high):
        # If element is smaller or equal, expand boundary and swap
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]

    # Swap pivot right after the boundary
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1
```

## ⏱️ Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| **Best** | `O(n log n)` | `O(log n)` | Pivot splits array into two nearly equal halves at every level |
| **Average** | `O(n log n)` | `O(log n)` | Balanced partitions on typical data; excellent hardware cache locality |
| **Worst** | `O(n²)` | `O(n)` | Sorted array with last-element pivot produces skewed 1-element partitions |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| General high-speed sorting (very small constant factor and CPU cache-friendly) | Scenarios where worst-case `O(n²)` time is unacceptable (use Merge Sort or Heap Sort) |
| In-place sorting needs (requires only `O(log n)` call stack vs Merge Sort's `O(n)`) | Strict stable sorting needs (partition swaps can change relative order of duplicates) |
| Standard numeric and primitive array sorting | Predictably pre-sorted data when using naive last-element pivot selection |

