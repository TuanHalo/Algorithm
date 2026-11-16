---
title: "Jump Game"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/jump-game/"
difficulty: "medium"
topics: ["greedy", "array", "dynamic-programming"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
diagram: "/diagrams/greedy/jump-game-flow.html"
approaches:
  - name: "Greedy Farthest Reach"
    timeComplexity: "O(n)"
    spaceComplexity: "O(1)"
    isOptimal: true
    summary: "Maintain the maximum reachable index while iterating through the array."
    tags:
      - label: "Greedy"
        topic: "greedy"
        slug: "fractional-knapsack"
  - name: "Dynamic Programming"
    timeComplexity: "O(n²)"
    spaceComplexity: "O(n)"
    isOptimal: false
    summary: "Check reachability from each index backwards."
    tags:
      - label: "DP"
        topic: "dynamic-programming"
---

## Problem

You are given an integer array `nums`. You are initially positioned at the array's **first index**, and each element in the array represents your maximum jump length at that position.

Return `true` *if you can reach the last index, or* `false` *otherwise*.

### Example 1
```
Input: nums = [2,3,1,1,4]
Output: true
Explanation: Jump 1 step from index 0 to 1, then 3 steps to the last index.
```

### Example 2
```
Input: nums = [3,2,1,0,4]
Output: false
Explanation: You will always arrive at index 3 no matter what. Its maximum jump length is 0, which makes it impossible to reach the last index.
```

## My approach

1. **Greedy invariant**:
   - Rather than checking every individual jumping path, track a single invariant: `farthest`, the furthest index reachable from any previously visited index.
2. **Linear traversal**:
   - For each index `idx` and jump capacity `jump`:
     - If `idx > farthest`, we have encountered an index that is unreachable from any earlier valid jump, so we must return `False`.
     - Update `farthest = max(farthest, idx + jump)`.
     - If `farthest >= len(nums) - 1`, we can already reach or surpass the final index, so return `True` immediately.
3. **Completion**:
   - If the loop finishes without hitting a dead end, return `True`.

## My solution

```python
def can_jump(nums: list[int]) -> bool:
    farthest = 0
    goal = len(nums) - 1

    for idx, jump in enumerate(nums):
        if idx > farthest:
            return False  # Current stone is beyond any earlier reach
        farthest = max(farthest, idx + jump)
        if farthest >= goal:
            return True

    return True
```

## AI feedback

### Strengths
- Runs in optimal $O(n)$ time with $O(1)$ auxiliary space.
- Early exit (`if farthest >= goal: return True`) avoids scanning unnecessary elements.
- The reachability condition `idx > farthest` elegantly handles zero-jump traps without backtracking.

### Improvements
- An alternative backwards greedy view sets `target = len(nums) - 1` and iterates from right to left: if `i + nums[i] >= target`, update `target = i`. At the end, check `target == 0`.

### Edge cases
- `len(nums) == 1`: Already at the destination, returns `True` immediately.
- Array with zeros: If a zero cannot be jumped over, `farthest` stalls at that zero index and returns `False`.
- Large jump values: When `nums[0] >= len(nums) - 1`, completes in the first iteration.

### Alternative approaches
- **Bottom-Up Dynamic Programming**: Maintain `dp[i]` indicating whether index `i` can reach the end by checking all `j <= i + nums[i]`. Takes $O(n^2)$ time and $O(n)$ space.
- **Breadth-First Search (BFS)**: Treat indices as levels of reachability. Equivalent to the greedy approach but requires queue allocations.
