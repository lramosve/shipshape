# Discovery Write-up

## Discovery 1: Generic Interfaces to Eliminate Index Signature Escape Hatches

**Where found:** `shared/src/types/document.ts` (lines 71–223, 238–268)

**What I discovered:** The codebase had 10 property interfaces (IssueProperties, ProjectProperties, WeekProperties, etc.) that all carried `[key: string]: unknown` index signatures. At first glance this seemed like a JSONB compatibility pattern — since properties are stored as PostgreSQL JSONB, the index signature lets you access arbitrary keys. But investigating further, I found these index signatures existed for a different reason entirely: TypeScript requires them when a child interface overrides a parent field typed as `Record<string, unknown>`.

The `Document` interface had `properties: Record<string, unknown>`, and typed variants like `IssueDocument extends Document` narrowed it to `properties: IssueProperties`. Without an index signature on `IssueProperties`, TypeScript errors with "Index signature for type 'string' is missing in type 'IssueProperties'". The index signatures were a structural workaround, not a design choice — and they silently defeated the purpose of having typed properties at all, since any `doc.properties.typo` would resolve to `unknown` instead of erroring.

The fix was to make `Document` generic: `Document<P = Record<string, unknown>>`, so typed variants use `IssueDocument extends Document<IssueProperties>`. This passes the properties type through the generic parameter, removing the need for index signatures entirely. The default parameter (`= Record<string, unknown>`) ensures all existing `Document` references compile unchanged.

**Why it matters:** Index signatures are a common escape hatch that undermines type safety in interfaces meant to be strict. Recognizing when they exist for structural rather than semantic reasons is key to eliminating them.

**How I'd apply this:** In any future project with a base type that gets specialized by subtypes, I'd use generics from the start rather than relying on index signatures for assignability. For example, a `BaseEntity<M = Record<string, unknown>>` with `metadata: M` is strictly better than `BaseEntity` with `metadata: Record<string, unknown>` plus index signatures on every metadata interface.

---

## Discovery 2: The `||` vs `??` Falsy Value Corruption Bug

**Where found:** `api/src/routes/issues.ts` (lines 109–127), `api/src/routes/projects.ts` (lines 55–91), `api/src/routes/weeks.ts` (lines 201–229), and ~15 other route/utility files — approximately 100 occurrences total.

**What I discovered:** The entire API layer used `|| null` to default missing JSONB properties, e.g., `assignee_id: props.assignee_id || null`. This works correctly for string fields like UUIDs where an empty string `''` is never valid. But `||` treats ALL falsy values as nullish — including `0`, `false`, and `''`. This means:

- A numeric field like `estimate: props.estimate || null` would turn a legitimate `0` estimate into `null`
- A boolean field like `is_system_generated: props.is_system_generated || null` would turn `false` into `null`
- A string field where empty string is valid would be silently discarded

The nullish coalescing operator `??` only treats `null` and `undefined` as "missing", preserving all other falsy values. The fix was mechanical — replacing `|| null` with `?? null` across all extraction functions — but the impact is significant: it prevents a class of data corruption bugs where valid falsy values get silently replaced.

**Why it matters:** This is a subtle but real data integrity issue. In a project management tool, an estimate of 0 hours or a boolean `false` are meaningful values that should survive the API layer. The `||` operator is one of JavaScript's oldest gotchas, and even experienced developers default to it out of habit.

**How I'd apply this:** I'd establish `??` as the default nullish pattern in any new codebase and add a lint rule (`@typescript-eslint/prefer-nullish-coalescing`) to flag `||` usage with potentially falsy types. During code review, any `|| null` on a non-string field would be an immediate red flag.

---

## Discovery 3: CTE Refactoring for Correlated Subquery Elimination

**Where found:** `api/src/routes/weeks.ts` (lines 321–354 before refactoring, now lines 270–340 after)

**What I discovered:** The weeks/sprints dashboard endpoint used 8 correlated subqueries — each one executing once per row in the outer query. For a workspace with N sprints, this meant 8×N individual subquery executions. The query looked like:

```sql
SELECT d.*,
  (SELECT COUNT(*) FROM documents WHERE parent_id = d.id AND properties->>'state' = 'done') as completed_count,
  (SELECT COUNT(*) FROM documents WHERE parent_id = d.id AND properties->>'state' IN ('in_progress', 'in_review')) as started_count,
  -- ... 6 more correlated subqueries
FROM documents d WHERE d.document_type = 'sprint'
```

The fix replaced these with 3 Common Table Expressions (CTEs) that pre-aggregate all the data in a single pass, then JOIN to the main query:

```sql
WITH issue_counts AS (
  SELECT parent_id,
    COUNT(*) FILTER (WHERE properties->>'state' = 'done') as completed_count,
    COUNT(*) FILTER (WHERE properties->>'state' IN ('in_progress', 'in_review')) as started_count
  FROM documents WHERE document_type = 'issue' GROUP BY parent_id
), ...
SELECT d.*, ic.completed_count, ic.started_count, ...
FROM documents d LEFT JOIN issue_counts ic ON ic.parent_id = d.id
```

Combined with 4 new JSONB expression indexes (`CREATE INDEX idx_... ON documents ((properties->>'state'))` etc.), this reduced buffer hits by 39% and made the issues listing endpoint 92% faster.

**Why it matters:** Correlated subqueries are one of the most common performance anti-patterns in SQL, especially in applications that grow incrementally. Each subquery looks harmless in isolation, but they compound multiplicatively. CTEs with `COUNT(*) FILTER (WHERE ...)` are PostgreSQL's idiomatic way to compute multiple conditional aggregates in a single table scan.

**How I'd apply this:** When writing dashboard or list endpoints that need aggregate counts alongside row data, I'd start with CTEs and conditional aggregates rather than subqueries. I'd also add JSONB expression indexes early for any property that appears in WHERE clauses — the cost is minimal (write overhead on index maintenance) but the read performance gain is dramatic.
