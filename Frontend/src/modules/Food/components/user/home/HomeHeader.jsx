import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  ChevronDown,
  Search,
  Mic,
  Bell,
  CheckCircle2,
  Tag,
  Gift,
  AlertCircle,
  BellOff,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@food/components/ui/popover";
import { Badge } from "@food/components/ui/badge";
import useNotificationInbox from "@food/hooks/useNotificationInbox";

const ICON_MAP = {
  CheckCircle2,
  Tag,
  Gift,
  AlertCircle,
};

export default function HomeHeader({
  location,
  handleLocationClick,
  handleSearchFocus,
  placeholderIndex,
  placeholders,
  vegMode = false,
  handleVegModeChange,
  hasScrolledPastBanner = false,
  handleVoiceSearchClick,
  searchRowRef = null,
  searchStickySentinelRef = null,
}) {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("food_user_notifications");
    return saved ? JSON.parse(saved) : [];
  });
  const [searchRowLayout, setSearchRowLayout] = useState({
    height: 0,
    left: 0,
    width: 0,
  });
  const {
    items: broadcastNotifications,
    unreadCount: broadcastUnreadCount,
    dismiss: dismissBroadcastNotification,
  } = useNotificationInbox("user", { limit: 20 });

  useEffect(() => {
    const syncNotifications = () => {
      const saved = localStorage.getItem("food_user_notifications");
      setNotifications(saved ? JSON.parse(saved) : []);
    };

    window.addEventListener("notificationsUpdated", syncNotifications);
    return () => window.removeEventListener("notificationsUpdated", syncNotifications);
  }, []);

  useEffect(() => {
    const updateSearchRowHeight = () => {
      const searchRect = searchRowRef?.current?.getBoundingClientRect();
      const anchorRect = searchStickySentinelRef?.current?.getBoundingClientRect();

      if (searchRect) {
        setSearchRowLayout({
          height: searchRect.height || 0,
          left: anchorRect?.left ?? searchRect.left,
          width: anchorRect?.width ?? searchRect.width,
        });
      }
    };

    updateSearchRowHeight();
    window.addEventListener("resize", updateSearchRowHeight);
    return () => window.removeEventListener("resize", updateSearchRowHeight);
  }, [searchRowRef, searchStickySentinelRef, hasScrolledPastBanner]);

  const mergedNotifications = useMemo(() => {
    const localItems = Array.isArray(notifications)
      ? notifications.map((item) => ({ ...item, source: "local" }))
      : [];
    const broadcastItems = (broadcastNotifications || []).map((item) => ({
      ...item,
      source: "broadcast",
      time: item.createdAt
        ? new Date(item.createdAt).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "Just now",
      type: "broadcast",
      icon: "Bell",
      iconColor: "text-blue-600",
    }));

    return [...broadcastItems, ...localItems].sort(
      (a, b) =>
        new Date(b.createdAt || b.timestamp || 0).getTime() -
        new Date(a.createdAt || a.timestamp || 0).getTime(),
    );
  }, [broadcastNotifications, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length + broadcastUnreadCount;

  const renderSearchRow = (isSticky) => (
    <div
      ref={searchRowRef}
      id="home-header-search-row"
      style={
        isSticky && searchRowLayout.width
          ? { left: searchRowLayout.left, width: searchRowLayout.width }
          : undefined
      }
      className={`z-[1000] px-4 pb-2.5 pointer-events-none mt-0 ${
        isSticky
          ? "fixed top-0 pt-2 bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-zinc-800"
          : "relative pt-1.5 bg-transparent"
      }`}
    >
      <div className="mx-auto flex w-full items-center gap-2.5 pointer-events-auto">
        <div
          className="relative bg-white dark:bg-zinc-800 rounded-2xl flex items-center px-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 dark:border-zinc-700/80 cursor-pointer active:scale-[0.98] transition-all duration-300 flex-1 h-12"
          onClick={handleSearchFocus}
        >
          <Search className="h-[20px] w-[20px] text-orange-500 mr-2.5 shrink-0" strokeWidth={2.5} />
          <div className="flex-1 overflow-hidden relative h-5">
            <AnimatePresence mode="wait">
              <motion.span
                key={placeholderIndex}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 text-sm font-medium text-gray-400 truncate flex items-center"
              >
                {placeholders?.[placeholderIndex] || 'Search "biryani"'}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2 pl-2">
            <div className="h-5 w-[1px] bg-gray-200 dark:bg-zinc-700" />
            <Mic
              className="h-5 w-5 text-orange-500 hover:scale-110 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                handleVoiceSearchClick?.();
              }}
            />
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform duration-300 shrink-0 px-3 bg-white dark:bg-zinc-800 rounded-2xl py-1.5 h-12 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 dark:border-zinc-700/80"
          onClick={() => handleVegModeChange?.(!vegMode)}
        >
          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">🌿</span>
          </div>
          <div className="text-[9px] font-black leading-tight text-gray-800 dark:text-gray-200 tracking-wider text-center">
            VEG
            <br />
            MODE
          </div>
          <div className={`ml-0.5 w-[26px] h-[15px] rounded-full relative transition-colors duration-300 border border-black/5 ${vegMode ? "bg-emerald-500" : "bg-gray-200 dark:bg-zinc-700"}`}>
            <div className={`absolute top-[1px] w-[11px] h-[11px] rounded-full bg-white shadow-sm transition-transform duration-300 ${vegMode ? "translate-x-[12px]" : "translate-x-[1px]"}`} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div id="home-header-loc-row" className="relative pt-3 pb-1 px-4 transition-all duration-700 overflow-hidden bg-transparent shadow-none">
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-[#48c479]/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div
              className="flex items-center gap-2 cursor-pointer group min-w-0 flex-1"
              onClick={handleLocationClick}
            >
              <div className="flex-shrink-0 flex items-center justify-center">
                <MapPin className="h-[26px] w-[26px] text-orange-500" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[15px] sm:text-[16px] font-extrabold text-white truncate tracking-tight drop-shadow-sm">
                    {(() => {
                      const area = location?.area || location?.subLocality || location?.mainTitle || location?.neighborhood;
                      const city = (location?.city || "").toLowerCase();
                      const state = (location?.state || "").toLowerCase();

                      if (area && !/^-?\d+(\.\d+)?$/.test(area.trim())) {
                        const areaLower = area.toLowerCase();
                        if (areaLower !== city && areaLower !== state) {
                          return area;
                        }
                      }

                      if (location?.address && location.address !== "Select location") {
                        const parts = location.address.split(",").map((p) => p.trim());
                        for (const part of parts) {
                          const partLower = part.toLowerCase();
                          if (
                            partLower &&
                            partLower !== city &&
                            partLower !== state &&
                            !/^-?\d/.test(part) &&
                            part.length > 2
                          ) {
                            return part;
                          }
                        }
                      }

                      return location?.area || location?.city || "Select Location";
                    })()}
                  </span>
                  <ChevronDown className="h-[16px] w-[16px] text-white flex-shrink-0" strokeWidth={2.5} />
                </div>

                <span className="text-[11px] font-medium text-gray-200 truncate leading-tight mt-0.5 drop-shadow-sm">
                  {(() => {
                    const addr = location?.formattedAddress || location?.address || "";
                    if (addr && addr.length > 5 && addr !== "Select location") {
                      return addr;
                    }

                    const state = location?.state || "";
                    const pincode = location?.pincode || "";

                    if (state && pincode) return `${state}, ${pincode}`;
                    if (state) return state;
                    if (pincode) return pincode;

                    return "Pinpoint location";
                  })()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Popover>
                <PopoverTrigger asChild>
                  <div className="h-9 w-9 relative flex items-center justify-center rounded-full bg-white/20 dark:bg-zinc-800/80 backdrop-blur-md border border-white/25 dark:border-zinc-700 shadow-sm cursor-pointer active:scale-90 transition-all">
                    <Bell className="h-4 w-4 text-white" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 overflow-hidden border-none shadow-2xl rounded-2xl mt-2" align="end">
                  <div className="bg-white dark:bg-gray-900">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Notifications
                        {unreadCount > 0 && (
                          <Badge variant="secondary" className="bg-orange-100 text-primary border-none text-[10px] h-4">
                            {unreadCount} New
                          </Badge>
                        )}
                      </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {mergedNotifications.length > 0 ? (
                        mergedNotifications.slice(0, 5).map((notif) => {
                          const Icon = ICON_MAP[notif.icon] || Bell;
                          return (
                            <div key={notif.id} className="p-4 flex items-start gap-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 transition-colors">
                              <div className="mt-1 p-2 rounded-full bg-gray-100 text-primary">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{notif.title}</p>
                                <p className="text-xs text-gray-500 line-clamp-1">{notif.message}</p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center flex flex-col items-center gap-2">
                          <BellOff className="h-10 w-10 text-gray-200" />
                          <p className="text-xs text-gray-400 font-medium">All caught up!</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-center">
                      <Link to="/food/user/notifications" className="text-xs font-bold text-gray-400">
                        View All
                      </Link>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={searchStickySentinelRef}
        aria-hidden="true"
        className="h-0 w-full pointer-events-none"
      />
      <div style={hasScrolledPastBanner && searchRowLayout.height ? { height: searchRowLayout.height } : undefined}>
        {hasScrolledPastBanner && typeof document !== "undefined"
          ? createPortal(renderSearchRow(true), document.body)
          : renderSearchRow(false)}
      </div>
    </>
  );
}
