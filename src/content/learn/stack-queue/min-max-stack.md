---
title: "Min-Max Stack (O(1) Auxiliary Tracking)"
topic: "stack-queue"
order: 5
difficulty: "intermediate"
timeComplexity: "O(1) all operations"
spaceComplexity: "O(n)"
tags: ["stack-queue", "stack", "min-stack", "max-stack", "auxiliary-tracking"]
---

## What is a Min-Max Stack?

Imagine wearing layers of clothing on a winter expedition.
Every time you put on a new sweater or jacket, you write the **coldest temperature seen so far** on the inside tag of that layer.
If you suddenly take off your outer two coats, you don't need to consult a meteorological journal to know what the lowest temperature was when you were wearing the remaining layers: you just look at the tag on your current outermost sweater!

In a standard stack, finding the minimum or maximum element requires popping and inspecting every item ($O(n)$ time) or keeping a separate sorted list ($O(\log n)$ insertion).
A **Min-Max Stack** allows you to push, pop, peek, **and query the current minimum and maximum elements in strict $O(1)$ constant time**!

## Core Concept

The core insight is that stack states are strictly **Last-In, First-Out (LIFO)**.
When an element is pushed onto the stack, the set of elements beneath it is permanently frozen until this element is popped.
Therefore, the minimum (and maximum) of the entire stack at that moment can be permanently computed and cached with that element!

Key implementation techniques:
1. **Auxiliary Stacks**:
   Maintain a primary data stack alongside a parallel `min_stack` and `max_stack`:
   - `push(x)`: Push $x$ to data stack. Push $\min(x, \text{min\_stack.top()})$ to `min_stack`.
   - `pop()`: Pop from data stack, `min_stack`, and `max_stack` simultaneously.
   - `get_min()`: Return `min_stack.top()`.
2. **Tuple/Node State Storage**:
   Alternatively, store tuples `(value, current_min, current_max)` on a single stack, eliminating the need to synchronize multiple lists.
3. **Difference Encoding (Zero Extra Space)**:
   By pushing the difference $2x - \text{min\_val}$ when a new minimum is encountered, $O(1)$ auxiliary memory can be achieved, though with integer overflow considerations in lower-level languages. The paired-stack approach is generally preferred for clarity and safety.

## Walkthrough

Let's push elements `[5, 2, 7, 1]` into a Min-Max Stack:

```
Operation 1: push(5)
  Data Stack: [5]
  Min Stack:  [5]            -> min = 5
  Max Stack:  [5]            -> max = 5

Operation 2: push(2)
  New min = min(2, 5) = 2
  New max = max(2, 5) = 5
  Data Stack: [5, 2]
  Min Stack:  [5, 2]         -> min = 2
  Max Stack:  [5, 5]         -> max = 5

Operation 3: push(7)
  New min = min(7, 2) = 2
  New max = max(7, 5) = 7
  Data Stack: [5, 2, 7]
  Min Stack:  [5, 2, 2]      -> min = 2
  Max Stack:  [5, 5, 7]      -> max = 7

Operation 4: push(1)
  New min = min(1, 2) = 1
  New max = max(1, 7) = 7
  Data Stack: [5, 2, 7, 1]
  Min Stack:  [5, 2, 2, 1]   -> min = 1
  Max Stack:  [5, 5, 7, 7]   -> max = 7

Now let's POP:
  pop() -> removes 1 from all stacks.
  get_min() -> Min Stack top is 2! Restored instantly in O(1)!
  pop() -> removes 7 from all stacks.
  get_max() -> Max Stack top is 5! Restored instantly in O(1)!
```

## Python Code

```python
class MinMaxStack:
    """A LIFO stack supporting push, pop, top, get_min, and get_max in O(1) time."""

    def __init__(self) -> None:
        # Each entry in stack is a tuple: (value, current_min, current_max)
        self.stack: list[tuple[int, int, int]] = []

    def push(self, val: int) -> None:
        """Pushes an integer onto the stack in O(1)."""
        if not self.stack:
            self.stack.append((val, val, val))
        else:
            _, curr_min, curr_max = self.stack[-1]
            new_min = min(val, curr_min)
            new_max = max(val, curr_max)
            self.stack.append((val, new_min, new_max))

    def pop(self) -> int:
        """Removes and returns the top element in O(1)."""
        if not self.stack:
            raise IndexError("pop from empty MinMaxStack")
        val, _, _ = self.stack.pop()
        return val

    def top(self) -> int:
        """Returns the top element without removing it in O(1)."""
        if not self.stack:
            raise IndexError("top from empty MinMaxStack")
        return self.stack[-1][0]

    def get_min(self) -> int:
        """Retrieves the minimum element in the stack in O(1)."""
        if not self.stack:
            raise IndexError("get_min from empty MinMaxStack")
        return self.stack[-1][1]

    def get_max(self) -> int:
        """Retrieves the maximum element in the stack in O(1)."""
        if not self.stack:
            raise IndexError("get_max from empty MinMaxStack")
        return self.stack[-1][2]

    def is_empty(self) -> bool:
        return len(self.stack) == 0

    def __len__(self) -> int:
        return len(self.stack)
```

## Complexity

| Operation | Time | Space | Why? |
|---|---|---|---|
| `push(val)` | `O(1)` | `O(1)` amortized | Appends a 3-tuple to dynamic array; comparison takes constant time |
| `pop()` | `O(1)` | `O(1)` | Removes last tuple from array |
| `top()` | `O(1)` | `O(1)` | Direct array index lookup `stack[-1][0]` |
| `get_min()` | `O(1)` | `O(1)` | Cached extremum access `stack[-1][1]` |
| `get_max()` | `O(1)` | `O(1)` | Cached extremum access `stack[-1][2]` |
| Total Space | — | `O(n)` | Stores 3 integers per pushed element |

## When to Use

| Great for | Avoid for |
|---|---|
| Real-time financial telemetry (tracking peak and lowest stock prices in active session) | Arbitrary index access or middle deletions (stacks only access the top) |
| Implementing a **Min-Max Queue** using two Min-Max stacks (sliding window minimums in $O(1)$ amortized) | Systems with millions of elements where the 2x-3x memory overhead of caching bounds is prohibitive |
| Undo/Redo stacks in text editors that need instantaneous state boundary checks | When elements arrive with non-LIFO lifetimes (use a Heap or Balanced BST for arbitrary deletions) |
