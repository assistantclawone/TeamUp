
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Settings2, BarChart, ShieldCheck, X, HelpCircle, Eye, EyeOff, PlusCircle, MinusCircle, Copy } from 'lucide-react';
import type { AppState } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import SkillsPanel from './SkillsPanel';


interface SettingsPanelProps {
  state: AppState;
  updateState: (updater: (prevState: AppState) => AppState) => void;
}

export default function SettingsPanel({ state, updateState }: SettingsPanelProps) {
  const { t } = useTranslation();
  
  const allRoles = React.useMemo(() => {
    const rolesFromPeople = state.people.flatMap(p => Array.isArray(p.role) ? p.role : (p.role ? [p.role] : [])).filter(Boolean);
    const rolesFromInput = state.roles;
    return Array.from(new Set([...rolesFromInput, ...rolesFromPeople]));
  }, [state.people, state.roles]);

  const handleRolesChange = (newRole: string) => {
    if (newRole && !state.roles.includes(newRole)) {
      updateState(prev => ({ ...prev, roles: [...prev.roles, newRole] }));
    }
  };
  
  const removeRole = (roleToRemove: string) => {
    updateState(prev => ({ 
        ...prev, 
        roles: prev.roles.filter(role => role !== roleToRemove),
        people: prev.people.map(p => {
          if (Array.isArray(p.role)) {
            return {...p, role: p.role.filter(r => r !== roleToRemove) };
          }
          if (p.role === roleToRemove) {
            return {...p, role: ''};
          }
          return p;
        })
    }));
  };

  const handleRoleQuotaChange = (teamIndex: number, role: string, value: string) => {
    const count = parseInt(value, 10);
    updateState(prev => ({
      ...prev,
      roleQuotas: {
        ...prev.roleQuotas,
        [teamIndex]: {
          ...(prev.roleQuotas[teamIndex] || {}),
          [role]: isNaN(count) || count < 0 ? 0 : count,
        },
      },
    }));
  };
  
  const applyQuotasToAll = (sourceTeamIndex: number) => {
    updateState(prev => {
        const sourceQuotas = prev.roleQuotas[sourceTeamIndex] || {};
        const newRoleQuotas = { ...prev.roleQuotas };
        for (let i = 0; i < numTeamsForQuotas; i++) {
            if (i !== sourceTeamIndex) {
                newRoleQuotas[i] = { ...sourceQuotas };
            }
        }
        return { ...prev, roleQuotas: newRoleQuotas };
    });
  };

  const handleInputFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const SettingSwitch = ({
      id,
      label,
      tooltip,
      icon,
      isLogicEnabled,
      onLogicChange,
      areInputsVisible,
      onInputsVisibleChange
  }: {
      id: string;
      label: string;
      tooltip: string;
      icon: React.ReactNode;
      isLogicEnabled: boolean;
      onLogicChange: (enabled: boolean) => void;
      areInputsVisible: boolean;
      onInputsVisibleChange: (visible: boolean) => void;
  }) => (
    <div className="p-3 rounded-lg border">
        <div className="flex items-center justify-between">
            <Label htmlFor={`${id}-enable-switch`} className="flex items-center gap-2 font-medium">
                {icon}
                {label}
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <button className="focus:outline-none">
                             <HelpCircle className="h-4 w-4 text-muted-foreground" />
                           </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </Label>
            <div className="flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInputsVisibleChange(!areInputsVisible)} disabled={!isLogicEnabled}>
                               {areInputsVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('show_inputs')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <Switch
                    id={`${id}-enable-switch`}
                    checked={isLogicEnabled}
                    onCheckedChange={onLogicChange}
                />
            </div>
        </div>
    </div>
  )

  const handleVariableTeamSizeChange = (index: number, value: string) => {
    const newSizes = [...state.variableTeamSizes];
    newSizes[index] = parseInt(value, 10) || 0;
    updateState(prev => ({...prev, variableTeamSizes: newSizes}));
  }

  const addVariableTeam = () => {
    updateState(prev => ({...prev, variableTeamSizes: [...prev.variableTeamSizes, 2]}));
  }

  const removeVariableTeam = (index: number) => {
    if (state.variableTeamSizes.length <= 1) return;
    const newSizes = [...state.variableTeamSizes];
    newSizes.splice(index, 1);
    updateState(prev => ({...prev, variableTeamSizes: newSizes}));
  }
  
  const getNumberOfTeams = () => {
    if (state.teamGenerationMode === 'variableSizes') {
        return state.variableTeamSizes.length;
    }
    if (state.teamGenerationMode === 'peoplePerTeam') {
        const activePeople = state.people.filter(p => p.name.trim() !== '').length;
        if (state.peoplePerTeam > 0) {
            return Math.ceil(activePeople / state.peoplePerTeam) || 1;
        }
        return 1;
    }
    return state.numberOfTeams;
  }
  
  const numTeamsForQuotas = getNumberOfTeams();


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Settings2 />
          {t('settings')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-lg">{t('team_generation_method')}</Label>
          <RadioGroup
            value={state.teamGenerationMode}
            onValueChange={(value: 'numberOfTeams' | 'peoplePerTeam' | 'variableSizes') => updateState(prev => ({ ...prev, teamGenerationMode: value }))}
            className="grid grid-cols-1 md:grid-cols-3 gap-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="numberOfTeams" id="r1" />
              <Label htmlFor="r1">{t('number_of_teams')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="peoplePerTeam" id="r2" />
              <Label htmlFor="r2">{t('people_per_team')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="variableSizes" id="r3" />
              <Label htmlFor="r3">{t('variable_team_sizes')}</Label>
            </div>
          </RadioGroup>
        </div>

        {state.teamGenerationMode === 'numberOfTeams' && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="num-teams" className="text-base">{t('number_of_teams')}</Label>
            <Input
              id="num-teams"
              type="number"
              min="1"
              value={state.numberOfTeams}
              onChange={(e) => updateState(prev => ({ ...prev, numberOfTeams: parseInt(e.target.value, 10) || 1 }))}
              onFocus={handleInputFocus}
              className="w-24"
            />
          </div>
        )}
        
        {state.teamGenerationMode === 'peoplePerTeam' && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="people-per-team" className="text-base">{t('people_per_team')}</Label>
            <Input
              id="people-per-team"
              type="number"
              min="1"
              value={state.peoplePerTeam}
              onChange={(e) => updateState(prev => ({ ...prev, peoplePerTeam: parseInt(e.target.value, 10) || 1 }))}
              onFocus={handleInputFocus}
              className="w-24"
            />
          </div>
        )}

        {state.teamGenerationMode === 'variableSizes' && (
            <div className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {state.variableTeamSizes.map((size, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                           <Label htmlFor={`variable-team-${index}`}>{t('team')} {index + 1}</Label>
                           <Input
                             id={`variable-team-${index}`}
                             type="number"
                             min="1"
                             value={size}
                             onChange={(e) => handleVariableTeamSizeChange(index, e.target.value)}
                             onFocus={handleInputFocus}
                             className="w-20"
                           />
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeVariableTeam(index)} disabled={state.variableTeamSizes.length <= 1}>
                              <MinusCircle className="h-4 w-4"/>
                           </Button>
                        </div>
                    ))}
                </div>
                <Button onClick={addVariableTeam} variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" /> {t('add_team')}
                </Button>
            </div>
        )}


        <div className="space-y-4 pt-4 border-t">
             <SettingSwitch
                id="rules"
                label={t('constraint_rules')}
                tooltip={t('constraint_rules_explanation')}
                icon={<ShieldCheck className="text-primary"/>}
                isLogicEnabled={state.enableRules}
                onLogicChange={(checked) => {
                    updateState(prev => ({...prev, enableRules: checked, showRulesInputs: checked }))
                }}
                areInputsVisible={state.showRulesInputs}
                onInputsVisibleChange={(visible) => updateState(prev => ({ ...prev, showRulesInputs: visible }))}
            />

            <SettingSwitch
                id="roles"
                label={t('role_quota_logic')}
                tooltip={t('role_quota_explanation')}
                icon={<BarChart className="text-primary"/>}
                isLogicEnabled={state.enableRoles}
                onLogicChange={(checked) => {
                  updateState(prev => ({
                    ...prev,
                    enableRoles: checked,
                    showRolesInputs: checked,
                    showResultRoles: checked ? prev.showResultRoles : false
                  }));
                }}
                areInputsVisible={state.showRolesInputs}
                onInputsVisibleChange={(visible) => {
                    updateState(prev => ({ 
                        ...prev, 
                        showRolesInputs: visible,
                        showResultRoles: visible ? prev.showResultRoles : false,
                    }))
                }}
            />
        </div>

        <SkillsPanel state={state} updateState={updateState} />

        {state.enableRoles && state.showRolesInputs && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">{t('define_roles')}</h3>
             <div className="flex gap-2">
                 <Input 
                    placeholder={t('add_new_role')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleRolesChange(e.currentTarget.value);
                            e.currentTarget.value = '';
                        }
                    }}
                 />
            </div>
            <div className="flex flex-wrap gap-2">
                {state.roles.map(role => (
                     <Badge key={role} variant="secondary" className="pl-3 pr-1 py-1 text-sm">
                        {role}
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => removeRole(role)}>
                           <X className="h-4 w-4"/>
                        </Button>
                    </Badge>
                ))}
            </div>

            <h3 className="font-semibold text-lg mt-4">{t('role_quotas_per_team')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: numTeamsForQuotas }).map((_, teamIndex) => (
                <div key={teamIndex} className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between items-center mb-2">
                     <h4 className="font-bold">{t('team')} {teamIndex + 1}</h4>
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyQuotasToAll(teamIndex)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('apply_to_all_teams')}</p>
                            </TooltipContent>
                        </Tooltip>
                     </TooltipProvider>
                  </div>
                  {allRoles.length > 0 ? allRoles.map(role => (
                    <div key={role} className="flex items-center justify-between">
                      <Label htmlFor={`quota-${teamIndex}-${role}`}>{role}</Label>
                      <Input
                        id={`quota-${teamIndex}-${role}`}
                        type="number"
                        min="0"
                        value={state.roleQuotas[teamIndex]?.[role] || 0}
                        onChange={(e) => handleRoleQuotaChange(teamIndex, role, e.target.value)}
                        onFocus={handleInputFocus}
                        className="w-20 h-8"
                      />
                    </div>
                  )) : <p className="text-sm text-muted-foreground">{t('no_roles_defined')}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    