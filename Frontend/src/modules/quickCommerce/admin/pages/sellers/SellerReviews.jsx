import { Plus } from "lucide-react"

export default function SellerReviews() {
  return (
    <div className="px-4 pb-10 lg:px-6 pt-4">
      <div className="flex flex-col gap-4 border-b border-neutral-200 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between rounded-t-3xl shadow-xs">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Seller Reviews</h1>
          <p className="text-sm text-neutral-500 mt-1">Monitor and manage seller reviews</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 rounded-full bg-[#10b981] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#059669] shadow-sm">
            <Plus className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-b-3xl border-x border-b border-neutral-200 min-h-[400px] flex items-center justify-center">
        <p className="text-neutral-400">Seller Reviews content will appear here.</p>
      </div>
    </div>
  )
}
