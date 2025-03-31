'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export const Overview = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Customize these values to adjust size and opacity
  const imageSize = 400; // Increase this value to make the image larger
  const imageOpacity = 0.4; // Adjust this value between 0 and 1 for transparency

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        <div className="flex justify-center">
          {mounted ? (
            resolvedTheme === 'dark' ? (
              // Dark mode - CSS mask approach with adjustable size and opacity
              <div 
                className="bg-gray-500 transition-all duration-300"
                style={{
                  width: `${imageSize}px`,
                  height: `${imageSize}px`,
                  opacity: imageOpacity,
                  maskImage: 'url(/frontend/images/robot-dark.png)',
                  WebkitMaskImage: 'url(/frontend/images/robot-dark.png)',
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                }}
              />
            ) : (
              // Light mode - regular image with adjustable size and opacity
              <div className="transition-all duration-300" style={{ opacity: imageOpacity }}>
                <Image
                  src="/frontend/images/robot-light.png"
                  alt="Robot VP Logo"
                  width={imageSize}
                  height={imageSize}
                  priority
                />
              </div>
            )
          ) : (
            // Placeholder with matching size
            <div style={{ width: `${imageSize}px`, height: `${imageSize}px` }} />
          )}
        </div>
      </div>
    </motion.div>
  );
};