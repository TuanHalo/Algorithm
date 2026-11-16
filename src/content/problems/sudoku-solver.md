---
title: "Sudoku Solver"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/sudoku-solver/"
difficulty: "hard"
topics: ["backtracking", "matrix", "hash-table"]
dateCompleted: "2026-11-16"
timeComplexity: "O(9^m)"
spaceComplexity: "O(m)"
diagram: "/diagrams/backtracking/sudoku-solver-flow.html"
approaches:
  - name: "Backtracking with Pre-indexed Constraints"
    timeComplexity: "O(9^m)"
    spaceComplexity: "O(m)"
    isOptimal: true
    summary: "Precompute row, column, and 3x3 box used digits, then recursively fill empty cells with early pruning."
    tags:
      - label: "Backtracking"
        topic: "backtracking"
        slug: "sudoku-solver"
---

## Problem

Write a program to solve a Sudoku puzzle by filling the empty cells.

A sudoku solution must satisfy all of the following rules:
1. Each of the digits `1-9` must occur exactly once in each row.
2. Each of the digits `1-9` must occur exactly once in each column.
3. Each of the digits `1-9` must occur exactly once in each of the 9 `3x3` sub-boxes of the grid.

The `'.'` character indicates empty cells. You may assume that the given puzzle has a unique solution.

## My approach

1. **Pre-index existing numbers**:
   - Instead of scanning rows, columns, and 3x3 boxes on every recursion step, pre-populate 9 row sets, 9 column sets, and 9 box sets.
   - The sub-box index for cell `(r, c)` is computed as `(r // 3) * 3 + (c // 3)`.
2. **Collect empty cells**:
   - Collect coordinates of all `'.'` cells into an `empties` list of length $m$.
3. **Backtracking**:
   - Recurse through `empties` sequentially by index `idx`.
   - For cell `(r, c)`, test candidates `'1'` through `'9'`.
   - If candidate `ch` is not in `rows[r]`, `cols[c]`, or `boxes[box]`:
     - Place `ch` on `board[r][c]`.
     - Add `ch` to the three sets.
     - Recurse to `idx + 1`. If it returns `True`, propagate success upward immediately.
     - Otherwise, backtrack: restore `board[r][c] = '.'` and remove `ch` from all three sets.
4. **Termination**:
   - When `idx == len(empties)`, all cells are filled legally, so return `True`.

## My solution

```python
def solve_sudoku(board: list[list[str]]) -> None:
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    empties: list[tuple[int, int]] = []

    # Initialize sets and empty cells list
    for r in range(9):
        for c in range(9):
            ch = board[r][c]
            if ch == ".":
                empties.append((r, c))
            else:
                rows[r].add(ch)
                cols[c].add(ch)
                boxes[(r // 3) * 3 + c // 3].add(ch)

    def backtrack(idx: int) -> bool:
        if idx == len(empties):
            return True

        r, c = empties[idx]
        box = (r // 3) * 3 + c // 3

        for ch in "123456789":
            if ch in rows[r] or ch in cols[c] or ch in boxes[box]:
                continue

            board[r][c] = ch
            rows[r].add(ch)
            cols[c].add(ch)
            boxes[box].add(ch)

            if backtrack(idx + 1):
                return True

            board[r][c] = "."
            rows[r].remove(ch)
            cols[c].remove(ch)
            boxes[box].remove(ch)

        return False

    backtrack(0)
```

## AI feedback

### Strengths
- Pre-indexing constraints into row, column, and box hash sets converts candidate validation to $O(1)$.
- Collecting empty cell coordinates in advance avoids re-scanning the 9x9 grid repeatedly inside the recursion.
- Boolean return type enables immediate early-exit once the first valid solution is found.

### Improvements
- **Minimum Remaining Values (MRV) Heuristic**: Instead of filling empty cells in arbitrary order, sort or dynamically pick the empty cell with the fewest legal digit candidates first. This drastically reduces the branching factor early in the tree.
- **Bitmask representation**: Replacing hash sets with integer bitmasks (`int` with 9 bits) accelerates constraint checking and state updates to bitwise OR/AND/XOR operations.

### Edge cases
- Already filled board: `empties` is empty, terminates immediately in $O(1)$.
- Heavily constrained boards: MRV or constraint propagation (Dancing Links / Algorithm X) solves complex grids in milliseconds.

### Alternative approaches
- **Dancing Links (Donald Knuth's Algorithm X)**: Formulates Sudoku as an exact cover problem with 324 constraints and solves it with a circular doubly-linked 2D matrix.
