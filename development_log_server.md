# Backend Development Log

This file tracks the major architectural decisions and feature implementations for the NestJS/PostgreSQL backend.

---

## [2026-07-30] Backend Architecture & PostgreSQL Schema Finalization

- **Database Migration Strategy**: Formalized the transition from MongoDB/Mongoose to a highly normalized PostgreSQL schema using Prisma ORM.
- **Hybrid Spaced Repetition Design**: Architected a scalable "Mistake Bank" (append-only `Interaction` logs) for standard PYQs, while reserving strict FSRS (`Flashcard` model) exclusively for memorization-heavy topics (Vocab/Formulas) to prevent user Anki-fatigue.
- **Relational Schema Definition**: Finalized the Prisma models ensuring zero data duplication: `User`, `Topic`, `Question` (with optional `imageUrl`), `Interaction` (Mistake Bank), `Bookmark` (Hard questions), and `Flashcard` (FSRS metadata joined with Question content).

## [2026-07-30] Prisma Module & Database Integration

- **Serverless PostgreSQL (Neon)**: Connected the backend to a scalable Neon PostgreSQL instance. Adjusted `.env` config to safely use the `DATABASE_URL` connection string.
- **Prisma Client Generation**: Executed the initial `npx prisma db push`, successfully pushing the entire schema and relationships up to Neon and generating the Prisma Client.
- **NestJS Dependency Injection**: Scaffolded a globally scoped `@Global()` `PrismaModule` and an extending `PrismaService` class hooking into the NestJS `OnModuleInit` lifecycle, ensuring a clean singleton database connection pool across all future REST modules.

## [2026-07-30] Unified `Item` Database Architecture Redesign

- **Single Table Inheritance**: Completely dropped the isolated `Question` and `Flashcard` tables in favor of a unified `Item` table. 
- **PostgreSQL JSONB Payload**: All question/flashcard content (options, answers, translations, phonetic spellings) is now stored inside a flexible `content: Json` column, while maintaining strict relational columns for SSC taxonomies (`examName`, `year`, `shift`, `subject`, `topic`).
- **Relational Mock Tests**: Implemented the `ExamPaper` model to group `Items`, allowing users to either attempt a full 100-question paper, or slice the paper dynamically via SQL relations to only practice specific subjects/topics from a specific shift.
- **Analytics & Mistake Bank Engine**: Separated the FSRS state machine (`FsrsData`) from the analytics log (`Interaction`). The `Interaction` table now captures a strict, append-only history of every user attempt (both MCQ correctness and Flashcard ratings), mapped to a `Session` (Mock Test or Topic Quiz) to power the custom Mistake Bank and dynamic XP gamification.
