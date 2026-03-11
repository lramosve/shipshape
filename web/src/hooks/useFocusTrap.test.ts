import { renderHook } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

describe('useFocusTrap', () => {
  it('returns a ref object', () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current).toHaveProperty('current');
  });

  it('does not trap focus when inactive', () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current.current).toBeNull();
  });

  it('restores focus when deactivated', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const { rerender } = renderHook(
      ({ active }) => useFocusTrap(active),
      { initialProps: { active: true } }
    );

    // Deactivate trap - should restore focus
    rerender({ active: false });
    expect(document.activeElement).toBe(button);

    document.body.removeChild(button);
  });
});
