import { formatDate, formatRelativeTime, formatDateRange } from './date-utils';

describe('formatDate', () => {
  it('returns "Unknown date" for null input', () => {
    expect(formatDate(null)).toBe('Unknown date');
  });

  it('returns "Just now" for dates less than 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(formatDate(now)).toBe('Just now');
  });

  it('returns minutes ago for recent dates', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatDate(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours ago for dates within 24h', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatDate(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago for dates within 7 days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
    expect(formatDate(twoDaysAgo)).toBe('2d ago');
  });

  it('returns formatted date for dates older than 7 days', () => {
    const result = formatDate('2024-01-15T12:00:00Z');
    expect(result).toMatch(/Jan 15/);
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for very recent dates', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelativeTime(tenMinAgo)).toBe('10m ago');
  });

  it('returns hours ago', () => {
    const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(sixHoursAgo)).toBe('6h ago');
  });
});

describe('formatDateRange', () => {
  it('formats same-month range compactly', () => {
    expect(formatDateRange('2024-01-06', '2024-01-12')).toBe('Jan 6-12');
  });

  it('formats cross-month range with both month names', () => {
    expect(formatDateRange('2024-01-30', '2024-02-05')).toBe('Jan 30 - Feb 5');
  });

  it('accepts Date objects', () => {
    const start = new Date(2024, 2, 1); // March 1
    const end = new Date(2024, 2, 7);   // March 7
    expect(formatDateRange(start, end)).toBe('Mar 1-7');
  });
});
