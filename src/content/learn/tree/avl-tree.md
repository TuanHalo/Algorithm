---
title: "AVL Tree (Self-Balancing BST)"
topic: "tree"
order: 8
difficulty: "advanced"
timeComplexity: "O(log n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/tree/avl-tree.html"
diagram: "/diagrams/tree/avl-tree-flow.html"
tags: ["tree", "avl", "bst", "self-balancing", "rotations"]
---

## What is an AVL tree?

Think of a mobile hanging from the ceiling: if you hang too many ornaments on the left arm, it tilts wildly, so you slide the center hook one knot over to level the beam again.

An AVL tree is a self-balancing Binary Search Tree where every node's balance factor (`height(left) - height(right)`) stays in `{-1, 0, +1}`, automatically restoring balance via `O(1)` pointer rotations.

## Core idea

Insert like a normal BST, update each ancestor's height as recursion unwinds, and apply an LL, RR, LR, or RL rotation whenever `abs(balance_factor) > 1`.

## Python code

```python
def rotate_right(y: AVLNode) -> AVLNode:
    x = y.left
    y.left, x.right = x.right, y  # Promote x while keeping inorder sequence
    update_height(y)
    update_height(x)
    return x


def insert_avl(node: AVLNode | None, key: int) -> AVLNode:
    if node is None:
        return AVLNode(key)
    if key < node.val:
        node.left = insert_avl(node.left, key)
    elif key > node.val:
        node.right = insert_avl(node.right, key)
    update_height(node)
    bf = balance_factor(node)
    if bf > 1 and key < node.left.val:
        return rotate_right(node)
    if bf < -1 and key > node.right.val:
        return rotate_left(node)
    if bf > 1 and key > node.left.val:
        node.left = rotate_left(node.left)
        return rotate_right(node)
    if bf < -1 and key < node.right.val:
        node.right = rotate_right(node.right)
        return rotate_left(node)
    return node
```

## Complexity

| Operation | Average | Worst | Space | Why? |
|---|---|---|---|---|
| Search | `O(log n)` | `O(log n)` | `O(1)` | Strict `\|bf\| <= 1` caps tree height below `1.44 * log₂(n)` |
| Insert / Delete | `O(log n)` | `O(log n)` | `O(log n)` | Walks one root-to-leaf path; rotations run in `O(1)` per level |

## When to use

| Great for | Avoid for |
|---|---|
| Read-heavy ordered maps and databases where worst-case `O(log n)` lookup matters | Write-heavy workloads with constant inserts/deletes (Red-Black trees rotate less often) |
| Sorted streaming inputs that would skew a plain BST into `O(n)` chains | Unordered key lookups where a Hash Map delivers `O(1)` average time |
