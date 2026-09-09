import { Link } from "react-router-dom"
import { X, ChevronRight, ShoppingCart } from "lucide-react"
import { useCart } from "@food/context/CartContext"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function StickyCartCard() {
  const { cart, getCartCount } = useCart()
  const [isVisible, setIsVisible] = useState(true)
  const cartCount = getCartCount()

  // Don't render if cart is empty
  if (cartCount === 0) return null

  // Animation variants for the popout effect
  const cardVariants = {
    initial: {
      opacity: 1,
      scale: 0.8,
      y: 20,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 25,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 40,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-[calc(82px+max(env(safe-area-inset-bottom,0px),10px))] md:bottom-8 right-4 md:right-6 z-[60] flex justify-end pointer-events-none"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={cardVariants}
        >
          <Link
            to="/food/user/cart"
            className="pointer-events-auto bg-orange-500 hover:bg-orange-600 shadow-[0_4px_18px_rgba(255,102,0,0.45)] border-2 border-white/30 text-white rounded-full flex items-center justify-center p-3 sm:p-3.5 transition-all transform hover:scale-110 active:scale-95 group relative cursor-pointer"
          >
            <ShoppingCart className="h-6 w-6 text-white" />
            <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white dark:border-[#0a0a0a] shadow-sm">
              {cartCount}
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

