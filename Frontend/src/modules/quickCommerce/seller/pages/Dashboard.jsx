import { useEffect, useMemo, useState } from "react"
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@food/components/ui/card"
import { Badge } from "@food/components/ui/badge"
import { Button } from "@food/components/ui/button"
import { getCurrentUser } from "@food/utils/auth"
import { sellerAPI } from "@food/api"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

const statusStyles = {
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  pending: "bg-amber-100 text-amber-700",
}

const formatBusinessType = (value) =>
  String(value || "general-store")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

export default function SellerDashboard() {
  const navigate = useNavigate()
  const currentUser = useMemo(() => getCurrentUser("restaurant"), [])
  const [loading, setLoading] = useState(true)
  const [seller, setSeller] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadSellerProfile = async () => {
      try {
        setLoading(true)
        const response = await sellerAPI.getProfile()
        const payload =
          response?.data?.data?.seller ||
          response?.data?.seller ||
          response?.data?.data ||
          response?.data

        if (!cancelled) {
          setSeller(payload || null)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.response?.data?.message || "Failed to load seller dashboard")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSellerProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const sellerName =
    seller?.storeName ||
    currentUser?.storeName ||
    currentUser?.name ||
    "Quick Commerce Seller"

  const profileCompletion = useMemo(() => {
    const fields = [
      seller?.storeName,
      seller?.ownerName,
      seller?.ownerEmail,
      seller?.ownerPhone,
      seller?.city,
      seller?.state,
      seller?.pincode,
      seller?.panNumber,
      seller?.accountHolderName,
      seller?.ifscCode,
      seller?.profileImage,
      seller?.documents?.panImage,
    ]
    const filled = fields.filter((value) => String(value || "").trim()).length
    return Math.round((filled / fields.length) * 100)
  }, [seller])

  const uploadedDocuments = useMemo(() => {
    return [
      seller?.profileImage,
      seller?.documents?.panImage,
      seller?.documents?.gstImage,
    ].filter((value) => String(value || "").trim()).length
  }, [seller])

  const metrics = [
    {
      title: "Approval Status",
      value: String(seller?.status || currentUser?.status || "pending").replace(/^\w/, (char) => char.toUpperCase()),
      helper: "Current seller account review state",
      icon: ShieldCheck,
    },
    {
      title: "Profile Completion",
      value: `${profileCompletion}%`,
      helper: "Business setup progress",
      icon: BadgeCheck,
    },
    {
      title: "Documents Uploaded",
      value: `${uploadedDocuments}/3`,
      helper: "Profile, PAN, GST documents tracked",
      icon: CreditCard,
    },
    {
      title: "Store Readiness",
      value: seller?.isAcceptingOrders === false ? "Paused" : "Active",
      helper: "Seller-side availability state",
      icon: CheckCircle2,
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-900" />
          <p className="mt-3 text-sm text-slate-500">Loading seller dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">
          Seller Dashboard
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight font-['Outfit']">
          {sellerName}
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-white/80">
          Welcome to your quick seller panel. This dashboard gives you a clean command view of your store setup, approval state, and the next modules we’re connecting.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="rounded-[1.5rem] border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.title}</p>
                    <p className="mt-3 text-3xl font-black text-slate-900 font-['Outfit']">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[1.75rem] border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900 font-['Outfit']">
              Seller Overview
            </CardTitle>
            <CardDescription>
              Quick account summary for your store, owner identity, and business setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <InfoTile icon={Store} label="Store Name" value={seller?.storeName || "Not added"} />
            <InfoTile icon={UserRound} label="Owner Name" value={seller?.ownerName || "Not added"} />
            <InfoTile icon={Phone} label="Primary Phone" value={seller?.ownerPhone || seller?.phone || "Not added"} />
            <InfoTile icon={Building2} label="Business Type" value={formatBusinessType(seller?.businessType)} />
            <InfoTile icon={MapPin} label="City / State" value={`${seller?.city || "City pending"}${seller?.state ? `, ${seller.state}` : ""}`} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approval Badge</p>
                  <p className="mt-2 text-sm text-slate-500">Visible account review status</p>
                </div>
                <Badge className={statusStyles[seller?.status || "pending"] || statusStyles.pending}>
                  {String(seller?.status || "pending").replace(/^\w/, (char) => char.toUpperCase())}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900 font-['Outfit']">
              Panel Shortcuts
            </CardTitle>
            <CardDescription>
              Move into the next seller sections from here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ShortcutButton title="Orders" desc="Open seller order queue" onClick={() => navigate("/quick/seller/orders")} />
            <ShortcutButton title="Products" desc="Manage product catalog" onClick={() => navigate("/quick/seller/products")} />
            <ShortcutButton title="Profile" desc="Review business details" onClick={() => navigate("/quick/seller/profile")} />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.75rem] border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardHeader>
          <CardTitle className="text-xl font-black text-slate-900 font-['Outfit']">
            Operational Signals
          </CardTitle>
          <CardDescription>
            Seller dashboard widgets that are ready now, plus the next stats we can connect.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SignalCard icon={Clock3} title="Pending Orders" value="0" note="Waiting for seller order APIs" />
          <SignalCard icon={Package} title="Active Products" value="0" note="Will connect with seller catalog" />
          <SignalCard icon={CreditCard} title="Payout Summary" value="Coming" note="Finance widgets can be added next" />
          <SignalCard icon={ShieldCheck} title="Compliance Check" value={uploadedDocuments >= 2 ? "Good" : "Pending"} note="Based on available seller docs" />
        </CardContent>
      </Card>
    </div>
  )
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

function ShortcutButton({ title, desc, onClick }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto w-full justify-between rounded-2xl border-slate-200 px-4 py-4 text-left hover:bg-slate-50"
      onClick={onClick}
    >
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{desc}</div>
      </div>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Open</span>
    </Button>
  )
}

function SignalCard({ icon: Icon, title, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-800">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900 font-['Outfit']">{value}</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{note}</div>
      </div>
    </div>
  )
}
