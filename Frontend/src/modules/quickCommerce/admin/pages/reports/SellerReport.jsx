import { useEffect, useMemo, useState } from "react"
import { Briefcase, ChevronDown, Code, Download, FileSpreadsheet, FileText, Loader2, RefreshCw, Search, Star } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from "@food/components/admin/reports/reportsExportUtils"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
import { getPlaceholderImage } from "@/shared/utils/media.js"

export default function QuickSellerReport() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ zone: "All Zones", all: "All", type: "All types", time: "All Time" })
  const [zones, setZones] = useState([])

  useEffect(() => {
    adminAPI.getZones({ limit: 1000 }).then((response) => {
      if (response?.data?.success && response.data.data?.zones) setZones(response.data.data.zones)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        const params = {
          zone: filters.zone !== "All Zones" ? filters.zone : undefined,
          all: filters.all !== "All" ? filters.all : undefined,
          type: filters.type !== "All types" ? filters.type : undefined,
          time: filters.time !== "All Time" ? filters.time : undefined,
          search: searchQuery || undefined,
        }
        const response = await adminAPI.getQuickSellerReport(params)
        setSellers(response?.data?.data?.sellers || [])
      } catch (_) {
        toast.error("Failed to fetch quick seller report")
        setSellers([])
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [filters, searchQuery])

  const headers = useMemo(() => [
    { key: "sl", label: "SL" },
    { key: "sellerName", label: "Seller Name" },
    { key: "totalProducts", label: "Total Products" },
    { key: "totalOrder", label: "Total Order" },
    { key: "totalOrderAmount", label: "Total Order Amount" },
    { key: "totalDiscountGiven", label: "Total Discount Given" },
    { key: "totalAdminCommission", label: "Total Admin Commission" },
    { key: "totalVATTAX", label: "Total VAT/TAX" },
    { key: "averageRatings", label: "Average Ratings" },
  ], [])

  const handleExport = (format) => {
    if (!sellers.length) return
    if (format === "csv") exportReportsToCSV(sellers, headers, "quick_seller_report")
    if (format === "excel") exportReportsToExcel(sellers, headers, "quick_seller_report")
    if (format === "pdf") exportReportsToPDF(sellers, headers, "quick_seller_report", "Quick Seller Report")
    if (format === "json") exportReportsToJSON(sellers, "quick_seller_report")
  }

  if (loading) return <div className="p-4 min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center"><Briefcase className="w-5 h-5 text-white" /></div>
          <h1 className="text-2xl font-bold text-slate-900">Seller Report</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              <SelectField label="Zone" value={filters.zone} onChange={(value) => setFilters((prev) => ({ ...prev, zone: value }))} options={["All Zones", ...zones.map((zone) => zone.name || zone.zoneName)]} />
              <SelectField label="All" value={filters.all} onChange={(value) => setFilters((prev) => ({ ...prev, all: value }))} options={["All", "Active", "Inactive"]} />
              <SelectField label="Type" value={filters.type} onChange={(value) => setFilters((prev) => ({ ...prev, type: value }))} options={["All types", "Commission"]} />
              <SelectField label="Time" value={filters.time} onChange={(value) => setFilters((prev) => ({ ...prev, time: value }))} options={["All Time", "Today", "This Week", "This Month", "This Year"]} />
            </div>

            <div className="flex items-end gap-3">
              <div className="relative flex-1 sm:w-[320px] lg:w-[400px]">
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ex: search seller name..." className="pl-4 pr-10 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white" />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              <button onClick={() => { setFilters({ zone: "All Zones", all: "All", type: "All types", time: "All Time" }); setSearchQuery("") }} className="px-6 py-2.5 text-sm font-medium rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-all flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Seller Report Table {sellers.length}</h2>
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
                <tr>{headers.map((header) => <th key={header.key} className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">{header.label}</th>)}</tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {sellers.length === 0 ? (
                  <tr><td colSpan={headers.length} className="px-6 py-20 text-center text-slate-500">No sellers match your search</td></tr>
                ) : sellers.map((seller) => (
                  <tr key={seller.sl} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-700">{seller.sl}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {seller.icon ? (
                            <img src={seller.icon} alt={seller.sellerName} className="w-full h-full object-cover" onError={(e) => { e.target.src = getPlaceholderImage({ width: 32, height: 32, text: "Sell" }) }} />
                          ) : (
                            <div className="w-full h-full bg-slate-300 flex items-center justify-center text-xs text-slate-600 font-semibold">{seller.sellerName.charAt(0).toUpperCase()}</div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{seller.sellerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{seller.totalProducts}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{seller.totalOrder}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{seller.totalOrderAmount}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{seller.totalDiscountGiven}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{seller.totalAdminCommission}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{seller.totalVATTAX}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm text-slate-700">{Number(seller.averageRatings || 0).toFixed(1)} ({Number(seller.reviews || 0)})</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
