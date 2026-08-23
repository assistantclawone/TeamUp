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

// Compact (short-URL) encoding for the people array.
//
// Instead of percent-encoding every field of every person (long URLs), the
// whole people array is serialized into a compact buffer using control-char
// delimiters and then base64url-encoded. This shrinks share URLs dramatically
// while preserving all information. The result is written to the `pc` param so
// that old URLs (which use the plain `p` param) stay fully loadable.
const P2_SEP = '\u001f'; // field separator within a person (unit separator)
const P2_DELIM = '\u001e'; // person separator (record separator)
const ARRAY_DELIM = ',';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Serializes the people array into a compact base64url string (`pc` param).
 * Each person is `id\x1fname\x1frole\x1fmust\x1fcannot\x1fskill\x1fmin\x1fmax\x1fsib`;
 * optional fields are emitted empty when unset. People are joined by `\x1e`.
 */
function compactPeopleToString(people: Person[]): string {
  return people
    .map((p) => {
      const roleArr = Array.isArray(p.role) ? p.role : p.role ? [p.role] : [];
      const fields = [
        p.id || '',
        p.name || '',
        roleArr.join(R_DELIM),
        (p.mustBeWith || []).join(ARRAY_DELIM),
        (p.cannotBeWith || []).join(ARRAY_DELIM),
        p.skill == null ? '' : String(p.skill),
        p.skillMin == null ? '' : String(p.skillMin),
        p.skillMax == null ? '' : String(p.skillMax),
        p.skillSmallerIsBetter == null ? '' : p.skillSmallerIsBetter ? '1' : '0',
      ];
      return fields.join(P2_SEP);
    })
    .join(P2_DELIM);
}

function compactStringToPeople(str: string): Person[] {
  if (!str) return [];
  return str.split(P2_DELIM).map((personStr) => {
    const f = personStr.split(P2_SEP);
    const get = (i: number): string => (f[i] !== undefined ? f[i] : '');
    const roleStr = get(2);
    const role = roleStr ? roleStr.split(R_DELIM).filter(Boolean) : [];
    const person: Person = {
      id: get(0),
      name: get(1),
      role,
      mustBeWith: get(3) ? get(3).split(ARRAY_DELIM).filter(Boolean) : [],
      cannotBeWith: get(4) ? get(4).split(ARRAY_DELIM).filter(Boolean) : [],
      skill: get(5) === '' ? null : Number(get(5)),
      skillMin: get(6) === '' ? null : Number(get(6)),
      skillMax: get(7) === '' ? null : Number(get(7)),
      skillSmallerIsBetter: get(8) === '1' ? true : get(8) === '0' ? false : null,
    };
    return person;
  });
}

export function encodePeopleCompact(people: Person[]): string {
  return toBase64Url(encoder.encode(compactPeopleToString(people)));
}

export function decodePeopleCompact(encoded: string): Person[] {
  try {
    const str = decoder.decode(fromBase64Url(encoded));
    return compactStringToPeople(str);
  } catch {
    return [];
  }
}

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
    // Compact (short) encoding: base64url of the whole people array. This keeps
    // share URLs drastically shorter than the old percent-encoded `p` format.
    params.set('pc', encodePeopleCompact(state.people));
    if (state.people.length === 0) params.delete('p');
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

  // For sharing results, encode the current teams. Each member token is
  // `<id>` or `<id>.<encodedRole>` (the role the member actually has in the
  // generated/result view) so the shared view stays identical to generated
  // teams. History is intentionally NOT serialized (shorter URLs; the receiver
  // reconstructs a fresh single-step history).
  if (state.generatedTeams && state.generatedTeams.length > 0) {
      const teamsStr = state.generatedTeams.map(team =>
          team.map(p => {
              const role = Array.isArray(p.role) ? (p.role[0] || '') : (p.role || '');
              return role ? `${p.id}.${encodeURIComponent(role)}` : p.id;
          }).join(A_DELIM)
      ).join(P_DELIM);
      params.set('teams', teamsStr);
  }
  // Backwards-compatible: if a caller explicitly wants the undo history shared,
  // we still support it (e.g. direct editor links), but share links omit it.
  if (state.history && state.history.length > 0 && (state as any)._includeHistory) {
      const historyStr = state.history.map(hist => hist.map(team => team.map(p => {
          const role = Array.isArray(p.role) ? (p.role[0] || '') : (p.role || '');
          return role ? `${p.id}.${encodeURIComponent(role)}` : p.id;
      }).join(A_DELIM)).join(P_DELIM)).join('~');
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

  // Group result field: per-team scores (auto-applied to members).
  if (state.groupResultScores) {
    const gr = Object.entries(state.groupResultScores)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}:${v}`)
      .join(A_DELIM);
    if (gr) params.set('gr', gr);
  }
  // Individual overrides on top of group scores.
  if (state.personScoreOverrides) {
    const ov = Object.entries(state.personScoreOverrides)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}:${v}`)
      .join(A_DELIM);
    if (ov) params.set('ov', ov);
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
  if (params.has('pc')) {
    // New compact (short-URL) format.
    state.people = decodePeopleCompact(params.get('pc')!);
    for (const p of state.people) peopleMap.set(p.id, p);
  } else if (params.has('p')) {
    // Legacy percent-encoded format (old share links stay loadable).
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
  
  const parseTeamToken = (token: string): { id: string; role: string } => {
    const dotIdx = token.indexOf('.');
    if (dotIdx === -1) return { id: token, role: '' };
    return { id: token.slice(0, dotIdx), role: decodeURIComponent(token.slice(dotIdx + 1)) };
  };

  const reconstructTeams = (teamStr: string): Person[][] => {
    if (!teamStr || peopleMap.size === 0) return [];
    return teamStr.split(P_DELIM).map(teamTokenStr =>
        (teamTokenStr ? teamTokenStr.split(A_DELIM) : []).map(token => {
          const { id, role } = parseTeamToken(token);
          const person = peopleMap.get(id);
          if (person) {
            // Apply the role the member actually has in the shared result, so the
            // result view stays identical to the generated teams.
            return role ? { ...person, role } : { ...person };
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

  // Share links omit the undo history. Build a fresh single-step history so
  // undo/redo stay functional and the current result displays correctly.
  if (!params.has('hist') && state.generatedTeams && state.generatedTeams.length > 0) {
      state.history = [JSON.parse(JSON.stringify(state.generatedTeams))];
      state.historyIndex = 0;
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

  if (params.has('gr')) {
    const gs: { [k: number]: number | null } = {};
    params.get('gr')!.split(A_DELIM).filter(Boolean).forEach(pair => {
      const [k, v] = pair.split(':');
      if (k !== undefined && v !== undefined) gs[Number(k)] = Number(v);
    });
    state.groupResultScores = gs;
  }

  if (params.has('ov')) {
    const os: { [k: string]: number | null } = {};
    params.get('ov')!.split(A_DELIM).filter(Boolean).forEach(pair => {
      const [k, v] = pair.split(':');
      if (k !== undefined && v !== undefined) os[k] = Number(v);
    });
    state.personScoreOverrides = os;
  }

  return state;
}
