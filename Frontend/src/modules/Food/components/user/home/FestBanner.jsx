import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import { getMediaUrl } from "@/shared/utils/media";

export default function FestBanner({ isVegMode, images = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasAdminImages = Array.isArray(images) && images.length > 0;

  // Auto-rotate slider if multiple admin images exist
  useEffect(() => {
    if (!hasAdminImages || images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [hasAdminImages, images?.length]);

  return (
    <div id="fest-banner-root" className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm bg-white dark:bg-zinc-900 border-none aspect-[2.2/1] sm:aspect-[2.6/1] min-h-[160px] max-h-[240px]">
      {hasAdminImages ? (
        /* Admin Uploaded Fest Banner Media Slider */
        <div className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden">
          <AnimatePresence mode="wait">
            {(() => {
              const currentMediaUrl = getMediaUrl(images[currentIndex]);
              const isVideo =
                typeof currentMediaUrl === 'string' &&
                (currentMediaUrl.toLowerCase().endsWith('.mp4') ||
                  currentMediaUrl.toLowerCase().endsWith('.webm') ||
                  currentMediaUrl.toLowerCase().endsWith('.ogg'));

              return isVideo ? (
                <motion.video
                  key={`fest-vid-${currentIndex}-${currentMediaUrl}`}
                  src={currentMediaUrl}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full object-cover rounded-2xl sm:rounded-3xl"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <motion.img
                  key={`fest-img-${currentIndex}-${currentMediaUrl}`}
                  src={currentMediaUrl}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full object-cover rounded-2xl sm:rounded-3xl"
                  alt="Fest Banner"
                />
              );
            })()}
          </AnimatePresence>

          {/* Bottom Dot Indicators for Admin Slider */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              {images.map((_, idx) => (
                <button
                  key={`fest-dot-${idx}`}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    currentIndex === idx
                      ? 'w-5 h-1.5 bg-orange-500'
                      : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Default Fest Banner Card (Same in all sections) */
        <div className="relative w-full h-full bg-gradient-to-r from-zinc-900 via-zinc-950 to-black p-4 sm:p-6 flex items-center justify-between overflow-hidden rounded-2xl sm:rounded-3xl">
          {/* Subtle Glows */}
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-orange-500/25 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/15 blur-3xl rounded-full pointer-events-none" />

          {/* Left Text Block */}
          <div className="relative z-10 flex flex-col justify-center max-w-[62%] sm:max-w-[55%] space-y-1.5">
            <div className="inline-flex items-center gap-1.5 border border-orange-500/40 bg-orange-500/10 px-2 sm:px-2.5 py-0.5 rounded-full w-fit">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-400" />
              <span className="text-[8px] sm:text-[10px] font-bold text-orange-200 tracking-wider uppercase">
                Bitecube Food Delivery Missions
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-2xl font-black italic tracking-tight text-white leading-tight uppercase">
                {isVegMode ? (
                  <span className="text-emerald-400">VEGGIE DELIGHT</span>
                ) : (
                  <>
                    FEAST <span className="text-orange-500">BONANZA</span>
                  </>
                )}
              </h2>
            </div>

            <div className="space-y-0.5">
              <p className="text-[10px] sm:text-xs text-zinc-300 font-medium">
                Big flavors. Bigger savings.
              </p>
              <p className="text-[11px] sm:text-xs font-black text-orange-400 tracking-wide uppercase">
                {isVegMode ? 'PURE VEG MAGIC • FRESH & HEALTHY' : 'UPTO 60% OFF ON YOUR FAVES!'}
              </p>
            </div>

            <div className="pt-1">
              <button className="inline-flex items-center gap-1 bg-white hover:bg-zinc-100 text-black px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold shadow-md transition-transform active:scale-95">
                <span>Order Now</span>
                <ChevronRight className="w-3.5 h-3.5 text-orange-600 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Right Image Graphic */}
          <div className="relative z-10 w-[36%] sm:w-[42%] h-full flex items-center justify-end">
            <img
              src={
                isVegMode
                  ? "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop"
                  : "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop"
              }
              alt="Food Feast"
              className="w-full h-full object-cover rounded-xl sm:rounded-2xl shadow-xl border border-white/10"
            />
          </div>

          {/* Indicator Dots */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            <span className="w-5 h-1.5 bg-orange-500 rounded-full" />
            <span className="w-1.5 h-1.5 bg-white/40 rounded-full" />
            <span className="w-1.5 h-1.5 bg-white/40 rounded-full" />
            <span className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}
