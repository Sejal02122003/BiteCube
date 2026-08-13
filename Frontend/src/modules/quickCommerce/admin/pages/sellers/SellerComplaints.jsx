import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Loader2, Search, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { fetchSellers } from "../../services/sellerService"

export default function SellerComplaints() {
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sellers, setSellers] = useState([])

  useEffect(() => {
    const loadSellers = async () => {
      try {
        setLoading(true)
        const response = await fetchSellers({
          page: 1,
          limit: 200,
          sortBy: "updatedAt",
          sortOrder: "desc",
        })
        if (response?.success) {
          setSellers(Array.isArray(response?.data?.sellers) ? response.data.sellers : [])
        } else {
          setSellers([])
          toast.error(response?.message || "Failed to fetch seller complaints data")
        }
      } catch (error) {
        setSellers([])
        toast.error(error?.response?.data?.message || error?.message || "Failed to fetch seller complaints data")
      } finally {
        setLoading(false)
      }
    }

    loadSellers()
  }, [])

  const sellersWithFlags = useMemo(() => {
    const baseList = sellers.filter((seller) => seller.status === "rejected" || String(seller.rejectionReason || "").trim())
    if (!searchQuery.trim()) return baseList
    const query = searchQuery.toLowerCase().trim()
    return baseList.filter((seller) =>
      seller.storeName?.toLowerCase().includes(query) ||
      seller.ownerName?.toLowerCase().includes(query) ||
      seller.rejectionReason?.toLowerCase().includes(query)
    )
  }, [sellers, searchQuery])

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Seller Complaints</h1>
                <p className="text-sm text-slate-500 mt-1">Monitor seller issues flagged during admin approval and verification.</p>
              </div>
            </div>

            <div className="relative min-w-[260px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search seller or issue"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Dedicated quick seller complaint APIs are not present yet. This page is currently connected to backend seller verification data and shows rejected or flagged sellers with their admin rejection reasons.
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Seller</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Owner</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Issue / Reason</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading seller issue data...</span>
                      </div>
                    </td>
                  </tr>
                ) : sellersWithFlags.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500">No seller issues found.</td>
                  </tr>
                ) : (
                  sellersWithFlags.map((seller) => (
                    <tr key={seller._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{seller.storeName || "N/A"}</div>
                        <div className="text-xs text-slate-500">{seller.slug || "Slug pending"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{seller.ownerName || "N/A"}</div>
                        <div className="text-xs text-slate-500">{seller.ownerPhone || "No phone"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${seller.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                          {seller.status || "pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2 text-sm text-slate-700">
                          <AlertCircle className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" />
                          <span>{seller.rejectionReason || "Seller was flagged during verification."}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {new Date(seller.updatedAt || seller.rejectedAt || seller.createdAt).toLocaleString("en-IN")}
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
