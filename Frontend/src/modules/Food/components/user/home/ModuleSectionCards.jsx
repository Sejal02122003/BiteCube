import React from 'react';
import { ChevronRight } from 'lucide-react';
import orangeRider3d from "@food/assets/category-icons/orange_rider_3d.png";
import foodBasket3d from "@food/assets/category-icons/food_basket_3d.png";

export default function ModuleSectionCards({ activeTab, setActiveTab }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 px-4 pt-4 pb-2">
      {/* Food Section Card (Left Side) - Orange Rider */}
      <div 
        onClick={() => setActiveTab?.('food')}
        className={`relative bg-[#fff7ed] dark:bg-amber-950/25 rounded-xl p-2.5 sm:p-3 border ${activeTab === 'food' ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-orange-100/90 dark:border-amber-900/40'} shadow-sm flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-all overflow-hidden group min-h-[80px] sm:min-h-[88px]`}
      >
        <div className="w-13 h-13 sm:w-15 sm:h-15 shrink-0 flex items-center justify-center -ml-1">
          <img 
            src={orangeRider3d} 
            alt="Food Section" 
            className="w-full h-full object-contain group-hover:scale-105 transition-transform filter drop-shadow-md" 
          />
        </div>

        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white leading-tight">
            Food Section
          </h3>
          <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-tight mt-0.5 line-clamp-2">
            Meals delivered hot & fresh.
          </p>
        </div>

        <div className="absolute bottom-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white dark:bg-zinc-800 shadow-md flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-700">
          <ChevronRight className="w-3 h-3 text-gray-800 dark:text-white stroke-[2.5]" />
        </div>
      </div>

      {/* Quick Section Card (Right Side) - Grocery Basket */}
      <div 
        onClick={() => setActiveTab?.('quick')}
        className={`relative bg-[#eefcf3] dark:bg-emerald-950/25 rounded-xl p-2.5 sm:p-3 border ${activeTab === 'quick' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-emerald-100/90 dark:border-emerald-900/40'} shadow-sm flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-all overflow-hidden group min-h-[80px] sm:min-h-[88px]`}
      >
        <div className="w-13 h-13 sm:w-15 sm:h-15 shrink-0 flex items-center justify-center -ml-1">
          <img 
            src={foodBasket3d} 
            alt="Quick Section" 
            className="w-full h-full object-contain group-hover:scale-105 transition-transform filter drop-shadow-md" 
          />
        </div>

        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white leading-tight">
            Quick Section
          </h3>
          <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-tight mt-0.5 line-clamp-2">
            Groceries in minutes.
          </p>
        </div>

        <div className="absolute bottom-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white dark:bg-zinc-800 shadow-md flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-700">
          <ChevronRight className="w-3 h-3 text-gray-800 dark:text-white stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
}
