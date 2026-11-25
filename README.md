# Nirmal Calculus — JEE Advanced & MIT Math Practice Platform

A full-stack **Next.js (TypeScript) + MongoDB (Mongoose) + KaTeX** calculus practice and timed mock-exam platform featuring **JEE Advanced** and **MIT 18.01 / 18.02 / Putnam**-level problems.

## Features
- **MongoDB Persistence**: Real Mongoose schemas (`User`, `Problem`, `TestSeries`, `Attempt`) with automatic idempotent seeding on first load.
- **KaTeX LaTeX Rendering**: Crisp inline and display math for integrals, limits, Taylor expansions, ODEs, and vector calculus.
- **21 Verified Hard Calculus Problems**: Spanning 6 domains (*Limits & Continuity*, *Differential Calculus*, *Integral Calculus*, *Differential Equations*, *Multivariable & Vector Calculus*, *Infinite Series & Sequences*) in both **MCQ** and **Numerical Value** formats.
- **Practice Mode & Timed Mock Exams**: Hints, instant server-side grading, negative marking, question palette, countdown timer, and step-by-step solutions.
- **Mastery Dashboard**: Topic-wise progress bars, bookmarked problems, attempt history, and global leaderboard.

## Setup
1. Copy `.env.example` to `.env.local` and set your MongoDB connection string and JWT secret:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/nirmal_calculus
   JWT_SECRET=replace-with-a-long-random-secret
   ```
2. Install dependencies & run:
   ```bash
   npm install
   npm run dev
   ```
