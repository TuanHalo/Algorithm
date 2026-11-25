---
title: "Min-Max Stack (O(1) Auxiliary Tracking)"
topic: "stack-queue"
order: 5
difficulty: "intermediate"
timeComplexity: "O(1) all operations"
spaceComplexity: "O(n)"
tags: ["stack-queue", "stack", "min-stack", "max-stack", "auxiliary-tracking"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`pop`, `get_min`, `get_max`) | `O(1)` | `O(1)` | Each reads or removes the top entry only |
| Average (`push`) | `O(1)` amortized | `O(1)` | Two comparisons with the top’s cached min and max, then one append |
| Worst (the whole stack) | `O(1)` per call | `O(n)` | Three numbers per value instead of one: the price of never scanning |

## When to use

| Great for | Avoid for |
|---|---|
| Min Stack / Max Stack problems, and live “lowest / highest so far” readings that can be undone | Arbitrary deletions from the middle (use a heap or a balanced BST) |
| A min-max **queue** built from two min-max stacks: sliding-window minimum in `O(1)` amortized | Very large stacks where tripling the memory matters (store only a min stack, or encode `2x − min`) |
| Undo / redo stacks that must report their bounds instantly | Values whose lifetimes aren’t last-in, first-out |
