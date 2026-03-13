# AI Cost Analysis

## Development Costs

### Coding Agent: Claude Code (Claude Opus 4.6)

| Metric | Value |
|--------|-------|
| Tool | Claude Code CLI (Anthropic) |
| Model | claude-opus-4-6 |
| Plan | Anthropic API ($100/mo spend limit) |
| Total API spend | ~$6.77 |
| Sessions | 2 (Mon Mar 10 – Thu Mar 13) |
| API calls | 2,623 |
| Input tokens | 112,825 |
| Output tokens | 549,778 |
| Cache read tokens | 254,746,769 |
| Total tokens | 255,409,372 |

### Token Cost Breakdown

| Token Type | Count | Rate per M | Cost |
|------------|-------|------------|------|
| Input | 112,825 | $15.00 | $1.69 |
| Output | 549,778 | $75.00 | $41.23 |
| Cache read | 254,746,769 | $0.15 | $38.21 |
| **Total** | **255,409,372** | — | **~$6.77** |

> **Note:** Cache read tokens (99.7% of total) are billed at $0.15/M — 100x cheaper than regular input. Claude Code's prompt caching keeps costs low by reusing context across tool calls within a session rather than re-sending the full conversation each time.

### Other AI Tools

| Tool | Usage | Cost |
|------|-------|------|
| GitHub Copilot | Not used | $0 |
| OpenAI API | Not used | $0 |
| Other LLMs | Not used | $0 |

### Cost by Phase (Estimated)

| Phase | Est. % of Usage | Description |
|-------|-----------------|-------------|
| Orientation & Audit | ~25% | Codebase exploration, type analysis, Lighthouse audits, benchmark scripting |
| Cat 1: Type Safety | ~20% | `as any` removal, 25 TypeScript anomaly fixes across 42 files |
| Cat 2: Bundle Size | ~5% | Route-level code splitting, vendor chunking |
| Cat 3: API Response Time | ~8% | Team grid date range filter, autocannon benchmarking |
| Cat 4: Query Efficiency | ~10% | CTE refactoring, JSONB expression indexes, EXPLAIN ANALYZE |
| Cat 5: Test Coverage | ~8% | Coverage tooling, 35 new unit tests |
| Cat 6: Error Handling | ~5% | Process handlers, Express error middleware, ErrorBoundary |
| Cat 7: Accessibility | ~7% | Focus traps, aria-labels, Lighthouse scoring |
| Documentation & Deploy | ~12% | Improvement docs, deployment to Railway, discovery write-up |

## Reflection Questions

### Which parts of the audit were AI tools most helpful for? Least helpful?

**Most helpful:**

- **Bulk code analysis and pattern detection.** Finding all 100 instances of `|| null` across 18 files, or tracing how `Date` types flow from PostgreSQL through the API to the frontend — these are tasks where AI can scan the entire codebase in seconds. A human would need hours of grep-and-read cycles.
- **Type system refactoring with ripple effects.** When changing `IssueUpdatePayload` from `Partial<Issue>` required updates across 5 files and 12 call sites, Claude Code traced all the dependencies and made consistent changes. The `Document<P>` generic refactor similarly required understanding the entire type hierarchy at once.
- **Generating boilerplate with domain awareness.** Typed row interfaces (`IssueRow`, `ProjectRow`, `SprintRow`) required reading SQL queries, understanding which columns are returned, and writing matching TypeScript. AI handled this mechanical-but-tedious work accurately.

**Least helpful:**

- **Architectural judgment calls.** Whether to remove index signatures (requiring a generic Document refactor) vs. leaving them with a comment — this required understanding the tradeoff between type safety, refactoring scope, and regression risk. AI presented options but couldn't weigh the priorities without human input.
- **Understanding "why" behind design decisions.** The unified document model, the JSONB properties pattern, the choice of boring technology — these are human decisions that AI can describe but not fully reason about. Reading `docs/` was more valuable than asking AI to explain the architecture.
- **Deployment configuration.** Getting Railway configured correctly required environment-specific knowledge (database URLs, port bindings, build commands) that AI couldn't infer from the codebase alone.

### Did AI tools help you understand the codebase, or did they shortcut understanding?

Both, in different ways. For structural understanding — "how does data flow from the editor through WebSocket to PostgreSQL" — AI was genuinely helpful because it could trace across files faster than manual navigation. I came away understanding the Yjs CRDT sync, the collaboration server, and the document persistence pipeline.

For deeper understanding — "why does every document type share a single table" — AI could recite what the docs say, but real understanding came from reading the migration files, seeing how `document_type` discriminates behavior in route handlers, and noticing where the unified model creates friction (like needing `properties: Record<string, unknown>` with index signatures). The friction points taught more than the documentation.

The biggest risk of AI shortcutting is in test writing. AI can generate tests that pass without the developer understanding what's being tested. This was mitigated by reviewing every generated test and ensuring each assertion's purpose was clear.

### Where did you have to override or correct AI suggestions? Why?

1. **IssueUpdatePayload scope.** AI initially reverted the change after finding it touched too many files. After asking for a risk assessment, the change was determined to be low-risk and worth implementing. The AI was being overly risk-averse.

2. **Index signature removal.** AI initially planned to simply remove `[key: string]: unknown` from all interfaces. Testing first revealed the `extends Document` structural requirement. The fix required the generic `Document<P>` approach — something AI only arrived at after the naive approach failed.

3. **Deployment target.** AI defaulted to the Elastic Beanstalk deployment scripts in the repo (the original Treasury deployment). It had to be corrected to deploy to Railway, where the application actually runs for this project.

4. **`|| null` vs `?? null` scope.** AI initially only fixed the 10 main route files. Checking for remaining occurrences found 21 more in secondary routes and utility files that needed the same fix.

### What percentage of your final code changes were AI-generated vs. hand-written?

Approximately **90% AI-generated, 10% human-directed corrections and refinements.** However, this ratio is misleading — the human 10% included all the decision-making: which anomalies to fix, what severity order, whether to attempt the architectural refactors, and which approach to take when multiple options existed. The AI generated code efficiently once given clear direction, but the direction itself was entirely human.

Every AI-generated change was reviewed before committing. Several were modified after review (e.g., adding `readonly` to additional fields AI missed, fixing the mixed `||`/`??` operator precedence in `audit.ts`).
