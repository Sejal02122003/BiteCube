import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy loaded pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Category = React.lazy(() => import('./pages/Category'));
const Subcategory = React.lazy(() => import('./pages/Subcategory'));
const Product = React.lazy(() => import('./pages/Product'));
const PointOfSale = React.lazy(() => import('./pages/PointOfSale'));
const StatusMonitor = React.lazy(() => import('./pages/StatusMonitor'));
const OrdersPage = React.lazy(() => import('../../Food/pages/admin/orders/OrdersPage'));
const OrderDetectDelivery = React.lazy(() => import('../../Food/pages/admin/OrderDetectDelivery'));

// Seller Management
const SellersList = React.lazy(() => import('./pages/sellers/SellersList'));
const InventoryBulkUpload = React.lazy(() => import('./pages/sellers/InventoryBulkUpload'));
const JoiningRequest = React.lazy(() => import('./pages/sellers/JoiningRequest'));
const SellerCommission = React.lazy(() => import('./pages/sellers/SellerCommission'));
const SellerDiscount = React.lazy(() => import('./pages/sellers/SellerDiscount'));
const SellerReviews = React.lazy(() => import('./pages/sellers/SellerReviews'));
const SellerComplaints = React.lazy(() => import('./pages/sellers/SellerComplaints'));

const QuickHeroBannerManagement = React.lazy(() => import('./pages/QuickHeroBannerManagement'));
const QuickLowestPriceEverManagement = React.lazy(() => import('./pages/QuickLowestPriceEverManagement'));

// Loading fallback
const PageLoader = () => (
  <div className="flex justify-center items-center h-full min-h-[50vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9C27B0]"></div>
  </div>
);

export default function QuickCommerceAdminRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="point-of-sale" element={<PointOfSale moduleType="quick" />} />
        <Route path="status-monitor" element={<StatusMonitor moduleType="quick" />} />
        
        {/* Order Management */}
        <Route path="orders/:status" element={<OrdersPage moduleType="quick" />} />
        <Route path="order-detect-delivery" element={<OrderDetectDelivery moduleType="quick" />} />
        
        {/* Product Management */}
        <Route path="categories" element={<Category />} />
        <Route path="subcategories" element={<Subcategory />} />
        <Route path="products" element={<Product />} />

        {/* Seller Management */}
        <Route path="sellers" element={<SellersList />} />
        <Route path="sellers/bulk-upload" element={<InventoryBulkUpload />} />
        <Route path="sellers/joining-request" element={<JoiningRequest />} />
        <Route path="sellers/commission" element={<SellerCommission />} />
        <Route path="sellers/discount" element={<SellerDiscount />} />
        <Route path="sellers/reviews" element={<SellerReviews />} />
        <Route path="sellers/complaints" element={<SellerComplaints />} />

        {/* Banner Settings */}
        <Route path="hero-banner-management" element={<QuickHeroBannerManagement />} />
        <Route path="lowest-price-ever" element={<QuickLowestPriceEverManagement />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
