---
title: "Linear Search"
topic: "searching"
order: 1
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/searching/linear-search.html"
diagram: "/diagrams/searching/linear-search-flow.html"
tags: ["searching", "sequential", "unsorted", "in-place"]
---

## 🎯 What is Linear Search?

Imagine looking for your favorite mug in a messy drawer — **you check items one by one from left to right until you spot it**.
Linear Search works on any list (sorted or unsorted) by scanning each element in order until it finds the target or reaches the end.

## 🧠 Core Idea

> Start at index 0 → Check each element against target → Return index on match, or -1 at the end

## 🐍 Python Code

```python
def linear_search(arr: list[int], target: int) -> int:
    for index, value in enumerate(arr):
        if value == target:
            return index  # Match found; no need to check the rest
    return -1  # Reached the end without finding target
```

## ⏱️ Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| **Best** (first item) | `O(1)` | `O(1)` | Target sits at index `0`, so we stop after 1 comparison |
| **Average** | `O(n)` | `O(1)` | On average we inspect about half the list (`n / 2` items) |
| **Worst** (last or missing) | `O(n)` | `O(1)` | Must scan every element before confirming or returning `-1` |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Unsorted lists where sorting first isn't worth the `O(n log n)` cost | Large, frequently queried sorted datasets (use Binary Search instead) |
| Small arrays or one-off lookups (`n` is tiny) | Real-time lookups across millions of records (use a hash map or index) |
| Linked lists or streams without random index access | Repeated queries on static data where preprocessing pays off |

