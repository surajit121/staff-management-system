import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

/**
 * AnimatedCounter counts up smoothly to a target value using premium easing.
 * Supports prefix, suffix, and custom decimal placement.
 */
export default function AnimatedCounter({ 
  value, 
  decimals = 0, 
  prefix = '', 
  suffix = '', 
  duration = 1.2 
}) {
  const count = useMotionValue(0);
  
  // Format the animated value to a localized string with specified decimal points
  const display = useTransform(count, (latest) => {
    const formatted = latest.toFixed(decimals);
    
    // For currency/integers, apply Indian numbering system grouping
    if (decimals === 0) {
      const num = parseInt(formatted, 10);
      return isNaN(num) ? '0' : num.toLocaleString('en-IN');
    }
    return formatted;
  });

  useEffect(() => {
    // Animate the motion value to the final value using custom cubic bezier ease
    const animation = animate(count, value, { 
      duration: duration, 
      ease: [0.16, 1, 0.3, 1] // easeOutExpo
    });
    return animation.stop;
  }, [value, duration, count]);

  return (
    <span className="tabular-nums font-bold">
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}
