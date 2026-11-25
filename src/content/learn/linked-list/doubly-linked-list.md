---
title: "Doubly Linked List"
topic: "linked-list"
order: 2
difficulty: "beginner"
timeComplexity: "O(1) ends / O(n) search"
spaceComplexity: "O(n)"
tags: ["linked-list", "doubly-linked", "sentinel", "pointers"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(1)` | `O(1)` | Each call sets two arrows |
| Average | `O(1)` | `O(1)` | Same two arrows at any size: the caller holds the node |
| Worst | `O(1)` | `O(1)` | Never a walk; the price is two arrows per node, `O(n)` in all |

## When to use

| Great for | Avoid for |
|---|---|
| Removing any node you hold in `O(1)`; with a hash map from key to node this is an LRU cache | Finding a value: you still walk node by node, `O(n)` |
| Deques and Back / Forward history: `push_front` is the same `_insert_between(val, head, head.next)` | Random access by index `i` (use a dynamic array) |
| Dummy `head` / `tail` nodes so the first, last and only node need no special case | Memory-tight data, or lists only ever used at the front (a singly linked list is enough) |
