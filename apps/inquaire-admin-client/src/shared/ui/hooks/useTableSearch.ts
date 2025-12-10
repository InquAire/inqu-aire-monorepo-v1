import * as React from 'react';

/**
 * 테이블 검색 기능을 위한 커스텀 hook
 * @param data - 검색할 데이터 배열
 * @param searchKeys - 검색할 특정 키들 (선택사항, 미지정 시 모든 키에서 검색)
 */
export function useTableSearch<T extends Record<string, unknown>>(data: T[], searchKeys?: (keyof T)[]) {
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filter data based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery) return data;

    return data.filter(row => {
      // If searchKeys is specified, only search in those keys
      if (searchKeys && searchKeys.length > 0) {
        return searchKeys.some(key => {
          const value = row[key];
          return value && String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      }

      // Otherwise, search in all values
      return Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [data, searchQuery, searchKeys]);

  return {
    searchQuery,
    setSearchQuery,
    filteredData,
  };
}
