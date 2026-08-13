import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  BarChart3,
  Loader2,
  ShoppingBasket,
  UtensilsCrossed,
  Wallet,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { adminAPI } from "@food/api"

const INR_SYMBOL = "\u20B9"

function formatCurrency(amount) {
  return `${INR_SYMBOL}${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function mergeMonthlySeries(food = [], quick = []) {
  const map = new Map()
  ;[...food, ...quick].forEach((item) => {
    const month = item?.month || "N/A"
    const current = map.get(month) || {
      month,
      foodRevenue: 0,
      quickRevenue: 0,
      combinedRevenue: 0,
      foodOrders: 0,
      quickOrders: 0,
      combinedOrders: 0,
    }

    if (food.includes(item)) {
      current.foodRevenue += Number(item.revenue || 0)
      current.foodOrders += Number(item.orders || 0)
    } else {
      current.quickRevenue += Number(item.revenue || 0)
      current.quickOrders += Number(item.orders || 0)
    }

    current.combinedRevenue = current.foodRevenue + current.quickRevenue
    current.combinedOrders = current.foodOrders + current.quickOrders
    map.set(month, current)
  })

  return Array.from(map.values())
}

export default function GlobalHub() {
  const [loading, setLoading] = useState(true)
  const [foodData, setFoodData] = useState(null)
  const [quickData, setQuickData] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadStats = async () => {
      try {
        setLoading(true)
        const [foodRes, quickRes] = await Promise.all([
          adminAPI.getDashboardStats({ period: "today" }),
          adminAPI.getQuickDashboardStats({ period: "today" }),
        ])

        if (!cancelled) {
          setFoodData(foodRes?.data?.data || null)
          setQuickData(quickRes?.data?.data || null)
        }
      } catch (_) {
        if (!cancelled) {
          setFoodData(null)
          setQuickData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadStats()
    return () => {
      cancelled = true
    }
  }, [])

  const foodOrdersToday = Number(foodData?.orders?.total || 0)
  const quickOrdersToday = Number(quickData?.orders?.total || 0)
  const totalOrdersToday = foodOrdersToday + quickOrdersToday
  const combinedRevenueToday = Number(foodData?.revenue?.total || 0) + Number(quickData?.revenue?.total || 0)

  const moduleMix = useMemo(
    () => [
      { name: "Food Orders", value: foodOrdersToday, fill: "#f97316" },
      { name: "Quick Orders", value: quickOrdersToday, fill: "#10b981" },
    ],
    [foodOrdersToday, quickOrdersToday]
  )

  const statusComparison = useMemo(
    () => [
      {
        name: "Pending",
        food: Number(foodData?.orders?.byStatus?.pending || 0),
        quick: Number(quickData?.orders?.byStatus?.pending || 0),
      },
      {
        name: "Delivered",
        food: Number(foodData?.orders?.byStatus?.delivered || 0),
        quick: Number(quickData?.orders?.byStatus?.delivered || 0),
      },
      {
        name: "Cancelled",
        food: Number(foodData?.orders?.byStatus?.cancelled || 0),
        quick: Number(quickData?.orders?.byStatus?.cancelled || 0),
      },
    ],
    [foodData, quickData]
  )

  const monthlyTrend = useMemo(
    () => mergeMonthlySeries(foodData?.monthlyData || [], quickData?.monthlyData || []),
    [foodData, quickData]
  )

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {loading ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-900" />
            <p className="mt-4 text-sm text-slate-500">Loading combined dashboard stats...</p>
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Total Orders Today" value={totalOrdersToday.toLocaleString("en-IN")} helper="Food + Quick combined" icon={Activity} tone="bg-sky-100 text-sky-700" />
              <MetricCard title="Quick Orders Today" value={quickOrdersToday.toLocaleString("en-IN")} helper="Quick-commerce orders today" icon={ShoppingBasket} tone="bg-emerald-100 text-emerald-700" />
              <MetricCard title="Food Orders Today" value={foodOrdersToday.toLocaleString("en-IN")} helper="Food orders today" icon={UtensilsCrossed} tone="bg-orange-100 text-orange-700" />
              <MetricCard title="Combined Revenue Today" value={formatCurrency(combinedRevenueToday)} helper="Delivered revenue across both modules" icon={Wallet} tone="bg-violet-100 text-violet-700" />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="mb-5">
                  <h2 className="text-xl font-black text-slate-900 font-['Outfit']">Combined Revenue Trend</h2>
                  <p className="mt-1 text-sm text-slate-500">Monthly food and quick revenue movement together.</p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="globalRevenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f172a" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14 }} />
                      <Area type="monotone" dataKey="combinedRevenue" stroke="#0f172a" strokeWidth={2.5} fill="url(#globalRevenueFill)" name="Combined Revenue" />
                      <Bar dataKey="combinedOrders" fill="#10b981" radius={[6, 6, 0, 0]} name="Combined Orders" barSize={14} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="mb-5">
                  <h2 className="text-xl font-black text-slate-900 font-['Outfit']">Today Module Mix</h2>
                  <p className="mt-1 text-sm text-slate-500">Order share split between food and quick today.</p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={moduleMix} dataKey="value" nameKey="name" innerRadius={64} outerRadius={104} paddingAngle={4}>
                        {moduleMix.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {moduleMix.map((item) => (
                    <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      </div>
                      <p className="mt-3 text-2xl font-black text-slate-900 font-['Outfit']">{item.value.toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <div className="mb-5">
                <h2 className="text-xl font-black text-slate-900 font-['Outfit']">Status Comparison Today</h2>
                <p className="mt-1 text-sm text-slate-500">Food and quick order status comparison for today.</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14 }} />
                    <Bar dataKey="food" fill="#f97316" radius={[8, 8, 0, 0]} name="Food" />
                    <Bar dataKey="quick" fill="#10b981" radius={[8, 8, 0, 0]} name="Quick" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({ title, value, helper, icon: Icon, tone }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black text-slate-900 font-['Outfit']">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
