import mongoose, { Schema, Document, Model } from 'mongoose';
import type { AuthProvider, UserRole } from '@/types';

export interface IActiveSession {
  jti: string;
  userAgent: string;
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  provider: AuthProvider;
  activeSessions: IActiveSession[];
  solvedSlugs: string[];
  bookmarkedSlugs: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ActiveSessionSchema = new Schema<IActiveSession>(
  {
    jti: { type: String, required: true },
    userAgent: { type: String, default: 'Unknown device' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ['user', 'super_admin'],
      default: 'user',
      index: true,
    },
    provider: {
      type: String,
      enum: ['credentials', 'google', 'github'],
      default: 'credentials',
    },
    activeSessions: { type: [ActiveSessionSchema], default: [] },
    solvedSlugs: { type: [String], default: [] },
    bookmarkedSlugs: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
