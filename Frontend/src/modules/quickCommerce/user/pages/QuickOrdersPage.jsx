import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchMyQuickOrders } from "../services/orderService";

const label = (status) => ({ created: "Order placed", confirmed: "Accepted", packing: "Packing", ready_for_pickup: "Ready for pickup", reached_pickup: "Rider at seller", picked_up: "Out for delivery", reached_drop: "Rider nearby", delivered: "Delivered", cancelled_by_user: "Cancelled", cancelled_by_seller: "Cancelled by seller" }[status] || String(status || "").replaceAll("_", " "));

export default function QuickOrdersPage() {
  const navigate = useNavigate(); const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { fetchMyQuickOrders().then((res) => setOrders(res?.data?.orders || [])).catch(() => setOrders([])).finally(() => setLoading(false)); }, []);
  return <div className="min-h-screen bg-emerald-50/40 p-4"><div className="mx-auto max-w-3xl"><header className="mb-5 flex items-center gap-4"><button onClick={() => navigate("/food/user", { replace: true })}><ArrowLeft /></button><h1 className="text-2xl font-bold">Your Quick orders</h1></header>{loading ? <Loader2 className="mx-auto mt-24 animate-spin text-emerald-600" /> : !orders.length ? <div className="rounded-3xl bg-white p-12 text-center"><Package className="mx-auto h-12 w-12 text-emerald-500" /><p className="mt-4 font-semibold">No Quick orders yet</p></div> : <div className="space-y-3">{orders.map((order) => <button key={order._id} onClick={() => navigate(`/quick/orders/${order._id}`)} className="w-full rounded-3xl border border-emerald-100 bg-white p-5 text-left shadow-sm"><div className="flex justify-between gap-3"><div><p className="font-bold">{order.sellerId?.storeName || "Quick seller"}</p><p className="mt-1 text-xs text-slate-500">#{order.order_id || order.orderId}</p></div><span className="h-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700">{label(order.orderStatus)}</span></div><div className="mt-4 flex justify-between text-sm"><span>{order.items?.length || 0} products</span><span className="font-bold">₹{Number(order.pricing?.total || 0).toFixed(0)}</span></div></button>)}</div>}</div></div>;
}
