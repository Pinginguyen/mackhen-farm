export type SensoryScores = { spiciness: number; chewiness: number; aroma: number };

export function normalizeSensoryScores(value: { spiciness?: unknown; chewiness?: unknown; aroma?: unknown }): SensoryScores | null {
  const { spiciness, chewiness, aroma } = value;
  const scores = [spiciness, chewiness, aroma];
  if (scores.some((score) => typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5)) return null;
  return { spiciness: spiciness as number, chewiness: chewiness as number, aroma: aroma as number };
}