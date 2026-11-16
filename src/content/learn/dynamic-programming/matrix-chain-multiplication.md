---
title: "Matrix Chain Multiplication (Interval DP)"
topic: "dynamic-programming"
order: 10
difficulty: "advanced"
timeComplexity: "O(n³)"
spaceComplexity: "O(n²)"
tags: ["dynamic-programming", "interval-dp", "matrix-chain", "optimization"]
---

## What is Matrix Chain Multiplication?

Recall from linear algebra that multiplying an $r \times c$ matrix by a $c \times k$ matrix takes $r \cdot c \cdot k$ scalar multiplications.
Matrix multiplication is **associative**:
$$(A \times B) \times C = A \times (B \times C)$$
While both parenthesizations yield the identical resulting matrix, their computational workloads can be astronomically different!

Suppose:
- Matrix $A$ is $10 \times 100$
- Matrix $B$ is $100 \times 5$
- Matrix $C$ is $5 \times 50$

Let's calculate the cost of both parenthesizations:
1. **$(A \times B) \times C$**:
   - $A \times B$ takes $10 \cdot 100 \cdot 5 = 5,000$ operations (result is $10 \times 5$).
   - Multiplying result by $C$ takes $10 \cdot 5 \cdot 50 = 2,500$ operations.
   - **Total = 7,500 operations.**
2. **$A \times (B \times C)$**:
   - $B \times C$ takes $100 \cdot 5 \cdot 50 = 25,000$ operations (result is $100 \times 50$).
   - Multiplying $A$ by result takes $10 \cdot 100 \cdot 50 = 50,000$ operations.
   - **Total = 75,000 operations (10x slower!)**

The **Matrix Chain Multiplication (MCM)** problem asks: given a chain of matrices, where should we place parentheses to minimize the total scalar multiplications?

## Core Concept

MCM is the archetypal problem of **Interval Dynamic Programming**: optimizing a contiguous range $[i..j]$ by considering every possible split point $k$.

Key principles:
1. **Dimension Array ($p$)**:
   A chain of $n$ matrices $A_1, A_2, \dots, A_n$ has dimensions stored in an array $p$ of length $n + 1$, where matrix $A_i$ has dimension $p[i - 1] \times p[i]$.
2. **State Definition**:
   `dp[i][j]` = the minimum scalar multiplications needed to compute the matrix product $A_i \times A_{i+1} \times \dots \times A_j$.
3. **Base Cases**:
   A single matrix takes zero multiplications:
   $$dp[i][i] = 0 \quad \text{for all } 1 \le i \le n$$
4. **Recurrence Relation**:
   To multiply the chain from $i$ to $j$, we place the final multiplication at some split point $k$ ($i \le k < j$):
   $$dp[i][j] = \min_{i \le k < j} \left( dp[i][k] + dp[k+1][j] + p[i-1] \cdot p[k] \cdot p[j] \right)$$
5. **Loop Order (Chain Length)**:
   Since computing $dp[i][j]$ requires smaller intervals, we iterate by **interval length** $L$ from $2$ to $n$.

## Walkthrough

Consider $n = 4$ matrices with dimensions $p = [10, 20, 30, 40, 30]$:
- $A_1$: $10 \times 20$
- $A_2$: $20 \times 30$
- $A_3$: $30 \times 40$
- $A_4$: $40 \times 30$

```
Base Cases (L = 1):
  dp[1][1] = dp[2][2] = dp[3][3] = dp[4][4] = 0

Length L = 2 (two adjacent matrices):
  dp[1][2] = dp[1][1] + dp[2][2] + p[0]*p[1]*p[2] = 0 + 0 + 10*20*30 = 6,000
  dp[2][3] = dp[2][2] + dp[3][3] + p[1]*p[2]*p[3] = 0 + 0 + 20*30*40 = 24,000
  dp[3][4] = dp[3][3] + dp[4][4] + p[2]*p[3]*p[4] = 0 + 0 + 30*40*30 = 36,000

Length L = 3 (chains of 3 matrices):
  - dp[1][3]: test split k=1 vs k=2:
      k=1: dp[1][1] + dp[2][3] + 10*20*40 = 0 + 24,000 + 8,000 = 32,000
      k=2: dp[1][2] + dp[3][3] + 10*30*40 = 6,000 + 0 + 12,000 = 18,000 (min!)
      dp[1][3] = 18,000 (split at k=2)

  - dp[2][4]: test split k=2 vs k=3:
      k=2: dp[2][2] + dp[3][4] + 20*30*30 = 0 + 36,000 + 18,000 = 54,000
      k=3: dp[2][3] + dp[4][4] + 20*40*30 = 24,000 + 0 + 24,000 = 48,000 (min!)
      dp[2][4] = 48,000 (split at k=3)

Length L = 4 (full chain dp[1][4]): test splits k=1, 2, 3:
  - k=1: dp[1][1] + dp[2][4] + 10*20*30 = 0 + 48,000 + 6,000 = 54,000
  - k=2: dp[1][2] + dp[3][4] + 10*30*30 = 6,000 + 36,000 + 9,000 = 51,000
  - k=3: dp[1][3] + dp[4][4] + 10*40*30 = 18,000 + 0 + 12,000 = 30,000 (min!)

Optimal scalar multiplications = 30,000.
Optimal Parenthesization: ((A1 x A2) x A3) x A4 -> split at k=3.
```

## Python Code

```python
def matrix_chain_order(p: list[int]) -> tuple[int, str]:
    """Computes the minimum number of scalar multiplications to multiply

    a chain of matrices with dimensions given in p (where matrix i is p[i-1] x p[i]).
    Also returns the optimal parenthesized expression string.
    """
    n = len(p) - 1  # Number of matrices
    # dp[i][j] stores minimum multiplications for A[i..j] (1-indexed)
    dp = [[0] * (n + 1) for _ in range(n + 1)]
    # split[i][j] records the optimal split point k
    split = [[0] * (n + 1) for _ in range(n + 1)]

    # L is chain length: from 2 up to n
    for length in range(2, n + 1):
        for i in range(1, n - length + 2):
            j = i + length - 1
            dp[i][j] = float("inf")

            for k in range(i, j):
                # Cost = left cost + right cost + cost of multiplying the two results
                cost = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j]
                if cost < dp[i][j]:
                    dp[i][j] = cost
                    split[i][j] = k

    def construct_order(i: int, j: int) -> str:
        if i == j:
            return f"A{i}"
        k = split[i][j]
        left_str = construct_order(i, k)
        right_str = construct_order(k + 1, j)
        return f"({left_str} x {right_str})"

    return dp[1][n], construct_order(1, n)
```

## Complexity

| Metric | Complexity | Why? |
|---|---|---|
| Time | `O(n³)` | There are $O(n^2)$ table states $[i..j]$; each state evaluates $O(n)$ candidate split points $k$ |
| Space | `O(n²)` | 2D table of size $(n + 1) \times (n + 1)$ to store subproblem costs and split points |

## When to Use

| Great for | Avoid for |
|---|---|
| Optimal parenthesization of associative binary operations | Multiplying only two matrices (simple single-pass $O(r \cdot c \cdot k)$) |
| Template for all Interval DP problems: Burst Balloons, Minimum Cost to Cut a Stick, Boolean Parenthesization | Non-associative operations where order alteration changes the mathematical result |
| Syntax tree and grammar parsing algorithms (e.g. CYK parsing for context-free grammars) | Extremely large chains ($n > 10,000$), where $O(n^3)$ is too slow (use Hu-Shing $O(n \log n)$ approximation) |
