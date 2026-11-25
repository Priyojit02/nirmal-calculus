import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAttemptReview {
  problemId: string;
  title: string;
  statement: string;
  type: 'mcq' | 'numerical';
  options: string[];
  correctOption?: number;
  correctValue?: number;
  userAnswer: number | null;
  isCorrect: boolean;
  solution: string;
  source: string;
  difficulty: 'Foundation' | 'JEE Advanced' | 'MIT / Putnam';
}

export interface IAttempt extends Document {
  userId: Types.ObjectId;
  userName: string;
  testSlug: string;
  testTitle: string;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  seconds: number;
  review: IAttemptReview[];
  createdAt: Date;
}

const AttemptReviewSchema = new Schema<IAttemptReview>(
  {
    problemId: { type: String, required: true },
    title: { type: String, required: true },
    statement: { type: String, required: true },
    type: { type: String, required: true, enum: ['mcq', 'numerical'] },
    options: { type: [String], default: [] },
    correctOption: { type: Number },
    correctValue: { type: Number },
    userAnswer: { type: Number, default: null },
    isCorrect: { type: Boolean, required: true },
    solution: { type: String, required: true },
    source: { type: String, required: true },
    difficulty: { type: String, required: true },
  },
  { _id: false }
);

const AttemptSchema = new Schema<IAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    testSlug: { type: String, required: true },
    testTitle: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    correct: { type: Number, required: true },
    wrong: { type: Number, required: true },
    skipped: { type: Number, required: true },
    total: { type: Number, required: true },
    seconds: { type: Number, required: true },
    review: { type: [AttemptReviewSchema], default: [] },
  },
  { timestamps: true }
);

export const Attempt: Model<IAttempt> =
  mongoose.models.Attempt || mongoose.model<IAttempt>('Attempt', AttemptSchema);
