---
title: "Optimal Merge Patterns"
topic: "greedy"
order: 5
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
tags: ["greedy", "merge", "heap", "priority-queue", "huffman"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (one file) | `O(n)` | `O(n)` | Building the heap is linear and no merge happens |
| Average | `O(n log n)` | `O(n)` | `n - 1` merges, each with two pops and one push at `O(log n)` |
| Worst (sizes that keep merging) | `O(n log n)` | `O(n)` | The heap holds at most `n` sizes; the merge tree has `2n - 1` nodes |

## When to use

| Great for | Avoid for |
|---|---|
| Merging sorted arrays, files on disk or tape, or linked lists two at a time with a cost equal to their combined size | Merging everything in one `k`-way pass, where no file is copied twice |
| "Connect Ropes with Minimum Cost" style interview problems | Merge costs that are not additive (such as `a * b`): use dynamic programming |
| Building prefix-code trees: this is the Huffman Coding algorithm with file sizes as frequencies | Files read in parallel from independent disks |
