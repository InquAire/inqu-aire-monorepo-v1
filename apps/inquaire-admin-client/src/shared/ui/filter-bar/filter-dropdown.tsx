/**
 * Filter Dropdown - Notion-style filter dropdown
 */

import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

export interface FilterOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  description?: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  multiple = false,
  searchable = false,
  searchPlaceholder = '검색...',
  emptyMessage = '결과 없음',
  className,
  align = 'start',
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const hasSelection = selectedValues.length > 0 && selectedValues[0] !== '';

  const getDisplayText = () => {
    if (!hasSelection) return label;

    if (selectedValues.length === 1) {
      const option = options.find(o => o.value === selectedValues[0]);
      return option?.label ?? label;
    }

    return `${label} (${selectedValues.length})`;
  };

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue === value ? '' : optionValue);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-8 px-2.5 gap-1.5 font-normal',
            'hover:bg-muted/80',
            hasSelection && 'bg-primary/10 text-primary hover:bg-primary/15',
            className
          )}
        >
          <span className="truncate max-w-[150px]">{getDisplayText()}</span>
          <ChevronDown
            className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open && 'rotate-180')}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align={align}>
        <Command>
          {searchable && <CommandInput placeholder={searchPlaceholder} className="h-9" />}
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {!multiple && (
                <CommandItem
                  value=""
                  onSelect={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', !hasSelection ? 'opacity-100' : 'opacity-0')}
                  />
                  전체
                </CommandItem>
              )}
              {options.map(option => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                    />
                    {option.icon && <span className="mr-2">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
