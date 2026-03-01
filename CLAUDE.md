# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PrepZero is a placement testing and proctoring platform built with Next.js 16 (App Router). It supports three user roles (SUPER_ADMIN, COLLEGE_ADMIN, STUDENT) managing colleges, placement drives, tests, and proctored test attempts with code execution via Judge0.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Sync Prisma schema to database
npm run db:generate  # Regenerate Prisma client (after schema changes)
npm run db:seed      # Seed database with test data (tsx prisma/seed.ts)
npm run db:create-admin  # Create super admin: tsx prisma/create-admin.ts <name> <email> <password>
```

No test framework is configured. There are utility scripts in `scripts/` run via `tsx scripts/<name>.ts`:
- `add-student.ts` — Add a single student to a college
- `fetch-data.ts` — Dump all users, colleges, drives, and tests from the database
- `register-college-admin.ts` — Register a college admin via API

Judge0 (code execution engine for coding questions):
```bash
docker compose up -d   # Start Judge0 services (server, workers, postgres, redis)
```

## Architecture

### Tech Stack
- **Next.js 16** with App Router, React 19, TypeScript 5
- **Prisma 7** with PostgreSQL (Neon cloud DB) via `PrismaPg` driver adapter (not the default Prisma engine)
- **Better Auth** for session-based authentication with email/password
- **shadcn/ui** (new-york style) + Tailwind CSS 4 + Radix UI
- **Judge0** (Docker) for sandboxed code execution (Python, Java, C, C++)
- **Monaco Editor** for in-browser coding questions

### Route Structure
- `src/app/(auth)/` — Public auth pages (login, register, register/student)
- `src/app/(dashboard)/admin/` — Super admin dashboard
- `src/app/(dashboard)/college/` — College admin dashboard
- `src/app/(dashboard)/student/` — Student dashboard
- `src/app/test/[testId]/` — Test-taking interface (separate from dashboard, uses proctoring)
- `src/app/api/` — REST API routes (see API Route Patterns below)

### Key Modules
- `src/lib/auth.ts` — Better Auth config with Prisma adapter; extends User with `role` and `collegeId` fields
- `src/lib/auth-client.ts` — Client-side auth helpers (`signIn`, `signUp`, `signOut`, `useSession`)
- `src/lib/auth-guard.ts` — Server-side helpers: `getSession()`, `requireAuth()`, `requireRole(role)`, `getRoleRedirect(role)`
- `src/lib/judge0.ts` — Code execution: `executeCode()` for single runs, `executeBatch()` for test case validation with polling. Language IDs: PYTHON→71, JAVA→62, C→50, CPP→54
- `src/lib/prisma.ts` — Prisma client singleton using `PrismaPg` driver adapter (not the default Prisma engine)
- `src/lib/csv-parser.ts` / `src/lib/student-csv-parser.ts` — CSV parsing for bulk student import with USN-based department extraction
- `src/middleware.ts` — Route protection; checks `better-auth.session_token` cookie, redirects unauthenticated users to `/login`
- `src/hooks/use-proctoring.ts` — Client-side proctoring hook tracking tab switches, fullscreen exits, copy/paste, right-click, keyboard shortcuts

### Database Schema
Defined in `prisma/schema.prisma`. Prisma client output goes to `src/generated/prisma`. Key models: User, College, Department, PlacementDrive, Test, Question, TestAttempt, Answer, TestCase. Import types from `@/generated/prisma/client`.

Key enums: `Role` (SUPER_ADMIN, COLLEGE_ADMIN, STUDENT), `QuestionType` (SINGLE_SELECT, MULTI_SELECT, CODING), `DriveStatus` (DRAFT, UPCOMING, ACTIVE, COMPLETED, CANCELLED), `TestStatus` (DRAFT, PUBLISHED, CLOSED), `AttemptStatus` (IN_PROGRESS, SUBMITTED, TIMED_OUT), `CodingLanguage` (PYTHON, JAVA, C, CPP).

Question `options` and `correctOptionIds` are JSON fields. `options` stores `Array<{id: string, text: string}>`, `correctOptionIds` stores `string[]`. Answer `selectedOptionIds` follows the same `string[]` pattern. TestAttempt has a `@@unique([testId, studentId])` constraint (one attempt per student per test).

### Authentication & Authorization
- Middleware checks `better-auth.session_token` (dev) or `__Secure-better-auth.session_token` (prod) cookie on all non-public routes
- Public paths: `/`, `/login`, `/register`, `/register/student`, `/api/auth/**`
- Dashboard layouts enforce roles at the layout level via `requireRole()` — unauthorized users are redirected to `/login`
- Role-based access: API routes filter by user role and `collegeId`
- Role redirects: SUPER_ADMIN → `/admin`, COLLEGE_ADMIN → `/college`, STUDENT → `/student`

### API Route Patterns
- Next.js 16 dynamic route params are `Promise<>` — must `await params` before using:
  ```typescript
  type RouteParams = { params: Promise<{ testId: string }> };
  export async function GET(req: NextRequest, { params }: RouteParams) {
    const { testId } = await params;
  }
  ```
- API routes use role-based filtering: STUDENT sees own data, COLLEGE_ADMIN sees their college's data, SUPER_ADMIN sees all
- Request bodies are validated with Zod `schema.safeParse(body)`

Key API endpoints:
- `/api/auth/**` — Better Auth + custom `/register-college-admin`, `/register-student`
- `/api/colleges` — CRUD + `[collegeId]/usn-structure`
- `/api/departments` — CRUD scoped to college
- `/api/drives` — CRUD for placement drives
- `/api/tests` — CRUD + `[testId]/questions` (CRUD + bulk), `[testId]/start`, `[testId]/submit`
- `/api/students` — CRUD + `/bulk`, `/profile`, `/search`
- `/api/attempts` — CRUD + `[attemptId]/answers`, `[attemptId]/run` (code execution), `[attemptId]/violations`
- `/api/stats` — Aggregated dashboard stats

### Conventions
- Path alias: `@/*` maps to `src/*`
- Pages default to React Server Components; use `"use client"` only when needed
- Server pages query Prisma directly; client mutations go through API routes
- Forms use React Hook Form + Zod for validation
- shadcn/ui components live in `src/components/ui/`; add new ones via `npx shadcn@latest add <component>`
- `src/components/test/test-interface.tsx` is the core test-taking component (proctoring, timer, question rendering, code editor, submission)
- Toast notifications use `sonner` (`toast.success()`, `toast.error()`)
- IDs generated with `nanoid`; dates handled with `date-fns`

### Environment Variables
Required in `.env`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `JUDGE0_API_URL` (default `http://localhost:2358` for local Docker). Optional: `JUDGE0_API_KEY` (only for RapidAPI-hosted Judge0).

### Seed Data
`npm run db:seed` creates test accounts for development:
- Super Admin: `admin@prepzero.com` / `admin123456`
- College Admin: `college@demo.com` / `college123456`
- Student: `student@demo.com` / `student123456`
- College code: `DEMO2026`

Also creates a sample placement drive, test, and questions.
