export type CalculusTopic =
  | 'Limits & Continuity'
  | 'Differential Calculus'
  | 'Integral Calculus'
  | 'Differential Equations'
  | 'Multivariable & Vector Calculus'
  | 'Infinite Series & Sequences';

export type DifficultyLevel = 'Foundation' | 'JEE Advanced' | 'MIT / Putnam';

export type QuestionType = 'mcq' | 'numerical';

export type UserRole = 'user' | 'super_admin';

export type AuthProvider = 'credentials' | 'google' | 'github';

export interface ProblemDTO {
  id: string;
  slug: string;
  title: string;
  topic: CalculusTopic;
  difficulty: DifficultyLevel;
  source: string;
  type: QuestionType;
  statement: string;
  options: string[];
  correctOption?: number;
  correctValue?: number;
  tolerance?: number;
  hint: string;
  solution?: string;
  tags: string[];
}

export interface TestSeriesDTO {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  topic: string;
  difficulty: DifficultyLevel | 'Mixed';
  duration: number;
  marks: number;
  negative: number;
  questionSlugs: string[];
  questionCount: number;
}

export interface AttemptReviewItem {
  problemId: string;
  title: string;
  statement: string;
  type: QuestionType;
  options: string[];
  correctOption?: number;
  correctValue?: number;
  userAnswer: number | null;
  isCorrect: boolean;
  solution: string;
  source: string;
  difficulty: DifficultyLevel;
}

export interface AttemptResultDTO {
  id: string;
  testSlug: string;
  testTitle: string;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  seconds: number;
  createdAt: string;
  review: AttemptReviewItem[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  jti?: string;
}
