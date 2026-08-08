// Test der Skill-Engine mit Renatos Volleyball-Beispiel.
// Spiel startet bei 3:3, endet 13:9 bzw. 16:10.
import { computeSkillForResult, aggregateSkill } from './skill-engine';
import type { MatchResult, SkillScaling } from './types';

// Renatos Skala: kleiner = besser (1 = beste Note/Skill, 10 = schlechteste)
const scaling: SkillScaling = {
  mode: 'common',
  commonMin: 1,
  commonMax: 10,
  smallerIsBetter: true,
};

const match1: MatchResult = {
  id: 'm1',
  startScore: 3,
  entries: [
    { personId: 'winner', score: 13 }, // Sieger 13:9
    { personId: 'loser', score: 9 },
  ],
};

const match2: MatchResult = {
  id: 'm2',
  startScore: 3,
  entries: [
    { personId: 'winner', score: 16 }, // Sieger 16:10
    { personId: 'loser', score: 10 },
  ],
};

const winner1 = computeSkillForResult(match1, 'winner', scaling);
const loser1 = computeSkillForResult(match1, 'loser', scaling);
const winner2 = computeSkillForResult(match2, 'winner', scaling);
const loser2 = computeSkillForResult(match2, 'loser', scaling);

console.log('=== Volleyball-Test (smallerIsBetter=1..10, Start 3:3) ===');
console.log('Spiel 1 (13:9):  Sieger skill =', winner1, '(erwartet 1)');
console.log('Spiel 1 (13:9):  Verlierer skill =', loser1, `(erwartet ~${(1 + 0.4 * 9).toFixed(2)})  [6 von 10 -> 4.6]`);
console.log('Spiel 2 (16:10): Sieger skill =', winner2, '(erwartet 1)');
console.log('Spiel 2 (16:10): Verlierer skill =', loser2, `(erwartet ~${(1 + 0.4615384615 * 9).toFixed(2)})  [7 von 13 -> 5.15]`);

// Aggregation für einen Spieler über beide Matches
const aggWinner = aggregateSkill('winner', [match1, match2], scaling);
const aggLoser = aggregateSkill('loser', [match1, match2], scaling);
console.log('\nAggregat Sieger über 2 Spiele:', aggWinner, '(erwartet 1.00)');
console.log('Aggregat Verlierer über 2 Spiele:', aggLoser);

// Gegenprobe: grösser = besser (z.B. DE/Sport: 10 = beste)
const scalingBig: SkillScaling = { mode: 'common', commonMin: 1, commonMax: 10, smallerIsBetter: false };
const wBig = computeSkillForResult(match1, 'winner', scalingBig);
const lBig = computeSkillForResult(match1, 'loser', scalingBig);
console.log('\nGegenprobe (grösser=besser, 1..10): Sieger =', wBig, '(erwartet 10), Verlierer =', lBig, '(erwartet ~6.4)');

// Nur Punkte, 0..∞: Start 0, Scores 16 & 10 -> Sieger 1.0, Verlierer 10/16=0.625
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
console.log('\nNur Punkte (Start 0, grösser=besser): a=16 ->', oA, '(10), b=10 ->', oB, '(~6.25)');

// Konsistenz-Checks
const checks: { name: string; ok: boolean }[] = [
  { name: 'Sieger1 = 1', ok: winner1 === 1 },
  { name: 'Sieger2 = 1', ok: winner2 === 1 },
  { name: 'Verlierer1 = 4.6', ok: loser1 === 4.6 },
  { name: 'Aggregat Sieger = 1', ok: aggWinner === 1 },
  { name: 'grösser=besser Sieger = 10', ok: wBig === 10 },
  { name: 'grösser=besser Verlierer = 6.4', ok: lBig === 6.4 },
];

console.log('\n=== Ergebnis-Checks ===');
let allOk = true;
for (const c of checks) {
  console.log(`${c.ok ? '✅' : '❌'} ${c.name}`);
  if (!c.ok) allOk = false;
}
console.log(allOk ? '\nALLE TESTS BESTANDEN ✅' : '\nTESTFEHLER ❌');
