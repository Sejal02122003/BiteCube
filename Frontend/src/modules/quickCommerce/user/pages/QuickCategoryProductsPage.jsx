import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bookmark, ChevronDown, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getMediaUrl } from "@/shared/utils/media";
import { useAppLocation } from "@/modules/Food/hooks/useAppLocation";
import QuickVariantSheet from "../components/QuickVariantSheet";
import { useQuickCart } from "../context/QuickCartContext";
import {
  fetchPublicQuickCategories,
  fetchPublicQuickProducts,
  fetchPublicQuickSubcategories,
} from "../services/homeService";
import {
  buildQuickCartItem,
  getLowestQuickVariant,
  getQuickDiscountPercent,
  getQuickVariants,
} from "../utils/quickProduct";

const FILTER_CHIPS = [
  { id: "filters", label: "Filters", icon: SlidersHorizontal },
  { id: "sort", label: "Sort By", chevron: true },
  { id: "type", label: "Type", chevron: true },
  { id: "brand", label: "Brand", chevron: true },
];

const formatCurrency = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "\u20b90";
  return `\u20b9${Math.round(number)}`;
};

const buildPackOptions = (product) => {
  const options = [];

  if (Array.isArray(product?.variants)) {
    for (const variant of product.variants.slice(0, 3)) {
      const variantLabel =
        variant?.name ||
        [variant?.unitValue, variant?.unit].filter(Boolean).join(" ").trim();
      if (variantLabel && !options.includes(variantLabel)) {
        options.push(variantLabel);
      }
    }
  }

  return options.slice(0, 3);
};

const getDisplayImage = (product, variant = null) => {
  const source =
    product?.mainImage ||
    (Array.isArray(product?.images) ? product.images[0] : "") ||
    variant?.image ||
    "";
  return source ? getMediaUrl(source) : "";
};

