---
title: "Valid Parentheses"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/valid-parentheses/"
difficulty: "easy"
topics: ["stack-queue", "string"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
diagram: "/diagrams/stack-queue/valid-parentheses-flow.html"
approaches:
  - name: "Stack Matching"
    timeComplexity: "O(n)"
    spaceComplexity: "O(n)"
    isOptimal: true
    summary: "Push opening brackets onto a stack and match corresponding closing brackets against the top element."
    tags:
      - label: "Stack"
        topic: "stack-queue"
        slug: "stack-basics"
---

## Problem

Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Example 1
```
Input: s = "()"
Output: true
```

### Example 2
```
Input: s = "()[]{}"
Output: true
```

### Example 3
```
Input: s = "(]"
Output: false
```

### Example 4
```
Input: s = "([])"
Output: true
```

## My approach

1. **LIFO matching principle**:
   - The most recently opened bracket must be the first one closed (Last-In, First-Out), making a **Stack** the ideal data structure.
2. **Hash map of pairs**:
   - Map each closing bracket to its corresponding opening bracket: `pairs = {")": "(", "]": "[", "}": "{"}`.
3. **Linear pass**:
   - For each character in the string:
     - If it is an opening bracket (`(`, `[`, `{`), push it onto the stack.
     - If it is a closing bracket:
       - Check if the stack is non-empty and the top element matches `pairs[ch]`.
       - If it does, pop from the stack.
       - If the stack is empty or the top element does not match, return `False` immediately.
4. **Final check**:
   - The string is valid if and only if all opening brackets have been properly matched and closed (i.e. `len(stack) == 0`).

## My solution

```python
def is_valid(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[str] = []

    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            # Fail early if stack is empty or top opener does not match
            if not stack or stack.pop() != pairs[ch]:
                return False

    # String is valid only if every opener was closed
    return len(stack) == 0
```

## AI feedback

### Strengths
- $O(n)$ time complexity processing each character in a single forward pass.
- Constant time $O(1)$ dictionary lookups for delimiter pairs.
- Early exit on mismatch or when encountering a closing bracket with an empty stack.

### Improvements
- **Length parity check**: An odd-length string cannot possibly be valid; adding `if len(s) % 2 != 0: return False` at the start allows instantaneous exit for odd-length inputs.

### Edge cases
- Starts with closing bracket (`")("`): First char is a closer, stack is empty, fails immediately.
- Only opening brackets (`"((("`): Stack has 3 elements at end, `len(stack) == 0` evaluates to `False`.
- Mismatched brackets (`"(]"`): Popped element `'('` doesn't match `']'` pair `'['`, fails immediately.

### Alternative approaches
- **String Replacement (Suboptimal)**: Repeatedly replace `"()"`, `"[]"`, and `"{}"` with `""` until no changes occur. In the worst case this takes $O(n^2)$ time and allocates many intermediate strings.
