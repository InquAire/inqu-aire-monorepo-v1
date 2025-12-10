import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from './badge';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Input } from './input';
import { Label } from './label';

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: Date;
}

interface SavedFiltersProps {
  /** 저장소 키 (예: 'customers-filters', 'inquiries-filters') */
  storageKey: string;
  /** 현재 적용된 필터 */
  currentFilters: Record<string, unknown>;
  /** 필터 적용 핸들러 */
  onApplyFilter: (filters: Record<string, unknown>) => void;
  /** 필터 초기화 핸들러 */
  onResetFilters: () => void;
}

export function SavedFilters({
  storageKey,
  currentFilters,
  onApplyFilter,
  onResetFilters,
}: SavedFiltersProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  // 필터 저장
  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast.error('필터 이름을 입력하세요');
      return;
    }

    // 현재 필터에서 빈 값 제거
    const cleanFilters = Object.entries(currentFilters).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    if (Object.keys(cleanFilters).length === 0) {
      toast.error('적용된 필터가 없습니다');
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: cleanFilters,
      createdAt: new Date(),
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    setFilterName('');
    setDialogOpen(false);
    toast.success('필터가 저장되었습니다');
  };

  // 필터 삭제
  const handleDeleteFilter = (filterId: string) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    toast.success('필터가 삭제되었습니다');
  };

  // 필터 적용
  const handleApplySavedFilter = (filter: SavedFilter) => {
    onApplyFilter(filter.filters);
    toast.success(`"${filter.name}" 필터가 적용되었습니다`);
  };

  // 필터 조건 개수 계산
  const _getFilterCount = (filters: Record<string, unknown>) => {
    return Object.keys(filters).length;
  };

  // 필터 요약 텍스트 생성
  const _getFilterSummary = (filters: Record<string, unknown>) => {
    const entries = Object.entries(filters);
    if (entries.length === 0) return '조건 없음';
    if (entries.length === 1) {
      const [key, value] = entries[0];
      return `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`;
    }
    return `${entries.length}개 조건`;
  };

  // 사용하지 않는 함수 경고 방지
  void _getFilterCount;
  void _getFilterSummary;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 저장된 필터 목록 */}
      {savedFilters.map(filter => (
        <Badge
          key={filter.id}
          variant="secondary"
          className="gap-2 pr-1 cursor-pointer hover:bg-secondary/80"
        >
          <span onClick={() => handleApplySavedFilter(filter)}>{filter.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => handleDeleteFilter(filter.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* 현재 필터 저장 버튼 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            필터 저장
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>필터 저장</DialogTitle>
            <DialogDescription>
              현재 적용된 필터를 저장하여 나중에 빠르게 적용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="filter-name">필터 이름</Label>
              <Input
                id="filter-name"
                placeholder="예: 이번 주 신규 고객"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSaveFilter();
                  }
                }}
              />
            </div>

            {/* 현재 필터 미리보기 */}
            <div className="rounded-md border p-3 bg-muted/50">
              <div className="text-sm font-medium mb-2">저장될 필터:</div>
              <div className="text-xs text-muted-foreground space-y-1">
                {Object.entries(currentFilters).map(
                  ([key, value]) =>
                    value !== undefined &&
                    value !== null &&
                    value !== '' && (
                      <div key={key}>
                        <span className="font-medium">{key}:</span>{' '}
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </div>
                    )
                )}
                {Object.keys(currentFilters).filter(
                  key =>
                    currentFilters[key] !== undefined &&
                    currentFilters[key] !== null &&
                    currentFilters[key] !== ''
                ).length === 0 && (
                  <div className="text-muted-foreground italic">적용된 필터가 없습니다</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSaveFilter}>저장</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 필터 초기화 버튼 */}
      {Object.keys(currentFilters).some(
        key =>
          currentFilters[key] !== undefined &&
          currentFilters[key] !== null &&
          currentFilters[key] !== ''
      ) && (
        <Button variant="ghost" size="sm" className="gap-2" onClick={onResetFilters}>
          <X className="h-4 w-4" />
          초기화
        </Button>
      )}
    </div>
  );
}
