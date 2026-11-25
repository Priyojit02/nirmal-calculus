import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITestSeries extends Document {
  slug: string;
  title: string;
  subtitle: string;
  topic: string;
  difficulty: 'Foundation' | 'JEE Advanced' | 'MIT / Putnam' | 'Mixed';
  duration: number;
  marks: number;
  negative: number;
  questionSlugs: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TestSeriesSchema = new Schema<ITestSeries>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: {
      type: String,
      required: true,
      enum: ['Foundation', 'JEE Advanced', 'MIT / Putnam', 'Mixed'],
    },
    duration: { type: Number, required: true },
    marks: { type: Number, required: true, default: 4 },
    negative: { type: Number, required: true, default: 1 },
    questionSlugs: { type: [String], required: true },
  },
  { timestamps: true }
);

export const TestSeries: Model<ITestSeries> =
  mongoose.models.TestSeries ||
  mongoose.model<ITestSeries>('TestSeries', TestSeriesSchema);
