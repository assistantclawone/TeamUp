
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Dices, UserPlus, Trash2, Wand2, FileCog, Presentation, Link as LinkIcon, Save, FolderOpen, LogIn, Heart, LogOut, ChevronDown, Check, X, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppState, Person, SavedConfig } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { useTranslation } from '@/hooks/use-translation';
import NameInputRow from './NameInputRow';
import SettingsPanel from './SettingsPanel';
import ResultsDisplay from './ResultsDisplay';
import { generateTeams as generateTeamsAlgorithm } from '@/lib/team-generator';
import LanguageSwitcher from './LanguageSwitcher';
import { useToast } from '@/hooks/use-toast';
import { Users, Undo, Redo } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { useLanguage } from '@/contexts/language-context';
import { stateToUrlParams, urlParamsToState } from '@/lib/url-state-manager';
import { signOut } from 'firebase/auth';
import { SaveConfigDialog } from './SaveConfigDialog';
import { LoadConfigDropdown } from './LoadConfigDropdown';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const getInitialState = (): AppState => ({
  people: [{ id: `person-${Date.now()}`, name: '', role: [], mustBeWith: [], cannotBeWith: [] }],
  roles: [],
  numberOfTeams: 2,
  teamGenerationMode: 'numberOfTeams',
  peoplePerTeam: 2,
  variableTeamSizes: [2,2],
  enableRoles: false,
  showRolesInputs: false,
  enableRules: false,
  showRulesInputs: false,
  roleQuotas: {},
  generatedTeams: [],
  history: [],
  historyIndex: -1,
  showResultNumbers: true,
  showResultRoles: true,
  showRoleQuotaStatus: true,
  highlighting: {
    quotaExceeded: true,
    unassigned: true,
  },
  language: 'en'
});

const flagKeys: (keyof AppState)[] = [
  'enableRoles',
  'showRolesInputs',
  'enableRules',
  'showRulesInputs',
  'showResultNumbers',
  'showResultRoles',
  'showRoleQuotaStatus',
];

