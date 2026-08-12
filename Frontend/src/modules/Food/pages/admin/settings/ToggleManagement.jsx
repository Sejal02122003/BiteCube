import { useState, useEffect, useRef } from "react";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminAPI } from "@food/api";
import { setCachedSettings } from "@food/utils/businessSettings";

const TOGGLE_LABELS = {
  onlinePaymentOnly: "Online payment only",
  maintenanceMode: "Maintenance mode",
  customerRegistration: "Customer registration",
  restaurantRegistration: "Restaurant registration",
  deliveryRegistration: "Delivery partner registration",
};

export default function ToggleManagement() {
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState(null);

  const [toggles, setToggles] = useState({
    onlinePaymentOnly: false,
    maxCodAmount: 0,
    uploadProvider: "system",
    maintenanceMode: false,
    customerRegistration: true,
    restaurantRegistration: true,
    deliveryRegistration: true,
  });

  const codSaveTimerRef = useRef(null);

  useEffect(() => {
    fetchBusinessSettings();
    return () => {
      if (codSaveTimerRef.current) clearTimeout(codSaveTimerRef.current);
    };
  }, []);

  const fetchBusinessSettings = async () => {
    try {
      setLoading(true);
      const businessResponse = await adminAPI.getBusinessSettings();
      const settings = businessResponse?.data?.data || businessResponse?.data;

      if (settings) {
        setToggles((prev) => ({
          ...prev,
          onlinePaymentOnly: settings.onlinePaymentOnly || false,
          maxCodAmount: settings.maxCodAmount || 0,
          uploadProvider: settings.uploadProvider === "cloudinary" ? "cloudinary" : "system",
          maintenanceMode: settings.maintenanceMode || false,
          customerRegistration: settings.customerRegistration !== false,
          restaurantRegistration: settings.restaurantRegistration !== false,
          deliveryRegistration: settings.deliveryRegistration !== false,
        }));
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load toggle settings");
    } finally {
      setLoading(false);
    }
  };

  const persistToggles = async (patch, fieldKey) => {
    setSavingField(fieldKey || null);
    try {
      const response = await adminAPI.updateBusinessToggles(patch);
      const updated = response?.data?.data || response?.data;
      if (updated) {
        setCachedSettings(updated);
        window.dispatchEvent(new CustomEvent("businessSettingsUpdated"));
      }
      if (fieldKey && TOGGLE_LABELS[fieldKey]) {
        toast.success(`${TOGGLE_LABELS[fieldKey]} updated`);
      } else if (fieldKey === "maxCodAmount") {
        toast.success("Max COD amount updated");
      }
    } catch (error) {
      await fetchBusinessSettings();
      toast.error(error?.response?.data?.message || "Failed to save toggle settings");
      throw error;
    } finally {
      setSavingField(null);
    }
  };

  const handleToggleChange = async (field) => {
    const nextValue = !toggles[field];
    setToggles((prev) => ({ ...prev, [field]: nextValue }));
    try {
      await persistToggles({ [field]: nextValue }, field);
    } catch {
      // state reverted in persistToggles via fetchBusinessSettings
    }
  };

  const handleInputChange = (field, value) => {
    setToggles((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field !== "maxCodAmount") return;

    if (codSaveTimerRef.current) clearTimeout(codSaveTimerRef.current);
    codSaveTimerRef.current = setTimeout(async () => {
      try {
        await persistToggles({ maxCodAmount: Number(value) || 0 }, "maxCodAmount");
      } catch {
        // handled in persistToggles
      }
    }, 600);
  };

  const handleUploadProviderChange = async (provider) => {
    const nextProvider = provider === "cloudinary" ? "cloudinary" : "system";
    if (toggles.uploadProvider === nextProvider) return;

    const previousProvider = toggles.uploadProvider;
    setToggles((prev) => ({
      ...prev,
      uploadProvider: nextProvider,
    }));

    try {
      await persistToggles({ uploadProvider: nextProvider }, "uploadProvider");
      toast.success(`Upload provider switched to ${nextProvider === "cloudinary" ? "Cloudinary" : "System"}`);
    } catch {
      setToggles((prev) => ({
        ...prev,
        uploadProvider: previousProvider,
      }));
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isSaving = (field) => savingField === field;

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Toggle Management</h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Enable or disable system modules and features dynamically.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 max-w-md">
          <div className="mt-0.5">
            <Info className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xs lg:text-sm text-slate-700">
            <p className="font-semibold text-amber-700 mb-0.5">Note</p>
            <p>Toggles save instantly when you switch them. Max COD amount saves automatically after you stop typing.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">System Features</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex flex-col gap-4 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                  <p className="text-sm font-semibold text-slate-800">Upload Provider</p>
                  <p className="text-xs text-slate-500 mt-0.5">Switch new uploads between Local / VPS storage and Cloudinary</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold ${toggles.uploadProvider === "cloudinary" ? "text-slate-400" : "text-slate-900"}`}>
                      Local / VPS
                    </span>
                    <button
                      type="button"
                      disabled={isSaving("uploadProvider")}
                      onClick={() =>
                        handleUploadProviderChange(
                          toggles.uploadProvider === "cloudinary" ? "system" : "cloudinary",
                        )
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                        toggles.uploadProvider === "cloudinary" ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      {isSaving("uploadProvider") ? (
                        <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" />
                      ) : (
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            toggles.uploadProvider === "cloudinary" ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      )}
                    </button>
                    <span className={`text-xs font-semibold ${toggles.uploadProvider === "cloudinary" ? "text-blue-700" : "text-slate-400"}`}>
                      Cloudinary
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">How this works</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500">
                    <li>`Local / VPS` stores uploaded files on your server disk.</li>
                    <li>If `NODE_ENV=development`, files save in `Backend/uploads`.</li>
                    <li>If `NODE_ENV=production`, files save in `/var/www/uploads`.</li>
                    <li>`Cloudinary` stores uploaded files in your Cloudinary account using the backend `.env` credentials.</li>
                    <li>This toggle affects only new uploads. Existing files stay where they were already uploaded.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Online Payment Only</p>
                  <p className="text-xs text-slate-500 mt-0.5">Disable Cash on Delivery globally</p>
                </div>
                <button
                  type="button"
                  disabled={isSaving("onlinePaymentOnly")}
                  onClick={() => handleToggleChange("onlinePaymentOnly")}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                    toggles.onlinePaymentOnly ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  {isSaving("onlinePaymentOnly") ? (
                    <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        toggles.onlinePaymentOnly ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  )}
                </button>
              </div>

              {!toggles.onlinePaymentOnly && (
                <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Max COD Amount</p>
                    <p className="text-xs text-slate-500 mt-0.5">Disable COD if order exceeds this amount (0 for no limit)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={toggles.maxCodAmount}
                      onChange={(e) => handleInputChange("maxCodAmount", e.target.value)}
                      className="w-24 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isSaving("maxCodAmount") && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Maintenance Mode</p>
                  <p className="text-xs text-slate-500 mt-0.5">Suspend all customer ordering temporarily</p>
                </div>
                <button
                  type="button"
                  disabled={isSaving("maintenanceMode")}
                  onClick={() => handleToggleChange("maintenanceMode")}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                    toggles.maintenanceMode ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  {isSaving("maintenanceMode") ? (
                    <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        toggles.maintenanceMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Customer Registration</p>
                  <p className="text-xs text-slate-500 mt-0.5">Allow new customers to sign up</p>
                </div>
                <button
                  type="button"
                  disabled={isSaving("customerRegistration")}
                  onClick={() => handleToggleChange("customerRegistration")}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                    toggles.customerRegistration ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  {isSaving("customerRegistration") ? (
                    <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        toggles.customerRegistration ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Restaurant Registration</p>
                  <p className="text-xs text-slate-500 mt-0.5">Allow new restaurants to join</p>
                </div>
                <button
                  type="button"
                  disabled={isSaving("restaurantRegistration")}
                  onClick={() => handleToggleChange("restaurantRegistration")}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                    toggles.restaurantRegistration ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  {isSaving("restaurantRegistration") ? (
                    <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        toggles.restaurantRegistration ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Delivery Partner Registration</p>
                  <p className="text-xs text-slate-500 mt-0.5">Allow new delivery riders to join</p>
                </div>
                <button
                  type="button"
                  disabled={isSaving("deliveryRegistration")}
                  onClick={() => handleToggleChange("deliveryRegistration")}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                    toggles.deliveryRegistration ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  {isSaving("deliveryRegistration") ? (
                    <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        toggles.deliveryRegistration ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

