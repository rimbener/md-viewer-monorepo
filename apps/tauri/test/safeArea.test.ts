import { setSafeArea } from '../src/safeArea';

describe('setSafeArea', () => {
  it('sets each given edge in pixels, and skips the rest', () => {
    setSafeArea({ top: 24, bottom: 48 });

    const style = document.documentElement.style;
    expect(style.getPropertyValue('--safe-area-top')).toBe('24px');
    expect(style.getPropertyValue('--safe-area-bottom')).toBe('48px');
    expect(style.getPropertyValue('--safe-area-left')).toBe('');
  });
});
