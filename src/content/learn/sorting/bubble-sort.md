---
title: "Bubble Sort"
topic: "sorting"
order: 1
difficulty: "beginner"
timeComplexity: "O(n²)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/sorting/bubble-sort.html"
diagram: "/diagrams/sorting/bubble-sort-flow.html"
tags: ["sorting", "comparison", "in-place", "stable"]
---

## 🎯 What is Bubble Sort?

Imagine bubbles rising in soda — **the biggest bubbles float to the top first**.
Bubble Sort walks down your list comparing neighbors, letting larger numbers "bubble up" to the end one pass at a time.

## 🧠 Core Idea

> Compare two neighbors → Swap if left > right → Repeat until no swaps happen

## 🐍 Python Code

```python
def bubble_sort(arr: list[int]) -> list[int]:
    n = len(arr)
    for i in range(n):
        swapped = False  # Track swaps so we can stop early if sorted
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr
```

## ⏱️ Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| **Best** (already sorted) | `O(n)` | `O(1)` | One pass checks every pair, sees zero swaps, stops early |
| **Average** | `O(n²)` | `O(1)` | Nested loops compare pairs across multiple passes |
| **Worst** (reversed) | `O(n²)` | `O(1)` | Every single pair has to swap on every pass |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Small arrays (`n ≤ 10,000`, fits within ~10⁸ operations) | Large datasets (`n > 10,000`, becomes very slow) |
| Nearly sorted lists (stops in 1 pass with early exit!) | Real-world software & apps (use built-ins like Python's `sorted()`) |
| Learning and visualizing how sorting works step-by-step | Time-critical or performance-sensitive systems |

