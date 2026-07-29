# Backend Development Log

This file tracks the major architectural decisions and feature implementations for the NestJS/PostgreSQL backend.

---

## [2026-07-30] Backend Architecture & PostgreSQL Schema Finalization

- **Database Migration Strategy**: Formalized the transition from MongoDB/Mongoose to a highly normalized PostgreSQL schema using Prisma ORM.
- **Hybrid Spaced Repetition Design**: Architected a scalable "Mistake Bank" (append-only `Interaction` logs) for standard PYQs, while reserving strict FSRS (`Flashcard` model) exclusively for memorization-heavy topics (Vocab/Formulas) to prevent user Anki-fatigue.
- **Relational Schema Definition**: Finalized the Prisma models ensuring zero data duplication: `User`, `Topic`, `Question` (with optional `imageUrl`), `Interaction` (Mistake Bank), `Bookmark` (Hard questions), and `Flashcard` (FSRS metadata joined with Question content).

## [2026-07-30] Firebase Auth Middleware & Decorators

- **Service Account Security**: Initialized `firebase-admin` using only the `projectId` to follow the principle of least privilege, preventing unnecessary exposure of private keys.
- **Dependency Injection**: Built a singleton `FirebaseModule` and `FirebaseService` leveraging NestJS `OnModuleInit` to guarantee hot-reload safety during development.
- **Guard Architecture**: Implemented `AuthGuard` using `CanActivate` to intercept incoming HTTP headers, extract Bearer tokens, and verify them asynchronously against Google's public keys.
- **Controller DX (Developer Experience)**: Engineered a custom `@CurrentUser()` decorator to elegantly extract the verified user payload from the request object, drastically cleaning up controller logic.
