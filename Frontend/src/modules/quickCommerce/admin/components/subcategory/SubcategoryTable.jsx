import React from 'react';
import { Pencil, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight, Loader2, FolderTree } from 'lucide-react';
import { getMediaUrl } from '@/shared/utils/media.js';

export default function SubcategoryTable({
  subcategories = [],
  loading = false,
  pagination = {},
  onPageChange,
  onEditSubcategory,
  onDeleteSubcategory,
  onToggleStatus
}) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-sm font-medium text-slate-500">Loading subcategories...</p>
      </div>
    );
  }

  if (subcategories.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-3">
          <ImageIcon className="h-7 w-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">No subcategories found</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
          Try a different search term or click "Add Subcategory" to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th scope="col" className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">Subcategory</th>
              <th scope="col" className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">Parent Category</th>
              <th scope="col" className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">Slug</th>
              <th scope="col" className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">Description</th>
              <th scope="col" className="px-5 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">Sort Order</th>
              <th scope="col" className="px-5 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">Status</th>
              <th scope="col" className="px-5 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subcategories.map((sub) => {
              const parentCatName = sub?.categoryId?.name || sub?.categoryName || "Unassigned";

              return (
                <tr key={sub._id} className="align-middle hover:bg-slate-50/80 transition-colors">
                  
                  {/* Subcategory & Thumbnail */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 overflow-hidden rounded-2xl bg-slate-100 flex-shrink-0 flex items-center justify-center border border-slate-200">
                        {sub.image ? (
                          <img
                            src={getMediaUrl(sub.image)}
                            alt={sub.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`h-full w-full flex items-center justify-center text-sm font-bold text-slate-500 ${sub.image ? 'hidden' : ''}`}>
                          {String(sub?.name || "S").slice(0, 1).toUpperCase()}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold leading-6 text-slate-900">{sub.name}</p>
                      </div>
                    </div>
                  </td>

                  {/* Parent Category Badge */}
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800">
                      <FolderTree className="h-3.5 w-3.5 text-blue-600" />
                      {parentCatName}
                    </span>
                  </td>

                  {/* Slug */}
                  <td className="px-5 py-4">
                    <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-medium text-slate-700">
                      {sub.slug}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-5 py-4">
                    <p className="text-xs text-slate-500 max-w-xs truncate">
                      {sub.description || <span className="italic text-slate-400">No description</span>}
                    </p>
                  </td>

                  {/* Sort Order */}
                  <td className="px-5 py-4 text-center">
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {sub.sortOrder ?? 0}
                    </span>
                  </td>

                  {/* Status Toggle Switch */}
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => onToggleStatus(sub._id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        sub.isActive ? "bg-blue-600" : "bg-slate-300"
                      }`}
                      title={sub.isActive ? "Deactivate" : "Activate"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          sub.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEditSubcategory(sub)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteSubcategory(sub)}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3.5">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
            <span className="font-semibold text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
            <span className="font-semibold text-slate-900">{pagination.total}</span> subcategories
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
