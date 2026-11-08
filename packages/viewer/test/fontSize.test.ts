import {
  DEFAULT_FONT_SIZE,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  stepFontSize,
} from '../src/fontSize';
import { BODY_SIZE } from '../src/typography';

describe('stepFontSize', () => {
  it('starts at the body size and moves one pixel at a time', () => {
    expect(DEFAULT_FONT_SIZE).toBe(BODY_SIZE);
    expect(stepFontSize(DEFAULT_FONT_SIZE, 1)).toBe(BODY_SIZE + 1);
    expect(stepFontSize(DEFAULT_FONT_SIZE, -1)).toBe(BODY_SIZE - 1);
  });

  it('stops at both ends instead of wrapping', () => {
    expect(stepFontSize(MIN_FONT_SIZE, -1)).toBe(MIN_FONT_SIZE);
    expect(stepFontSize(MAX_FONT_SIZE, 1)).toBe(MAX_FONT_SIZE);
  });

  it('falls back to the default for an unknown size', () => {
    expect(stepFontSize(13.5, 1)).toBe(DEFAULT_FONT_SIZE + 1);
  });
});
