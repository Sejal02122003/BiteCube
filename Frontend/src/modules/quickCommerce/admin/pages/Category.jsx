import React, { useState, useEffect, useCallback } from 'react';
import CategoryHeader from '../components/category/CategoryHeader';
import CategoryFilters from '../components/category/CategoryFilters';
import CategoryTable from '../components/category/CategoryTable';
import AddEditCategoryModal from '../components/category/AddEditCategoryModal';
import DeleteConfirmModal from '../components/category/DeleteConfirmModal';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory
} from '../services/categoryService';

// Storage Keys for Session Persistence & Caching
const STORAGE_FILTER_KEY = 'qc_admin_category_filters';
const CACHE_PREFIX = 'qc_admin_category_cache_';
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
        statusFilter: parsed.statusFilter || 'all',
        sortBy: parsed.sortBy || 'sortOrder',
        page: parsed.page || 1,
      };
    }
  } catch (err) {
    console.error('Error reading saved filters:', err);
  }
  return {
    searchQuery: '',
    statusFilter: 'all',
    sortBy: 'sortOrder',
    page: 1,
  };
};

export default function Category() {
  const initialFilters = getInitialFilters();

  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters State with Session Persistence
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.searchQuery);
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy);
  const [page, setPage] = useState(initialFilters.page);

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Toast Notification State
  const [toastMsg, setToastMsg] = useState(null);

  const showNotification = (message, type = 'success') => {
    setToastMsg({ message, type });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  // Persist filter preferences to sessionStorage whenever they change
  useEffect(() => {
    try {
      const filterState = {
        searchQuery,
        statusFilter,
        sortBy,
        page,
      };
      sessionStorage.setItem(STORAGE_FILTER_KEY, JSON.stringify(filterState));
    } catch (err) {
      console.error('Error persisting filter state:', err);
    }
  }, [searchQuery, statusFilter, sortBy, page]);

  // Debounce search query input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Generate cache key for current filter combination
  const getCacheKey = useCallback(() => {
    return `${CACHE_PREFIX}${debouncedSearch}_${statusFilter}_${sortBy}_${page}`;
  }, [debouncedSearch, statusFilter, sortBy, page]);

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

  // Load Categories from API (with Stale-While-Revalidate Caching)
  const loadCategories = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey();
    let hasCachedData = false;

    // Check cached data if not forcing fresh load
    if (!forceRefresh) {
      try {
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            setCategories(cached.categories || []);
            setPagination(cached.pagination || {});
            setStats(cached.stats || {});
            setLoading(false);
            hasCachedData = true;
          }
        }
      } catch (e) {
        console.warn('Failed to parse category cache', e);
      }
    }

    try {
      if (!hasCachedData) {
        setLoading(true);
      }

      const res = await fetchCategories({
        search: debouncedSearch,
        status: statusFilter,
        sortBy,
        page,
        limit: 10,
      });

      if (res?.data) {
        setCategories(res.data.categories || []);
        setPagination(res.data.pagination || {});
        setStats(res.data.stats || {});

        // Save fresh result into sessionStorage cache
        try {
          const cacheData = {
            timestamp: Date.now(),
            categories: res.data.categories,
            pagination: res.data.pagination,
            stats: res.data.stats,
          };
          sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (err) {
          console.warn('Unable to write to sessionStorage cache:', err);
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      if (!hasCachedData) {
        showNotification(err.response?.data?.message || err.message || 'Failed to load categories', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, sortBy, page, getCacheKey]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Reset all filters and clear saved session filter state
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setSortBy('sortOrder');
    setPage(1);
    try {
      sessionStorage.removeItem(STORAGE_FILTER_KEY);
    } catch (_) {}
  };

  // Open Add Category Modal
  const handleOpenAddModal = () => {
    setCategoryToEdit(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Category Modal
  const handleOpenEditModal = (cat) => {
    setCategoryToEdit(cat);
    setIsAddModalOpen(true);
  };

  // Save Category (Create or Update)
  const handleSaveCategory = async (formData) => {
    clearSessionCache(); // Invalidate cache on mutations
    if (categoryToEdit) {
      await updateCategory(categoryToEdit._id, formData);
      showNotification('Category updated successfully!', 'success');
    } else {
      await createCategory(formData);
      showNotification('Category created successfully!', 'success');
    }
    loadCategories(true);
  };

  // Toggle Category Active Status
  const handleToggleStatus = async (id) => {
    try {
      clearSessionCache(); // Invalidate cache on status update
      const res = await toggleCategoryStatus(id);
      showNotification(res?.message || 'Category status updated!', 'success');
      loadCategories(true);
    } catch (err) {
      console.error('Error toggling status:', err);
      showNotification(err.response?.data?.message || err.message || 'Failed to toggle status', 'error');
    }
  };

  // Delete Category Confirm
  const handleDeleteConfirm = async (id) => {
    try {
      clearSessionCache(); // Invalidate cache on delete
      await deleteCategory(id);
      showNotification('Category deleted successfully!', 'success');
      loadCategories(true);
    } catch (err) {
      console.error('Error deleting category:', err);
      showNotification(err.response?.data?.message || err.message || 'Failed to delete category', 'error');
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
      <CategoryHeader
        stats={stats}
        onOpenAddModal={handleOpenAddModal}
      />

      {/* Filter Bar */}
      <CategoryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => { setStatusFilter(val); setPage(1); }}
        sortBy={sortBy}
        onSortByChange={(val) => { setSortBy(val); setPage(1); }}
        onResetFilters={handleResetFilters}
      />

      {/* Categories Table */}
      <CategoryTable
        categories={categories}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        onEditCategory={handleOpenEditModal}
        onDeleteCategory={setCategoryToDelete}
        onToggleStatus={handleToggleStatus}
      />

      {/* Add / Edit Modal */}
      <AddEditCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSaveCategory}
        categoryToEdit={categoryToEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        categoryToDelete={categoryToDelete}
      />
    </div>
  );
}
