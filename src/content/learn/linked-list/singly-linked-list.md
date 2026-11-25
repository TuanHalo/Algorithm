---
title: "Singly Linked List"
topic: "linked-list"
order: 1
difficulty: "beginner"
timeComplexity: "O(1) head / O(n) search"
spaceComplexity: "O(n)"
tags: ["linked-list", "pointers", "nodes", "fundamentals"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`val` is at the head) | `O(1)` | `O(1)` | Line 11 returns `head.next` without walking |
| Average | `O(n)` | `O(1)` | `curr` hops about half the list before the match; the bypass is one assignment |
| Worst (`val` at the tail or missing) | `O(n)` | `O(1)` | `curr` walks every arrow to the end; only `curr` is extra memory |

## When to use

| Great for | Avoid for |
|---|---|
| Removing or inserting next to a node you already hold, by changing one `next` arrow (no shifting) | Random index lookups like `nums[i]` or Binary Search: reaching node `i` takes `i` hops |
| Prepending in `O(1)` (`head = ListNode(val, head)`): stacks, adjacency lists, hash-table buckets | Appending often without a `tail` reference: each append walks the whole list |
| Splicing whole sub-chains in or out with a single arrow (merge two sorted lists) | Walking backward or deleting a node given only itself (use a Doubly Linked List) |
