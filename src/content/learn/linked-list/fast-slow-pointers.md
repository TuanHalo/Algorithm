---
title: "Fast & Slow Pointers"
topic: "linked-list"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["linked-list", "two-pointers", "fast-slow", "middle"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (0 or 1 node) | `O(1)` | `O(1)` | The guard fails at once; the loop never runs |
| Average | `O(n)` | `O(1)` | About `n / 2` turns, each a step and a jump |
| Worst | `O(n)` | `O(1)` | One pass and no count first |

## When to use

| Great for | Avoid for |
|---|---|
| Finding the middle node in one pass: Merge Sort on a linked list, Palindrome Linked List (split, then reverse the second half) | Arrays, where `nums[len(nums) // 2]` is already `O(1)` |
| Any "stop when the faster one runs out" split, such as the first and second half of a list | The `k`-th node from the end (keep a fixed gap of `k` nodes instead of two speeds) |
| Building intuition for Floyd’s Cycle Detection, which uses the same two speeds | Lists that may contain a cycle, unless you also check `slow == fast` (see Floyd’s Cycle Detection) |
