export interface Person {
  id: string;
  name: string;
  role: string | string[]; // Can be a single role or an array of alternative roles
  mustBeWith: string[]; // array of person ids
  cannotBeWith:string[]; // array of person ids
  skill?: number | null; // optional skill level (shared scale). In 'common' scale; null/undefined = unset
}

export interface MatchResultEntry {
  personId: string;
  score: number; // achieved end score, e.g. 13 or 9
}

export interface MatchResult {
  id: string;
  label?: string; // e.g. "Übung 1"
  startScore: number; // starting score, e.g. 3 (for 3:3 -> 3)
  entries: MatchResultEntry[]; // one entry per participating player/team
}

export type SkillScalingMode = 'common' | 'individual';

export interface SkillScaling {
  mode: 'common' | 'individual'; // all share one scale OR individual per player/result
  commonMin: number; // e.g. 1 (CH grade 6=best -> for CN min is best... see inverted scale)
  commonMax: number; // e.g. 6
  smallerIsBetter: boolean; // CH: grade 6 is best (6=best) -> smallerIsBetter=false; DE: 1=best -> true
}

export type SkillMode = 'manual' | 'results';
export type SkillDistribution = 'off' | 'balanced' | 'levels';

export type RoleQuota = {
  [role: string]: number;
};

export type TeamRoleQuota = {
  [teamIndex: number]: RoleQuota;
};

export interface SavedConfig {
    id: string;
    name: string;
    configData: string;
    userId: string;
}

export interface AppState {
  people: Person[];
  roles: string[];
  numberOfTeams: number;
  teamGenerationMode: 'numberOfTeams' | 'peoplePerTeam' | 'variableSizes';
  peoplePerTeam: number;
  variableTeamSizes: number[];
  enableRoles: boolean;
  showRolesInputs: boolean;
  enableRules: boolean;
  showRulesInputs: boolean;
  roleQuotas: TeamRoleQuota;
  generatedTeams: Person[][];
  history: Person[][][];
  historyIndex: number;
  showResultNumbers: boolean;
  showResultRoles: boolean;
  showRoleQuotaStatus: boolean;
  highlighting: {
    quotaExceeded: boolean;
    unassigned: boolean;
  };
  language: string;
  skillScaling: SkillScaling;
  skillMode: SkillMode;
  skillDistribution: SkillDistribution;
  results: MatchResult[];
}
