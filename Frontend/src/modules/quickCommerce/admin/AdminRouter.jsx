import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy loaded pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Category = React.lazy(() => import('./pages/Category'));
const Subcategory = React.lazy(() => import('./pages/Subcategory'));
const Product = React.lazy(() => import('./pages/Product'));

// Seller Management
const SellersList = React.lazy(() => import('./pages/sellers/SellersList'));
const InventoryBulkUpload = React.lazy(() => import('./pages/sellers/InventoryBulkUpload'));
const JoiningRequest = React.lazy(() => import('./pages/sellers/JoiningRequest'));
const SellerCommission = React.lazy(() => import('./pages/sellers/SellerCommission'));
const SellerDiscount = React.lazy(() => import('./pages/sellers/SellerDiscount'));
const SellerReviews = React.lazy(() => import('./pages/sellers/SellerReviews'));
const SellerComplaints = React.lazy(() => import('./pages/sellers/SellerComplaints'));

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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
