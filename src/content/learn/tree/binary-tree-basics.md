---
title: "Binary Tree Basics"
topic: "tree"
order: 1
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(h)"
visualizer: "/visualizers/tree/binary-tree-basics.html"
diagram: "/diagrams/tree/binary-tree-basics-flow.html"
tags: ["tree", "binary-tree", "recursion", "fundamentals"]
---

## What is a binary tree?

Think of a folder structure or a tournament bracket where one root splits into at most two choices below it, and those choices branch further until you hit dead ends.

A binary tree is a linked hierarchy of nodes where each `TreeNode` holds a value plus at most two child pointers, `left` and `right`.

## Core idea

Start from the single `root` at depth `0`, treat every non-null child as a smaller tree of the same shape, and stop whenever a pointer hits `None`.

## Python code

```python
class TreeNode:
    def __init__(
        self,
        val: int,
        left: "TreeNode | None" = None,
        right: "TreeNode | None" = None,
    ) -> None:
        self.val = val
        self.left = left
        self.right = right


def count_leaves(node: TreeNode | None) -> int:
    if node is None:
        return 0
    # A leaf has no outgoing branches left to explore
    if node.left is None and node.right is None:
        return 1
    return count_leaves(node.left) + count_leaves(node.right)
```

## Complexity

| Operation / Shape | Time | Space | Why? |
|---|---|---|---|
| Inspect `node.left` / `node.right` | `O(1)` | `O(1)` | Direct object reference |
| Full tree walk (balanced) | `O(n)` | `O(log n)` | Visits every node once; call stack reaches height `log₂(n)` |
| Full tree walk (skewed chain) | `O(n)` | `O(n)` | Every node sits in one long line, so stack depth equals `n` |

## When to use

| Great for | Avoid for |
|---|---|
| Modeling parent-child hierarchies, expression trees, and decision splits | Flat sequential data where a Python `list` gives `O(1)` random indexing |
| Divide-and-conquer problems where subproblems mirror left and right subtrees | Arbitrary networks with cycles or multiple parents per node (use a Graph instead) |
