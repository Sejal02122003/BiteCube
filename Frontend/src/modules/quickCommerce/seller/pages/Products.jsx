import React, { useCallback, useEffect, useState } from "react";
import ProductHeader from "../../admin/components/product/ProductHeader";
import ProductFilters from "../../admin/components/product/ProductFilters";
import ProductTable from "../../admin/components/product/ProductTable";
import AddEditProductModal from "../../admin/components/product/AddEditProductModal";
import DeleteProductConfirmModal from "../../admin/components/product/DeleteProductConfirmModal";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
} from "../services/productService";
import { fetchCategories, fetchSubcategories } from "../services/catalogService";
import { sellerAPI, uploadAPI } from "@/services/api";

const STORAGE_FILTER_KEY = "qc_seller_product_filters";
const CACHE_PREFIX = "qc_seller_product_cache_";
const CACHE_TTL_MS = 5 * 60 * 1000;

const getInitialFilters = () => {
  try {
    const saved = sessionStorage.getItem(STORAGE_FILTER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        searchQuery: parsed.searchQuery || "",
        categoryIdFilter: parsed.categoryIdFilter || "",
        subcategoryIdFilter: parsed.subcategoryIdFilter || "",
        statusFilter: parsed.statusFilter || "all",
        stockStatusFilter: parsed.stockStatusFilter || "all",
        sortBy: parsed.sortBy || "createdAt",
        page: parsed.page || 1,
      };
    }
  } catch (error) {
    console.error("Error reading saved seller product filters:", error);
  }

  return {
    searchQuery: "",
    categoryIdFilter: "",
    subcategoryIdFilter: "",
    statusFilter: "all",
    stockStatusFilter: "all",
    sortBy: "createdAt",
    page: 1,
  };
};

