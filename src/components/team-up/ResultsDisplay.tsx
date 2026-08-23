
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Person, AppState } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Users, GripVertical, HelpCircle, Check, X } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, UniqueIdentifier, DragOverlay, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface DraggablePersonProps {
  person: Person;
  personIndex: number;
  state: AppState;
  allRolesForResultDisplay: string[];
  spontaneousRoles: string[];
  onRoleChange: (personId: string, newRole: string) => void;
  onSpontaneousRoleCreate: (newRole: string) => void;
  onSpontaneousRoleDelete: (roleToDelete: string) => void;
  teamRoleCounts: { [key: string]: number };
  teamQuotas: { [key: string]: number };
  effectiveScore?: number | null;
  onScoreOverride?: (value: number | null) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  dragHandleRef?: React.Ref<HTMLDivElement>;
}

const DraggablePersonContent = ({ 
    person,
    state,
    allRolesForResultDisplay,
    spontaneousRoles,
    onRoleChange,
    onSpontaneousRoleCreate,
    onSpontaneousRoleDelete,
    teamRoleCounts,
    teamQuotas,
    effectiveScore,
    onScoreOverride,
    dragHandleRef,
    dragHandleProps
}: Omit<DraggablePersonProps, 'personIndex'>) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [scoreInput, setScoreInput] = useState<string>(effectiveScore != null ? String(effectiveScore) : '');
  
  // Keep the local score input in sync when the effective score changes from
  // outside (e.g. when the group result field is edited).
  useEffect(() => {
    setScoreInput(effectiveScore != null ? String(effectiveScore) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScore]);
  
  const role = useMemo(() => (Array.isArray(person.role) ? person.role[0] || '' : person.role || ''), [person.role]);

  const handleRoleSelection = (newRole: string) => {
    onRoleChange(person.id, newRole);
    setOpen(false);
  };
  
  const createRole = () => {
    const trimmedInput = inputValue.trim();
    if (trimmedInput && !allRolesForResultDisplay.includes(trimmedInput)) {
      onSpontaneousRoleCreate(trimmedInput);
      handleRoleSelection(trimmedInput);
    }
    setInputValue('');
  };
  
  const getFilteredRoles = useCallback(() => {
    const originalPersonState = state.people.find(p => p.id === person.id);
    const originalRoles = originalPersonState?.role || [];
    const personSpecificRoles = Array.isArray(originalRoles) ? originalRoles : (originalRoles ? [originalRoles] : []);
    
    const baseRoles = showAllRoles
      ? allRolesForResultDisplay
      : Array.from(new Set([...personSpecificRoles, ...spontaneousRoles, role].filter(Boolean)));
    
    if (inputValue) {
        return baseRoles.filter(r => r.toLowerCase().includes(inputValue.toLowerCase()));
    }
    return baseRoles;
  }, [showAllRoles, allRolesForResultDisplay, person.id, state.people, spontaneousRoles, role, inputValue]);


  const currentCount = teamRoleCounts[role] || 0;
  const quota = teamQuotas[role] || 0;

  const isQuotaExceeded = state.showRoleQuotaStatus && state.enableRoles && role && quota > 0 && currentCount > quota;
  const isQuotaFulfilled = state.showRoleQuotaStatus && state.enableRoles && role && quota > 0 && currentCount === quota;
  const isUnassigned = state.showRoleQuotaStatus && state.enableRoles && !role;
  
  const highlightClass = cn({
    'border-destructive ring-2 ring-destructive/20': isQuotaExceeded && state.highlighting.quotaExceeded,
    'border-yellow-500 ring-2 ring-yellow-500/20': isUnassigned && state.highlighting.unassigned,
    'border-green-500 ring-2 ring-green-500/20': isQuotaFulfilled,
  });
  
  const buttonLabel = role ? allRolesForResultDisplay.find((r) => r === role) : t('select_role');

  const handleDeleteSpontaneousRole = (e: React.MouseEvent, roleToDelete: string) => {
    e.stopPropagation();
    e.preventDefault();
    onSpontaneousRoleDelete(roleToDelete);
  };

  const filteredRoles = getFilteredRoles();

  return (
    <div className={cn("p-2 bg-card rounded-md flex items-start gap-2 border w-full")}>
      <div
        ref={dragHandleRef}
        {...dragHandleProps}
        className="cursor-grab touch-none focus:outline-none flex-shrink-0 pt-1"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-grow flex flex-col gap-1 min-w-0">
        <div className="font-medium truncate flex-grow">{person.name}</div>
        {onScoreOverride && (
          <div className="flex items-center gap-1 pl-8 sm:pl-0">
            <Input
              type="number"
              value={scoreInput}
              placeholder={t('group_result_person_score')}
              className="h-7 w-20 text-xs"
              onChange={(e) => {
                const val = e.target.value;
                setScoreInput(val);
                if (val === '') onScoreOverride(null);
                else {
                  const num = Number(val);
                  if (!Number.isNaN(num)) onScoreOverride(num);
                }
              }}
            />
            <span className="text-[10px] text-muted-foreground">{t('group_result_score')}</span>
          </div>
        )}
        {state.showResultRoles && (
           <div className="pl-8 sm:pl-0">
                <Popover open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) { setInputValue(''); } }}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className={cn("w-full h-8 text-xs justify-between font-normal", state.showRoleQuotaStatus && highlightClass)}
                        >
                            <span className="truncate">{buttonLabel}</span>
                            <div className="flex items-center gap-1.5">
                                {state.enableRoles && role && quota > 0 && (
                                    <span className="text-muted-foreground">{`${currentCount}/${quota}`}</span>
                                )}
                                <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                            </div>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0">
                        <div className="p-2">
                            <Input 
                              placeholder={t('no_role_found_create')}
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && inputValue.trim()) {
                                      e.preventDefault();
                                      createRole();
                                  }
                              }}
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {filteredRoles.length === 0 && inputValue.trim() !== '' && (
                                <div className="p-2">
                                    <Button className="w-full" variant="outline" onClick={createRole}>
                                        {t('add_new_role')}: "{inputValue}"
                                    </Button>
                                </div>
                            )}
                            <div className="p-1">
                                {filteredRoles.map((r) => (
                                    <div
                                        key={r}
                                        onMouseDown={(e) => { e.preventDefault(); handleRoleSelection(r); }}
                                        className="group/item flex items-center justify-between w-full cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                    >
                                        <div className="flex items-center">
                                            <Check className={cn("mr-2 h-4 w-4", role === r ? "opacity-100" : "opacity-0")} />
                                            <span>{r}</span>
                                        </div>
                                        <div className="flex items-center">
                                            {state.enableRoles && teamQuotas[r] > 0 && <span className="text-muted-foreground text-xs ml-4">{`${teamRoleCounts[r] || 0}/${teamQuotas[r]}`}</span>}
                                            {spontaneousRoles.includes(r) && 
                                                <button 
                                                    className="h-5 w-5 ml-2 opacity-0 group-hover/item:opacity-100 flex items-center justify-center rounded-sm hover:bg-destructive/20"
                                                    onMouseDown={(e) => { e.stopPropagation(); handleDeleteSpontaneousRole(e as any, r); }}
                                                >
                                                    <X className="h-3 w-3 text-destructive"/>
                                                </button>
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                       <div className="border-t p-1">
                           <button
                                onMouseDown={(e) => {
                                   e.preventDefault();
                                   setShowAllRoles(prev => !prev);
                               }}
                               className="w-full text-sm rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer text-left"
                            >
                                {showAllRoles ? t('show_assigned_roles_only') : t('show_all_roles')}
                            </button>
                       </div>
                    </PopoverContent>
                </Popover>
           </div>
        )}
      </div>
    </div>
  );
};


