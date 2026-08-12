import { useEffect, useState } from "react"
import { ChevronDown, Code, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from "@food/components/admin/reports/reportsExportUtils"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

export default function QuickTaxReport() {
  const [filters, setFilters] = useState({ dateRangeType: "All Time" })
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({ totalIncome: "₹0.00", totalTax: "₹0.00" })
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reportDetail, setReportDetail] = useState(null)

  const buildDateParams = () => {
    let fromDate = null
    let toDate = null
    const now = new Date()
    if (filters.dateRangeType === "Today") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    } else if (filters.dateRangeType === "This Week") {
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek
      fromDate = new Date(now.getFullYear(), now.getMonth(), diff)
      toDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59)
    } else if (filters.dateRangeType === "This Month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (filters.dateRangeType === "This Year") {
      fromDate = new Date(now.getFullYear(), 0, 1)
      toDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    }
    return {
      fromDate: fromDate ? fromDate.toISOString() : undefined,
      toDate: toDate ? toDate.toISOString() : undefined,
    }
  }

  const fetchTaxReport = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getQuickTaxReport({ ...buildDateParams(), limit: 1000 })
      const data = response?.data?.data || {}
      setReports(data.reports || [])
      setStats(data.stats || { totalIncome: "₹0.00", totalTax: "₹0.00" })
    } catch (_) {
      toast.error("Failed to fetch quick tax report")
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTaxReport()
  }, [filters.dateRangeType])

  const handleViewDetails = async (report) => {
    setSelectedReport(report)
    setDetailLoading(true)
    try {
      const response = await adminAPI.getQuickTaxReportDetail(report.id, buildDateParams())
      setReportDetail(response?.data?.data || null)
    } catch (_) {
      toast.error("Failed to fetch quick tax detail")
    } finally {
      setDetailLoading(false)
    }
  }

  const headers = [
    { key: "sl", label: "SI" },
    { key: "incomeSource", label: "Income Source" },
    { key: "totalIncome", label: "Total Income" },
    { key: "totalTax", label: "Total Tax" },
  ]

  const handleExport = (format) => {
    if (!reports.length) return
    if (format === "csv") exportReportsToCSV(reports, headers, "quick_tax_report")
    if (format === "excel") exportReportsToExcel(reports, headers, "quick_tax_report")
    if (format === "pdf") exportReportsToPDF(reports, headers, "quick_tax_report", "Quick Tax Report")
    if (format === "json") exportReportsToJSON(reports, "quick_tax_report")
  }

  if (loading) return <div className="p-4 min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900">Quick Tax Report</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range Type</label>
              <select value={filters.dateRangeType} onChange={(e) => setFilters({ dateRangeType: e.target.value })} className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none">
                <option value="All Time">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
              </select>
              <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatTile label="Total Income" value={stats.totalIncome} />
            <StatTile label="Total Tax" value={stats.totalTax} valueClass="text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Quick Tax Report List ({reports.length})</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                  <Download className="w-4 h-4" />
                  <span className="text-black font-bold">Export</span>
                  <ChevronDown className="w-3 h-3" />
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{headers.map((header) => <th key={header.key} className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">{header.label}</th>)}
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {reports.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-500">No tax report generated</td></tr>
                ) : reports.map((report) => (
                  <tr key={report.sl} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-700">{report.sl}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{report.incomeSource}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{report.totalIncome}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{report.totalTax}</td>
                    <td className="px-4 py-3 text-center"><button onClick={() => handleViewDetails(report)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null) }}>
        <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle>Quick Tax Details: {selectedReport?.incomeSource}</DialogTitle>
          </DialogHeader>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {detailLoading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div> : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Seller: {reportDetail?.sellerName || "N/A"}</p>
                <div className="space-y-3">
                  {(reportDetail?.orders || []).map((order) => (
                    <div key={order.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{order.orderId}</p>
                        <p className="text-xs text-slate-500">{new Date(order.date).toLocaleString()}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                        <span>Total: {order.totalAmount}</span>
                        <span>Tax: {order.taxAmount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatTile({ label, value, valueClass = "text-blue-600" }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}
