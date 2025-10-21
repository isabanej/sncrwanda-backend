import { useState, useMemo } from 'react';
import './DataTable.css';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  actions,
  onRowClick,
  emptyMessage = 'No records found'
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    // Global search
    if (searchTerm) {
      filtered = filtered.filter(row =>
        columns.some(col => {
          if (col.searchable === false) return false;
          const value = row[col.key];
          return String(value || '').toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Column-specific searches
    Object.entries(columnSearches).forEach(([key, search]) => {
      if (search) {
        filtered = filtered.filter(row => {
          const value = row[key];
          return String(value || '').toLowerCase().includes(search.toLowerCase());
        });
      }
    });

    // Sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, columnSearches, sortConfig, columns]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, columnSearches, pageSize]);

  const handleColumnSearch = (key: string, value: string) => {
    setColumnSearches(prev => ({ ...prev, [key]: value }));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="data-table-container">
      {/* Global Search */}
      <div className="table-controls">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search all columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="global-search"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="clear-search">
              ✕
            </button>
          )}
        </div>

        <div className="page-size-selector">
          <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>per page</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            {/* Column Headers */}
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={col.sortable !== false ? 'sortable' : ''}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="th-content">
                    <span>{col.label}</span>
                    {col.sortable !== false && (
                      <span className="sort-icon">
                        {sortConfig?.key === col.key ? (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        ) : (
                          '↕'
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th style={{ width: '150px' }}>Actions</th>}
            </tr>

            {/* Column Filters */}
            <tr className="filter-row">
              {columns.map((col) => (
                <th key={`filter-${col.key}`}>
                  {col.searchable !== false && (
                    <input
                      type="text"
                      placeholder={`Search by ${col.label.toLowerCase()}...`}
                      value={columnSearches[col.key] || ''}
                      onChange={(e) => handleColumnSearch(col.key, e.target.value)}
                      className="column-filter"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </th>
              ))}
              {actions && <th></th>}
            </tr>
          </thead>

          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="empty-message">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'clickable' : ''}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actions && <td className="actions-cell">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="pagination-container">
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="page-btn"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="page-btn"
            >
              ‹
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="page-btn"
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="page-btn"
            >
              »
            </button>
          </div>
        )}

        <div className="pagination-info">
          Showing {filteredAndSortedData.length === 0 ? 0 : startIndex + 1} to{' '}
          {Math.min(endIndex, filteredAndSortedData.length)} of {filteredAndSortedData.length}{' '}
          {filteredAndSortedData.length === 1 ? 'record' : 'records'}
          {data.length !== filteredAndSortedData.length && (
            <span className="filtered-note"> (filtered from {data.length} total)</span>
          )}
        </div>
      </div>
    </div>
  );
}
