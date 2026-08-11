import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Loader2, Plus, Trash2, Layers } from 'lucide-react';
import { uploadCategoryImage } from '../../services/categoryService';
import { getMediaUrl } from '@/shared/utils/media.js';

export default function AddEditProductModal({
  isOpen,
  onClose,
  onSubmit,
  productToEdit = null,
  categoriesList = [],
  subcategoriesList = []
}) {
  const [formData, setFormData] = useState({
    categoryId: '',
    subcategoryId: '',
    name: '',
    slug: '',
    brand: '',
    sku: '',
    unit: 'pcs',
    unitValue: 1,
    packSize: '',
    price: '',
    discountPrice: '',
    costPrice: '',
    stock: 0,
    description: '',
    mainImage: '',
    variants: [],
    isActive: true,
  });

  const [uploadTab, setUploadTab] = useState('file'); // 'file' or 'url'
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Available subcategories filtered by selected category
  const availableSubcategories = formData.categoryId
    ? subcategoriesList.filter((s) => {
        const pId = s.categoryId?._id || s.categoryId;
        return String(pId) === String(formData.categoryId);
      })
    : subcategoriesList;

  useEffect(() => {
    if (productToEdit) {
      const parentCatId = productToEdit.categoryId?._id || productToEdit.categoryId || '';
      const subCatId = productToEdit.subcategoryId?._id || productToEdit.subcategoryId || '';
      const img = productToEdit.mainImage || (Array.isArray(productToEdit.images) && productToEdit.images[0]) || '';
      const parsedVariants = Array.isArray(productToEdit.variants)
        ? productToEdit.variants.map((v) => ({
            _id: v._id,
            name: v.name || '',
            price: v.price ?? '',
            discountPrice: v.discountPrice ?? '',
            stock: v.stock ?? 0,
            sku: v.sku || '',
            isAvailable: v.isAvailable !== undefined ? v.isAvailable : true,
          }))
        : [];

      setFormData({
        categoryId: parentCatId,
        subcategoryId: subCatId,
        name: productToEdit.name || '',
        slug: productToEdit.slug || '',
        brand: productToEdit.brand || '',
        sku: productToEdit.sku || '',
        unit: productToEdit.unit || 'pcs',
        unitValue: productToEdit.unitValue ?? 1,
        packSize: productToEdit.packSize || '',
        price: productToEdit.price ?? '',
        discountPrice: productToEdit.discountPrice ?? '',
        costPrice: productToEdit.costPrice ?? '',
        stock: productToEdit.stock ?? 0,
        description: productToEdit.description || '',
        mainImage: img,
        variants: parsedVariants,
        isActive: productToEdit.isActive !== undefined ? productToEdit.isActive : true,
      });
      setUploadTab(img ? 'url' : 'file');
    } else {
      const defaultCatId = categoriesList.length > 0 ? categoriesList[0]._id : '';
      setFormData({
        categoryId: defaultCatId,
        subcategoryId: '',
        name: '',
        slug: '',
        brand: '',
        sku: '',
        unit: 'pcs',
        unitValue: 1,
        packSize: '',
        price: '',
        discountPrice: '',
        costPrice: '',
        stock: 0,
        description: '',
        mainImage: '',
        variants: [],
        isActive: true,
      });
      setUploadTab('file');
    }
    setErrorMsg('');
  }, [productToEdit, isOpen, categoriesList]);

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
        setFormData((prev) => ({ ...prev, mainImage: imageUrl }));
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

  // Variants Helper Methods
  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...(prev.variants || []),
        {
          name: '',
          price: prev.price || '',
          discountPrice: prev.discountPrice || '',
          stock: 10,
          sku: '',
          isAvailable: true
        }
      ]
    }));
  };

  const handleRemoveVariant = (index) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const handleVariantChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.variants || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.categoryId) {
      setErrorMsg('Category is required.');
      return;
    }

    if (!formData.name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }

    if (formData.price === '' || isNaN(formData.price) || Number(formData.price) < 0) {
      setErrorMsg('Valid price (MRP) is required.');
      return;
    }

    // Validate variants if any added
    if (Array.isArray(formData.variants) && formData.variants.length > 0) {
      for (let i = 0; i < formData.variants.length; i++) {
        const v = formData.variants[i];
        if (!v.name || !v.name.trim()) {
          setErrorMsg(`Variant #${i + 1} requires a name (e.g., "500g Pack").`);
          return;
        }
        if (v.price === '' || isNaN(v.price) || Number(v.price) < 0) {
          setErrorMsg(`Variant #${i + 1} requires a valid MRP price.`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error('Submit product error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">
            {productToEdit ? 'Edit Product' : 'Add New Product'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Category & Subcategory Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '' })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-900 cursor-pointer"
              >
                <option value="" disabled>Select Category</option>
                {categoriesList.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subcategory <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <select
                value={formData.subcategoryId}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-900 cursor-pointer"
              >
                <option value="">None (Top Level)</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g. Fresh Organic Apples"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Slug (URL Identifier)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="fresh-organic-apples"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Brand & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Farm Fresh"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                SKU / Item Code
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU-100234"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Pack Size / Unit & Unit Value */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit Type
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 cursor-pointer"
              >
                <option value="pcs">pcs (Pieces)</option>
                <option value="kg">kg (Kilograms)</option>
                <option value="g">g (Grams)</option>
                <option value="l">l (Liters)</option>
                <option value="ml">ml (Milliliters)</option>
                <option value="pack">pack</option>
                <option value="box">box</option>
                <option value="bottle">bottle</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit Value
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={formData.unitValue}
                onChange={(e) => setFormData({ ...formData, unitValue: parseFloat(e.target.value) || 1 })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 truncate">
                Pack Size Display Label
              </label>
              <input
                type="text"
                value={formData.packSize}
                onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                placeholder="e.g. 500 g or 1 L"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Pricing (MRP & Discounted Selling Price & Stock) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                MRP Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="199"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Selling Price (₹) <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.discountPrice}
                onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                placeholder="149"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Base Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                placeholder="50"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Product Variants Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Product Variants (Optional)</h3>
                  <p className="text-[11px] text-slate-500">Configure different weights, pack sizes, or options with distinct prices & stock.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddVariant}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Variant
              </button>
            </div>

            {formData.variants && formData.variants.length > 0 ? (
              <div className="space-y-3 pt-1">
                {formData.variants.map((variant, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                        Variant #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Remove Variant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                          Variant Name / Size <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={variant.name}
                          onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                          placeholder="e.g. 500g Pack or 1 L"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                          MRP Price (₹) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          value={variant.price}
                          onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                          placeholder="100"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                          Selling Price (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={variant.discountPrice}
                          onChange={(e) => handleVariantChange(index, 'discountPrice', e.target.value)}
                          placeholder="85"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                          Variant Stock
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value, 10) || 0)}
                          placeholder="20"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-slate-400 italic">
                No variants added yet. Click "+ Add Variant" to configure different sizes or packs.
              </div>
            )}
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
              placeholder="Product details, features, ingredients or shelf life..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
            />
          </div>

          {/* Image Upload Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Product Main Image
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
                value={formData.mainImage}
                onChange={(e) => setFormData({ ...formData, mainImage: e.target.value })}
                placeholder="https://example.com/product-image.png"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
              />
            )}

            {/* Image Preview */}
            {formData.mainImage && (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img
                  src={getMediaUrl(formData.mainImage)}
                  alt="Preview"
                  className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{formData.mainImage}</p>
                  <p className="text-[10px] text-blue-600 font-medium">Image uploaded</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, mainImage: '' })}
                  className="text-xs font-semibold text-rose-600 hover:underline p-1 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
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
              {productToEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
