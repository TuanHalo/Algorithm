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

export interface ProblemTag {
  readonly label: string;
  readonly topic?: string;
  readonly slug?: string;
}

export interface ProblemApproach {
  readonly name: string;
  readonly timeComplexity: string;
  readonly spaceComplexity: string;
  readonly isOptimal: boolean;
  readonly summary?: string;
  readonly tags: readonly ProblemTag[];
}

export interface ProblemData {
  readonly title: string;
  readonly platform: PlatformName;
  readonly problemUrl: string;
  readonly difficulty: ProblemDifficulty;
  readonly topics: readonly string[];
  readonly dateCompleted?: string;
  readonly timeComplexity?: string;
  readonly spaceComplexity?: string;
  readonly approaches?: readonly ProblemApproach[];
}
