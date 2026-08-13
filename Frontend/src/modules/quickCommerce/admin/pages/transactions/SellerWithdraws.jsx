import { useState, useMemo, useEffect } from "react"
import { Search, Download, ChevronDown, Eye, Settings, Building, ArrowUpDown, FileSpreadsheet, Code, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@food/components/ui/dialog"
import { exportTransactionsToExcel, exportTransactionsToPDF } from "@food/components/admin/transactions/transactionsExportUtils"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

export default function SellerWithdraws() {
  const [activeTab, setActiveTab] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [withdraws, setWithdraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedWithdraw, setSelectedWithdraw] = useState(null)
  const [processingAction, setProcessingAction] = useState(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    amount: true,
    seller: true,
    sellerId: true,
    sellerAddress: false,
    requestTime: true,
    status: true,
    actions: true,
  })

  useEffect(() => {
    fetchWithdrawals()
  }, [activeTab])

  const fetchWithdrawals = async () => {
    try {
      setLoading(true)
      const status = activeTab === "All" ? undefined : activeTab
      const response = await adminAPI.getQuickSellerWithdrawalRequests({ status, search: searchQuery || undefined })
      if (response.data?.success) {
        setWithdraws(response.data.data?.requests || [])
      } else {
        toast.error("Failed to fetch seller withdrawal requests")
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch seller withdrawal requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWithdrawals()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const filteredWithdraws = useMemo(() => {
    let result = [...withdraws]
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter((w) =>
        w.sellerName?.toLowerCase().includes(query) ||
        w.sellerIdString?.toLowerCase().includes(query) ||
        w.amount?.toString().includes(query)
      )
    }
    return result
  }, [withdraws, searchQuery])

  const getStatusBadge = (status) => {
    if (status === "Approved" || status === "Processed") return "bg-green-100 text-green-700"
    if (status === "Pending") return "bg-blue-100 text-blue-700"
    if (status === "Rejected") return "bg-red-100 text-red-700"
    return "bg-slate-100 text-slate-700"
  }

  const handleApprove = async (id) => {
    if (!confirm("Are you sure you want to approve this seller withdrawal request?")) return
    try {
      setProcessingAction(id)
      const response = await adminAPI.approveQuickSellerWithdrawalRequest(id)
      if (response.data?.success) {
        toast.success("Seller withdrawal request approved successfully")
        fetchWithdrawals()
      } else {
        toast.error(response.data?.message || "Failed to approve seller withdrawal request")
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to approve seller withdrawal request")
    } finally {
      setProcessingAction(null)
    }
  }

  const handleReject = async (id) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason")
      return
    }
    try {
      setProcessingAction(id)
      const response = await adminAPI.rejectQuickSellerWithdrawalRequest(id, rejectionReason)
      if (response.data?.success) {
        toast.success("Seller withdrawal request rejected successfully")
        setShowRejectModal(false)
        setRejectionReason("")
        fetchWithdrawals()
      } else {
        toast.error(response.data?.message || "Failed to reject seller withdrawal request")
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reject seller withdrawal request")
    } finally {
      setProcessingAction(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return "N/A"
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatCurrency = (amount) =>
    `Rs. ${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const handleExport = async (format) => {
    if (filteredWithdraws.length === 0) {
      toast.error("No data to export.")
      return
    }
    const headers = [
      { key: "sl", label: "SI" },
      { key: "amount", label: "Amount" },
      { key: "sellerName", label: "Seller Name" },
      { key: "sellerIdString", label: "Seller ID" },
      { key: "requestTime", label: "Request Time" },
      { key: "processedTime", label: "Approved/Rejected Time" },
      { key: "status", label: "Status" },
      { key: "rejectionReason", label: "Rejection Reason" },
    ]
    const exportData = filteredWithdraws.map((w, index) => ({
      sl: index + 1,
      amount: formatCurrency(w.amount),
      sellerName: w.sellerName || "N/A",
      sellerIdString: w.sellerIdString || "N/A",
      requestTime: formatDate(w.requestedAt || w.createdAt),
      processedTime: w.processedAt ? formatDate(w.processedAt) : "",
      status: w.status,
      rejectionReason: w.rejectionReason || "",
    }))

    if (format === "excel") {
      exportTransactionsToExcel(exportData, headers, "quick_seller_withdraws")
    }
    if (format === "pdf") {
      await exportTransactionsToPDF(exportData, headers, "quick_seller_withdraws", "Quick Seller Withdraws Report")
    }
  }

  const toggleColumn = (key) => setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))

  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      amount: true,
      seller: true,
      sellerId: true,
      sellerAddress: false,
      requestTime: true,
      status: true,
      actions: true,
    })
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Seller Withdraw Transaction</h1>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex gap-2 border-b border-slate-200">
            {["All", "Pending", "Approved", "Rejected"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-600 hover:text-slate-900"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Withdraw Request Table</h2>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredWithdraws.length}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <input
                  type="text"
                  placeholder="Ex: search by Seller name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport("excel")} className="cursor-pointer flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer flex items-center gap-2">
                    <Code className="w-4 h-4" /> PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center"
                title="Table Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading seller withdrawal requests...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {visibleColumns.si && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider"><div className="flex items-center gap-2"><span>SI</span><ArrowUpDown className="w-3 h-3 text-slate-400" /></div></th>}
                    {visibleColumns.amount && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Amount</th>}
                    {visibleColumns.seller && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Seller Name</th>}
                    {visibleColumns.sellerId && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Seller ID</th>}
                    {visibleColumns.requestTime && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Request Time</th>}
                    {visibleColumns.status && <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Status</th>}
                    {visibleColumns.actions && <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredWithdraws.length === 0 ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Building className="w-16 h-16 text-slate-400 mb-4" />
                          <p className="text-lg font-semibold text-slate-700">No Data Found</p>
                          <p className="text-sm text-slate-500">No seller withdraw requests match your filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredWithdraws.map((withdraw, index) => (
                      <tr key={withdraw.id} className="hover:bg-slate-50 transition-colors">
                        {visibleColumns.si && <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-medium text-slate-700">{index + 1}</span></td>}
                        {visibleColumns.amount && <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-medium text-slate-700">{formatCurrency(withdraw.amount)}</span></td>}
                        {visibleColumns.seller && <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-medium text-slate-700">{withdraw.sellerName || "N/A"}</span></td>}
                        {visibleColumns.sellerId && <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-medium text-slate-700">{withdraw.sellerIdString || "N/A"}</span></td>}
                        {visibleColumns.requestTime && <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-medium text-slate-700">{formatDate(withdraw.requestedAt || withdraw.createdAt)}</span></td>}
                        {visibleColumns.status && <td className="px-6 py-4 whitespace-nowrap"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(withdraw.status)}`}>{withdraw.status}</span></td>}
                        {visibleColumns.actions && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => { setSelectedWithdraw(withdraw); setIsViewOpen(true) }} className="p-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors" title="View Details">
                                <Eye className="w-4 h-4 text-orange-600" />
                              </button>
                              {withdraw.status === "Pending" && (
                                <>
                                  <button onClick={() => handleApprove(withdraw.id)} disabled={processingAction === withdraw.id} className="p-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50" title="Approve">
                                    {processingAction === withdraw.id ? <Loader2 className="w-4 h-4 text-green-600 animate-spin" /> : <CheckCircle className="w-4 h-4 text-green-600" />}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedWithdraw(withdraw)
                                      setShowRejectModal(true)
                                    }}
                                    disabled={processingAction === withdraw.id}
                                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                                    title="Reject"
                                  >
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-md bg-white p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Withdraw Request Details</DialogTitle>
            </DialogHeader>
            {selectedWithdraw && (
              <div className="px-6 pb-6 space-y-4">
                <div><label className="text-xs font-semibold text-slate-500 uppercase">Amount</label><p className="text-sm font-medium text-slate-900 mt-1">{formatCurrency(selectedWithdraw.amount)}</p></div>
                <div><label className="text-xs font-semibold text-slate-500 uppercase">Seller Name</label><p className="text-sm font-medium text-slate-900 mt-1">{selectedWithdraw.sellerName || "N/A"}</p></div>
                <div><label className="text-xs font-semibold text-slate-500 uppercase">Seller ID</label><p className="text-sm font-medium text-slate-900 mt-1">{selectedWithdraw.sellerIdString || "N/A"}</p></div>
                <div><label className="text-xs font-semibold text-slate-500 uppercase">Address</label><p className="text-sm font-medium text-slate-900 mt-1">{selectedWithdraw.sellerAddress || "N/A"}</p></div>
                <div><label className="text-xs font-semibold text-slate-500 uppercase">Request Time</label><p className="text-sm font-medium text-slate-900 mt-1">{formatDate(selectedWithdraw.requestedAt || selectedWithdraw.createdAt)}</p></div>
                {!!selectedWithdraw.processedAt && <div><label className="text-xs font-semibold text-slate-500 uppercase">{selectedWithdraw.status === "Rejected" ? "Rejected Time" : "Approved Time"}</label><p className="text-sm font-medium text-slate-900 mt-1">{formatDate(selectedWithdraw.processedAt)}</p></div>}
                <div><label className="text-xs font-semibold text-slate-500 uppercase">Status</label><p className="mt-1"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedWithdraw.status)}`}>{selectedWithdraw.status}</span></p></div>
                <div className="border-t border-slate-200 pt-4">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Bank Details</label>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-slate-800"><span className="font-semibold">Account Holder:</span> {selectedWithdraw.sellerBankDetails?.accountHolderName || "N/A"}</p>
                    <p className="text-sm text-slate-800"><span className="font-semibold">Account Number:</span> {selectedWithdraw.sellerBankDetails?.accountNumber || "N/A"}</p>
                    <p className="text-sm text-slate-800"><span className="font-semibold">IFSC:</span> {selectedWithdraw.sellerBankDetails?.ifscCode || "N/A"}</p>
                    <p className="text-sm text-slate-800"><span className="font-semibold">Bank Name:</span> {selectedWithdraw.sellerBankDetails?.bankName || "N/A"}</p>
                    <p className="text-sm text-slate-800"><span className="font-semibold">UPI ID:</span> {selectedWithdraw.sellerBankDetails?.upiId || "N/A"}</p>
                  </div>
                </div>
                {selectedWithdraw.rejectionReason && <div><label className="text-xs font-semibold text-slate-500 uppercase">Rejection Reason</label><p className="text-sm font-medium text-slate-900 mt-1">{selectedWithdraw.rejectionReason}</p></div>}
              </div>
            )}
            <DialogFooter className="px-6 pb-6">
              <button onClick={() => setIsViewOpen(false)} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md">Close</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="max-w-md bg-white p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Reject Withdrawal Request</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rejection Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <DialogFooter className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason("")
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedWithdraw && handleReject(selectedWithdraw.id)}
                disabled={!rejectionReason.trim() || processingAction === selectedWithdraw?.id}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all shadow-md disabled:opacity-50"
              >
                {processingAction === selectedWithdraw?.id ? "Rejecting..." : "Reject"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-md bg-white p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Table Settings</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Toggle Columns</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(visibleColumns).map(([key, isVisible]) => (
                    <div key={key} className="flex items-center">
                      <input type="checkbox" id={`toggle-${key}`} checked={isVisible} onChange={() => toggleColumn(key)} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                      <label htmlFor={`toggle-${key}`} className="ml-2 text-sm text-slate-700 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 pb-6 flex justify-between">
              <button onClick={resetColumns} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all">Reset Columns</button>
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md">Apply</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
