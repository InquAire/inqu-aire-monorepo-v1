import * as React from 'react';

/**
 * 테이블 페이지네이션 기능을 위한 커스텀 hook
 */
export function useTablePagination<T>(
  data: T[],
  pageSize: number,
  dependencies: React.DependencyList = []
) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset to first page when dependencies change
  React.useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return {
    currentPage,
    totalPages,
    paginatedData,
    handlePreviousPage,
    handleNextPage,
    setCurrentPage,
  };
}
