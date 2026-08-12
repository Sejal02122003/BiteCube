import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, CreditCard, Download, Loader2, ReceiptIndianRupee, Wallet } from "lucide-react"
import { sellerAPI } from "@/services/api"
import { toast } from "sonner"

const formatCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

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

export default function SellerFinanceDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [financeData, setFinanceData] = useState(() => location.state?.financeData || null)
  const [loading, setLoading] = useState(() => !location.state?.financeData)

  useEffect(() => {
    if (financeData) return

    let cancelled = false

    const loadFinance = async () => {
      try {
        setLoading(true)
        const response = await sellerAPI.getFinance()
        if (!cancelled && response?.data?.success && response?.data?.data) {
          setFinanceData(response.data.data)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.response?.data?.message || "Failed to load finance details")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadFinance()
    return () => {
      cancelled = true
    }
  }, [financeData])

  const seller = financeData?.seller || {}
  const currentCycle = financeData?.currentCycle || {}
  const wallet = financeData?.wallet || {}
  const invoiceSummary = financeData?.invoiceSummary || {}
  const orders = currentCycle?.orders || []

  const summaryRows = useMemo(
    () => [
      { label: "Delivered Orders", value: String(currentCycle.totalOrders || 0) },
      { label: "Subtotal", value: formatCurrency(invoiceSummary.subtotal) },
      { label: "Taxes", value: formatCurrency(invoiceSummary.taxes) },
      { label: "Gross Collection", value: formatCurrency(invoiceSummary.gross) },
      { label: "Current Cycle Earnings", value: formatCurrency(currentCycle.totalEarnings) },
      { label: "Estimated Payout", value: formatCurrency(currentCycle.estimatedPayout) },
    ],
    [currentCycle, invoiceSummary]
  )

  const handleDownload = () => {
    const payload = {
      seller,
      wallet,
      currentCycle,
      invoiceSummary,
      orders,
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "seller-finance-details.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-900" />
          <p className="mt-3 text-sm text-slate-500">Loading seller finance details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/quick/seller/finance")}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Finance
            </button>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-white/60">Finance Details</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight font-['Outfit']">{seller.name || "Seller Finance"}</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/80">
              Detailed seller payout breakdown, invoice totals, and delivered order level finance view.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <DetailCard icon={ReceiptIndianRupee} title="Cycle Earnings" value={formatCurrency(currentCycle.totalEarnings)} helper={`${currentCycle.start?.day || "15"} - ${currentCycle.end?.day || "Today"} cycle`} />
        <DetailCard icon={Wallet} title="Available Balance" value={formatCurrency(wallet.balance)} helper={`Locked: ${formatCurrency(wallet.lockedAmount)}`} />
        <DetailCard icon={CreditCard} title="Settled Amount" value={formatCurrency(wallet.totalSettled)} helper={`Lifetime: ${formatCurrency(wallet.totalEarnings)}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-black text-slate-900 font-['Outfit']">Seller Snapshot</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <InfoRow label="Seller ID" value={seller.sellerId || "N/A"} />
            <InfoRow label="Address" value={seller.address || "Not available"} />
            <InfoRow label="Account Holder" value={seller.accountHolderName || "Not added"} />
            <InfoRow label="Account Number" value={seller.accountNumber || "Not added"} />
            <InfoRow label="IFSC Code" value={seller.ifscCode || "Not added"} />
            <InfoRow label="UPI ID" value={seller.upiId || "Not added"} />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-black text-slate-900 font-['Outfit']">Settlement Summary</h2>
          <div className="mt-5 space-y-3">
            {summaryRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">{row.label}</span>
                <span className="text-sm font-semibold text-slate-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-black text-slate-900 font-['Outfit']">Delivered Order Breakdown</h2>
          <p className="mt-1 text-sm text-slate-500">Seller-only delivered orders used for current cycle finance.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Order ID</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Items</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Gross</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Commission</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">No delivered seller orders found for this cycle.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.orderId}>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{order.orderId || "-"}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{formatDateTime(order.createdAt)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{order.foodNames || "-"}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{formatCurrency(order.commission)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(order.payout)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function DetailCard({ icon: Icon, title, value, helper }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black text-slate-900 font-['Outfit']">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}
