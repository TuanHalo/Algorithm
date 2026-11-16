---
title: "Reverse Linked List"
topic: "linked-list"
order: 3
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/linked-list/reverse-linked-list.html"
diagram: "/diagrams/linked-list/reverse-linked-list-flow.html"
tags: ["linked-list", "in-place", "three-pointers", "reversal"]
---

## What is reversing a linked list?

Imagine a line of dominoes all pointing right, and you walk down the line turning each domino around to point left instead.
Reversing a Linked List flips every node's `next` pointer backward in a single `O(n)` pass using only three pointer variables and zero extra list allocations.

## Core idea

Save `next_node = curr.next` before breaking the chain, point `curr.next = prev`, then slide `prev` and `curr` one step forward.

## Python code

```python
class ListNode:
    def __init__(self, val: int, next: "ListNode | None" = None) -> None:
        self.val = val
        self.next = next


def reverse_list(head: ListNode | None) -> ListNode | None:
    prev: ListNode | None = None
    curr = head

    while curr is not None:
        # Save the rest of the list before overwriting curr.next
        next_node = curr.next
        curr.next = prev
        prev = curr
        curr = next_node

    # When curr hits None, prev sits on the original tail (new head)
    return prev
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (empty or 1 node) | `O(1)` | `O(1)` | Loop executes 0 or 1 iteration with constant pointer swaps |
| Average | `O(n)` | `O(1)` | Visits each of the `n` nodes once and rewires its `next` link in place |
| Worst | `O(n)` | `O(1)` | Iterative pointer dance uses only `prev`, `curr`, and `next_node` (unlike `O(n)` call stack in recursion) |

## When to use

| Great for | Avoid for |
|---|---|
| Flipping a list in place with `O(1)` extra memory | Code where another reference still expects the original forward order |
| Subroutines in Palindrome Linked List or `k`-group reversal | Doubly linked lists, where reading `prev` already reverses the order |
| Long chains where recursive reversal would risk a stack overflow | Contiguous Python `list`s (slice with `[::-1]` or call `.reverse()`) |
