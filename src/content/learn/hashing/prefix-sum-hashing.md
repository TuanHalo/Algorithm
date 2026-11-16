---
title: "Prefix Sum + Hash Map"
topic: "hashing"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/hashing/prefix-sum-hashing.html"
diagram: "/diagrams/hashing/prefix-sum-hashing-flow.html"
tags: ["hashing", "prefix-sum", "subarray", "pattern"]
---

## What is prefix sum + hash map?

Suppose you track your savings balance after every deposit or withdrawal (`0, 3, 5, 8, 6, 11`). To count how many stretches added `$3` (`target = 3`), at `$8` you just check how many times `$8 - $3 = $5` showed up earlier, and at `$6` you check `$6 - $3 = $3`.

Combining a running total (`prefix_sum`) with a hash map turns an `O(n²)` search over every slice into one `O(n)` pass, and still works when numbers are negative.

## Core idea

Count how many times each `prefix_sum` has appeared starting from `{0: 1}`, then at each number add `seen[prefix_sum - target]` to the answer.

## Python code

```python
def subarray_sum(nums: list[int], target: int) -> int:
    seen: dict[int, int] = {0: 1}  # Empty prefix handles subarrays starting at index 0
    prefix_sum = 0
    count = 0

    for num in nums:
        prefix_sum += num
        need = prefix_sum - target
        if need in seen:
            count += seen[need]
        seen[prefix_sum] = seen.get(prefix_sum, 0) + 1

    return count
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst time | `O(n)` | `O(n)` | Reads each number once with `O(1)` average hash map lookups |
| Brute-force loops | `O(n²)` | `O(1)` | Re-checks every `(start, end)` pair instead of saving running totals |

## When to use

| Great for | Avoid for |
|---|---|
| Counting slices that add up to `target` when negative numbers are allowed | Arrays with only positive numbers, where a two-pointer window uses `O(1)` extra space |
| Remainder checks (`prefix % k`) or balancing equal `0`s and `1`s | Listing all matching index pairs when almost every pair matches (`O(n²)`) |
| Turning a range sum `nums[i..j]` into `prefix[j] - prefix[i - 1]` | Endless data streams where old running totals cannot be cleared |
