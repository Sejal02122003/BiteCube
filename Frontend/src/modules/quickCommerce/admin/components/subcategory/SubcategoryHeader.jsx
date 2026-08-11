import React from 'react';
import { Plus, GitFork, CheckCircle2, XCircle } from 'lucide-react';

export default function SubcategoryHeader({ stats = {}, onOpenAddModal }) {
  return (
    <div className="space-y-5">
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Subcategories</h1>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {stats.totalAll || 0} Total
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage product subcategories, parent categories, status, and organization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Subcategory
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <GitFork className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Subcategories</p>
            <p className="text-xl font-bold text-slate-900">{stats.totalAll || 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</p>
            <p className="text-xl font-bold text-emerald-600">{stats.active || 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inactive</p>
            <p className="text-xl font-bold text-rose-600">{stats.inactive || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
