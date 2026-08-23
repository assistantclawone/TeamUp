'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, PlusCircle, Trash2, HelpCircle, Copy, Users, ClipboardList } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AppState, MatchResult, Person } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';

interface SkillsPanelProps {
  state: AppState;
  updateState: (updater: (prevState: AppState) => AppState) => void;
}

export default function SkillsPanel({ state, updateState }: SkillsPanelProps) {
  const { t } = useTranslation();

  const setScaling = (patch: Partial<AppState['skillScaling']>) => {
    updateState(prev => ({ ...prev, skillScaling: { ...prev.skillScaling, ...patch } }));
  };

  // Update one person's skill-relevant field.
  const setPersonSkillField = (personId: string, field: keyof Pick<Person, 'skill' | 'skillMin' | 'skillMax'>, value: string) => {
    const num = value === '' ? null : Number(value);
    const parsed = Number.isNaN(num as number) ? null : num;
    updateState(prev => ({
      ...prev,
      people: prev.people.map(p => (p.id === personId ? { ...p, [field]: parsed } : p)),
    }));
  };

  const setPersonDirection = (personId: string, value: boolean) => {
    updateState(prev => ({
      ...prev,
      people: prev.people.map(p => (p.id === personId ? { ...p, skillSmallerIsBetter: value } : p)),
    }));
  };

  /**
   * Apply a skill field value to a group of people.
   * scope: 'team' will be resolved by the caller into an explicit id list.
   */
  const applyToPeople = (
    ids: string[],
    field: keyof Pick<Person, 'skill' | 'skillMin' | 'skillMax' | 'skillSmallerIsBetter'>,
    value: string | boolean | number | null
  ) => {
    const idSet = new Set(ids);
    updateState(prev => ({
      ...prev,
      people: prev.people.map(p => {
        if (!idSet.has(p.id)) return p;
        if (field === 'skill' || field === 'skillMin' || field === 'skillMax') {
          const val = typeof value === 'string' ? (value === '' ? null : Number(value)) : value;
          return { ...p, [field]: Number.isNaN(val as number) ? null : (val as number | null) };
        }
        return { ...p, [field]: !!value };
      }),
    }));
  };

  const activePeople = state.people.filter(p => p.name.trim() !== '');
  // For "apply to team" we apply to the people who are in the same team as the
  // person being edited. Since teams are generated, we apply to all active people
  // that share the same team label in the last generated result.
  const teamOfPerson = (personId: string): string[] => {
    const team = state.generatedTeams.find(team => team.some(m => m.id === personId));
    if (team) return team.map(m => m.id);
    return [personId];
  };
  const allActiveIds = activePeople.map(p => p.id);

  const addMatch = () => {
    updateState(prev => ({
      ...prev,
      results: [
        ...prev.results,
        {
          id: `m${Date.now().toString(36)}${Math.floor(Math.random() * 36).toString(36)}`,
          label: '',
          startScore: 0,
          entries: [],
        } as MatchResult,
      ],
    }));
  };

  const removeMatch = (id: string) => {
    updateState(prev => ({ ...prev, results: prev.results.filter(m => m.id !== id) }));
  };

  const updateMatch = (id: string, patch: Partial<MatchResult>) => {
    updateState(prev => ({
      ...prev,
      results: prev.results.map(m => (m.id === id ? { ...m, ...patch } : m)),
    }));
  };

  const setMatchEntryScore = (matchId: string, personId: string, value: string) => {
    const num = Number(value);
    updateState(prev => ({
      ...prev,
      results: prev.results.map(m => {
        if (m.id !== matchId) return m;
        const exists = m.entries.some(e => e.personId === personId);
        const entries = exists
          ? m.entries.map(e => (e.personId === personId ? { ...e, score: Number.isNaN(num) ? 0 : num } : e))
          : [...m.entries, { personId, score: Number.isNaN(num) ? 0 : num }];
        return { ...m, entries };
      }),
    }));
  };

  // Small copy button: apply current value of a field to team or all.
  const ApplyButton = ({ ids, field, value, kind }: {
    ids: string[]; field: keyof Pick<Person, 'skill' | 'skillMin' | 'skillMax' | 'skillSmallerIsBetter'>;
    value: string | boolean | number | null; kind: 'team' | 'all';
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => applyToPeople(ids, field, value)}
          >
            {kind === 'team' ? <Users className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{kind === 'team' ? t('apply_to_team') : t('apply_to_all')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-6 pt-4 border-t">
      <div className="flex items-center gap-2">
        <Trophy className="text-primary" />
        <h3 className="font-semibold text-lg">{t('skills_section')}</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="focus:outline-none"><HelpCircle className="h-4 w-4 text-muted-foreground" /></button>
            </TooltipTrigger>
            <TooltipContent><p>{t('skills_section_explanation')}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* ============ Verteilungsmodus ============ */}
      <div className="space-y-2">
        <Label className="text-base">{t('skill_distribution')}</Label>
        <RadioGroup
          value={state.skillDistribution}
          onValueChange={(v: 'off' | 'balanced' | 'levels') => updateState(prev => ({ ...prev, skillDistribution: v }))}
          className="grid grid-cols-1 gap-2"
        >
          <div className="flex items-center space-x-2"><RadioGroupItem value="off" id="sd-off" /><Label htmlFor="sd-off">{t('skill_distribution_off')}</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="balanced" id="sd-balanced" /><Label htmlFor="sd-balanced">{t('skill_distribution_balanced')}</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="levels" id="sd-levels" /><Label htmlFor="sd-levels">{t('skill_distribution_levels')}</Label></div>
        </RadioGroup>
      </div>

      {/* ============ Eingabemodus ============ */}
      <div className="space-y-2">
        <Label className="text-base">{t('skill_entry_mode')}</Label>
        <RadioGroup
          value={state.skillMode}
          onValueChange={(v: 'manual' | 'results') => updateState(prev => ({ ...prev, skillMode: v }))}
          className="grid grid-cols-1 gap-2"
        >
          <div className="flex items-center space-x-2"><RadioGroupItem value="manual" id="em-manual" /><Label htmlFor="em-manual">{t('skill_entry_manual')}</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="results" id="em-results" /><Label htmlFor="em-results">{t('skill_entry_results')}</Label></div>
        </RadioGroup>
      </div>

      {/* ============ Skalen aktivieren (nur manuell) ============ */}
      {state.skillMode === 'manual' && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Label className="text-base">{t('skill_scale')}</Label>
            <div className="flex items-center gap-2">
              <input
                id="show-scales"
                type="checkbox"
                checked={state.showSkillScales}
                onChange={e => updateState(prev => ({ ...prev, showSkillScales: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="show-scales" className="text-sm font-normal">{t('skill_scales_on')}</Label>
            </div>
          </div>
          {state.showSkillScales && (
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('skill_min')}</Label>
                <Input
                  id="common-min"
                  type="number"
                  value={state.skillScaling.commonMin}
                  onChange={e => setScaling({ commonMin: Number(e.target.value) })}
                  className="w-24"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('skill_max')}</Label>
                <Input
                  id="common-max"
                  type="number"
                  value={state.skillScaling.commonMax}
                  onChange={e => setScaling({ commonMax: Number(e.target.value) })}
                  className="w-24"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('skill_direction')}</Label>
                <Select
                  value={state.skillScaling.smallerIsBetter ? 'smaller' : 'larger'}
                  onValueChange={v => setScaling({ smallerIsBetter: v === 'smaller' })}
                >
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="larger">{t('skill_larger_is_better')}</SelectItem>
                    <SelectItem value="smaller">{t('skill_smaller_is_better')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1 pb-1">
                <Button type="button" variant="outline" size="sm" onClick={() => applyToPeople(allActiveIds, 'skillMin', String(state.skillScaling.commonMin))}>
                  <Copy className="mr-1 h-3 w-3" />{t('apply_min_to_all')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyToPeople(allActiveIds, 'skillMax', String(state.skillScaling.commonMax))}>
                  <Copy className="mr-1 h-3 w-3" />{t('apply_max_to_all')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyToPeople(allActiveIds, 'skillSmallerIsBetter', state.skillScaling.smallerIsBetter)}>
                  <Copy className="mr-1 h-3 w-3" />{t('apply_dir_to_all')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ Manuelle Eingabe ============ */}
      {state.skillMode === 'manual' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('skill_manual_hint')}</p>
          {activePeople.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('add_participants')}</p>
          ) : (
            <div className="space-y-2">
              {activePeople.map(p => {
                const teamIds = teamOfPerson(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2 p-2 border rounded-lg flex-wrap">
                    <span className="w-32 truncate text-sm">{p.name}</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        placeholder={t('skill_manual_placeholder')}
                        value={p.skill ?? ''}
                        onChange={e => setPersonSkillField(p.id, 'skill', e.target.value)}
                        className="w-20 h-8"
                      />
                      <ApplyButton ids={teamIds} field="skill" value={p.skill ?? ''} kind="team" />
                      <ApplyButton ids={allActiveIds} field="skill" value={p.skill ?? ''} kind="all" />
                    </div>
                    {state.showSkillScales && (
                      <>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            placeholder={t('skill_min_short')}
                            value={p.skillMin ?? ''}
                            onChange={e => setPersonSkillField(p.id, 'skillMin', e.target.value)}
                            className="w-16 h-8"
                          />
                          <ApplyButton ids={teamIds} field="skillMin" value={p.skillMin ?? ''} kind="team" />
                          <ApplyButton ids={allActiveIds} field="skillMin" value={p.skillMin ?? ''} kind="all" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            placeholder={t('skill_max_short')}
                            value={p.skillMax ?? ''}
                            onChange={e => setPersonSkillField(p.id, 'skillMax', e.target.value)}
                            className="w-16 h-8"
                          />
                          <ApplyButton ids={teamIds} field="skillMax" value={p.skillMax ?? ''} kind="team" />
                          <ApplyButton ids={allActiveIds} field="skillMax" value={p.skillMax ?? ''} kind="all" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Select
                            value={p.skillSmallerIsBetter === null || p.skillSmallerIsBetter === undefined
                              ? (state.skillScaling.smallerIsBetter ? 'smaller' : 'larger')
                              : (p.skillSmallerIsBetter ? 'smaller' : 'larger')}
                            onValueChange={v => setPersonDirection(p.id, v === 'smaller')}
                          >
                            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="larger">{t('skill_larger_is_better_short')}</SelectItem>
                              <SelectItem value="smaller">{t('skill_smaller_is_better_short')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <ApplyButton ids={teamIds} field="skillSmallerIsBetter" value={p.skillSmallerIsBetter ?? state.skillScaling.smallerIsBetter} kind="team" />
                          <ApplyButton ids={allActiveIds} field="skillSmallerIsBetter" value={p.skillSmallerIsBetter ?? state.skillScaling.smallerIsBetter} kind="all" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ Resultate ============ */}
      {state.skillMode === 'results' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-base">{t('results_title')}</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="focus:outline-none"><HelpCircle className="h-4 w-4 text-muted-foreground" /></button>
                </TooltipTrigger>
                <TooltipContent><p>{t('results_explanation')}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {state.results.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('no_matches_yet')}</p>
          )}

          <div className="space-y-3">
            {state.results.map((match, mi) => (
              <div key={match.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">{t('match_label')} {mi + 1}</Label>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMatch(match.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`start-${match.id}`} className="text-sm whitespace-nowrap">{t('start_score')}</Label>
                  <Input
                    id={`start-${match.id}`}
                    type="number"
                    value={match.startScore}
                    onChange={e => updateMatch(match.id, { startScore: Number(e.target.value) })}
                    className="w-24 h-8"
                  />
                  <span className="text-xs text-muted-foreground">{t('start_score_hint')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activePeople.length === 0 ? (
                    <p className="text-sm text-muted-foreground col-span-full">{t('add_participants')}</p>
                  ) : (
                    activePeople.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="flex-grow truncate text-sm">{p.name}</span>
                        <Input
                          type="number"
                          placeholder={t('participant_score')}
                          value={match.entries.find(e => e.personId === p.id)?.score ?? ''}
                          onChange={e => setMatchEntryScore(match.id, p.id, e.target.value)}
                          className="w-24 h-8"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button onClick={addMatch} variant="outline" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> {t('add_match')}
          </Button>
        </div>
      )}
    </div>
  );
}
