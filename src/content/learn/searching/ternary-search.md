---
title: "Ternary Search"
topic: "searching"
order: 7
difficulty: "intermediate"
timeComplexity: "O(log₃ n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/searching/ternary-search.html"
diagram: "/diagrams/searching/ternary-search-flow.html"
tags: ["searching", "divide-and-conquer", "sorted", "three-way"]
---

## 🎯 What is Ternary Search?

Imagine asking **two friends to stand at the 1/3 and 2/3 marks of a sorted bookshelf** — one quick glance tells you which single third can hold your book.
Ternary Search splits a sorted range into three parts per step, shrinking the window faster (`1/3` instead of `1/2`), though checking two dividers takes more comparisons overall than Binary Search.

## 🧠 Core Idea

> Compute `mid1` and `mid2` → Check both dividers → Keep only the left, middle, or right third

## 🐍 Python Code

```python
def ternary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1

    while low <= high:
        third = (high - low) // 3
        mid1 = low + third
        mid2 = high - third

        if arr[mid1] == target:
            return mid1
        if arr[mid2] == target:
            return mid2

        if target < arr[mid1]:
            high = mid1 - 1       # Target belongs in the left third
        elif target > arr[mid2]:
            low = mid2 + 1        # Target belongs in the right third
        else:
            low, high = mid1 + 1, mid2 - 1  # Keep only the middle third

    return -1
```

## ⏱️ Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| **Best** (`mid1` or `mid2`) | `O(1)` | `O(1)` | First pass hits either the 1/3 or 2/3 divider immediately |
| **Average** | `O(log₃ n)` | `O(1)` | Drops `2/3` of the array per loop, doing ~`2 · log₃ n ≈ 1.26 · log₂ n` checks |
| **Worst** (missing or leaf) | `O(log₃ n)` | `O(1)` | Shrinks to a 1-element window after `⌊log₃ n⌋ + 1` iterations |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Finding the maximum or minimum of a unimodal curve (goes up then down) | Plain sorted array lookups (Binary Search uses ~20% fewer comparisons!) |
| Understanding multi-way divide-and-conquer tradeoffs (`log₃ n` vs `log₂ n`) | Unsorted lists where comparing against dividers proves nothing |
| Expensive single-variable convex/concave optimization problems | Tiny arrays where simpler linear or binary loops win |

