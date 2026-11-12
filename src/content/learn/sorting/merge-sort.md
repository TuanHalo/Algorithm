---
title: "Merge Sort"
topic: "sorting"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/sorting/merge-sort.html"
diagram: "/diagrams/sorting/merge-sort-flow.html"
tags: ["sorting", "divide-and-conquer", "stable", "recursion"]
---

## 🎯 What is Merge Sort?

Imagine splitting a messy stack of test papers in half, sorting each half, and then **zipping them together by repeatedly picking the smaller top paper**.
Merge Sort breaks an array down into single items, then merges those sorted pieces back together in perfect order.

## 🧠 Core Idea

> Divide array in half → Recursively sort both halves → Merge sorted halves back together

## 🐍 Python Code

```python
def merge_sort(arr: list[int]) -> list[int]:
    # Base case: 0 or 1 item is already sorted
    if len(arr) <= 1:
        return arr

    # Divide: split array down the middle
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])

    # Conquer: merge two sorted halves
    merged: list[int] = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1

    # Append remaining items from either half
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged
```

## ⏱️ Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| **Best** | `O(n log n)` | `O(n)` | Always divides into `log₂(n)` levels and does `O(n)` merge work per level |
| **Average** | `O(n log n)` | `O(n)` | Every level of the recursion tree processes all `n` elements during merge |
| **Worst** | `O(n log n)` | `O(n)` | Always splits down the middle, guaranteeing balanced halves in every case |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Large datasets (`n > 10,000`, guaranteed `O(n log n)` speed with no worst-case drop) | Memory-constrained systems (requires `O(n)` extra memory buffer) |
| Stable sorting needs (preserves relative order of equal elements) | Tiny arrays (`n < 20`, where Insertion Sort overhead is lower) |
| Sorting linked lists or external disk files (streaming sequential merges) | When in-place sorting (`O(1)` extra space) is strictly required |

