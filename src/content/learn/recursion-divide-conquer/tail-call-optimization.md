---
title: "Tail Recursion & Accumulators"
topic: "recursion-divide-conquer"
order: 2
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1) with TCO / iterative loop"
tags: ["recursion", "tail-call", "optimization", "accumulator", "call-stack"]
---

## Intuition & Analogy

Imagine ordering a package through a chain of postal couriers.
In **standard recursion**, you tell courier A to fetch an item, but you must remain on standby at your desk because once courier A returns, you still need to stamp the package yourself before finishing. As each courier calls another courier, an entire chain of people stands frozen in place waiting for the return trip.

In **tail recursion**, you stamp the package *first*, hand both the package and the stamp over to the courier (an **accumulator**), and close your office door. You have zero remaining work to perform. The courier can simply replace you rather than keeping you waiting.

## Core Concept

A recursive call is a **tail call** if and only if it is the very last operation executed before the function returns:
- `return n * factorial(n - 1)` $\implies$ **NOT** tail recursive! The multiplication `* n` must wait for `factorial(n - 1)` to complete.
- `return factorial_tail(n - 1, acc * n)` $\implies$ **Tail recursive**! The call is pure return delegation; nothing remains to calculate in the caller's frame.

### Tail Call Optimization (TCO)
In compilers and runtimes that support TCO (such as Scheme, Scala, Elixir, and WebAssembly):
Instead of allocating a new stack frame on each call, the runtime reuses the current frame by simply updating local variables and jumping back to the function head. This transforms recursion from $O(n)$ stack space into **$O(1)$ space**.

*(Note: CPython deliberately omits automatic TCO to preserve full stack traces for debugging, making the accumulator pattern directly convertible to an explicit $O(1)$ while loop).*

## Step-by-Step Walkthrough

Convert `factorial(4)` into tail-recursive accumulator form:
Function signature: `factorial_helper(n, acc)`

| Step | `n` | `acc` (Current running total) | Call executed | Frame state |
|---|---|---|---|---|
| 1 | 4 | 1 | `factorial_helper(3, 1 * 4 = 4)` | No pending operations! |
| 2 | 3 | 4 | `factorial_helper(2, 4 * 3 = 12)` | Caller frame can be overwritten |
| 3 | 2 | 12 | `factorial_helper(1, 12 * 2 = 24)` | Caller frame can be overwritten |
| 4 | 1 | 24 | Hits base case (`n <= 1`) | Returns `acc = 24` directly |

The base case already holds the final answer: **24**. No unwinding multiplications are needed!

## Python Code

```python
def factorial_non_tail(n: int) -> int:
    """Non-tail recursive: multiplication waits on stack unwinding."""
    if n <= 1:
        return 1
    return n * factorial_non_tail(n - 1)  # Multiplication occurs AFTER return


def factorial_tail(n: int, accumulator: int = 1) -> int:
    """Tail recursive with accumulator: return value is passed purely forward."""
    if n <= 1:
        return accumulator
    return factorial_tail(n - 1, n * accumulator)  # Pure tail call


def factorial_iterative_equivalent(n: int) -> int:
    """The exact loop that a TCO-enabled compiler compiles tail recursion into."""
    accumulator = 1
    while n > 1:
        accumulator *= n
        n -= 1
    return accumulator
```

## Complexity Table

| Form | Time Complexity | Auxiliary Space (Python) | Auxiliary Space (TCO-Engine) |
|---|---|---|---|
| Non-Tail Recursive | $O(n)$ | $O(n)$ | $O(n)$ |
| Tail Recursive + Accumulator | $O(n)$ | $O(n)$ | $O(1)$ |
| Iterative While Loop | $O(n)$ | $O(1)$ | $O(1)$ |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Functional programming languages (Haskell, Erlang, Scheme) where recursion is the primary loop mechanism | Python production code expecting depths $> 1000$ without rewriting as an iterative loop |
| Accumulating lists, sums, or products sequentially | Multi-branch recursions (such as traversing both left and right children of a binary tree) where only one branch can be the tail call |
| State-machine transitions where each state tail-calls the next handler | When intermediate stack frames are needed for post-order processing or backtracking |
