---
title: "What is Dynamic Programming? Foundations & Principles"
topic: "dynamic-programming"
order: 1
difficulty: "beginner"
timeComplexity: "Varies by problem"
spaceComplexity: "Varies by problem"
tags: ["dynamic-programming", "memoization", "tabulation", "optimal-substructure", "subproblems"]
---

## What is Dynamic Programming?

Write this equation on a whiteboard:
$$1 + 1 + 1 + 1 + 1 = ?$$
Everyone immediately answers: **5!**

Now add another `+ 1` to the end:
$$1 + 1 + 1 + 1 + 1 + 1 = ?$$
Instantly, without hesitation, you say: **6!**

How did you calculate that so quickly?
Did you count all six ones from left to right again?
**No.** You remembered that the first five ones equaled 5, and simply added 1 to your remembered answer.

That is the entire essence of **Dynamic Programming (DP)**:
**Remembering solutions to past subproblems so you never repeat work.**

## Core Concept

Dynamic Programming is an optimization technique that solves complex problems by breaking them down into simpler, overlapping subproblems.
For DP to apply, a problem **must satisfy two essential properties**:

### 1. Optimal Substructure
An optimal solution to the overall problem can be constructed directly from the optimal solutions to its subproblems.
*Example: The shortest route from New York to Los Angeles passing through Chicago consists of the shortest route from New York to Chicago PLUS the shortest route from Chicago to Los Angeles.*

### 2. Overlapping Subproblems
A naive recursive solution solves the exact same subproblems repeatedly over and over again.
*Example: In naive Fibonacci $F(5) = F(4) + F(3)$, both $F(4)$ and $F(3)$ independently compute $F(2)$ and $F(1)$ from scratch, blowing up into an exponential $O(2^n)$ tree.*

---

### The Two Implementation Paradigms

```
                  ┌───────────────────────────────┐
                  │      Dynamic Programming      │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Top-Down (Memoization)      │       │      Bottom-Up (Tabulation)     │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ • Starts at the original goal   │       │ • Starts at the smallest base   │
│ • Uses recursion + cache map    │       │ • Uses iterative loops + array  │
│ • Solves only needed subproblems│       │ • Solves all subproblems in order│
│ • Stack overhead from calls     │       │ • Cache-friendly, fast execution│
└─────────────────────────────────┘       └─────────────────────────────────┘
```

### The 4-Step DP Framework
Every single dynamic programming problem can be dismantled using these 4 steps:
1. **Define the State**: What do the table dimensions represent? (e.g., $dp[i]$ = the min cost to reach step $i$).
2. **Identify Base Cases**: What are the simplest trivially known answers? (e.g., $dp[0] = 0, dp[1] = 1$).
3. **Determine the Transition**: How does $dp[i]$ relate to smaller states? (e.g., $dp[i] = dp[i-1] + dp[i-2]$).
4. **Choose Evaluation Order & Optimize Space**: Can we compute states sequentially? Do we only need the previous 1 or 2 values rather than the entire array?

## Walkthrough

Let's witness the transition on **Climbing Stairs** (count distinct ways to climb $n$ stairs taking 1 or 2 steps at a time):

```
State: ways(n) = ways(n - 1) + ways(n - 2)

Approach 1: Naive Recursion
              ways(4)
             /       \
        ways(3)      ways(2)
        /     \      /     \
    ways(2) ways(1) ways(1) ways(0)
    /     \
ways(1) ways(0)
Notice: ways(2) is calculated twice!
Runtime: O(2^n) exponential time. Crushes the CPU for n > 40.

Approach 2: Top-Down with Memoization
Call ways(4) -> checks memo: empty -> computes ways(3) and ways(2).
When ways(3) finishes computing ways(2), it writes memo[2] = 2.
Later, when right branch calls ways(2), it hits memo[2] instantly in O(1)!
Runtime: O(n) linear time.

Approach 3: Bottom-Up Tabulation
Create array dp of size n + 1:
Base cases: dp[1] = 1, dp[2] = 2
Loop i from 3 to 4:
  dp[3] = dp[2] + dp[1] = 2 + 1 = 3
  dp[4] = dp[3] + dp[2] = 3 + 2 = 5
Runtime: O(n) linear time, O(n) space. Zero recursion call stack!

Approach 4: Bottom-Up Space-Optimized
We only ever look back 2 steps:
prev2 = 1, prev1 = 2
curr = prev1 + prev2 = 3; prev2 = 2, prev1 = 3
curr = prev1 + prev2 = 5;
Runtime: O(n) linear time, O(1) constant auxiliary space!
```

## Python Code

```python
# 1. Top-Down Approach (Memoization)
def climb_stairs_memo(n: int) -> int:
    memo: dict[int, int] = {1: 1, 2: 2}

    def solve(i: int) -> int:
        if i not in memo:
            memo[i] = solve(i - 1) + solve(i - 2)
        return memo[i]

    return solve(n)


# 2. Bottom-Up Approach (Tabulation)
def climb_stairs_tabulation(n: int) -> int:
    if n <= 2:
        return n

    # dp[i] stores distinct ways to reach step i
    dp = [0] * (n + 1)
    dp[1] = 1
    dp[2] = 2

    for i in range(3, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]

    return dp[n]


# 3. Bottom-Up Approach (Space-Optimized O(1))
def climb_stairs_optimized(n: int) -> int:
    if n <= 2:
        return n

    prev2, prev1 = 1, 2
    for _ in range(3, n + 1):
        curr = prev1 + prev2
        prev2 = prev1
        prev1 = curr

    return prev1
```

## Complexity

| Approach | Time | Space | Why? |
|---|---|---|---|
| Naive Brute-Force | `O(2ⁿ)` | `O(n)` call stack | Redundant repeated re-evaluations across binary recursion tree |
| Top-Down (Memoization) | `O(n)` | `O(n)` memo + stack | Each subproblem is evaluated once and cached |
| Bottom-Up (Tabulation) | `O(n)` | `O(n)` DP table | Single linear iterative loop filling a 1D table |
| Space-Optimized DP | `O(n)` | `O(1)` registers | Only keeps the last $k$ necessary state variables in memory |

## When to Use

| Dynamic Programming | Greedy Algorithms | Divide and Conquer |
|---|---|---|
| **Subproblems**: Overlap heavily | **Subproblems**: Local choice made without looking back | **Subproblems**: Disjoint / independent (no overlap) |
| **Optimality**: Evaluates all subproblems to find global optimum | **Optimality**: Commits greedily; cannot reconsider past choices | **Optimality**: Combines sub-solutions directly (e.g. Merge Sort) |
| **Typical problems**: Knapsack, Edit Distance, Longest Path, Matrix Chain | **Typical problems**: Activity Selection, Huffman, Kruskal, Dijkstra | **Typical problems**: Merge Sort, Quick Sort, Binary Search |

### When to Avoid Dynamic Programming
- **When subproblems do not overlap**: If subproblems are independent partitions of data, use standard Divide & Conquer (e.g. Merge Sort).
- **When the greedy choice property holds**: If a local optimal decision is mathematically guaranteed to produce the global optimum, Greedy is faster ($O(n \log n)$ vs $O(n^2)$).
- **When there is no optimal substructure**: If global constraints depend on history that cannot be summarized into a finite state variable, use Backtracking or Branch and Bound.