export default function QuickCategoryProductsPage() {
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const { zoneId, loading: zoneLoading } = useAppLocation();
  const { addToCart, getCartItem, updateQuantity } = useQuickCart();

  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("all");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [variantProduct, setVariantProduct] = useState(null);

  useEffect(() => {
    if (zoneLoading) return;

    let cancelled = false;

    const run = async () => {
      if (!zoneId || !slug) {
        if (!cancelled) {
          setCategory(null);
          setSubcategories([]);
          setProducts([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);

        const categoryRes = await fetchPublicQuickCategories({
          limit: 100,
          sortBy: "sortOrder",
          sortOrder: "asc",
          zoneId,
        });

        if (cancelled) return;

        const categoriesList = categoryRes?.data?.categories || categoryRes?.categories || [];
        const matchedCategory =
          categoriesList.find((item) => item?.slug === slug) ||
          categoriesList.find(
            (item) =>
              String(item?.name || "")
                .toLowerCase()
                .replace(/\s+/g, "-") === slug,
          ) ||
          null;

        if (!matchedCategory) {
          setCategory(null);
          setSubcategories([]);
          setProducts([]);
          return;
        }

        setCategory(matchedCategory);

        const subcategoryRes = await fetchPublicQuickSubcategories({
          categoryId: matchedCategory._id || matchedCategory.id,
          limit: 100,
          sortBy: "sortOrder",
          sortOrder: "asc",
        });

        if (cancelled) return;

        const subcategoryList =
          subcategoryRes?.data?.subcategories || subcategoryRes?.subcategories || [];
        setSubcategories(Array.isArray(subcategoryList) ? subcategoryList : []);

        const productRes = await fetchPublicQuickProducts({
          categoryId: matchedCategory._id || matchedCategory.id,
          zoneId,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (cancelled) return;

        const productList = productRes?.data?.products || productRes?.products || [];
        setProducts(Array.isArray(productList) ? productList : []);
      } catch {
        if (!cancelled) {
          setCategory(null);
          setSubcategories([]);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [slug, zoneId, zoneLoading]);

  const sidebarItems = useMemo(() => {
    const items = [];
    if (category) {
      items.push({
        id: "all",
        name: category.name,
        image: category.image || category.icon || category.bannerImage || "",
      });
    }

    for (const subcategory of subcategories) {
      items.push({
        id: subcategory._id || subcategory.id,
        name: subcategory.name,
        image: subcategory.image || subcategory.icon || "",
      });
    }

    return items;
  }, [category, subcategories]);

  const filteredProducts = useMemo(() => {
    if (selectedSubcategoryId === "all") return products;
    return products.filter(
      (product) => String(product?.subcategoryId?._id || product?.subcategoryId || "") === String(selectedSubcategoryId),
    );
  }, [products, selectedSubcategoryId]);

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="sticky top-0 z-40 bg-white px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="line-clamp-1 flex-1 text-center text-[18px] font-black text-slate-800">
            {category?.name || "Category"}
          </h1>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-6">
        <div className="flex gap-3">
          <aside className="w-[78px] shrink-0">
            <div className="sticky top-[72px] space-y-5 bg-white pr-1">
              {sidebarItems.map((item) => {
                const isActive = String(selectedSubcategoryId) === String(item.id);
                const imageUrl = item.image ? getMediaUrl(item.image) : "";

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSubcategoryId(item.id)}
                    className="flex w-full flex-col items-center gap-2 text-center"
                  >
                    <div
                      className={`flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-[16px] transition-all ${
                        isActive
                          ? "border border-[#b9d8fb] bg-[#eef6ff] shadow-[inset_0_0_0_1px_rgba(185,216,251,0.65)]"
                          : "border border-transparent bg-white"
                      }`}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.name} className="h-full w-full object-contain" />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center rounded-[14px] text-sm font-black ${
                            isActive ? "bg-[#eef6ff] text-[#2f80ed]" : "bg-[#f8fafc] text-slate-400"
                          }`}
                        >
                          {String(item.name || "A").trim().slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span
                      className={`line-clamp-3 text-[11px] font-medium leading-[1.1rem] ${
                        isActive ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            <div className="sticky top-[72px] z-30 bg-white pb-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {FILTER_CHIPS.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      className="flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm"
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                      <span>{chip.label}</span>
                      {chip.chevron ? <ChevronDown className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="animate-pulse rounded-[20px] bg-white">
                    <div className="mb-2 h-[170px] rounded-[18px] bg-[#edf4fb]" />
                    <div className="h-4 w-20 rounded-full bg-[#edf4fb]" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-[24px] bg-[#f8fbff] px-6 text-center text-sm font-semibold text-slate-500">
                No products available in this section yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                {filteredProducts.map((product) => {
                  const packOptions = buildPackOptions(product);
                  const productId = String(product?._id || product?.id || "");
                  const variants = getQuickVariants(product);
                  const singleVariant = variants.length === 1 ? variants[0] : null;
                  const lowestVariant = getLowestQuickVariant(product);
                  const imageUrl = getDisplayImage(product, lowestVariant);
                  const requiresVariantChoice = variants.length > 1;
                  const quantity = singleVariant
                    ? Number(getCartItem(productId, singleVariant.id)?.quantity || 0)
                    : 0;
                  const salePrice = lowestVariant?.price || 0;
                  const originalPrice = lowestVariant?.originalPrice || salePrice;
                  const discountPercent = getQuickDiscountPercent(originalPrice, salePrice);

                  return (
                    <article
                      key={productId}
                      className="flex h-[278px] flex-col rounded-[22px] bg-white"
                      onClick={() => navigate(`/quick/product/${productId}`)}
                    >
                      <div className="relative overflow-hidden rounded-[18px] border border-[#dfeaf6] bg-[#edf4fb]">
                        <div className="flex h-[158px] items-center justify-center p-3">
                          {imageUrl ? (
                            <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white text-xl font-black text-[#2f80ed]">
                              {String(product?.name || "P").trim().slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-500"
                        >
                          <Bookmark className="h-4 w-4" />
                        </button>

                        {quantity > 0 && singleVariant ? (
                          <div
                            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-[13px] border-2 border-[#2f80ed] bg-white px-2 py-1 text-[#2f80ed] shadow-sm"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => updateQuantity(productId, quantity - 1, singleVariant.id)}
                              className="text-base font-black leading-none"
                            >
                              -
                            </button>
                            <span className="min-w-[12px] text-center text-[12px] font-black">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(buildQuickCartItem(product, singleVariant))}
                              className="text-base font-black leading-none"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (requiresVariantChoice) {
                                setVariantProduct(product);
                                return;
                              }
                              if (singleVariant) addToCart(buildQuickCartItem(product, singleVariant));
                            }}
                            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-[13px] border-2 border-[#2f80ed] bg-white text-[#2f80ed] shadow-sm"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        )}

                        <div className="absolute bottom-3 left-3 h-4 w-4 rounded-[4px] border border-emerald-600 bg-white" />
                      </div>

                      <div className="flex flex-1 flex-col px-1 pt-2">
                        <p className="mb-1 text-[12px] font-medium uppercase tracking-wide text-slate-500">14 MINS</p>
                        <h3 className="min-h-[38px] line-clamp-2 text-[14px] font-bold leading-[1.2] text-slate-900">
                          {product.name}
                        </h3>

                        <div className="mt-0 min-h-[24px] overflow-hidden">
                          {packOptions.length > 0 ? (
                            <div className="flex gap-1 overflow-hidden whitespace-nowrap">
                              {packOptions.map((option) => (
                                <span
                                  key={option}
                                  className="shrink-0 rounded-md border border-[#d8e5f3] bg-white px-2 py-1 text-[10px] font-semibold leading-none text-slate-600"
                                >
                                  {option}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-auto pt-1.5">
                          {discountPercent > 0 ? (
                            <p className="text-[12px] font-black text-emerald-600">{discountPercent}% OFF</p>
                          ) : null}

                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="text-[14px] font-black text-slate-900">{formatCurrency(salePrice)}</span>
                            {originalPrice > salePrice ? (
                              <span className="text-[12px] font-semibold text-slate-400 line-through">
                                {formatCurrency(originalPrice)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
      <QuickVariantSheet
        open={Boolean(variantProduct)}
        product={variantProduct}
        onClose={() => setVariantProduct(null)}
      />
    </div>
  );
}
