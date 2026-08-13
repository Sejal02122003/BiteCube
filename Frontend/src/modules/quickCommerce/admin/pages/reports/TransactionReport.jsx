import { useState, useMemo, useEffect } from "react"
import { BarChart3, ChevronDown, Info, FileText, FileSpreadsheet, Code, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { exportTransactionReportToCSV, exportTransactionReportToExcel, exportTransactionReportToPDF, exportTransactionReportToJSON } from "@food/components/admin/reports/reportsExportUtils"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

import completedIcon from "@food/assets/Transaction-report-icons/trx1.svg"
import refundedIcon from "@food/assets/Transaction-report-icons/trx3.svg"
import adminEarningIcon from "@food/assets/Transaction-report-icons/admin-earning.svg"
import restaurantEarningIcon from "@food/assets/Transaction-report-icons/store-earning.svg"
import deliverymanEarningIcon from "@food/assets/Transaction-report-icons/deliveryman-earning.svg"
import searchIcon from "@food/assets/Dashboard-icons/image8.png"
import exportIcon from "@food/assets/Dashboard-icons/image9.png"

export default function QuickTransactionReport() {
  const [searchQuery, setSearchQuery] = useState("")
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [summary, setSummary] = useState({
    completedTransaction: 0,
    refundedTransaction: 0,
    adminEarning: 0,
    sellerEarning: 0,
    deliverymanEarning: 0,
    adminEarningBreakdown: {},
  })
  const [filters, setFilters] = useState({
    zone: "All Zones",
    seller: "All sellers",
    time: "All Time",
  })
  const [zones, setZones] = useState([])
  const [sellers, setSellers] = useState([])

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [zonesResponse, sellersResponse] = await Promise.all([
          adminAPI.getZones({ limit: 1000 }),
          adminAPI.getQCSellers({ limit: 1000, page: 1 }),
        ])

        if (zonesResponse?.data?.success && zonesResponse.data.data?.zones) {
          setZones(zonesResponse.data.data.zones)
        }

        const sellerRows = sellersResponse?.data?.data?.sellers || sellersResponse?.data?.data || []
        setSellers(Array.isArray(sellerRows) ? sellerRows : [])
      } catch (_) {}
    }

    fetchFilterData()
  }, [])

  useEffect(() => {
    const fetchTransactionReport = async () => {
      try {
        setIsRefreshing(true)

        let fromDate = null
        let toDate = null
        const now = new Date()

        if (filters.time === "Today") {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        } else if (filters.time === "This Week") {
          const dayOfWeek = now.getDay()
          const diff = now.getDate() - dayOfWeek
          fromDate = new Date(now.getFullYear(), now.getMonth(), diff)
          toDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59)
        } else if (filters.time === "This Month") {
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
          toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        }

        const selectedZone = zones.find((zone) => (zone.zoneName || zone.name) === filters.zone)

        const params = {
          search: searchQuery || undefined,
          zone: filters.zone !== "All Zones" ? (selectedZone?._id || filters.zone) : undefined,
          seller: filters.seller !== "All sellers" ? filters.seller : undefined,
          fromDate: fromDate ? fromDate.toISOString() : undefined,
          toDate: toDate ? toDate.toISOString() : undefined,
          limit: 1000,
        }

        const response = await adminAPI.getQuickTransactionReport(params)
        if (response?.data?.success && response.data.data) {
          setTransactions(response.data.data.transactions || [])
          setSummary(response.data.data.summary || {
            completedTransaction: 0,
            refundedTransaction: 0,
            adminEarning: 0,
            sellerEarning: 0,
            deliverymanEarning: 0,
            adminEarningBreakdown: {},
          })
        } else {
          setTransactions([])
          toast.error(response?.data?.message || "Failed to fetch quick transaction report")
        }
      } catch (_) {
        toast.error("Failed to fetch quick transaction report")
        setTransactions([])
      } finally {
        setIsRefreshing(false)
        setLoading(false)
      }
    }

    fetchTransactionReport()
  }, [searchQuery, filters, zones])

  const filteredTransactions = useMemo(() => transactions, [transactions])

  const handleExport = (format) => {
    if (filteredTransactions.length === 0) {
      alert("No data to export")
      return
    }
    switch (format) {
      case "csv": exportTransactionReportToCSV(filteredTransactions, "quick_transaction_report"); break
      case "excel": exportTransactionReportToExcel(filteredTransactions, "quick_transaction_report"); break
      case "pdf": exportTransactionReportToPDF(filteredTransactions, "quick_transaction_report", "Quick Transaction Report"); break
      case "json": exportTransactionReportToJSON(filteredTransactions, "quick_transaction_report"); break
    }
  }

  const handleResetFilters = () => {
    setFilters({ zone: "All Zones", seller: "All sellers", time: "All Time" })
  }

  const activeFiltersCount = (filters.zone !== "All Zones" ? 1 : 0) + (filters.seller !== "All sellers" ? 1 : 0) + (filters.time !== "All Time" ? 1 : 0)

  const formatCurrency = (amount) => {
    const safeAmount = Number(amount || 0)
    if (safeAmount >= 1000) return `₹ ${(safeAmount / 1000).toFixed(2)}K`
    return `₹ ${safeAmount.toFixed(2)}`
  }

  const formatFullCurrency = (amount) =>
    `₹ ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const getStatusBadgeClasses = (status) => {
    const normalized = String(status || "").toLowerCase()
    if (["captured", "settled", "completed", "paid", "delivered"].includes(normalized)) return "bg-green-100 text-green-700"
    if (["pending", "created", "authorized", "cod_pending"].includes(normalized)) return "bg-yellow-100 text-yellow-700"
    if (["failed", "refunded", "cancelled", "cancelled_by_admin", "cancelled_by_user", "cancelled_by_restaurant", "dead"].includes(normalized)) return "bg-red-100 text-red-700"
    return "bg-slate-100 text-slate-700"
  }

  if (loading) {
    return (
      <div className="p-2 lg:p-3 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading quick transaction report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <div className="w-full mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Quick Transaction Report</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <select
                value={filters.zone}
                onChange={(e) => setFilters((prev) => ({ ...prev, zone: e.target.value }))}
                className="w-full px-2.5 py-1.5 pr-5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"
              >
                <option value="All Zones">All Zones</option>
                {zones.map((zone) => (
                  <option key={zone._id} value={zone.zoneName || zone.name}>{zone.zoneName || zone.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </div>

            <div className="relative flex-1 min-w-0">
              <select
                value={filters.seller}
                onChange={(e) => setFilters((prev) => ({ ...prev, seller: e.target.value }))}
                className="w-full px-2.5 py-1.5 pr-5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"
              >
                <option value="All sellers">All sellers</option>
                {sellers.map((seller) => (
                  <option key={seller._id} value={seller.storeName || seller.name}>{seller.storeName || seller.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </div>

            <div className="relative flex-1 min-w-0">
              <select
                value={filters.time}
                onChange={(e) => setFilters((prev) => ({ ...prev, time: e.target.value }))}
                className="w-full px-2.5 py-1.5 pr-5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none cursor-pointer"
              >
                <option value="All Time">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </div>

            <button className={`px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white whitespace-nowrap relative ${activeFiltersCount > 0 ? "ring-2 ring-blue-300" : ""}`}>
              Filter
              {activeFiltersCount > 0 ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>
            <button onClick={handleResetFilters} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all whitespace-nowrap">
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="space-y-3">
            <SummaryTile icon={completedIcon} iconBg="bg-green-100" badgeBg="bg-green-500" valueClass="text-green-600" label="Completed Transaction" value={formatCurrency(summary.completedTransaction)} />
            <SummaryTile icon={refundedIcon} iconBg="bg-red-100" badgeBg="bg-red-500" valueClass="text-red-600" label="Refunded Transaction" value={formatFullCurrency(summary.refundedTransaction)} />
          </div>

          <div className="space-y-3">
            <MiniSummaryTile icon={adminEarningIcon} iconBg="bg-green-100" badgeBg="bg-green-500" title="Admin Earning" value={formatCurrency(summary.adminEarning)} />
            <MiniSummaryTile icon={restaurantEarningIcon} iconBg="bg-blue-100" badgeBg="bg-blue-500" title="Seller Earning" value={formatCurrency(summary.sellerEarning)} valueClass="text-green-600" />
            <MiniSummaryTile icon={deliverymanEarningIcon} iconBg="bg-green-100" badgeBg="bg-red-500" title="Deliveryman Earning" value={formatCurrency(summary.deliverymanEarning)} valueClass="text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h2 className="text-base font-bold text-slate-900">Order Transactions {filteredTransactions.length}</h2>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial min-w-[180px]">
                <input
                  type="text"
                  placeholder="Search by Order ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2 py-1.5 w-full text-[11px] rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <img src={searchIcon} alt="Search" className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" />
                {isRefreshing ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 animate-spin" /> : null}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 transition-all">
                    <img src={exportIcon} alt="Export" className="w-3 h-3" />
                    <span>Export</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer"><FileText className="w-4 h-4 mr-2" />Export as CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")} className="cursor-pointer"><FileSpreadsheet className="w-4 h-4 mr-2" />Export as Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer"><FileText className="w-4 h-4 mr-2" />Export as PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("json")} className="cursor-pointer"><Code className="w-4 h-4 mr-2" />Export as JSON</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full" style={{ tableLayout: "fixed", width: "100%" }}>
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "3%" }}>SI</th>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "7%" }}>Order Id</th>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "10%" }}>Seller</th>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "10%" }}>Customer Name</th>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "11%" }}>Total Item Amount</th>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "9%" }}>Coupon Discount</th>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "9%" }}>Vat/Tax</th>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "10%" }}>Delivery Charge</th>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "9%" }}>Platform Fee</th>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "9%" }}>Order Amount</th>
                  <th className="px-1.5 py-1 text-left text-[8px] font-bold text-slate-700 uppercase tracking-wider" style={{ width: "8%" }}>Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-lg font-semibold text-slate-700 mb-1">No Data Found</p>
                        <p className="text-sm text-slate-500">No quick transactions match your search</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction, index) => (
                    <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-1.5 py-1"><span className="text-[10px] font-medium text-slate-700">{index + 1}</span></td>
                      <td className="px-1.5 py-1"><span className="text-[10px] text-slate-700">{transaction.orderId}</span></td>
                      <td className="px-1.5 py-1"><span className="text-[10px] text-slate-700 truncate block">{transaction.seller}</span></td>
                      <td className="px-1.5 py-1"><span className="text-[10px] text-slate-700 truncate block">{transaction.customerName}</span></td>
                      <td className="px-1.5 py-1"><span className="text-[10px] text-slate-700">{formatFullCurrency(transaction.totalItemAmount)}</span></td>
                      <td className="px-1.5 py-1"><span className="text-[10px] text-slate-700">{formatFullCurrency(transaction.couponDiscount)}</span></td>
                      <td className="px-1.5 py-1"><span className="text-[10px] text-slate-700">{formatFullCurrency(transaction.vatTax)}</span></td>
                      <td className="px-1.5 py-1"><span className="text-[10px] text-slate-700">{formatFullCurrency(transaction.deliveryCharge)}</span></td>
                      <td className="px-1.5 py-1"><span className="text-[10px] text-slate-700">{formatFullCurrency(transaction.platformFee || 0)}</span></td>
                      <td className="px-1.5 py-1"><span className="text-[10px] font-medium text-slate-900">{formatFullCurrency(transaction.orderAmount)}</span></td>
                      <td className="px-1.5 py-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${getStatusBadgeClasses(transaction.status || transaction.orderStatus)}`}>
                          {transaction.status || transaction.orderStatus || "N/A"}
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

