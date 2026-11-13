# EptSSC server — NestJS

See `../CLAUDE.md` for product and safety rules that apply everywhere.

## Commands

```bash
npm run start:dev                       # watch mode; locally set PORT=8081 (the client expects it)
npx tsc --noEmit -p tsconfig.build.json
npx eslint --fix src/<area>             # prettier runs through eslint
npx jest src/<area>                     # unit tests
npm run build:deploy                    # what Railway runs: prisma generate && nest build
```

`src/app.controller.spec.ts` and the two `src/sessions/*.spec.ts` are old scaffold tests
that fail; ignore them unless you're fixing them on purpose.

## Layout

- `src/pyqs/` — public PYQ reads (`/pyqs/...`) and full mocks (`/mocks/...`:
  papers, a generated mock, questions by id). `pyq.mapper.ts` turns `Item` rows into DTOs and
  drops image-dependent questions.
- `src/flashcards/` — flashcards and FSRS study deck (cached card lists, 5 min).
- `src/progress/` — account sync: `PUT/GET /me/progress`. `merge.ts` is the single merge
  rule for every synced field (pure, fully tested in `merge.spec.ts`).
- `src/admin/` — content upload, protected by `ADMIN_KEY` (`x-admin-key`), constant-time.
- `src/auth/` — Firebase ID-token guard. Don't weaken it.
- `prisma/schema.prisma` + `prisma/migrations/`.

## Conventions

- Validate every request body/query with class-validator DTOs (global `ValidationPipe` uses
  `whitelist` + `transform`).
- New synced progress fields: add to `ProgressDoc`, `emptyDoc`, `normalizeDoc` (treat input
  as untrusted, cap sizes) and `mergeDocs` (merge must be order-independent), with tests.
- Public endpoints stay read-only. Throttling is global (120/min/IP); tighten per route if a
  route is expensive.
- Migrations: create them locally; **ask before** `prisma migrate deploy` against Neon.
- Never log secrets or full request bodies.
