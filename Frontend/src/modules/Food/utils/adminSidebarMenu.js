export const adminSidebarMenu = [
  {
    type: "link",
    label: "Dashboard",
    path: "/admin/food",
    icon: "LayoutDashboard",
  },
  {
    type: "link",
    label: "Point of Sale",
    path: "/admin/food/point-of-sale",
    icon: "CreditCard",
  },
  {
    type: "link",
    label: "Real Time Status",
    path: "/admin/food/status-monitor",
    icon: "Activity",
  },
  {
    type: "expandable",
    label: "Orders",
    icon: "FileText",
    suBitecubems: [
      { label: "All", path: "/admin/food/orders/all" },
      { label: "Scheduled", path: "/admin/food/orders/scheduled" },
      { label: "Pending", path: "/admin/food/orders/pending" },
      { label: "Accepted", path: "/admin/food/orders/accepted" },
      { label: "Processing", path: "/admin/food/orders/processing" },
      { label: "Food On The Way", path: "/admin/food/orders/food-on-the-way" },
      { label: "Delivered", path: "/admin/food/orders/delivered" },
      { label: "Cancelled", path: "/admin/food/orders/canceled" },
      { label: "Restaurant cancelled", path: "/admin/food/orders/restaurant-cancelled" },
      { label: "Payment Failed", path: "/admin/food/orders/payment-failed" },
      { label: "Refunded", path: "/admin/food/orders/refunded" },
      { label: "Offline Payments", path: "/admin/food/orders/offline-payments" },
    ],
  },
  {
    type: "section",
    label: "FOOD MANAGEMENT",
    items: [
      {
        type: "link",
        label: "Food Approval",
        path: "/admin/food/food-approval",
        icon: "CheckCircle2",
      },
      {
        type: "expandable",
        label: "Foods",
        icon: "Utensils",
        suBitecubems: [
          { label: "Restaurant Foods List", path: "/admin/food/foods" },
          { label: "Restaurant Addons List", path: "/admin/food/addons" },
        ],
      },
      {
        type: "expandable",
        label: "Categories",
        icon: "FolderTree",
        suBitecubems: [{ label: "Category", path: "/admin/food/categories" }],
      },
    ],
  },
  {
    type: "section",
    label: "RESTAURANT MANAGEMENT",
    items: [
      {
        type: "expandable",
        label: "Restaurants",
        icon: "UtensilsCrossed",
        suBitecubems: [
          { label: "Restaurants List", path: "/admin/food/restaurants" },
          { label: "Menu Bulk Upload", path: "/admin/food/restaurants/menu-bulk-upload" },
          { label: "New Joining Request", path: "/admin/food/restaurants/joining-request" },
          { label: "Restaurant Commission", path: "/admin/food/restaurants/commission" },
          { label: "Restaurant Discount", path: "/admin/food/restaurants/discount" },
          { label: "Restaurant Reviews", path: "/admin/food/restaurants/reviews" },
          { label: "Restaurant Complaints", path: "/admin/food/restaurants/complaints" },
        ],
      },
    ],
  },
  {
    type: "section",
    label: "ORDER MANAGEMENT",
    items: [
      {
        type: "expandable",
        label: "Orders",
        icon: "FileText",
        suBitecubems: [
          { label: "All", path: "/admin/food/orders/all" },
          { label: "Scheduled", path: "/admin/food/orders/scheduled" },
          { label: "Pending", path: "/admin/food/orders/pending" },
          { label: "Accepted", path: "/admin/food/orders/accepted" },
          { label: "Processing", path: "/admin/food/orders/processing" },
          { label: "Food On The Way", path: "/admin/food/orders/food-on-the-way" },
          { label: "Delivered", path: "/admin/food/orders/delivered" },
          { label: "Cancelled", path: "/admin/food/orders/canceled" },
          { label: "Restaurant cancelled", path: "/admin/food/orders/restaurant-cancelled" },
          { label: "Payment Failed", path: "/admin/food/orders/payment-failed" },
          { label: "Refunded", path: "/admin/food/orders/refunded" },
          { label: "Offline Payments", path: "/admin/food/orders/offline-payments" },
        ],
      },
      {
        type: "link",
        label: "Order Detect Delivery",
        path: "/admin/food/order-detect-delivery",
        icon: "Truck",
      },
    ],
  },
  {
    type: "section",
    label: "PROMOTIONS MANAGEMENT",
    items: [
      {
        type: "link",
        label: "Restaurant Coupons & Offers",
        path: "/admin/food/coupons",
        icon: "Gift",
      },
    ],
  },
  {
    type: "section",
    label: "REFERRAL & REWARDS",
    items: [
      { type: "link", label: "Referral Settings", path: "/admin/food/referral-settings", icon: "Gift" },
    ],
  },
  {
    type: "section",
    label: "REPORT MANAGEMENT",
    items: [
      { type: "link", label: "Transaction Report", path: "/admin/food/transaction-report", icon: "FileText" },
      { type: "link", label: "Order Report", path: "/admin/food/order-report/regular", icon: "FileText" },
      { type: "link", label: "Tax Report", path: "/admin/food/tax-report", icon: "Receipt" },
      {
        type: "expandable",
        label: "Restaurant Report",
        icon: "FileText",
        suBitecubems: [{ label: "Restaurant Report", path: "/admin/food/restaurant-report" }],
      },
      {
        type: "expandable",
        label: "Customer Report",
        icon: "FileText",
        suBitecubems: [{ label: "Feedback Experience", path: "/admin/food/customer-report/feedback-experience" }],
      },
    ],
  },
  {
    type: "section",
    label: "TRANSACTION MANAGEMENT",
    items: [
      { type: "link", label: "Restaurant Withdraws", path: "/admin/food/restaurant-withdraws", icon: "CreditCard" },
    ],
  },
  {
    type: "section",
    label: "BANNER SETTINGS",
    items: [
      { type: "link", label: "Landing Page Management", path: "/admin/food/hero-banner-management", icon: "Image" },
    ],
  },
  /* {
    type: "section",
    label: "DINING MANAGEMENT",
    items: [
      { type: "link", label: "Dining Banners", path: "/admin/food/dining-management", icon: "UtensilsCrossed" },
      { type: "link", label: "Dining List", path: "/admin/food/dining-list", icon: "FileText" },
      { type: "link", label: "Dining Category Request", path: "/admin/food/dining-requests", icon: "CheckCircle" },
    ],
  }, */
];
