# Category 4: Database Query Efficiency Improvements

## Improvement 1: Refactor Correlated Subqueries in Weeks Endpoint

**File:** `api/src/routes/weeks.ts`

**What changed:** Replaced 8 correlated subqueries with 3 CTEs (Common Table Expressions) that pre-aggregate data and JOIN to the main query.

**Why the original code was suboptimal:** The query had 8 correlated subqueries that each executed once per sprint row (35 sprints = 35 loops per subquery). Three of the subqueries (issue_count, completed_count, started_count) scanned the same `documents JOIN document_associations` join independently, tripling the work. Two more subqueries (retro_outcome, retro_id) also duplicated the same join. This resulted in 4,435 buffer hits for 35 rows.

**Why this approach is better:** CTEs pre-aggregate the data once (single pass over each table), then the main query joins the pre-computed results. This eliminates the per-row re-execution pattern.

- `issue_stats` CTE: Single pass aggregates all three issue counts (total, done, in_progress) using `COUNT(*) FILTER (WHERE ...)` instead of 3 separate subqueries
- `plan_exists` CTE: Single pass to find all sprints with weekly plans
- `retro_info` CTE: Single pass with `DISTINCT ON` to get retro outcome and id
- `owner_reports_to`: Converted from correlated subquery to a simple LEFT JOIN

**Tradeoffs:** CTEs in PostgreSQL are optimization fences in versions < 12. However, PostgreSQL 12+ (we use 16) can inline CTEs when beneficial. The CTEs also scan the full association table rather than just the matching sprint, which is acceptable at current data volumes (297 associations) but would need monitoring at scale.

### Before/After (EXPLAIN ANALYZE with 671 docs, 404 issues, 35 sprints)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Execution Time | 2.190 ms | 2.113 ms | ~4% faster |
| Buffer Hits | 4,435 | 133 | **97% reduction** |
| Planning Time | 1.672 ms | 1.703 ms | Similar |
| SubPlans | 5 (each 35 loops) | 0 | **Eliminated** |
| Query structure | 8 correlated subqueries | 3 CTEs + 3 LEFT JOINs | Batch processing |
| Index scans per row | 297 per subplan (×5) | 0 (hash joins) | Eliminated |

The buffer hit reduction from 4,435 to 133 (97%) means the query reads ~33x fewer pages from the buffer pool. At production scale with more sprints and issues, this difference compounds.

---

## Improvement 2: Add JSONB Expression Indexes

**File:** `api/src/db/migrations/038_add_jsonb_expression_indexes.sql`

**What changed:** Added 4 expression indexes on commonly filtered JSONB property fields:

1. `idx_documents_properties_state` — on `properties->>'state'` WHERE `document_type = 'issue'`
2. `idx_documents_properties_assignee_id` — on `properties->>'assignee_id'` WHERE NOT NULL
3. `idx_documents_properties_sprint_number` — on `(properties->>'sprint_number')::int` WHERE `document_type = 'sprint'`
4. `idx_documents_properties_owner_id` — on `properties->>'owner_id'` WHERE NOT NULL

**Why the original code was suboptimal:** Multiple queries filter on JSONB properties (e.g., `WHERE properties->>'state' = 'done'`, `WHERE (properties->>'sprint_number')::int = $2`) but only had a GIN index on the full `properties` column. GIN indexes don't optimize `->>'key'` accessor queries with equality filters, causing sequential scans on all 671 documents.

**Why this approach is better:** Expression indexes allow PostgreSQL to use index scans instead of sequential scans for these common filter patterns. The partial index conditions (e.g., `WHERE document_type = 'issue'`) keep the indexes small and maintenance cheap.

**Tradeoffs:** 4 additional indexes add minor write overhead on INSERT/UPDATE. Each index is partial (filtered), keeping them small. The indexes are only beneficial for queries that match their exact expression — callers must use the same expression (e.g., `properties->>'state'` not `properties->'state'`).

### Before/After

| Metric | Before | After |
|--------|--------|-------|
| Expression indexes on JSONB fields | 0 | 4 |
| Issue state filter | Sequential scan (404 rows, 267 filtered) | Index scan available |
| Sprint number filter | Sequential scan on all sprints | Index scan on sprint_number |
| Assignee filter | Sequential scan (671 rows) | Index scan available |
| API test suite | 451 passed, 0 failed | 451 passed, 0 failed |
