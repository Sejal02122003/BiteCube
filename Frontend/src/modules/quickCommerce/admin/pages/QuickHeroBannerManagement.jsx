import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUp, 
  ArrowDown, 
  Zap,
  Eye,
  EyeOff
} from "lucide-react";
import { adminClient } from "@/services/api/axios";
import { getMediaUrl } from "@/shared/utils/media";
import { Button } from "@food/components/ui/button";

export default function QuickHeroBannerManagement() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await adminClient.get("/quick-commerce/admin/hero-banners");
      const list = res?.data?.data?.banners || res?.data?.banners || [];
      setBanners(list);
    } catch (err) {
      showToast("Failed to load Quick Commerce hero banners", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await adminClient.post(
        "/quick-commerce/admin/hero-banners/multiple",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response?.data?.success) {
        showToast(`${files.length} banner(s) uploaded successfully!`);
        await fetchBanners();
      } else {
        showToast(response?.data?.message || "Failed to upload banners", "error");
      }
    } catch (err) {
      showToast(err?.response?.data?.message || "Error uploading banner images", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this hero banner?")) return;
    try {
      await adminClient.delete(`/quick-commerce/admin/hero-banners/${id}`);
      showToast("Hero banner deleted successfully!");
      fetchBanners();
    } catch (err) {
      showToast("Failed to delete banner", "error");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await adminClient.patch(`/quick-commerce/admin/hero-banners/${id}/status`, {
        isActive: !currentStatus,
      });
      showToast(`Banner ${!currentStatus ? "activated" : "deactivated"}`);
      fetchBanners();
    } catch (err) {
      showToast("Failed to update banner status", "error");
    }
  };

  const handleMove = async (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= banners.length) return;

    const currentBanner = banners[index];
    const targetBanner = banners[newIndex];

    try {
      await adminClient.patch(`/quick-commerce/admin/hero-banners/${currentBanner._id}/order`, {
        sortOrder: newIndex,
      });
      await adminClient.patch(`/quick-commerce/admin/hero-banners/${targetBanner._id}/order`, {
        sortOrder: index,
      });
      fetchBanners();
    } catch (err) {
      showToast("Failed to reorder banners", "error");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold border text-white ${
            toastMessage.type === "error" ? "bg-red-600 border-red-500" : "bg-emerald-600 border-emerald-500"
          }`}
        >
          {toastMessage.type === "error" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-500" />
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Quick Commerce Hero Banner Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Upload, toggle, and reorder hero banners specifically for the Quick Commerce user home screen.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="image/*"
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{uploading ? "Uploading..." : "Upload New Banner"}</span>
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        /* Banner List Gallery Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <span>Active Banners ({banners.length})</span>
            </h2>
          </div>

          {banners.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 space-y-3">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto">
                <ImageIcon className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                No Quick Commerce Banners Uploaded
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Click "Upload New Banner" to add custom Quick Commerce hero banner slides.
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl mt-2"
              >
                Upload First Banner
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {banners.map((banner, index) => {
                const fullUrl = getMediaUrl(banner.imageUrl);

                return (
                  <div
                    key={banner._id || index}
                    className={`relative bg-white dark:bg-zinc-900 rounded-2xl border p-3 shadow-sm group space-y-3 flex flex-col justify-between transition-all ${
                      banner.isActive
                        ? "border-gray-100 dark:border-zinc-800"
                        : "border-gray-200 dark:border-zinc-800 opacity-60"
                    }`}
                  >
                    {/* Media Display Container */}
                    <div className="relative aspect-[2.4/1] w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800">
                      <img
                        src={fullUrl}
                        alt={`Quick Banner ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Slide Badge */}
                      <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20">
                        Slide #{index + 1}
                      </span>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMove(index, "up")}
                          disabled={index === 0}
                          className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300 disabled:opacity-30"
                          title="Move Left/Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMove(index, "down")}
                          disabled={index === banners.length - 1}
                          className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300 disabled:opacity-30"
                          title="Move Right/Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(banner._id, banner.isActive)}
                          className="text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1"
                        >
                          {banner.isActive ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600">Active</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-400">Inactive</span>
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(banner._id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
