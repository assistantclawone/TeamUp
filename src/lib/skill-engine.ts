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
 * Normalizes a skill value to a [0, 1] range where 1 is "best".
 */
export function normalizeSkillValue(
  value: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
  smallerIsBetter: boolean
): number | null {
  if (value === null || value === undefined || min === null || min === undefined || max === null || max === undefined) {
    return value ?? null;
  }
  
  const range = max - min;
  if (range === 0) return 0.5; // Avoid division by zero

  let relativ = (value - min) / range;
  relativ = Math.max(0, Math.min(1, relativ));

  return smallerIsBetter ? 1 - relativ : relativ;
}

/**
 * Computes the skill value for a single person from a single MatchResult.
 * Renato's Option A: normalization uses the actual max score of the match.
 */
export function computeSkillForResult(
  result: MatchResult,
  personId: string,
  scaling: SkillScaling // used for the target output scale
): number | null {
  const entry = result.entries.find((e) => e.personId === personId);
  if (!entry) return null;
  if (result.entries.length === 0) return null;

  const maxScore = Math.max(...result.entries.map((e) => e.score));
  const diff = maxScore - result.startScore;
  if (diff <= 0) return null;

  let relativ = (entry.score - result.startScore) / diff;
  relativ = Math.max(0, Math.min(1, relativ));

  const range = scaling.commonMax - scaling.commonMin;
  let value: number;
  if (scaling.smallerIsBetter) {
    value = scaling.commonMin + (1 - relativ) * range;
  } else {
    value = scaling.commonMin + relativ * range;
  }

  return round2(value);
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
