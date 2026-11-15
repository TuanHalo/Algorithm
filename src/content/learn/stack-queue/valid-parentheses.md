---
title: "Balanced Brackets"
topic: "stack-queue"
order: 5
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/stack-queue/valid-parentheses.html"
diagram: "/diagrams/stack-queue/valid-parentheses-flow.html"
tags: ["stack-queue", "stack", "string", "matching"]
---

## 🎯 What is Balanced Brackets?

Imagine nesting Russian dolls — **the innermost doll you open must always be the very first one you snap shut before closing any outer doll**.
Using a Stack, we remember every unmatched opening bracket in order and verify each closing bracket matches the most recent opener on top.

## 🧠 Core Idea

> Push every opener `( [ {` → On each closer `) ] }`, pop and verify it matches the top opener → Valid iff the stack ends empty

## 🐍 Python Code

```python
def is_valid_brackets(text: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[str] = []

    for ch in text:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            # Fail early if stack is empty or top opener has wrong type
            if not stack or stack.pop() != pairs[ch]:
                return False

    # Every opened bracket must have been closed by the end
    return len(stack) == 0
```

## ⏱️ Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| **Best** (first char is `)` ) | `O(1)` | `O(1)` | Stray closing bracket hits an empty stack and returns `False` at once |
| **Average** | `O(n)` | `O(n)` | Each character is pushed and popped at most once across the string |
| **Worst** (all openers `(((`) | `O(n)` | `O(n)` | Scans all `n` characters and holds up to `n` openers on the stack |

## ⚡ When to Use

| ✅ Great for | ❌ Avoid for |
|---|---|
| Validating nested delimiters (`()`, `[]`, `{}`, HTML/XML tags) | Checking a single bracket type like `()` only (a simple `balance` counter uses `O(1)` space!) |
| Building syntax linters, formula parsers, and code editors | Unnested flat token checks where order of closure does not matter |
| Spotting the exact index of the first mismatched or stray delimiter | Regular languages without recursion/nesting (regex suffices there) |
