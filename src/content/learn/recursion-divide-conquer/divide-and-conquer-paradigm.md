---
title: "Divide-and-Conquer Paradigm"
topic: "recursion-divide-conquer"
order: 3
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(log n)"
tags: ["divide-and-conquer", "recursion", "subproblems", "algorithmic-paradigms"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (one item) | `O(1)` | `O(1)` | The base case returns on the first call |
| Average | `O(n)` | `O(log n)` | `2n − 1` calls with `O(1)` divide and combine each; one branch of depth `log₂ n` is on the stack |
| Worst | `O(n)` | `O(log n)` | Same for every input: the tree always splits evenly |

## When to use

| Great for | Avoid for |
|---|---|
| Independent subproblems that share no work: merge sort (combine = merge in `O(n)`), quick sort, binary search, closest pair of points | Overlapping subproblems (Fibonacci, longest common subsequence): use dynamic programming |
| Combines that cost less than the original problem: Karatsuba multiplication, Strassen matrix multiplication, counting inversions | Problems a single loop already solves in `O(n)` with `O(1)` space, like this maximum (shown only because its combine is one line) |
| Work you want to spread over several CPU cores or machines, since the branches are independent | A combine as costly as the whole problem (`O(n²)`), or tiny inputs where call overhead beats a plain loop |
