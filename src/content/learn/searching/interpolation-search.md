---
title: "Interpolation Search"
topic: "searching"
order: 5
difficulty: "intermediate"
timeComplexity: "O(log log n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/searching/interpolation-search.html"
diagram: "/diagrams/searching/interpolation-search-flow.html"
tags: ["searching", "probing", "uniform-data", "sorted"]
---

## 🎯 What is Interpolation Search?

Imagine looking up **"Zebra"** in a thick dictionary — **you don't open right to the middle; you jump straight near the back pages**.
Interpolation Search upgrades Binary Search on **uniformly distributed sorted** numbers by guessing where the target sits proportionally between `arr[low]` and `arr[high]`.

## 🧠 Core Idea

> Estimate `pos` using value ratio → Probe `arr[pos]` → Narrow `low` or `high` until found or out of range

## 🐍 Python Code

```python
def interpolation_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1

    while low <= high and arr[low] <= target <= arr[high]:
        if arr[low] == arr[high]:
            # Avoid zero-division when all remaining values are equal
            return low if arr[low] == target else -1

        span = arr[high] - arr[low]
        pos = low + ((target - arr[low]) * (high - low)) // span

        if arr[pos] == target:
            return pos
        if arr[pos] < target:
            low = pos + 1
        else:
            high = pos - 1

    return -1
```

## ⏱️ Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| **Best** (accurate first probe) | `O(1)` | `O(1)` | Uniform values let the first linear estimate land right on the target |
| **Average** (uniform data) | `O(log log n)` | `O(1)` | Each probe shrinks the window size from `n` to roughly `√n` |
| **Worst** (exponentially skewed) | `O(n)` | `O(1)` | Outliers skew the estimate, shrinking the window by only 1 item per step |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Large, sorted arrays with evenly spaced numeric values (timestamps, IDs, sensor logs) | Skewed or clustered distributions (exponential growth degrades to `O(n)`) |
| Datasets where disk or memory probes are expensive and uniform spacing holds | Non-numeric data without an easy distance/interpolation metric |
| Beating Binary Search's ~20 probes on millions of uniform keys | Small arrays (`n < 64`) where Binary Search has simpler arithmetic |

