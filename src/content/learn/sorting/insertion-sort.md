---
title: "Insertion Sort"
topic: "sorting"
order: 3
difficulty: "beginner"
timeComplexity: "O(n²)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/sorting/insertion-sort.html"
diagram: "/diagrams/sorting/insertion-sort-flow.html"
tags: ["sorting", "comparison", "in-place", "stable", "adaptive"]
---

## 🎯 What is Insertion Sort?

Imagine holding playing cards in your hand — **you pick up one card at a time and slide it into its sorted spot**.
Insertion Sort grows a sorted subarray from left to right, inserting each new element into its proper position by shifting larger items over.

## 🧠 Core Idea

> Pick the next card → Shift larger sorted items right → Drop key into place

## 🐍 Python Code

```python
def insertion_sort(arr: list[int]) -> list[int]:
    # Start from index 1 (a single item arr[0] is trivially sorted)
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        # Shift larger sorted elements right to open a slot for key
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        # Drop key into its opened sorted slot
        arr[j + 1] = key
    return arr
```

## ⏱️ Complexity

| Case | Time | Space | Shifts | Why? |
|------|------|-------|--------|------|
| **Best** (already sorted) | `O(n)` | `O(1)` | `0` shifts | 1 comparison per element; while loop exits immediately |
| **Average** | `O(n²)` | `O(1)` | `O(n²)` | Shifts roughly half of the sorted prefix on each pass |
| **Worst** (reversed) | `O(n²)` | `O(1)` | `n(n-1)/2` | Every sorted element must shift right on every step |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Small arrays (`n ≤ 10,000`, fits within ~10⁸ operations) | Large datasets (`n > 10,000`, quadratic slowdown) |
| Nearly sorted or live streaming data (adapts in `O(n)` time!) | Large reverse-sorted datasets |
| Building block in hybrid sorts (Python's Timsort uses it for small runs) | Systems requiring guaranteed `O(n log n)` worst case |

