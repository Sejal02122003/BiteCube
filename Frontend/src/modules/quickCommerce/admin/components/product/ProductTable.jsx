import React from 'react';
import { Pencil, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight, Loader2, FolderTree, GitFork, PackageCheck, AlertCircle } from 'lucide-react';
import { getMediaUrl } from '@/shared/utils/media.js';

export default function ProductTable({
  products = [],
  loading = false,
  pagination = {},
  onPageChange,
  onEditProduct,
  onDeleteProduct,
  onToggleStatus
}) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-sm font-medium text-slate-500">Loading products...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-3">
          <ImageIcon className="h-7 w-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">No products found</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
          Try adjusting your search terms or filters, or click "Add Product" to add a new item.
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
              <th scope="col" className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">Product</th>
              <th scope="col" className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">Category / Subcategory</th>
              <th scope="col" className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">Unit / Pack</th>
              <th scope="col" className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">Price</th>
              <th scope="col" className="px-5 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">Stock</th>
              <th scope="col" className="px-5 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">Status</th>
              <th scope="col" className="px-5 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((prod) => {
              const categoryName = prod?.categoryId?.name || prod?.categoryName || "Unassigned";
              const subcategoryName = prod?.subcategoryId?.name || prod?.subcategoryName || "-";
              const imgUrl = prod.mainImage || (Array.isArray(prod.images) && prod.images[0]) || '';
              const isOutOfStock = (prod.stock ?? 0) <= 0;

              return (
                <tr key={prod._id} className="align-middle hover:bg-slate-50/80 transition-colors">
                  
                  {/* Product & Image */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-100 flex-shrink-0 flex items-center justify-center border border-slate-200">
                        {imgUrl ? (
                          <img
                            src={getMediaUrl(imgUrl)}
                            alt={prod.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`h-full w-full flex items-center justify-center text-sm font-bold text-slate-500 ${imgUrl ? 'hidden' : ''}`}>
                          {String(prod?.name || "P").slice(0, 1).toUpperCase()}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold leading-6 text-slate-900">{prod.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {prod.brand && (
                            <span className="text-xs font-medium text-slate-500">
                              Brand: <span className="font-semibold text-slate-700">{prod.brand}</span>
                            </span>
                          )}
                          {prod.sku && (
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {prod.sku}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category & Subcategory */}
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                        <FolderTree className="h-3 w-3 text-blue-600" />
                        {categoryName}
                      </span>
                      {subcategoryName !== "-" && (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            <GitFork className="h-2.5 w-2.5 text-slate-400" />
                            {subcategoryName}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Unit / Pack Size & Variants */}
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-700 font-medium">
                        {prod.packSize ? (
                          <span className="font-semibold text-slate-900">{prod.packSize}</span>
                        ) : (
                          <span>{prod.unitValue || 1} {prod.unit || 'pcs'}</span>
                        )}
                      </div>
                      {Array.isArray(prod.variants) && prod.variants.length > 0 && (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {prod.variants.length} Variants
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-5 py-4">
                    <div className="space-y-0.5">
                      {prod.discountPrice ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900">₹{prod.discountPrice}</span>
                          <span className="text-xs text-slate-400 line-through">₹{prod.price}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-slate-900">₹{prod.price}</span>
                      )}
                    </div>
                  </td>

                  {/* Stock Level */}
                  <td className="px-5 py-4 text-center">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                        <AlertCircle className="h-3 w-3 text-rose-600" />
                        Out of Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        <PackageCheck className="h-3 w-3 text-emerald-600" />
                        {prod.stock} in stock
                      </span>
                    )}
                  </td>

                  {/* Active Status Toggle Switch */}
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => onToggleStatus(prod._id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        prod.isActive ? "bg-blue-600" : "bg-slate-300"
                      }`}
                      title={prod.isActive ? "Deactivate" : "Activate"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          prod.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEditProduct(prod)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(prod)}
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
            <span className="font-semibold text-slate-900">{pagination.total}</span> products
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
