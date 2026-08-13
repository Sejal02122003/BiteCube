import { useEffect, useState } from "react"
import { Building2, MapPin, Phone, ShieldCheck, Store, UserRound } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { sellerAPI } from "@/services/api"
import { normalizeUrl } from "@food/utils/businessSettings"
import { toast } from "sonner"

const buildAddress = (seller) =>
  [
    seller?.location?.formattedAddress,
    seller?.addressLine1,
    seller?.addressLine2,
    seller?.area,
    seller?.city,
    seller?.state,
    seller?.pincode,
  ]
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join(", ")

export default function SellerStoreInfoPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [seller, setSeller] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadSeller = async () => {
      try {
        setLoading(true)
        const response = await sellerAPI.getProfile()
        const payload =
          response?.data?.data?.seller ||
          response?.data?.seller ||
          response?.data?.data ||
          null
        if (!cancelled) setSeller(payload)
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.response?.data?.message || "Failed to load store info")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSeller()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-10 text-center text-slate-500">Loading store info...</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] bg-white/10">
              {seller?.profileImage ? (
                <img src={normalizeUrl(seller.profileImage)} alt={seller?.storeName || "Store"} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-8 w-8 text-white" />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Store Info</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight font-['Outfit']">{seller?.storeName || "Store"}</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/80">
                Seller business summary, owner contact, address, and approval details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/quick/seller/profile")}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900"
          >
            Edit Full Profile
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-black text-slate-900 font-['Outfit']">Store Details</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoTile icon={Store} label="Store Name" value={seller?.storeName || "Not added"} />
            <InfoTile icon={Building2} label="Business Type" value={String(seller?.businessType || "general-store").replaceAll("-", " ")} />
            <InfoTile icon={UserRound} label="Owner Name" value={seller?.ownerName || "Not added"} />
            <InfoTile icon={Phone} label="Primary Phone" value={seller?.phone || seller?.ownerPhone || "Not added"} />
            <InfoTile icon={ShieldCheck} label="Approval Status" value={seller?.status || "pending"} />
            <InfoTile icon={MapPin} label="City / State" value={`${seller?.city || "City pending"}${seller?.state ? `, ${seller.state}` : ""}`} />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-black text-slate-900 font-['Outfit']">Address</h2>
          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm leading-7 text-slate-700">{buildAddress(seller) || "Store address not added yet."}</p>
            {seller?.landmark ? (
              <p className="mt-4 text-sm text-slate-500">
                Landmark: <span className="font-medium text-slate-700">{seller.landmark}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SmallStat label="PAN" value={seller?.panNumber || "Not added"} />
            <SmallStat label="GST" value={seller?.gstNumber || "Not added"} />
            <SmallStat label="FSSAI" value={seller?.fssaiNumber || "Not added"} />
            <SmallStat label="UPI" value={seller?.upiId || "Not added"} />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-sm font-semibold capitalize text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

function SmallStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}
