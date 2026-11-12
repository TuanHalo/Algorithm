---
title: "Selection Sort"
topic: "sorting"
order: 2
difficulty: "beginner"
timeComplexity: "O(n²)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/sorting/selection-sort.html"
diagram: "/diagrams/sorting/selection-sort-flow.html"
tags: ["sorting", "comparison", "in-place", "unstable"]
---

## 🎯 What is Selection Sort?

Imagine arranging books on a shelf by height — **you scan for the thinnest book and swap it into the first spot**.
Selection Sort repeatedly scans the unsorted portion of your list to find the minimum value, then places it directly into its final position.

## 🧠 Core Idea

> Scan unsorted rest for the minimum → Swap it into the current slot → Advance by one

## 🐍 Python Code

```python
def selection_sort(arr: list[int]) -> list[int]:
    n = len(arr)
    for i in range(n):
        # Assume the current slot holds the minimum
        min_idx = i
        for j in range(i + 1, n):
            # Look for an even smaller value in the unsorted rest
            if arr[j] < arr[min_idx]:
                min_idx = j
        # Swap found minimum into its final sorted position
        if min_idx != i:
            arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr
```

## ⏱️ Complexity

| Case | Time | Space | Swaps | Why? |
|------|------|-------|-------|------|
| **Best** | `O(n²)` | `O(1)` | `O(1)` (0 swaps) | Scans all elements; already sorted, no swaps needed |
| **Average** | `O(n²)` | `O(1)` | `O(n)` (≤ n - 1) | Compares `n(n-1)/2` pairs, but swaps at most once per pass |
| **Worst** | `O(n²)` | `O(1)` | `O(n)` (≤ n - 1) | Same number of comparisons even when reversed |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Small arrays (`n ≤ 10,000`, within ~10⁸ operations) | Large datasets (`n > 10,000`, nested loops become slow) |
| Write-sensitive memory (Flash / EEPROM, minimizes write cycles) | When maintaining original order of identical values is required (unstable) |
| Situations where swapping is very costly compared to comparisons | Nearly sorted data (unlike Bubble/Insertion Sort, cannot stop early) |

