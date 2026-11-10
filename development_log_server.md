# Server Development Log

This document tracks the major architectural decisions, milestones, and features implemented in the SSC App backend.

## 1. Architecture Migration (NestJS)
- **Framework Transition:** Completely migrated the legacy Express backend to a modular **NestJS** architecture. The `server-nestjs` project was consolidated and now serves as the primary root of the `/server` directory.
- **Module Structure:** Designed a highly decoupled foundation utilizing domain-specific modules: `AppModule`, `AuthModule`, `PrismaModule`, `AdminModule`, `ExamPapersModule`, `SessionsModule`, and `ItemsModule`.

## 2. Database & ORM (Prisma & PostgreSQL)
- **Prisma Client & PostgreSQL:** Integrated Prisma ORM with the `@prisma/adapter-pg` driver for robust, type-safe database interactions.
- **Prisma v7 Client Config:** Client generated to custom path `generated/prisma` with `cjs` module format. `PrismaClient` instantiated using `PrismaPg` adapter connected via `process.env.DATABASE_URL`.
- **Unified Item Schema:** Created a highly flexible `Item` model (using `JSONB` for content) capable of representing PYQs, Flashcards, Formulas, and Game Data under a single deduplicated taxonomy.
- **Taxonomy & Relational Design:** 
  - Added the `ExamPaper` model to represent full mock tests (e.g., SSC CGL Shifts).
  - Added the `Passage` model, establishing a one-to-many relationship with `Item` to support Reading Comprehension scenarios.

## 3. Authentication (Firebase)
- **AuthGuard Integration:** Implemented global and route-specific Firebase token verification via a custom `AuthGuard`.
- **Context Decorators:** Created a strongly-typed `@CurrentUser()` decorator to easily inject authenticated user context directly into controller endpoints.

## 4. Admin Module & Seeding (Data Ingestion)
- **Exam Paper Saving:** Developed an admin endpoint to parse and save full exam papers directly to the database.
- **SHA-256 Deduplication:** Implemented hashing logic on the normalized question text to ensure that a single question appearing in multiple shifts is only stored once in the database.
- **Batch Processing:** Optimized database insertion by batch-fetching existing hashes in a single query and chunking the transaction operations to avoid connection timeouts on large datasets.
- **Seeder Execution (`src/prisma/seed.ts`):**
  - Ingested 637 flashcards from `test.flashcards.json`.
  - Processed and mapped fields: `subject` (English), `topics` ([Vocab/Idiom/OWS]), `type` ("Flashcard"), `difficulty`, `tags`, `hash` (SHA-256 of `front.text`), and `content` (JSONB containing front, back, exam, year).
  - Deduplicated in-memory and against database, inserted in 500-item chunks.
  - Verified via Prisma Studio (`npx prisma studio`).

## 5. Items Module (Flashcard & Item Fetching API)
- **Files Created:**
  - `src/items/items.service.ts`: Query logic for flashcards, topic extraction, filtering by topic/difficulty, and pagination.
  - `src/items/items.controller.ts`: Endpoints protected with `AuthGuard`:
    - `GET /items/flashcards?topic=Vocab&difficulty=Medium&limit=20&offset=0`
    - `GET /items/topics?type=Flashcard`
    - `GET /items/by-type/:type?subject=English&limit=20&offset=0`
    - `GET /items/:id`
  - `src/items/items.module.ts`: Module wiring with `PrismaModule` and `FirebaseModule`.
- **Registered:** Imported and added to `AppModule`.

## 6. Sessions & Gamification Module
- **Progress Tracking:** Built the `SessionsModule` to track user study sessions (Mock Tests, Topic Quizzes, Custom Mistakes).
- **Atomic Interactions:** Created the `logInteraction` endpoint to log every single question attempted, tracking correctness, time taken, and user ratings.
- **XP & Streaks:** Implemented the `completeSession` logic which aggregates the score, calculates the XP earned (Score * 5), and increments the user's `currentStreak`.
- **Spaced Repetition (Pending Next):** Scaffolded the `FsrsData` schema and imported `fsrs.js` in preparation for integrating the Free Spaced Repetition Scheduler into the interaction lifecycle.

