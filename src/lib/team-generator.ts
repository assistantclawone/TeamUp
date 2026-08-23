import { normalizeSkillValue, aggregateSkill } from './skill-engine';
import type { Person, AppState } from './types';

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Check for "cannot be with" conflicts
function isConflict(person: Person, team: Person[], rulesEnabled: boolean): boolean {
    if (!rulesEnabled) return false;
    const teamIds = new Set(team.map(p => p.id));
    
    // Check if person cannot be with anyone currently in the team
    for (const disallowedId of person.cannotBeWith) {
        if (teamIds.has(disallowedId)) return true;
    }

    // Check if anyone in the team cannot be with the new person
    for (const teamMember of team) {
        if (teamMember.cannotBeWith.includes(person.id)) return true;
    }

    return false;
}

// Check if a team is full based on the current generation mode
function isTeamFull(team: Person[], teamIndex: number, state: AppState): boolean {
    if (state.teamGenerationMode === 'peoplePerTeam' && state.peoplePerTeam > 0) {
        return team.length >= state.peoplePerTeam;
    } else if (state.teamGenerationMode === 'variableSizes') {
        return team.length >= state.variableTeamSizes[teamIndex];
    }
    return false;
}

/**
 * Returns the effective skill value for a person normalized to [0, 1].
 * In `results` skill mode the person's skill is derived from their match
 * results via the skill engine (computeSkillForResult/aggregateSkill) instead
 * of the manually entered `person.skill`. Fallback to 0.5 when no skill.
 */
function getPersonSkillNormalized(person: Person, state: AppState): number | null {
  // Derive a skill from match results when results mode is active and results
  // are present. This wires the sport results into the team-balance logic.
  if (state.skillMode === 'results' && state.results && state.results.length > 0) {
    const derived = aggregateSkill(person.id, state.results, state.skillScaling);
    if (derived !== null) {
      const min = person.skillMin ?? state.skillScaling.commonMin;
      const max = person.skillMax ?? state.skillScaling.commonMax;
      const smallerIsBetter = person.skillSmallerIsBetter ?? state.skillScaling.smallerIsBetter;
      return normalizeSkillValue(derived, min, max, smallerIsBetter);
    }
  }

  const s = person.skill;
  if (s === null || s === undefined || Number.isNaN(s)) return null;

  // Use person-specific scaling if available, else common scaling
  const min = person.skillMin ?? state.skillScaling.commonMin;
  const max = person.skillMax ?? state.skillScaling.commonMax;
  const smallerIsBetter = person.skillSmallerIsBetter ?? state.skillScaling.smallerIsBetter;

  return normalizeSkillValue(s, min, max, smallerIsBetter);
}

/**
 * Effective skill for a group/clique. Uses the average of members' skills,
 * or null if none of the members have a skill.
 */
