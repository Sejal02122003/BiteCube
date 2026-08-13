import { Bell, Clock3, FileText, HelpCircle, IndianRupee, LayoutDashboard, MapPinned, MessageSquare, Package, ShoppingBasket, Star, Store, UserCircle2, Wallet } from "lucide-react"
import { NavLink } from "react-router-dom"
import { cn } from "@food/utils/utils"
import { getCachedSettings, loadBusinessSettings, normalizeUrl } from "@food/utils/businessSettings"
import { useEffect, useState } from "react"

const navSections = [
  {
    title: "Overview",
    items: [
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
        label: "Profile",
        to: "/quick/seller/profile",
        icon: UserCircle2,
      },
    ],
  },
  {
    title: "Store",
    items: [
      {
        label: "Store Timing",
        to: "/quick/seller/store-timing",
        icon: Clock3,
      },
      {
        label: "Store Info",
        to: "/quick/seller/store-info",
        icon: MapPinned,
      },
    ],
  },
  {
    title: "Orders & Reviews",
    items: [
      {
        label: "Order History",
        to: "/quick/seller/orders/history",
        icon: MessageSquare,
      },
      {
        label: "Ratings & Reviews",
        to: "/quick/seller/ratings-reviews",
        icon: Star,
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Hub Finance",
        to: "/quick/seller/finance",
        icon: IndianRupee,
      },
      {
        label: "Finance Details",
        to: "/quick/seller/finance-details",
        icon: FileText,
      },
      {
        label: "Withdrawal History",
        to: "/quick/seller/withdrawal-history",
        icon: Wallet,
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        label: "Notifications",
        to: "/quick/seller/notifications",
        icon: Bell,
      },
      {
        label: "Help Centre",
        to: "/quick/seller/help-centre",
        icon: HelpCircle,
      },
    ],
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
      mobile
        ? "flex w-full flex-col bg-black text-white"
        : "hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-72 md:flex-col md:bg-black md:text-white",
      className
    )}>
      <style>{`
        .seller-sidebar-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .seller-sidebar-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
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

      <nav className="seller-sidebar-scrollbar flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-5">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
                {section.title}
              </p>
              <div className="space-y-2">
                {section.items.map((item) => {
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
            </div>
          ))}
        </div>
      </nav>
    </aside>
  )
}
