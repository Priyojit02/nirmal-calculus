import mongoose, { Schema, Document, Model } from 'mongoose';
import type { CalculusTopic, DifficultyLevel, QuestionType } from '@/types';

export interface IProblem extends Document {
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
  tolerance: number;
  hint: string;
  solution: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProblemSchema = new Schema<IProblem>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    topic: {
      type: String,
      required: true,
      enum: [
        'Limits & Continuity',
        'Differential Calculus',
        'Integral Calculus',
        'Differential Equations',
        'Multivariable & Vector Calculus',
        'Infinite Series & Sequences',
      ],
      index: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['Foundation', 'JEE Advanced', 'MIT / Putnam'],
      index: true,
    },
    source: { type: String, required: true },
    type: { type: String, required: true, enum: ['mcq', 'numerical'] },
    statement: { type: String, required: true },
    options: { type: [String], default: [] },
    correctOption: { type: Number },
    correctValue: { type: Number },
    tolerance: { type: Number, default: 0.01 },
    hint: { type: String, required: true },
    solution: { type: String, required: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Problem: Model<IProblem> =
  mongoose.models.Problem || mongoose.model<IProblem>('Problem', ProblemSchema);
