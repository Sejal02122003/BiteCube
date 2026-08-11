import React, { useState, useEffect, useCallback } from 'react';
import ProductHeader from '../components/product/ProductHeader';
import ProductFilters from '../components/product/ProductFilters';
import ProductTable from '../components/product/ProductTable';
import AddEditProductModal from '../components/product/AddEditProductModal';
import DeleteProductConfirmModal from '../components/product/DeleteProductConfirmModal';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct
} from '../services/productService';
import { fetchCategories } from '../services/categoryService';
import { fetchSubcategories } from '../services/subcategoryService';

// Storage Keys for Session Persistence & Caching
const STORAGE_FILTER_KEY = 'qc_admin_product_filters';
const CACHE_PREFIX = 'qc_admin_product_cache_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Load initial filter preferences from sessionStorage
 */
const getInitialFilters = () => {
  try {
    const saved = sessionStorage.getItem(STORAGE_FILTER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        searchQuery: parsed.searchQuery || '',
        categoryIdFilter: parsed.categoryIdFilter || '',
        subcategoryIdFilter: parsed.subcategoryIdFilter || '',
        statusFilter: parsed.statusFilter || 'all',
        stockStatusFilter: parsed.stockStatusFilter || 'all',
        sortBy: parsed.sortBy || 'createdAt',
        page: parsed.page || 1,
      };
    }
  } catch (err) {
    console.error('Error reading saved product filters:', err);
  }
  return {
    searchQuery: '',
    categoryIdFilter: '',
    subcategoryIdFilter: '',
    statusFilter: 'all',
    stockStatusFilter: 'all',
    sortBy: 'createdAt',
    page: 1,
  };
};

