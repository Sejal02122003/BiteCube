import React, { useState, useEffect, useCallback } from 'react';
import SubcategoryHeader from '../components/subcategory/SubcategoryHeader';
import SubcategoryFilters from '../components/subcategory/SubcategoryFilters';
import SubcategoryTable from '../components/subcategory/SubcategoryTable';
import AddEditSubcategoryModal from '../components/subcategory/AddEditSubcategoryModal';
import DeleteSubcategoryConfirmModal from '../components/subcategory/DeleteSubcategoryConfirmModal';
import {
  fetchSubcategories,
  createSubcategory,
  updateSubcategory,
  toggleSubcategoryStatus,
  deleteSubcategory
} from '../services/subcategoryService';
import { fetchCategories } from '../services/categoryService';

// Storage Keys for Session Persistence & Caching
const STORAGE_FILTER_KEY = 'qc_admin_subcategory_filters';
const CACHE_PREFIX = 'qc_admin_subcategory_cache_';
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
        statusFilter: parsed.statusFilter || 'all',
        sortBy: parsed.sortBy || 'sortOrder',
        page: parsed.page || 1,
      };
    }
  } catch (err) {
    console.error('Error reading saved subcategory filters:', err);
  }
  return {
    searchQuery: '',
    categoryIdFilter: '',
    statusFilter: 'all',
    sortBy: 'sortOrder',
    page: 1,
  };
};

