---
title: "Generate Parentheses"
topic: "backtracking"
order: 5
difficulty: "intermediate"
timeComplexity: "O(4^n / √n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/backtracking/generate-parentheses.html"
diagram: "/diagrams/backtracking/generate-parentheses-flow.html"
tags: ["backtracking", "catalan", "strings", "constraints"]
---

## What is parenthesis generation?

When writing nested blocks of code, you can only close a brace that is already open, and you can only open `n` pairs in total. Tracking those two rules as you type keeps you from ever producing a broken prefix like `())`.

Generate Parentheses builds every valid, well-formed string of `n` pairs of parentheses by enforcing balance rules at every character.

## Core idea

Track `open_cnt` and `close_cnt` on the current string buffer: append `"("` whenever `open_cnt < n`, and append `")"` only when `close_cnt < open_cnt`.

## Python code

```python
def generate_parenthesis(n: int) -> list[str]:
    result: list[str] = []
    path: list[str] = []

    def backtrack(open_cnt: int, close_cnt: int) -> None:
        if len(path) == 2 * n:
            result.append("".join(path))
            return
        if open_cnt < n:
            path.append("(")
            backtrack(open_cnt + 1, close_cnt)
            path.pop()
        if close_cnt < open_cnt:
            path.append(")")
            backtrack(open_cnt, close_cnt + 1)
            path.pop()

    backtrack(0, 0)
    return result
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(4^n / √n)` | `O(n)` | Output size is the `n`-th Catalan number `C(2n, n) / (n + 1)` and recursion depth is `2n` |

## When to use

| Great for | Avoid for |
|---|---|
| Generating all valid bracketed expressions of small size (`n <= 12`) | Checking if a single given string is valid (use a stack or counter in `O(n)`) |
| Replacing brute-force `2^(2n)` generation + validation with constrained search | Counting how many valid strings exist (compute the Catalan number directly) |
