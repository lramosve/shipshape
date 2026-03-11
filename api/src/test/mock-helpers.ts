import type { QueryResult } from 'pg';

/**
 * Creates a typed mock QueryResult for pg pool.query() mocks.
 * Replaces `{ rows: [...], rowCount: N } as any` throughout test files.
 */
export function mockQueryResult<T extends Record<string, unknown>>(
  rows: T[],
  rowCount?: number
): QueryResult<T> {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}
