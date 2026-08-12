import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, MapPin, Package2, Phone, Search, ShoppingBag, Truck, XCircle } from "lucide-react";
import RestaurantBentoGrid from "@food/components/restaurant/RestaurantBentoGrid";
import RestaurantOrdersPagination from "@food/components/restaurant/RestaurantOrdersPagination";
import { cn } from "@food/utils/utils";
import { acceptOrder, fetchOrderById, fetchOrders, markOrderReady, rejectOrder } from "../services/orderService";

const tabs = [
  { id: "new", label: "New" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
];

const statusConfig = {
  created: { label: "New", tone: "amber", icon: AlertCircle },
  confirmed: { label: "Confirmed", tone: "amber", icon: AlertCircle },
  preparing: { label: "Preparing", tone: "blue", icon: Clock3 },
  ready_for_pickup: { label: "Ready", tone: "emerald", icon: CheckCircle2 },
  reached_pickup: { label: "At Pickup", tone: "emerald", icon: CheckCircle2 },
  picked_up: { label: "Out for Delivery", tone: "violet", icon: Truck },
  reached_drop: { label: "Reaching Customer", tone: "violet", icon: Truck },
  delivered: { label: "Delivered", tone: "slate", icon: Package2 },
  cancelled_by_user: { label: "Cancelled", tone: "rose", icon: XCircle },
  cancelled_by_restaurant: { label: "Cancelled", tone: "rose", icon: XCircle },
  cancelled_by_admin: { label: "Cancelled", tone: "rose", icon: XCircle },
  dead: { label: "Dead", tone: "slate", icon: XCircle },
};

const toneClasses = {
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};

const formatMoney = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return "NA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "NA";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCustomerName = (order) =>
  order?.customer?.name ||
  order?.customerName ||
  order?.deliveryAddress?.fullName ||
  order?.deliveryAddress?.name ||
  "Customer";

const getCustomerPhone = (order) =>
  order?.customer?.phone ||
  order?.customerPhone ||
  order?.deliveryAddress?.phone ||
  "";

const getAddressText = (order) => {
  const address = order?.deliveryAddress || {};
  return [
    address.street,
    address.additionalDetails,
    address.city,
    address.state,
    address.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
};

function OrderDetailDrawer({ order, loading, onClose, onAccept, onReject, onReady, actionLoading }) {
  if (!order && !loading) return null;

  const status = statusConfig[order?.orderStatus] || statusConfig.created;
  const StatusIcon = status.icon;
  const items = Array.isArray(order?.items) ? order.items : [];
  const canAccept = ["created", "confirmed"].includes(order?.orderStatus);
  const canReady = order?.orderStatus === "preparing";
  const canReject = ["created", "confirmed", "preparing"].includes(order?.orderStatus);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Seller Order</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">#{order?.order_id || order?.orderId || order?._id}</h2>
            </div>
            <button onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="space-y-6 px-6 py-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", toneClasses[status.tone])}>
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
              <span className="text-sm text-slate-500">{formatDateTime(order?.createdAt)}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Customer</p>
                <p className="mt-3 text-base font-semibold text-slate-900">{getCustomerName(order)}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4" />{getCustomerPhone(order) || "No phone"}</p>
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4" /><span>{getAddressText(order) || "Address not available"}</span></p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Payment</p>
                <p className="mt-3 text-base font-semibold text-slate-900">{formatMoney(order?.pricing?.total)}</p>
                <p className="mt-2 text-sm capitalize text-slate-600">Method: {order?.payment?.method || "NA"}</p>
                <p className="mt-1 text-sm capitalize text-slate-600">Payment status: {order?.payment?.status || "NA"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Items</h3>
              </div>
              <div className="divide-y divide-slate-200">
                {items.map((item, index) => (
                  <div key={`${item.itemId || item.name}-${index}`} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.quantity} x {item.name}</p>
                      {item.variantName ? <p className="mt-1 text-xs text-slate-500">{item.variantName}</p> : null}
                      {item.notes ? <p className="mt-1 text-xs text-slate-500">Note: {item.notes}</p> : null}
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{formatMoney((item.price || item.variantPrice || 0) * (item.quantity || 1))}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Actions</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {canAccept ? (
                  <button
                    onClick={onAccept}
                    disabled={actionLoading}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Accept Order
                  </button>
                ) : null}
                {canReady ? (
                  <button
                    onClick={onReady}
                    disabled={actionLoading}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Mark Ready
                  </button>
                ) : null}
                {canReject ? (
                  <button
                    onClick={onReject}
                    disabled={actionLoading}
                    className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
                  >
                    Reject Order
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SellerOrdersPage() {
  const [activeTab, setActiveTab] = useState("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 30, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showNotification = (message, type = "success") => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadOrders = useCallback(async (targetPage = 1) => {
    try {
      setLoading(true);
      const res = await fetchOrders({
        page: targetPage,
        status: activeTab,
        search: debouncedSearch,
      });
      const payload = res?.data || {};
      setOrders(Array.isArray(payload.orders) ? payload.orders : []);
      setMeta(payload.meta || { total: 0, page: targetPage, limit: 30, totalPages: 1 });
    } catch (error) {
      console.error("Error fetching seller orders:", error);
      setOrders([]);
      showNotification(error.response?.data?.message || error.message || "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    loadOrders(page);
  }, [page, loadOrders]);

  const summary = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        const total = Number(order?.pricing?.total || 0);
        acc.totalOrders += 1;
        acc.totalRevenue += total;
        if (["created", "confirmed"].includes(order?.orderStatus)) acc.newOrders += 1;
        if (order?.orderStatus === "preparing") acc.preparing += 1;
        if (["ready_for_pickup", "reached_pickup"].includes(order?.orderStatus)) acc.ready += 1;
        return acc;
      },
      { totalOrders: 0, totalRevenue: 0, newOrders: 0, preparing: 0, ready: 0 }
    );
  }, [orders]);

  const openOrder = async (order) => {
    try {
      setDetailLoading(true);
      setSelectedOrder(order);
      const res = await fetchOrderById(order._id || order.order_id || order.orderId);
      setSelectedOrder(res?.data || order);
    } catch (error) {
      console.error("Error fetching seller order details:", error);
      showNotification(error.response?.data?.message || error.message || "Failed to load order details", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const runOrderAction = async (action) => {
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      await action(selectedOrder._id || selectedOrder.order_id || selectedOrder.orderId);
      await loadOrders(page);
      const refreshed = await fetchOrderById(selectedOrder._id || selectedOrder.order_id || selectedOrder.orderId);
      setSelectedOrder(refreshed?.data || selectedOrder);
      showNotification("Order updated successfully");
    } catch (error) {
      console.error("Error updating seller order:", error);
      showNotification(error.response?.data?.message || error.message || "Failed to update order", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 px-4 py-6 text-slate-900">
      {toastMsg ? (
        <div className={cn("fixed right-5 top-5 z-50 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-xl", toastMsg.type === "error" ? "border-rose-700 bg-rose-900 text-white" : "border-slate-700 bg-slate-900 text-white")}>
          {toastMsg.message}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Quick Commerce</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Seller Orders</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Manage incoming quick-commerce orders with the same fast queue-style experience as the restaurant panel.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Orders</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.totalOrders}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(summary.totalRevenue)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ready Queue</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.ready}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  activeTab === tab.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by order id, customer, phone"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <ShoppingBag className="h-10 w-10 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No orders found</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">This seller queue is empty for the selected tab right now.</p>
            </div>
          ) : (
            <>
              <RestaurantBentoGrid variant="orders">
                {orders.map((order) => {
                  const status = statusConfig[order.orderStatus] || statusConfig.created;
                  const StatusIcon = status.icon;
                  const itemSummary = Array.isArray(order.items)
                    ? order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")
                    : "No items";

                  return (
                    <button
                      type="button"
                      key={order._id || order.order_id || order.orderId}
                      onClick={() => openOrder(order)}
                      className="restaurant-bento-card h-full w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">#{order.order_id || order.orderId || order._id}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">{getCustomerName(order)}</p>
                        </div>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", toneClasses[status.tone])}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <p className="line-clamp-2">{itemSummary}</p>
                        <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-slate-400" />{formatDateTime(order.createdAt)}</p>
                        <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-slate-400" /><span className="line-clamp-2">{getAddressText(order) || "Address not available"}</span></p>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Total</p>
                          <p className="mt-1 text-base font-semibold text-slate-900">{formatMoney(order.pricing?.total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Payment</p>
                          <p className="mt-1 text-sm font-medium capitalize text-slate-700">{order.payment?.method || "NA"}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </RestaurantBentoGrid>

              <RestaurantOrdersPagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                limit={meta.limit}
                onPageChange={setPage}
                className="mt-6"
              />
            </>
          )}
        </div>
      </section>

      {selectedOrder ? (
        <OrderDetailDrawer
          order={selectedOrder}
          loading={detailLoading}
          onClose={() => setSelectedOrder(null)}
          actionLoading={actionLoading}
          onAccept={() => runOrderAction(acceptOrder)}
          onReject={() => {
            const reason = window.prompt("Reason for rejection?", "Rejected by seller") || "Rejected by seller";
            runOrderAction((orderId) => rejectOrder(orderId, reason));
          }}
          onReady={() => runOrderAction(markOrderReady)}
        />
      ) : null}
    </div>
  );
}
