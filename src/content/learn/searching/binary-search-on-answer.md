---
title: "Binary Search on Answer (Parametric Search)"
topic: "searching"
order: 8
difficulty: "advanced"
timeComplexity: "O(log(range) · f(n))"
spaceComplexity: "O(1)"
tags: ["searching", "binary-search", "parametric-search", "optimization", "monotonicity"]
---

## What is Binary Search on Answer?

Imagine testing the maximum safe payload weight for a drone delivery route.
Instead of loading bags randomly, you notice an unmistakable rule:
- If the drone **can** safely carry $25$ kg, it can certainly carry any weight less than $25$ kg (`True`).
- If the drone **fails** to carry $40$ kg, it will definitely fail for any weight greater than $40$ kg (`False`).

Because the feasibility is **monotonic** (it transitions from `True` to `False` exactly once across the number line), you don't have to test every single kilogram!
You can binary-search directly on the **answer space** $[1, 100]$ kg, halving the range on each test.

This technique is known as **Binary Search on Answer** (or **Parametric Search**): converting an optimization problem ("find the minimum/maximum valid value") into a series of decision problems ("is value $x$ feasible?").

## Core Concept

Traditional binary search searches over indices of a sorted array.
Binary search on answer searches over a continuous or discrete **numerical range of possible answers** $[low, high]$.

Key principles:
1. **Monotonicity Requirement**: The decision function `is_valid(mid)` must be monotonic:
   - For minimization: `[False, False, ..., False, True, True, ..., True]` $\to$ find first `True`.
   - For maximization: `[True, True, ..., True, False, False, ..., False]` $\to$ find last `True`.
2. **Bounds Identification**:
   - $low$: The absolute smallest possible answer (often 1 or $\min(arr)$).
   - $high$: The absolute largest possible answer (often $\sum arr$ or $\max(arr)$).
3. **Checking Function**: Evaluating `is_valid(mid)` must be efficient, typically running in $O(n)$ greedy or scan time.
4. **Overall Complexity**: If the answer range has size $R$ and checking takes $O(f(n))$, total time is $O(\log(R) \cdot f(n))$.

## Walkthrough

**Problem**: *Capacity to Ship Packages Within $D$ Days*
Given package weights `weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` and `days = 5`, what is the minimum ship capacity needed?

```
Search Space:
  low  = max(weights) = 10 (must hold at least the heaviest single item)
  high = sum(weights) = 55 (shipping everything in 1 day)

Iteration 1:
  mid = (10 + 55) // 2 = 32
  Days needed with capacity 32:
    Day 1: [1,2,3,4,5,6,7] = 28
    Day 2: [8,9,10] = 27
    Total = 2 days <= 5 days -> Feasible! Try smaller: high = 32

Iteration 2:
  mid = (10 + 32) // 2 = 21
  Days needed with capacity 21:
    Day 1: [1,2,3,4,5,6] = 21
    Day 2: [7,8] = 15
    Day 3: [9,10] = 19
    Total = 3 days <= 5 days -> Feasible! Try smaller: high = 21

Iteration 3:
  mid = (10 + 21) // 2 = 15
  Days needed with capacity 15:
    Day 1: [1,2,3,4,5] = 15
    Day 2: [6,7] = 13
    Day 3: [8] = 8
    Day 4: [9] = 9
    Day 5: [10] = 10
    Total = 5 days <= 5 days -> Feasible! Try smaller: high = 15

Iteration 4:
  mid = (10 + 15) // 2 = 12
  Days needed with capacity 12: takes 6 days > 5 days -> Infeasible! low = 13

Iteration 5:
  mid = (13 + 15) // 2 = 14
  Days needed with capacity 14: takes 5 days <= 5 days -> Feasible! high = 14

Iteration 6:
  mid = (13 + 14) // 2 = 13
  Days needed with capacity 13: takes 6 days > 5 days -> Infeasible! low = 14

low meets high at 15.
Minimum capacity required = 15.
```

## Python Code

```python
def can_ship(weights: list[int], days: int, capacity: int) -> bool:
    """Predicate: Returns True if all weights can be shipped within 'days' at 'capacity'."""
    days_needed = 1
    current_load = 0

    for w in weights:
        if current_load + w > capacity:
            days_needed += 1
            current_load = w
            if days_needed > days:
                return False
        else:
            current_load += w

    return True


def ship_within_days(weights: list[int], days: int) -> int:
    """Finds the minimum ship capacity to deliver all packages within days."""
    # Minimum possible answer is the heaviest single package
    low = max(weights)
    # Maximum possible answer is shipping all packages on a single day
    high = sum(weights)
    ans = high

    while low <= high:
        mid = (low + high) // 2
        if can_ship(weights, days, mid):
            ans = mid        # mid is feasible, record and try smaller
            high = mid - 1
        else:
            low = mid + 1    # mid is too small, need more capacity

    return ans
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Range $\text{sum} - \max$ | `O(n · log(Σw - max(w)))` | `O(1)` | Binary search performs $O(\log(\text{range}))$ iterations, each scanning $n$ elements |
| Generalized | `O(f(n) · log(R))` | `O(1)` | $R$ is candidate answer space $[low, high]$; $f(n)$ is validation predicate cost |

## When to Use

| Great for | Avoid for |
|---|---|
| "Minimize the maximum" or "Maximize the minimum" problem statements | Problems where the validation function is non-monotonic |
| Allocating resources, budget thresholds, or dividing contiguous segments | Direct closed-form algebraic solutions (e.g. constant-time formulas) |
| Hard optimization problems where checking an answer is much easier than finding it directly (e.g., Koko Eating Bananas, Split Array Largest Sum, Aggressive Cows) | Small discrete datasets where a simple hash table or prefix sum already answers in $O(1)$ |
