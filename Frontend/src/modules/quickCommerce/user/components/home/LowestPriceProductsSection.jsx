import React from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { useCart } from "@food/context/CartContext";
import { getMediaUrl } from "@/shared/utils/media";

const formatCurrency = (value) => `₹${Number(value || 0)}`;

export default function LowestPriceProductsSection({
  products = [],
  loading = false,
  title = "LOWEST PRICES ONLY FOR YOU",
  activeQuickFilters = new Set(),
}) {
  const { cart = [], addToCart, removeFromCart } = useCart() || {};

  const filteredProducts = (Array.isArray(products) ? products : []).filter((product) => {
    if (!activeQuickFilters || activeQuickFilters.size === 0) return true;

    if (activeQuickFilters.has("quick-offers")) {
      const hasOffer =
        Number(product?.discountPrice || 0) > 0 &&
        Number(product.discountPrice) < Number(product.price || 0);
      if (!hasOffer) return false;
    }

    if (activeQuickFilters.has("quick-dairy")) {
      const haystack = `${product?.name || ""} ${product?.categoryName || ""}`.toLowerCase();
      if (!/(milk|dairy|egg|bread)/.test(haystack)) return false;
    }

    if (activeQuickFilters.has("quick-snacks")) {
      const haystack = `${product?.name || ""} ${product?.categoryName || ""}`.toLowerCase();
      if (!/(snack|drink|chips|juice|soft)/.test(haystack)) return false;
    }

    if (activeQuickFilters.has("quick-organic")) {
      const haystack = `${product?.name || ""} ${product?.categoryName || ""}`.toLowerCase();
      if (!/(fresh|fruit|vegetable|organic)/.test(haystack)) return false;
    }

    return true;
  });

  return (
    <section className="px-4 pt-4">
      <div className="relative overflow-hidden rounded-[28px] bg-[#eaf6ff] px-3 py-4 shadow-[0_12px_30px_rgba(92,145,191,0.14)]">
        <div className="pointer-events-none absolute right-2 bottom-3 text-[44px] font-black leading-none text-[#b7d7fb]/25">
          %
        </div>

        <div className="relative mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#12306b]">
              {title}
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#2f80ed] shadow-[0_6px_16px_rgba(73,126,181,0.14)]">
            <ArrowRight className="h-4.5 w-4.5" />
          </div>
        </div>

        {loading ? (
          <div className="flex gap-2.5 overflow-hidden">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[214px] min-w-[138px] rounded-[22px] bg-white/80 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-[24px] bg-white px-4 py-10 text-center shadow-[0_14px_34px_rgba(104,160,205,0.12)]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef8fd] text-[#0d5b90]">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No Lowest Price products selected</p>
          </div>
        ) : (
          <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {filteredProducts.map((product) => {
              const productId = String(product?._id || product?.id || "");
              const cartItem = (cart || []).find(
                (item) => String(item.id || item._id) === productId,
              );
              const quantity = Number(cartItem?.quantity || 0);
              const imageUrl =
                product?.mainImage ||
                (Array.isArray(product?.images) ? product.images[0] : "") ||
                product?.image ||
                "";
              const resolvedImg = imageUrl ? getMediaUrl(imageUrl) : "";
              const discountedPrice =
                Number(product?.discountPrice || 0) > 0 &&
                Number(product.discountPrice) < Number(product?.price || 0)
                  ? Number(product.discountPrice)
                  : null;
              const sellingPrice = discountedPrice ?? Number(product?.price || 0);
              const originalPrice = discountedPrice ? Number(product?.price || 0) : null;
              const discountPercent =
                originalPrice && sellingPrice < originalPrice
                  ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
                  : 0;
              const packSize =
                product?.packSize ||
                (product?.unitValue && product?.unit
                  ? `${product.unitValue} ${product.unit}`
                  : product?.unit || "");

              return (
                <div
                  key={productId}
                  className="min-w-[142px] max-w-[142px] overflow-hidden rounded-[22px] bg-white p-2 shadow-[0_8px_20px_rgba(92,145,191,0.10)]"
                >
                  <div className="-mx-2 -mt-2 relative mb-1.5 rounded-t-[20px] bg-white">
                    <span className="absolute left-1 top-1 z-10 rounded-[9px] bg-[#2f80ed] px-2 py-1 text-[8px] font-black tracking-[0.02em] text-white shadow-[0_6px_12px_rgba(47,128,237,0.18)]">
                      BESTSELLER
                    </span>
                    <div className="flex h-[100px] items-start justify-center overflow-hidden rounded-t-[20px] pt-0">
                      {resolvedImg ? (
                        <img
                          src={resolvedImg}
                          alt={product?.name || "Product"}
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#e5f3fb]" />
                      )}
                    </div>

                    {quantity > 0 ? (
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full border border-[#b7d2fb] bg-[#eef5ff] px-1.5 py-0.5 text-[#2f80ed] shadow-[0_6px_14px_rgba(73,126,181,0.12)]">
                        <button type="button" onClick={() => removeFromCart?.(productId)}>
                          <Minus className="h-3 w-3 stroke-[3]" />
                        </button>
                        <span className="min-w-[12px] text-center text-[10px] font-black">
                          {quantity}
                        </span>
                        <button type="button" onClick={() => addToCart?.(product)}>
                          <Plus className="h-3 w-3 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart?.(product)}
                        className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-[12px] border border-[#9cc3f8] bg-[#eef5ff] text-[#2f80ed] shadow-[0_6px_14px_rgba(73,126,181,0.12)]"
                      >
                        <Plus className="h-4.5 w-4.5 stroke-[2.75]" />
                      </button>
                    )}
                  </div>

                  <div className="mb-1 flex items-center gap-1 text-[9px] font-bold text-[#0a8f4d]">
                    <Star className="h-3.5 w-3.5 fill-current stroke-0" />
                    <span>{Number(product?.rating || 4.5).toFixed(1)}</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-[9px] font-semibold text-slate-500">12K+ ratings</span>
                  </div>

                  <h3 className="line-clamp-2 min-h-[28px] text-[11px] font-black leading-[1.15] text-[#12265f]">
                    {product?.name}
                  </h3>

                  <div className="mt-0.5 min-h-[20px]">
                    {packSize ? (
                      <span className="inline-flex rounded-lg bg-[#edf5ff] px-2 py-1 text-[10px] font-black uppercase text-[#2f80ed]">
                        {packSize}
                      </span>
                    ) : null}
                  </div>

                  {discountPercent > 0 ? (
                    <p className="mt-0.5 text-[10px] font-black text-[#0a8f4d]">{discountPercent}% OFF</p>
                  ) : null}

                  <div className="mt-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] font-black text-[#12265f]">
                        {formatCurrency(sellingPrice)}
                      </span>
                      {originalPrice ? (
                        <span className="text-[10px] font-semibold text-slate-400 line-through">
                          {formatCurrency(originalPrice)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
