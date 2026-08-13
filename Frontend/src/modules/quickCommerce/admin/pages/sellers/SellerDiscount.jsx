import { useEffect, useMemo, useState } from "react"
import { Loader2, Percent, Search, Tag } from "lucide-react"
import { toast } from "sonner"
import { fetchProducts } from "../../services/productService"
import { getDiscountPercent, getLowestPricedVariant } from "./sellerPageUtils"

export default function SellerDiscount() {
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState([])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        const response = await fetchProducts({ page: 1, limit: 500, sortBy: "createdAt", sortOrder: "desc" })
        if (response?.success) {
          setProducts(Array.isArray(response?.data?.products) ? response.data.products : [])
        } else {
          setProducts([])
          toast.error(response?.message || "Failed to fetch discounted products")
        }
      } catch (error) {
        setProducts([])
        toast.error(error?.response?.data?.message || error?.message || "Failed to fetch discounted products")
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  const discountedProducts = useMemo(() => {
    const list = products.filter((product) => getDiscountPercent(product) > 0)
    if (!searchQuery.trim()) return list
    const query = searchQuery.toLowerCase().trim()
    return list.filter((product) =>
      product.name?.toLowerCase().includes(query) ||
      product.categoryName?.toLowerCase().includes(query) ||
      product.sellerId?.storeName?.toLowerCase().includes(query)
    )
  }, [products, searchQuery])

  const sellerCount = new Set(discountedProducts.map((product) => String(product?.sellerId?._id || ""))).size

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                <Percent className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Seller Discount</h1>
                <p className="text-sm text-slate-500 mt-1">Track quick-commerce seller products with active discounts.</p>
              </div>
            </div>

            <div className="relative min-w-[260px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search seller, product, category"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard label="Discounted Products" value={discountedProducts.length} />
          <MetricCard label="Sellers Running Discounts" value={sellerCount} />
          <MetricCard
            label="Average Discount"
            value={
              discountedProducts.length
                ? `${Math.round(discountedProducts.reduce((sum, product) => sum + getDiscountPercent(product), 0) / discountedProducts.length)}%`
                : "0%"
            }
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Product</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Seller</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Category</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Price</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Discount Price</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Discount %</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading discount data...</span>
                      </div>
                    </td>
                  </tr>
                ) : discountedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">No discounted seller products found.</td>
                  </tr>
                ) : (
                  discountedProducts.map((product) => {
                    const variant = getLowestPricedVariant(product)
                    const totalStock = (product.variants || []).reduce((sum, item) => sum + (Number(item?.stock) || 0), 0)
                    return (
                    <tr key={product._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{product.name || "N/A"}</div>
                        <div className="text-xs text-slate-500">{product.brand || product.sku || "No brand"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{product?.sellerId?.storeName || "Admin / Shared"}</div>
                        <div className="text-xs text-slate-500">{product?.sellerId?.ownerName || "No owner"}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{product.categoryName || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">Rs. {Number(variant?.price || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">Rs. {Number(variant?.discountPrice || 0).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {getDiscountPercent(product)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{totalStock}</td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Tag className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  )
}