function SummaryTile({ icon, iconBg, badgeBg, valueClass, label, value }) {
  return (
    <div className="rounded-lg shadow-sm border border-slate-200 p-4" style={{ backgroundColor: "#f1f5f9" }}>
      <div className="relative mb-3 flex justify-center">
        <div className={`w-16 h-16 rounded-full ${iconBg} flex items-center justify-center`}>
          <img src={icon} alt={label} className="w-12 h-12" />
        </div>
        <div className={`absolute top-0 right-0 w-6 h-6 rounded-full ${badgeBg} flex items-center justify-center`}>
          <Info className="w-3 h-3 text-white" />
        </div>
      </div>
      <div className="text-center">
        <p className={`text-xl font-bold mb-1 ${valueClass}`}>{value}</p>
        <p className="text-sm text-slate-600 leading-tight">{label}</p>
      </div>
    </div>
  )
}

function MiniSummaryTile({ icon, iconBg, badgeBg, title, value, valueClass = "text-slate-900" }) {
  return (
    <div className="rounded-lg shadow-sm border border-slate-200 p-3" style={{ backgroundColor: "#f1f5f9" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <img src={icon} alt={title} className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <div className={`w-5 h-5 rounded-full ${badgeBg} flex items-center justify-center`}>
              <Info className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>
        <p className={`text-base font-bold ${valueClass}`}>{value}</p>
      </div>
    </div>
  )
}
