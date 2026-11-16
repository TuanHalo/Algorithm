---
title: "N-Queens"
topic: "backtracking"
order: 7
difficulty: "advanced"
timeComplexity: "O(n!)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/backtracking/n-queens.html"
diagram: "/diagrams/backtracking/n-queens-flow.html"
tags: ["backtracking", "n-queens", "chessboard", "constraints"]
---

## What is the N-Queens problem?

Try placing `n` queens on an `n x n` chessboard so no two share a row, column, or diagonal. Putting one queen on each row cuts the search down from all `n^2` squares to picking one safe column per row.

N-Queens finds every valid board arrangement (or counts them) by placing one queen per row and backing out whenever a column or diagonal is already covered.

## Core idea

Track occupied columns with `cols`, main diagonals with `r - c`, and anti-diagonals with `r + c` in hash sets, so safety checks run in `O(1)` before placing a queen at `(r, c)`.

## Python code

```python
def solve_n_queens(n: int) -> list[list[int]]:
    solutions: list[list[int]] = []
    cols, diag1, diag2 = set(), set(), set()
    queens = [-1] * n

    def backtrack(r: int) -> None:
        if r == n:
            solutions.append(queens.copy())
            return
        for c in range(n):
            if c in cols or (r - c) in diag1 or (r + c) in diag2:
                continue
            cols.add(c)
            diag1.add(r - c)
            diag2.add(r + c)
            queens[r] = c
            backtrack(r + 1)
            # Undo sets together so sibling columns see a clean board
            cols.remove(c)
            diag1.remove(r - c)
            diag2.remove(r + c)
            queens[r] = -1

    backtrack(0)
    return solutions
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(n!)` | `O(n)` | Row `0` has `n` choices, row `1` at most `n - 1`, and diagonals prune further; `cols`, `diag1`, `diag2`, and `queens` hold at most `n` entries |

## When to use

| Great for | Avoid for |
|---|---|
| Small constraint boards (`n <= 15`) needing exact placements | Huge boards (`n > 20`), where backtracking explores too many states |
| Problems with constant-time geometric invariants like `r - c` and `r + c` | Finding just one valid placement for large `n` (iterative repair / min-conflicts works faster) |
