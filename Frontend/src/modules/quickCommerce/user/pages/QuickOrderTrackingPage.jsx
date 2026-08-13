import OrderTracking from '@/modules/Food/pages/user/orders/OrderTracking';

/**
 * Quick orders deliberately use the same tracking renderer as Food orders.
 * The shared page switches API/status/entity labels through orderType.
 */
export default function QuickOrderTrackingPage() {
  return <OrderTracking orderType="quick" />;
}
