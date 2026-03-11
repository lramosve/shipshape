# Category 5: Test Coverage Improvements

## Problem
- No code coverage tooling installed (@vitest/coverage-v8 missing despite being referenced in config)
- Web coverage config absent
- Several core utility modules had zero test coverage

## Changes

### 1. Coverage Tooling
- Installed `@vitest/coverage-v8` as dev dependency
- Added coverage config to `web/vitest.config.ts` (provider: v8, reporters: text + html)
- API already had coverage config — now both packages can generate reports

### 2. New Unit Tests (35 test cases)

**`web/src/lib/cn.test.ts`** (12 tests)
- `cn()` class merging, conditional classes, Tailwind conflict resolution
- `getContrastTextColor()` — WCAG luminance calculations for hex, shorthand hex, rgb(), named colors, edge cases

**`web/src/lib/date-utils.test.ts`** (12 tests)
- `formatDate()` — null handling, just now, minutes/hours/days ago, formatted date
- `formatRelativeTime()` — same time buckets
- `formatDateRange()` — same-month compact, cross-month, Date object inputs

**`web/src/lib/documentTree.test.ts`** (8 tests)
- `buildDocumentTree()` — empty input, root nodes, parent-child nesting, sort order, orphan handling
- `getAncestorIds()` — root doc, multi-level chain, unknown doc

**`web/src/hooks/useFocusTrap.test.ts`** (3 tests)
- Ref creation, inactive state, focus restoration on deactivation

## Before/After

| Metric | Before | After |
|--------|--------|-------|
| @vitest/coverage-v8 installed | No | Yes |
| Web coverage config | None | v8 + text/html reporters |
| Web test files | 11 | 15 |
| Web test cases | 151 | 186 |
| Tested utility modules | 2/5 | 5/5 |
