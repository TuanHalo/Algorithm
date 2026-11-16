---
title: "Validate BST & Kth Smallest"
topic: "tree"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(h)"
visualizer: "/visualizers/tree/validate-bst.html"
diagram: "/diagrams/tree/validate-bst-flow.html"
tags: ["tree", "bst", "validation", "inorder", "stack"]
---

## What are BST validation and Kth smallest?

Checking only immediate neighbors can fool you: a child might beat its parent and still trespass into the wrong side of an ancestor higher up the tree.

Validating a BST requires passing valid `(low, high)` bounds down every branch, while finding the `k`th smallest key stops an inorder walk right on the `k`th pop.

## Core idea

Tighten the upper bound to `node.val` when descending left and the lower bound to `node.val` when descending right, or run iterative inorder with a stack and return the `k`th popped value.

## Python code

```python
def is_valid_bst(
    node: TreeNode | None,
    low: float = float("-inf"),
    high: float = float("inf"),
) -> bool:
    if node is None:
        return True
    # Every ancestor constrains all values inside this subtree
    if not (low < node.val < high):
        return False
    return is_valid_bst(node.left, low, node.val) and is_valid_bst(
        node.right, node.val, high
    )


def kth_smallest(root: TreeNode | None, k: int) -> int:
    stack: list[TreeNode] = []
    curr = root
    while curr or stack:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        k -= 1
        if k == 0:
            return curr.val
        curr = curr.right
    raise ValueError("k exceeds tree size")
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| `is_valid_bst` | `O(n)` | `O(h)` | Checks every node once against its inherited `(low, high)` range |
| `kth_smallest` | `O(h + k)` | `O(h)` | Dives down height `h` to the minimum, then pops `k` nodes |

## When to use

| Great for | Avoid for |
|---|---|
| Catching subtle deep-subtree BST violations that local `left < val < right` checks miss | Trees allowing duplicate keys without defining `<=` on one side consistently |
| Fetching the `k`th sorted item early without building a full sorted array | Frequent `k`th-order queries after edits (augment each node with subtree `size` for `O(h)` instead) |
