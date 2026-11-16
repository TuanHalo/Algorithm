---
title: "Branch and Bound"
topic: "backtracking"
order: 5
difficulty: "advanced"
timeComplexity: "O(2^n) worst-case, substantially faster average"
spaceComplexity: "O(2^n) queue / O(n) stack"
tags: ["backtracking", "branch-and-bound", "optimization", "state-space-search", "pruning"]
---

## What is Branch and Bound?

Imagine booking multi-city flights on a budget.
Your current best confirmed round-trip ticket costs $600 (this is your **incumbent** best solution).
Now you explore a promising route through Chicago: the first two legs already cost $650.
Do you spend time searching for hotels and connecting flights from Chicago?
**Absolutely not.** You immediately discard Chicago and all its downstream branches because $650 > $600.

This is **Branch and Bound**: an advanced optimization paradigm that systematically splits a problem into smaller subproblems (**branching**) and calculates an optimistic estimate (**bounding**) for each branch.
If a branch's optimistic estimate cannot beat the best solution found so far, the entire branch is discarded without further exploration!

## Core Concept

While standard backtracking explores state spaces blind to cost until it hits a dead end, Branch and Bound is specifically designed for **NP-hard discrete optimization problems** (minimization or maximization).

Key principles:
1. **Branching**: Dividing the state space tree into mutually exclusive subproblems (e.g. including vs. excluding an item, or choosing the next city to visit).
2. **Bounding Function**: Computing a fast, optimistic upper bound (for maximization) or lower bound (for minimization) on the optimal solution obtainable from the current node:
   - For 0/1 Knapsack: Relax the integer constraint and solve **Fractional Knapsack** greedily in $O(n \log n)$ or $O(n)$ time.
   - For Traveling Salesperson: Compute a Minimum Spanning Tree (MST) or row/column reduction of the distance matrix.
3. **Pruning (Bounding Rule)**:
   - In maximization: If $\text{bound}(\text{node}) \le \text{current\_max\_profit}$, prune node!
   - In minimization: If $\text{bound}(\text{node}) \ge \text{current\_min\_cost}$, prune node!
4. **Search Strategies**:
   - **FIFO (Queue)**: Breadth-first search.
   - **LIFO (Stack)**: Depth-first search (minimal memory $O(n)$).
   - **Best-First (Priority Queue)**: Explores the node with the most promising bound first (expands the fewest nodes).

## Walkthrough

**Problem**: 0/1 Knapsack with capacity $W = 10$.
Items sorted by value-to-weight ratio:
1. Item 1: `val = 40, wt = 4` (ratio 10.0)
2. Item 2: `val = 30, wt = 3` (ratio 10.0)
3. Item 3: `val = 20, wt = 5` (ratio 4.0)

```
Root: level 0, profit 0, weight 0.
Optimistic bound using fractional knapsack:
  Take item 1 (wt 4, val 40, rem 6)
  Take item 2 (wt 3, val 30, rem 3)
  Take 3/5 of item 3 (wt 3, val 12)
  Bound = 40 + 30 + 12 = 82. Best profit = 0.

Branch on Item 1:
- Left child (include Item 1): wt = 4, val = 40. Bound = 82.
- Right child (exclude Item 1): wt = 0, val = 0.
  Fractional bound without Item 1:
    Take item 2 (wt 3, val 30, rem 7)
    Take item 3 (wt 5, val 20, rem 2)
    Bound = 30 + 20 = 50.

Expand Left child (with Item 1):
- Left-Left (include Item 2): wt = 7, val = 70.
  Fractional bound: 70 + (3/5)*20 = 82.
  Best known integer solution updated: profit = 70!
- Left-Right (exclude Item 2): wt = 4, val = 40.
  Fractional bound: 40 + 20 = 60.
  Since Bound 60 <= Best known profit 70, PRUNE THIS NODE!

Now look at Right child from root (without Item 1):
  Its bound was 50.
  Since 50 <= Best known profit 70, PRUNE THIS ENTIRE SUBTREE!

We found the optimal solution (Items 1 + 2, profit 70) while expanding almost none of the remaining tree!
```

## Python Code

```python
import heapq
from dataclasses import dataclass, field


@dataclass(order=True)
class PriorityNode:
    # Negate bound for max-heap behavior using Python's min-heap
    priority: float
    level: int = field(compare=False)
    profit: int = field(compare=False)
    weight: int = field(compare=False)
    bound: float = field(compare=False)


def knapsack_branch_and_bound(
    values: list[int], weights: list[int], capacity: int
) -> int:
    """Solves 0/1 Knapsack using Best-First Search Branch and Bound."""
    n = len(values)
    # Sort items by value-to-weight ratio in descending order
    items = sorted(
        zip(values, weights), key=lambda x: x[0] / x[1], reverse=True
    )

    def calculate_bound(level: int, current_profit: int, current_weight: int) -> float:
        if current_weight >= capacity:
            return 0.0

        bound = float(current_profit)
        total_w = current_weight

        # Greedily take fractional items to compute optimistic relaxation bound
        for i in range(level, n):
            val, wt = items[i]
            if total_w + wt <= capacity:
                total_w += wt
                bound += val
            else:
                bound += (capacity - total_w) * (val / wt)
                break

        return bound

    pq: list[PriorityNode] = []
    initial_bound = calculate_bound(0, 0, 0)
    # Push root node at level 0
    heapq.heappush(pq, PriorityNode(-initial_bound, 0, 0, 0, initial_bound))

    max_profit = 0

    while pq:
        node = heapq.heappop(pq)

        # If optimistic bound cannot beat our current best, prune
        if node.bound <= max_profit:
            continue

        if node.level == n:
            continue

        val, wt = items[node.level]
        next_level = node.level + 1

        # Branch 1: Include item[level]
        if node.weight + wt <= capacity:
            incl_profit = node.profit + val
            incl_weight = node.weight + wt
            incl_bound = calculate_bound(next_level, incl_profit, incl_weight)

            if incl_profit > max_profit:
                max_profit = incl_profit

            if incl_bound > max_profit:
                heapq.heappush(
                    pq,
                    PriorityNode(
                        -incl_bound, next_level, incl_profit, incl_weight, incl_bound
                    ),
                )

        # Branch 2: Exclude item[level]
        excl_bound = calculate_bound(next_level, node.profit, node.weight)
        if excl_bound > max_profit:
            heapq.heappush(
                pq,
                PriorityNode(
                    -excl_bound, next_level, node.profit, node.weight, excl_bound
                ),
            )

    return max_profit
```

## Complexity

| Metric | Complexity | Why? |
|---|---|---|
| Worst-Case Time | `O(2^n)` | If the bounding function is loose, every leaf in the state space tree might be visited |
| Average-Case Time | Substantially faster than `O(2^n)` | Sharp bounds prune a large percentage of combinatorial branches early |
| Space (Best-First) | `O(2^n)` | Priority queue holds frontier subproblems; DFS variant reduces space to `O(n)` |

## When to Use

| Great for | Avoid for |
|---|---|
| NP-hard discrete optimization (Traveling Salesperson, 0/1 Knapsack, Job Shop Scheduling) | Decision or satisfaction problems without a numerical objective function |
| Mixed Integer Linear Programming (MILP) solvers | Problems with polynomial-time greedy or dynamic programming algorithms |
| Exact optimization when heuristic or genetic approximations are not acceptable | Scenarios where compute memory is too tight for priority queue frontiers |
