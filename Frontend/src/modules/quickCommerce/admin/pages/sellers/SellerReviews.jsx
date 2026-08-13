import { useEffect, useMemo, useState } from "react"
import { Loader2, MessageSquareText, Search, Star } from "lucide-react"
import { toast } from "sonner"
import { fetchProducts } from "../../services/productService"

export default function SellerReviews() {
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState([])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        const response = await fetchProducts({ page: 1, limit: 500, sortBy: "reviewCount", sortOrder: "desc" })
        if (response?.success) {
          setProducts(Array.isArray(response?.data?.products) ? response.data.products : [])
        } else {
          setProducts([])
          toast.error(response?.message || "Failed to fetch seller reviews")
        }
      } catch (error) {
        setProducts([])
        toast.error(error?.response?.data?.message || error?.message || "Failed to fetch seller reviews")
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  const reviewedProducts = useMemo(() => {
    const list = products.filter((product) => Number(product.reviewCount || 0) > 0 || Number(product.rating || 0) > 0)
    if (!searchQuery.trim()) return list
    const query = searchQuery.toLowerCase().trim()
    return list.filter((product) =>
      product.name?.toLowerCase().includes(query) ||
      product.categoryName?.toLowerCase().includes(query) ||
      product?.sellerId?.storeName?.toLowerCase().includes(query)
    )
  }, [products, searchQuery])

  const totalReviews = reviewedProducts.reduce((sum, product) => sum + Number(product.reviewCount || 0), 0)
  const avgRating =
    reviewedProducts.length > 0
      ? (
          reviewedProducts.reduce((sum, product) => sum + Number(product.rating || 0), 0) /
          reviewedProducts.length
        ).toFixed(1)
      : "0.0"

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                <MessageSquareText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Seller Reviews</h1>
                <p className="text-sm text-slate-500 mt-1">See seller product ratings and review counts from quick-commerce products.</p>
              </div>
            </div>

            <div className="relative min-w-[260px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search seller or product"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ReviewCard label="Reviewed Products" value={reviewedProducts.length} />
          <ReviewCard label="Total Reviews" value={totalReviews} />
          <ReviewCard label="Average Rating" value={avgRating} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Product</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Seller</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Category</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Rating</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Review Count</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading review data...</span>
                      </div>
                    </td>
                  </tr>
                ) : reviewedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-500">No seller review data found.</td>
                  </tr>
                ) : (
                  reviewedProducts.map((product) => (
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
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {Number(product.rating || 0).toFixed(1)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{product.reviewCount || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${product.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {product.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Star className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  )
}