export default function TeamUpPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { language, setLanguage, isLanguageLoading } = useLanguage();
  const { auth, firestore, user, isUserLoading } = useFirebase();

  const [state, setState] = useState<AppState>(getInitialState());
  const [isMounted, setIsMounted] = useState(false);
  const [isSaveDialogOpen, setSaveDialogOpen] = useState(false);
  
  const nameInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const userConfigsCollection = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, `users/${user.uid}/configs`);
  }, [user, firestore]);

  const { data: savedConfigs } = useCollection<SavedConfig>(userConfigsCollection);

  // Derived state to sync to URL, excluding history/index
  const urlState = useMemo(() => {
    const { history, historyIndex, ...rest } = state;
    return { ...rest, language };
  }, [state, language]);

  const debouncedUrlState = useDebounce(urlState, 500);
  
  // This effect runs once on mount to read the state from the URL.
  useEffect(() => {
    try {
        const parsedState = urlParamsToState(searchParams);
        if (Object.keys(parsedState).length > 0) {
            const fullState: AppState = { 
                ...getInitialState(), 
                ...parsedState,
                highlighting: {
                    ...getInitialState().highlighting,
                    ...(parsedState.highlighting || {}),
                }
            };
             // Ensure people array is not empty
            if (!fullState.people || fullState.people.length === 0) {
              fullState.people = getInitialState().people;
            }
             // Ensure role is not null/undefined
            fullState.people.forEach(p => {
              if (!Array.isArray(p.role)) {
                p.role = [];
              }
            });
            // Ensure boolean flags are correctly initialized
            flagKeys.forEach(key => {
                if (fullState[key] === undefined) {
                    (fullState as any)[key] = getInitialState()[key];
                }
            });

            setState(fullState);
             if (parsedState.language) {
                setLanguage(parsedState.language);
             }
        }
    } catch (error) {
        console.error('Failed to parse state from URL', error);
        router.replace('/', undefined);
    }
    setIsMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount
  
  // This effect syncs the state back to the URL, but debounced.
  useEffect(() => {
    if (isMounted && !isLanguageLoading) {
      const newSearchParams = stateToUrlParams(debouncedUrlState);
      const currentView = searchParams.get('view');
      if (currentView === 'result') {
          newSearchParams.set('view', 'result');
      } else {
          newSearchParams.delete('view');
      }
      router.replace(`?${newSearchParams.toString()}`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUrlState, router, isMounted, isLanguageLoading]);

  const handleTeamChange = (newTeams: Person[][]) => {
    setState(prev => {
      const currentHistory = prev.history.slice(0, prev.historyIndex + 1);
      const newHistory = [...currentHistory, newTeams];
      
      return {
        ...prev,
        generatedTeams: newTeams,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  };

  const handleUndo = () => {
    setState(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        return {
          ...prev,
          generatedTeams: prev.history[newIndex],
          historyIndex: newIndex,
        };
      }
      return prev;
    });
  };

  const handleRedo = () => {
    setState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        return {
          ...prev,
          generatedTeams: prev.history[newIndex],
          historyIndex: newIndex,
        };
      }
      return prev;
    });
  };

  const updateState = (updater: (prevState: AppState) => AppState) => {
    setState(updater);
  };

  const addPerson = (focusNew = false) => {
    updateState((prev) => ({
      ...prev,
      people: [...prev.people, { id: `person-${Date.now()}`, name: '', role: [], mustBeWith: [], cannotBeWith: [] }],
    }));
    if (focusNew) {
      setTimeout(() => {
        nameInputRefs.current[nameInputRefs.current.length - 1]?.focus();
      }, 0);
    }
  };

  const removePerson = (id: string) => {
    updateState((prev) => {
      if (prev.people.length <= 1) {
        return { ...prev, people: getInitialState().people };
      }
      return {
        ...prev,
        people: prev.people.filter((p) => p.id !== id),
      };
    });
  };

  const handlePersonChange = (id: string, newPersonData: Partial<Person>) => {
    updateState((prev) => ({
      ...prev,
      people: prev.people.map((p) => (p.id === id ? { ...p, ...newPersonData } : p)),
    }));
  };
  
  const handleGenerateTeams = () => {
    const activePeople = state.people.filter((p) => p.name.trim() !== '');
    
    let numTeams = 0;
    if (state.teamGenerationMode === 'numberOfTeams') {
        numTeams = state.numberOfTeams;
    } else if (state.teamGenerationMode === 'peoplePerTeam') {
        if (state.peoplePerTeam <= 0) {
            toast({ variant: "destructive", title: t('error'), description: t('people_per_team_error') });
            return;
        }
        numTeams = Math.ceil(activePeople.length / state.peoplePerTeam);
    } else { // variableSizes
        numTeams = state.variableTeamSizes.length;
        const totalPeopleInVariableTeams = state.variableTeamSizes.reduce((a, b) => a + b, 0);
        if (activePeople.length > 0 && totalPeopleInVariableTeams !== activePeople.length) {
            toast({ variant: "destructive", title: t('error'), description: `${t('variable_size_error')} ${activePeople.length} people, but your teams are configured for ${totalPeopleInVariableTeams} people.` });
            return;
        }
    }

    if (activePeople.length > 0 && activePeople.length < numTeams) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('not_enough_people_error'),
      });
      return;
    }

    const result = generateTeamsAlgorithm(activePeople, numTeams, state);
    if (typeof result === 'string') {
        toast({
            variant: "destructive",
            title: t('error'),
            description: t(result) || result,
        });
    } else {
        const peopleMap = new Map(state.people.map(p => [p.id, p]));
        const finalResult = result.map(team =>
            team.map(personInResult => {
                const finalPerson = { ...personInResult };
                const originalPerson = peopleMap.get(finalPerson.id);
                const originalRole = originalPerson?.role;

                // Auto-assign role if only one was possible and none is set
                const currentRole = Array.isArray(finalPerson.role) ? finalPerson.role[0] : finalPerson.role;
                if (!currentRole && Array.isArray(originalRole) && originalRole.length === 1) {
                    finalPerson.role = originalRole[0];
                }
                return finalPerson;
            })
        );
        
        setState(prev => {
          const newHistory = prev.historyIndex > -1 ? prev.history.slice(0, prev.historyIndex + 1) : [];
          newHistory.push(finalResult);
          return {
            ...prev,
            generatedTeams: finalResult,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        });
    }
  };

  const handleEnterPress = (personId: string) => {
    const personIndex = state.people.findIndex(p => p.id === personId);
    const person = state.people[personIndex];

    if (person && person.name.trim() === '') {
        handleGenerateTeams();
    } else if (personIndex === state.people.length - 1) {
        addPerson(true);
    } else {
        nameInputRefs.current[personIndex + 1]?.focus();
    }
  }
  
  const handleShare = (viewMode: 'config' | 'result_link' | 'result_tab') => {
      const currentState = { ...state, language };
      const params = stateToUrlParams(currentState);
      
      if (viewMode === 'result_link' || viewMode === 'result_tab') {
          params.set('view', 'result');
      } else {
          params.delete('view');
      }

      const url = new URL(window.location.href);
      url.search = params.toString();

      if (viewMode === 'result_tab') {
          window.open(url.toString(), '_blank');
      } else {
          navigator.clipboard.writeText(url.toString());
          toast({
              title: t('link_copied'),
              description: t('link_copied_description'),
          })
      }
  }

  const handleSaveConfig = async (name: string, idToUpdate?: string) => {
    if (!user || !firestore || !userConfigsCollection) return;

    const configData: Partial<AppState> = { ...state, language };
    // Remove sensitive or large transient data before saving
    delete (configData as any).generatedTeams;
    delete (configData as any).history;
    delete (configData as any).historyIndex;

    const payload = {
        name: name,
        userId: user.uid,
        configData: JSON.stringify(configData),
    };
    
    try {
        if (idToUpdate) {
            const docRef = doc(firestore, `users/${user.uid}/configs`, idToUpdate);
            await updateDoc(docRef, payload);
            toast({ title: t('config_updated'), description: t('config_updated_desc') });
        } else {
            await addDoc(userConfigsCollection, payload);
            toast({ title: t('config_saved'), description: t('config_saved_desc') });
        }
        setSaveDialogOpen(false);
    } catch(e) {
        console.error("Error saving config:", e);
        toast({ variant: 'destructive', title: t('error'), description: t('save_config_error') });
    }
  };

  const handleLoadConfig = (config: SavedConfig) => {
    try {
        const parsedState = JSON.parse(config.configData);
        const newState: AppState = { ...getInitialState(), ...parsedState };
        
        newState.people.forEach(p => {
            if (p.role === null || p.role === undefined) {
                p.role = [];
            } else if (!Array.isArray(p.role)) {
                p.role = [p.role];
            }
        });
        setState(newState);

        if (parsedState.language) {
            setLanguage(parsedState.language);
        }
        toast({ title: t('config_loaded'), description: t('config_loaded_desc') });
    } catch (e) {
        console.error("Error parsing loaded config", e);
        toast({ variant: 'destructive', title: t('error'), description: t('load_config_error') });
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!user || !firestore) return;
    try {
        const docRef = doc(firestore, `users/${user.uid}/configs`, configId);
        await deleteDoc(docRef);
        toast({ title: t('config_deleted'), description: t('config_deleted_desc') });
    } catch (e) {
        console.error("Error deleting config:", e);
        toast({ variant: 'destructive', title: t('error'), description: t('delete_config_error') });
    }
  };

  const allRoles = useMemo(() => {
    const rolesFromPeople = state.people.flatMap(p => Array.isArray(p.role) ? p.role : (p.role ? [p.role] : [])).filter(Boolean);
    const rolesFromSettings = state.roles;
    return Array.from(new Set([...rolesFromPeople, ...rolesFromSettings]));
  }, [state.people, state.roles]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      toast({ title: t('logged_out'), description: t('logged_out_desc') });
    }
  };

  const ResultOptions = () => (
     <div className="flex justify-center items-center gap-4 flex-wrap p-4 rounded-lg border bg-card">
        <div className="flex items-center space-x-2">
            <Checkbox id="showNumbers" checked={state.showResultNumbers} onCheckedChange={(checked) => updateState(prev => ({...prev, showResultNumbers: !!checked}))} />
            <Label htmlFor="showNumbers">{t('show_numbers')}</Label>
        </div>
        <div className="flex items-center space-x-2">
             <Checkbox
                id="showRolesInResult"
                checked={state.showResultRoles}
                onCheckedChange={(checked) => {
                    const isChecked = !!checked;
                    updateState(prev => ({ 
                        ...prev, 
                        showResultRoles: isChecked,
                        // If checking "show roles", also check "show quota status"
                        showRoleQuotaStatus: isChecked ? true : prev.showRoleQuotaStatus
                    }));
                }}
            />
            <Label htmlFor="showRolesInResult">
                {t('show_roles')}
            </Label>
        </div>
        {state.enableRoles && state.showResultRoles && (
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="showRoleQuotaStatus"
                    checked={state.showRoleQuotaStatus}
                    onCheckedChange={(checked) => updateState(prev => ({...prev, showRoleQuotaStatus: !!checked }))}
                />
                <Label htmlFor="showRoleQuotaStatus">{t('role_quota_status')}</Label>
            </div>
        )}
    </div>
  )
  
  if (isMounted && searchParams.get('view') === 'result') {
    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <Link href="/" className="text-4xl font-bold text-primary flex items-center gap-2">
                    <Dices className="h-10 w-10" />
                    <span>TeamUp</span>
                </Link>
                <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                     <Button asChild variant="outline">
                        <Link href="/">{t('back_to_config')}</Link>
                    </Button>
                </div>
            </header>
             {state.generatedTeams && state.generatedTeams.length > 0 ? (
              <>
                <div className="flex justify-center items-center gap-4 flex-wrap">
                    <Button onClick={handleUndo} variant="outline" disabled={state.historyIndex <= 0}>
                        <Undo className="mr-2 h-4 w-4" /> {t('undo')}
                    </Button>
                    <Button onClick={handleRedo} variant="outline" disabled={state.historyIndex >= state.history.length - 1}>
                        <Redo className="mr-2 h-4 w-4" /> {t('redo')}
                    </Button>
                </div>
                <ResultOptions />
                <ResultsDisplay 
                    teams={state.generatedTeams} 
                    onTeamChange={handleTeamChange}
                    allRoles={allRoles}
                    state={state}
                 />
              </>
          ) : (
             <Card className="w-full text-center p-8">
                  <CardTitle>{t('no_result_to_display')}</CardTitle>
                  <CardContent className="mt-4">
                      <p>{t('generate_teams_first')}</p>
                      <Button asChild className="mt-4">
                          <Link href="/">{t('back_to_config')}</Link>
                      </Button>
                  </CardContent>
              </Card>
          )}
        </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-4xl font-bold text-primary flex items-center gap-2">
          <Dices className="h-10 w-10" />
          <span>TeamUp</span>
        </h1>
        <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button variant="outline" size="sm" asChild>
                <a href="https://www.paypal.com/donate/?hosted_button_id=6WNDWCWKLQ6Q6" target="_blank" className="group">
                    <Heart className="mr-2 h-4 w-4 text-red-500 fill-current transition-colors group-hover:text-red-400" />
                    {t('donate')}
                </a>
            </Button>
            {isUserLoading ? null : user ? (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <UserIcon className="mr-2 h-4 w-4" />
                            {t('profile')}
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{user.isAnonymous ? t('anonymous_user') : user.email}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
                            <Save className="mr-2 h-4 w-4" />
                            {t('save_config')}
                        </DropdownMenuItem>
                        <LoadConfigDropdown
                            configs={savedConfigs || []}
                            onLoad={handleLoadConfig}
                            onDelete={handleDeleteConfig}
                            isSubMenu={true}
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            {t('logout')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Button variant="outline" asChild size="sm">
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    {t('login_to_save')}
                  </Link>
                </Button>
            )}
            <LanguageSwitcher />
        </div>
      </header>

      <SaveConfigDialog 
        isOpen={isSaveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveConfig}
        existingConfigs={savedConfigs || []}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users />
            {t('add_participants')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {state.people.map((person, index) => (
              <NameInputRow
                key={person.id}
                ref={el => nameInputRefs.current[index] = el}
                person={person}
                index={index}
                allPeople={state.people}
                allRoles={allRoles}
                showRolesInputs={state.showRolesInputs}
                showRulesInputs={state.showRulesInputs}
                onChange={handlePersonChange}
                onRemove={removePerson}
                onEnterPress={handleEnterPress}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => addPerson(true)}>
              <UserPlus className="mr-2" /> {t('add_person')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (state.people.length > 0) {
                  removePerson(state.people[state.people.length - 1].id);
                }
              }}
              disabled={state.people.length === 0}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <SettingsPanel state={state} updateState={updateState} />

      <div className="flex justify-center">
        <Button size="lg" onClick={handleGenerateTeams} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Wand2 className="mr-2" />
          {t('generate_teams')}
        </Button>
      </div>

      {state.generatedTeams.length > 0 && (
          <>
            <div className="flex justify-center items-center gap-4 flex-wrap">
                <Button onClick={handleUndo} variant="outline" disabled={state.historyIndex <= 0}>
                    <Undo className="mr-2 h-4 w-4" /> {t('undo')}
                </Button>
                <Button onClick={handleRedo} variant="outline" disabled={state.historyIndex >= state.history.length - 1}>
                    <Redo className="mr-2 h-4 w-4" /> {t('redo')}
                </Button>
            </div>
            <div className="flex justify-center items-center gap-2 flex-wrap mt-4">
                <Button onClick={() => handleShare('config')} variant="outline" size="sm">
                    <FileCog className="mr-2 h-4 w-4" /> {t('share_config')}
                </Button>
                <Button onClick={() => handleShare('result_link')} variant="outline" size="sm">
                    <LinkIcon className="mr-2 h-4 w-4" /> {t('share_result_link')}
                </Button>
                <Button onClick={() => handleShare('result_tab')} variant="outline" size="sm">
                    <Presentation className="mr-2 h-4 w-4" /> {t('show_result_only')}
                </Button>
            </div>
             <ResultOptions />
            <ResultsDisplay 
                teams={state.generatedTeams} 
                onTeamChange={handleTeamChange}
                allRoles={allRoles}
                state={state}
             />
          </>
      )}
    </div>
  );
}

    