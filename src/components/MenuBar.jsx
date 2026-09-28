import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const spring = { duration: 0.28, ease: "easeInOut" };

export function MenuBar({ items }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const railRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tipLeft, setTipLeft] = useState(0);

  useEffect(() => {
    if (activeIndex !== null && railRef.current && tooltipRef.current) {
      const btn = railRef.current.children[activeIndex];
      const railRect = railRef.current.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const tipRect = tooltipRef.current.getBoundingClientRect();
      const left = btnRect.left - railRect.left + (btnRect.width - tipRect.width) / 2;
      setTipLeft(Math.max(0, Math.min(left, railRect.width - tipRect.width)));
    }
  }, [activeIndex]);

  return (
    <div className="mb-wrap">
      {/* Tooltip */}
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            className="mb-tip-outer"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={spring}
          >
            <motion.div
              ref={tooltipRef}
              className="mb-tip"
              initial={{ x: tipLeft }}
              animate={{ x: tipLeft }}
              transition={spring}
            >
              {items[activeIndex].label}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rail */}
      <div ref={railRef} className="mb-rail">
        {items.map((item, i) => (
          <button
            key={i}
            className="mb-btn"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={item.onClick}
            title={item.label}
          >
            <item.icon />
          </button>
        ))}
      </div>
    </div>
  );
}
