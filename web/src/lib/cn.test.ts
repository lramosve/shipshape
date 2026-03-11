import { cn, getContrastTextColor } from './cn';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles empty/undefined inputs', () => {
    expect(cn()).toBe('');
    expect(cn(undefined, null, '')).toBe('');
  });
});

describe('getContrastTextColor', () => {
  it('returns black for white background', () => {
    expect(getContrastTextColor('#ffffff')).toBe('#000000');
  });

  it('returns white for black background', () => {
    expect(getContrastTextColor('#000000')).toBe('#ffffff');
  });

  it('returns white for dark blue', () => {
    expect(getContrastTextColor('#1a237e')).toBe('#ffffff');
  });

  it('returns black for yellow', () => {
    expect(getContrastTextColor('#ffeb3b')).toBe('#000000');
  });

  it('handles shorthand hex (#rgb)', () => {
    expect(getContrastTextColor('#fff')).toBe('#000000');
    expect(getContrastTextColor('#000')).toBe('#ffffff');
  });

  it('handles rgb() format', () => {
    expect(getContrastTextColor('rgb(255, 255, 255)')).toBe('#000000');
    expect(getContrastTextColor('rgb(0, 0, 0)')).toBe('#ffffff');
  });

  it('defaults to black for named colors', () => {
    expect(getContrastTextColor('red')).toBe('#000000');
  });

  it('defaults to black for unparseable rgb', () => {
    expect(getContrastTextColor('rgb(invalid)')).toBe('#000000');
  });
});
