import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Loader2, Star } from "lucide-react"
import { fetchOrders } from "../services/orderService"

const faqs = [
  {
    id: 1,
    question: "How is my seller rating calculated?",
    answer:
      "Your seller rating is based on customer ratings from completed quick commerce orders. More rated orders help the score become more stable.",
  },
  {
    id: 2,
    question: "Why do some orders not have ratings?",
    answer:
      "Not every customer leaves feedback after delivery. Only the orders where customers submit a rating appear in this section.",
  },
  {
    id: 3,
    question: "Can I improve my seller rating?",
    answer:
      "Yes. Faster fulfilment, correct packing, better product quality, and fewer cancellations usually improve customer reviews over time.",
  },
]

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
  })
}

export default function SellerRatingsReviewsPage() {
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [expandedItems, setExpandedItems] = useState(new Set())

  useEffect(() => {
    let cancelled = false

    const loadReviews = async () => {
      try {
        setLoading(true)
        const response = await fetchOrders({ status: "all", limit: 100, page: 1 })
        const orderList = Array.isArray(response?.data?.orders)
          ? response.data.orders
          : Array.isArray(response?.orders)
            ? response.orders
            : []

        const ratedOrders = orderList
          .filter((order) => Number(order?.rating || order?.ratings?.seller?.rating || order?.ratings?.product?.rating || 0) > 0)
          .map((order) => ({
            id: order?._id || order?.order_id || order?.orderId,
            orderId: order?.order_id || order?.orderId || order?._id,
            rating: Number(order?.rating || order?.ratings?.seller?.rating || order?.ratings?.product?.rating || 0),
            review:
              order?.review ||
              order?.ratings?.seller?.comment ||
              order?.ratings?.product?.comment ||
              "Customer rated this order.",
            createdAt: order?.updatedAt || order?.createdAt,
            customerName:
              order?.customer?.name ||
              order?.customerName ||
              order?.deliveryAddress?.fullName ||
              "Customer",
          }))

        if (!cancelled) {
          setReviews(ratedOrders)
        }
      } catch (_) {
        if (!cancelled) {
          setReviews([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReviews()
    return () => {
      cancelled = true
    }
  }, [])

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0
    return reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length
  }, [reviews])

  const toggleAccordion = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 px-6 py-8 text-white">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Ratings & Reviews</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black font-['Outfit']">Seller Review Insights</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/75">
                Review customer ratings received on your quick commerce seller orders.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">Average Rating</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-3xl font-black">{averageRating ? averageRating.toFixed(1) : "0.0"}</span>
                <Star className="h-5 w-5 fill-current text-amber-300" />
              </div>
              <p className="mt-1 text-xs text-white/70">{reviews.length} rated orders</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-['Outfit']">Recent Ratings</h2>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <Star className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-900">No ratings available yet</p>
                  <p className="mt-1 text-sm text-slate-500">Rated seller orders will appear here once customers leave feedback.</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{review.customerName}</p>
                        <p className="mt-1 text-xs text-slate-500">Order #{review.orderId}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(review.createdAt)}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                        <span>{review.rating.toFixed(1)}</span>
                        <Star className="h-4 w-4 fill-current" />
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{review.review}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-900 font-['Outfit']">Help & Questions</h2>
            <div className="mt-4 divide-y divide-slate-200">
              {faqs.map((item) => {
                const expanded = expandedItems.has(item.id)
                return (
                  <div key={item.id} className="py-3">
                    <button
                      type="button"
                      onClick={() => toggleAccordion(item.id)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="text-sm font-medium text-slate-900">{item.question}</span>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                    {expanded ? <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p> : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
