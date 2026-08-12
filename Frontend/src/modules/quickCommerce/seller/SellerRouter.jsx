import { Suspense, lazy } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import ProtectedRoute from "@food/components/ProtectedRoute"
import Loader from "@food/components/Loader"
import SellerLayout from "./components/SellerLayout"

const SellerDashboard = lazy(() => import("./pages/Dashboard"))
const SellerOrdersPage = lazy(() => import("./pages/Orders"))
const SellerProductsPage = lazy(() => import("./pages/Products"))
const SellerInventoryPage = lazy(() => import("./pages/Inventory"))
const SellerProfilePage = lazy(() => import("./pages/Profile"))

export default function QuickCommerceSellerRouter() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route
          element={
            <ProtectedRoute requiredRole="restaurant" loginPath="/food/restaurant/seller/login">
              <SellerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SellerDashboard />} />
          <Route path="orders" element={<SellerOrdersPage />} />
          <Route path="products" element={<SellerProductsPage />} />
          <Route path="inventory" element={<SellerInventoryPage />} />
          <Route path="profile" element={<SellerProfilePage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
