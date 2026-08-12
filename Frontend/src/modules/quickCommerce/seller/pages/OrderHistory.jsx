import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Loader2, PackageCheck, Search, ShoppingBag, XCircle } from "lucide-react"
import { fetchOrders } from "../services/orderService"

const historyFilters = [
  { id: "all", label: "All History" },
  { id: "completed", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
]

const formatMoney = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDateTime = (value) => {
  if (!value) return "NA"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "NA"
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

const getCustomerName = (order) =>
  order?.customer?.name ||
  order?.customerName ||
  order?.deliveryAddress?.fullName ||
  order?.deliveryAddress?.name ||
  "Customer"

const getItemsText = (order) => {
  const items = Array.isArray(order?.items) ? order.items : []
  return items.map((item) => `${item?.quantity || 1}x ${item?.name || "Item"}`).join(", ")
}

const getHistoryStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "delivered") return "bg-emerald-100 text-emerald-700"
  if (normalized.includes("cancel")) return "bg-rose-100 text-rose-700"
  return "bg-slate-100 text-slate-700"
}

export default function SellerOrderHistoryPage() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    let cancelled = false

    const loadHistory = async () => {
      try {
        setLoading(true)
        const status = activeFilter === "all" ? "all" : activeFilter
        const response = await fetchOrders({
          status,
          search: debouncedSearch || undefined,
          page: 1,
          limit: 100,
        })

        const payload =
          response?.data?.orders ||
          response?.orders ||
          []

        if (!cancelled) {
          setOrders(Array.isArray(payload) ? payload : [])
        }
      } catch (_) {
        if (!cancelled) {
          setOrders([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [activeFilter, debouncedSearch])

  const stats = useMemo(() => {
    const delivered = orders.filter((order) => String(order?.orderStatus || "").toLowerCase() === "delivered").length
    const cancelled = orders.filter((order) => String(order?.orderStatus || "").toLowerCase().includes("cancelled")).length
    const totalAmount = orders.reduce((sum, order) => sum + Number(order?.pricing?.total || order?.total || 0), 0)

    return {
      delivered,
      cancelled,
      total: orders.length,
      totalAmount,
    }
  }, [orders])

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Order History</p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight font-['Outfit']">Past Seller Orders</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/80">
              Browse completed and cancelled seller orders separately from the live order management screen.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HistoryPill label="Delivered" value={String(stats.delivered)} />
            <HistoryPill label="Cancelled" value={String(stats.cancelled)} />
            <HistoryPill label="Amount" value={formatMoney(stats.totalAmount)} />
          </div>
        </div>
      </section>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {historyFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeFilter === filter.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by order id or customer"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard icon={PackageCheck} label="Delivered Orders" value={String(stats.delivered)} />
          <StatCard icon={XCircle} label="Cancelled Orders" value={String(stats.cancelled)} />
          <StatCard icon={ShoppingBag} label="History Orders" value={String(stats.total)} />
        </div>

        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <h2 className="text-lg font-black text-slate-900 font-['Outfit']">Seller Order Timeline</h2>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : orders.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-900">No order history found</p>
                <p className="mt-1 text-sm text-slate-500">Try another status filter or search term.</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order?._id || order?.order_id || order?.orderId} className="px-5 py-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-base font-bold text-slate-900">
                          #{order?.order_id || order?.orderId || order?._id}
                        </p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getHistoryStatusTone(order?.orderStatus)}`}>
                          {String(order?.orderStatus || "unknown").replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{getCustomerName(order)}</p>
                      <p className="mt-1 text-sm text-slate-500">{getItemsText(order) || "Items not available"}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
                      <HistoryInfo label="Date" value={formatDateTime(order?.createdAt)} />
                      <HistoryInfo label="Amount" value={formatMoney(order?.pricing?.total || order?.total)} />
                      <HistoryInfo label="Payment" value={String(order?.payment?.method || order?.paymentMethod || "NA").toUpperCase()} />
                      <HistoryInfo label="Phone" value={order?.customer?.phone || order?.customerPhone || order?.deliveryAddress?.phone || "NA"} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-900 font-['Outfit']">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function HistoryInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

function HistoryPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-2 text-lg font-black text-white font-['Outfit']">{value}</p>
    </div>
  )
}