export default function Subcategory() {
  const initialFilters = getInitialFilters();

  const [subcategories, setSubcategories] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters State with Session Persistence
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.searchQuery);
  const [categoryIdFilter, setCategoryIdFilter] = useState(initialFilters.categoryIdFilter);
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy);
  const [page, setPage] = useState(initialFilters.page);

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [subcategoryToEdit, setSubcategoryToEdit] = useState(null);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState(null);

  // Toast Notification State
  const [toastMsg, setToastMsg] = useState(null);

  const showNotification = (message, type = 'success') => {
    setToastMsg({ message, type });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  // Load Parent Categories List for dropdown filters & modals
  useEffect(() => {
    const loadCategoriesList = async () => {
      try {
        const res = await fetchCategories({ limit: 200, status: 'all' });
        if (res?.data?.categories) {
          setCategoriesList(res.data.categories);
        }
      } catch (err) {
        console.error('Error fetching parent categories:', err);
      }
    };
    loadCategoriesList();
  }, []);

  // Persist filter preferences to sessionStorage whenever they change
  useEffect(() => {
    try {
      const filterState = {
        searchQuery,
        categoryIdFilter,
        statusFilter,
        sortBy,
        page,
      };
      sessionStorage.setItem(STORAGE_FILTER_KEY, JSON.stringify(filterState));
    } catch (err) {
      console.error('Error persisting filter state:', err);
    }
  }, [searchQuery, categoryIdFilter, statusFilter, sortBy, page]);

  // Debounce search query input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Generate cache key for current filter combination
  const getCacheKey = useCallback(() => {
    return `${CACHE_PREFIX}${debouncedSearch}_${categoryIdFilter}_${statusFilter}_${sortBy}_${page}`;
  }, [debouncedSearch, categoryIdFilter, statusFilter, sortBy, page]);

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

  // Load Subcategories from API (with Stale-While-Revalidate Caching)
  const loadSubcategories = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey();
    let hasCachedData = false;

    // Check cached data if not forcing fresh load
    if (!forceRefresh) {
      try {
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            setSubcategories(cached.subcategories || []);
            setPagination(cached.pagination || {});
            setStats(cached.stats || {});
            setLoading(false);
            hasCachedData = true;
          }
        }
      } catch (e) {
        console.warn('Failed to parse subcategory cache', e);
      }
    }

    try {
      if (!hasCachedData) {
        setLoading(true);
      }

      const res = await fetchSubcategories({
        search: debouncedSearch,
        categoryId: categoryIdFilter,
        status: statusFilter,
        sortBy,
        page,
        limit: 10,
      });

      if (res?.data) {
        setSubcategories(res.data.subcategories || []);
        setPagination(res.data.pagination || {});
        setStats(res.data.stats || {});

        // Save fresh result into sessionStorage cache
        try {
          const cacheData = {
            timestamp: Date.now(),
            subcategories: res.data.subcategories,
            pagination: res.data.pagination,
            stats: res.data.stats,
          };
          sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (err) {
          console.warn('Unable to write to sessionStorage cache:', err);
        }
      }
    } catch (err) {
      console.error('Error fetching subcategories:', err);
      if (!hasCachedData) {
        showNotification(err.response?.data?.message || err.message || 'Failed to load subcategories', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryIdFilter, statusFilter, sortBy, page, getCacheKey]);

  useEffect(() => {
    loadSubcategories();
  }, [loadSubcategories]);

  // Reset all filters and clear saved session filter state
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setCategoryIdFilter('');
    setStatusFilter('all');
    setSortBy('sortOrder');
    setPage(1);
    try {
      sessionStorage.removeItem(STORAGE_FILTER_KEY);
    } catch (_) {}
  };

  // Open Add Subcategory Modal
  const handleOpenAddModal = () => {
    setSubcategoryToEdit(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Subcategory Modal
  const handleOpenEditModal = (sub) => {
    setSubcategoryToEdit(sub);
    setIsAddModalOpen(true);
  };

  // Save Subcategory (Create or Update)
  const handleSaveSubcategory = async (formData) => {
    clearSessionCache(); // Invalidate cache on mutations
    if (subcategoryToEdit) {
      await updateSubcategory(subcategoryToEdit._id, formData);
      showNotification('Subcategory updated successfully!', 'success');
    } else {
      await createSubcategory(formData);
      showNotification('Subcategory created successfully!', 'success');
    }
    loadSubcategories(true);
  };

  // Toggle Subcategory Active Status
  const handleToggleStatus = async (id) => {
    try {
      clearSessionCache(); // Invalidate cache on status update
      const res = await toggleSubcategoryStatus(id);
      showNotification(res?.message || 'Subcategory status updated!', 'success');
      loadSubcategories(true);
    } catch (err) {
      console.error('Error toggling status:', err);
      showNotification(err.response?.data?.message || err.message || 'Failed to toggle status', 'error');
    }
  };

  // Delete Subcategory Confirm
  const handleDeleteConfirm = async (id) => {
    try {
      clearSessionCache(); // Invalidate cache on delete
      await deleteSubcategory(id);
      showNotification('Subcategory deleted successfully!', 'success');
      loadSubcategories(true);
    } catch (err) {
      console.error('Error deleting subcategory:', err);
      showNotification(err.response?.data?.message || err.message || 'Failed to delete subcategory', 'error');
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
      <SubcategoryHeader
        stats={stats}
        onOpenAddModal={handleOpenAddModal}
      />

      {/* Filter Bar */}
      <SubcategoryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryIdFilter={categoryIdFilter}
        onCategoryIdFilterChange={(val) => { setCategoryIdFilter(val); setPage(1); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => { setStatusFilter(val); setPage(1); }}
        sortBy={sortBy}
        onSortByChange={(val) => { setSortBy(val); setPage(1); }}
        onResetFilters={handleResetFilters}
        categoriesList={categoriesList}
      />

      {/* Subcategories Table */}
      <SubcategoryTable
        subcategories={subcategories}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        onEditSubcategory={handleOpenEditModal}
        onDeleteSubcategory={setSubcategoryToDelete}
        onToggleStatus={handleToggleStatus}
      />

      {/* Add / Edit Modal */}
      <AddEditSubcategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSaveSubcategory}
        subcategoryToEdit={subcategoryToEdit}
        categoriesList={categoriesList}
      />

      {/* Delete Confirmation Modal */}
      <DeleteSubcategoryConfirmModal
        isOpen={Boolean(subcategoryToDelete)}
        onClose={() => setSubcategoryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        subcategoryToDelete={subcategoryToDelete}
      />
    </div>
  );
}
