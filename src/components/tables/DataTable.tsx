"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Search, Filter, X, Download, Columns, Check, ArrowUpDown,
  MoreHorizontal, SortAsc, SortDesc, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───

export interface Column<T = Record<string, unknown>> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
  hideable?: boolean;
  hidden?: boolean;
  cellClassName?: string;
  headerClassName?: string;
  renderExport?: (row: T) => string;
}

export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

export interface FilterConfig {
  key: string;
  value: string;
  operator: "contains" | "equals" | "startsWith" | "endsWith" | "gt" | "lt" | "gte" | "lte" | "between" | "in";
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
}

interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  pagination?: PaginationConfig;
  onPaginationChange?: (pagination: PaginationConfig) => void;
  onSort?: (sort: SortConfig | null) => void;
  onFilter?: (filters: FilterConfig[]) => void;
  onSearch?: (query: string) => void;
  onRowClick?: (row: T) => void;
  onExport?: (format: "csv" | "json") => void;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  bordered?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  defaultSort?: SortConfig;
  defaultPageSize?: number;
  showColumnToggle?: boolean;
  showExport?: boolean;
  showSearch?: boolean;
  showPagination?: boolean;
}

// ─── Utility Functions ───

function applySorting<T>(data: T[], sort: SortConfig | null, columns: Column<T>[]): T[] {
  if (!sort) return data;
  const column = columns.find((c) => c.key === sort.key);
  if (!column) return data;

  return [...data].sort((a, b) => {
    const aVal = column.accessor(a);
    const bVal = column.accessor(b);

    let comparison = 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      comparison = aVal - bVal;
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime();
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sort.direction === "asc" ? comparison : -comparison;
  });
}

function applyFiltering<T>(data: T[], filters: FilterConfig[], columns: Column<T>[]): T[] {
  if (filters.length === 0) return data;

  return data.filter((row) => {
    return filters.every((filter) => {
      const column = columns.find((c) => c.key === filter.key);
      if (!column) return true;

      const value = String(column.accessor(row) ?? "").toLowerCase();
      const filterValue = filter.value.toLowerCase();

      switch (filter.operator) {
        case "contains": return value.includes(filterValue);
        case "equals": return value === filterValue;
        case "startsWith": return value.startsWith(filterValue);
        case "endsWith": return value.endsWith(filterValue);
        case "gt": return Number(value) > Number(filterValue);
        case "lt": return Number(value) < Number(filterValue);
        case "gte": return Number(value) >= Number(filterValue);
        case "lte": return Number(value) <= Number(filterValue);
        default: return true;
      }
    });
  });
}

function applySearch<T>(data: T[], query: string, columns: Column<T>[]): T[] {
  if (!query.trim()) return data;
  const q = query.toLowerCase();

  return data.filter((row) => {
    return columns.some((col) => {
      if (!col.searchable) return false;
      const value = String(col.accessor(row) ?? "").toLowerCase();
      return value.includes(q);
    });
  });
}

// ─── Sub-Components ───