export default function SellerProductsPage() {
  const initialFilters = getInitialFilters();

  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState("");

  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.searchQuery);
  const [categoryIdFilter, setCategoryIdFilter] = useState(initialFilters.categoryIdFilter);
  const [subcategoryIdFilter, setSubcategoryIdFilter] = useState(initialFilters.subcategoryIdFilter);
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter);
  const [stockStatusFilter, setStockStatusFilter] = useState(initialFilters.stockStatusFilter);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy);
  const [page, setPage] = useState(initialFilters.page);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const handleProductImageUpload = async (file) => {
    const response = await uploadAPI.uploadMedia(file, { folder: "bitecube/quick-commerce/seller/products" });
    return response?.data ?? response;
  };

  const showNotification = (message, type = "success") => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [profileRes, catRes, subRes] = await Promise.all([
          sellerAPI.getProfile(),
          fetchCategories({ limit: 200, status: "all" }),
          fetchSubcategories({ limit: 500, status: "all" }),
        ]);

        const seller =
          profileRes?.data?.data?.seller ||
          profileRes?.data?.seller ||
          profileRes?.data?.data ||
          null;

        if (seller?._id || seller?.id) {
          setSellerId(String(seller._id || seller.id));
        }

        if (catRes?.data?.categories) {
          setCategoriesList(catRes.data.categories);
        }

        if (subRes?.data?.subcategories) {
          setSubcategoriesList(subRes.data.subcategories);
        }
      } catch (error) {
        console.error("Error fetching seller catalog dropdown options:", error);
      }
    };

    loadDropdownData();
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_FILTER_KEY,
        JSON.stringify({
          searchQuery,
          categoryIdFilter,
          subcategoryIdFilter,
          statusFilter,
          stockStatusFilter,
          sortBy,
          page,
        })
      );
    } catch (error) {
      console.error("Error persisting seller product filter state:", error);
    }
  }, [searchQuery, categoryIdFilter, subcategoryIdFilter, statusFilter, stockStatusFilter, sortBy, page]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const getCacheKey = useCallback(() => {
    return `${CACHE_PREFIX}${debouncedSearch}_${categoryIdFilter}_${subcategoryIdFilter}_${statusFilter}_${stockStatusFilter}_${sortBy}_${page}`;
  }, [debouncedSearch, categoryIdFilter, subcategoryIdFilter, statusFilter, stockStatusFilter, sortBy, page]);

  const clearSessionCache = () => {
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith(CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Error clearing seller product cache:", error);
    }
  };

  const loadProducts = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey();
    let hasCachedData = false;

    if (!forceRefresh) {
      try {
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.timestamp && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            setProducts(cached.products || []);
            setPagination(cached.pagination || {});
            setStats(cached.stats || {});
            setLoading(false);
            hasCachedData = true;
          }
        }
      } catch (error) {
        console.warn("Failed to parse seller product cache", error);
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

        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              timestamp: Date.now(),
              products: res.data.products,
              pagination: res.data.pagination,
              stats: res.data.stats,
            })
          );
        } catch (error) {
          console.warn("Unable to write seller product cache:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching seller products:", error);
      if (!hasCachedData) {
        showNotification(error.response?.data?.message || error.message || "Failed to load products", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryIdFilter, subcategoryIdFilter, statusFilter, stockStatusFilter, sortBy, page, getCacheKey]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setCategoryIdFilter("");
    setSubcategoryIdFilter("");
    setStatusFilter("all");
    setStockStatusFilter("all");
    setSortBy("createdAt");
    setPage(1);
    try {
      sessionStorage.removeItem(STORAGE_FILTER_KEY);
    } catch (_) {}
  };

  const handleSaveProduct = async (formData) => {
    clearSessionCache();
    const payload = sellerId ? { ...formData, sellerId } : formData;

    if (productToEdit) {
      await updateProduct(productToEdit._id, payload);
      showNotification("Product updated successfully!", "success");
    } else {
      await createProduct(payload);
      showNotification("Product created successfully!", "success");
    }

    loadProducts(true);
  };

  const handleToggleStatus = async (id) => {
    try {
      clearSessionCache();
      const res = await toggleProductStatus(id);
      showNotification(res?.message || "Product status updated!", "success");
      loadProducts(true);
    } catch (error) {
      console.error("Error toggling seller product status:", error);
      showNotification(error.response?.data?.message || error.message || "Failed to toggle status", "error");
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      clearSessionCache();
      await deleteProduct(id);
      showNotification("Product deleted successfully!", "success");
      loadProducts(true);
    } catch (error) {
      console.error("Error deleting seller product:", error);
      showNotification(error.response?.data?.message || error.message || "Failed to delete product", "error");
    }
  };

  return (
    <div className="px-4 py-6 text-slate-900 max-w-[1600px] mx-auto space-y-5">
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-2xl px-5 py-3 text-sm font-semibold shadow-xl transition-all animate-in slide-in-from-top-3 border ${
            toastMsg.type === "error"
              ? "bg-rose-900 text-white border-rose-700"
              : "bg-slate-900 text-white border-slate-700"
          }`}
        >
          {toastMsg.message}
        </div>
      )}

      <ProductHeader
        stats={stats}
        onOpenAddModal={() => {
          setProductToEdit(null);
          setIsAddModalOpen(true);
        }}
      />

      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryIdFilter={categoryIdFilter}
        onCategoryIdFilterChange={(value) => {
          setCategoryIdFilter(value);
          setPage(1);
        }}
        subcategoryIdFilter={subcategoryIdFilter}
        onSubcategoryIdFilterChange={(value) => {
          setSubcategoryIdFilter(value);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        stockStatusFilter={stockStatusFilter}
        onStockStatusFilterChange={(value) => {
          setStockStatusFilter(value);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={(value) => {
          setSortBy(value);
          setPage(1);
        }}
        onResetFilters={handleResetFilters}
        categoriesList={categoriesList}
        subcategoriesList={subcategoriesList}
      />

      <ProductTable
        products={products}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        onEditProduct={(product) => {
          setProductToEdit(product);
          setIsAddModalOpen(true);
        }}
        onDeleteProduct={setProductToDelete}
        onToggleStatus={handleToggleStatus}
      />

      <AddEditProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSaveProduct}
        productToEdit={productToEdit}
        categoriesList={categoriesList}
        subcategoriesList={subcategoriesList}
        onUploadImage={handleProductImageUpload}
      />

      <DeleteProductConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        productToDelete={productToDelete}
      />
    </div>
  );
}
