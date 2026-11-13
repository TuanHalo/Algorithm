---
title: "Heap Sort"
topic: "sorting"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/sorting/heap-sort.html"
diagram: "/diagrams/sorting/heap-sort-flow.html"
tags: ["sorting", "heap", "binary-tree", "in-place", "unstable"]
---

## 🎯 What is Heap Sort?

Imagine a knockout tournament bracket — **the strongest champion rises to the top, takes the podium, and the remaining contenders re-compete for the next spot**.
Heap Sort turns your array into an implicit binary tree (a Max-Heap) so the biggest item always sits at index `0`, swaps it to the end, and repairs the heap repeatedly.

## 🧠 Core Idea

> Build a Max-Heap → Swap root (max) to the end → Shrink heap and sift down

## 🐍 Python Code

```python
def heap_sort(arr: list[int]) -> list[int]:
    n = len(arr)
    # Build max-heap bottom-up (leaf nodes are already valid heaps)
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    # Extract max root one by one to the end of the array
    for end in range(n - 1, 0, -1):
        arr[0], arr[end] = arr[end], arr[0]
        heapify(arr, end, 0)  # Restore heap on remaining items
    return arr


def heapify(arr: list[int], size: int, root: int) -> None:
    largest = root
    left, right = 2 * root + 1, 2 * root + 2
    if left < size and arr[left] > arr[largest]:
        largest = left
    if right < size and arr[right] > arr[largest]:
        largest = right
    # Sift down if a child is bigger than the current root
    if largest != root:
        arr[root], arr[largest] = arr[largest], arr[root]
        heapify(arr, size, largest)
```

## ⏱️ Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| **Best** | `O(n log n)` | `O(1)` | Even on sorted input, extracting `n` roots requires `O(log n)` sifting each |
| **Average** | `O(n log n)` | `O(1)` | Bottom-up heap build is `O(n)`, followed by `n - 1` `O(log n)` extractions |
| **Worst** | `O(n log n)` | `O(1)` | Tree height is always `log₂(n)`, guaranteeing no quadratic worst case |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Strict memory limits + worst-case guarantees (`O(1)` space and `O(n log n)` time) | General-purpose arrays where Quick Sort wins on CPU cache locality |
| Embedded systems or real-time deadlines (never degrades to `O(n²)`) | When stable sorting is required (long-distance swaps reorder duplicates) |
| Finding the top `k` largest or smallest items without sorting everything | Nearly sorted arrays (still rebuilds the heap and sifts every element) |

