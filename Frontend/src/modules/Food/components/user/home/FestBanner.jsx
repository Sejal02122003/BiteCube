import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import { getMediaUrl } from "@/shared/utils/media";

export default function FestBanner({ isVegMode, images = [], children }) {
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
    <div
      id="fest-banner-root"
      className="relative w-full shadow-none bg-transparent border-none px-0 mx-0"
    >
      {/* Background Container for Full-Bleed Fest Banner */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-b-2xl sm:rounded-b-3xl">
        {hasAdminImages ? (
          /* Admin Uploaded Fest Banner Media Slider */
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
                  className="w-full h-full object-cover"
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
                  className="w-full h-full object-cover"
                  alt="Fest Banner"
                />
              );
            })()}
          </AnimatePresence>
        ) : (
          /* Default Fest Banner Dark Gradient Background */
          <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-zinc-950 to-black">
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-orange-500/25 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/15 blur-3xl rounded-full pointer-events-none" />
          </div>
        )}

        {/* Top Dark Shade Overlay for guaranteed text contrast on Location Header */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-1 pointer-events-none" />
      </div>

      {/* Foreground Layer */}
      <div className="relative z-10 w-full flex flex-col justify-between">
        {/* Top Header: Location, Search bar, Veg mode toggle */}
        <div className="w-full">
          {children}
        </div>

        {/* Banner Content Area */}
        {hasAdminImages ? (
          /* Admin Slider Bottom Indicator Area */
          <div className="relative w-full h-44 sm:h-56 min-h-[180px] sm:min-h-[220px] flex items-end justify-center pb-4 px-4">
            {images.length > 1 && (
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
                {images.map((_, idx) => (
                  <button
                    key={`fest-dot-${idx}`}
                    onClick={() => setCurrentIndex(idx)}
                    className={`transition-all duration-300 rounded-full ${
                      currentIndex === idx
                        ? 'w-6 h-1.5 bg-orange-500'
                        : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Default Fest Banner Text & Graphic Content */
          <div className="relative w-full px-4 sm:px-6 pt-2 pb-5 sm:pb-6 flex items-center justify-between overflow-hidden min-h-[180px] sm:min-h-[220px]">
            {/* Left Text Block */}
            <div className="flex flex-col justify-center max-w-[62%] sm:max-w-[55%] space-y-2">
              <div className="inline-flex items-center gap-1.5 border border-orange-500/40 bg-orange-500/10 px-2.5 py-0.5 rounded-full w-fit">
                <Sparkles className="w-3 h-3 text-orange-400" />
                <span className="text-[9px] sm:text-[11px] font-bold text-orange-200 tracking-wider uppercase">
                  Bitecube Food Delivery Missions
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-3xl font-black italic tracking-tight text-white leading-tight uppercase">
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
                <p className="text-xs sm:text-sm text-zinc-300 font-medium">
                  Big flavors. Bigger savings.
                </p>
                <p className="text-xs sm:text-sm font-black text-orange-400 tracking-wide uppercase">
                  {isVegMode ? 'PURE VEG MAGIC • FRESH & HEALTHY' : 'UPTO 60% OFF ON YOUR FAVES!'}
                </p>
              </div>

              <div className="pt-1.5">
                <button className="inline-flex items-center gap-1.5 bg-white hover:bg-zinc-100 text-black px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg transition-transform active:scale-95">
                  <span>Order Now</span>
                  <ChevronRight className="w-4 h-4 text-orange-600 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Right Image Graphic */}
            <div className="w-[36%] sm:w-[42%] h-32 sm:h-44 flex items-center justify-end">
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
          </div>
        )}
      </div>
    </div>
  );
}
