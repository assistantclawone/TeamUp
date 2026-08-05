
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { FolderOpen, ChevronDown, Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import type { SavedConfig } from '@/lib/types';

interface LoadConfigDropdownProps {
  configs: SavedConfig[];
  onLoad: (config: SavedConfig) => void;
  onDelete: (configId: string) => void;
  isSubMenu?: boolean;
}

export function LoadConfigDropdown({ configs, onLoad, onDelete, isSubMenu = false }: LoadConfigDropdownProps) {
  const { t } = useTranslation();

  const menuContent = (
    <>
      <DropdownMenuLabel>{t('select_config_to_load')}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {configs.length === 0 ? (
        <DropdownMenuItem disabled>{t('no_saved_configs')}</DropdownMenuItem>
      ) : (
        <DropdownMenuGroup>
          {configs.map((config) => (
            <DropdownMenuSub key={config.id}>
              <DropdownMenuSubTrigger>
                <span>{config.name}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onLoad(config)}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {t('load')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(config.id)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('delete')}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ))}
        </DropdownMenuGroup>
      )}
    </>
  );

  if (isSubMenu) {
      return (
          <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  {t('load_config')}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                      {menuContent}
                  </DropdownMenuSubContent>
              </DropdownMenuPortal>
          </DropdownMenuSub>
      )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderOpen className="mr-2 h-4 w-4" />
          {t('load_config')}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {menuContent}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

    