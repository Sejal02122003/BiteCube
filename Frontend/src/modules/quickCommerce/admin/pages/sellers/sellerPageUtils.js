export const formatDateTime = (value) => {
  if (!value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const formatBusinessType = (value) =>
  String(value || "general-store")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const getStatusBadgeClassName = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200"
    default:
      return "bg-amber-50 text-amber-700 border-amber-200"
  }
}

export const getActiveBadgeClassName = (isActive) =>
  isActive
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-slate-100 text-slate-600 border-slate-200"

export const getLocationLabel = (seller = {}) =>
  [seller.area, seller.city, seller.state].filter(Boolean).join(", ") || "Location pending"

export const hasBankDetails = (seller = {}) =>
  Boolean(
    String(seller.accountHolderName || "").trim() &&
      String(seller.accountNumber || "").trim() &&
      String(seller.ifscCode || "").trim()
  )

export const hasKycDocuments = (seller = {}) => {
  const documents = seller.documents || {}
  return Boolean(
    String(documents.panImage || "").trim() ||
      String(documents.gstImage || "").trim() ||
      String(documents.fssaiImage || "").trim() ||
      String(documents.storeImage || "").trim() ||
      String(documents.cancelledChequeImage || "").trim()
  )
}

export const getLowestPricedVariant = (product = {}) =>
  (Array.isArray(product.variants) ? product.variants : []).reduce((lowest, variant) => {
    const price = Number(variant?.price || 0)
    const hasDiscount = variant?.discountPrice !== null && variant?.discountPrice !== undefined && variant?.discountPrice !== ""
    const rawDiscount = Number(variant?.discountPrice)
    const discountPrice = hasDiscount && rawDiscount >= 0 && rawDiscount < price ? rawDiscount : price
    return !lowest || discountPrice < lowest.discountPrice
      ? { ...variant, price, discountPrice }
      : lowest
  }, null)

export const getDiscountPercent = (product = {}) => {
  const variant = getLowestPricedVariant(product)
  const price = Number(variant?.price || 0)
  const discountPrice = Number(variant?.discountPrice || 0)
  if (!(price > 0) || !(discountPrice > 0) || discountPrice >= price) return 0
  return Math.round(((price - discountPrice) / price) * 100)
}
