import { useEffect, useMemo, useState } from "react"
import { Check, Eye, Loader2, Power, Search, Store, X } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog"
import {
  fetchSellerRequestById,
  fetchSellers,
  toggleSellerActiveStatus,
  updateSellerRequestStatus,
} from "../../services/sellerService"
import {
  formatBusinessType,
  formatDateTime,
  getActiveBadgeClassName,
  getLocationLabel,
  getStatusBadgeClassName,
  hasBankDetails,
  hasKycDocuments,
} from "./sellerPageUtils"

const emptyStats = {
  totalAll: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  active: 0,
  inactive: 0,
}

export default function SellersList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activityFilter, setActivityFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState("")
  const [sellers, setSellers] = useState([])
  const [stats, setStats] = useState(emptyStats)
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const loadSellers = async () => {
    try {
      setLoading(true)
      const response = await fetchSellers({
        search: searchQuery.trim() || undefined,
        status: statusFilter,
        activity: activityFilter,
        page: 1,
        limit: 200,
        sortBy: "createdAt",
        sortOrder: "desc",
      })

      if (response?.success) {
        const payload = response.data || {}
        setSellers(Array.isArray(payload.sellers) ? payload.sellers : [])
        setStats(payload.stats || emptyStats)
      } else {
        setSellers([])
        setStats(emptyStats)
        toast.error(response?.message || "Failed to fetch sellers")
      }
    } catch (error) {
      setSellers([])
      setStats(emptyStats)
      toast.error(error?.response?.data?.message || error?.message || "Failed to fetch sellers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSellers()
  }, [statusFilter, activityFilter])

  const filteredSellers = useMemo(() => {
    if (!searchQuery.trim()) return sellers
    const query = searchQuery.toLowerCase().trim()
    return sellers.filter((seller) =>
      seller.storeName?.toLowerCase().includes(query) ||
      seller.ownerName?.toLowerCase().includes(query) ||
      seller.ownerPhone?.includes(query) ||
      seller.ownerEmail?.toLowerCase().includes(query) ||
      seller.city?.toLowerCase().includes(query)
    )
  }, [sellers, searchQuery])

  const openSellerDetails = async (seller) => {
    setDetailsOpen(true)
    setSelectedSeller(seller)
    setLoadingDetails(true)
    try {
      const response = await fetchSellerRequestById(seller._id)
      setSelectedSeller(response?.data || response || seller)
    } catch (error) {
      setSelectedSeller(seller)
      toast.error(error?.response?.data?.message || error?.message || "Failed to load seller details")
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleStatusUpdate = async (sellerId, payload, successMessage) => {
    try {
      setProcessingId(sellerId)
      await updateSellerRequestStatus(sellerId, payload)
      toast.success(successMessage)
      await loadSellers()
      if (selectedSeller?._id === sellerId) {
        const response = await fetchSellerRequestById(sellerId)
        setSelectedSeller(response?.data || response || null)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to update seller status")
    } finally {
      setProcessingId("")
    }
  }

  const handleToggleActive = async (sellerId) => {
    try {
      setProcessingId(sellerId)
      const response = await toggleSellerActiveStatus(sellerId)
      toast.success(response?.message || "Seller status updated")
      await loadSellers()
      if (selectedSeller?._id === sellerId) {
        const detailResponse = await fetchSellerRequestById(sellerId)
        setSelectedSeller(detailResponse?.data || detailResponse || null)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to update active status")
    } finally {
      setProcessingId("")
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sellers List</h1>
                <p className="text-sm text-slate-500 mt-1">Manage all quick commerce sellers from one place.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-[250px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search seller, owner, phone, city"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="all">All activity</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button
                type="button"
                onClick={loadSellers}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value={stats.totalAll} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Approved" value={stats.approved} />
          <StatCard label="Rejected" value={stats.rejected} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Inactive" value={stats.inactive} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Seller</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Owner</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Location</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Business</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">KYC / Bank</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Created</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading sellers...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSellers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                      No sellers found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredSellers.map((seller) => {
                    const isBusy = processingId === seller._id
                    return (
                      <tr key={seller._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-900">{seller.storeName || "N/A"}</div>
                            <div className="text-xs text-slate-500">{seller.slug || "Slug pending"}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-slate-900">{seller.ownerName || "N/A"}</div>
                            <div className="text-xs text-slate-500">{seller.ownerPhone || "No phone"}</div>
                            <div className="text-xs text-slate-500">{seller.ownerEmail || "No email"}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{getLocationLabel(seller)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{formatBusinessType(seller.businessType)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(seller.status)}`}>
                              {seller.status || "pending"}
                            </span>
                            <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getActiveBadgeClassName(seller.isActive)}`}>
                              {seller.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-xs">
                            <div className={hasKycDocuments(seller) ? "text-emerald-700" : "text-amber-600"}>
                              KYC: {hasKycDocuments(seller) ? "Uploaded" : "Pending"}
                            </div>
                            <div className={hasBankDetails(seller) ? "text-emerald-700" : "text-amber-600"}>
                              Bank: {hasBankDetails(seller) ? "Ready" : "Pending"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{formatDateTime(seller.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openSellerDetails(seller)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>

                            {seller.status === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleStatusUpdate(seller._id, { status: "approved" }, `${seller.storeName} approved successfully`)
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleStatusUpdate(
                                      seller._id,
                                      { status: "rejected", rejectionReason: "Rejected by admin" },
                                      `${seller.storeName} rejected successfully`
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                                >
                                  {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                  Reject
                                </button>
                              </>
                            ) : null}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleActive(seller._id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                              {seller.isActive ? "Disable" : "Enable"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Seller Details</DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="py-12 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading seller details...</span>
            </div>
          ) : selectedSeller ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailCard label="Store Name" value={selectedSeller.storeName} />
              <DetailCard label="Owner Name" value={selectedSeller.ownerName} />
              <DetailCard label="Phone" value={selectedSeller.ownerPhone} />
              <DetailCard label="Email" value={selectedSeller.ownerEmail} />
              <DetailCard label="Business Type" value={formatBusinessType(selectedSeller.businessType)} />
              <DetailCard label="Status" value={selectedSeller.status} />
              <DetailCard label="Active" value={selectedSeller.isActive ? "Yes" : "No"} />
              <DetailCard label="Accepting Orders" value={selectedSeller.isAcceptingOrders ? "Yes" : "No"} />
              <DetailCard label="Address" value={selectedSeller.addressLine1 || selectedSeller.location?.formattedAddress} />
              <DetailCard label="Area / City" value={getLocationLabel(selectedSeller)} />
              <DetailCard label="PAN Number" value={selectedSeller.panNumber} />
              <DetailCard label="GST Number" value={selectedSeller.gstNumber} />
              <DetailCard label="FSSAI Number" value={selectedSeller.fssaiNumber} />
              <DetailCard label="UPI ID" value={selectedSeller.upiId} />
              <DetailCard label="Account Holder" value={selectedSeller.accountHolderName} />
              <DetailCard label="IFSC Code" value={selectedSeller.ifscCode} />
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">Seller details unavailable.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value || 0}</div>
    </div>
  )
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900 break-words">{value || "N/A"}</div>
    </div>
  )
}
