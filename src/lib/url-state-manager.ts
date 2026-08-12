import type { AppState, Person, TeamRoleQuota } from './types';
import { ReadonlyURLSearchParams } from 'next/navigation';

// A simple compression scheme for boolean flags
const flagKeys: (keyof AppState)[] = [
  'enableRoles',
  'showRolesInputs',
  'enableRules',
  'showRulesInputs',
  'showResultNumbers',
  'showResultRoles',
  'showRoleQuotaStatus',
  'showSkillScales',
];

const encodeFlags = (state: Partial<AppState>): string => {
  return flagKeys
    .map((key) => (state[key] ? '1' : '0'))
    .join('');
};

const decodeFlags = (flagStr: string): Partial<AppState> => {
  const state: Partial<AppState> = {};
  flagStr.split('').forEach((char, index) => {
    const key = flagKeys[index];
    if (key) {
      (state as Record<string, boolean>)[key] = char === '1';
    }
  });
  return state;
};

const serializeRoleQuotas = (quotas: TeamRoleQuota): string => {
    return Object.entries(quotas)
        .map(([teamIndex, teamQuotas]) => {
            const quotaStr = Object.entries(teamQuotas)
                .filter(([, count]) => count > 0)
                .map(([role, count]) => `${encodeURIComponent(role)},${count}`)
                .join(';');
            return `${teamIndex}:${quotaStr}`;
        })
        .filter(teamStr => teamStr.includes(':'))
        .join('|');
};

const deserializeRoleQuotas = (quotaStr: string): TeamRoleQuota => {
    const quotas: TeamRoleQuota = {};
    if (!quotaStr) return quotas;
    quotaStr.split('|').forEach(teamStr => {
        const [teamIndexStr, rolesStr] = teamStr.split(':');
        if (teamIndexStr && rolesStr) {
            const teamIndex = parseInt(teamIndexStr, 10);
            quotas[teamIndex] = {};
            rolesStr.split(';').forEach(roleStr => {
                const [role, countStr] = roleStr.split(',');
                if (role && countStr) {
                    quotas[teamIndex][decodeURIComponent(role)] = parseInt(countStr, 10);
                }
            });
        }
    });
    return quotas;
};


// Delimiters for structured data
const P_DELIM = '|'; // Person delimiter
const F_DELIM = ';'; // Field delimiter (between name, role, etc.)
const A_DELIM = ','; // Array delimiter (for mustBeWith, cannotBeWith)
const R_DELIM = '.'; // Role array delimiter

export function stateToUrlParams(state: Partial<AppState>): URLSearchParams {
  const params = new URLSearchParams();

  // Simple key-value pairs
  if (state.language) params.set('lang', state.language);
  if (state.numberOfTeams) params.set('numTeams', String(state.numberOfTeams));
  if (state.teamGenerationMode) params.set('genMode', state.teamGenerationMode);
  if (state.peoplePerTeam) params.set('perTeam', String(state.peoplePerTeam));
  
  // Boolean flags
  params.set('flags', encodeFlags(state));
  if (state.highlighting) {
    const highlightFlags = `${state.highlighting.quotaExceeded ? '1' : '0'}${state.highlighting.unassigned ? '1' : '0'}`;
    params.set('hl', highlightFlags);
  }

  // Complex data structures
  if (state.people && state.people.length > 0) {
    const peopleStr = state.people
      .map(p => {
          const roleStr = Array.isArray(p.role) ? p.role.join(R_DELIM) : (p.role || '');
          return [
            p.id,
            p.name,
            roleStr,
            p.mustBeWith.join(A_DELIM),
            p.cannotBeWith.join(A_DELIM),
            p.skill ?? '',
            p.skillMin ?? '',
            p.skillMax ?? '',
            p.skillSmallerIsBetter === true ? '1' : (p.skillSmallerIsBetter === false ? '0' : ''),
          ].map(s => encodeURIComponent(String(s))).join(F_DELIM)
      })
      .join(P_DELIM);
    params.set('p', peopleStr);
  }

  if (state.roles && state.roles.length > 0) {
    params.set('roles', state.roles.map(r => encodeURIComponent(r)).join(A_DELIM));
  }
  
  if (state.variableTeamSizes && state.variableTeamSizes.length > 0) {
      params.set('varSizes', state.variableTeamSizes.join(A_DELIM));
  }

  if (state.roleQuotas && Object.keys(state.roleQuotas).length > 0) {
    const serialized = serializeRoleQuotas(state.roleQuotas);
    if (serialized) {
      params.set('rq', serialized);
    }
  }

  // For sharing results, encode teams, history, and history index
  if (state.generatedTeams && state.generatedTeams.length > 0) {
      const teamsStr = state.generatedTeams.map(team => team.map(p => p.id).join(A_DELIM)).join(P_DELIM);
      params.set('teams', teamsStr);
  }
   if (state.history && state.history.length > 0) {
      const historyStr = state.history.map(hist => hist.map(team => team.map(p => p.id).join(A_DELIM)).join(P_DELIM)).join('~');
      params.set('hist', historyStr);
   }
   if (state.historyIndex !== undefined && state.historyIndex > -1) {
      params.set('hIdx', String(state.historyIndex));
   }


  if (state.skillMode) params.set('sm', state.skillMode);
  if (state.skillDistribution) params.set('sd', state.skillDistribution);
  if (state.skillScaling) {
    const { commonMin, commonMax, smallerIsBetter } = state.skillScaling;
    params.set('ss', `${commonMin},${commonMax},${smallerIsBetter ? '1' : '0'}`);
  }

  if (state.results && state.results.length > 0) {
    const resultsStr = state.results.map(r => {
      const entriesStr = r.entries.map(e => `${e.personId}:${e.score}`).join(A_DELIM);
      return [r.id, encodeURIComponent(r.label || ''), r.startScore, entriesStr].join(F_DELIM);
    }).join(P_DELIM);
    params.set('res', resultsStr);
  }

  return params;
}

