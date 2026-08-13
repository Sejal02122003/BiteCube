import { buildCartLineId } from "@/modules/Food/utils/foodVariants";

export const normalizeQuickVariants = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry = {}, index) => {
      const id = String(entry?._id || entry?.id || `quick-variant-${index}`);
      const originalPrice = Number(entry?.price);
      if (!Number.isFinite(originalPrice) || originalPrice < 0) return null;
      const hasDiscount = entry?.discountPrice !== null && entry?.discountPrice !== undefined && entry?.discountPrice !== "";
      const candidatePrice = Number(entry?.discountPrice);
      const price = hasDiscount && Number.isFinite(candidatePrice) && candidatePrice >= 0 && candidatePrice < originalPrice
        ? candidatePrice
        : originalPrice;
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

export const hasMultipleQuickVariants = (product = {}) => getQuickVariants(product).length > 1;

export const getLowestQuickVariant = (product = {}) => {
  const variants = getQuickVariants(product);
  return variants.reduce(
    (lowest, variant) => (!lowest || variant.price < lowest.price ? variant : lowest),
    null,
  );
};

export const getQuickDiscountPercent = (price, discountPrice) => {
  const original = Number(price);
  const discounted = Number(discountPrice);
  if (!Number.isFinite(original) || !Number.isFinite(discounted) || discounted >= original) {
    return 0;
  }
  return Math.round(((original - discounted) / original) * 100);
};

export const getQuickProductDisplayPrice = (product = {}) => {
  return getLowestQuickVariant(product)?.price ?? 0;
};

export const getQuickProductOriginalPrice = (product = {}) => {
  return getLowestQuickVariant(product)?.originalPrice ?? 0;
};

export const getQuickPackLabel = (product = {}, variant = null) => {
  if (variant?.name) return variant.name;
  if (Number(variant?.unitValue) > 0 && variant?.unit) {
    return `${variant.unitValue} ${variant.unit}`.trim();
  }
  return "";
};

export const buildQuickCartItem = (product = {}, variant = null) => {
  const variants = getQuickVariants(product);
  const resolvedVariant = variant || (variants.length === 1 ? variants[0] : null);
  const productId = String(product?._id || product?.id || "");
  const resolvedVariantId = String(resolvedVariant?.id || resolvedVariant?._id || "");
  const lineItemId = buildCartLineId(productId, resolvedVariantId);
  const sellingPrice = Number(
    resolvedVariant?.price ?? 0,
  );
  const originalPrice = Number(
    resolvedVariant?.originalPrice ?? resolvedVariant?.price ?? sellingPrice,
  );
  const image =
    String(resolvedVariant?.image || "").trim() ||
    String(product?.mainImage || "").trim() ||
    (Array.isArray(product?.images) ? String(product.images[0] || "").trim() : "");

  return {
    id: lineItemId,
    lineItemId,
    itemId: productId,
    productId,
    variantId: resolvedVariantId,
    variantName: resolvedVariant?.name || "",
    variantPrice: sellingPrice,
    name: product?.name || "Product",
    quantity: 1,
    price: sellingPrice,
    originalPrice,
    image,
    imageUrl: image,
    categoryName: product?.categoryName || "",
    packSize: getQuickPackLabel(product, resolvedVariant),
    unit: resolvedVariant?.unit || "",
    unitValue: Number(resolvedVariant?.unitValue) || 0,
    brand: product?.brand || "",
    product,
  };
};

export const getQuickProductTotalQuantity = (cart = [], productId) =>
  (Array.isArray(cart) ? cart : [])
    .filter((item) => String(item?.productId || item?.itemId || "") === String(productId || ""))
    .reduce((total, item) => total + (Number(item?.quantity) || 0), 0);
