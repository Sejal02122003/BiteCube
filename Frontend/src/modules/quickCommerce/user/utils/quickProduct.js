import { buildCartLineId } from "@/modules/Food/utils/foodVariants";

export const normalizeQuickVariants = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry = {}, index) => {
      const id = String(entry?._id || entry?.id || `quick-variant-${index}`);
      const price = Number(entry?.discountPrice ?? entry?.price);
      if (!Number.isFinite(price) || price < 0) return null;

      const originalPrice = Number(entry?.price);
      return {
        id,
        _id: id,
        name: String(entry?.name || "").trim() || `Variant ${index + 1}`,
        unit: String(entry?.unit || "").trim(),
        unitValue: Number(entry?.unitValue) || 0,
        price,
        originalPrice: Number.isFinite(originalPrice) ? originalPrice : price,
        image: String(entry?.image || "").trim(),
        stock: Number(entry?.stock) || 0,
        isAvailable: entry?.isAvailable !== false,
      };
    })
    .filter(Boolean);

export const getQuickVariants = (product = {}) =>
  normalizeQuickVariants(product?.variants || product?.variations || []);

export const hasQuickVariants = (product = {}) => getQuickVariants(product).length > 0;

export const getQuickDiscountPercent = (price, discountPrice) => {
  const original = Number(price);
  const discounted = Number(discountPrice);
  if (!Number.isFinite(original) || !Number.isFinite(discounted) || discounted >= original) {
    return 0;
  }
  return Math.round(((original - discounted) / original) * 100);
};

export const getQuickProductDisplayPrice = (product = {}) => {
  const variants = getQuickVariants(product);
  if (variants.length > 0) {
    return Math.min(...variants.map((variant) => Number(variant.price) || 0));
  }

  const discountPrice = Number(product?.discountPrice);
  const basePrice = Number(product?.price);

  if (Number.isFinite(discountPrice) && discountPrice > 0 && discountPrice < basePrice) {
    return discountPrice;
  }

  return Number.isFinite(basePrice) ? basePrice : 0;
};

export const getQuickProductOriginalPrice = (product = {}) => {
  const variants = getQuickVariants(product);
  if (variants.length > 0) {
    const prices = variants.map((variant) => Number(variant.originalPrice) || Number(variant.price) || 0);
    return Math.min(...prices);
  }

  const basePrice = Number(product?.price);
  return Number.isFinite(basePrice) ? basePrice : 0;
};

export const getQuickPackLabel = (product = {}, variant = null) => {
  if (variant?.name) return variant.name;
  if (product?.packSize) return product.packSize;
  if (Number(product?.unitValue) > 0 && product?.unit) {
    return `${product.unitValue} ${product.unit}`.trim();
  }
  return String(product?.unit || "").trim();
};

export const buildQuickCartItem = (product = {}, variant = null) => {
  const productId = String(product?._id || product?.id || "");
  const resolvedVariantId = String(variant?.id || variant?._id || "");
  const lineItemId = buildCartLineId(productId, resolvedVariantId);
  const sellingPrice = Number(
    variant?.price ??
      (Number(product?.discountPrice) > 0 ? product.discountPrice : product?.price) ??
      0,
  );
  const originalPrice = Number(
    variant?.originalPrice ?? variant?.price ?? product?.price ?? sellingPrice,
  );
  const image =
    String(variant?.image || "").trim() ||
    String(product?.mainImage || "").trim() ||
    (Array.isArray(product?.images) ? String(product.images[0] || "").trim() : "");

  return {
    id: lineItemId,
    lineItemId,
    itemId: productId,
    productId,
    variantId: resolvedVariantId,
    variantName: variant?.name || "",
    variantPrice: sellingPrice,
    name: product?.name || "Product",
    quantity: 1,
    price: sellingPrice,
    originalPrice,
    image,
    imageUrl: image,
    categoryName: product?.categoryName || "",
    packSize: getQuickPackLabel(product, variant),
    unit: product?.unit || variant?.unit || "",
    unitValue: Number(variant?.unitValue ?? product?.unitValue) || 0,
    brand: product?.brand || "",
    product,
  };
};

export const getQuickProductTotalQuantity = (cart = [], productId) =>
  (Array.isArray(cart) ? cart : [])
    .filter((item) => String(item?.productId || item?.itemId || "") === String(productId || ""))
    .reduce((total, item) => total + (Number(item?.quantity) || 0), 0);
