/**
 * VirtualizedTable Component
 *
 * react-window을 사용한 가상화 테이블 컴포넌트
 * 대용량 데이터를 효율적으로 렌더링합니다.
 */

import { CSSProperties, ReactNode, useMemo, ComponentType } from 'react';
import * as ReactWindow from 'react-window';

import { cn } from '../lib/utils';

// react-window v2 compatibility
const List = (ReactWindow as unknown as { FixedSizeList: ComponentType<{
  height: number;
  itemCount: number;
  itemSize: number;
  width: string | number;
  style?: CSSProperties;
  onScroll?: (props: { scrollOffset: number; scrollUpdateWasRequested: boolean }) => void;
  children: ComponentType<{ index: number; style: CSSProperties }>;
}> }).FixedSizeList;

interface Column<T> {
  /** 컬럼 키 */
  key: keyof T | string;
  /** 컬럼 헤더 */
  header: string;
  /** 컬럼 너비 (픽셀) */
  width?: number;
  /** 셀 렌더 함수 */
  render?: (item: T, index: number) => ReactNode;
  /** 컬럼 정렬 여부 */
  sortable?: boolean;
  /** 컬럼 클래스명 */
  className?: string;
}

interface VirtualizedTableProps<T> {
  /** 테이블 데이터 */
  data: T[];
  /** 컬럼 정의 */
  columns: Column<T>[];
  /** 행 높이 (기본값: 60) */
  rowHeight?: number;
  /** 테이블 높이 (기본값: 600) */
  height?: number;
  /** 테이블 너비 (기본값: '100%') */
  width?: string | number;
  /** 행 클릭 핸들러 */
  onRowClick?: (item: T, index: number) => void;
  /** 행 클래스명 함수 */
  rowClassName?: (item: T, index: number) => string;
  /** 로딩 중 여부 */
  isLoading?: boolean;
  /** 빈 데이터 메시지 */
  emptyMessage?: string;
  /** 헤더 고정 여부 (기본값: true) */
  stickyHeader?: boolean;
}

export function VirtualizedTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowHeight = 60,
  height = 600,
  width = '100%',
  onRowClick,
  rowClassName,
  isLoading = false,
  emptyMessage = '데이터가 없습니다.',
  stickyHeader = true,
}: VirtualizedTableProps<T>) {
  // 컬럼 너비 계산
  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (col.width || 150), 0);
  }, [columns]);

  // 행 렌더러
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => {
    const item = data[index];

    return (
      <div
        style={style}
        className={cn(
          'flex items-center border-b hover:bg-muted/50 transition-colors cursor-pointer',
          rowClassName?.(item, index)
        )}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column, colIndex) => {
          const value = column.render ? column.render(item, index) : String(item[column.key] ?? '');

          return (
            <div
              key={`${index}-${colIndex}`}
              className={cn('flex items-center px-4 py-2 text-sm truncate', column.className)}
              style={{
                width: column.width || 150,
                minWidth: column.width || 150,
              }}
            >
              {value}
            </div>
          );
        })}
      </div>
    );
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center border rounded-lg bg-muted/20"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 빈 데이터
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center border rounded-lg bg-muted/20"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div
        className={cn(
          'flex items-center bg-muted/50 border-b font-medium text-sm',
          stickyHeader && 'sticky top-0 z-10'
        )}
        style={{ minWidth: totalWidth }}
      >
        {columns.map((column, index) => (
          <div
            key={index}
            className={cn('flex items-center px-4 py-3 truncate', column.className)}
            style={{
              width: column.width || 150,
              minWidth: column.width || 150,
            }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* 가상화된 행 */}
      <List
        height={height - 45} // 헤더 높이 빼기
        itemCount={data.length}
        itemSize={rowHeight}
        width={width}
        style={{ minWidth: totalWidth }}
      >
        {Row}
      </List>
    </div>
  );
}

/**
 * 가상화된 리스트 (간단한 버전)
 */
interface VirtualizedListProps<T> {
  /** 리스트 데이터 */
  data: T[];
  /** 아이템 렌더 함수 */
  renderItem: (item: T, index: number) => ReactNode;
  /** 아이템 높이 (기본값: 60) */
  itemHeight?: number;
  /** 리스트 높이 (기본값: 600) */
  height?: number;
  /** 리스트 너비 (기본값: '100%') */
  width?: string | number;
  /** 로딩 중 여부 */
  isLoading?: boolean;
  /** 빈 데이터 메시지 */
  emptyMessage?: string;
}

export function VirtualizedList<T>({
  data,
  renderItem,
  itemHeight = 60,
  height = 600,
  width = '100%',
  isLoading = false,
  emptyMessage = '데이터가 없습니다.',
}: VirtualizedListProps<T>) {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => {
    return <div style={style}>{renderItem(data[index], index)}</div>;
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center border rounded-lg bg-muted/20"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 빈 데이터
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center border rounded-lg bg-muted/20"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <List height={height} itemCount={data.length} itemSize={itemHeight} width={width}>
        {Row}
      </List>
    </div>
  );
}

/**
 * 무한 스크롤을 지원하는 가상화 리스트
 */
interface InfiniteVirtualizedListProps<T> extends VirtualizedListProps<T> {
  /** 더 불러올 함수 */
  onLoadMore: () => void;
  /** 더 불러올 데이터가 있는지 */
  hasMore: boolean;
  /** 더 불러오는 중 */
  isLoadingMore?: boolean;
}

export function InfiniteVirtualizedList<T>({
  data,
  renderItem,
  itemHeight = 60,
  height = 600,
  width = '100%',
  isLoading = false,
  emptyMessage = '데이터가 없습니다.',
  onLoadMore,
  hasMore,
  isLoadingMore = false,
}: InfiniteVirtualizedListProps<T>) {
  const handleScroll = ({
    scrollOffset,
    scrollUpdateWasRequested,
  }: {
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }) => {
    // 스크롤이 하단에 가까워지면 더 불러오기
    if (!scrollUpdateWasRequested && hasMore && !isLoadingMore) {
      const threshold = height * 0.8; // 80% 스크롤 시 로드
      if (scrollOffset > threshold) {
        onLoadMore();
      }
    }
  };

  const Row = ({ index, style }: { index: number; style: CSSProperties }) => {
    // 마지막 아이템에 로딩 인디케이터 표시
    if (index === data.length) {
      return (
        <div style={style} className="flex items-center justify-center py-4">
          {isLoadingMore && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">로딩 중...</span>
            </div>
          )}
        </div>
      );
    }

    return <div style={style}>{renderItem(data[index], index)}</div>;
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center border rounded-lg bg-muted/20"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 빈 데이터
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center border rounded-lg bg-muted/20"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  // hasMore가 true면 로딩 인디케이터를 위한 추가 행 표시
  const itemCount = hasMore ? data.length + 1 : data.length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <List
        height={height}
        itemCount={itemCount}
        itemSize={itemHeight}
        width={width}
        onScroll={handleScroll}
      >
        {Row}
      </List>
    </div>
  );
}