const SortablePerson = (props: DraggablePersonProps & { isDragging: boolean }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.person.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };
  
  return (
    <li ref={setNodeRef} style={style} className={cn("flex items-center gap-2 list-none", { "z-10 relative": isDragging })}>
      <div className="w-full flex-grow-0">
        <DraggablePersonContent 
          {...props} 
          dragHandleRef={setActivatorNodeRef} 
          dragHandleProps={{...attributes, ...listeners}} 
        />
      </div>
    </li>
  );
};

interface ResultsDisplayProps {
  teams: Person[][];
  onTeamChange: (teams: Person[][]) => void;
  allRoles: string[];
  state: AppState;
  onGroupResultChange: (teamIndex: number, value: number | null) => void;
  onPersonScoreOverride: (personId: string, value: number | null) => void;
  /** Sync a role observed/created in the result view back into state.roles so the
   *  shared state and the generated teams never drift apart (share consistency). */
  onRolesSync: (role: string) => void;
}

export default function ResultsDisplay({ teams: initialTeams, onTeamChange, allRoles, state, onGroupResultChange, onPersonScoreOverride, onRolesSync }: ResultsDisplayProps) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [spontaneousRoles, setSpontaneousRoles] = useState<string[]>([]);
  const [teams, setTeams] = useState(initialTeams);

  useEffect(() => {
    setTeams(initialTeams);
  }, [initialTeams]);

  
  const handleSpontaneousRoleCreate = (newRole: string) => {
    if (!spontaneousRoles.includes(newRole)) {
      setSpontaneousRoles(prev => [...prev, newRole]);
      onRolesSync(newRole);
    }
  }

  const handleSpontaneousRoleDelete = (roleToDelete: string) => {
    setSpontaneousRoles(prev => prev.filter((r: string) => r !== roleToDelete));
    const newTeams = JSON.parse(JSON.stringify(teams));
    for (const team of newTeams) {
        for (const person of team) {
            if (Array.isArray(person.role) ? person.role.includes(roleToDelete) : person.role === roleToDelete) {
                person.role = Array.isArray(person.role) ? person.role.filter((r: string) => r !== roleToDelete) : '';
            }
        }
    }
    onTeamChange(newTeams);
  };


  const allRolesForResultDisplay = useMemo(() => {
    const rolesFromSettings = allRoles;
    const rolesFromResult = teams.flat().map(p => Array.isArray(p.role) ? p.role[0] : p.role).filter(Boolean) as string[];
    return Array.from(new Set([...rolesFromSettings, ...rolesFromResult, ...spontaneousRoles]));
  }, [teams, allRoles, spontaneousRoles]);


  const handleRoleChangeInResult = (personId: string, newRole: string) => {
    const newTeams = JSON.parse(JSON.stringify(teams));
    for (const team of newTeams) {
        const person = team.find((p: Person) => p.id === personId);
        if (person) {
            person.role = newRole;
            break;
        }
    }
    onTeamChange(newTeams);
    if (newRole) onRolesSync(newRole);
  };

  const findContainer = (id: UniqueIdentifier, teamsData: Person[][]) => {
    if (id === null) return -1;
    for (let i = 0; i < teamsData.length; i++) {
      if (Array.isArray(teamsData[i]) && teamsData[i].some(p => p.id === id)) {
        return i;
      }
    }
    return -1;
  };
  
  const getContainerId = (index: number) => `team-container-${index}`;

  const handleDragStart = (event: { active: { id: UniqueIdentifier } }) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const activeId = active.id;
    const overId = over?.id;

    if (!overId || activeId === overId) {
        return;
    }

    const activeContainerIndex = findContainer(activeId, teams);
    let overContainerIndex = findContainer(overId, teams);

    if (overContainerIndex === -1 && String(overId).startsWith('team-container-')) {
        overContainerIndex = parseInt(String(overId).replace('team-container-', ''), 10);
    }
    
    if (activeContainerIndex === -1 || overContainerIndex === -1 || activeContainerIndex === overContainerIndex) {
        return;
    }
    
    setTeams((prev) => {
        const newTeams = JSON.parse(JSON.stringify(prev));
        const activeTeam = newTeams[activeContainerIndex];
        const overTeam = newTeams[overContainerIndex];
        
        const activeIndex = activeTeam.findIndex((p: Person) => p.id === activeId);
        const [movedItem] = activeTeam.splice(activeIndex, 1);
        
        let overIndex = overTeam.findIndex((p: Person) => p.id === overId);
        if (overIndex === -1) {
            overIndex = overTeam.length;
        }
        
        overTeam.splice(overIndex, 0, movedItem);
        return newTeams;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) {
        onTeamChange(teams);
        return;
    }
  
    const activeId = active.id;
    const overId = over.id;

    const activeContainerIndex = findContainer(activeId, teams);
    let overContainerIndex = findContainer(overId, teams);

     if (overContainerIndex === -1 && String(overId).startsWith('team-container-')) {
        overContainerIndex = parseInt(String(overId).replace('team-container-', ''), 10);
    }

    if (activeContainerIndex === -1 || overContainerIndex === -1) {
       onTeamChange(teams);
       return;
    }
    
    if (activeContainerIndex === overContainerIndex) {
        const team = teams[activeContainerIndex];
        const oldIndex = team.findIndex((p: Person) => p.id === activeId);
        const newIndex = team.findIndex((p: Person) => p.id === overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newTeam = arrayMove(team, oldIndex, newIndex);
            const newTeams = [...teams];
            newTeams[activeContainerIndex] = newTeam;
            onTeamChange(newTeams);
            return;
        }
    }
    
    onTeamChange(teams);
  };
  
  if (!Array.isArray(teams) || teams.length === 0) {
    return null; 
  }
  
  const activePerson = useMemo(() => {
    if (!activeId) return null;
    return teams.flat().find(p => p.id === activeId);
  }, [activeId, teams]);


  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            {t('generated_teams')}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className="focus:outline-none">
                            <HelpCircle className="h-5 w-5 text-muted-foreground" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t('drag_drop_explanation')}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teams.map((team, index) => {
              if (!Array.isArray(team)) {
                console.error(`Data integrity issue: team at index ${index} is not an array.`, team);
                return null;
              }
              const teamMemberIds = team.map(p => p.id);
              const containerId = getContainerId(index);

              const teamRoleCounts = team.reduce((acc, p) => {
                  const role = Array.isArray(p.role) ? p.role[0] || '' : p.role || '';
                  if (role) {
                      acc[role] = (acc[role] || 0) + 1;
                  }
                  return acc;
              }, {} as {[key: string]: number});
              
              const teamQuotas = state.roleQuotas[index] || {};
              const unfulfilledRoles = Object.entries(teamQuotas)
                .filter(([role, quota]) => quota > 0 && (teamRoleCounts[role] || 0) < quota)
                .map(([role, quota]) => ({ role, needed: quota - (teamRoleCounts[role] || 0), current: teamRoleCounts[role] || 0, total: quota }));

              // Group result score: one value per generated team, auto-applied to
              // every member. A member can override it individually.
              const groupScore = state.groupResultScores?.[index] ?? null;
              const effectiveScoreFor = (personId: string): number | null => {
                const override = state.personScoreOverrides?.[personId];
                return override != null ? override : groupScore;
              };


              return (
              <SortableContext items={teamMemberIds} strategy={verticalListSortingStrategy} key={containerId}>
                <Card id={containerId} className="flex flex-col bg-secondary">
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="text-primary"/>
                        {t('team')} {index + 1}
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <ul className="space-y-2 min-h-[50px]">
                        {team.map((person, personIndex) => (
                            <SortablePerson 
                              key={person.id} 
                              person={person} 
                              personIndex={personIndex}
                              isDragging={activeId === person.id}
                              state={state}
                              allRolesForResultDisplay={allRolesForResultDisplay}
                              spontaneousRoles={spontaneousRoles}
                              onRoleChange={handleRoleChangeInResult}
                              onSpontaneousRoleCreate={handleSpontaneousRoleCreate}
                              onSpontaneousRoleDelete={handleSpontaneousRoleDelete}
                              teamRoleCounts={teamRoleCounts}
                              teamQuotas={teamQuotas}
                              effectiveScore={effectiveScoreFor(person.id)}
                              onScoreOverride={(value) => onPersonScoreOverride(person.id, value)}
                            />
                           ))}
                        </ul>
                    {team.length === 0 && (
                        <div className="flex items-center justify-center h-24 text-muted-foreground">
                            {t('empty_team')}
                        </div>
                    )}
                    </CardContent>
                    {state.enableRoles && state.showRoleQuotaStatus && unfulfilledRoles.length > 0 && (
                        <CardFooter className="flex-col items-start pt-4 border-t">
                            <h4 className="text-sm font-semibold mb-2">
                                {t('unfulfilled_roles')}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {unfulfilledRoles.map(({ role, current, total }) => (
                                    <Badge key={role} variant="outline">{`${role} (${current}/${total})`}</Badge>
                                ))}
                            </div>
                        </CardFooter>
                    )}
                </Card>
              </SortableContext>
            )})}
          </div>
        </CardContent>
      </Card>
      <DragOverlay dropAnimation={null}>
        {activeId && activePerson ? (
          <div style={{ transform: 'scale(1.05)', boxShadow: '0px 5px 15px rgba(0,0,0,0.2)'}}>
            <DraggablePersonContent
              person={activePerson}
              state={state}
              allRolesForResultDisplay={allRolesForResultDisplay}
              spontaneousRoles={spontaneousRoles}
              onRoleChange={() => {}}
              onSpontaneousRoleCreate={() => {}}
              onSpontaneousRoleDelete={() => {}}
              teamRoleCounts={{}} // Not relevant for overlay
              teamQuotas={{}} // Not relevant for overlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
