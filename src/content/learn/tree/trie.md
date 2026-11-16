---
title: "Trie (Prefix Tree)"
topic: "tree"
order: 10
difficulty: "intermediate"
timeComplexity: "O(L)"
spaceComplexity: "O(C)"
visualizer: "/visualizers/tree/trie.html"
diagram: "/diagrams/tree/trie-flow.html"
tags: ["tree", "trie", "prefix-tree", "strings"]
---

## What is a Trie?

Think of a paper dictionary's thumb tabs: once you flip to `c`, then `a`, then `r`, words like `car`, `card`, and `cart` all live right together without re-reading the first three letters every time.

A Trie (prefix tree) stores strings character by character along tree edges so words sharing a common prefix share the exact same path from the root.

## Core idea

Walk one edge per character from `root`, creating missing `TrieNode` children on `insert`, and check `node.is_end` at the end of `search` so partial prefixes do not pass as full words.

## Python code

```python
class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, TrieNode] = {}
        self.is_end = False


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True

    def search(self, word: str, prefix_only: bool = False) -> bool:
        node = self.root
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        # Prefix checks succeed at any reached node; full words need is_end
        return True if prefix_only else node.is_end
```

## Complexity

| Operation | Time | Space | Why? |
|---|---|---|---|
| `insert(word)` | `O(L)` | `O(L)` worst | Creates at most `L` new character nodes for a word of length `L` |
| `search(word)` / `starts_with` | `O(L)` | `O(1)` extra | Follows `L` dictionary lookups regardless of how many words are stored |
| Total Memory | `-` | `O(C)` | Bounded by `C` total characters across stored words (shared prefixes save memory) |

## When to use

| Great for | Avoid for |
|---|---|
| Search-bar autocomplete, spell checkers, IP prefix routing, and word-board pruning (Boggle) | Exact single-word membership when prefixes are never queried (a `set` uses far less memory) |
| Lexicographical prefix scans and longest-common-prefix lookups | Very long distinct strings with zero shared prefixes, where child `dict` objects add pointer overhead |
