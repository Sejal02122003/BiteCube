import { useEffect, useMemo, useState } from "react"
import {
  Search, Filter, Eye, Check, X, Store, ArrowUpDown, Loader2,
  FileText, ExternalLink, CreditCard, Calendar, Building2, User, Phone, Mail, MapPin
} from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@food/components/ui/dialog"
import { toast } from "sonner"
import {
  fetchSellerRequestById,
  fetchSellerRequests,
  updateSellerRequestStatus,
} from "../../services/sellerService"

const formatDateTime = (value) => {
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

const formatBusinessType = (value) =>
  String(value || "general-store")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

const DocumentCard = ({ label, value }) => (
  <a
    href={value || "#"}
    target="_blank"
    rel="noreferrer"
    className={`rounded-xl border p-4 text-sm transition-colors ${
      value
        ? "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40"
        : "border-dashed border-slate-200 bg-slate-50 text-slate-400 pointer-events-none"
    }`}
  >
    <div className="flex items-center gap-2 font-semibold">
      <FileText className="w-4 h-4" />
      <span>{label}</span>
    </div>
    <div className="mt-2 text-xs break-all">
      {value || "Not uploaded"}
    </div>
    {value ? (
      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600">
        <ExternalLink className="w-3 h-3" />
        Open document
      </div>
    ) : null}
  </a>
)

export default function JoiningRequest() {
  const [activeTab, setActiveTab] = useState("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" })
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, totalAll: 0 })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [sellerDetails, setSellerDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showFilterDialog, setShowFilterDialog] = useState(false)
  const [filters, setFilters] = useState({
    businessType: "",
    city: "",
    dateFrom: "",
    dateTo: "",
  })

  const loadRequests = async () => {
    try {
      setLoading(true)
      const response = await fetchSellerRequests({
        status: activeTab,
        search: searchQuery.trim() || undefined,
        page: 1,
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "desc",
      })

      if (response?.success) {
        const data = response?.data || {}
        setRequests(Array.isArray(data.sellers) ? data.sellers : [])
        setStats(data.stats || { pending: 0, approved: 0, rejected: 0, totalAll: 0 })
      } else {
        setRequests([])
        toast.error(response?.message || "Failed to fetch seller requests")
      }
    } catch (error) {
      setRequests([])
      toast.error(error?.response?.data?.message || error?.message || "Failed to fetch seller requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [activeTab])

  const filterOptions = useMemo(() => {
    const cities = [...new Set(requests.map((item) => item.city).filter(Boolean))]
    const businessTypes = [...new Set(requests.map((item) => item.businessType).filter(Boolean))]
    return { cities, businessTypes }
  }, [requests])

  const filteredRequests = useMemo(() => {
    let filtered = [...requests]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((request) =>
        request.storeName?.toLowerCase().includes(query) ||
        request.ownerName?.toLowerCase().includes(query) ||
        request.ownerPhone?.includes(query) ||
        request.city?.toLowerCase().includes(query)
      )
    }

    if (filters.businessType) {
      filtered = filtered.filter((request) => request.businessType === filters.businessType)
    }

    if (filters.city) {
      filtered = filtered.filter((request) => request.city === filters.city)
    }

    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter((request) => {
        if (!request.createdAt) return false
        const requestDate = new Date(request.createdAt).getTime()
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0)
          if (requestDate < fromDate) return false
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999)
          if (requestDate > toDate) return false
        }
        return true
      })
    }

    return filtered
  }, [requests, searchQuery, filters])

  const sortedRequests = useMemo(() => {
    const list = [...filteredRequests]
    const { key, direction } = sortConfig
    const multiplier = direction === "asc" ? 1 : -1

    const getValue = (request) => {
      switch (key) {
        case "sl":
          return Number(request.sl || 0)
        case "storeName":
          return String(request.storeName || "").toLowerCase()
        case "ownerName":
          return String(request.ownerName || "").toLowerCase()
        case "city":
          return String(request.city || "").toLowerCase()
        case "status":
          return String(request.status || "").toLowerCase()
        case "createdAt":
        default:
          return new Date(request.createdAt || 0).getTime()
      }
    }

    list.sort((left, right) => {
      const leftValue = getValue(left)
      const rightValue = getValue(right)
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * multiplier
      }
      return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true }) * multiplier
    })

    return list
  }, [filteredRequests, sortConfig])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, filters, sortConfig])

  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage)
  const paginatedRequests = sortedRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const getSortIconClassName = (key) => {
    if (sortConfig.key !== key) return "w-3 h-3 text-slate-400"
    return sortConfig.direction === "asc" ? "w-3 h-3 text-blue-600" : "w-3 h-3 text-slate-700"
  }

  const clearFilters = () => {
    setFilters({
      businessType: "",
      city: "",
      dateFrom: "",
      dateTo: "",
    })
  }

  const hasActiveFilters = filters.businessType || filters.city || filters.dateFrom || filters.dateTo

  const handleApprove = async () => {
    if (!selectedRequest?._id) return
    try {
      setProcessing(true)
      await updateSellerRequestStatus(selectedRequest._id, { status: "approved" })
      toast.success(`Successfully approved ${selectedRequest.storeName}'s join request!`)
      setShowApproveDialog(false)
      setSelectedRequest(null)
      await loadRequests()
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to approve request")
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest?._id || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason")
      return
    }
    try {
      setProcessing(true)
      await updateSellerRequestStatus(selectedRequest._id, {
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
      })
      toast.success(`Successfully rejected ${selectedRequest.storeName}'s join request!`)
      setShowRejectDialog(false)
      setSelectedRequest(null)
      setRejectionReason("")
      await loadRequests()
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to reject request")
    } finally {
      setProcessing(false)
    }
  }

  const handleViewDetails = async (request) => {
    setSelectedRequest(request)
    setShowDetailsModal(true)
    setLoadingDetails(true)
    setSellerDetails(null)

    try {
      const response = await fetchSellerRequestById(request._id)
      setSellerDetails(response?.data || response || request)
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to load seller details")
      setSellerDetails(request)
    } finally {
      setLoadingDetails(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">New Seller Join Request</h1>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "pending"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending Requests
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "rejected"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Rejected Request
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <input
                  type="text"
                  placeholder="Ex: Search by seller name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterDialog(true)}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-all flex items-center gap-2 ${
                  hasActiveFilters
                    ? "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <Filter className="w-4 h-4" />
                Filter
                {hasActiveFilters ? (
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {[filters.businessType, filters.city, filters.dateFrom, filters.dateTo].filter(Boolean).length}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.pending || 0}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.approved || 0}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rejected</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.rejected || 0}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.totalAll || 0}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort("sl")} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                      <span>SL</span>
                      <ArrowUpDown className={getSortIconClassName("sl")} />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort("storeName")} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                      <span>Seller Info</span>
                      <ArrowUpDown className={getSortIconClassName("storeName")} />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort("ownerName")} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                      <span>Owner Details</span>
                      <ArrowUpDown className={getSortIconClassName("ownerName")} />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort("city")} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                      <span>Location</span>
                      <ArrowUpDown className={getSortIconClassName("city")} />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <span>Business Type</span>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort("createdAt")} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                      <span>Applied At</span>
                      <ArrowUpDown className={getSortIconClassName("createdAt")} />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <span>Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading seller requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      No seller requests found.
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((request, index) => (
                    <tr key={request._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">{request.storeName || "N/A"}</div>
                          <div className="text-xs text-slate-500">{request.slug || "Slug pending"}</div>
                          <div className="text-xs text-slate-500">{request.status || "pending"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-900">{request.ownerName || "N/A"}</div>
                          <div className="text-xs text-slate-500">{request.ownerEmail || "No email"}</div>
                          <div className="text-xs text-slate-500">{request.ownerPhone || "No phone"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-slate-900">{request.city || "N/A"}</div>
                          <div className="text-xs text-slate-500">{request.area || request.state || "Location pending"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatBusinessType(request.businessType)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatDateTime(request.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(request)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {activeTab === "pending" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequest(request)
                                  setShowApproveDialog(true)
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequest(request)
                                  setRejectionReason("")
                                  setShowRejectDialog(true)
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-medium text-rose-600">
                              {request.rejectionReason || "Rejected"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
              <div className="text-sm text-slate-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedRequests.length)} of {sortedRequests.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Filter Seller Requests</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Business Type</label>
              <select
                value={filters.businessType}
                onChange={(e) => setFilters((prev) => ({ ...prev, businessType: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="">All business types</option>
                {filterOptions.businessTypes.map((item) => (
                  <option key={item} value={item}>{formatBusinessType(item)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="">All cities</option>
                {filterOptions.cities.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              Clear Filters
            </button>
            <button
              type="button"
              onClick={() => setShowFilterDialog(false)}
              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Seller Request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to approve "{selectedRequest?.storeName}" seller request?
          </p>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowApproveDialog(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={processing}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {processing ? "Approving..." : "Approve"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Seller Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Please provide a reason for rejecting "{selectedRequest?.storeName}" seller request.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm resize-none"
              placeholder="Enter rejection reason..."
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowRejectDialog(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={processing}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {processing ? "Rejecting..." : "Reject"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seller Request Details</DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading details...
            </div>
          ) : sellerDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold mb-3">
                    <Store className="w-4 h-4" />
                    Seller Info
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div><span className="font-medium text-slate-800">Store Name:</span> {sellerDetails.storeName || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Slug:</span> {sellerDetails.slug || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Business Type:</span> {formatBusinessType(sellerDetails.businessType)}</div>
                    <div><span className="font-medium text-slate-800">Status:</span> {sellerDetails.status || "pending"}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold mb-3">
                    <User className="w-4 h-4" />
                    Owner Details
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div><span className="font-medium text-slate-800">Name:</span> {sellerDetails.ownerName || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Email:</span> {sellerDetails.ownerEmail || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Phone:</span> {sellerDetails.ownerPhone || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Alternate:</span> {sellerDetails.alternatePhone || "N/A"}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold mb-3">
                    <Calendar className="w-4 h-4" />
                    Registration
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div><span className="font-medium text-slate-800">Applied At:</span> {formatDateTime(sellerDetails.createdAt)}</div>
                    <div><span className="font-medium text-slate-800">Approved At:</span> {formatDateTime(sellerDetails.approvedAt)}</div>
                    <div><span className="font-medium text-slate-800">Rejected At:</span> {formatDateTime(sellerDetails.rejectedAt)}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold mb-3">
                    <MapPin className="w-4 h-4" />
                    Address Details
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div><span className="font-medium text-slate-800">Formatted Address:</span> {sellerDetails.location?.formattedAddress || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Address Line 1:</span> {sellerDetails.addressLine1 || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Address Line 2:</span> {sellerDetails.addressLine2 || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Area:</span> {sellerDetails.area || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">City:</span> {sellerDetails.city || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">State:</span> {sellerDetails.state || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Pincode:</span> {sellerDetails.pincode || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Landmark:</span> {sellerDetails.landmark || "N/A"}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold mb-3">
                    <CreditCard className="w-4 h-4" />
                    Tax & Bank Details
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div><span className="font-medium text-slate-800">PAN Number:</span> {sellerDetails.panNumber || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">GST Registered:</span> {sellerDetails.gstRegistered ? "Yes" : "No"}</div>
                    <div><span className="font-medium text-slate-800">GST Number:</span> {sellerDetails.gstNumber || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Account Holder:</span> {sellerDetails.accountHolderName || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">Account Number:</span> {sellerDetails.accountNumber || "N/A"}</div>
                    <div><span className="font-medium text-slate-800">IFSC:</span> {sellerDetails.ifscCode || "N/A"}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <div className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
                  <Building2 className="w-4 h-4" />
                  Uploaded Documents
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DocumentCard label="Profile Image" value={sellerDetails.profileImage} />
                  <DocumentCard label="PAN Image" value={sellerDetails.documents?.panImage} />
                  <DocumentCard label="GST Image" value={sellerDetails.documents?.gstImage} />
                </div>
                {sellerDetails.rejectionReason ? (
                  <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <span className="font-semibold">Rejection Reason:</span> {sellerDetails.rejectionReason}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-slate-500">Seller details not available.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
