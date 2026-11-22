---
title: "Jump Search"
topic: "searching"
order: 4
difficulty: "intermediate"
timeComplexity: "O(√n)"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["searching", "block-jump", "sorted", "iterative"]
---

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
