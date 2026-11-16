---
title: "Level-Order Traversal (BFS)"
topic: "tree"
order: 3
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(w)"
visualizer: "/visualizers/tree/level-order-traversal.html"
diagram: "/diagrams/tree/level-order-traversal-flow.html"
tags: ["tree", "bfs", "queue", "level-order"]
---

## What is level-order traversal?

Picture reading a family tree photo album page by page: grandparents on page 1, all parents on page 2, and all grandchildren on page 3.

Level-order traversal explores a tree breadth-first, visiting every node at depth `d` before touching any node at depth `d + 1`.

## Core idea

Push `root` into a FIFO `deque`, freeze `len(queue)` at the start of each outer loop so you pop only the current level, and append non-null children for the next level.

## Python code

```python
from collections import deque


def level_order(root: TreeNode | None) -> list[list[int]]:
    if root is None:
        return []
    levels: list[list[int]] = []
    queue = deque([root])

    while queue:
        level: list[int] = []
        # Snapshot level size before appending next-level children
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        levels.append(level)
    return levels
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (shallow or narrow tree) | `O(n)` | `O(1)` to `O(w)` | Every node enters and leaves the queue once; narrow trees keep `w` small |
| Average / Worst (full bottom row) | `O(n)` | `O(n)` | The widest level `w` of a complete binary tree holds up to `n / 2` nodes |

## When to use

| Great for | Avoid for |
|---|---|
| Finding minimum depth, right-side views, or zigzag level scans | Deep narrow trees when a recursive DFS uses `O(h)` stack or when postorder subtree results are needed |
| Serializing a tree in compact level-order array format | Sorted traversal of a BST (use Inorder DFS instead) |
