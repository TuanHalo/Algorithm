---
title: "N-Queens"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/n-queens/"
difficulty: "hard"
topics: ["backtracking", "array"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n!)"
spaceComplexity: "O(n)"
diagram: "/diagrams/backtracking/n-queens-flow.html"
approaches:
  - name: "Backtracking with Diagonal Lookup Sets"
    timeComplexity: "O(n!)"
    spaceComplexity: "O(n)"
    isOptimal: true
    summary: "Place one queen per row while tracking occupied columns and diagonals (r - c, r + c) in O(1) sets."
    tags:
      - label: "Backtracking"
        topic: "backtracking"
        slug: "n-queens"
---

## Problem

The **n-queens** puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other.

Given an integer `n`, return *all distinct solutions to the **n-queens puzzle***. You may return the answer in **any order**.

Each solution contains a distinct board configuration of the n-queens' placement, where `'Q'` and `'.'` both indicate a queen and an empty space, respectively.

### Example 1
```
Input: n = 4
Output: [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]
Explanation: There exist two distinct solutions to the 4-queens puzzle as shown above.
```

### Example 2
```
Input: n = 1
Output: [["Q"]]
```

## My approach

Since every row must contain exactly one queen, we can iterate row-by-row and place a queen at column `c` on row `r`:
1. **Safety constraints**:
   - Column collision: another queen occupies column `c`.
   - Major diagonal collision: $(r - c)$ is constant for cells along top-left to bottom-right diagonals.
   - Minor diagonal collision: $(r + c)$ is constant for cells along top-right to bottom-left diagonals.
2. **$O(1)$ constraint checking**:
   - Maintain three hash sets: `cols`, `diag1` (values $r - c$), and `diag2` (values $r + c$).
   - A queen can be placed at `(r, c)` if and only if `c not in cols`, `(r - c) not in diag1`, and `(r + c) not in diag2`.
3. **Backtracking**:
   - Add the position to the three sets, record the queen's column at `queens[r] = c`, and recurse to row `r + 1`.
   - Once the subproblem finishes, remove the constraints from the sets and reset `queens[r] = -1`.
4. **Base case**:
   - When `r == n`, all $n$ queens are placed safely. Format the `queens` array into an `n x n` board of `'.'` and `'Q'` strings.

## My solution

```python
def solve_n_queens(n: int) -> list[list[str]]:
    solutions: list[list[str]] = []
    cols: set[int] = set()
    diag1: set[int] = set()  # r - c
    diag2: set[int] = set()  # r + c
    queens = [-1] * n

    def build_board() -> list[str]:
        board = []
        for c in queens:
            row = ["."] * n
            row[c] = "Q"
            board.append("".join(row))
        return board

    def backtrack(r: int) -> None:
        if r == n:
            solutions.append(build_board())
            return

        for c in range(n):
            if c in cols or (r - c) in diag1 or (r + c) in diag2:
                continue

            cols.add(c)
            diag1.add(r - c)
            diag2.add(r + c)
            queens[r] = c

            backtrack(r + 1)

            # Backtrack and restore sets
            cols.remove(c)
            diag1.remove(r - c)
            diag2.remove(r + c)
            queens[r] = -1

    backtrack(0)
    return solutions
```

## AI feedback

### Strengths
- Using mathematical properties $r - c$ and $r + c$ reduces diagonal collision validation from $O(n)$ scanning to $O(1)$ set lookup.
- Placing strictly one queen per row guarantees no horizontal collisions and caps recursion depth at $n$.
- State restoration cleanly unwinds changes to all three sets and the column assignment.

### Improvements
- **Bitmask optimization**: Replace `cols`, `diag1`, and `diag2` with three bitmask integers (`col_mask`, `d1_mask`, `d2_mask`). Bitwise operations (`~`, `&`, `>>`, `<<`) can compute available positions in single CPU cycles.
- **Symmetry exploitation**: The chessboard has vertical symmetry. Placing queens in only the first $\lceil n / 2 \rceil$ columns for the first row and mirroring solutions cuts the search tree roughly in half.

### Edge cases
- `n = 1`: Returns `[["Q"]]`.
- `n = 2` or `n = 3`: No valid configurations exist; correctly returns `[]`.

### Alternative approaches
- **Bitmask Backtracking**: Uses three bitmasks where `available = ~(cols | diag1 | diag2) & ((1 << n) - 1)` directly yields all safe positions via `pos = available & -available`.
- **Iterative Repair / Min-Conflicts**: For very large $n$ (e.g. $n = 1000$) where finding one valid solution suffices, local search heuristics solve N-Queens in nearly $O(n)$ time.
