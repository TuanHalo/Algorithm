---
title: "Word Search"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/word-search/"
difficulty: "medium"
topics: ["backtracking", "matrix", "array"]
dateCompleted: "2026-11-16"
timeComplexity: "O(R · C · 3^L)"
spaceComplexity: "O(L)"
diagram: "/diagrams/backtracking/word-search-flow.html"
approaches:
  - name: "DFS Backtracking with In-Place Masking"
    timeComplexity: "O(R · C · 3^L)"
    spaceComplexity: "O(L)"
    isOptimal: true
    summary: "Explore 4 directions from each matching cell, masking visited cells with '#' to avoid extra memory."
    tags:
      - label: "DFS"
        topic: "graph"
        slug: "dfs"
      - label: "Backtracking"
        topic: "backtracking"
---

## Problem

Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.

The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.

### Example 1
```
Input: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"
Output: true
```

### Example 2
```
Input: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"
Output: true
```

### Example 3
```
Input: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"
Output: false
```

## My approach

1. **Cell initiation**: Iterate through each cell `(r, c)` on the board. When `board[r][c] == word[0]`, initiate a DFS search.
2. **DFS exploration**:
   - At each step, if `idx == len(word)`, all letters have been matched, so return `True`.
   - Check boundary conditions and whether `board[r][c] == word[idx]`.
3. **In-place visited tracking**:
   - Rather than maintaining an auxiliary `O(R * C)` visited set, temporarily overwrite `board[r][c] = "#"` to mark it as visited on the current path.
   - Recurse into all 4 neighboring directions (up, down, left, right).
   - Restore `board[r][c] = saved` after backtracking to allow other paths to reuse this cell.

## My solution

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

## AI feedback

### Strengths
- In-place mutation `board[r][c] = "#"` saves $O(R \cdot C)$ auxiliary space and avoids hashing overhead.
- Short-circuiting with `or` halts search across sibling directions the moment any branch succeeds.
- Call stack depth is bounded by `L = len(word)`, so auxiliary space is strictly $O(L)$.

### Improvements
- **Frequency pruning**: Count letter frequencies in `board` and `word`. If `board` doesn't contain enough characters of any type present in `word`, return `False` immediately.
- **Direction optimization**: If the first letter of `word` has a higher frequency than the last letter, reverse `word` before searching to reduce the branching factor.

### Edge cases
- `len(word) > rows * cols`: Cannot fit on the board, can return `False` immediately.
- Single-letter words (`"A"`): Handled directly on first check.

### Alternative approaches
- **Trie + DFS (Word Search II)**: When matching multiple words simultaneously on the same board, a Prefix Tree (Trie) allows searching all words in a single traversal.
