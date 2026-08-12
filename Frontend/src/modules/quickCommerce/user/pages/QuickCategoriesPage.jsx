import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QuickCategoriesGrid from "../components/home/QuickCategoriesGrid";
import { fetchPublicQuickCategories } from "../services/homeService";
import { useAppLocation } from "@/modules/Food/hooks/useAppLocation";

export default function QuickCategoriesPage() {
  const navigate = useNavigate();
  const { zoneId, loading: zoneLoading } = useAppLocation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (zoneLoading) return;

    let cancelled = false;

    const run = async () => {
      if (!zoneId) {
        if (!cancelled) {
          setCategories([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const res = await fetchPublicQuickCategories({
          limit: 50,
          sortBy: "sortOrder",
          sortOrder: "asc",
          zoneId,
        });
        if (cancelled) return;
        const list = res?.data?.categories || res?.categories || [];
        setCategories(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [zoneId, zoneLoading]);

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="sticky top-0 z-30 bg-white px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f8ff] text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-[20px] font-black text-slate-900">Categories</h1>
          </div>
        </div>
      </div>

      {loading ? (
        <section className="px-4 py-6">
          <h3 className="mb-4 text-[15px] font-black text-slate-800">Categories</h3>
          <div className="grid grid-cols-4 gap-x-3 gap-y-5">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="flex h-[158px] animate-pulse flex-col items-center text-center">
                <div className="mb-3 h-[92px] w-full rounded-[18px] bg-[#eef6ff]" />
                <div className="h-4 w-16 rounded-full bg-[#eef6ff]" />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <QuickCategoriesGrid categories={categories} />
      )}
    </div>
  );
}
