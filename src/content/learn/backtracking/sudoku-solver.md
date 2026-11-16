---
title: "Sudoku Solver"
topic: "backtracking"
order: 8
difficulty: "advanced"
timeComplexity: "O(9^m)"
spaceComplexity: "O(m)"
visualizer: "/visualizers/backtracking/sudoku-solver.html"
diagram: "/diagrams/backtracking/sudoku-solver-flow.html"
tags: ["backtracking", "sudoku", "constraint-satisfaction", "grid"]
---

## What is a Sudoku solver?

When solving a Sudoku by pencil, you write a digit in an empty square only if that digit is missing from its row, column, and 3x3 box. If a later square ends up with no legal digits left, you erase your earlier pencil mark and try the next candidate.

Sudoku Solver fills every `"."` cell on a 9x9 board by testing digits `"1"` through `"9"` against row, column, and box sets and undoing choices at dead ends.

## Core idea

Pre-index existing digits into 9 row sets, 9 column sets, and 9 box sets (`(r // 3) * 3 + c // 3`), collect all empty cells, and recurse through them while reverting `"."` and set entries whenever a branch returns `False`.

## Python code

```python
def solve_sudoku(board: list[list[str]]) -> bool:
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    empties: list[tuple[int, int]] = []
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
            rows[r].add(ch); cols[c].add(ch); boxes[box].add(ch)
            if backtrack(idx + 1):
                return True
            board[r][c] = "."
            rows[r].remove(ch); cols[c].remove(ch); boxes[box].remove(ch)
        return False

    return backtrack(0)
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (heavily constrained) | `O(m)` | `O(m)` | Most empty cells have only one legal digit, so recursion moves straight to `len(empties)` |
| Worst | `O(9^m)` | `O(m)` | Up to `m` empty cells (`m <= 81`) each try at most 9 digits; recursion depth and `empties` list are `O(m)` |

## When to use

| Great for | Avoid for |
|---|---|
| Standard 9x9 Sudoku and fixed-rule grid puzzles | Large `n x n` generalized boards without heuristic ordering (pick the cell with fewest candidates first) |
| Teaching constraint propagation with `O(1)` hash-set undo | Puzzles that ask for all solutions unless you keep searching past the first `True` |
