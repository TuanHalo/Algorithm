import type { CollectionEntry } from 'astro:content';
import type { TopicConfig, TopicWithCount } from '../types/content';

export const TOPICS: readonly TopicConfig[] = [
  {
    slug: 'sorting',
    name: 'Sorting',
    icon: '🔄',
    color: 'var(--color-sorting)',
    order: 1,
    description: 'Learn how to arrange data in order, from simple swaps to divide-and-conquer.',
    previewAlgorithms: [
      'Bubble Sort',
      'Selection Sort',
      'Insertion Sort',
      'Merge Sort',
      'Quick Sort',
      'Heap Sort',
      'Counting Sort',
    ],
  },
  {
    slug: 'searching',
    name: 'Searching',
    icon: '🔍',
    color: 'var(--color-searching)',
    order: 2,
    description: 'Find what you need fast, from scanning everything to cutting the search in half.',
    previewAlgorithms: [
      'Linear Search',
      'Binary Search',
      'Binary Search Bounds',
      'Jump Search',
      'Interpolation Search',
      'Exponential Search',
      'Ternary Search',
    ],
  },
  {
    slug: 'graph',
    name: 'Graph',
    icon: '🕸️',
    color: 'var(--color-graph)',
    order: 3,
    description: 'Navigate networks such as social connections, maps, dependencies, and paths.',
    previewAlgorithms: [
      'Graph Representations',
      'Breadth-First Search (BFS)',
      'Depth-First Search (DFS)',
      'Connected Components',
      'Cycle Detection in Graphs',
      'Bipartite Graph Check (2-Coloring)',
      'Topological Sort',
      'Union-Find (Disjoint Set)',
      '0-1 BFS',
      "Dijkstra's Shortest Path",
      'Bellman-Ford Shortest Path',
      'Floyd-Warshall All-Pairs Shortest Path',
      "Kruskal's Minimum Spanning Tree",
      "Prim's Minimum Spanning Tree",
      "Kosaraju's Strongly Connected Components",
      'Bridges & Articulation Points',
    ],
  },
  {
    slug: 'dynamic-programming',
    name: 'Dynamic Programming',
    icon: '🧩',
    color: 'var(--color-dp)',
    order: 4,
    description: 'Break big problems into small ones, remember solutions, and avoid repeating work.',
    previewAlgorithms: ['Fibonacci', 'Knapsack', 'LCS', 'Coin Change'],
  },
  {
    slug: 'tree',
    name: 'Tree',
    icon: '🌳',
    color: 'var(--color-tree)',
    order: 5,
    description: 'Hierarchical data, from file systems and family trees to search engines.',
    previewAlgorithms: [
      'Binary Tree Basics',
      'DFS Traversals (Pre, In, Post)',
      'Level-Order Traversal (BFS)',
      'Tree Height, Diameter & Balance',
      'Binary Search Tree (BST)',
      'Validate BST & Kth Smallest',
      'Lowest Common Ancestor (LCA)',
      'AVL Tree',
      'Binary Heap',
      'Trie (Prefix Tree)',
      'Segment Tree',
    ],
  },
  {
    slug: 'linked-list',
    name: 'Linked List',
    icon: '🔗',
    color: 'var(--color-linked-list)',
    order: 6,
    description: 'Nodes chained by pointers for fast insertions, reversals, and cycle detection.',
    previewAlgorithms: [
      'Singly Linked List',
      'Doubly Linked List',
      'Reverse Linked List',
      'Fast & Slow Pointers',
      "Floyd's Cycle Detection",
      'LRU Cache',
    ],
  },
  {
    slug: 'stack-queue',
    name: 'Stack & Queue',
    icon: '📚',
    color: 'var(--color-stack-queue)',
    order: 7,
    description: 'Learn both FIFO (first in, first out) and LIFO (last in, first out) data structures.',
    previewAlgorithms: [
      'Stack Operations',
      'Queue Operations',
      'Circular Queue',
      'Deque Operations',
      'Balanced Brackets',
      'Monotonic Stack',
      'Monotonic Queue',
    ],
  },
  {
    slug: 'hashing',
    name: 'Hashing',
    icon: '🗝️',
    color: 'var(--color-hashing)',
    order: 8,
    description: 'Instant lookups by turning any key into a fast address.',
    previewAlgorithms: [
      'Hash Functions & Load Factor',
      'Hash Map',
      'Hash Set',
      'Separate Chaining',
      'Open Addressing',
      'Prefix Sum + Hash Map',
      'Rolling Hash',
    ],
  },
  {
    slug: 'greedy',
    name: 'Greedy',
    icon: '💰',
    color: 'var(--color-greedy)',
    order: 9,
    description: 'Make the best local choice at each step when a local optimum leads to a global one.',
    previewAlgorithms: ['Activity Selection', 'Huffman Coding'],
  },
  {
    slug: 'backtracking',
    name: 'Backtracking',
    icon: '🔙',
    color: 'var(--color-backtracking)',
    order: 10,
    description: 'Try a path and undo what does not work to explore all possibilities.',
    previewAlgorithms: ['N-Queens', 'Sudoku', 'Permutations'],
  },
] as const;

export function getTopicBySlug(slug: string): TopicConfig | undefined {
  return TOPICS.find((topic) => topic.slug === slug);
}

export function getTopicsWithCounts(
  lessons: readonly CollectionEntry<'learn'>[],
): readonly TopicWithCount[] {
  const counts = new Map<string, number>();
  for (const lesson of lessons) {
    const topic = lesson.data.topic;
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }

  return TOPICS.map((topic) => ({
    ...topic,
    lessonCount: counts.get(topic.slug) ?? 0,
  }));
}

