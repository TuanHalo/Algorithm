---
title: "Binary Lifting (Lowest Common Ancestor & Tree Queries)"
topic: "tree"
order: 13
difficulty: "advanced"
timeComplexity: "O(log n) per query"
spaceComplexity: "O(n log n)"
tags: ["tree", "binary-lifting", "lca", "sparse-table", "ancestor-query"]
---

## What is Binary Lifting?

Imagine living on the 100th floor of a skyscraper.
If the elevator only had an "up 1 floor" button, reaching your penthouse from the ground would take 100 presses ($O(n)$ steps).
Instead, express elevators offer powers-of-two jump buttons: `+64`, `+32`, `+16`, `+8`, `+4`, `+2`, `+1`.
To jump 100 floors, you simply press `+64`, then `+32`, then `+4`—reaching your destination in just 3 presses!

**Binary Lifting** applies this exact power-of-two jumping strategy to trees.
By precomputing ancestors at distances $1, 2, 4, 8, 16, \dots, 2^k$, we can find the $k$-th ancestor of any node or compute the Lowest Common Ancestor (LCA) of any two nodes in lightning-fast **$O(\log n)$** time.

## Core Concept

Binary lifting is a dynamic programming technique on trees akin to a 2D sparse table.

Key principles:
1. **DP Table Definition**:
   `up[u][i]` stores the $2^i$-th ancestor of node $u$.
2. **State Transition**:
   To jump $2^i$ steps up from $u$, jump $2^{i-1}$ steps up to reach intermediate node $v = \text{up}[u][i - 1]$, then jump another $2^{i-1}$ steps from $v$:
   $$\text{up}[u][i] = \text{up}[\text{up}[u][i - 1]][i - 1]$$
   Base case: $\text{up}[u][0] = \text{parent}[u]$ (found via a single DFS from root).
3. **$k$-th Ancestor Query**:
   Express $k$ as a sum of powers of two (inspect its binary bits). For each bit $i$ that is set in $k$, jump to $u \leftarrow \text{up}[u][i]$.
4. **Lowest Common Ancestor (LCA)**:
   - Equalize depths: if $\text{depth}[u] < \text{depth}[v]$, lift $v$ until $\text{depth}[u] == \text{depth}[v]$.
   - If $u == v$, return $u$.
   - Lift both in unison: for $i$ from $\lfloor \log_2 n \rfloor$ down to $0$, if $\text{up}[u][i] \ne \text{up}[v][i]$, lift both $u \leftarrow \text{up}[u][i]$ and $v \leftarrow \text{up}[v][i]$.
   - After the loop, $u$ and $v$ are direct children of the LCA, so return $\text{up}[u][0]$.

## Walkthrough

Consider a tree rooted at 1 with max jump $\log_2(n) \approx 3$:

```
        1 (depth 0)
       / \
      2   3 (depth 1)
     /   / \
    4   5   6 (depth 2)
       /
      7 (depth 3)
```

Finding `LCA(4, 7)`:
1. `depth[4] = 2`, `depth[7] = 3`.
2. Depth difference $\Delta = 3 - 2 = 1 = 2^0$.
   Lift node 7 by $2^0 = 1$ step: $\text{up}[7][0] = 5$.
   Now both node 4 and node 5 are at depth 2.
3. Check powers-of-two jumps from highest ($i = 2, 1, 0$):
   - $i = 2$ ($2^2 = 4$): $\text{up}[4][2] = 0$ (out of bounds).
   - $i = 1$ ($2^1 = 2$): $\text{up}[4][1] = 0$ (root or above).
   - $i = 0$ ($2^0 = 1$): $\text{up}[4][0] = 2$, $\text{up}[5][0] = 3$.
     Since $2 \ne 3$, both jump: $u \leftarrow 2$, $v \leftarrow 3$.
4. Both $u$ and $v$ are now immediate children of the LCA.
   The answer is $\text{up}[u][0] = \text{up}[2][0] = 1$.
   `LCA(4, 7) = 1`.

## Python Code

```python
import math


class TreeBinaryLifting:
    """Precomputes 2^i ancestors for O(log n) LCA and k-th ancestor queries."""

    def __init__(self, n: int, adj: list[list[int]], root: int = 1) -> None:
        self.n = n
        self.max_log = math.ceil(math.log2(n + 1)) + 1
        # up[u][i] stores the 2^i-th ancestor of node u (0 indicates no ancestor / root parent)
        self.up = [[0] * self.max_log for _ in range(n + 1)]
        self.depth = [0] * (n + 1)

        # Precompute depths and direct parents via DFS
        self._dfs(root, 0, adj)

        # Fill the DP table
        for i in range(1, self.max_log):
            for u in range(1, n + 1):
                prev_ancestor = self.up[u][i - 1]
                self.up[u][i] = self.up[prev_ancestor][i - 1]

    def _dfs(self, u: int, parent: int, adj: list[list[int]]) -> None:
        self.up[u][0] = parent
        self.depth[u] = self.depth[parent] + 1
        for v in adj[u]:
            if v != parent:
                self._dfs(v, u, adj)

    def get_kth_ancestor(self, node: int, k: int) -> int:
        """Returns the k-th ancestor of node in O(log n). Returns 0 if none exists."""
        curr = node
        for i in range(self.max_log):
            if (k >> i) & 1:
                curr = self.up[curr][i]
                if curr == 0:
                    break
        return curr

    def get_lca(self, u: int, v: int) -> int:
        """Finds Lowest Common Ancestor of u and v in O(log n)."""
        # Ensure u is deeper than or equal to v
        if self.depth[u] < self.depth[v]:
            u, v = v, u

        # Step 1: Lift u to the same depth as v
        diff = self.depth[u] - self.depth[v]
        for i in range(self.max_log):
            if (diff >> i) & 1:
                u = self.up[u][i]

        if u == v:
            return u

        # Step 2: Lift u and v simultaneously from highest power down to 0
        for i in range(self.max_log - 1, -1, -1):
            if self.up[u][i] != self.up[v][i]:
                u = self.up[u][i]
                v = self.up[v][i]

        # Return direct parent of either node
        return self.up[u][0]
```

## Complexity

| Operation | Time | Space | Why? |
|---|---|---|---|
| Preprocessing | `O(n log n)` | `O(n log n)` | Single DFS plus table filling of size $n \times \log_2(n)$ |
| `get_kth_ancestor` | `O(log n)` | `O(1)` | Inspects at most $\log_2(k)$ set bits |
| `get_lca(u, v)` | `O(log n)` | `O(1)` | Equalizes depth in $O(\log n)$ and lifts simultaneously in $\log_2(n)$ steps |

## When to Use

| Great for | Avoid for |
|---|---|
| Repeated LCA queries on a static tree ($Q \gg 1$) | Single LCA query (a plain DFS traversal solves a one-off query in $O(n)$ with zero precomputation) |
| Finding distances between any two tree nodes: $\text{dist}(u, v) = \text{depth}[u] + \text{depth}[v] - 2 \cdot \text{depth}[\text{LCA}(u, v)]$ | Dynamic trees with frequent edge insertions/deletions (use Link-Cut Trees or Euler Tour Trees) |
| Path aggregate queries (e.g. maximum edge weight on the path between $u$ and $v$) by augmenting `up[u][i]` | Extremely memory-constrained environments where the $O(n \log n)$ table footprint cannot be allocated |
