---
title: "Fixed-Size Sliding Window"
topic: "arrays-two-pointers"
order: 5
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1) to O(k)"
tags: ["sliding-window", "fixed-size", "subarrays", "moving-average", "anagrams"]
---

## Intuition & Analogy

Imagine looking out the side window of a moving train. Your window frame is exactly 3 telephone poles wide. As the train chugs forward past a new pole on the right, the pole on your far left leaves your view.
To compute the total count of birds sitting on the 3 visible poles, you do not need to recount all three birds from scratch every second: you simply subtract the bird count of the pole that just slipped behind the frame, and add the bird count of the newly visible pole ahead!

## Core Concept

The **Fixed-Size Sliding Window** pattern solves optimization and counting problems over all contiguous subarrays of an exact predetermined length $k$.

1. **Initial Window State**:
   Compute the property (sum, character frequency, hash) for the first $k$ elements ($0$ through $k - 1$).
2. **Slide Phase**:
   For each index $i$ from $k$ to $n - 1$:
   - **Add** the incoming element `arr[i]` on the right.
   - **Remove** the outgoing element `arr[i - k]` on the left.
   - **Record** the updated window metric in $O(1)$ time.

This avoids the naive $O(n \times k)$ brute-force recomputation and achieves optimal $O(n)$ linear runtime.

## Step-by-Step Walkthrough

### Example: Max Sum Subarray of Size $k = 3$ on `[2, 1, 5, 1, 3, 2]`

1. **Build Initial Window ($i = 0, 1, 2$)**:
   - Elements: `[2, 1, 5]`
   - `window_sum = 2 + 1 + 5 = 8`
   - `max_sum = 8`

2. **Slide to $i = 3$ (Entering: `arr[3] = 1`, Leaving: `arr[0] = 2`)**:
   - `window_sum = 8 - 2 + 1 = 7`
   - `max_sum = max(8, 7) = 8`

3. **Slide to $i = 4$ (Entering: `arr[4] = 3`, Leaving: `arr[1] = 1`)**:
   - `window_sum = 7 - 1 + 3 = 9`
   - `max_sum = max(8, 9) = 9`

4. **Slide to $i = 5$ (Entering: `arr[5] = 2`, Leaving: `arr[2] = 5`)**:
   - `window_sum = 9 - 5 + 2 = 6`
   - `max_sum = max(9, 6) = 9`

Result: `9` (corresponding to subarray `[5, 1, 3]`), computed in exactly 6 operations.

## Python Code

```python
def max_sub_array_of_size_k(k: int, nums: list[int]) -> int:
    """Finds the maximum sum of any contiguous subarray of exact size k."""
    if len(nums) < k or k <= 0:
        return 0

    # 1. Compute initial window of size k
    window_sum = sum(nums[:k])
    max_sum = window_sum

    # 2. Slide the window across the remainder of the array
    for i in range(k, len(nums)):
        incoming = nums[i]
        outgoing = nums[i - k]
        window_sum += incoming - outgoing
        if window_sum > max_sum:
            max_sum = window_sum

    return max_sum


def find_anagrams(s: str, p: str) -> list[int]:
    """Finds all start indices of p's anagrams in s using a fixed window of size len(p)."""
    if len(s) < len(p):
        return []

    p_count = [0] * 26
    s_count = [0] * 26
    k = len(p)
    result: list[int] = []

    for char in p:
        p_count[ord(char) - ord("a")] += 1
    for i in range(k):
        s_count[ord(s[i]) - ord("a")] += 1

    if s_count == p_count:
        result.append(0)

    for i in range(k, len(s)):
        s_count[ord(s[i]) - ord("a")] += 1  # Add right
        s_count[ord(s[i - k]) - ord("a")] -= 1  # Drop left
        if s_count == p_count:
            result.append(i - k + 1)

    return result
```

## Complexity Table

| Approach | Time Complexity | Space Complexity | Notes |
|---|---|---|---|
| Naive Brute Force | $O(n \times k)$ | $O(1)$ | Re-sums $k$ elements at every starting index |
| Fixed Sliding Window (Sum) | $O(n)$ | $O(1)$ | 1 add and 1 subtract per element |
| Fixed Sliding Window (Frequency Count) | $O(n \times \Sigma)$ | $O(\Sigma)$ | $\Sigma$ is alphabet size (e.g. 26 lowercase English letters) |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Constraints explicitly mandate a fixed window length $k$ (e.g., $k$-day moving averages, length-$k$ substrings) | Variable-length criteria (e.g., "find the shortest subarray with sum $\ge S$" — use dynamic window) |
| State changes at boundaries can be inverted in $O(1)$ (e.g., addition/subtraction, increment/decrement) | State functions that cannot be easily undone when dropping elements (e.g., maintaining max/min without a monotonic queue) |
