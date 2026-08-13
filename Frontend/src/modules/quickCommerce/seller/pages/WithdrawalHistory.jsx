import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Wallet } from "lucide-react"
import { sellerAPI } from "@/services/api"

export default function SellerWithdrawalHistoryPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState("pending")
  const [withdrawalRequests, setWithdrawalRequests] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchWithdrawalRequests = async () => {
      try {
        setLoading(true)
        const response = await sellerAPI.getWithdrawalHistory()
        const history = response?.data?.data || []
        const mapped = history.map((item) => ({
          id: item._id,
          amount: item.amount,
          status: item.status === "approved" || item.status === "processed" ? "Approved" : item.status === "rejected" ? "Rejected" : "Pending",
          requestedAt: item.createdAt,
          processedAt: item.processedAt,
        }))
        setWithdrawalRequests(mapped)
      } finally {
        setLoading(false)
      }
    }

    fetchWithdrawalRequests()
  }, [])

  return (
    <div className="min-h-full rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/quick/seller/finance")} className="rounded-lg p-1.5 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-slate-900" />
          </button>
          <h1 className="text-lg font-black text-slate-900 font-['Outfit']">Withdrawal History</h1>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-4 pt-4">
        <div className="flex gap-2">
          <button onClick={() => setTab("pending")} className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium ${tab === "pending" ? "bg-black text-white" : "bg-slate-100 text-slate-600"}`}>Withdrawal Pending</button>
          <button onClick={() => setTab("successful")} className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium ${tab === "successful" ? "bg-black text-white" : "bg-slate-100 text-slate-600"}`}>Withdrawal Successful</button>
        </div>
      </div>

      <div className="px-4 py-6">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="space-y-3">
            {(tab === "pending"
              ? withdrawalRequests.filter((item) => item.status === "Pending")
              : withdrawalRequests.filter((item) => item.status === "Approved")
            ).length === 0 ? (
              <div className="py-12 text-center">
                <Wallet className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                <p className="text-lg font-medium text-slate-500">No {tab === "pending" ? "pending" : "successful"} withdrawals</p>
              </div>
            ) : (
              (tab === "pending"
                ? withdrawalRequests.filter((item) => item.status === "Pending")
                : withdrawalRequests.filter((item) => item.status === "Approved")
              ).map((request) => (
                <div key={request.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="mb-2 text-lg font-bold text-slate-900">
                        Rs.{Number(request.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-600">
                        {tab === "pending" ? "Requested" : "Processed"}: {new Date((tab === "pending" ? request.requestedAt : request.processedAt) || request.requestedAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${tab === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                      {tab === "pending" ? "Pending" : "Approved"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
