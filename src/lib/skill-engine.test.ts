import { describe, it, expect } from 'vitest';
import { computeSkillForResult, aggregateSkill } from './skill-engine';
import type { MatchResult, SkillScaling } from './types';

describe('Skill Engine', () => {
  // Renatos Skala: kleiner = besser (1 = beste Note/Skill, 10 = schlechteste)
  const scaling: SkillScaling = {
    mode: 'common',
    commonMin: 1,
    commonMax: 10,
    smallerIsBetter: true,
  };

  it('calculates volleyball results correctly (smallerIsBetter)', () => {
    const match1: MatchResult = {
      id: 'm1',
      startScore: 3,
      entries: [
        { personId: 'winner', score: 13 }, // Sieger 13:9
        { personId: 'loser', score: 9 },
      ],
    };

    const winner1 = computeSkillForResult(match1, 'winner', scaling);
    const loser1 = computeSkillForResult(match1, 'loser', scaling);

    expect(winner1).toBe(1);
    // (9-3)/(13-3) = 0.6 relative. 
    // smallerIsBetter: 1 + (1-0.6)*(10-1) = 1 + 0.4*9 = 4.6
    expect(loser1).toBe(4.6);
  });

  it('calculates volleyball results correctly (largerIsBetter)', () => {
    const scalingBig: SkillScaling = { 
      mode: 'common', 
      commonMin: 1, 
      commonMax: 10, 
      smallerIsBetter: false 
    };
    
    const match1: MatchResult = {
      id: 'm1',
      startScore: 3,
      entries: [
        { personId: 'winner', score: 13 },
        { personId: 'loser', score: 9 },
      ],
    };

    const wBig = computeSkillForResult(match1, 'winner', scalingBig);
    const lBig = computeSkillForResult(match1, 'loser', scalingBig);

    expect(wBig).toBe(10);
    // (9-3)/(13-3) = 0.6 relative.
    // largerIsBetter: 1 + 0.6*9 = 6.4
    expect(lBig).toBe(6.4);
  });

  it('aggregates skills across multiple matches', () => {
    const match1: MatchResult = {
      id: 'm1',
      startScore: 3,
      entries: [
        { personId: 'winner', score: 13 },
        { personId: 'loser', score: 9 },
      ],
    };

    const match2: MatchResult = {
      id: 'm2',
      startScore: 3,
      entries: [
        { personId: 'winner', score: 16 },
        { personId: 'loser', score: 10 },
      ],
    };

    const aggWinner = aggregateSkill('winner', [match1, match2], scaling);
    const aggLoser = aggregateSkill('loser', [match1, match2], scaling);

    expect(aggWinner).toBe(1);
    // loser1 = 4.6
    // loser2: (10-3)/(16-3) = 7/13 approx 0.538 relative.
    // skill2: 1 + (1-0.53846)*9 = 1 + 0.46154*9 = 1 + 4.1538 = 5.15
    // avg: (4.6 + 5.15) / 2 = 4.875 -> 4.88
    expect(aggLoser).toBe(4.88);
  });

  it('handles open scale (start 0, largerIsBetter)', () => {
    const scalingBig: SkillScaling = { 
        mode: 'common', 
        commonMin: 1, 
        commonMax: 10, 
        smallerIsBetter: false 
    };
    const matchOpen: MatchResult = {
      id: 'm3',
      startScore: 0,
      entries: [
        { personId: 'a', score: 16 },
        { personId: 'b', score: 10 },
      ],
    };
    const oA = computeSkillForResult(matchOpen, 'a', scalingBig);
    const oB = computeSkillForResult(matchOpen, 'b', scalingBig);

    expect(oA).toBe(10);
    // 10/16 = 0.625 relative. 1 + 0.625*9 = 1 + 5.625 = 6.63
    expect(oB).toBe(6.63);
  });
});
