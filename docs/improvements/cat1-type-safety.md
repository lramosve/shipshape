# Category 1: Type Safety Improvements

## Problem
160 `as any` type casts across the codebase, primarily in test files mocking `pg.QueryResult` objects and in production code with mismatched array types. These bypass TypeScript's type checker, hiding potential type errors.

## Changes

### 1. Production Code Fix (`api/src/routes/issues.ts`)
- Widened `params` array type from `(string | boolean | null)[]` to `(string | string[] | boolean | null)[]`
- Removed `as any` cast when pushing `string[]` for PostgreSQL `ANY()` clause

### 2. Typed Mock Helper (`api/src/test/mock-helpers.ts`)
- Created `mockQueryResult<T>()` helper that returns a properly typed `pg.QueryResult<T>`
- Provides `rows`, `rowCount`, `command`, `oid`, `fields` — all required fields
- Replaces `{ rows: [...] } as any` pattern used throughout test files

### 3. Test File Cleanup (6 files, 149 casts removed)
Applied `mockQueryResult()` or removed `as any` from:
- `api/src/__tests__/auth.test.ts` — 24 → 0 casts
- `api/src/__tests__/activity.test.ts` — 20 → 0 casts (also fixed mock middleware types)
- `api/src/__tests__/transformIssueLinks.test.ts` — 28 → 0 casts (added `TipTapNode` interface)
- `api/src/services/accountability.test.ts` — 32 → 0 casts
- `api/src/routes/issues-history.test.ts` — 20 → 1 cast (pool.connect mock unavoidable)
- `api/src/routes/projects.test.ts` — 17 → 0 casts
- `api/src/routes/iterations.test.ts` — 9 → 0 casts

## Before/After

| Metric | Before | After |
|--------|--------|-------|
| Total `as any` casts | 160 | 11 |
| Production code casts | 1 | 0 |
| Test file casts (API) | 150 | 1 |
| Remaining (web/e2e) | 9 | 10 (includes new mock-helpers.ts) |

## Testing
- All 451 API tests pass
- All 15 auth tests pass after removing 24 `as any` casts
- No type errors introduced
