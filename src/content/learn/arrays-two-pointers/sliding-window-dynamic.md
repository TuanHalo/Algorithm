---
title: "Dynamic-Size Sliding Window"
topic: "arrays-two-pointers"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(min(n, Σ))"
tags: ["sliding-window", "dynamic-size", "two-pointers", "substrings", "amortized"]
---

## Intuition & Analogy

Imagine stretching a rubber band across a numbered ruler.
You pull the right edge forward to gather more numbers until your collected set meets a requirement (for example: "contains at least one copy of letters A, B, and C").
Once valid, you want to know how compact that band can become. You gently slide the left edge inward, releasing numbers one by one until the band is as short as possible while still holding the requirement. If releasing an element breaks the rule, you stop shrinking and stretch the right edge forward again.

The rubber band stretches and contracts smoothly across the ruler without ever having to jump backwards.

## Core Concept

The **Dynamic Sliding Window** is used when the subarray length is not known in advance, but depends on a monotonic condition.

### Template
1. Initialize `left = 0`, state variables, and `ans`.
2. Iterate `right` from `0` to `n - 1`:
   - Incorporate `arr[right]` into current window state.
   - While window condition triggers shrinkage (either valid condition for minimum window or invalid condition for maximum window):
     - Update answer if relevant.
     - Remove `arr[left]` from window state.
     - Advance `left += 1`.
   - Update answer if relevant.

### Why is it $O(n)$? (Amortized Analysis)
Although there is an inner `while` loop inside the `for` loop, the `left` pointer only ever increments forward. Across the entire execution:
- `right` advances $n$ times.
- `left` advances at most $n$ times.
Total operations across both pointers are bounded by $2n$, yielding an amortized **$O(n)$ linear runtime**.

## Step-by-Step Walkthrough

### Example: Longest Substring Without Repeating Characters on `"abcabcbb"`

1. `right = 0` (`'a'`): seen `{a: 0}`. Window `"a"`, length 1.
2. `right = 1` (`'b'`): seen `{a: 0, b: 1}`. Window `"ab"`, length 2.
3. `right = 2` (`'c'`): seen `{a: 0, b: 1, c: 2}`. Window `"abc"`, length 3.
4. `right = 3` (`'a'`): `'a'` already in window!
   - Jump `left` past previous `'a'` $\implies left = 1$.
   - Window becomes `"bca"`, length 3.
5. `right = 4` (`'b'`): `'b'` in window!
   - Jump `left` past previous `'b'` $\implies left = 2$.
   - Window `"cab"`, length 3.
6. `right = 5` (`'c'`): `'c'` in window $\implies left = 3$. Window `"abc"`, length 3.
7. `right = 6` (`'b'`): duplicate `'b'` $\implies left = 5$. Window `"cb"`, length 2.
8. `right = 7` (`'b'`): duplicate `'b'` $\implies left = 7$. Window `"b"`, length 1.

Max length recorded: **3**.

## Python Code

```python
def length_of_longest_substring(s: str) -> int:
    """Finds length of longest substring without repeating characters using dynamic window."""
    last_seen: dict[str, int] = {}
    left = 0
    max_len = 0

    for right, char in enumerate(s):
        if char in last_seen and last_seen[char] >= left:
            # Duplicate inside current window: shrink left past the last instance
            left = last_seen[char] + 1

        last_seen[char] = right
        max_len = max(max_len, right - left + 1)

    return max_len


def min_sub_array_len(target: int, nums: list[int]) -> int:
    """Finds minimal length of contiguous subarray with sum >= target."""
    left = 0
    current_sum = 0
    min_len = float("inf")

    for right in range(len(nums)):
        current_sum += nums[right]

        # While window meets requirement, shrink from left to find local minimum
        while current_sum >= target:
            min_len = min(min_len, right - left + 1)
            current_sum -= nums[left]
            left += 1

    return int(min_len) if min_len != float("inf") else 0
```

## Complexity Table

| Approach | Time Complexity | Space Complexity | Why? |
|---|---|---|---|
| Naive Check All Subarrays | $O(n^3)$ or $O(n^2)$ | $O(1)$ | Generates all $n(n+1)/2$ pairs |
| Dynamic Window (Characters) | $O(n)$ | $O(\Sigma)$ | Each pointer advances at most $n$ times; hash map bounded by alphabet size |
| Dynamic Window (Numbers) | $O(n)$ | $O(1)$ | No extra storage when tracking running sums |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Finding shortest/longest contiguous range satisfying a monotonic condition | Subsequences that allow skipping elements (use Dynamic Programming or Greedy) |
| Non-negative numbers where expanding `right` monotonically increases sum | Arrays with negative numbers where expanding can decrease the sum (use Prefix Sum + Hash Map) |
| String problems involving character frequencies, unique counts, or patterns | Tree or graph structures where paths are non-linear |
