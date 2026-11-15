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

## What is interpolation search?

Imagine looking up "Zebra" in a thick dictionary: you flip straight toward the back pages.
On uniformly distributed sorted numbers, Interpolation Search improves on Binary Search by estimating where the target sits proportionally between `arr[low]` and `arr[high]`.

## Core idea

Estimate `pos` using the value ratio, probe `arr[pos]`, and narrow `low` or `high` until the target is found or out of range.

## Python code

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

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (accurate first probe) | `O(1)` | `O(1)` | Uniform values let the first linear estimate land right on the target |
| Average (uniform data) | `O(log log n)` | `O(1)` | Each probe shrinks the window size from `n` to roughly `√n` |
| Worst (exponentially skewed) | `O(n)` | `O(1)` | Outliers skew the estimate, shrinking the window by only 1 item per step |

## When to use

| Great for | Avoid for |
|---|---|
| Large, sorted arrays with evenly spaced numeric values (timestamps, IDs, sensor logs), cutting ~20 binary-search probes on millions of keys down to a few | Skewed or clustered distributions (exponential growth degrades to `O(n)`) |
| Datasets where disk or memory probes are expensive and uniform spacing holds | Non-numeric data without an easy distance/interpolation metric |
| | Small arrays (`n < 64`) where Binary Search has simpler arithmetic |

