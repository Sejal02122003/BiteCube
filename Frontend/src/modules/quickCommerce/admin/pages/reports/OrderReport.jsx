import { useEffect, useMemo, useState } from "react"
import { BarChart3, ChevronDown, FileSpreadsheet, FileText, Code, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from "@food/components/admin/reports/reportsExportUtils"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

const summaryKeys = [
  { key: "Pending", label: "Pending" },
  { key: "Processing", label: "Processing" },
  { key: "Delivered", label: "Delivered" },
  { key: "Canceled", label: "Canceled" },
  { key: "Refunded", label: "Refunded" },
]

export default function QuickOrderReport() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState([])
  const [sellers, setSellers] = useState([])
  const [summary, setSummary] = useState({})
  const [filters, setFilters] = useState({ zone: "All Zones", seller: "All sellers", time: "All Time" })
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    Promise.all([adminAPI.getZones({ limit: 1000 }), adminAPI.getQCSellers({ limit: 1000, page: 1 })])
      .then(([zonesRes, sellersRes]) => {
        setZones(zonesRes?.data?.data?.zones || [])
        setSellers(sellersRes?.data?.data?.sellers || sellersRes?.data?.data || [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        const selectedZone = zones.find((zone) => (zone.zoneName || zone.name) === filters.zone)
        const params = {
          zone: filters.zone !== "All Zones" ? (selectedZone?._id || filters.zone) : undefined,
          seller: filters.seller !== "All sellers" ? filters.seller : undefined,
          time: filters.time !== "All Time" ? filters.time : undefined,
          search: searchQuery || undefined,
        }
        const response = await adminAPI.getQuickOrderReport(params)
        const data = response?.data?.data || {}
        setOrders(data.orders || [])
        setSummary(data.summary || {})
      } catch (_) {
        toast.error("Failed to fetch quick order report")
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [filters, searchQuery, zones])

  const headers = useMemo(() => [
    { key: "sl", label: "SL" },
    { key: "orderId", label: "Order ID" },
    { key: "seller", label: "Seller" },
    { key: "customerName", label: "Customer" },
    { key: "totalItemAmount", label: "Item Amount" },
    { key: "couponDiscount", label: "Discount" },
    { key: "vatTax", label: "Tax" },
    { key: "deliveryCharge", label: "Delivery Charge" },
    { key: "platformFee", label: "Platform Fee" },
    { key: "totalAmount", label: "Total Amount" },
    { key: "orderStatus", label: "Status" },
  ], [])

  const handleExport = (format) => {
    if (!orders.length) return
    if (format === "csv") exportReportsToCSV(orders, headers, "quick_order_report")
    if (format === "excel") exportReportsToExcel(orders, headers, "quick_order_report")
    if (format === "pdf") exportReportsToPDF(orders, headers, "quick_order_report", "Quick Order Report")
    if (format === "json") exportReportsToJSON(orders, "quick_order_report")
  }

  if (loading) {
    return <div className="p-4 min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div>
          <h1 className="text-2xl font-bold text-slate-900">Quick Order Report</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SelectField label="Zone" value={filters.zone} onChange={(value) => setFilters((prev) => ({ ...prev, zone: value }))} options={["All Zones", ...zones.map((zone) => zone.zoneName || zone.name)]} />
            <SelectField label="Seller" value={filters.seller} onChange={(value) => setFilters((prev) => ({ ...prev, seller: value }))} options={["All sellers", ...sellers.map((seller) => seller.storeName || seller.name)]} />
            <SelectField label="Time" value={filters.time} onChange={(value) => setFilters((prev) => ({ ...prev, time: value }))} options={["All Time", "Today", "This Week", "This Month", "This Year"]} />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Search</label>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search order id" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {summaryKeys.map((item) => (
            <div key={item.key} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{summary?.[item.key] || 0}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Quick Order Report Table {orders.length}</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                  <FileText className="w-4 h-4" />
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
          <SimpleTable headers={headers} rows={orders} emptyLabel="No quick orders found" />
        </div>
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
    </div>
  )
}

function SimpleTable({ headers, rows, emptyLabel }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>{headers.map((header) => <th key={header.key} className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">{header.label}</th>)}</tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="px-6 py-20 text-center text-slate-500">{emptyLabel}</td></tr>
          ) : rows.map((row, index) => (
            <tr key={`${row.orderId || row.id}-${index}`} className="hover:bg-slate-50 transition-colors">
              {headers.map((header) => <td key={header.key} className="px-4 py-3 text-sm text-slate-700">{row[header.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
