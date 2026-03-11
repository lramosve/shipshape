import { buildDocumentTree, getAncestorIds } from './documentTree';
import type { WikiDocument } from '@/contexts/DocumentsContext';

function makeDoc(overrides: Partial<WikiDocument> & { id: string }): WikiDocument {
  return {
    title: 'Test Doc',
    parent_id: null,
    position: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    content: null,
    icon: null,
    icon_color: null,
    archived_at: null,
    document_type: 'wiki',
    ...overrides,
  } as WikiDocument;
}

describe('buildDocumentTree', () => {
  it('returns empty array for no documents', () => {
    expect(buildDocumentTree([])).toEqual([]);
  });

  it('returns root nodes for documents without parent_id', () => {
    const docs = [
      makeDoc({ id: '1', title: 'A' }),
      makeDoc({ id: '2', title: 'B' }),
    ];
    const tree = buildDocumentTree(docs);
    expect(tree).toHaveLength(2);
    expect(tree[0].children).toEqual([]);
  });

  it('nests children under their parent', () => {
    const docs = [
      makeDoc({ id: '1', title: 'Parent', position: 0 }),
      makeDoc({ id: '2', title: 'Child', parent_id: '1', position: 0 }),
    ];
    const tree = buildDocumentTree(docs);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('1');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('2');
  });

  it('sorts by position then by created_at descending', () => {
    const docs = [
      makeDoc({ id: '1', title: 'B', position: 1, created_at: '2024-01-02T00:00:00Z' }),
      makeDoc({ id: '2', title: 'A', position: 0, created_at: '2024-01-01T00:00:00Z' }),
      makeDoc({ id: '3', title: 'C', position: 1, created_at: '2024-01-03T00:00:00Z' }),
    ];
    const tree = buildDocumentTree(docs);
    expect(tree[0].id).toBe('2'); // position 0
    expect(tree[1].id).toBe('3'); // position 1, newer created_at
    expect(tree[2].id).toBe('1'); // position 1, older created_at
  });

  it('treats orphaned children (missing parent) as roots', () => {
    const docs = [
      makeDoc({ id: '1', title: 'Orphan', parent_id: 'nonexistent' }),
    ];
    const tree = buildDocumentTree(docs);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('1');
  });
});

describe('getAncestorIds', () => {
  it('returns empty array for root document', () => {
    const docs = [makeDoc({ id: '1' })];
    expect(getAncestorIds(docs, '1')).toEqual([]);
  });

  it('returns parent chain in order (root first)', () => {
    const docs = [
      makeDoc({ id: 'root', parent_id: null }),
      makeDoc({ id: 'mid', parent_id: 'root' }),
      makeDoc({ id: 'leaf', parent_id: 'mid' }),
    ];
    expect(getAncestorIds(docs, 'leaf')).toEqual(['root', 'mid']);
  });

  it('returns empty array for unknown document', () => {
    expect(getAncestorIds([], 'unknown')).toEqual([]);
  });
});
