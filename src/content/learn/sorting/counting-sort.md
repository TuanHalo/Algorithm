---
title: "Counting Sort"
topic: "sorting"
order: 7
difficulty: "intermediate"
timeComplexity: "O(n + k)"
spaceComplexity: "O(n + k)"
visualizer: "/visualizers/sorting/counting-sort.html"
diagram: "/diagrams/sorting/counting-sort-flow.html"
tags: ["sorting", "non-comparison", "linear-time", "stable"]
---

## 🎯 What is Counting Sort?

Imagine tallying exam scores from `0` to `100` — **instead of comparing papers against each other, you count how many students got each score and read the totals in order**.
Counting Sort breaks the `O(n log n)` comparison barrier by counting value frequencies and placing each item directly into its exact output slot.

## 🧠 Core Idea

> Count frequencies → Compute prefix-sum end offsets → Place items backwards for stability

## 🐍 Python Code

```python
def counting_sort(arr: list[int]) -> list[int]:
    if not arr:
        return arr

    # Tally how many times each value appears
    counts = [0] * (max(arr) + 1)
    for num in arr:
        counts[num] += 1

    # Convert counts to cumulative ending indices
    for val in range(1, len(counts)):
        counts[val] += counts[val - 1]

    # Walk backwards so equal values keep their original order
    output = [0] * len(arr)
    for num in reversed(arr):
        counts[num] -= 1
        output[counts[num]] = num
    return output
```

## ⏱️ Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| **Best** | `O(n + k)` | `O(n + k)` | Scans `n` elements and `k` value buckets regardless of input order |
| **Average** | `O(n + k)` | `O(n + k)` | Linear passes over input (`n`) and bucket range (`k = max(arr)`) |
| **Worst** | `O(n + k)` | `O(n + k)` | Never compares pairs; runtime depends only on array size `n` and range `k` |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Non-negative integers within a small, bounded range (`k ≤ 10⁶`, e.g. ages, grades, bytes) | Huge value ranges (`max(arr) = 10⁹`, wastes massive memory on empty buckets) |
| Large datasets with many duplicate values (`n` big, `k` small) | Floating-point numbers, strings, or arbitrary objects without integer keys |
| As the stable digit-by-digit subroutine inside **Radix Sort** | Strict `O(1)` in-place memory environments |

