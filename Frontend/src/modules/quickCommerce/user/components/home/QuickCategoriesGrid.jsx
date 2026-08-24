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
              className="flex h-[158px] flex-col items-center text-center"
            >
              <div className={`mb-3 flex h-[92px] w-full items-center justify-center rounded-[18px] bg-[#eef8ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] overflow-hidden ${slug === 'all' ? 'p-0' : 'p-3'}`}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={category.name}
                    className={`h-full w-full ${slug === 'all' ? 'object-cover scale-[1.35]' : 'object-contain'}`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-gradient-to-br from-[#d9efff] to-[#f7fbff] text-lg font-black text-[#2f80ed]">
                    {initials}
                  </div>
                )}
              </div>
              <span className="line-clamp-3 min-h-[54px] text-[11px] font-extrabold leading-[1.2rem] text-slate-700">
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