function getGroupSkill(members: Person[], state: AppState): number | null {
  const values = members.map((m) => getPersonSkillNormalized(m, state)).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function generateTeams(
  initialPeople: Person[],
  numTeams: number,
  state: AppState
): Person[][] | string {
    
    if (initialPeople.length === 0) return 'no_people_error';
    if (numTeams <= 0) return 'no_teams_error';

    // Deep copy people to modify their roles for the result without affecting the original state
    const people: Person[] = JSON.parse(JSON.stringify(initialPeople));
    const personMap = new Map(people.map(p => [p.id, p]));
    let unassignedPeople = shuffleArray([...people]);
    const teams: Person[][] = Array.from({ length: numTeams }, () => []);

    // Any skill distribution could require a valid scaling; if invalid we simply
    // fall back to the previous (off) behaviour rather than erroring out.
    const skillMode = state.skillDistribution ?? 'off';

    // --- Step 1: Handle "must be with" constraints (Cliques) ---
    if (state.enableRules) {
        const cliques: Person[][] = [];
        const assignedToClique = new Set<string>();

        for (const person of people) {
            if (assignedToClique.has(person.id)) continue;
            
            const currentClique = new Set<Person>([person]);
            const toProcess = [...person.mustBeWith];
            assignedToClique.add(person.id);

            while (toProcess.length > 0) {
                const partnerId = toProcess.shift();
                if (!partnerId || assignedToClique.has(partnerId)) continue;
                
                const partner = personMap.get(partnerId);
                if (partner) {
                    currentClique.add(partner);
                    assignedToClique.add(partner.id);
                    partner.mustBeWith.forEach(pId => {
                        if (!assignedToClique.has(pId)) toProcess.push(pId);
                    });
                }
            }
            if (currentClique.size > 1) {
                cliques.push(Array.from(currentClique));
            }
        }
        
        cliques.sort((a, b) => b.length - a.length);

        // Sort cliques by skill when balancing so that strong cliques get placed
        // towards the currently weakest teams first.
        const skillCliques = [...cliques];
        if (skillMode === 'balanced') {
            skillCliques.sort((a, b) => {
                const sa = getGroupSkill(a, state) ?? Number.POSITIVE_INFINITY;
                const sb = getGroupSkill(b, state) ?? Number.POSITIVE_INFINITY;
                return sb - sa; // strongest clique first
            });
        } else if (skillMode === 'levels') {
            skillCliques.sort((a, b) => {
                const sa = getGroupSkill(a, state) ?? Number.POSITIVE_INFINITY;
                const sb = getGroupSkill(b, state) ?? Number.POSITIVE_INFINITY;
                return sa - sb; // weakest first
            });
        }

        for (const clique of skillCliques) {
            for (const member of clique) {
                if (clique.some(otherMember => member.cannotBeWith.includes(otherMember.id))) {
                    return `Error: A person in a 'must be with' group cannot be with another person in the same group.`;
                }
            }

            let assigned = false;
            let candidateIndices: number[];

            if (skillMode === 'balanced') {
                // Prefer the currently weakest team (lowest average skill / count).
                candidateIndices = Array.from(teams.keys())
                    .slice()
                    .sort((a, b) => {
                        const avgA = teamAverageNonNull(teams[a], state);
                        const avgB = teamAverageNonNull(teams[b], state);
                        if (avgA === null && avgB === null) return teams[a].length - teams[b].length;
                        if (avgA === null) return -1;
                        if (avgB === null) return 1;
                        return avgB - avgA;
                    });
            } else if (skillMode === 'levels') {
                candidateIndices = Array.from(teams.keys())
                    .slice()
                    .sort((a, b) => teams[a].length - teams[b].length);
            } else {
                candidateIndices = shuffleArray([...teams.keys()]);
            }

            for (const i of candidateIndices) {
                const team = teams[i];
                let teamFullAfterAdd = false;

                if (state.teamGenerationMode === 'peoplePerTeam') {
                    teamFullAfterAdd = (team.length + clique.length) > state.peoplePerTeam;
                } else if (state.teamGenerationMode === 'variableSizes') {
                    teamFullAfterAdd = (team.length + clique.length) > state.variableTeamSizes[i];
                }

                if (teamFullAfterAdd) continue;

                const hasConflict = clique.some(p => isConflict(p, team, state.enableRules));
                if (!hasConflict) {
                    team.push(...clique);
                    unassignedPeople = unassignedPeople.filter(p => !clique.some(c => c.id === p.id));
                    assigned = true;
                    break;
                }
            }

            if (!assigned) {
                return 'cannot_assign_clique_error';
            }
        }
    }

    // --- Step 2: Handle Role Quotas ---
    if (state.enableRoles) {
        const allRoles = Array.from(new Set(people.flatMap(p => Array.isArray(p.role) ? p.role : (p.role ? [p.role] : [])).filter(Boolean)));
        
        for (const role of allRoles) {
            for (let teamIndex = 0; teamIndex < numTeams; teamIndex++) {
                const team = teams[teamIndex];
                const quota = state.roleQuotas[teamIndex]?.[role] || 0;
                
                let currentRoleCount = team.filter(p => p.role === role).length;

                while (currentRoleCount < quota) {
                    if (isTeamFull(team, teamIndex, state)) break;

                    let availablePeopleIndices = unassignedPeople
                        .map((p, i) => i)
                        .filter(i => {
                            const person = unassignedPeople[i];
                            const canBeRole = Array.isArray(person.role) ? person.role.includes(role) : person.role === role;
                            return canBeRole && !isConflict(person, team, state.enableRules);
                        });

                    if (availablePeopleIndices.length === 0) break;

                    // Skill-aware pick within the eligible candidates.
                    let pick = availablePeopleIndices[0];
                    if (skillMode === 'balanced' && pick !== undefined) {
                        const teamAvg = teamAverageNonNull(team, state);
                        let best = availablePeopleIndices[0];
                        let bestScore = Number.POSITIVE_INFINITY;
                        for (const idx of availablePeopleIndices) {
                            const skill = getPersonSkillNormalized(unassignedPeople[idx], state);
                            const score = scoreBalancesTeam(teamAvg, skill);
                            if (score < bestScore) { bestScore = score; best = idx; }
                        }
                        pick = best;
                    } else if (skillMode === 'levels' && pick !== undefined) {
                        const teamAvg = teamAverageNonNull(team, state);
                        let best = availablePeopleIndices[0];
                        let bestDiff = Number.POSITIVE_INFINITY;
                        for (const idx of availablePeopleIndices) {
                            const skill = getPersonSkillNormalized(unassignedPeople[idx], state);
                            const diff = teamAvg === null ? 0 : Math.abs((skill ?? teamAvg) - teamAvg);
                            if (diff < bestDiff) { bestDiff = diff; best = idx; }
                        }
                        pick = best;
                    }

                    if (pick !== undefined) {
                        const [person] = unassignedPeople.splice(pick, 1);
                        person.role = role;
                        team.push(person);
                        currentRoleCount++;
                    } else {
                        break;
                    }
                }
            }
        }
    }

    // --- Step 3: Assign all remaining people ---
    unassignedPeople = shuffleArray(unassignedPeople);

    if (skillMode === 'balanced') {
        // Greedy: assign strong people to the currently weakest team so all
        // teams end up with similar average skill. Persons without a skill are
        // treated as neutral and assigned to the smallest team.
        const ranking = unassignedPeople
            .map((p, i) => ({ p, i, skill: getPersonSkillNormalized(p, state) }))
            .sort((a, b) => (b.skill ?? 0) - (a.skill ?? 0));

        for (const { p: person } of ranking) {
            let bestIdx = -1;
            let bestScore = Number.POSITIVE_INFINITY;

            for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
                const team = teams[teamIndex];
                if (isTeamFull(team, teamIndex, state)) continue;
                if (isConflict(person, team, state.enableRules)) continue;

                const skill = getPersonSkillNormalized(person, state);
                const avg = teamAverageNonNull(team, state);
                const score = scoreBalancesTeam(avg, skill, team.length);
                if (score < bestScore) {
                    bestScore = score;
                    bestIdx = teamIndex;
                }
            }

            if (bestIdx === -1 && teams.length > 0) {
                for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
                    if (!isTeamFull(teams[teamIndex], teamIndex, state)) { bestIdx = teamIndex; break; }
                }
            }

            if (bestIdx !== -1) {
                if (Array.isArray(person.role)) person.role = '';
                teams[bestIdx].push(person);
            }
        }
    } else if (skillMode === 'levels') {
        // Niveau-Gruppen: group people into N level bands (top-N strongest first).
        // With numberOfTeams mode the indices map to team A..N. With peoplePerTeam
        // we just order by band (top band placed first) and fill teams round-robin
        // in band order so that equal-strength people end up together.
        const ranking = unassignedPeople
            .map((p) => ({ p, skill: getPersonSkillNormalized(p, state) }))
            .sort((a, b) => {
                const sa = a.skill ?? Number.NEGATIVE_INFINITY;
                const sb = b.skill ?? Number.NEGATIVE_INFINITY;
                return sb - sa; // strongest first
            });

        // Determine team order. For numberOfTeams we map band index -> team index
        // (strongest -> team A). Otherwise round-robin through teams in order.
        const bands: Person[][] = [];
        const bandSize = Math.max(1, Math.ceil(ranking.length / numTeams));
        for (let b = 0; b < ranking.length; b += bandSize) {
            bands.push(ranking.slice(b, b + bandSize).map((r) => r.p));
        }

        // Flatten bands in order; the person is placed into a preferred team based
        // on their band but respecting capacity/conflicts.
        const teamOrderForBand = (bandIndex: number): number[] => {
            if (state.teamGenerationMode === 'numberOfTeams') {
                // strongest band -> team 0, next -> team 1, etc.
                return [bandIndex % teams.length];
            }
            // peoplePerTeam / variableSizes: iterate teams in index order.
            return Array.from(teams.keys());
        };

        for (let b = 0; b < bands.length; b++) {
            const bandMembers = bands[b];
            for (const person of bandMembers) {
                let assigned = false;
                const order = teamOrderForBand(b);
                let placed = false;
                for (const teamIndex of order) {
                    const team = teams[teamIndex];
                    if (!isTeamFull(team, teamIndex, state) && !isConflict(person, team, state.enableRules)) {
                        if (Array.isArray(person.role)) person.role = '';
                        team.push(person);
                        placed = true;
                        assigned = true;
                        break;
                    }
                }
                if (!placed) {
                    // Fallback: any non-full, non-conflicting team.
                    const anyOrder = Array.from(teams.keys()).sort((a, bb) => teams[a].length - teams[bb].length);
                    for (const teamIndex of anyOrder) {
                        const team = teams[teamIndex];
                        if (!isTeamFull(team, teamIndex, state) && !isConflict(person, team, state.enableRules)) {
                            if (Array.isArray(person.role)) person.role = '';
                            team.push(person);
                            assigned = true;
                            break;
                        }
                    }
                }
                if (!assigned && teams.length > 0) {
                    for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
                        if (!isTeamFull(teams[teamIndex], teamIndex, state)) {
                            if (Array.isArray(person.role)) person.role = '';
                            teams[teamIndex].push(person);
                            break;
                        }
                    }
                }
            }
        }
    } else {
        for (const person of unassignedPeople) {
            if (Array.isArray(person.role)) {
                person.role = '';
            }
            
            const sortedTeamIndices = shuffleArray([...teams.keys()]).sort((a, b) => teams[a].length - teams[b].length);
            
            let assigned = false;
            for (const teamIndex of sortedTeamIndices) {
                const team = teams[teamIndex];
                if (!isTeamFull(team, teamIndex, state) && !isConflict(person, team, state.enableRules)) {
                    team.push(person);
                    assigned = true;
                    break;
                }
            }

            if (!assigned) {
                 if (sortedTeamIndices.length > 0) {
                    teams[sortedTeamIndices[0]].push(person);
                }
            }
        }
    }
  
  return teams.map(team => shuffleArray(team));
}

/** Average skill of a team (normalized 0-1). Null when empty/none. */
function teamAverageNonNull(team: Person[], state: AppState): number | null {
  const values = team.map((p) => getPersonSkillNormalized(p, state)).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Scoring for 'balanced' mode: pick the person/team combination that most
 * reduces the spread. A team with a null average (no skills yet) is treated
 * as fully neutral so strong people get dumped in first.
 */
function scoreBalancesTeam(avg: number | null, skill: number | null, teamSize = 0): number {
  const skillVal = skill ?? avg ?? 0; // treat unskilled as neutral -> matches team avg
  if (avg === null) {
    // Neutral team: prefer smaller teams so sizes stay even too.
    return teamSize;
  }
  return Math.abs(avg - skillVal) + teamSize * 0.01;
}
