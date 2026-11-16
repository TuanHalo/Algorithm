---
title: "Lowest Common Ancestor (LCA)"
topic: "tree"
order: 7
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(h)"
visualizer: "/visualizers/tree/lowest-common-ancestor.html"
diagram: "/diagrams/tree/lowest-common-ancestor-flow.html"
tags: ["tree", "lca", "dfs", "bst"]
---

## What is the Lowest Common Ancestor?

On a family tree, your Lowest Common Ancestor with a cousin is your shared grandparent, not an older great-grandparent higher up.

The LCA of two nodes `p` and `q` is the deepest node in the tree that has both `p` and `q` as descendants (where a node can be a descendant of itself).

## Core idea

In any binary tree, return `root` immediately when it matches `p` or `q`, and pick the node where both left and right recursive calls return non-null; in a BST, walk down until `p` and `q` split across `curr.val`.

## Python code

```python
def lca_binary_tree(
    root: TreeNode | None,
    p: int,
    q: int,
) -> TreeNode | None:
    if root is None or root.val in (p, q):
        return root
    left = lca_binary_tree(root.left, p, q)
    right = lca_binary_tree(root.right, p, q)
    # Non-null on both sides proves p and q split at this node
    if left and right:
        return root
    return left or right


def lca_bst(root: TreeNode | None, p: int, q: int) -> TreeNode | None:
    curr = root
    while curr is not None:
        if p < curr.val and q < curr.val:
            curr = curr.left
        elif p > curr.val and q > curr.val:
            curr = curr.right
        else:
            return curr
    return None
```

## Complexity

| Variant | Time | Space | Why? |
|---|---|---|---|
| General Binary Tree | `O(n)` | `O(h)` | May inspect every node once; stack depth reaches tree height `h` |
| Binary Search Tree | `O(h)` | `O(1)` | Steps down a single path from root to split point with zero recursion |

## When to use

| Great for | Avoid for |
|---|---|
| Computing distances between pairs of nodes in a tree (`depth(p) + depth(q) - 2 * depth(lca)`) | Thousands of static LCA queries on huge trees (precompute Binary Lifting in `O(log n)` per query) |
| Finding shared package/class ancestors or DOM container elements | Cases where `p` or `q` might not exist in the tree (verify both exist first) |
