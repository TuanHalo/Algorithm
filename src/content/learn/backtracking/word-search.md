---
title: "Word Search (Grid Backtracking)"
topic: "backtracking"
order: 6
difficulty: "intermediate"
timeComplexity: "O(R · C · 3^L)"
spaceComplexity: "O(L)"
visualizer: "/visualizers/backtracking/word-search.html"
diagram: "/diagrams/backtracking/word-search-flow.html"
tags: ["backtracking", "grid", "dfs", "matrix"]
---

## What is grid word search?

In a word-search puzzle where paths can bend up, down, left, or right, you trace letters one tile at a time with your finger, making sure never to step on the same tile twice. If a turn runs into a wrong letter, you lift your finger back one step and try a different direction.

Word Search checks whether a target string exists as a contiguous horizontal or vertical path on a 2D letter board without reusing any cell.

## Core idea

Start a DFS at every cell matching `word[0]`, temporarily overwrite `board[r][c]` with `"#"` so the walk cannot loop back onto itself, try all 4 neighbors, and restore the original letter before returning.

## Python code

```python
def exist(board: list[list[str]], word: str) -> bool:
    rows, cols = len(board), len(board[0])

    def dfs(r: int, c: int, idx: int) -> bool:
        if idx == len(word):
            return True
        if r < 0 or r >= rows or c < 0 or c >= cols or board[r][c] != word[idx]:
            return False
        # Mask in place instead of allocating a visited set per path
        saved, board[r][c] = board[r][c], "#"
        found = (
            dfs(r + 1, c, idx + 1)
            or dfs(r - 1, c, idx + 1)
            or dfs(r, c + 1, idx + 1)
            or dfs(r, c - 1, idx + 1)
        )
        board[r][c] = saved
        return found

    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (first letter absent) | `O(R · C)` | `O(1)` | Every starting cell fails on `board[r][c] != word[0]` immediately |
| Worst | `O(R · C · 3^L)` | `O(L)` | After the first move, each of the remaining `L - 1` steps avoids the parent cell and branches at most 3 ways |

## When to use

| Great for | Avoid for |
|---|---|
| Finding a single word on a small 2D grid without extra visited memory | Matching hundreds of words at once on the same board (build a Trie first) |
| Grid puzzles where a cell can be visited again on a different branch | Shortest path between two cells (use BFS instead) |
