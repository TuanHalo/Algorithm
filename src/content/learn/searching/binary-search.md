---
title: "Binary Search"
topic: "searching"
order: 2
difficulty: "beginner"
timeComplexity: "O(log n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/searching/binary-search.html"
diagram: "/diagrams/searching/binary-search-flow.html"
tags: ["searching", "divide-and-conquer", "sorted", "iterative"]
---

## What is binary search?

Imagine looking up a word in a thick paper dictionary. You open to the middle, check whether your word comes before or after, and discard half the book.
Binary Search repeats that halving step on any sorted list, narrowing 1,000,000 items down to 1 in 20 steps.

## Core idea

Check the middle element, discard the half that cannot hold the target, and repeat until the target is found or the window is empty.

## Python code

```python
def binary_search(arr: list[int], target: int) -> int:
    low = 0
    high = len(arr) - 1

    while low <= high:
        # Avoid integer overflow in fixed-width languages
        mid = low + (high - low) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            low = mid + 1   # Target can only live in the right half
        else:
            high = mid - 1  # Target can only live in the left half

    return -1  # Search window collapsed without a match
```

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (middle item) | `O(1)` | `O(1)` | First midpoint check hits the target immediately |
| Average | `O(log n)` | `O(1)` | Each comparison cuts the remaining search window in half |
| Worst (missing or edge) | `O(log n)` | `O(1)` | Halving continues at most `⌊log₂ n⌋ + 1` steps until `low > high` |

## When to use

| Great for | Avoid for |
|---|---|
| Large, static sorted arrays with fast random index access (`arr[mid]`) and repeated lookups | Unsorted lists where a one-off `O(n)` scan is faster than `O(n log n)` sorting |
| Monotonic search spaces ("first valid value" or numeric root finding) | Linked lists (no `O(1)` middle indexing makes jumping slow) |
| | Tiny arrays (`n < 16`) where Linear Search has lower constant overhead |