## Roadmap / Next Steps Agreed
1. **Frontend Flashcard Review UI:** Build the study interface (flip/swipe deck) connecting to `/items/flashcards`.
2. **FSRS Algorithm Integration:** Connect `fsrs.js` spaced repetition scheduling to rating submissions and card queues.

## 7. Neon Postgres setup & Flashcards migration (Mongo -> Nest/Postgres)

- **Neon connections**: `DATABASE_URL` is now Neon's *pooled* endpoint (host contains `-pooler`) used by the running app; the new `DIRECT_URL` is the *direct* endpoint used only by `prisma migrate` (`prisma.config.ts` prefers `DIRECT_URL`). `PrismaService` sets a 20s connection timeout (Neon suspends idle databases, so the first query can be slow) and a pool cap of 10. `.env.example` documents both.
- **Migrations baseline**: the DB had been created without migration history. Verified zero drift (`prisma migrate diff --from-config-datasource --to-schema`), generated `prisma/migrations/0_init` from the schema and marked it applied (`migrate resolve --applied`), so `prisma migrate dev/deploy` now work. No data or schema was changed.
- **Data check**: 637 flashcards in Postgres match the Mongo export exactly (500 vocab / 45 idiom / 92 OWS, 0 duplicate fronts). Old Mongo progress was only flashcard interactions in dev, so it was intentionally *not* migrated.
- **New `FlashcardsModule`** (`src/flashcards/`):
  - `GET /flashcards` (public): filters `subject, type, exam, year, difficulty, alphabet, tags, highFrequency, limit` (same semantics as the old `getFilteredCards`), sorted A-Z; returns the old Mongo-shaped DTO (`_id`, `front`, `back`, `tags`, ...) so the frontend needed no component changes.
  - `GET /flashcards/study-deck` (signed in): due FSRS cards first, then unseen cards, 30/day.
  - `POST /flashcards/:id/review` `{ rating: 1-4, timeTaken? }` (signed in): schedules with `fsrs.js` (pure function in `fsrs-scheduler.ts`) and upserts `FsrsData` + logs an `Interaction` in one transaction. Users are created on first use (no separate `/auth/sync` needed).
  - Global `ValidationPipe` (whitelist + transform) enabled; DTOs use class-validator.
- **Tests**: 27 unit tests (mapper, FSRS scheduling, DTO validation, service logic). Jest now resolves `src/...` imports and Prisma's `.js` specifiers. A throwaway end-to-end script (new user -> deck -> review -> due ordering -> 404 -> cleanup) passed against Neon and left 0 rows behind.
- **Known, pre-existing**: `app.controller.spec`, `sessions.*.spec` and a type error in `auth.guard.spec` were already failing and are unrelated.
- **Cutover**: run Nest on port 8080 and stop `server__old` (also 8080). Client base URL is now `NEXT_PUBLIC_API_URL` (no `/api` suffix). `server__old` is kept until verified, then archive it and drop the Mongo connection.

## 8. PYQs module (public, read-only)

- **`src/pyqs/`**: `GET /pyqs/topics?subject=`, `GET /pyqs?subject=&topic=&limit=` (shuffled practice set), `GET /pyqs/papers?subject=`, `GET /pyqs/papers/:id?subject=` (one subject's section of a paper, `durationSeconds = count * 36`). `subject` is `maths | english | reasoning | gk`, mapped to the paper's section names in `pyq.mapper.ts`.
- `toPyqDto` drops questions flagged `requiresImage` (no images are served yet); papers are labelled "SSC CGL Tier 1 · {year}".
- Data: the 200 PYQs already in Neon (2 CGL papers, 50 per subject) with markdown + LaTeX content. Checked with curl: every subject returns topics and 2 papers.
