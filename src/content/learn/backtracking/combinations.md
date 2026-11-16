---
title: "Combinations (nCr Choose-k Template)"
topic: "backtracking"
order: 3
difficulty: "intermediate"
timeComplexity: "O(k · C(n, k))"
spaceComplexity: "O(k)"
tags: ["backtracking", "combinations", "recursion", "combinatorics"]
---

## What are Combinations?

Imagine picking a 3-person committee from a group of 5 students: Alice, Bob, Charlie, David, and Emma.
Whether you pick `{Alice, Bob, Charlie}` or `{Charlie, Alice, Bob}`, it represents the exact same committee!
Order does not matter.

In mathematics, this is the **choose function** $\binom{n}{k} = \frac{n!}{k!(n-k)!}$.
In algorithms, generating all $\binom{n}{k}$ combinations is the foundation of combinatorial search.
Instead of generating all $n!$ permutations and filtering out duplicates, backtracking with a **forward-moving start index** constructs only unique combinations directly!

## Core Concept

The core technique for combinations is enforcing a **strict ascending index order** during recursion.

Key principles:
1. **Forward Pointer (`start_idx`)**: When choosing the next element, only consider candidates from index `start_idx` to $n - 1$. This eliminates permutations like `[2, 1]` when `[1, 2]` has already been formed.
2. **Base Condition**: When the candidate path length reaches $k$ (`len(path) == k`), a valid combination is complete. Append a copy to results and return.
3. **Pruning Optimization**: If there are not enough remaining elements in the array to reach length $k$, stop looping immediately!
   The loop only needs to run up to:
   $$\text{end} = n - (k - \text{len(path)}) + 1$$

## Walkthrough

Let's generate all combinations of $k = 2$ elements from $n = 4$ numbers: `[1, 2, 3, 4]`.

```
Recursion Tree:
                Root (path=[])
           /        |        \
        pick 1    pick 2    pick 3   (pick 4 pruned: not enough left!)
        / | \      /  \        |
       2  3  4    3    4       4

Step-by-step:
1. start_idx = 1, choose 1: path = [1]
   - recurse start_idx = 2, choose 2: path = [1, 2] -> Length 2 reached! Record [1, 2]
   - backtrack (pop 2), choose 3: path = [1, 3] -> Length 2 reached! Record [1, 3]
   - backtrack (pop 3), choose 4: path = [1, 4] -> Length 2 reached! Record [1, 4]
   - backtrack (pop 1)
2. start_idx = 2, choose 2: path = [2]
   - recurse start_idx = 3, choose 3: path = [2, 3] -> Length 2 reached! Record [2, 3]
   - backtrack (pop 3), choose 4: path = [2, 4] -> Length 2 reached! Record [2, 4]
   - backtrack (pop 2)
3. start_idx = 3, choose 3: path = [3]
   - recurse start_idx = 4, choose 4: path = [3, 4] -> Length 2 reached! Record [3, 4]
   - backtrack (pop 3)

Total: 6 valid combinations generated with zero duplicates!
Formula: 4! / (2! * 2!) = 24 / 4 = 6.
```

## Python Code

```python
def combine(n: int, k: int) -> list[list[int]]:
    """Returns all possible combinations of k numbers chosen from range 1 to n."""
    results: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int) -> None:
        # Base case: valid combination found
        if len(path) == k:
            results.append(list(path))
            return

        # Pruning optimization:
        # Number of elements still needed = k - len(path)
        # We must have at least (k - len(path)) elements remaining in [start, n]
        # Therefore, start can at most be n - (k - len(path)) + 1
        max_start = n - (k - len(path)) + 1

        for num in range(start, max_start + 1):
            path.append(num)        # Make choice
            backtrack(num + 1)      # Recurse forward
            path.pop()              # Backtrack (undo choice)

    backtrack(1)
    return results
```

## Complexity

| Metric | Complexity | Why? |
|---|---|---|
| Time | `O(k · C(n, k))` | Exactly $\binom{n}{k}$ combinations exist, and copying each completed path of length $k$ takes $O(k)$ |
| Space | `O(k)` | Recursion depth is strictly bounded by $k$, requiring $O(k)$ call stack and path memory |

## When to Use

| Great for | Avoid for |
|---|---|
| Choosing $k$ items out of $n$ without order dependency | Generating all subsets of arbitrary sizes (use Power Set backtracking) |
| Lottery drawings, roster selections, and combination locks | When order matters (e.g. passwords, race podiums) — use Permutations |
| Serving as the foundational skeleton for Combination Sum and Knapsack problems | When only the count $\binom{n}{k}$ is required (use Pascal's Triangle or math formula in $O(k)$) |
