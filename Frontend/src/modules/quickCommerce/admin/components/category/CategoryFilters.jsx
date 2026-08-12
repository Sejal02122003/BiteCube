import React from 'react';
import { Search, X, Filter, ArrowUpDown, RotateCcw } from 'lucide-react';

export default function CategoryFilters({
  searchQuery,
  onSearchChange,
  zoneFilter,
  onZoneFilterChange,
  zones = [],
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  onResetFilters
}) {
  const hasActiveFilters = searchQuery || zoneFilter || statusFilter !== 'all' || sortBy !== 'sortOrder';

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
            placeholder="Search categories by name or slug..."
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
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Zone:</span>
            <select
              value={zoneFilter}
              onChange={(e) => onZoneFilterChange(e.target.value)}
              className="bg-transparent font-medium text-slate-900 outline-none cursor-pointer"
            >
              <option value="">All Zones</option>
              {zones.map((zone) => (
                <option key={zone._id} value={zone._id}>
                  {zone.zoneName || zone.name || zone.serviceLocation || 'Unnamed Zone'}
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
