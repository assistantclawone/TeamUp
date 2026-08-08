'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AppState, MatchResult } from '@/lib/types';
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

  const setSkillValue = (personId: string, value: string) => {
    const num = value === '' ? null : Number(value);
    updateState(prev => ({
      ...prev,
      people: prev.people.map(p => (p.id === personId ? { ...p, skill: Number.isNaN(num as number) ? null : (num as number) } : p)),
    }));
  };

  const addMatch = () => {
    updateState(prev => ({
      ...prev,
      results: [
        ...prev.results,
        {
          id: `match-${Date.now()}`,
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

  const activePeople = state.people.filter(p => p.name.trim() !== '');

  return (
    <div className="space-y-4 pt-4 border-t">
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

      {/* Verteilungsmodus */}
      <div className="space-y-2">
        <Label className="text-base">{t('skill_distribution')}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="focus:outline-none ml-1"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></button>
            </TooltipTrigger>
            <TooltipContent><p>{t('skill_distribution_explanation')}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
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

      {/* Skala */}
      <div className="space-y-2">
        <Label className="text-base">{t('skill_scale')}</Label>
        <RadioGroup
          value={state.skillScaling.mode}
          onValueChange={(v: 'common' | 'individual') => setScaling({ mode: v })}
          className="grid grid-cols-1 gap-2"
        >
          <div className="flex items-center space-x-2"><RadioGroupItem value="common" id="sc-common" /><Label htmlFor="sc-common">{t('skill_scale_common')}</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="individual" id="sc-individual" /><Label htmlFor="sc-individual">{t('skill_scale_individual')}</Label></div>
        </RadioGroup>

        {state.skillScaling.mode === 'common' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="skill-min" className="text-sm whitespace-nowrap">{t('skill_min')}</Label>
              <Input id="skill-min" type="number" value={state.skillScaling.commonMin}
                onChange={(e) => setScaling({ commonMin: Number(e.target.value) })} className="w-24" />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="skill-max" className="text-sm whitespace-nowrap">{t('skill_max')}</Label>
              <Input id="skill-max" type="number" value={state.skillScaling.commonMax}
                onChange={(e) => setScaling({ commonMax: Number(e.target.value) })} className="w-24" />
            </div>
            <div className="flex items-center space-x-2">
              <Select value={state.skillScaling.smallerIsBetter ? 'smaller' : 'larger'}
                onValueChange={(v) => setScaling({ smallerIsBetter: v === 'smaller' })}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="smaller">{t('skill_smaller_is_better')}</SelectItem>
                  <SelectItem value="larger">{t('skill_larger_is_better')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Eingabemodus */}
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

      {/* Manuelle Eingabe */}
      {state.skillMode === 'manual' && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('skill_manual_hint')}</p>
          {activePeople.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('add_participants')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {activePeople.map(p => (
                <div key={p.id} className="flex items-center gap-2 p-2 border rounded-lg">
                  <span className="flex-grow truncate text-sm">{p.name}</span>
                  <Input
                    type="number"
                    placeholder={t('skill_manual_placeholder')}
                    value={p.skill ?? ''}
                    onChange={(e) => setSkillValue(p.id, e.target.value)}
                    className="w-20 h-8"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resultate */}
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
                    onChange={(e) => updateMatch(match.id, { startScore: Number(e.target.value) })}
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
                          onChange={(e) => setMatchEntryScore(match.id, p.id, e.target.value)}
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
