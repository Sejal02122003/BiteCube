import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";
import { getMediaUrl } from "@/shared/utils/media";
import { useQuickCart } from "../context/QuickCartContext";
import { buildQuickCartItem, getQuickDiscountPercent, getQuickVariants } from "../utils/quickProduct";

const formatCurrency = (value) => `₹${Math.round(Number(value || 0))}`;

export default function QuickVariantSheet({ open, product, onClose }) {
  const { addToCart, getCartItem, updateQuantity } = useQuickCart();

  const variants = useMemo(() => getQuickVariants(product), [product]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !product) return null;

  const sheet = (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-labelledby="quick-variant-title">
      <button
        type="button"
        aria-label="Close variants"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="absolute bottom-0 left-1/2 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-t-[28px] bg-white shadow-[0_-16px_50px_rgba(15,23,42,0.24)]">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-200" />

        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-3">
          <div className="min-w-0">
            <p id="quick-variant-title" className="text-[19px] font-black tracking-[-0.02em] text-slate-900">
              Choose a variant
            </p>
            <p className="mt-0.5 line-clamp-1 text-[13px] font-semibold text-slate-500">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors active:bg-slate-200"
            aria-label="Close variant selection"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="max-h-[min(62vh,520px)] space-y-2.5 overflow-y-auto overscroll-contain px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-4">
          {variants.map((variant) => {
            const cartItem = getCartItem(product?._id || product?.id, variant.id);
            const quantity = Number(cartItem?.quantity || 0);
            const discountPercent = getQuickDiscountPercent(variant.originalPrice, variant.price);
            const isInStock = variant.isAvailable && Number(variant.stock) > 0;
            const unitLabel = Number(variant.unitValue) > 0 && variant.unit
              ? `${variant.unitValue} ${variant.unit}`
              : "";
            const imageUrl = getMediaUrl(
              variant.image || product?.mainImage || (Array.isArray(product?.images) ? product.images[0] : ""),
            );

            return (
              <div
                key={variant.id}
                className={`flex items-center gap-3 rounded-[20px] border p-3 transition-colors ${
                  isInStock ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
                }`}
              >
                <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                  {imageUrl ? (
                    <img src={imageUrl} alt={variant.name} className="h-full w-full object-contain" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-black leading-tight text-slate-900">{variant.name}</p>
                  {unitLabel ? (
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">{unitLabel}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <span className="text-[16px] font-black text-slate-900">
                      {formatCurrency(variant.price)}
                    </span>
                    {Number(variant.originalPrice) > Number(variant.price) ? (
                      <span className="text-[11px] font-semibold text-slate-400 line-through">
                        {formatCurrency(variant.originalPrice)}
                      </span>
                    ) : null}
                    {discountPercent > 0 ? (
                      <span className="text-[10px] font-black text-emerald-600">{discountPercent}% OFF</span>
                    ) : null}
                  </div>
                </div>

                {quantity > 0 ? (
                  <div className="flex h-10 shrink-0 items-center overflow-hidden rounded-xl bg-[#1f6fff] text-white shadow-sm">
                    <button
                      type="button"
                      className="flex h-full w-9 items-center justify-center active:bg-blue-700"
                      onClick={() => updateQuantity(product?._id || product?.id, quantity - 1, variant.id)}
                      aria-label={`Remove one ${variant.name}`}
                    >
                      <Minus className="h-4 w-4 stroke-[3]" />
                    </button>
                    <span className="min-w-5 text-center text-sm font-black">{quantity}</span>
                    <button
                      type="button"
                      className="flex h-full w-9 items-center justify-center active:bg-blue-700 disabled:opacity-40"
                      onClick={() => addToCart(buildQuickCartItem(product, variant))}
                      disabled={!isInStock}
                      aria-label={`Add one more ${variant.name}`}
                    >
                      <Plus className="h-4 w-4 stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!isInStock}
                    className="min-w-[74px] shrink-0 rounded-lg bg-[#1f6fff] px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-colors active:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                    onClick={() => addToCart(buildQuickCartItem(product, variant))}
                  >
                    {isInStock ? "ADD" : "SOLD OUT"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return sheet;

  return createPortal(sheet, document.body);
}
