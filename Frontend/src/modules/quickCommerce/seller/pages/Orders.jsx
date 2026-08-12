import SectionPlaceholder from "./SectionPlaceholder"

export default function SellerOrdersPage() {
  return (
    <SectionPlaceholder
      title="Orders"
      description="Track quick commerce orders, monitor order states, and manage seller-side fulfillment actions from one queue."
      points={[
        "Pending and accepted order queue",
        "Packed and ready-for-pickup workflow",
        "Order issue flags and support actions",
        "Recent order activity and fulfillment summaries",
      ]}
    />
  )
}
