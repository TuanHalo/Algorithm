---
title: "Bucket Sort"
topic: "sorting"
order: 9
difficulty: "intermediate"
timeComplexity: "O(n + k)"
spaceComplexity: "O(n + k)"
tags: ["sorting", "distribution", "non-comparison", "buckets"]
---

## What is Bucket Sort?

Imagine sorting student test scores into physical letter-grade trays: all 90s go into the `A` tray, 80s into `B`, 70s into `C`, and so on.
Once every paper is placed in its tray, each small pile takes mere seconds to sort by hand.
Stacking the sorted piles back together yields the entire class sorted from top to bottom.

This is **Bucket Sort**: a distribution-based sorting algorithm that partitions elements into a number of evenly spaced "buckets", sorts each bucket individually, and then concatenates the results.

## Core Concept

Bucket Sort works by assuming that input values are uniformly distributed over a known interval (typically $[0, 1)$ or $[\min, \max]$).

Key principles:
1. **Scatter**: An element $x$ is mapped to bucket index $\lfloor n \cdot \frac{x - \min}{\max - \min + \epsilon} \rfloor$.
2. **Sort**: Each bucket is sorted individually, typically using **Insertion Sort** because buckets are small and insertion sort has minimal overhead and runs in $O(m)$ time on nearly sorted or tiny lists.
3. **Gather**: The sorted elements from each bucket are concatenated in order.
4. **Distribution Dependency**: When data is uniformly distributed, each bucket contains roughly $O(1)$ elements on average, giving $O(n)$ overall expected time. If data is heavily clustered, all elements end up in a single bucket, degrading to $O(n^2)$.

## Walkthrough

Consider sorting 10 floats in $[0, 1)$:
`[0.78, 0.17, 0.39, 0.26, 0.72, 0.94, 0.21, 0.12, 0.23, 0.68]`

```
Step 1: Create 10 empty buckets (indices 0 to 9)

Step 2: Scatter each element into bucket floor(10 * val):
  Bucket 1: [0.17, 0.12]
  Bucket 2: [0.26, 0.21, 0.23]
  Bucket 3: [0.39]
  Bucket 6: [0.68]
  Bucket 7: [0.78, 0.72]
  Bucket 9: [0.94]
  (Buckets 0, 4, 5, 8 remain empty)

Step 3: Sort each individual bucket:
  Bucket 1: [0.12, 0.17]
  Bucket 2: [0.21, 0.23, 0.26]
  Bucket 3: [0.39]
  Bucket 6: [0.68]
  Bucket 7: [0.72, 0.78]
  Bucket 9: [0.94]

Step 4: Concatenate all buckets:
  [0.12, 0.17, 0.21, 0.23, 0.26, 0.39, 0.68, 0.72, 0.78, 0.94] (Sorted!)
```

## Python Code

```python
def bucket_sort(arr: list[float]) -> list[float]:
    """Sorts a list of floating point numbers uniformly distributed in [0, 1)."""
    if len(arr) <= 1:
        return arr

    n = len(arr)
    # Create n empty buckets
    buckets: list[list[float]] = [[] for _ in range(n)]

    # 1. Scatter: distribute elements into buckets
    for x in arr:
        # Map [0.0, 1.0) into bucket indices [0, n - 1]
        bucket_idx = min(int(x * n), n - 1)
        buckets[bucket_idx].append(x)

    # 2. Sort each bucket using insertion sort
    for b in buckets:
        for i in range(1, len(b)):
            key = b[i]
            j = i - 1
            while j >= 0 and b[j] > key:
                b[j + 1] = b[j]
                j -= 1
            b[j + 1] = key

    # 3. Gather: concatenate all buckets back into arr
    idx = 0
    for b in buckets:
        for val in b:
            arr[idx] = val
            idx += 1

    return arr
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(n + k)` | `O(n + k)` | Elements distribute perfectly evenly; each bucket has $O(1)$ items |
| Average | `O(n + k)` | `O(n + k)` | Assuming uniform distribution, expected items per bucket is constant |
| Worst | `O(n²)` | `O(n + k)` | All elements hash to the same bucket; insertion sort takes $O(n^2)$ |

*Here $n$ is the number of elements and $k$ is the number of buckets.*

## When to Use

| Great for | Avoid for |
|---|---|
| Floating-point values uniformly distributed across a bounded interval | Heavily skewed or clustered data (e.g. power-law or zipfian distributions) |
| Sorting external files where data can be pre-partitioned into disk chunks | In-place sorting requirements (buckets require $O(n + k)$ auxiliary memory) |
| Fixed range inputs where $k \approx n$ | When comparisons are cheap and Quick Sort or Merge Sort is already $O(n \log n)$ |
