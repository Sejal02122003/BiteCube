import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowRight, Calendar, Download, FileText, Loader2, Wallet, X } from "lucide-react"
import { sellerAPI } from "@/services/api"
import { toast } from "sonner"

export default function SellerFinancePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => (searchParams.get("tab") === "invoices" ? "invoices" : "payouts"))
  const [selectedDateRange, setSelectedDateRange] = useState("Last 30 days")
  const [financeData, setFinanceData] = useState(null)
  const [pastCyclesData, setPastCyclesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingPastCycles, setLoadingPastCycles] = useState(false)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState("")
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false)
  const [withdrawalRequests, setWithdrawalRequests] = useState([])
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadMenuRef = useRef(null)

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setLoading(true)
        const response = await sellerAPI.getFinance()
        if (response?.data?.success && response?.data?.data) {
          setFinanceData(response.data.data)
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to fetch seller finance")
      } finally {
        setLoading(false)
      }
    }

    fetchFinanceData()
  }, [])

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        setLoadingWithdrawals(true)
        const response = await sellerAPI.getWithdrawalHistory()
        const payload = response?.data?.data
        const list = Array.isArray(payload) ? payload : Array.isArray(payload?.withdrawals) ? payload.withdrawals : []
        setWithdrawalRequests(list)
      } catch (error) {
        setWithdrawalRequests([])
      } finally {
        setLoadingWithdrawals(false)
      }
    }

    fetchWithdrawals()
  }, [])

  useEffect(() => {
    const onClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const parseDateRange = (dateRangeStr) => {
    const today = new Date()
    if (dateRangeStr === "Last 7 days") {
      const start = new Date()
      start.setDate(today.getDate() - 7)
      return { startDate: start.toISOString(), endDate: today.toISOString() }
    }
    if (dateRangeStr === "Last 30 days" || dateRangeStr === "Last 1 month") {
      const start = new Date()
      start.setDate(today.getDate() - 30)
      return { startDate: start.toISOString(), endDate: today.toISOString() }
    }
    if (dateRangeStr === "This month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { startDate: start.toISOString(), endDate: today.toISOString() }
    }
    return null
  }

  useEffect(() => {
    const fetchPastCyclesData = async () => {
      const dateRange = parseDateRange(selectedDateRange)
      if (!dateRange?.startDate || !dateRange?.endDate) {
        setPastCyclesData(null)
        return
      }

      try {
        setLoadingPastCycles(true)
        const response = await sellerAPI.getFinance({
          startDate: dateRange.startDate.split("T")[0],
          endDate: dateRange.endDate.split("T")[0],
        })
        if (response?.data?.success && response?.data?.data?.pastCycles) {
          setPastCyclesData(response.data.data.pastCycles)
        } else {
          setPastCyclesData(null)
        }
      } catch (_) {
        setPastCyclesData(null)
      } finally {
        setLoadingPastCycles(false)
      }
    }

    fetchPastCyclesData()
  }, [selectedDateRange])

  const sellerData = financeData?.seller || {}
  const currentCycle = financeData?.currentCycle || {}

  const invoiceOrders = useMemo(() => {
    const allOrdersMap = new Map()
    ;(currentCycle.orders || []).forEach((order) => {
      const id = order.orderId || order._id
      if (id) allOrdersMap.set(id, order)
    })
    ;(pastCyclesData?.orders || []).forEach((order) => {
      const id = order.orderId || order._id
      if (id && !allOrdersMap.has(id)) allOrdersMap.set(id, order)
    })
    return Array.from(allOrdersMap.values())
  }, [currentCycle.orders, pastCyclesData])

  const invoiceSummary = useMemo(() => {
    const earnings = invoiceOrders.reduce((sum, order) => sum + Number(order.payout || 0), 0)
    const commission = invoiceOrders.reduce((sum, order) => sum + Number(order.commission || 0), 0)
    const gross = invoiceOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
    return { earnings, commission, gross, count: invoiceOrders.length }
  }, [invoiceOrders])

  const formatCurrency = (amount) =>
    `Rs. ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "N/A"
    const date = new Date(dateValue)
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

  const handleDownload = (format) => {
    const rows = invoiceOrders.map((order) => ({
      orderId: order.orderId,
      createdAt: formatDateTime(order.createdAt),
      totalAmount: Number(order.totalAmount || 0),
      payout: Number(order.payout || 0),
      commission: Number(order.commission || 0),
      paymentMethod: order.paymentMethod || "",
    }))

    if (format === "json") {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "seller-finance-report.json"
      link.click()
      URL.revokeObjectURL(url)
      return
    }

    const csvRows = [
      ["Order ID", "Date", "Total Amount", "Payout", "Commission", "Payment Method"],
      ...rows.map((row) => [row.orderId, row.createdAt, row.totalAmount, row.payout, row.commission, row.paymentMethod]),
    ]
    const csvContent = csvRows.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "seller-finance-report.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const submitWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount)
    if (!amount || amount <= 0) {
      toast.error("Enter a valid withdrawal amount")
      return
    }

    try {
      setSubmittingWithdrawal(true)
      const response = await sellerAPI.submitWithdrawalRequest({
        amount,
        bankDetails: {
          accountNumber: sellerData.accountNumber || "",
          ifscCode: sellerData.ifscCode || "",
          accountHolderName: sellerData.accountHolderName || "",
          upiId: sellerData.upiId || "",
        },
      })

      toast.success(response?.data?.message || "Withdrawal request submitted successfully")
      setShowWithdrawalModal(false)
      setWithdrawalAmount("")

      const [financeResponse, withdrawalResponse] = await Promise.all([
        sellerAPI.getFinance(),
        sellerAPI.getWithdrawalHistory(),
      ])

      if (financeResponse?.data?.success) setFinanceData(financeResponse.data.data)
      const withdrawalPayload = withdrawalResponse?.data?.data
      setWithdrawalRequests(Array.isArray(withdrawalPayload) ? withdrawalPayload : Array.isArray(withdrawalPayload?.withdrawals) ? withdrawalPayload.withdrawals : [])
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit withdrawal request")
    } finally {
      setSubmittingWithdrawal(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Seller Finance</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight font-['Outfit']">{sellerData.name || "Finance Hub"}</h1>
            <p className="mt-4 max-w-2xl text-sm text-white/80">
              Manage seller payouts, wallet balance, invoices, and withdrawal requests from one place.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPill label="Seller ID" value={sellerData.sellerId || "N/A"} />
            <MetricPill label="Available" value={formatCurrency(currentCycle.estimatedPayout)} />
            <MetricPill label="Orders" value={String(currentCycle.totalOrders || 0)} />
          </div>
        </div>
      </section>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("payouts")}
              className={`rounded-2xl px-5 py-2 text-sm font-semibold ${activeTab === "payouts" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              Payouts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={`rounded-2xl px-5 py-2 text-sm font-semibold ${activeTab === "invoices" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              Invoices
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4" />
              <select value={selectedDateRange} onChange={(e) => setSelectedDateRange(e.target.value)} className="bg-transparent outline-none">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>This month</option>
              </select>
            </div>
            <div className="relative" ref={downloadMenuRef}>
              <button
                type="button"
                onClick={() => setShowDownloadMenu((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              {showDownloadMenu ? (
                <div className="absolute right-0 z-20 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                  <button type="button" onClick={() => handleDownload("csv")} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">CSV</button>
                  <button type="button" onClick={() => handleDownload("json")} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">JSON</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-900" />
          </div>
        ) : activeTab === "payouts" ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <FinanceCard title="Estimated Payout" value={formatCurrency(currentCycle.estimatedPayout)} note="Available balance after pending withdrawals" />
              <FinanceCard title="Current Cycle Earnings" value={formatCurrency(currentCycle.totalEarnings)} note={`${currentCycle.start?.day || "15"} - ${currentCycle.end?.day || "today"} cycle`} />
              <FinanceCard title="Wallet Balance" value={formatCurrency(financeData?.wallet?.balance)} note={`Locked: ${formatCurrency(financeData?.wallet?.lockedAmount)}`} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current payout cycle</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900 font-['Outfit']">
                      {formatCurrency(currentCycle.estimatedPayout)}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">{currentCycle.totalOrders || 0} delivered seller orders in this cycle.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWithdrawalModal(true)}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Withdraw
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Withdrawal Requests</p>
                    <p className="text-xs text-slate-500">Recent seller withdrawal activity</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/quick/seller/withdrawal-history")}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
                  >
                    View All
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {loadingWithdrawals ? (
                    <div className="py-6 text-center text-sm text-slate-500">Loading withdrawal requests...</div>
                  ) : withdrawalRequests.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">No withdrawal requests found.</div>
                  ) : (
                    withdrawalRequests.slice(0, 6).map((request) => (
                      <div key={request._id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{formatCurrency(request.amount)}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(request.createdAt)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          request.status === "approved" || request.status === "processed"
                            ? "bg-emerald-100 text-emerald-700"
                            : request.status === "rejected"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                        }`}>
                          {request.status || "pending"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <FinanceCard title="Invoice Orders" value={String(invoiceSummary.count || 0)} note="Delivered seller orders" />
              <FinanceCard title="Gross" value={formatCurrency(invoiceSummary.gross)} note="Customer paid total" />
              <FinanceCard title="Commission" value={formatCurrency(invoiceSummary.commission)} note="Platform commission" />
              <FinanceCard title="Earnings" value={formatCurrency(invoiceSummary.earnings)} note="Seller payout total" />
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-black text-slate-900 font-['Outfit']">Invoice Orders</h3>
                <p className="text-sm text-slate-500">Downloaded and filtered using seller finance date range.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Order ID</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Date</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Gross</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Payout</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Commission</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingPastCycles ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500">Loading invoice data...</td>
                      </tr>
                    ) : invoiceOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500">No invoice orders found.</td>
                      </tr>
                    ) : (
                      invoiceOrders.map((order) => (
                        <tr key={order.orderId}>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">{order.orderId}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{formatDateTime(order.createdAt)}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{formatCurrency(order.totalAmount)}</td>
                          <td className="px-5 py-4 text-sm text-slate-900">{formatCurrency(order.payout)}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{formatCurrency(order.commission)}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">{order.paymentMethod || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {showWithdrawalModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 font-['Outfit']">Withdraw Balance</h3>
                <p className="mt-1 text-sm text-slate-500">Available: {formatCurrency(currentCycle.estimatedPayout)}</p>
              </div>
              <button type="button" onClick={() => setShowWithdrawalModal(false)} className="rounded-full p-2 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-900">Account Holder:</span> {sellerData.accountHolderName || "Not added"}</p>
                <p className="mt-1"><span className="font-semibold text-slate-900">Account Number:</span> {sellerData.accountNumber || "Not added"}</p>
                <p className="mt-1"><span className="font-semibold text-slate-900">IFSC:</span> {sellerData.ifscCode || "Not added"}</p>
                <p className="mt-1"><span className="font-semibold text-slate-900">UPI:</span> {sellerData.upiId || "Not added"}</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Withdrawal Amount</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowWithdrawalModal(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={submitWithdrawal}
                disabled={submittingWithdrawal || !withdrawalAmount || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > Number(currentCycle.estimatedPayout || 0)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submittingWithdrawal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FinanceCard({ title, value, note }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black text-slate-900 font-['Outfit']">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </div>
  )
}

function MetricPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-2 text-lg font-black text-white font-['Outfit']">{value}</p>
    </div>
  )
}
