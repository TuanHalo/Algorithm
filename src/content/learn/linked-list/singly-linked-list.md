---
title: "Singly Linked List"
topic: "linked-list"
order: 1
difficulty: "beginner"
timeComplexity: "O(1) head / O(n) search"
spaceComplexity: "O(n)"
visualizer: "/visualizers/linked-list/singly-linked-list.html"
diagram: "/diagrams/linked-list/singly-linked-list-flow.html"
tags: ["linked-list", "pointers", "nodes", "fundamentals"]
---

## What is a singly linked list?

Imagine a treasure hunt where each clue holds a prize and an envelope telling you where to find the next clue.
A Singly Linked List stores items in separate nodes chained by `next` pointers, so you can insert or remove at the front in `O(1)` without shifting elements in memory.

## Core idea

Each `ListNode` holds a value and a `next` reference; follow `curr = curr.next` from `head` until you reach `None`.

## Python code

```python
class ListNode:
    def __init__(self, val: int, next: "ListNode | None" = None) -> None:
        self.val = val
        self.next = next


class SinglyLinkedList:
    def __init__(self) -> None:
        self.head: ListNode | None = None

    def prepend(self, val: int) -> None:
        # New node points to current head, then becomes head in O(1)
        self.head = ListNode(val, self.head)

    def append(self, val: int) -> None:
        if not self.head:
            self.head = ListNode(val)
            return
        curr = self.head
        while curr.next:
            curr = curr.next
        curr.next = ListNode(val)

    def delete(self, val: int) -> bool:
        if not self.head:
            return False
        if self.head.val == val:
            self.head = self.head.next
            return True
        curr = self.head
        while curr.next and curr.next.val != val:
            curr = curr.next
        if not curr.next:
            return False
        curr.next = curr.next.next  # Bypass the matched node
        return True
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| Prepend (`head` insert) | `O(1)` | `O(1)` extra | Only updates two references without touching later nodes |
| Append (`tail` without tail ptr) | `O(n)` | `O(1)` extra | Walks every `next` link from `head` to find the last node |
| Search / Delete by value | `O(n)` | `O(1)` extra | Walks nodes one by one because linked lists have no random indexing |
| Total Memory | — | `O(n)` | Allocates one `ListNode` (value + `next` pointer) per element |

## When to use

| Great for | Avoid for |
|---|---|
| Frequent insertions or removals at the front without resizing an array | Random index lookups like `arr[i]` or Binary Search (`O(n)` traversal) |
| Dynamic stacks, queues, or adjacency lists | Tight numerical loops needing CPU cache locality (use contiguous lists) |
| Splicing sub-chains by changing a single `next` link | Walking backward (use a Doubly Linked List instead) |
