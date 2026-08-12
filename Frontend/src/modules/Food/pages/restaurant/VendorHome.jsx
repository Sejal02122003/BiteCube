import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Loader2,
  MapPin,
  Package,
  Phone,
  Save,
  ShoppingBasket,
  Store,
  UserRound,
} from "lucide-react";
import { Button } from "@food/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@food/components/ui/card";
import { Input } from "@food/components/ui/input";
import { Label } from "@food/components/ui/label";
import { Textarea } from "@food/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@food/components/ui/select";
import { Badge } from "@food/components/ui/badge";
import { Switch } from "@food/components/ui/switch";
import { getCurrentUser } from "@food/utils/auth";
import { sellerAPI } from "@food/api";
import { toast } from "sonner";

const BUSINESS_TYPE_OPTIONS = [
  { value: "general-store", label: "General Store" },
  { value: "grocery", label: "Grocery" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "pet-store", label: "Pet Store" },
  { value: "meat-store", label: "Meat Store" },
  { value: "florist", label: "Florist" },
  { value: "other", label: "Other" },
];

export default function VendorHome() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getCurrentUser("restaurant"), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seller, setSeller] = useState(null);
  const [form, setForm] = useState({
    storeName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    alternatePhone: "",
    businessType: "general-store",
    description: "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    isAcceptingOrders: true,
  });

  useEffect(() => {
    let cancelled = false;

    const loadSellerProfile = async () => {
      try {
        setLoading(true);
        const response = await sellerAPI.getProfile();
        const payload =
          response?.data?.data?.seller ||
          response?.data?.seller ||
          response?.data?.data ||
          response?.data;

        if (cancelled || !payload) return;

        setSeller(payload);
        setForm({
          storeName: payload.storeName || "",
          ownerName: payload.ownerName || "",
          ownerEmail: payload.ownerEmail || payload.email || "",
          ownerPhone: payload.ownerPhone || payload.phone || "",
          alternatePhone: payload.alternatePhone || "",
          businessType: payload.businessType || "general-store",
          description: payload.description || "",
          addressLine1: payload.addressLine1 || "",
          city: payload.city || "",
          state: payload.state || "",
          pincode: payload.pincode || "",
          landmark: payload.landmark || "",
          isAcceptingOrders: payload.isAcceptingOrders !== false,
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.response?.data?.message || "Failed to load seller profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSellerProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const sellerName =
    seller?.storeName ||
    currentUser?.storeName ||
    currentUser?.name ||
    "Quick Commerce Seller";

  const partnerOwner =
    seller?.ownerName ||
    currentUser?.ownerName ||
    "Seller Owner";

  const partnerPhone =
    seller?.ownerPhone ||
    seller?.phone ||
    currentUser?.phone ||
    "No phone available";

  const statusTone =
    seller?.status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : seller?.status === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        ownerPhone: undefined,
      };
      const response = await sellerAPI.updateProfile(payload);
      const updatedSeller =
        response?.data?.data?.seller ||
        response?.data?.seller ||
        response?.data?.data ||
        response?.data;

      if (updatedSeller) {
        setSeller(updatedSeller);
      }
      toast.success("Seller profile updated successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update seller profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-10 font-['Poppins']">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] bg-gradient-to-br from-[#7e3866] via-[#8f476f] to-[#b76f2c] p-8 text-white shadow-[0_30px_80px_rgba(126,56,102,0.28)]">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-white/70">
            Seller Partner
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight font-['Outfit']">
            {sellerName}
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-white/85">
            Your quick commerce seller account is connected to the partner app.
            This is the seller landing screen while we wire the full catalog,
            inventory, and order dashboard flows into this app shell.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Store,
              title: "Seller Auth Connected",
              text: "OTP login, registration, approval states, and seller profile token storage are now working through the partner app."
            },
            {
              icon: ShoppingBasket,
              title: "Quick Commerce Separate",
              text: "Seller accounts are kept separate from food restaurants, which keeps products, payouts, and ownership cleaner."
            },
            {
              icon: Package,
              title: "Next Integration",
              text: "The next build step is connecting seller product, stock, and order operations to this vendor home."
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7e8f1] text-[#7e3866]">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-lg font-black text-slate-900 font-['Outfit']">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-[1.75rem] border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle className="text-xl font-black text-slate-900 font-['Outfit']">
                Seller Workspace
              </CardTitle>
              <CardDescription>
                Update your store identity, quick commerce description, and storefront details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex min-h-[320px] items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#7e3866]" />
                    <p className="mt-3 text-sm text-slate-500">Loading seller workspace...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Store Name</Label>
                      <Input value={form.storeName} onChange={(e) => handleFieldChange("storeName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Owner Name</Label>
                      <Input value={form.ownerName} onChange={(e) => handleFieldChange("ownerName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Owner Email</Label>
                      <Input type="email" value={form.ownerEmail} onChange={(e) => handleFieldChange("ownerEmail", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Phone</Label>
                      <Input value={form.ownerPhone} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Alternate Phone</Label>
                      <Input value={form.alternatePhone} onChange={(e) => handleFieldChange("alternatePhone", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Type</Label>
                      <Select value={form.businessType} onValueChange={(value) => handleFieldChange("businessType", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Store Description</Label>
                    <Textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) => handleFieldChange("description", e.target.value)}
                      placeholder="Tell customers what your quick commerce store specializes in."
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Address Line 1</Label>
                      <Input value={form.addressLine1} onChange={(e) => handleFieldChange("addressLine1", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={form.city} onChange={(e) => handleFieldChange("city", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input value={form.state} onChange={(e) => handleFieldChange("state", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pincode</Label>
                      <Input value={form.pincode} onChange={(e) => handleFieldChange("pincode", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Landmark</Label>
                      <Input value={form.landmark} onChange={(e) => handleFieldChange("landmark", e.target.value)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Accepting Orders</p>
                      <p className="text-xs text-slate-500">
                        Control whether your store is shown as ready to take quick commerce orders.
                      </p>
                    </div>
                    <Switch
                      checked={form.isAcceptingOrders}
                      onCheckedChange={(checked) => handleFieldChange("isAcceptingOrders", checked)}
                    />
                  </div>

                  <Button
                    type="button"
                    className="h-12 rounded-2xl bg-[#7e3866] px-6 text-white hover:bg-[#6d2f57]"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Seller Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[1.75rem] border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardHeader>
                <CardTitle className="text-xl font-black text-slate-900 font-['Outfit']">
                  Seller Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Approval Status</span>
                  <Badge className={statusTone}>
                    {String(seller?.status || currentUser?.status || "pending").replace(/^\w/, (char) => char.toUpperCase())}
                  </Badge>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{partnerOwner}</p>
                    <p className="text-xs text-slate-500">Primary seller contact</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{partnerPhone}</p>
                    <p className="text-xs text-slate-500">Login and support phone</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {seller?.city || form.city || "City not added"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {seller?.state || form.state || "State not added"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <CardHeader>
                <CardTitle className="text-xl font-black text-slate-900 font-['Outfit']">
                  Next Seller Build
                </CardTitle>
                <CardDescription>
                  These are the next partner-app sections to connect for seller operations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Seller catalog and product creation",
                  "Inventory and stock updates",
                  "Quick commerce order queue",
                  "Seller earnings and payout summary",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-2xl border-slate-300"
              onClick={() => navigate("/food/restaurant/login?partner=seller", { replace: true })}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Switch Seller Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
