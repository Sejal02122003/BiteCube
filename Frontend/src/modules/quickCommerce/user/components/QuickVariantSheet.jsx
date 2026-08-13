import { useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getMediaUrl } from "@/shared/utils/media";
import { useQuickCart } from "../context/QuickCartContext";
import { buildQuickCartItem, getQuickDiscountPercent, getQuickPackLabel, getQuickVariants } from "../utils/quickProduct";

const formatCurrency = (value) => `₹${Math.round(Number(value || 0))}`;

export default function QuickVariantSheet({ open, product, onClose }) {
  const { addToCart, getCartItem, updateQuantity } = useQuickCart();

  const variants = useMemo(() => getQuickVariants(product), [product]);

  if (!open || !product) return null;

  const sheet = (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="Close variants"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />

      <div className="absolute bottom-[calc(76px+max(env(safe-area-inset-bottom,0px),10px))] left-0 right-0 rounded-t-[28px] bg-white px-4 pb-4 pt-4 shadow-[0_-12px_40px_rgba(15,23,42,0.18)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[18px] font-black text-slate-900">Choose a variant</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(62vh-24px)] space-y-3 overflow-y-auto pr-1 pb-2">
          {variants.map((variant) => {
            const cartItem = getCartItem(product?._id || product?.id, variant.id);
            const quantity = Number(cartItem?.quantity || 0);
            const discountPercent = getQuickDiscountPercent(variant.originalPrice, variant.price);
            const imageUrl = getMediaUrl(
              variant.image || product?.mainImage || (Array.isArray(product?.images) ? product.images[0] : ""),
            );

            return (
              <div
                key={variant.id}
                className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-3"
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#eef6ff]">
                  <img src={imageUrl} alt={variant.name} className="h-full w-full object-cover" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-black text-slate-900">{variant.name}</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-500">
                    {getQuickPackLabel(product, variant)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[17px] font-black text-slate-900">
                      {formatCurrency(variant.price)}
                    </span>
                    {Number(variant.originalPrice) > Number(variant.price) ? (
                      <span className="text-[13px] font-semibold text-slate-400 line-through">
                        {formatCurrency(variant.originalPrice)}
                      </span>
                    ) : null}
                    {discountPercent > 0 ? (
                      <span className="text-[12px] font-black text-emerald-600">{discountPercent}% OFF</span>
                    ) : null}
                  </div>
                </div>

                {quantity > 0 ? (
                  <div className="flex items-center gap-3 rounded-full border border-[#9cc3f8] bg-[#eef5ff] px-3 py-2 text-[#2f80ed]">
                    <button
                      type="button"
                      className="text-lg font-black leading-none"
                      onClick={() => updateQuantity(product?._id || product?.id, quantity - 1, variant.id)}
                    >
                      -
                    </button>
                    <span className="min-w-[18px] text-center text-sm font-black">{quantity}</span>
                    <button
                      type="button"
                      className="text-lg font-black leading-none"
                      onClick={() => addToCart(buildQuickCartItem(product, variant))}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="rounded-xl bg-[#1f6fff] px-4 py-2 text-sm font-black text-white"
                    onClick={() => addToCart(buildQuickCartItem(product, variant))}
                  >
                    ADD
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
