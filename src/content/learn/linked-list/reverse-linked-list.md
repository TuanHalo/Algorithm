---
title: "Reverse Linked List"
topic: "linked-list"
order: 3
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["linked-list", "in-place", "three-pointers", "reversal"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (empty or one node) | `O(1)` | `O(1)` | The loop runs 0 or 1 times |
| Average | `O(n)` | `O(1)` | Each node is seen once and flipped once |
| Worst | `O(n)` | `O(1)` | One flip per node, and no copy of the list |

## When to use

| Great for | Avoid for |
|---|---|
| Flipping a list in place with `O(1)` extra memory | Code where another reference still expects the original forward order |
| A building block: Palindrome Linked List (reverse the second half), Reverse Nodes in k-Group, Reorder List | Doubly linked lists, where walking `prev` already gives the reverse order |
| Long chains where a recursive reversal could overflow the call stack | Python `list`s: use `nums[::-1]` or `nums.reverse()` |
