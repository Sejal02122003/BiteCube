import React from "react";
import { Link } from "react-router-dom";
import { getMediaUrl } from "@/shared/utils/media";

export default function QuickCategoriesGrid({ categories = [] }) {
  const displayCategories = (Array.isArray(categories) ? categories : []).filter(
    (category) => category?.name,
  );

  if (displayCategories.length === 0) {
    return null;
  }

  return (
    <section className="px-4 py-6">
      <h3 className="mb-4 text-[15px] font-black text-slate-800">Categories</h3>
      <div className="grid grid-cols-4 gap-x-3 gap-y-5">
        {displayCategories.map((category) => {
          const slug = category?.slug || String(category?.name || "").toLowerCase().replace(/\s+/g, "-");
          const imageSource = category?.image || category?.icon || category?.bannerImage || "";
          const imageUrl = imageSource ? getMediaUrl(imageSource) : "";
          const initials = String(category?.name || "?").trim().slice(0, 1).toUpperCase();

          return (
            <Link
              key={category?._id || category?.id || slug}
              to={`/quick/category/${slug}`}
              className="flex h-[128px] flex-col items-center text-center"
            >
              <div className="mb-2 flex h-[68px] w-full items-center justify-center rounded-[18px] bg-[#eef8ff] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={category.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-gradient-to-br from-[#d9efff] to-[#f7fbff] text-lg font-black text-[#2f80ed]">
                    {initials}
                  </div>
                )}
              </div>
              <span className="line-clamp-3 min-h-[48px] text-[11px] font-extrabold leading-4 text-slate-700">
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
