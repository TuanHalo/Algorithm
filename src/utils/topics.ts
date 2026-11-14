import type { CollectionEntry } from 'astro:content';
import type { TopicConfig, TopicWithCount } from '../types/content';

export const TOPICS: readonly TopicConfig[] = [
  {
    slug: 'sorting',
    name: 'Sorting',
    icon: '🔄',
    color: 'var(--color-sorting)',
    order: 1,
    description: 'Learn how to arrange data in order — from simple swaps to divide-and-conquer.',
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
    description: 'Find what you need fast — from scanning everything to cutting the search in half.',
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
    description: 'Navigate networks — social connections, maps, dependencies, and paths.',
    previewAlgorithms: ['BFS', 'DFS', 'Dijkstra', 'Bellman-Ford'],
  },
  {
    slug: 'dynamic-programming',
    name: 'Dynamic Programming',
    icon: '🧩',
    color: 'var(--color-dp)',
    order: 4,
    description: 'Break big problems into small ones — remember solutions, never repeat work.',
    previewAlgorithms: ['Fibonacci', 'Knapsack', 'LCS', 'Coin Change'],
  },
  {
    slug: 'tree',
    name: 'Tree',
    icon: '🌳',
    color: 'var(--color-tree)',
    order: 5,
    description: 'Hierarchical data — from file systems to family trees to search engines.',
    previewAlgorithms: ['BST', 'AVL', 'Inorder', 'Preorder', 'Postorder'],
  },
  {
    slug: 'linked-list',
    name: 'Linked List',
    icon: '🔗',
    color: 'var(--color-linked-list)',
    order: 6,
    description: 'Nodes chained by pointers — fast insertions, reversals, and cycle detection.',
    previewAlgorithms: ['Singly Linked List', 'Fast & Slow Pointers', 'Reverse List'],
  },
  {
    slug: 'stack-queue',
    name: 'Stack & Queue',
    icon: '📚',
    color: 'var(--color-stack-queue)',
    order: 7,
    description: 'First in, first out? Last in, first out? Master both.',
    previewAlgorithms: ['Stack Operations', 'Queue Operations', 'Monotonic Stack'],
  },
  {
    slug: 'hashing',
    name: 'Hashing',
    icon: '🗝️',
    color: 'var(--color-hashing)',
    order: 8,
    description: 'Instant lookups — turn any key into a fast address.',
    previewAlgorithms: ['Hash Map', 'Hash Set', 'Collision Handling'],
  },
  {
    slug: 'greedy',
    name: 'Greedy',
    icon: '💰',
    color: 'var(--color-greedy)',
    order: 9,
    description: 'Make the best local choice every time — sometimes that is all you need.',
    previewAlgorithms: ['Activity Selection', 'Huffman Coding'],
  },
  {
    slug: 'backtracking',
    name: 'Backtracking',
    icon: '🔙',
    color: 'var(--color-backtracking)',
    order: 10,
    description: 'Try everything, undo what does not work — systematic exploration.',
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

