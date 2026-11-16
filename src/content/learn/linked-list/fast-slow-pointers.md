---
title: "Fast & Slow Pointers"
topic: "linked-list"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/linked-list/fast-slow-pointers.html"
diagram: "/diagrams/linked-list/fast-slow-pointers-flow.html"
tags: ["linked-list", "two-pointers", "fast-slow", "middle"]
---

## What are fast & slow pointers?

Imagine two runners on a straight track where one runs at twice the speed of the other. The instant the faster runner crosses the finish line, the slower runner is standing right at the halfway mark.
Fast & Slow Pointers advance `slow` by 1 node and `fast` by 2 nodes per step, which finds the middle of a linked list in one `O(n)` pass without counting nodes first.

## Core idea

Move `slow = slow.next` and `fast = fast.next.next` while `fast` and `fast.next` exist; when `fast` stops, `slow` is at the middle node.

## Python code

```python
class ListNode:
    def __init__(self, val: int, next: "ListNode | None" = None) -> None:
        self.val = val
        self.next = next


def find_middle(head: ListNode | None) -> ListNode | None:
    slow = head
    fast = head

    # Guard both fast and fast.next so fast.next.next never crashes on None
    while fast is not None and fast.next is not None:
        assert slow is not None
        slow = slow.next
        fast = fast.next.next

    # On even lengths, slow lands on the second middle node
    return slow
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (0 or 1 node) | `O(1)` | `O(1)` | `fast.next` is `None`, so the loop finishes immediately |
| Average | `O(n)` | `O(1)` | `fast` covers `n` nodes in `n / 2` steps using only two pointers |
| Worst | `O(n)` | `O(1)` | Single linear scan with zero auxiliary array or length counter |

## When to use

| Great for | Avoid for |
|---|---|
| Finding the middle node in one pass (Merge Sort on linked lists, Palindrome check) | Arrays where `arr[len(arr) // 2]` already gives the middle in `O(1)` |
| Splitting a list in half to check symmetry or run Merge Sort | Finding an arbitrary `k`-th node from the end (use a fixed `k`-step gap instead) |
| Building intuition for Floyd's Cycle Detection (`slow` vs `fast` relative speed) | Lists that might contain a cycle, unless you also check `slow == fast` |
