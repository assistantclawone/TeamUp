
'use client';

import React, { forwardRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, PlusCircle, MinusCircle, X, Check, RotateCcw } from 'lucide-react';
import type { Person } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '../ui/checkbox';

interface NameInputRowProps {
  person: Person;
  index: number;
  allPeople: Person[];
  allRoles: string[];
  showRolesInputs: boolean;
  showRulesInputs: boolean;
  onChange: (id: string, newPersonData: Partial<Person>) => void;
  onRemove: (id: string) => void;
  onEnterPress: (id: string) => void;
}

const NameInputRow = forwardRef<HTMLInputElement, NameInputRowProps>(({ person, index, allPeople, allRoles, showRolesInputs, showRulesInputs, onChange, onRemove, onEnterPress }, ref) => {
  const { t } = useTranslation();
  const otherPeople = allPeople.filter(p => p.id !== person.id);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnterPress(person.id);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === `${t('person')} ${index + 1}`) {
      onChange(person.id, { name: '' });
    }
  };

  const renderMultiSelect = (
    type: 'mustBeWith' | 'cannotBeWith',
    values: string[],
    label: string
  ) => {
    const handleValueChange = (indexToUpdate: number, newValue: string) => {
      const newValues = [...values];
      if (newValue) {
        newValues[indexToUpdate] = newValue;
      } else {
        newValues.splice(indexToUpdate, 1);
      }
      onChange(person.id, { [type]: newValues });
    };

    const addSelection = () => {
      onChange(person.id, { [type]: [...values, ''] });
    };

    return (
      <div className="flex flex-col gap-1 w-full">
        {values.map((value, i) => (
          <div key={i} className="flex items-center gap-1">
            <Select value={value} onValueChange={(val) => handleValueChange(i, val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={label} />
              </SelectTrigger>
              <SelectContent>
                {otherPeople.map(p => (
                  <SelectItem key={p.id} value={p.id} disabled={values.includes(p.id) && value !== p.id}>
                    {p.name || `${t('person')} ${allPeople.findIndex(ap => ap.id === p.id) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleValueChange(i, '')}>
              <MinusCircle className="h-4 w-4" />
            </Button>
          </div>
        ))}
         <Button variant="outline" size="sm" onClick={addSelection} className="mt-1">
            <PlusCircle className="mr-2 h-4 w-4"/> {label}
        </Button>
      </div>
    );
  };
  
  const handleRoleChange = (newRoles: string[]) => {
      onChange(person.id, { role: newRoles });
  };

  const invertRoleSelection = () => {
      const currentSelected = new Set(selectedRoles);
      const newSelectedRoles = allRoles.filter(role => !currentSelected.has(role));
      handleRoleChange(newSelectedRoles);
  }

  const selectedRoles = Array.isArray(person.role) ? person.role : (person.role ? [person.role] : []);


  return (
    <div className={cn("flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 rounded-lg transition-all", person.name.trim() === '' && 'opacity-50')}>
      <div className="flex-grow w-full flex items-center gap-2">
        <div className="flex-none w-8 text-center font-medium text-muted-foreground">{index + 1}.</div>
        <div className="flex-grow min-w-0">
          <Input
            ref={ref}
            type="text"
            placeholder={`${t('person')} ${index + 1}`}
            value={person.name}
            onChange={(e) => onChange(person.id, { name: e.target.value })}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            className="w-full"
          />
        </div>
      </div>
      <div className="w-full sm:w-auto flex-shrink-0 flex flex-col md:flex-row gap-2 items-center self-start pl-10 sm:pl-0">
        {showRolesInputs && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full md:w-48 justify-start font-normal">
                        {selectedRoles.length === 0 ? t('select_role') : 
                        selectedRoles.length === 1 ? selectedRoles[0] :
                        `${selectedRoles.length} ${t('roles_selected')}`}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0" align="start">
                    <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                        {allRoles.map(role => (
                            <div key={role} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`role-${person.id}-${role}`}
                                    checked={selectedRoles.includes(role)}
                                    onCheckedChange={(checked) => {
                                        const newSelectedRoles = checked
                                            ? [...selectedRoles, role]
                                            : selectedRoles.filter(r => r !== role);
                                        handleRoleChange(newSelectedRoles);
                                    }}
                                />
                                <label htmlFor={`role-${person.id}-${role}`} className="text-sm font-medium leading-none">
                                    {role}
                                </label>
                            </div>
                        ))}
                        {allRoles.length === 0 && <p className="text-sm text-muted-foreground">{t('no_roles_defined')}</p>}
                    </div>
                    <div className="p-2 border-t flex flex-col gap-1">
                        <Button variant="ghost" size="sm" className="w-full justify-center" onClick={invertRoleSelection} disabled={allRoles.length === 0}>
                            <RotateCcw className="mr-2 h-4 w-4" /> {t('invert_selection')}
                        </Button>
                        {selectedRoles.length > 0 &&
                            <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => handleRoleChange([])}>
                                {t('clear_selection')}
                            </Button>
                        }
                    </div>
                    <div className='p-2 border-t'>
                        <Button size="sm" className='w-full' onClick={() => setPopoverOpen(false)}>
                            <Check className='mr-2 h-4 w-4' /> {t('ok')}
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        )}
        {showRulesInputs && (
            <div className="flex w-full md:w-auto flex-col sm:flex-row gap-2">
                <div className="w-full sm:w-48">
                    {renderMultiSelect('mustBeWith', person.mustBeWith, t('must_be_with'))}
                </div>
                <div className="w-full sm:w-48">
                    {renderMultiSelect('cannotBeWith', person.cannotBeWith, t('cannot_be_with'))}
                </div>
            </div>
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={() => onRemove(person.id)} className="flex-none self-center sm:self-auto">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
});

NameInputRow.displayName = 'NameInputRow';
export default NameInputRow;
