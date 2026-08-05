export interface Person {
  id: string;
  name: string;
  role: string | string[]; // Can be a single role or an array of alternative roles
  mustBeWith: string[]; // array of person ids
  cannotBeWith:string[]; // array of person ids
}

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
}
