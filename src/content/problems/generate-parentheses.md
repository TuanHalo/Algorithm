---
title: "Generate Parentheses"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/generate-parentheses/"
difficulty: "medium"
topics: ["backtracking", "string"]
dateCompleted: "2026-11-16"
timeComplexity: "O(4^n / √n)"
spaceComplexity: "O(n)"
diagram: "/diagrams/backtracking/generate-parentheses-flow.html"
approaches:
  - name: "Backtracking with Valid Counts"
    timeComplexity: "O(4^n / √n)"
    spaceComplexity: "O(n)"
    isOptimal: true
    summary: "Track open and close parenthesis counts to ensure only valid prefixes are constructed."
    tags:
      - label: "Backtracking"
        topic: "backtracking"
        slug: "permutations"
  - name: "Brute Force Generation"
    timeComplexity: "O(2^(2n) * n)"
    spaceComplexity: "O(n)"
    isOptimal: false
    summary: "Generate all 2^(2n) sequences of parentheses and check validity using a balance counter."
    tags:
      - label: "Stack"
        topic: "stack-queue"
        slug: "valid-parentheses"
---

## Problem

Given `n` pairs of parentheses, write a function to *generate all combinations of well-formed parentheses*.

### Example 1
```
Input: n = 3
Output: ["((()))","(()())","(())()","()(())","()()()"]
```

### Example 2
```
Input: n = 1
Output: ["()"]
```

## My approach

A string of parentheses is valid if and only if at any prefix, the count of closing parentheses never exceeds the count of opening parentheses, and the total counts of both equal `n` at the end.

Instead of generating all $2^{2n}$ sequences of length $2n$ and filtering them, we build valid strings character by character using backtracking:
1. **Add `(`**: We can add an opening bracket `(` whenever `open_cnt < n`.
2. **Add `)`**: We can add a closing bracket `)` only when `close_cnt < open_cnt`, ensuring balance is never violated.
3. **Base case**: When `len(path) == 2 * n`, all $n$ pairs have been placed and the string is well-formed.

## My solution

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

## AI feedback

### Strengths
- Enforces validity constraints at each branch, never generating an invalid prefix or dead-end string.
- Time complexity is bounded strictly by the $n$-th Catalan number $\frac{1}{n+1}\binom{2n}{n} \approx \frac{4^n}{n\sqrt{\pi n}}$, which matches the size of the output.
- Reusing a mutable character list (`path`) avoids intermediate string allocations during recursion.

### Improvements
- Instead of tracking `len(path)`, we can check `if open_cnt == n and close_cnt == n`.
- For very large $n$ (though $n \le 8$ in LeetCode), dynamic programming or closure number generation can generate combinations non-recursively.

### Edge cases
- `n = 1`: Base case produces `["()"]`.
- `n = 0`: Produces `[""]`.

### Alternative approaches
- **Brute Force**: Recursively generate all $2^{2n}$ combinations of `(` and `)`, then validate each in $O(n)$ time using a balance counter.
- **Divide and Conquer (Closure Form)**: Every valid string of length $2n$ can be uniquely decomposed as `(` + $A$ + `)` + $B$, where $A$ and $B$ are valid parenthesis strings.
