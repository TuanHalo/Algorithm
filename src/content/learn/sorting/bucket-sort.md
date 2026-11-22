---
title: "Bucket Sort"
topic: "sorting"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n + k)"
spaceComplexity: "O(n + k)"
verified: "2026-11-22"
tags: ["sorting", "distribution", "non-comparison", "buckets"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(n + k)` | `O(n + k)` | Elements distribute perfectly evenly; each bucket has $O(1)$ items |
| Average | `O(n + k)` | `O(n + k)` | Assuming uniform distribution, expected items per bucket is constant |
| Worst | `O(n²)` | `O(n + k)` | All elements hash to the same bucket; insertion sort takes $O(n^2)$ |

*Here $n$ is the number of elements and $k$ is the number of buckets.*

## When to use

| Great for | Avoid for |
|---|---|
| Floating-point values uniformly distributed across a bounded interval | Heavily skewed or clustered data (e.g. power-law or zipfian distributions) |
| Sorting external files where data can be pre-partitioned into disk chunks | In-place sorting requirements (buckets require $O(n + k)$ auxiliary memory) |
| Fixed range inputs where $k \approx n$ | When comparisons are cheap and Quick Sort or Merge Sort is already $O(n \log n)$ |
