import { Link, useLocation } from "react-router-dom"
import { Tag, User, Home as HomeIcon, ShoppingBag, LayoutGrid } from "lucide-react"
import { useState, useEffect } from "react"
import { getPublicLandingSettings } from "@food/api"
import { useAppLocation } from "@food/hooks/useAppLocation"

export default function BottomNavigation() {
  const location = useLocation()
  const pathname = location.pathname
  const { zoneId } = useAppLocation()
  const [under250PriceLimit, setUnder250PriceLimit] = useState(250)
  const [activeTab, setActiveTab] = useState(() => {
    if (pathname.startsWith("/quick")) return "quick"
    try {
      return localStorage.getItem("bitecube_active_tab") || "food"
    } catch {
      return "food"
    }
  })

  // Listen for active tab changes from Home screen or URL
  useEffect(() => {
    const handleTabChange = () => {
      try {
        const savedTab = localStorage.getItem("bitecube_active_tab")
        if (savedTab) setActiveTab(savedTab)
      } catch {}
    }

    if (pathname.startsWith("/quick")) {
      setActiveTab("quick")
    }

    window.addEventListener("active_tab_changed", handleTabChange)
    window.addEventListener("storage", handleTabChange)
    return () => {
      window.removeEventListener("active_tab_changed", handleTabChange)
      window.removeEventListener("storage", handleTabChange)
    }
  }, [pathname])

  // Fetch landing settings to get dynamic price limit
  useEffect(() => {
    let cancelled = false
    getPublicLandingSettings(zoneId || null)
      .then((settings) => {
        if (cancelled || !settings) return
        if (typeof settings.under250PriceLimit === 'number') {
          setUnder250PriceLimit(settings.under250PriceLimit)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnder250PriceLimit(250)
        }
      })
    return () => { cancelled = true }
  }, [zoneId])

  const isQuick = activeTab === "quick" || pathname.startsWith("/quick")
  const activeTabClasses = isQuick
    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
    : "bg-[#ffeef2] dark:bg-primary/20 text-primary"
  const activeTextClasses = isQuick
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-primary"

  // Check active routes
  const isCategories = pathname === "/quick/categories" || pathname.includes("/category/") || pathname.includes("/categories")
  const isUnder250 = pathname === "/food/under-250" || pathname.startsWith("/food/user/under-250")
  const isOrders = pathname === "/food/orders" || pathname.startsWith("/food/user/orders")
  const isProfile = pathname === "/food/profile" || pathname.startsWith("/food/user/profile")
  const isHome =
    !isCategories &&
    !isUnder250 &&
    !isOrders &&
    !isProfile &&
    (pathname === "/food" ||
      pathname === "/food/" ||
      pathname === "/food/user" ||
      pathname === "/food/user/" ||
      (pathname.startsWith("/food/user") &&
        !pathname.includes("/dining") &&
        !pathname.includes("/under-250") &&
        !pathname.includes("/profile")))

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white dark:bg-[#1a1a1a] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-t border-gray-100 dark:border-gray-800 pb-[max(env(safe-area-inset-bottom,0px),10px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] box-border">
      <div className="flex items-center justify-between px-2 py-1.5 min-h-[64px]">
        {/* Home Tab */}
        <Link
          to="/food/user/"
          className={`flex flex-col items-center justify-center gap-1 w-[22%] py-2 rounded-[1.5rem] transition-all duration-300 ${isHome
              ? activeTabClasses
              : "text-slate-500 dark:text-gray-400"
            }`}
        >
          <HomeIcon className={`h-5 w-5 ${isHome ? activeTextClasses : "text-slate-500 dark:text-gray-400"}`} strokeWidth={isHome ? 2.5 : 2} />
          <span className={`text-[10px] sm:text-xs font-bold ${isHome ? activeTextClasses : "text-slate-500 dark:text-gray-400 font-semibold"}`}>
            Home
          </span>
        </Link>

        {/* Tab 2: Categories for Quick, Under ₹250 for Food */}
        {isQuick ? (
          <Link
            to="/quick/categories"
            className={`flex flex-col items-center justify-center gap-1 w-[22%] py-2 rounded-[1.5rem] transition-all duration-300 ${isCategories
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                : "text-slate-500 dark:text-gray-400"
              }`}
          >
            <LayoutGrid className={`h-5 w-5 ${isCategories ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-gray-400"}`} strokeWidth={isCategories ? 2.5 : 2} />
            <span className={`text-[10px] sm:text-xs font-bold ${isCategories ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-gray-400 font-semibold"}`}>
              Categories
            </span>
          </Link>
        ) : (
          <Link
            to="/food/user/under-250"
            className={`flex flex-col items-center justify-center gap-1 w-[22%] py-2 rounded-[1.5rem] transition-all duration-300 ${isUnder250
                ? "bg-[#ffeef2] dark:bg-primary/20 text-primary"
                : "text-slate-500 dark:text-gray-400"
              }`}
          >
            <Tag className={`h-5 w-5 ${isUnder250 ? "text-primary" : "text-slate-500 dark:text-gray-400"}`} strokeWidth={isUnder250 ? 2.5 : 2} />
            <span className={`text-[10px] sm:text-xs font-bold ${isUnder250 ? "text-primary" : "text-slate-500 dark:text-gray-400 font-semibold"}`}>
              Under ₹{under250PriceLimit}
            </span>
          </Link>
        )}

        {/* Orders Tab */}
        <Link
          to="/food/user/orders"
          className={`flex flex-col items-center justify-center gap-1 w-[22%] py-2 rounded-[1.5rem] transition-all duration-300 ${isOrders
              ? activeTabClasses
              : "text-slate-500 dark:text-gray-400"
            }`}
        >
          <ShoppingBag className={`h-5 w-5 ${isOrders ? activeTextClasses : "text-slate-500 dark:text-gray-400"}`} strokeWidth={isOrders ? 2.5 : 2} />
          <span className={`text-[10px] sm:text-xs font-bold ${isOrders ? activeTextClasses : "text-slate-500 dark:text-gray-400 font-semibold"}`}>
            Orders
          </span>
        </Link>

        {/* Profile Tab */}
        <Link
          to="/food/user/profile"
          className={`flex flex-col items-center justify-center gap-1 w-[22%] py-2 rounded-[1.5rem] transition-all duration-300 ${isProfile
              ? activeTabClasses
              : "text-slate-500 dark:text-gray-400"
            }`}
        >
          <User className={`h-5 w-5 ${isProfile ? activeTextClasses : "text-slate-500 dark:text-gray-400"}`} strokeWidth={isProfile ? 2.5 : 2} />
          <span className={`text-[10px] sm:text-xs font-bold ${isProfile ? activeTextClasses : "text-slate-500 dark:text-gray-400 font-semibold"}`}>
            Profile
          </span>
        </Link>
      </div>
    </div>
  )
}
