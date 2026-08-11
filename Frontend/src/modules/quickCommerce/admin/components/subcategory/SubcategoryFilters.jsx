import React from 'react';
import { Search, X, Filter, ArrowUpDown, RotateCcw, FolderTree } from 'lucide-react';

export default function SubcategoryFilters({
  searchQuery,
  onSearchChange,
  categoryIdFilter,
  onCategoryIdFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  onResetFilters,
  categoriesList = []
}) {
  const hasActiveFilters = searchQuery || categoryIdFilter || statusFilter !== 'all' || sortBy !== 'sortOrder';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search subcategories by name, slug or parent category..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Parent Category Filter */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <FolderTree className="h-4 w-4 text-slate-400" />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Category:</span>
            <select
              value={categoryIdFilter}
              onChange={(e) => onCategoryIdFilterChange(e.target.value)}
              className="bg-transparent font-medium text-slate-900 outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="bg-transparent font-medium text-slate-900 outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="bg-transparent font-medium text-slate-900 outline-none cursor-pointer"
            >
              <option value="sortOrder">Sort Order (Asc)</option>
              <option value="name">Name (A-Z)</option>
              <option value="createdAt">Newest First</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
