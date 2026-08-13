import { useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { resendDeliveryNotification } from "../services/orderService";

export default function QuickResendNotificationButton({ orderId, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleResend = async (event) => {
    event.stopPropagation();
    if (loading || !orderId) return;

    try {
      setLoading(true);
      const response = await resendDeliveryNotification(orderId);
      const result = response?.data || {};
      const notifiedCount = Number(result.notifiedCount || result.offered || 0);
      const radiusLabel = result.searchRadiusKm ? ` within ${result.searchRadiusKm} km` : "";

      if (notifiedCount > 0) {
        toast.success(
          `Notification sent to ${notifiedCount} delivery partner${notifiedCount === 1 ? "" : "s"}${radiusLabel}`,
        );
      } else {
        toast.warning(`No free online delivery partners found${radiusLabel}.`);
      }
      onSuccess?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to resend delivery notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      title="Resend notification to delivery partners"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}
      <span>{loading ? "Sending..." : "Resend"}</span>
    </button>
  );
}
