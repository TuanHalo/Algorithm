---
title: "Converging Two Pointers (Opposite Direction)"
topic: "arrays-two-pointers"
order: 3
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["two-pointers", "sorted-arrays", "in-place", "two-sum", "binary-elimination"]
---

## Intuition & Analogy

Imagine two friends standing at opposite ends of a long hallway lined with numbered doors sorted in ascending order. They are hunting for two room numbers that sum exactly to 100.
The person at the left door (e.g., room 10) yells to the person at the far right door (e.g., room 95). Their sum is 105—too large!
Because all doors are sorted, pairing room 95 with any door to the right of room 10 would produce an even greater sum. Thus, room 95 cannot possibly pair with *anyone* to hit 100. The right person steps inward to room 90. By systematically stepping inwards, they find the match without checking all $n^2$ combinations.

## Core Concept

The **Converging Two Pointers** technique starts two pointers at the boundary of a sequence:
`left = 0` and `right = len(arr) - 1`.

At each step, we evaluate a condition comparing `arr[left]` and `arr[right]`:
- If the current value is **too small**, advancing `left += 1` strictly increases the value (in a sorted array).
- If the current value is **too large**, retreating `right -= 1` strictly decreases the value.
- If the condition is met, we return or collect the result.

### The Invariant of Elimination
The technique succeeds because sorted arrays exhibit **monotonicity**. Each pointer movement provably eliminates an entire row or column of the $O(n^2)$ search matrix without checking them, reducing time from $O(n^2)$ to $O(n)$.

## Step-by-Step Walkthrough

### Example: Target Sum on Sorted Array `[2, 7, 11, 15]`, Target = 18

1. **Initialize**: `left = 0` (`val = 2`), `right = 3` (`val = 15`).
   - Current sum: $2 + 15 = 17$.
   - $17 < 18$ (too small). Since array is sorted, pairing 2 with anything smaller than 15 will only yield $\le 17$. Therefore, `arr[0] = 2` can never form 18.
   - Advance: `left = 1`.

2. **Iteration 2**: `left = 1` (`val = 7`), `right = 3` (`val = 15`).
   - Current sum: $7 + 15 = 22$.
   - $22 > 18$ (too large). Pairing 15 with anything $\ge 7$ will be $\ge 22$. Therefore, 15 cannot pair with any remaining candidate.
   - Retreat: `right = 2`.

3. **Iteration 3**: `left = 1` (`val = 7`), `right = 2` (`val = 11`).
   - Current sum: $7 + 11 = 18$.
   - Match found! Return indices `(1, 2)`.

Total steps: 3 checks instead of $4 \times 3 / 2 = 6$ pairs. On an array of 100,000 items, this is 100,000 operations instead of 10,000,000,000!

## Python Code

```python
def two_sum_sorted(numbers: list[int], target: int) -> tuple[int, int] | None:
    """Finds two 0-based indices whose elements sum to target in an ascending array.

    Returns (left, right) or None if no pair exists.
    """
    left = 0
    right = len(numbers) - 1

    while left < right:
        current_sum = numbers[left] + numbers[right]
        if current_sum == target:
            return left, right
        elif current_sum < target:
            left += 1  # Need a larger sum
        else:
            right -= 1  # Need a smaller sum

    return None


def max_water_container(heights: list[int]) -> int:
    """Calculates max area between two vertical lines (Container With Most Water)."""
    left = 0
    right = len(heights) - 1
    max_area = 0

    while left < right:
        width = right - left
        height = min(heights[left], heights[right])
        max_area = max(max_area, width * height)

        # Move the shorter wall inward, since moving the taller wall
        # can only decrease or preserve height with a strictly smaller width.
        if heights[left] < heights[right]:
            left += 1
        else:
            right -= 1

    return max_area
```

## Complexity Table

| Algorithm | Time Complexity | Space Complexity | Why? |
|---|---|---|---|
| Converging Two Sum | $O(n)$ | $O(1)$ | Each step increments `left` or decrements `right` until they meet |
| Container With Most Water | $O(n)$ | $O(1)$ | Eliminates one wall per iteration in $O(1)$ time |
| 3Sum (Sort + 2-pointer) | $O(n^2)$ | $O(1)$ auxiliary | Fixes one element $O(n)$, then runs converging 2-pointer $O(n)$ |
| Valid Palindrome | $O(n)$ | $O(1)$ | Compares outward characters moving toward center |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| The array or list is already sorted (or can be sorted without breaking required index order) | Unsorted arrays where preserving original order is mandatory (use a Hash Map) |
| Optimization problems with monotonic properties (e.g. Container With Most Water) | Finding non-contiguous combinations of $> 3$ variables (combinatorial backtracking or meet-in-the-middle) |
| In-place array reversals or palindrome validations | Streams of incoming data where entire collection cannot be indexed from both ends |
