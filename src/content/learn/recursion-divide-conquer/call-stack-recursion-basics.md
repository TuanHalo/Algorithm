---
title: "Call Stack & Recursion Basics"
topic: "recursion-divide-conquer"
order: 1
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(n) call stack frames"
tags: ["recursion", "call-stack", "stack-overflow", "base-case", "frames"]
---

## Intuition & Analogy

Imagine a set of traditional Russian nesting dolls (Matryoshka).
To find the treasure hidden inside, you open the outermost doll, only to find a smaller doll. You open that one and find an even smaller doll. You repeat this exact same action until you reach the smallest, solid wooden doll that cannot be opened—the **base case**.
Only after opening that base doll do you begin assembling the shells back together in reverse order until the full doll sits reassembled on your desk.

In programming, **recursion** occurs when a function solves a task by calling a smaller instance of itself, using the computer's memory **call stack** to keep track of its place.

## Core Concept

Every recursive function requires two essential ingredients:

1. **The Base Case**: A terminating condition that returns a direct result without invoking any further recursive calls. Without a base case, the function calls itself infinitely until system memory is exhausted, triggering a **Stack Overflow**.
2. **The Recursive Step**: Reducing the problem into one or more smaller subproblems of the exact same form, progressing closer to the base case with every call.

### The Anatomy of a Stack Frame
When a function is called, the OS allocates a **stack frame** in memory containing:
- Function parameters and local variables.
- Return address (where execution should resume in the caller once this function completes).

As calls nest deeper, stack frames pile up linearly. When a base case returns, frames are popped off one by one (unwinding).

## Step-by-Step Walkthrough

Trace `factorial(3)`:
$$n! = n \times (n - 1)! \quad \text{with base case } 0! = 1, 1! = 1$$

1. **Forward Call Phase (Stack Growing)**:
   - Call `factorial(3)`: pauses, pushes Frame 1 ($n=3$), calls `factorial(2)`.
   - Call `factorial(2)`: pauses, pushes Frame 2 ($n=2$), calls `factorial(1)`.
   - Call `factorial(1)`: hits base case! Returns `1` immediately.
2. **Unwinding Phase (Stack Shrinking)**:
   - Frame 2 resumes: receives `1`, calculates $2 \times 1 = 2$, returns `2`, pops Frame 2.
   - Frame 1 resumes: receives `2`, calculates $3 \times 2 = 6$, returns `6`, pops Frame 1.
3. Final result: **6**. Peak stack depth: 3 frames.

## Python Code

```python
def factorial_recursive(n: int) -> int:
    """Calculates n! recursively.

    Raises ValueError for negative inputs.
    """
    if n < 0:
        raise ValueError("Factorial is undefined for negative integers.")

    # 1. Base case: directly solvable condition
    if n <= 1:
        return 1

    # 2. Recursive step: reduce problem size toward base case
    return n * factorial_recursive(n - 1)


def factorial_traced(n: int, depth: int = 0) -> int:
    """Visualizes stack frame push and pop sequence with indentation."""
    indent = "  " * depth
    print(f"{indent}-> factorial({n}) called")

    if n <= 1:
        print(f"{indent}<- base case hit, returning 1")
        return 1

    result = n * factorial_traced(n - 1, depth + 1)
    print(f"{indent}<- unwinding factorial({n}) = {result}")
    return result
```

## Complexity Table

| Approach | Time Complexity | Auxiliary Space Complexity | Risk |
|---|---|---|---|
| Recursive Factorial | $O(n)$ | $O(n)$ stack frames | Crashes with `RecursionError` if $n > 1000$ (default Python limit) |
| Iterative Factorial (Loop) | $O(n)$ | $O(1)$ | No recursion limit, zero stack frame overhead |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Naturally hierarchical structures (trees, graphs, nested JSON, directory trees) | Simple flat loops (e.g., counting, linear array scanning) where iteration is cleaner and $O(1)$ space |
| Divide-and-conquer algorithms (Merge Sort, Quick Sort, Binary Search) | High-depth recursions ($n > 10^4$) in languages without tail-call elimination |
| Backtracking search spaces (N-Queens, Sudoku, permutations) | When intermediate subproblems repeat exponentially without memoization |
