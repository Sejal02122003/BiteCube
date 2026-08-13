import { useEffect, useMemo, useState } from "react"
import { Bell, RefreshCw, X } from "lucide-react"
import useNotificationInbox from "@food/hooks/useNotificationInbox"
import { fetchOrders } from "../services/orderService"

const DISMISSED_KEY = "quick_seller_dismissed_notifications"

const getStatusLabel = (status = "") => {
  const normalized = String(status).toLowerCase()
  if (normalized === "created" || normalized === "confirmed") return "New seller order received"
  if (normalized === "packing" || normalized === "preparing") return "Seller is packing the order"
  if (normalized === "ready_for_pickup" || normalized === "reached_pickup") return "Seller order is ready"
  if (normalized === "picked_up" || normalized === "reached_drop") return "Seller order out for delivery"
  if (normalized === "delivered") return "Seller order delivered"
  if (normalized.includes("cancel")) return "Seller order cancelled"
  return "Seller order update"
}

export default function SellerNotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(DISMISSED_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const {
    items: broadcastNotifications,
    loading: broadcastLoading,
    markAsRead: markBroadcastAsRead,
    dismiss: dismissBroadcastNotification,
    dismissAll: dismissAllBroadcastNotifications,
    refresh: refreshBroadcastNotifications,
  } = useNotificationInbox("restaurant", { limit: 100, pollMs: 5 * 60 * 1000 })

  const fetchSellerNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetchOrders({ page: 1, limit: 50 })
      const rows = response?.data?.orders || response?.orders || []
      setOrders(Array.isArray(rows) ? rows : [])
    } catch (_) {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSellerNotifications()
  }, [])

  useEffect(() => {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedIds))
  }, [dismissedIds])

  const notifications = useMemo(() => {
    const orderNotifications = (orders || [])
      .map((order) => {
        const id = order._id || order.orderId
        const timestamp = order.updatedAt || order.createdAt
        return {
          id,
          orderId: order.order_id || order.orderId || "N/A",
          message: getStatusLabel(order.orderStatus || order.status),
          source: "order",
          timeValue: timestamp ? new Date(timestamp).getTime() : 0,
          time: timestamp
            ? new Date(timestamp).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "N/A",
        }
      })
      .filter((item) => item.id && !dismissedIds.includes(item.id))

    const broadcastRows = (broadcastNotifications || []).map((item) => ({
      id: item.id,
      message: item.title || "Broadcast notification",
      detail: item.message || "",
      source: "broadcast",
      read: item.read,
      timeValue: item.createdAt ? new Date(item.createdAt).getTime() : 0,
      time: item.createdAt
        ? new Date(item.createdAt).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "N/A",
    }))

    return [...broadcastRows, ...orderNotifications].sort((a, b) => b.timeValue - a.timeValue)
  }, [broadcastNotifications, dismissedIds, orders])

  const removeNotification = (id, source = "order") => {
    if (source === "broadcast") {
      dismissBroadcastNotification(id)
      return
    }
    setDismissedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const clearAll = () => {
    dismissAllBroadcastNotifications()
    const ids = notifications
      .filter((item) => item.source !== "broadcast")
      .map((item) => item.id)
      .filter(Boolean)
    setDismissedIds((prev) => [...new Set([...prev, ...ids])])
  }

  const handleRefresh = async () => {
    await Promise.all([fetchSellerNotifications(), refreshBroadcastNotifications()])
  }

  return (
    <div className="min-h-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Support</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900 font-['Outfit']">Notifications</h1>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        {!loading && notifications.length > 0 ? (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              Clear all
            </button>
          </div>
        ) : null}

        {loading || broadcastLoading ? (
          <div className="py-16 text-center text-sm text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-900">No notifications</p>
            <p className="mt-1 text-sm text-slate-500">Seller order updates and broadcasts will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => item.source === "broadcast" ? markBroadcastAsRead(item.id) : undefined}
                className={`flex items-start justify-between gap-3 rounded-2xl border p-4 ${
                  item.source === "broadcast" && !item.read
                    ? "cursor-pointer border-blue-200 bg-blue-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {item.source === "broadcast" ? <Bell className="h-4 w-4 text-blue-600" /> : null}
                    <p className="text-sm font-semibold text-slate-900">{item.message}</p>
                  </div>
                  {item.source === "broadcast" ? (
                    <p className="mt-1 text-xs text-slate-600">{item.detail || "Admin notification"}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-600">Order: {item.orderId}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">{item.time}</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    removeNotification(item.id, item.source)
                  }}
                  className="rounded-full p-1.5 hover:bg-slate-100"
                  aria-label="Remove notification"
                >
                  <X className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
