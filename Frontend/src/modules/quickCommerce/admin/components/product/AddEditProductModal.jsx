import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Plus, Trash2, Layers } from 'lucide-react';
import { uploadCategoryImage } from '../../services/categoryService';
import { getMediaUrl } from '@/shared/utils/media.js';

const getUploadedImageUrl = (response) =>
  response?.file?.url ||
  response?.file?.path ||
  response?.data?.file?.url ||
  response?.data?.url ||
  response?.url ||
  (typeof response?.data === 'string' ? response.data : null);

export default function AddEditProductModal({
  isOpen,
  onClose,
  onSubmit,
  productToEdit = null,
  categoriesList = [],
  subcategoriesList = [],
  onUploadImage = uploadCategoryImage
}) {
  const [formData, setFormData] = useState({
    categoryId: '',
    subcategoryId: '',
    name: '',
    slug: '',
    brand: '',
    sku: '',
    description: '',
    mainImage: '',
    images: [],
    variants: [{ name: '', unit: 'pcs', unitValue: 1, price: '', discountPrice: '', stock: 0, sku: '', isAvailable: true }],
    isActive: true,
  });

  const [uploadTab, setUploadTab] = useState('file'); // 'file' or 'url'
  const [imageUrlInput, setImageUrlInput] = useState('');
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
      const productImages = [...new Set([
        img,
        ...(Array.isArray(productToEdit.images) ? productToEdit.images : []),
      ].filter(Boolean))];
      const parsedVariants = Array.isArray(productToEdit.variants) && productToEdit.variants.length > 0
        ? productToEdit.variants.map((v) => ({
            _id: v._id,
            name: v.name || '',
            unit: v.unit || 'pcs',
            unitValue: v.unitValue ?? 1,
            price: v.price ?? '',
            discountPrice: v.discountPrice ?? '',
            stock: v.stock ?? 0,
            sku: v.sku || '',
            isAvailable: v.isAvailable !== undefined ? v.isAvailable : true,
          }))
        : [{
            name: productToEdit.packSize || `${productToEdit.unitValue || 1} ${productToEdit.unit || 'pcs'}`,
            unit: productToEdit.unit || 'pcs',
            unitValue: productToEdit.unitValue ?? 1,
            price: productToEdit.price ?? '',
            discountPrice: productToEdit.discountPrice ?? '',
            stock: productToEdit.stock ?? 0,
            sku: productToEdit.sku || '',
            isAvailable: true,
          }];

      setFormData({
        categoryId: parentCatId,
        subcategoryId: subCatId,
        name: productToEdit.name || '',
        slug: productToEdit.slug || '',
        brand: productToEdit.brand || '',
        sku: productToEdit.sku || '',
        description: productToEdit.description || '',
        mainImage: img,
        images: productImages,
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
        description: '',
        mainImage: '',
        images: [],
        variants: [{ name: '', unit: 'pcs', unitValue: 1, price: '', discountPrice: '', stock: 0, sku: '', isAvailable: true }],
        isActive: true,
      });
      setUploadTab('file');
    }
    setImageUrlInput('');
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      setErrorMsg('');
      const results = await Promise.allSettled(files.map((file) => onUploadImage(file)));
      const uploadedUrls = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => getUploadedImageUrl(result.value))
        .filter(Boolean);

      if (uploadedUrls.length > 0) {
        setFormData((prev) => {
          const images = [...new Set([...(prev.images || []), ...uploadedUrls])];
          return { ...prev, images, mainImage: images[0] || '' };
        });
      }
      if (uploadedUrls.length !== files.length) {
        setErrorMsg(`${files.length - uploadedUrls.length} image(s) could not be uploaded.`);
      }
    } catch (err) {
      console.error('File upload error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Image upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const imageUrl = imageUrlInput.trim();
    if (!imageUrl) return;
    setFormData((prev) => {
      const images = [...new Set([...(prev.images || []), imageUrl])];
      return { ...prev, images, mainImage: images[0] || '' };
    });
    setImageUrlInput('');
  };

  const handleRemoveImage = (imageToRemove) => {
    setFormData((prev) => {
      const images = (prev.images || []).filter((image) => image !== imageToRemove);
      return { ...prev, images, mainImage: images[0] || '' };
    });
  };

  const handleMakePrimaryImage = (imageToPromote) => {
    setFormData((prev) => {
      const images = [imageToPromote, ...(prev.images || []).filter((image) => image !== imageToPromote)];
      return { ...prev, images, mainImage: imageToPromote };
    });
  };

  // Variants Helper Methods
  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...(prev.variants || []),
        {
          name: '',
          unit: 'pcs',
          unitValue: 1,
          price: '',
          discountPrice: '',
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

    if (!Array.isArray(formData.variants) || formData.variants.length === 0) {
      setErrorMsg('Add at least one product variant.');
      return;
    }

    for (let i = 0; i < formData.variants.length; i++) {
      const v = formData.variants[i];
      if (!v.name || !v.name.trim()) {
        setErrorMsg(`Variant #${i + 1} requires a name (e.g., "500g Pack").`);
        return;
      }
      if (!v.unit || Number(v.unitValue) <= 0) {
        setErrorMsg(`Variant #${i + 1} requires a valid unit type and unit value.`);
        return;
      }
      if (v.price === '' || isNaN(v.price) || Number(v.price) < 0) {
        setErrorMsg(`Variant #${i + 1} requires a valid MRP price.`);
        return;
      }
      if (v.discountPrice !== '' && v.discountPrice !== null &&
          (isNaN(v.discountPrice) || Number(v.discountPrice) < 0 || Number(v.discountPrice) >= Number(v.price))) {
        setErrorMsg(`Variant #${i + 1} selling price must be lower than its MRP price.`);
        return;
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

          {/* Product Variants Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Product Variants (Required)</h3>
                  <p className="text-[11px] text-slate-500">All product pricing and stock are managed per variant.</p>
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
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
                          Unit Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={variant.unit}
                          onChange={(e) => handleVariantChange(index, 'unit', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
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
                        <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                          Unit Value <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="any"
                          value={variant.unitValue}
                          onChange={(e) => handleVariantChange(index, 'unitValue', e.target.value)}
                          placeholder="1"
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
                At least one variant is required. Click "+ Add Variant" to continue.
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
                Product Images
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
                  multiple
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
                    {uploading ? 'Uploading images...' : 'Select or drag multiple images here'}
                  </p>
                  <p className="text-[10px] text-slate-400">PNG, JPG, WEBP up to 5MB each</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  placeholder="https://example.com/product-image.png"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={!imageUrlInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            )}

            {formData.images?.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {formData.images.map((image, index) => (
                  <div key={image} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div className="relative h-24 bg-white">
                      <img
                        src={getMediaUrl(image)}
                        alt={`Product ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {index === 0 ? (
                        <span className="absolute left-1.5 top-1.5 rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          Primary
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image)}
                        className="absolute right-1.5 top-1.5 rounded-md bg-white/95 p-1 text-rose-600 shadow-sm"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {index > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleMakePrimaryImage(image)}
                        className="w-full px-2 py-1.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Make primary
                      </button>
                    ) : (
                      <p className="px-2 py-1.5 text-center text-[10px] font-medium text-slate-500">
                        Shown on home
                      </p>
                    )}
                  </div>
                ))}
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
