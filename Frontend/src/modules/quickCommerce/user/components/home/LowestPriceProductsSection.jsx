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
      <div className="rounded-[28px] bg-[#dff5ff] px-3 py-4 shadow-[0_12px_30px_rgba(76,142,184,0.12)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#0d5b90]">
              {title}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#87bfe1] bg-white text-[#0d5b90] shadow-sm">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        {loading ? (
          <div className="flex gap-2.5 overflow-hidden">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[210px] min-w-[112px] rounded-[18px] bg-white/80 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-[20px] bg-white px-4 py-10 text-center">
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
                  className="min-w-[112px] max-w-[112px] rounded-[20px] bg-white p-1.5 shadow-[0_8px_20px_rgba(15,80,120,0.08)]"
                >
                  <div className="relative mb-0.5 rounded-[16px] bg-[#f4fbff] p-1">
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-[#3b82f6] px-1.5 py-0.5 text-[9px] font-black text-white">
                      BESTSELLER
                    </span>
                    <div className="flex h-[84px] items-center justify-center pt-3">
                      {resolvedImg ? (
                        <img
                          src={resolvedImg}
                          alt={product?.name || "Product"}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="h-full w-full rounded-[12px] bg-[#e5f3fb]" />
                      )}
                    </div>

                    {quantity > 0 ? (
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full border-2 border-[#2f80ed] bg-white px-1 py-0.5 text-[#2f80ed]">
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
                        className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-[10px] border-2 border-[#2f80ed] bg-white text-[#2f80ed] shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      </button>
                    )}
                  </div>

                  <div className="mb-0 flex items-center gap-1 text-[9px] font-bold text-[#159a63]">
                    <Star className="h-3 w-3 fill-current stroke-0" />
                    <span>{Number(product?.rating || 4.5).toFixed(1)}</span>
                    <span className="text-slate-400">12 MINS</span>
                  </div>

                  <h3 className="line-clamp-2 min-h-[24px] text-[10px] font-extrabold leading-[12px] text-slate-800">
                    {product?.name}
                  </h3>

                  <div className="-mt-0.5 min-h-[15px]">
                    {packSize ? (
                      <span className="rounded-md border border-[#8cbaf1] bg-[#f1f7ff] px-1.5 py-0.5 text-[10px] font-bold text-[#2f80ed]">
                        {packSize}
                      </span>
                    ) : null}
                  </div>

                  {discountPercent > 0 ? (
                    <p className="-mt-0.5 text-[10px] font-black text-[#159a63]">{discountPercent}% OFF</p>
                  ) : null}

                  <div className="-mt-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] font-black text-slate-900">
                        {formatCurrency(sellingPrice)}
                      </span>
                      {originalPrice ? (
                        <span className="text-[10px] font-bold text-slate-400 line-through">
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
