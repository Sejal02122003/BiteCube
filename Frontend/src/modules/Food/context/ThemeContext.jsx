import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const location = useLocation();
  const { storageKey, defaultTheme, isUserApp } = useMemo(() => {
    const path = window.location.pathname || location.pathname || "";
    const isAdmin = path.includes('/admin');
    const isDelivery = path.includes('/delivery');
    const isRestaurant = path.includes('/restaurant') && !path.includes('/user/restaurants');
    const isSeller = path.includes('/quick/seller');
    const userApp = !isAdmin && !isRestaurant && !isDelivery && !isSeller;

    if (isAdmin) return { storageKey: "adminAppTheme", defaultTheme: "light", isUserApp: false };
    if (isRestaurant) return { storageKey: "restaurantAppTheme", defaultTheme: "light", isUserApp: false };
    if (isDelivery) return { storageKey: "deliveryAppTheme", defaultTheme: "light", isUserApp: false };
    if (isSeller) return { storageKey: "sellerAppTheme", defaultTheme: "light", isUserApp: false };
    return { storageKey: "userAppTheme", defaultTheme: "dark", isUserApp: userApp };
  }, [location.pathname]);

  const [theme, setTheme] = useState(() => localStorage.getItem(storageKey) || defaultTheme);

  useEffect(() => {
    const nextTheme = localStorage.getItem(storageKey) || defaultTheme;
    setTheme(nextTheme);
  }, [storageKey, defaultTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    if (isUserApp) root.classList.add("user-app");
    else root.classList.remove("user-app");
    localStorage.setItem(storageKey, theme);
    
    // Dispatch a custom event in case non-React parts need to know
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  }, [theme, storageKey, isUserApp]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
