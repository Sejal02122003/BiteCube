import { Outlet, useNavigate } from "react-router-dom"
import { LogOut, Menu, Search, Store, ChevronDown } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import SellerSidebar from "./SellerSidebar"
import { clearAuthData, clearModuleAuth, getCurrentUser, getModuleFcmToken } from "@food/utils/auth"
import { restaurantAPI, sellerAPI } from "@food/api"
import { getCachedSettings, loadBusinessSettings, normalizeUrl } from "@food/utils/businessSettings"

export default function SellerLayout() {
  const navigate = useNavigate()
  const currentUser = useMemo(() => getCurrentUser("restaurant"), [])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [companyName, setCompanyName] = useState("Seller Panel")
  const [sellerUser, setSellerUser] = useState(currentUser)
  const [updatingAvailability, setUpdatingAvailability] = useState(false)

  useEffect(() => {
    const getBestLogo = (settings) => {
      if (settings?.sellerLogo?.url) return normalizeUrl(settings.sellerLogo.url)
      if (settings?.restaurantLogo?.url) return normalizeUrl(settings.restaurantLogo.url)
      if (settings?.logo?.url) return normalizeUrl(settings.logo.url)
      return null
    }

    const applySettings = (settings) => {
      if (!settings) return
      setLogoUrl(getBestLogo(settings))
      if (settings.companyName) setCompanyName(settings.companyName)
    }

    const cached = getCachedSettings()
    if (cached) applySettings(cached)

    loadBusinessSettings().then((settings) => {
      applySettings(settings)
    }).catch(() => {})

    const handleSettingsUpdate = () => applySettings(getCachedSettings())
    window.addEventListener("businessSettingsUpdated", handleSettingsUpdate)
    return () => window.removeEventListener("businessSettingsUpdated", handleSettingsUpdate)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadSeller = async () => {
      try {
        const response = await sellerAPI.getProfile()
        const seller =
          response?.data?.data?.seller ||
          response?.data?.seller ||
          response?.data?.data ||
          response?.data

        if (!cancelled && seller) {
          setSellerUser(seller)
          try {
            localStorage.setItem("restaurant_user", JSON.stringify(seller))
          } catch {}
        }
      } catch (_) {}
    }

    loadSeller()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      const fcmToken = getModuleFcmToken("restaurant")
      await restaurantAPI.logout(null, fcmToken, "web")
    } catch (_) {
    } finally {
      clearModuleAuth("restaurant")
      clearAuthData()
      toast.success("Logged out successfully")
      navigate("/food/restaurant/seller/login", { replace: true })
      setLoggingOut(false)
    }
  }

  const handleAvailabilityToggle = async () => {
    if (updatingAvailability) return
    const nextValue = sellerUser?.isAcceptingOrders === false
    try {
      setUpdatingAvailability(true)
      const response = await sellerAPI.updateAvailability(nextValue)
      const updatedSeller =
        response?.data?.data?.seller ||
        response?.data?.seller ||
        response?.data?.data ||
        response?.data

      if (updatedSeller) {
        setSellerUser(updatedSeller)
        try {
          localStorage.setItem("restaurant_user", JSON.stringify(updatedSeller))
        } catch {}
      }
      toast.success(nextValue ? "Store is now online and accepting orders" : "Store is now offline for new orders")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update seller availability")
    } finally {
      setUpdatingAvailability(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="flex min-h-screen">
        <SellerSidebar />

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)}>
            <div className="h-full w-72 bg-black p-4" onClick={(e) => e.stopPropagation()}>
              <SellerSidebar mobile />
            </div>
          </div>
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col md:ml-72">
          <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden p-2 rounded-md text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center cursor-pointer" onClick={() => navigate("/quick/seller/dashboard")}>
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt={companyName} className="w-10 h-10 object-contain" />
                    ) : (
                      <span className="text-sm font-bold text-neutral-900">
                        {(companyName || "S").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-red-600 font-extrabold text-xl ml-1 tracking-tight hidden lg:block">
                    {companyName}
                  </span>
                </div>
              </div>

              <div className="flex-1 hidden md:flex justify-center max-w-md mx-8">
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 text-neutral-600 cursor-default w-full border border-neutral-200 shadow-sm"
                >
                  <Search className="w-4 h-4 text-neutral-700" />
                  <span className="text-sm flex-1 text-left text-neutral-700">Search</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200">
                    Seller
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAvailabilityToggle}
                  disabled={updatingAvailability}
                  className={`inline-flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    sellerUser?.isAcceptingOrders === false
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  <span
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      sellerUser?.isAcceptingOrders === false ? "bg-rose-200" : "bg-emerald-500"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        sellerUser?.isAcceptingOrders === false ? "left-0.5" : "translate-x-5 left-0.5"
                      }`}
                    />
                  </span>
                  <span className="hidden sm:inline">
                    {updatingAvailability
                      ? "Updating..."
                      : sellerUser?.isAcceptingOrders === false
                        ? "Offline"
                        : "Online"}
                  </span>
                </button>

                <div className="flex items-center gap-2 pl-3 border-l border-neutral-200 rounded-md px-2 py-1">
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-medium text-neutral-900">
                      {sellerUser?.ownerName || sellerUser?.name || "Seller User"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {sellerUser?.storeName || "Seller Dashboard"}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-700 hidden md:block" />
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{loggingOut ? "Logging out..." : "Logout"}</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
