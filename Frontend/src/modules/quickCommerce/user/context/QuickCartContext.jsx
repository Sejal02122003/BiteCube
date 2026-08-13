import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { buildCartLineId } from "@/modules/Food/utils/foodVariants";

const STORAGE_KEY = "quick_cart";

const defaultQuickCartContext = {
  _isProvider: false,
  cart: [],
  addToCart: () => ({ ok: false }),
  removeFromCart: () => {},
  updateQuantity: () => {},
  getCartCount: () => 0,
  getProductQuantity: () => 0,
  getCartItem: () => null,
  clearCart: () => {},
};

const QuickCartContext = createContext(defaultQuickCartContext);

const normalizeQuickCart = (rawCart) =>
  (Array.isArray(rawCart) ? rawCart : [])
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const productId = String(item?.productId || item?.itemId || item?.id || `quick-item-${index}`);
      const variantId = String(item?.variantId || "");
      const lineItemId = String(item?.lineItemId || item?.id || buildCartLineId(productId, variantId));
      const quantity = Math.max(1, Number(item?.quantity) || 1);

      return {
        ...item,
        id: lineItemId,
        lineItemId,
        itemId: productId,
        productId,
        variantId,
        sellerId: String(item?.sellerId || item?.product?.sellerId?._id || item?.product?.sellerId || ""),
        sellerName: String(item?.sellerName || item?.product?.sellerId?.storeName || "Seller"),
        quantity,
        price: Number(item?.price) || 0,
        originalPrice: Number(item?.originalPrice) || Number(item?.price) || 0,
        variantPrice: Number(item?.variantPrice) || Number(item?.price) || 0,
        name: String(item?.name || "Product"),
        image: String(item?.image || item?.imageUrl || ""),
        imageUrl: String(item?.imageUrl || item?.image || ""),
      };
    });

const resolveEntryId = (items, productId, variantId = "") => {
  const preferredId = buildCartLineId(productId, variantId);
  const safeItems = Array.isArray(items) ? items : [];
  return safeItems.find((item) => item.id === preferredId)?.id || preferredId;
};

export function QuickCartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return normalizeQuickCart(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeQuickCart(cart)));
    } catch {}
  }, [cart]);

  const addToCart = (item) => {
    if (!item?.productId && !item?.itemId) return { ok: false, error: "Missing product id" };

    const nextSellerId = String(item?.sellerId || item?.product?.sellerId?._id || item?.product?.sellerId || "");
    const currentSellerId = String(normalizeQuickCart(cart)[0]?.sellerId || "");
    let replaceSellerCart = false;
    if (currentSellerId && nextSellerId && currentSellerId !== nextSellerId) {
      replaceSellerCart = typeof window !== "undefined" && window.confirm(
        "Your Quick cart contains products from another seller. Clear it and add this product?",
      );
      if (!replaceSellerCart) return { ok: false, error: "Different seller" };
    }

    setCart((prev) => {
      const safePrev = replaceSellerCart ? [] : normalizeQuickCart(prev);
      const productId = String(item.productId || item.itemId || "");
      const variantId = String(item.variantId || "");
      const resolvedId = resolveEntryId(safePrev, productId, variantId);
      const existing = safePrev.find((entry) => entry.id === resolvedId);

      if (existing) {
        return safePrev.map((entry) =>
          entry.id === resolvedId ? { ...entry, quantity: entry.quantity + 1 } : entry,
        );
      }

      return [...safePrev, normalizeQuickCart([item])[0]];
    });

    return { ok: true };
  };

  const updateQuantity = (productId, quantity, variantId = "") => {
    setCart((prev) => {
      const safePrev = normalizeQuickCart(prev);
      const resolvedId = resolveEntryId(safePrev, productId, variantId);
      if (quantity <= 0) {
        return safePrev.filter((entry) => entry.id !== resolvedId);
      }

      return safePrev.map((entry) =>
        entry.id === resolvedId ? { ...entry, quantity: Math.max(1, Number(quantity) || 1) } : entry,
      );
    });
  };

  const removeFromCart = (productId, variantId = "") => {
    setCart((prev) => {
      const safePrev = normalizeQuickCart(prev);
      const resolvedId = resolveEntryId(safePrev, productId, variantId);
      return safePrev.filter((entry) => entry.id !== resolvedId);
    });
  };

  const getCartCount = () =>
    normalizeQuickCart(cart).reduce((total, item) => total + (Number(item.quantity) || 0), 0);

  const getProductQuantity = (productId) =>
    normalizeQuickCart(cart)
      .filter((item) => String(item.productId || item.itemId || "") === String(productId || ""))
      .reduce((total, item) => total + (Number(item.quantity) || 0), 0);

  const getCartItem = (productId, variantId = "") => {
    const safeCart = normalizeQuickCart(cart);
    const resolvedId = resolveEntryId(safeCart, productId, variantId);
    return safeCart.find((entry) => entry.id === resolvedId) || null;
  };

  const clearCart = () => setCart([]);

  const value = useMemo(
    () => ({
      _isProvider: true,
      cart: normalizeQuickCart(cart),
      addToCart,
      removeFromCart,
      updateQuantity,
      getCartCount,
      getProductQuantity,
      getCartItem,
      clearCart,
    }),
    [cart],
  );

  return <QuickCartContext.Provider value={value}>{children}</QuickCartContext.Provider>;
}

export function useQuickCart() {
  const context = useContext(QuickCartContext);
  return context?._isProvider ? context : defaultQuickCartContext;
}
