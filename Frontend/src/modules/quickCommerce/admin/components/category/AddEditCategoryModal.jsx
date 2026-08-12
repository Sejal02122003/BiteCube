import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadCategoryImage } from '../../services/categoryService';
import { getMediaUrl } from '@/shared/utils/media.js';

export default function AddEditCategoryModal({
  isOpen,
  onClose,
  onSubmit,
  categoryToEdit = null,
  zones = [],
}) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    zoneId: '',
    sortOrder: 0,
    isActive: true,
  });

  const [uploadTab, setUploadTab] = useState('file'); // 'file' or 'url'
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (categoryToEdit) {
      setFormData({
        name: categoryToEdit.name || '',
        slug: categoryToEdit.slug || '',
        description: categoryToEdit.description || '',
        image: categoryToEdit.image || '',
        zoneId: categoryToEdit.zoneId?._id || categoryToEdit.zoneId || '',
        sortOrder: categoryToEdit.sortOrder ?? 0,
        isActive: categoryToEdit.isActive !== undefined ? categoryToEdit.isActive : true,
      });
      setUploadTab(categoryToEdit.image ? 'url' : 'file');
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        image: '',
        zoneId: zones[0]?._id || '',
        sortOrder: 0,
        isActive: true,
      });
      setUploadTab('file');
    }
    setErrorMsg('');
  }, [categoryToEdit, isOpen, zones]);

  // Generate slug automatically when name changes
  const handleNameChange = (e) => {
    const nameVal = e.target.value;
    const generatedSlug = nameVal
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      slug: generatedSlug,
    }));
  };

  const handleImageFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorMsg('');
      const res = await uploadCategoryImage(file);
      const imageUrl = res?.file?.url || res?.file?.path || res?.data?.file?.url || res?.data?.url || res?.url || (typeof res?.data === 'string' ? res.data : null);
      if (imageUrl) {
        setFormData((prev) => ({ ...prev, image: imageUrl }));
      } else {
        setErrorMsg('Failed to get uploaded image URL.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Category name is required.');
      return;
    }

    if (!formData.zoneId) {
      setErrorMsg('Zone is required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error('Submit category error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">
            {categoryToEdit ? 'Edit Category' : 'Add New Category'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. Fruits & Vegetables"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Slug (URL Identifier)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="fruits-vegetables"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Zone <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.zoneId}
              onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
            >
              <option value="">Select zone</option>
              {zones.map((zone) => (
                <option key={zone._id} value={zone._id}>
                  {zone.zoneName || zone.name || zone.serviceLocation || 'Unnamed Zone'}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Short description of this category..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
            />
          </div>

          {/* Image Upload Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Category Image
              </label>
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setUploadTab('file')}
                  className={`rounded-md px-2.5 py-0.5 transition-all cursor-pointer ${
                    uploadTab === 'file' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTab('url')}
                  className={`rounded-md px-2.5 py-0.5 transition-all cursor-pointer ${
                    uploadTab === 'url' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                  }`}
                >
                  Image URL
                </button>
              </div>
            </div>

            {uploadTab === 'file' ? (
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-slate-900 transition-colors bg-slate-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  disabled={uploading}
                />
                <div className="flex flex-col items-center justify-center space-y-1">
                  {uploading ? (
                    <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
                  ) : (
                    <Upload className="h-7 w-7 text-slate-400" />
                  )}
                  <p className="text-xs font-semibold text-slate-700">
                    {uploading ? 'Uploading image...' : 'Click or Drag & Drop image here'}
                  </p>
                  <p className="text-[10px] text-slate-400">PNG, JPG, WEBP up to 5MB</p>
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://example.com/category-image.png"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
              />
            )}

            {/* Image Preview */}
            {formData.image && (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img
                  src={getMediaUrl(formData.image)}
                  alt="Preview"
                  className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{formData.image}</p>
                  <p className="text-[10px] text-blue-600 font-medium">Image uploaded</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image: '' })}
                  className="text-xs font-semibold text-rose-600 hover:underline p-1 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Sort Order
            </label>
            <input
              type="number"
              min="0"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
            />
          </div>

          {/* Active Toggle Switch */}
          <div className="pt-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-900">Active Status</p>
                <p className="text-[10px] text-slate-500">Visible in user catalog</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  formData.isActive ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {categoryToEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
