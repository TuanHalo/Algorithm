---
title: "DFS Traversals (Preorder, Inorder, Postorder)"
topic: "tree"
order: 2
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(h)"
visualizer: "/visualizers/tree/dfs-traversals.html"
diagram: "/diagrams/tree/dfs-traversals-flow.html"
tags: ["tree", "dfs", "preorder", "inorder", "postorder"]
---

## What are DFS tree traversals?

Imagine walking through an old house with left and right rooms off every hallway. You can jot down each room's name right when you step in (**Preorder**), between checking the left and right wings (**Inorder**), or right before walking back out (**Postorder**).

All three depth-first traversals visit the exact same nodes in the exact same recursive path; they only differ in when `node.val` gets added to the result.

## Core idea

Recurse left then right from `root`, placing `order.append(node.val)` before both calls (Preorder), between them (Inorder), or after both calls (Postorder).

## Python code

```python
def traverse_dfs(
    node: TreeNode | None,
    mode: str,
    order: list[int],
) -> None:
    if node is None:
        return
    if mode == "preorder":
        order.append(node.val)  # Record parent before descending
    traverse_dfs(node.left, mode, order)
    if mode == "inorder":
        order.append(node.val)  # Yields sorted output on a BST
    traverse_dfs(node.right, mode, order)
    if mode == "postorder":
        order.append(node.val)  # Children finish before parent runs
```

## Complexity

| Traversal Mode | Time | Space (Balanced / Skewed) | Why? |
|---|---|---|---|
| Preorder (`N-L-R`) | `O(n)` | `O(log n)` / `O(n)` | Visits each node once; stack depth tracks tree height `h` |
| Inorder (`L-N-R`) | `O(n)` | `O(log n)` / `O(n)` | Same recursion tree, shifting only where `order.append` runs |
| Postorder (`L-R-N`) | `O(n)` | `O(log n)` / `O(n)` | Finishes left and right subtrees before returning to parent |

## When to use

| Great for | Avoid for |
|---|---|
| **Preorder**: cloning, serializing, or building a tree from root down | Finding the shallowest node or level-by-level grouping (use BFS) |
| **Inorder**: reading keys from a Binary Search Tree in sorted order | Very deep skewed trees (`1,000+` levels) with recursion unless converted to an explicit stack |
| **Postorder**: computing subtree heights, diameters, or freeing child nodes first | Stopping early by distance from root, since DFS dives down one branch first |
