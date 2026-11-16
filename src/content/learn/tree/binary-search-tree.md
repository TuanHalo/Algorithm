---
title: "Binary Search Tree (BST)"
topic: "tree"
order: 5
difficulty: "intermediate"
timeComplexity: "O(h)"
spaceComplexity: "O(h)"
visualizer: "/visualizers/tree/binary-search-tree.html"
diagram: "/diagrams/tree/binary-search-tree-flow.html"
tags: ["tree", "bst", "search", "insert", "delete"]
---

## What is a Binary Search Tree?

Think of guessing a secret number where every node says "look left if your number is smaller, or right if it is bigger."

A Binary Search Tree (BST) keeps all keys in the left subtree strictly smaller than `node.val` and all keys in the right subtree strictly larger, letting you skip half the remaining nodes at each step.

## Core idea

Compare `key` with `node.val` to step down one branch for search and insert; when deleting a node with two children, replace its value with the smallest key in `node.right` (its inorder successor).

## Python code

```python
def search_bst(root: TreeNode | None, key: int) -> TreeNode | None:
    curr = root
    while curr is not None:
        if key == curr.val:
            return curr
        curr = curr.left if key < curr.val else curr.right
    return None


def delete_bst(root: TreeNode | None, key: int) -> TreeNode | None:
    if root is None:
        return None
    if key < root.val:
        root.left = delete_bst(root.left, key)
    elif key > root.val:
        root.right = delete_bst(root.right, key)
    else:
        if not root.left:
            return root.right
        if not root.right:
            return root.left
        # Smallest right-subtree node keeps sorted order intact
        succ = root.right
        while succ.left:
            succ = succ.left
        root.val = succ.val
        root.right = delete_bst(root.right, succ.val)
    return root
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Average (roughly balanced) | `O(log n)` | `O(log n)` / `O(1)` | Each comparison cuts remaining height down; iterative search uses `O(1)` space |
| Worst (sorted input chain) | `O(n)` | `O(n)` | Inserting sorted keys builds a one-sided chain of height `n` |

## When to use

| Great for | Avoid for |
|---|---|
| Maintaining a dynamic sorted collection with fast range queries, `min`, `max`, and predecessor/successor lookups | Unsorted or insertion-heavy sorted streams without self-balancing (use an AVL or Red-Black tree) |
| Ordered sets where you need keys in sorted order via inorder traversal | Pure exact-key lookups where order does not matter (a Hash Map gives `O(1)` average) |
