import React, { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { getMediaUrl } from "@/shared/utils/media";
import { Button } from "@food/components/ui/button";
import {
  fetchProducts,
  updateLowestPriceEverSelection,
} from "../services/productService";

export default function QuickLowestPriceEverManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchSelectableProducts();
  }, []);

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchSelectableProducts = async () => {
    try {
      setLoading(true);
      const response = await fetchProducts({
        limit: 200,
        page: 1,
        sortBy: "lowestPriceEverOrder",
        sortOrder: "asc",
      });
      const list = response?.data?.products || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      showToast("Failed to load quick commerce products", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLowestPriceToggle = async (product) => {
    const selectedProducts = products
      .filter((item) => item?.showInLowestPriceEver)
      .sort((a, b) => (a?.lowestPriceEverOrder || 0) - (b?.lowestPriceEverOrder || 0));

    const nextSelected = !product?.showInLowestPriceEver;
    const nextOrder = nextSelected ? selectedProducts.length : 0;

    try {
      setUpdatingProductId(product?._id);
      await updateLowestPriceEverSelection(product._id, {
        showInLowestPriceEver: nextSelected,
        lowestPriceEverOrder: nextOrder,
      });

      if (!nextSelected) {
        const remainingProducts = selectedProducts.filter(
          (item) => String(item?._id) !== String(product?._id),
        );

        await Promise.all(
          remainingProducts.map((item, index) =>
            updateLowestPriceEverSelection(item._id, {
              showInLowestPriceEver: true,
              lowestPriceEverOrder: index,
            }),
          ),
        );
      }

      showToast(
        nextSelected
          ? "Product added to Lowest Price Ever section"
          : "Product removed from Lowest Price Ever section",
      );
      await fetchSelectableProducts();
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to update Lowest Price Ever section",
        "error",
      );
    } finally {
      setUpdatingProductId(null);
    }
  };

  const selectedProductsCount = products.filter((item) => item?.showInLowestPriceEver).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold border text-white ${
            toastMessage.type === "error"
              ? "bg-red-600 border-red-500"
              : "bg-emerald-600 border-emerald-500"
          }`}
        >
          <span>{toastMessage.msg}</span>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-sky-500" />
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Lowest Price Ever Management
              </h1>
            </div>
            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              Select the exact quick-commerce products that should appear in the user app under
              "Lowest Prices Only For You".
            </p>
          </div>
          <div className="rounded-xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
            Selected Products: {selectedProductsCount}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm font-semibold text-slate-500 dark:border-zinc-700 dark:text-zinc-400">
            No quick-commerce products found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 dark:bg-zinc-950">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300">Product</th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300">Category</th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300">Price</th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300">Stock</th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300">Section Status</th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {products.map((product) => {
                    const imageUrl =
                      product?.mainImage || (Array.isArray(product?.images) ? product.images[0] : "");
                    const sellingPrice =
                      Number(product?.discountPrice || 0) > 0 &&
                      Number(product.discountPrice) < Number(product?.price || 0)
                        ? Number(product.discountPrice)
                        : Number(product?.price || 0);

                    return (
                      <tr key={product?._id} className="bg-white dark:bg-zinc-900">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800">
                              {imageUrl ? (
                                <img
                                  src={getMediaUrl(imageUrl)}
                                  alt={product?.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{product?.name}</p>
                              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                                {product?.packSize || `${product?.unitValue || 1} ${product?.unit || "pcs"}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-zinc-300">
                          {product?.categoryId?.name || product?.categoryName || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white">₹{sellingPrice}</span>
                            {sellingPrice !== Number(product?.price || 0) ? (
                              <span className="text-xs font-semibold text-slate-400 line-through">₹{product?.price}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-zinc-300">
                          {product?.stock ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          {product?.showInLowestPriceEver ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Selected #{(product?.lowestPriceEverOrder || 0) + 1}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                              Not Selected
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            onClick={() => handleLowestPriceToggle(product)}
                            disabled={updatingProductId === product?._id}
                            className={`rounded-xl px-4 py-2 text-xs font-black ${
                              product?.showInLowestPriceEver
                                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                                : "bg-sky-600 text-white hover:bg-sky-700"
                            }`}
                          >
                            {updatingProductId === product?._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : product?.showInLowestPriceEver ? (
                              "Remove"
                            ) : (
                              "Select"
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
