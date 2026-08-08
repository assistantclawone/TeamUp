import type { MatchResult, SkillScaling } from './types';

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Computes the skill value for a single person from a single MatchResult.
 *
 * Renato's volleyball logic:
 * - diff = maxFinalScore - startScore. If diff <= 0 the result is invalid (no one could win).
 * - relativ = (personScore - startScore) / diff, clamped to [0,1]. Winner -> 1, loser(s) lower.
 * - Direction:
 *   - smallerIsBetter=false (bigger scale value is better, e.g. DE 6=best): skill = commonMin + relativ * (commonMax - commonMin)
 *   - smallerIsBetter=true  (smaller scale value is better, e.g. DE school grade 1=best): skill = commonMin + (1 - relativ) * (commonMax - commonMin)
 *   Winner therefore always gets the BEST value on the chosen scale.
 *
 * @returns rounded skill value, or null if the person does not participate or the match is invalid.
 */
export function computeSkillForResult(
  result: MatchResult,
  personId: string,
  scaling: SkillScaling
): number | null {
  const entry = result.entries.find((e) => e.personId === personId);
  if (!entry) return null;

  if (result.entries.length === 0) return null;

  const maxScore = Math.max(...result.entries.map((e) => e.score));
  const diff = maxScore - result.startScore;
  if (diff <= 0) return null;

  let relativ = (entry.score - result.startScore) / diff;
  // Clamp winner to exactly 1 even when a score overshoots maxScore tie handling.
  relativ = clamp(relativ, 0, 1);

  const range = scaling.commonMax - scaling.commonMin;
  let value: number;
  if (scaling.smallerIsBetter) {
    value = scaling.commonMin + (1 - relativ) * range;
  } else {
    value = scaling.commonMin + relativ * range;
  }

  return round2(clamp(value, Math.min(scaling.commonMin, scaling.commonMax), Math.max(scaling.commonMin, scaling.commonMax)));
}

/**
 * Aggregates the skill for a person across all results they participate in.
 * Simple (unweighted) average. Returns null if the person appears in no results.
 */
export function aggregateSkill(
  personId: string,
  results: MatchResult[],
  scaling: SkillScaling
): number | null {
  const values: number[] = [];
  for (const result of results) {
    const v = computeSkillForResult(result, personId, scaling);
    if (v !== null) values.push(v);
  }
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return round2(sum / values.length);
}

/**
 * Validates the scaling configuration.
 * @returns an error string if invalid, otherwise null.
 */
export function validateScaling(scaling: SkillScaling): string | null {
  if (scaling.commonMin === 0 && scaling.commonMax === 0) {
    return 'skill_scale_invalid_zero';
  }
  if (scaling.commonMin >= scaling.commonMax) {
    return 'skill_scale_invalid_range';
  }
  return null;
}