export function urlParamsToState(params: ReadonlyURLSearchParams): Partial<AppState> {
  const state: Partial<AppState> = {};

  // Simple key-value pairs
  if (params.has('lang')) state.language = params.get('lang')!;
  if (params.has('numTeams')) state.numberOfTeams = Number(params.get('numTeams'));
  if (params.has('genMode')) state.teamGenerationMode = params.get('genMode') as any;
  if (params.has('perTeam')) state.peoplePerTeam = Number(params.get('perTeam'));

  // Boolean flags
  if (params.has('flags')) {
    Object.assign(state, decodeFlags(params.get('flags')!));
  } else {
    // Default flags if not present
     Object.assign(state, decodeFlags(''));
  }

  if(params.has('hl')) {
    const highlightFlags = params.get('hl')!;
    state.highlighting = {
        quotaExceeded: highlightFlags[0] === '1',
        unassigned: highlightFlags[1] === '1',
    }
  }

  // Complex data structures
  const peopleMap = new Map<string, Person>();
  if (params.has('p')) {
    state.people = params.get('p')!.split(P_DELIM).map(pStr => {
      const parts = pStr.split(F_DELIM).map(s => decodeURIComponent(s));
      const [id, name, roleStr, mustBeWith, cannotBeWith, skill, skillMin, skillMax, smaller] = parts;
      const role = roleStr?.includes(R_DELIM) ? roleStr.split(R_DELIM).filter(Boolean) : (roleStr ? [roleStr] : []);
      const person: Person = {
        id,
        name: name || '',
        role: role,
        mustBeWith: mustBeWith ? mustBeWith.split(A_DELIM).filter(Boolean) : [],
        cannotBeWith: cannotBeWith ? cannotBeWith.split(A_DELIM).filter(Boolean) : [],
        skill: skill === '' ? null : Number(skill),
        skillMin: skillMin === '' ? null : Number(skillMin),
        skillMax: skillMax === '' ? null : Number(skillMax),
        skillSmallerIsBetter: smaller === '1' ? true : (smaller === '0' ? false : null),
      };
      peopleMap.set(id, person);
      return person;
    });
  }

  if (params.has('roles')) {
    state.roles = params.get('roles')!.split(A_DELIM).map(r => decodeURIComponent(r)).filter(Boolean);
  }

  if (params.has('varSizes')) {
      state.variableTeamSizes = params.get('varSizes')!.split(A_DELIM).map(Number);
  }

  if (params.has('rq')) {
      state.roleQuotas = deserializeRoleQuotas(params.get('rq')!);
  }
  
  const reconstructTeams = (teamStr: string): Person[][] => {
    if (!teamStr || peopleMap.size === 0) return [];
    return teamStr.split(P_DELIM).map(teamIdStr =>
        (teamIdStr ? teamIdStr.split(A_DELIM) : []).map(pId => {
          const person = peopleMap.get(pId);
          if (person) {
            return { ...person };
          }
          return undefined;
        }).filter(Boolean) as Person[]
    );
  }

  if (params.has('teams') && peopleMap.size > 0) {
      state.generatedTeams = reconstructTeams(params.get('teams')!);
  }

  if (params.has('hist') && peopleMap.size > 0) {
      state.history = params.get('hist')!.split('~').map(reconstructTeams);
  }
  if (params.has('hIdx')) {
      state.historyIndex = Number(params.get('hIdx'));
  }


  if (params.has('sm')) state.skillMode = params.get('sm') as any;
  if (params.has('sd')) state.skillDistribution = params.get('sd') as any;
  if (params.has('ss')) {
    const [min, max, smaller] = params.get('ss')!.split(',');
    state.skillScaling = {
      mode: 'common',
      commonMin: Number(min),
      commonMax: Number(max),
      smallerIsBetter: smaller === '1',
    };
  }

  if (params.has('res')) {
    state.results = params.get('res')!.split(P_DELIM).map(rStr => {
      const [id, label, start, entriesStr] = rStr.split(F_DELIM);
      return {
        id,
        label: decodeURIComponent(label),
        startScore: Number(start),
        entries: (entriesStr ? entriesStr.split(A_DELIM) : []).map(eStr => {
          const [pId, score] = eStr.split(':');
          return { personId: pId, score: Number(score) };
        }),
      };
    });
  }

  return state;
}
