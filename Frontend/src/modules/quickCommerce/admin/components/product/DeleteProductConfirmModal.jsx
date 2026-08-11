import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export default function DeleteProductConfirmModal({ isOpen, onClose, onConfirm, productToDelete }) {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !productToDelete) return null;

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await onConfirm(productToDelete._id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 flex-shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Delete Product</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
          Are you sure you want to delete <span className="font-bold text-slate-900">"{productToDelete.name}"</span>?
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete Product
          </button>
        </div>
      </div>
    </div>
  );
}
