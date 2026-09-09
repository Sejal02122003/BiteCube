import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuickCart } from '../context/QuickCartContext';

export default function QuickStickyCart() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartCount, getCartTotal } = useQuickCart();
  const count = getCartCount();
  const total = getCartTotal();

  const pathname = location.pathname;
  const isShoppingPage =
    pathname === '/' ||
    pathname === '/food/user' ||
    pathname === '/food/user/' ||
    pathname.startsWith('/quick');

  // Hide on cart checkout or tracking pages
  const shouldHide =
    !isShoppingPage ||
    pathname === '/quick/cart' ||
    pathname === '/food/user/cart' ||
    pathname.includes('/checkout') ||
    pathname.includes('/orders/') ||
    !count;

  if (shouldHide) return null;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.8 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
          }}
          exit={{ y: 60, opacity: 0, scale: 0.8 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          className="fixed left-0 right-0 bottom-[calc(76px+max(env(safe-area-inset-bottom,0px),8px))] md:bottom-8 z-[9999] flex justify-center px-4 pointer-events-none"
        >
          {/* Main Floating Cart Pill */}
          <motion.button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/quick/cart');
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: [
                '0px 6px 20px rgba(5,150,105,0.35)',
                '0px 6px 30px rgba(5,150,105,0.65)',
                '0px 6px 20px rgba(5,150,105,0.35)',
              ],
            }}
            transition={{
              boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }}
            aria-label={`Open Quick cart with ${count} items, total ₹${total}`}
            className="pointer-events-auto bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 border border-white/25 text-white rounded-full flex items-center justify-between pl-2.5 pr-4 py-2 min-w-[170px] max-w-[90vw] shadow-2xl transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-center bg-white/20 p-2 rounded-full mr-3 flex-shrink-0">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>

            <div className="flex flex-col flex-1 text-left min-w-0 pr-1">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-extrabold text-[13px] leading-tight">View Cart</span>
                {total > 0 && (
                  <span className="text-[12px] font-black text-emerald-100">· ₹{total}</span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-emerald-100/90 leading-tight truncate">
                {count} {count === 1 ? 'item' : 'items'} added
              </span>
            </div>

            <div className="flex items-center justify-center bg-white/15 rounded-full p-1 ml-1 flex-shrink-0">
              <ChevronRight className="h-4 w-4 text-white" />
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
