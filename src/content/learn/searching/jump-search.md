---
title: "Jump Search"
topic: "searching"
order: 4
difficulty: "intermediate"
timeComplexity: "O(√n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/searching/jump-search.html"
diagram: "/diagrams/searching/jump-search-flow.html"
tags: ["searching", "block-jump", "sorted", "iterative"]
---

## What is jump search?

Imagine finding page 142 in a thick book. You flip ahead 20 pages at a time until you pass 142, then step back one chunk and scan page by page.
Jump Search skips through a sorted array in fixed blocks of size `√n` to locate the only block that could hold the target, then runs a Linear Search inside it.

## Core idea

Jump forward by `√n` while the block end is `< target`, stop at the first block that overshoots, and scan linearly from `prev`.

## Python code

```python
import math


def jump_search(arr: list[int], target: int) -> int:
    n = len(arr)
    if n == 0:
        return -1

    block = math.isqrt(n)  # Optimal step size balances jumps and linear scan
    prev, step = 0, block

    while arr[min(step, n) - 1] < target:
        prev = step
        step += block
        if prev >= n:
            return -1  # Target is larger than the largest element

    for idx in range(prev, min(step, n)):
        if arr[idx] == target:
            return idx
        if arr[idx] > target:
            break  # Sorted order guarantees target cannot appear later
    return -1
```

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (first block) | `O(1)` | `O(1)` | Target sits at index `0` or the very first jump probe |
| Average | `O(√n)` | `O(1)` | Jumps `~n / (2√n)` blocks, then scans `~√n / 2` items |
| Worst (last block / miss) | `O(√n)` | `O(1)` | Makes at most `√n` jumps plus `√n` linear checks (`2√n` total) |

## When to use

| Great for | Avoid for |
|---|---|
| Sorted data where jumping backward is costly (only jumps forward once per block, then scans forward) | Unsorted lists (skipping blocks could jump right past the target) |
| Large read-only sorted buffers where sequential prefetching within a block is cheap | Standard in-memory arrays where Binary Search (`O(log n)`) is strictly faster |
| | Frequently modified collections with insertions and deletions |

