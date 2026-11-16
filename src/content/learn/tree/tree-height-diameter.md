---
title: "Tree Height, Diameter & Balance"
topic: "tree"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(h)"
visualizer: "/visualizers/tree/tree-height-diameter.html"
diagram: "/diagrams/tree/tree-height-diameter-flow.html"
tags: ["tree", "dfs", "postorder", "height", "diameter"]
---

## What are tree height, diameter, and balance?

Imagine measuring a treehouse network: **height** is how many ladders tall the tree is, **diameter** is the longest rope stretched between any two platforms, and **balance** checks that no branch sags more than one level deeper than its twin.

Computing height from top to bottom at every node repeats work in `O(n²)` time, so a single bottom-up postorder pass measures all three metrics at once.

## Core idea

Let each recursive call return `1 + max(left_h, right_h)` to its parent while updating the global `diameter` with `left_h + right_h` and flagging `abs(left_h - right_h) > 1`.

## Python code

```python
def analyze_tree(root: TreeNode | None) -> tuple[int, int, bool]:
    diameter = 0
    balanced = True

    def height(node: TreeNode | None) -> int:
        nonlocal diameter, balanced
        if node is None:
            return 0
        left_h = height(node.left)
        right_h = height(node.right)
        # Longest path turning at this node joins deepest left and right paths
        diameter = max(diameter, left_h + right_h)
        if abs(left_h - right_h) > 1:
            balanced = False
        return 1 + max(left_h, right_h)

    return height(root), diameter, balanced
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Balanced tree | `O(n)` | `O(log n)` | Postorder visits each node once with call stack height `log₂(n)` |
| Skewed tree | `O(n)` | `O(n)` | Single long branch pushes recursion depth to `n` |

## When to use

| Great for | Avoid for |
|---|---|
| Computing subtree heights, longest node-to-node path, and balance checks in one `O(n)` pass | Trees where edges carry arbitrary positive/negative weights (use tree DP or two-BFS diameter) |
| Any bottom-up tree DP problem where parent state depends on child results | Top-down prefix queries like root-to-leaf path sum (preorder fits better) |
