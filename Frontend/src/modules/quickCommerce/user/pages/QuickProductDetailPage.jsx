import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bookmark, Check, ChevronRight, Share2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getMediaUrl } from "@/shared/utils/media";
import { fetchPublicQuickProductById } from "../services/homeService";
import { useQuickCart } from "../context/QuickCartContext";
import {
  buildQuickCartItem,
  getQuickDiscountPercent,
  getLowestQuickVariant,
  getQuickPackLabel,
  getQuickVariants,
} from "../utils/quickProduct";

const formatCurrency = (value) => `₹${Math.round(Number(value || 0))}`;

export default function QuickProductDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { addToCart, getCartItem, updateQuantity } = useQuickCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const response = await fetchPublicQuickProductById(id);
        if (cancelled) return;
        const nextProduct = response?.data || response || null;
        setProduct(nextProduct);
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) run();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const images = useMemo(() => {
    if (!product) return [];
    const variantImage = getLowestQuickVariant(product)?.image;
    const source = [
      product?.mainImage,
      ...(Array.isArray(product?.images) ? product.images : []),
      variantImage,
    ]
      .filter(Boolean)
      .map((image) => getMediaUrl(image));

    return [...new Set(source)];
  }, [product]);

  const activeImage = images[activeImageIndex] || images[0] || "";
  const variants = getQuickVariants(product || {});
  const lowestVariant = getLowestQuickVariant(product || {});
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || lowestVariant;
  const displayPrice = selectedVariant?.price || 0;
  const originalPrice = selectedVariant?.originalPrice || displayPrice;
  const discountPercent = getQuickDiscountPercent(originalPrice, displayPrice);
  const packLabel = getQuickPackLabel(product || {}, selectedVariant);
  const displayUnitValue = Number(selectedVariant?.unitValue) || 1;
  const displayUnit = selectedVariant?.unit || "unit";
  const productId = product?._id || product?.id;
  const quantity = selectedVariant
    ? Number(getCartItem(productId, selectedVariant.id)?.quantity || 0)
    : 0;
  const selectedVariantInStock = Boolean(
    selectedVariant?.isAvailable && Number(selectedVariant?.stock) > 0,
  );

  const handlePrimaryAdd = () => {
    if (product && selectedVariant && selectedVariantInStock) {
      addToCart(buildQuickCartItem(product, selectedVariant));
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f7f8fb]" />;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f7f8fb] px-4 py-8">
        <button type="button" onClick={() => navigate(-1)} className="mb-6 text-slate-700">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="rounded-[28px] bg-white p-8 text-center text-sm font-semibold text-slate-500">
          Product not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] pb-32">
      <div className="relative px-4 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
              <Bookmark className="h-5 w-5" />
            </button>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] bg-white px-4 pt-2">
          <div className="flex h-[380px] items-center justify-center">
            {activeImage ? (
              <img src={activeImage} alt={product.name} className="h-full w-full object-contain" />
            ) : null}
          </div>
        </div>

        {images.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1 transition-colors ${
                  index === activeImageIndex ? "border-[#1f6fff]" : "border-slate-200"
                }`}
                aria-label={`View product image ${index + 1}`}
              >
                <img src={image} alt="" className="h-full w-full rounded-lg object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex justify-end gap-5 px-2 text-[12px] font-semibold text-slate-500">
          <span>12 MINS</span>
          <span className="text-emerald-600">★ {Number(product?.rating || 4.5).toFixed(1)} ({product?.reviewCount || "4.4k"})</span>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="rounded-[28px] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <button type="button" className="mb-4 flex items-center gap-1 text-[16px] font-black text-[#1f6fff]">
            Explore all {product?.brand || product?.categoryName || "brand"} items
            <ChevronRight className="h-4 w-4" />
          </button>

          <h1 className="text-[18px] font-black leading-tight text-slate-900">{product.name}</h1>
          <p className="mt-2 text-[14px] font-medium text-slate-400">
            {product.description || `${product.categoryName || "Quick"} essentials delivered fast.`}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-[13px] font-semibold text-slate-500">
            {packLabel ? <span>{packLabel}</span> : null}
            {discountPercent > 0 ? <span className="text-emerald-600">{discountPercent}% OFF</span> : null}
          </div>

          <div className="mt-2 flex items-end gap-2">
            <span className="text-[34px] font-black tracking-[-0.04em] text-slate-900">
              {formatCurrency(displayPrice)}
            </span>
            {originalPrice > displayPrice ? (
              <span className="pb-1 text-[16px] font-semibold text-slate-400 line-through">
                {formatCurrency(originalPrice)}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-[14px] font-medium text-slate-400">
            ₹{Math.max(displayPrice / Math.max(displayUnitValue, 1), 1).toFixed(1)}/{displayUnit}
          </p>
        </div>

        <div className="mt-4 rounded-[24px] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-black text-slate-900">Available Variants</h2>
              <p className="mt-0.5 text-[12px] font-medium text-slate-400">
                Choose the size or pack you need
              </p>
            </div>
            <span className="rounded-full bg-[#edf5ff] px-2.5 py-1 text-[11px] font-black text-[#1f6fff]">
              {variants.length} {variants.length === 1 ? "OPTION" : "OPTIONS"}
            </span>
          </div>

          <div className="space-y-3">
            {variants.map((variant) => {
              const variantDiscount = getQuickDiscountPercent(variant.originalPrice, variant.price);
              const variantImage = variant.image || product?.mainImage || product?.images?.[0] || "";
              const isInStock = variant.isAvailable && Number(variant.stock) > 0;
              const isSelected = variant.id === selectedVariant?.id;

              return (
                <button
                  type="button"
                  key={variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors ${
                    isSelected ? "border-[#1f6fff] bg-[#f5f9ff]" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                    {variantImage ? (
                      <img
                        src={getMediaUrl(variantImage)}
                        alt={variant.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-black text-slate-900">{variant.name}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                      {variant.unitValue} {variant.unit}
                      <span className={`ml-2 ${isInStock ? "text-emerald-600" : "text-rose-500"}`}>
                        {isInStock ? `${variant.stock} in stock` : "Out of stock"}
                      </span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                      <span className="text-[15px] font-black text-slate-900">
                        {formatCurrency(variant.price)}
                      </span>
                      {variant.originalPrice > variant.price ? (
                        <span className="text-[11px] font-semibold text-slate-400 line-through">
                          {formatCurrency(variant.originalPrice)}
                        </span>
                      ) : null}
                      {variantDiscount > 0 ? (
                        <span className="text-[10px] font-black text-emerald-600">
                          {variantDiscount}% OFF
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f6fff] text-white">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="h-8 w-8 shrink-0 rounded-full border-2 border-slate-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-[24px] bg-white p-5 text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <button type="button" className="mb-2 flex items-center gap-1 text-[15px] font-black text-[#1f6fff]">
            Payment Offers
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="text-[15px] font-black">₹100 OFF</p>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-[24px] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          {[
            ["72 Hours", "Refund*"],
            ["Fast", "Delivery"],
            ["24/7", "Support"],
          ].map(([title, label]) => (
            <div key={title} className="px-3 py-5 text-center">
              <p className="text-[16px] font-black text-slate-900">{title}</p>
              <p className="mt-1 text-[14px] font-medium text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            {packLabel ? <p className="text-[15px] font-medium text-slate-500">{packLabel}</p> : null}
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[28px] font-black tracking-[-0.04em] text-slate-900">
                {formatCurrency(displayPrice)}
              </span>
              {originalPrice > displayPrice ? (
                <span className="text-[16px] font-semibold text-slate-400 line-through">
                  {formatCurrency(originalPrice)}
                </span>
              ) : null}
            </div>
            <p className="text-[14px] font-medium text-slate-400">
              ₹{Math.max(displayPrice / Math.max(displayUnitValue, 1), 1).toFixed(1)}/{displayUnit}
            </p>
          </div>

          {quantity > 0 && selectedVariant ? (
            <div className="flex items-center gap-4 rounded-2xl bg-[#1f6fff] px-4 py-3 text-white">
              <button
                type="button"
                className="text-2xl font-black leading-none"
                onClick={() => updateQuantity(productId, quantity - 1, selectedVariant.id)}
              >
                -
              </button>
              <span className="min-w-[20px] text-center text-lg font-black">{quantity}</span>
              <button
                type="button"
                onClick={() => addToCart(buildQuickCartItem(product, selectedVariant))}
                disabled={!selectedVariantInStock}
                className="text-2xl font-black leading-none disabled:opacity-40"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePrimaryAdd}
              disabled={!selectedVariantInStock}
              className="min-w-[132px] rounded-[18px] bg-[#1f6fff] px-8 py-4 text-[18px] font-black text-white disabled:bg-slate-300"
            >
              {selectedVariantInStock ? "ADD" : "SOLD OUT"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
