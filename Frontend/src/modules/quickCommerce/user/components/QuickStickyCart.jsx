import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuickCart } from '../context/QuickCartContext';

export default function QuickStickyCart() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartCount } = useQuickCart();
  const count = getCartCount();
  const isShoppingPage = location.pathname === '/' || location.pathname === '/food/user' || location.pathname.startsWith('/quick');

  if (!isShoppingPage || location.pathname === '/quick/cart' || !count) return null;

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.75, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.75, y: 30 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => navigate('/quick/cart')}
        aria-label={`Open Quick cart with ${count} items`}
        className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-emerald-600 text-white shadow-[0_6px_22px_rgba(5,150,105,.4)] md:bottom-8 md:right-6"
      >
        <ShoppingCart className="h-6 w-6" />
        <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full border-2 border-white bg-slate-950 px-1 text-center text-[10px] font-black leading-4 text-white">{count}</span>
      </motion.button>
    </AnimatePresence>
  );
}