export default function Product() {
  const initialFilters = getInitialFilters();

  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters State with Session Persistence
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.searchQuery);
  const [categoryIdFilter, setCategoryIdFilter] = useState(initialFilters.categoryIdFilter);
  const [subcategoryIdFilter, setSubcategoryIdFilter] = useState(initialFilters.subcategoryIdFilter);
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter);
  const [stockStatusFilter, setStockStatusFilter] = useState(initialFilters.stockStatusFilter);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy);
  const [page, setPage] = useState(initialFilters.page);

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  // Toast Notification State
  const [toastMsg, setToastMsg] = useState(null);

  const showNotification = (message, type = 'success') => {
    setToastMsg({ message, type });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  // Load Parent Categories & Subcategories List for dropdown filters & modals
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [catRes, subRes] = await Promise.all([
          fetchCategories({ limit: 200, status: 'all' }),
          fetchSubcategories({ limit: 500, status: 'all' })
        ]);
        if (catRes?.data?.categories) {
          setCategoriesList(catRes.data.categories);
        }
        if (subRes?.data?.subcategories) {
          setSubcategoriesList(subRes.data.subcategories);
        }
      } catch (err) {
        console.error('Error fetching categories/subcategories dropdown options:', err);
      }
    };
    loadDropdownData();
  }, []);

  // Persist filter preferences to sessionStorage whenever they change
  useEffect(() => {
    try {
      const filterState = {
        searchQuery,
        categoryIdFilter,
        subcategoryIdFilter,
        statusFilter,
        stockStatusFilter,
        sortBy,
        page,
      };
      sessionStorage.setItem(STORAGE_FILTER_KEY, JSON.stringify(filterState));
    } catch (err) {
      console.error('Error persisting filter state:', err);
    }
  }, [searchQuery, categoryIdFilter, subcategoryIdFilter, statusFilter, stockStatusFilter, sortBy, page]);

  // Debounce search query input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Generate cache key for current filter combination
  const getCacheKey = useCallback(() => {
    return `${CACHE_PREFIX}${debouncedSearch}_${categoryIdFilter}_${subcategoryIdFilter}_${statusFilter}_${stockStatusFilter}_${sortBy}_${page}`;
  }, [debouncedSearch, categoryIdFilter, subcategoryIdFilter, statusFilter, stockStatusFilter, sortBy, page]);

  // Clear all cached responses in sessionStorage
  const clearSessionCache = () => {
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith(CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.error('Error clearing session cache:', err);
    }
  };

  // Load Products from API (with Stale-While-Revalidate Caching)
  const loadProducts = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey();
    let hasCachedData = false;

    // Check cached data if not forcing fresh load
    if (!forceRefresh) {
      try {
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            setProducts(cached.products || []);
            setPagination(cached.pagination || {});
            setStats(cached.stats || {});
            setLoading(false);
            hasCachedData = true;
          }
        }
      } catch (e) {
        console.warn('Failed to parse product cache', e);
      }
    }

    try {
      if (!hasCachedData) {
        setLoading(true);
      }

      const res = await fetchProducts({
        search: debouncedSearch,
        categoryId: categoryIdFilter,
        subcategoryId: subcategoryIdFilter,
        status: statusFilter,
        stockStatus: stockStatusFilter,
        sortBy,
        page,
        limit: 10,
      });

      if (res?.data) {
        setProducts(res.data.products || []);
        setPagination(res.data.pagination || {});
        setStats(res.data.stats || {});

        // Save fresh result into sessionStorage cache
        try {
          const cacheData = {
            timestamp: Date.now(),
            products: res.data.products,
            pagination: res.data.pagination,
            stats: res.data.stats,
          };
          sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (err) {
          console.warn('Unable to write to sessionStorage cache:', err);
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      if (!hasCachedData) {
        showNotification(err.response?.data?.message || err.message || 'Failed to load products', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryIdFilter, subcategoryIdFilter, statusFilter, stockStatusFilter, sortBy, page, getCacheKey]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset all filters and clear saved session filter state
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setCategoryIdFilter('');
    setSubcategoryIdFilter('');
    setStatusFilter('all');
    setStockStatusFilter('all');
    setSortBy('createdAt');
    setPage(1);
    try {
      sessionStorage.removeItem(STORAGE_FILTER_KEY);
    } catch (_) {}
  };

  // Open Add Product Modal
  const handleOpenAddModal = () => {
    setProductToEdit(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditModal = (prod) => {
    setProductToEdit(prod);
    setIsAddModalOpen(true);
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (formData) => {
    clearSessionCache(); // Invalidate cache on mutations
    if (productToEdit) {
      await updateProduct(productToEdit._id, formData);
      showNotification('Product updated successfully!', 'success');
    } else {
      await createProduct(formData);
      showNotification('Product created successfully!', 'success');
    }
    loadProducts(true);
  };

  // Toggle Product Active Status
  const handleToggleStatus = async (id) => {
    try {
      clearSessionCache(); // Invalidate cache on status update
      const res = await toggleProductStatus(id);
      showNotification(res?.message || 'Product status updated!', 'success');
      loadProducts(true);
    } catch (err) {
      console.error('Error toggling status:', err);
      showNotification(err.response?.data?.message || err.message || 'Failed to toggle status', 'error');
    }
  };

  // Delete Product Confirm
  const handleDeleteConfirm = async (id) => {
    try {
      clearSessionCache(); // Invalidate cache on delete
      await deleteProduct(id);
      showNotification('Product deleted successfully!', 'success');
      loadProducts(true);
    } catch (err) {
      console.error('Error deleting product:', err);
      showNotification(err.response?.data?.message || err.message || 'Failed to delete product', 'error');
    }
  };

  return (
    <div className="px-4 py-6 text-slate-900 max-w-[1600px] mx-auto space-y-5">
      
      {/* Toast Notification Alert */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-2xl px-5 py-3 text-sm font-semibold shadow-xl transition-all animate-in slide-in-from-top-3 border ${
            toastMsg.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toastMsg.message}
        </div>
      )}

      {/* Header & Stats Cards */}
      <ProductHeader
        stats={stats}
        onOpenAddModal={handleOpenAddModal}
      />

      {/* Filter Bar */}
      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryIdFilter={categoryIdFilter}
        onCategoryIdFilterChange={(val) => { setCategoryIdFilter(val); setPage(1); }}
        subcategoryIdFilter={subcategoryIdFilter}
        onSubcategoryIdFilterChange={(val) => { setSubcategoryIdFilter(val); setPage(1); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => { setStatusFilter(val); setPage(1); }}
        stockStatusFilter={stockStatusFilter}
        onStockStatusFilterChange={(val) => { setStockStatusFilter(val); setPage(1); }}
        sortBy={sortBy}
        onSortByChange={(val) => { setSortBy(val); setPage(1); }}
        onResetFilters={handleResetFilters}
        categoriesList={categoriesList}
        subcategoriesList={subcategoriesList}
      />

      {/* Products Table */}
      <ProductTable
        products={products}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        onEditProduct={handleOpenEditModal}
        onDeleteProduct={setProductToDelete}
        onToggleStatus={handleToggleStatus}
      />

      {/* Add / Edit Modal */}
      <AddEditProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSaveProduct}
        productToEdit={productToEdit}
        categoriesList={categoriesList}
        subcategoriesList={subcategoriesList}
      />

      {/* Delete Confirmation Modal */}
      <DeleteProductConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        productToDelete={productToDelete}
      />
    </div>
  );
}
