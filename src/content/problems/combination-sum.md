---
title: "Combination Sum"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/combination-sum/"
difficulty: "medium"
topics: ["backtracking", "array"]
dateCompleted: "2026-11-16"
timeComplexity: "O(N^(T/M + 1))"
spaceComplexity: "O(T / M)"
diagram: "/diagrams/backtracking/combination-sum-flow.html"
approaches:
  - name: "Backtracking with Pruning"
    timeComplexity: "O(N^(T/M + 1))"
    spaceComplexity: "O(T / M)"
    isOptimal: true
    summary: "Sort candidates and recursively build combinations, stopping early when candidate exceeds remaining sum."
    tags:
      - label: "Backtracking"
        topic: "backtracking"
        slug: "subsets"
---

## Problem

Given an array of distinct integers `candidates` and a target integer `target`, return a list of all **unique combinations** of `candidates` where the chosen numbers sum to `target`. You may return the combinations in any order.

The **same** number may be chosen from `candidates` an unlimited number of times. Two combinations are unique if the frequency of at least one of the chosen numbers is different.

### Example 1
```
Input: candidates = [2,3,6,7], target = 7
Output: [[2,2,3],[7]]
Explanation:
2 and 3 are candidates, and 2 + 2 + 3 = 7. Note that 2 can be used multiple times.
7 is a candidate, and 7 = 7.
These are the only two combinations.
```

## My approach

1. **Sort candidates**: Sorting `candidates` in ascending order allows us to prune branches immediately as soon as `candidates[i] > rem`. All subsequent candidates in the loop will also exceed `rem`.
2. **Backtracking state**:
   - `start`: index to start exploring from, ensuring we only pick numbers at or after the current index, preventing permutations of the same multiset (e.g., `[2, 3, 2]` vs `[2, 2, 3]`).
   - `rem`: remaining sum needed.
   - `path`: current sequence of chosen numbers.
3. **Allowing reuse**: In the recursive call, we pass `i` (instead of `i + 1`), allowing each candidate to be chosen unlimited times.
4. **Base cases**:
   - When `rem == 0`, a valid combination is found: record a copy of `path`.
   - When `candidates[i] > rem`, break out of the loop early.

## My solution

```python
def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    candidates.sort()
    result: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int, rem: int) -> None:
        if rem == 0:
            result.append(path.copy())
            return
        for i in range(start, len(candidates)):
            # Sorted order means all remaining candidates also exceed rem
            if candidates[i] > rem:
                break
            path.append(candidates[i])
            # Pass i (not i + 1) to allow reusing the same candidate
            backtrack(i, rem - candidates[i])
            path.pop()

    backtrack(0, target)
    return result
```

## AI feedback

### Strengths
- Sorting candidates upfront enables clean `break` pruning rather than `continue`, pruning entire subtrees.
- Reusing `path` with `append` and `pop` minimizes memory allocations compared to creating new slices at each call.
- Passing `i` to recursive calls correctly models unbounded knapsack selection while avoiding duplicate multisets.

### Improvements
- If candidates contain duplicates, pre-filtering or deduping would be needed (though LeetCode 39 specifies distinct integers).
- In Python, using `path[:]` or `list(path)` is standard and clean.

### Edge cases
- `candidates[0] > target`: Loop breaks immediately and returns `[]`.
- `target` achieved with multiple instances of the smallest candidate: Handled up to maximum recursion depth `T / M`.

### Alternative approaches
- **Dynamic Programming (Unbounded Knapsack)**: `dp[t]` stores all combinations that sum to `t`. Useful if queries for multiple targets are needed, but consumes extra memory to store intermediate combination lists.