function TableSearch({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search..."}
        className="bg-surface-800 border border-surface-700 rounded-lg pl-10 pr-4 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 w-64 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function ColumnToggle<T>({
  columns, onChange,
}: {
  columns: Column<T>[]; onChange: (key: string, visible: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary text-sm flex items-center gap-1.5"
      >
        <Columns className="w-4 h-4" />
        Columns
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-surface-900 border border-surface-700 rounded-lg shadow-xl p-2 min-w-[200px]">
            {columns
              .filter((c) => c.hideable !== false)
              .map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-3 py-2 rounded hover:bg-surface-800 cursor-pointer text-sm text-surface-300"
                >
                  <input
                    type="checkbox"
                    checked={!col.hidden}
                    onChange={(e) => onChange(col.key, e.target.checked)}
                    className="rounded accent-brand-500"
                  />
                  {col.header}
                </label>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function TablePagination({
  config, onChange,
}: {
  config: PaginationConfig; onChange: (p: PaginationConfig) => void;
}) {
  const totalPages = Math.ceil(config.total / config.pageSize);
  const start = (config.page - 1) * config.pageSize + 1;
  const end = Math.min(config.page * config.pageSize, config.total);

  const pages = useMemo(() => {
    const p: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) p.push(i);
    } else {
      p.push(1);
      if (config.page > 3) p.push("...");
      for (let i = Math.max(2, config.page - 1); i <= Math.min(totalPages - 1, config.page + 1); i++) {
        p.push(i);
      }
      if (config.page < totalPages - 2) p.push("...");
      p.push(totalPages);
    }
    return p;
  }, [totalPages, config.page]);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800">
      <div className="text-sm text-surface-400">
        Showing {start}-{end} of {config.total.toLocaleString()}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange({ ...config, page: config.page - 1 })}
          disabled={config.page <= 1}
          className="p-1.5 rounded hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed text-surface-400"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-2 text-surface-600">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange({ ...config, page: p })}
              className={cn(
                "w-8 h-8 rounded text-sm font-medium transition-colors",
                config.page === p
                  ? "bg-brand-600 text-white"
                  : "text-surface-400 hover:bg-surface-800 hover:text-white"
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange({ ...config, page: config.page + 1 })}
          disabled={config.page >= totalPages}
          className="p-1.5 rounded hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed text-surface-400"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-surface-400">
        <span>Rows:</span>
        <select
          value={config.pageSize}
          onChange={(e) =>
            onChange({ ...config, pageSize: Number(e.target.value), page: 1 })
          }
          className="bg-surface-800 border border-surface-700 rounded px-2 py-1 text-surface-200 text-sm"
        >
          {(config.pageSizeOptions || [10, 25, 50, 100]).map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FilterRow<T>({
  columns, filters, onFilterChange,
}: {
  columns: Column<T>[]; filters: FilterConfig[]; onFilterChange: (f: FilterConfig[]) => void;
}) {
  const updateFilter = (key: string, value: string) => {
    if (!value.trim()) {
      onFilterChange(filters.filter((f) => f.key !== key));
    } else {
      const existing = filters.find((f) => f.key === key);
      if (existing) {
        onFilterChange(filters.map((f) => (f.key === key ? { ...f, value } : f)));
      } else {
        onFilterChange([...filters, { key, value, operator: "contains" }]);
      }
    }
  };

  return (
    <tr className="bg-surface-900/50">
      {columns
        .filter((c) => !c.hidden)
        .map((col) => (
          <th key={`filter-${col.key}`} className="px-3 py-1.5">
            {col.filterable !== false && (
              <input
                type="text"
                placeholder={`Filter ${col.header}...`}
                value={filters.find((f) => f.key === col.key)?.value || ""}
                onChange={(e) => updateFilter(col.key, e.target.value)}
                className="w-full bg-surface-800 border border-surface-700 rounded px-2 py-1 text-xs text-surface-200 placeholder-surface-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            )}
          </th>
        ))}
    </tr>
  );
}

// ─── Main DataTable Component ───

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField = "id",
  pagination,
  onPaginationChange,
  onSort,
  onFilter,
  onSearch,
  onRowClick,
  onExport,
  selectable = false,
  onSelectionChange,
  loading = false,
  emptyMessage = "No data found.",
  searchPlaceholder,
  className,
  rowClassName,
  striped = false,
  hoverable = true,
  compact = false,
  bordered = false,
  stickyHeader = false,
  maxHeight,
  defaultSort,
  defaultPageSize = 25,
  showColumnToggle = true,
  showExport = true,
  showSearch = true,
  showPagination = true,
}: DataTableProps<T>) {
  // State
  const [sort, setSort] = useState<SortConfig | null>(defaultSort || null);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map((c) => c.key))
  );
  const [showFilters, setShowFilters] = useState(false);

  // Compute visible columns
  const displayColumns = useMemo(
    () => columns.filter((c) => visibleColumns.has(c.key) && !c.hidden),
    [columns, visibleColumns]
  );

  // Process data: filter -> search -> sort -> paginate
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    result = applyFiltering(result, filters, columns);

    // Apply search
    result = applySearch(result, searchQuery, columns);

    // Apply sorting
    result = applySorting(result, sort, columns);

    return result;
  }, [data, filters, searchQuery, sort, columns]);

  // Paginate
  const totalItems = processedData.length;
  const effectivePagination = pagination || {
    page: currentPage,
    pageSize,
    total: totalItems,
    pageSizeOptions: [10, 25, 50, 100],
  };

  const paginatedData = useMemo(() => {
    if (!showPagination) return processedData;
    const start = (effectivePagination.page - 1) * effectivePagination.pageSize;
    return processedData.slice(start, start + effectivePagination.pageSize);
  }, [processedData, effectivePagination, showPagination]);

  // Handlers
  const handleSort = useCallback(
    (key: string) => {
      const newSort: SortConfig | null =
        sort?.key === key
          ? sort.direction === "asc"
            ? { key, direction: "desc" }
            : null
          : { key, direction: "asc" };

      setSort(newSort);
      onSort?.(newSort);
    },
    [sort, onSort]
  );

  const handleFilterChange = useCallback(
    (newFilters: FilterConfig[]) => {
      setFilters(newFilters);
      onFilter?.(newFilters);
    },
    [onFilter]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      onSearch?.(query);
    },
    [onSearch]
  );

  const handlePageChange = useCallback(
    (p: PaginationConfig) => {
      setCurrentPage(p.page);
      setPageSize(p.pageSize);
      onPaginationChange?.(p);
    },
    [onPaginationChange]
  );

  const toggleSelectAll = useCallback(() => {
    if (selected.size === paginatedData.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const all = new Set(paginatedData.map((r) => String(r[keyField])));
      setSelected(all);
      onSelectionChange?.(paginatedData);
    }
  }, [selected, paginatedData, keyField, onSelectionChange]);

  const toggleSelectRow = useCallback(
    (row: T) => {
      const key = String(row[keyField]);
      const next = new Set(selected);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      setSelected(next);
      onSelectionChange?.(paginatedData.filter((r) => next.has(String(r[keyField]))));
    },
    [selected, paginatedData, keyField, onSelectionChange]
  );

  const handleColumnToggle = useCallback((key: string, visible: boolean) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (visible) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  // Export
  const handleExport = useCallback(
    (format: "csv" | "json") => {
      if (onExport) {
        onExport(format);
        return;
      }

      if (format === "csv") {
        const headers = displayColumns.map((c) => c.header).join(",");
        const rows = processedData.map((row) =>
          displayColumns
            .map((c) => {
              const val = c.renderExport ? c.renderExport(row) : String(c.accessor(row) ?? "");
              return val.includes(",") ? `"${val.replace(/"/g, '""')}"` : val;
            })
            .join(",")
        );
        const csv = [headers, ...rows].join("\n");
        downloadFile(csv, "export.csv", "text/csv");
      } else {
        const json = JSON.stringify(processedData, null, 2);
        downloadFile(json, "export.json", "application/json");
      }
    },
    [processedData, displayColumns, onExport]
  );

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn("card", className)}>
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {displayColumns.map((_, j) => (
                <div key={j} className="skeleton h-8 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("card flex flex-col", className)}>
      {/* Toolbar */}
      {(showSearch || showColumnToggle || showExport || showFilters) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {showSearch && (
              <TableSearch
                value={searchQuery}
                onChange={handleSearch}
                placeholder={searchPlaceholder}
              />
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "btn-secondary text-sm flex items-center gap-1.5",
                showFilters && "bg-surface-700"
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              {filters.length > 0 && (
                <span className="bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {filters.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectable && selected.size > 0 && (
              <span className="text-sm text-brand-400">
                {selected.size} selected
              </span>
            )}
            {showColumnToggle && (
              <ColumnToggle columns={columns} onChange={handleColumnToggle} />
            )}
            {showExport && (
              <div className="flex gap-1">
                <button
                  onClick={() => handleExport("csv")}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <Download className="w-4 h-4" /> JSON
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className={cn("overflow-auto", maxHeight && "overflow-y-auto")}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full">
          <thead className={cn(stickyHeader && "sticky top-0 z-10 bg-surface-900")}>
            <tr className="border-b border-surface-800">
              {selectable && (
                <th className={cn("px-3 py-3", compact && "py-2")} style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selected.size === paginatedData.length && paginatedData.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded accent-brand-500"
                  />
                </th>
              )}
              {displayColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider select-none",
                    compact && "py-2",
                    col.sortable !== false && "cursor-pointer hover:text-white transition-colors",
                    col.headerClassName
                  )}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth,
                    maxWidth: col.maxWidth,
                    textAlign: col.align || "left",
                  }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && (
                      <span className="text-surface-600">
                        {sort?.key === col.key ? (
                          sort.direction === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-brand-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-brand-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
            {showFilters && (
              <FilterRow columns={columns} filters={filters} onFilterChange={handleFilterChange} />
            )}
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={displayColumns.length + (selectable ? 1 : 0)}
                  className="text-center py-16 text-surface-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-surface-700" />
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const key = String(row[keyField] || rowIndex);
                const isSelected = selected.has(key);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b border-surface-800/50 transition-colors",
                      striped && rowIndex % 2 === 1 && "bg-surface-900/30",
                      hoverable && "hover:bg-surface-800/50",
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-brand-500/5",
                      rowClassName?.(row, rowIndex)
                    )}
                  >
                    {selectable && (
                      <td className={cn("px-3 py-3", compact && "py-2")}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded accent-brand-500"
                        />
                      </td>
                    )}
                    {displayColumns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-3 text-sm text-surface-200",
                          compact && "py-2",
                          col.cellClassName
                        )}
                        style={{ textAlign: col.align || "left" }}
                      >
                        {col.accessor(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <TablePagination
          config={{
            page: effectivePagination.page,
            pageSize: effectivePagination.pageSize,
            total: totalItems,
            pageSizeOptions: effectivePagination.pageSizeOptions,
          }}
          onChange={handlePageChange}
        />
      )}

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-surface-800 text-xs text-surface-600 flex justify-between">
        <span>{totalItems.toLocaleString()} total records</span>
        <span>
          {filters.length > 0 && `${filters.length} active filter(s) · `}
          Sorted by: {sort ? `${sort.key} (${sort.direction})` : "default"}
        </span>
      </div>
    </div>
  );
}

// ─── Utility ───

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Hook for server-side data ───

export function useDataTable<T extends Record<string, unknown>>(
  fetchFn: (params: {
    page: number;
    pageSize: number;
    sort?: SortConfig;
    search?: string;
    filters?: FilterConfig[];
  }) => Promise<{ data: T[]; total: number }>,
  initialPageSize: number = 25
) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterConfig[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn({ page, pageSize, sort: sort || undefined, search: search || undefined, filters });
      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, pageSize, sort, search, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  return {
    data, total, loading, error,
    pagination: { page, pageSize, total },
    sort, search, filters,
    setPage, setPageSize, setSort, setSearch, setFilters,
    refresh: fetch,
  };
}
