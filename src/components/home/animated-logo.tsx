'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export function AnimatedLogo() {
  const [flightKey, setFlightKey] = useState(0);

  const triggerFlight = () => {
    setFlightKey(prev => prev + 1);
  };

  return (
    <motion.div
      className="relative inline-block w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl max-h-[220px] md:max-h-[260px] aspect-[848/380] select-none mx-auto cursor-pointer group"
      onClick={triggerFlight}
      title="Click to see the crown fly!"
      animate={{
        y: [0, -4, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Lightbulb glowing warm pulse */}
      <motion.div
        className="absolute rounded-full pointer-events-none blur-xl bg-amber-400/40 dark:bg-amber-400/25"
        style={{
          left: '17%',
          top: '57%',
          width: '18%',
          height: '34%',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          opacity: [0.35, 0.9, 0.45, 0.85, 0.35],
          scale: [0.92, 1.15, 0.96, 1.12, 0.92],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Base Logo without the crown */}
      <motion.img
        src="/founders-got-patent-base.png"
        alt="Founder's Got Patent"
        className="w-full h-full object-contain relative z-10 select-none pointer-events-none"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Dynamic Flying Crown */}
      <motion.img
        key={flightKey}
        src="/founders-got-patent-crown.png"
        alt="Crown"
        className="absolute inset-0 w-full h-full object-contain z-20 select-none pointer-events-none drop-shadow-sm"
        style={{
          transformOrigin: '84% 26%',
        }}
        initial={{
          y: 0,
          x: 0,
          rotate: 0,
          scale: 1,
        }}
        animate={{
          // On load & trigger: gentle subtle lift and arc, landing right back on the logo with a soft bounce
          y: [0, -16, -26, -8, 0],
          x: [0, 6, 10, 3, 0],
          rotate: [0, -6, 5, -2, 0],
          scale: [1, 1.04, 1.08, 1.02, 1],
        }}
        transition={{
          duration: 1.8,
          times: [0, 0.3, 0.6, 0.85, 1],
          ease: [0.25, 1, 0.5, 1],
          delay: flightKey === 0 ? 0.35 : 0,
        }}
      />

      {/* Sparkle Glint on Crown Tip when it lands */}
      <motion.div
        key={`glint-${flightKey}`}
        className="absolute pointer-events-none z-30"
        style={{ top: '6%', left: '84%', transform: 'translate(-50%, -50%)' }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0, 0, 1, 0, 0, 0.85, 0],
          scale: [0, 0, 1.4, 0, 0, 1.1, 0],
          rotate: [0, 0, 90, 180, 180, 270, 360],
        }}
        transition={{
          duration: 6,
          times: [0, 0.35, 0.42, 0.5, 0.75, 0.82, 0.9],
          repeat: Infinity,
          delay: flightKey === 0 ? 0.6 : 0.2,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)]">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="currentColor"/>
        </svg>
      </motion.div>

      {/* Lightbulb Sparkle */}
      <motion.div
        className="absolute pointer-events-none z-30"
        style={{ top: '60%', left: '17%', transform: 'translate(-50%, -50%)' }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0, 0.95, 0],
          scale: [0, 1.25, 0],
          rotate: [0, 45, 90],
        }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          repeatDelay: 1.8,
          delay: 1.2,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.9)]">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="currentColor"/>
        </svg>
      </motion.div>
    </motion.div>
  );
}
