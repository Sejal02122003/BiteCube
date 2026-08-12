import { LayoutDashboard, Package, ShoppingBasket, Store, UserCircle2 } from "lucide-react"
import { NavLink } from "react-router-dom"
import { cn } from "@food/utils/utils"
import { getCachedSettings, loadBusinessSettings, normalizeUrl } from "@food/utils/businessSettings"
import { useEffect, useState } from "react"

const navItems = [
  {
    label: "Dashboard",
    to: "/quick/seller/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Orders",
    to: "/quick/seller/orders",
    icon: ShoppingBasket,
  },
  {
    label: "Products",
    to: "/quick/seller/products",
    icon: Store,
  },
  {
    label: "Inventory",
    to: "/quick/seller/inventory",
    icon: Package,
  },
  {
    label: "Profile",
    to: "/quick/seller/profile",
    icon: UserCircle2,
  },
]

export default function SellerSidebar({ className = "", mobile = false }) {
  const getBestLogo = (settings) => {
    if (settings?.sellerLogo?.url) return normalizeUrl(settings.sellerLogo.url)
    if (settings?.restaurantLogo?.url) return normalizeUrl(settings.restaurantLogo.url)
    if (settings?.logo?.url) return normalizeUrl(settings.logo.url)
    return null
  }

  const [logoUrl, setLogoUrl] = useState(() => getBestLogo(getCachedSettings()))
  const [companyName, setCompanyName] = useState(() => getCachedSettings()?.companyName || "Seller Panel")

  useEffect(() => {
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

  return (
    <aside className={cn(
      mobile ? "flex w-full flex-col bg-black text-white" : "hidden md:flex md:w-72 md:flex-col md:bg-black md:text-white",
      className
    )}>
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-5 w-5 text-black" />
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
              Quick Seller
            </p>
            <h1 className="mt-1 line-clamp-1 text-lg font-semibold text-white">
              {companyName}
            </h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-5">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-black"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
