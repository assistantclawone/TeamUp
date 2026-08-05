'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';
import { SavedConfig } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SaveConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (name: string, idToUpdate?: string) => void;
  existingConfigs: SavedConfig[];
}

export function SaveConfigDialog({
  isOpen,
  onOpenChange,
  onSave,
  existingConfigs,
}: SaveConfigDialogProps) {
  const { t } = useTranslation();
  const [configName, setConfigName] = useState('');
  const [selectedExisting, setSelectedExisting] = useState<string>('new');

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setConfigName('');
      setSelectedExisting('new');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (selectedExisting !== 'new') {
        const existing = existingConfigs.find(c => c.id === selectedExisting);
        if (existing) {
             onSave(existing.name, existing.id);
        }
    } else {
        if (configName.trim()) {
             onSave(configName.trim());
        }
    }
  };

  const canSave = selectedExisting !== 'new' || configName.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('save_configuration_title')}</DialogTitle>
          <DialogDescription>{t('save_configuration_desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {existingConfigs.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="existing-config-select">{t('update_existing_config')}</Label>
              <Select value={selectedExisting} onValueChange={setSelectedExisting}>
                <SelectTrigger id="existing-config-select">
                  <SelectValue placeholder={t('select_config_to_update')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{t('save_as_new_config')}</SelectItem>
                  {existingConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedExisting === 'new' && (
            <div className="space-y-2">
              <Label htmlFor="config-name">{t('configuration_name')}</Label>
              <Input
                id="config-name"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder={t('e_g_class_5b')}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {selectedExisting === 'new' ? t('save') : t('update')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
