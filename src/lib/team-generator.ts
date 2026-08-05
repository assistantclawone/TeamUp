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

        for (const clique of cliques) {
            for (const member of clique) {
                if (clique.some(otherMember => member.cannotBeWith.includes(otherMember.id))) {
                    return `Error: A person in a 'must be with' group cannot be with another person in the same group.`;
                }
            }

            let assigned = false;
            const shuffledTeamIndices = shuffleArray([...teams.keys()]);
            for (const i of shuffledTeamIndices) {
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

                    const availablePeopleIndices = unassignedPeople
                        .map((p, i) => i)
                        .filter(i => {
                            const person = unassignedPeople[i];
                            const canBeRole = Array.isArray(person.role) ? person.role.includes(role) : person.role === role;
                            return canBeRole && !isConflict(person, team, state.enableRules);
                        });

                    if (availablePeopleIndices.length > 0) {
                        const randomIndex = availablePeopleIndices[Math.floor(Math.random() * availablePeopleIndices.length)];
                        const [person] = unassignedPeople.splice(randomIndex, 1);
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
  
  return teams.map(team => shuffleArray(team));
}
