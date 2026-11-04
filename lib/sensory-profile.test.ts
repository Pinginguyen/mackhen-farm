import { describe, expect, it } from 'vitest';
import { normalizeSensoryScores } from './sensory-profile';

describe('normalizeSensoryScores', () => {
  it('keeps the scores saved for the product', () => {
    expect(normalizeSensoryScores({ spiciness: 2, chewiness: 4, aroma: 5 })).toEqual({ spiciness: 2, chewiness: 4, aroma: 5 });
  });

  it('accepts the inclusive one-to-five range', () => {
    expect(normalizeSensoryScores({ spiciness: 1, chewiness: 5, aroma: 1 })).toEqual({ spiciness: 1, chewiness: 5, aroma: 1 });
  });

  it('hides the meter data when any score is missing or out of range', () => {
    expect(normalizeSensoryScores({ spiciness: 3, chewiness: 4 })).toBeNull();
    expect(normalizeSensoryScores({ spiciness: 6, chewiness: 4, aroma: 5 })).toBeNull();
  });
});