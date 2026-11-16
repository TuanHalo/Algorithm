---
title: "Floyd's Cycle Detection"
topic: "linked-list"
order: 5
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/linked-list/cycle-detection.html"
diagram: "/diagrams/linked-list/cycle-detection-flow.html"
tags: ["linked-list", "cycle-detection", "floyd", "two-pointers"]
---

## What is Floyd's cycle detection?

Imagine a tortoise and a hare running around a circular track. Because the hare moves one extra step ahead of the tortoise every turn, it is guaranteed to lap and collide with the tortoise inside the loop.
Floyd's Cycle Detection moves two pointers at speeds 1 and 2 to check if a linked list loops and find where the cycle starts, all in `O(1)` space.

## Core idea

In Phase 1, advance `slow` (+1) and `fast` (+2) until they collide (cycle) or hit `None` (no cycle). In Phase 2, reset `finder = head` and step both +1 until they meet at the cycle entry.

## Python code

```python
class ListNode:
    def __init__(self, val: int, next: "ListNode | None" = None) -> None:
        self.val = val
        self.next = next


def detect_cycle(head: ListNode | None) -> ListNode | None:
    slow = fast = head

    while fast is not None and fast.next is not None:
        assert slow is not None
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            # Distance from head to entry equals distance from meeting point to entry
            finder = head
            while finder != slow:
                assert finder is not None and slow is not None
                finder = finder.next
                slow = slow.next
            return finder

    return None
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (acyclic, short or empty) | `O(1)` to `O(n)` | `O(1)` | `fast` reaches `None` in at most `n / 2` steps if no cycle exists |
| Average (cycle present) | `O(n)` | `O(1)` | Phase 1 collides within one loop lap; Phase 2 walks at most the prefix length |
| Worst | `O(n)` | `O(1)` | Avoids the `O(n)` memory cost of storing every visited node in a `set` |

## When to use

| Great for | Avoid for |
|---|---|
| Detecting cycles and finding the cycle start in `O(1)` extra memory | General graphs with multiple outgoing edges per node (use DFS/BFS with a `visited` set) |
| Sequence loop problems like Happy Number or Find the Duplicate Number | Small lists when you have memory to spare and a `visited: set[ListNode]` is simpler |
| Guarding against infinite loops before walking untrusted pointer chains | Breaking cycles in place if you also need the tail node (track `prev` in Phase 2) |
