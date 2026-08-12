import { Suspense, lazy } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import ProtectedRoute from "@food/components/ProtectedRoute"
import Loader from "@food/components/Loader"
import SellerLayout from "./components/SellerLayout"

const SellerDashboard = lazy(() => import("./pages/Dashboard"))
const SellerOrdersPage = lazy(() => import("./pages/Orders"))
const SellerProductsPage = lazy(() => import("./pages/Products"))
const SellerInventoryPage = lazy(() => import("./pages/Inventory"))
const SellerOrderHistoryPage = lazy(() => import("./pages/OrderHistory"))
const SellerFinancePage = lazy(() => import("./pages/Finance"))
const SellerFinanceDetailsPage = lazy(() => import("./pages/FinanceDetails"))
const SellerHelpCentrePage = lazy(() => import("./pages/HelpCentre"))
const SellerNotificationsPage = lazy(() => import("./pages/Notifications"))
const SellerProfilePage = lazy(() => import("./pages/Profile"))
const SellerRatingsReviewsPage = lazy(() => import("./pages/RatingsReviews"))
const SellerWithdrawalHistoryPage = lazy(() => import("./pages/WithdrawalHistory"))

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
          <Route path="orders/history" element={<SellerOrderHistoryPage />} />
          <Route path="products" element={<SellerProductsPage />} />
          <Route path="inventory" element={<SellerInventoryPage />} />
          <Route path="notifications" element={<SellerNotificationsPage />} />
          <Route path="ratings-reviews" element={<SellerRatingsReviewsPage />} />
          <Route path="help-centre" element={<SellerHelpCentrePage />} />
          <Route path="finance" element={<SellerFinancePage />} />
          <Route path="finance-details" element={<SellerFinanceDetailsPage />} />
          <Route path="withdrawal-history" element={<SellerWithdrawalHistoryPage />} />
          <Route path="profile" element={<SellerProfilePage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
