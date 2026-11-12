export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ProblemDifficulty = 'easy' | 'medium' | 'hard';
export type PlatformName = 'leetcode' | 'hackerrank' | 'codeforces' | 'other';

export interface TopicConfig {
  readonly slug: string;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly order: number;
  readonly description: string;
  readonly previewAlgorithms: readonly string[];
}

export interface TopicWithCount extends TopicConfig {
  readonly lessonCount: number;
}

