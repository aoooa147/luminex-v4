'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface Logo3DProps {
  size?: number;
  interactive?: boolean;
  className?: string;
}

const Logo3D: React.FC<Logo3DProps> = ({
  size = 160,
  interactive = true,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse tracking for 3D tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), {
    stiffness: 150,
    damping: 15
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), {
    stiffness: 150,
    damping: 15
  });

  useEffect(() => {
    if (!interactive || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const x = (e.clientX - centerX) / (rect.width / 2);
      const y = (e.clientY - centerY) / (rect.height / 2);

      mouseX.set(x);
      mouseY.set(y);
    };

    const handleMouseLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
      setIsHovered(false);
    };

    const container = containerRef.current;
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseenter', () => setIsHovered(true));

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [interactive, mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        width: size,
        height: size,
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        style={{
          width: '100%',
          height: '100%',
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={!interactive || !isHovered ? {
          rotateY: [0, 360],
        } : {}}
        transition={!interactive || !isHovered ? {
          duration: 20,
          repeat: Infinity,
          ease: 'linear'
        } : {}}
      >
        {/* Outer glowing ring with dots */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            width: '120%',
            height: '120%',
            left: '-10%',
            top: '-10%',
            transform: 'translateZ(-5px)',
            border: '2px solid rgba(184, 148, 31, 0.25)',
            borderStyle: 'dashed',
            borderDasharray: '8 6',
            boxShadow: '0 0 15px rgba(184, 148, 31, 0.3), inset 0 0 15px rgba(184, 148, 31, 0.15)',
          } as React.CSSProperties}
          animate={{
            rotate: [0, 360],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            rotate: {
              duration: 15,
              repeat: Infinity,
              ease: 'linear',
            },
            opacity: {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        >
          {/* Glowing dots on ring */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 360) / 12;
            const radius = 50;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;

            return (
              <motion.div
                key={`dot-${i}`}
                className="absolute rounded-full"
                style={{
                  width: '4px',
                  height: '4px',
                  left: `calc(50% + ${x}% - 2px)`,
                  top: `calc(50% + ${y}% - 2px)`,
                  background: 'radial-gradient(circle, rgba(184, 148, 31, 0.8) 0%, rgba(184, 148, 31, 0) 70%)',
                  boxShadow: '0 0 6px rgba(184, 148, 31, 0.6), 0 0 12px rgba(184, 148, 31, 0.3)',
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut',
                }}
              />
            );
          })}
        </motion.div>

        {/* Main 3D Coin/Medallion */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            transform: 'translateZ(10px)',
            background: `
              radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.25) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.35) 0%, transparent 50%),
              linear-gradient(135deg,
                #b8941f 0%,
                #d4af37 20%,
                #c9a832 35%,
                #b8941f 50%,
                #a0821a 65%,
                #b8941f 80%,
                #c9a832 100%
              )
            `,
            boxShadow: `
              inset 0 6px 12px rgba(255, 255, 255, 0.3),
              inset 0 -6px 12px rgba(0, 0, 0, 0.5),
              inset 0 0 30px rgba(184, 148, 31, 0.25),
              0 8px 24px rgba(0, 0, 0, 0.7),
              0 0 30px rgba(184, 148, 31, 0.3),
              0 0 60px rgba(184, 148, 31, 0.15)
            `,
            border: '2px solid rgba(184, 148, 31, 0.4)',
          }}
          animate={{
            boxShadow: [
              'inset 0 6px 12px rgba(255, 255, 255, 0.3), inset 0 -6px 12px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(184, 148, 31, 0.25), 0 8px 24px rgba(0, 0, 0, 0.7), 0 0 30px rgba(184, 148, 31, 0.3), 0 0 60px rgba(184, 148, 31, 0.15)',
              'inset 0 8px 16px rgba(255, 255, 255, 0.35), inset 0 -8px 16px rgba(0, 0, 0, 0.4), inset 0 0 40px rgba(184, 148, 31, 0.3), 0 12px 32px rgba(0, 0, 0, 0.8), 0 0 40px rgba(184, 148, 31, 0.4), 0 0 70px rgba(184, 148, 31, 0.2)',
              'inset 0 6px 12px rgba(255, 255, 255, 0.3), inset 0 -6px 12px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(184, 148, 31, 0.25), 0 8px 24px rgba(0, 0, 0, 0.7), 0 0 30px rgba(184, 148, 31, 0.3), 0 0 60px rgba(184, 148, 31, 0.15)',
            ],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Metallic texture overlay */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(255, 255, 255, 0.03) 2px,
                  rgba(255, 255, 255, 0.03) 4px
                ),
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 2px,
                  rgba(0, 0, 0, 0.03) 2px,
                  rgba(0, 0, 0, 0.03) 4px
                )
              `,
              transform: 'translateZ(1px)',
            }}
          />

          {/* Center content with L and LUMINEX */}
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'translateZ(5px)' }}>
            {/* Large 3D Letter L */}
            <motion.div
              className="relative"
              style={{
                fontSize: `${size * 0.35}px`,
                fontWeight: 900,
                                  color: '#1a1a1a',
                  textShadow: `
                    2px 2px 0px rgba(255, 255, 255, 0.5),
                    4px 4px 8px rgba(0, 0, 0, 0.5),
                    -1px -1px 0px rgba(255, 255, 255, 0.3),
                    inset 0 0 10px rgba(184, 148, 31, 0.15)
                  `,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '-0.05em',
              }}
              animate={{
                                    textShadow: [
                      '2px 2px 0px rgba(255, 255, 255, 0.5), 4px 4px 8px rgba(0, 0, 0, 0.5), -1px -1px 0px rgba(255, 255, 255, 0.3), inset 0 0 10px rgba(184, 148, 31, 0.15)',
                      '3px 3px 0px rgba(255, 255, 255, 0.6), 6px 6px 12px rgba(0, 0, 0, 0.6), -2px -2px 0px rgba(255, 255, 255, 0.4), inset 0 0 15px rgba(184, 148, 31, 0.2)',
                      '2px 2px 0px rgba(255, 255, 255, 0.5), 4px 4px 8px rgba(0, 0, 0, 0.5), -1px -1px 0px rgba(255, 255, 255, 0.3), inset 0 0 10px rgba(184, 148, 31, 0.15)',
                    ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              L
            </motion.div>

            {/* LUMINEX text */}
            <motion.div
              className="relative mt-1"
              style={{
                fontSize: `${size * 0.11}px`,
                fontWeight: 700,
                color: '#2a2a2a',
                textShadow: `
                  1px 1px 0px rgba(255, 255, 255, 0.4),
                  2px 2px 4px rgba(0, 0, 0, 0.4),
                  -1px -1px 0px rgba(255, 255, 255, 0.2)
                `,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '0.1em',
              }}
            >
              LUMINEX
            </motion.div>

            {/* Highlight reflection for 3D effect */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)',
                transform: 'translateZ(2px)',
              }}
            />
          </div>

          {/* Edge highlight for depth */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: 'inset 0 0 20px rgba(234, 179, 8, 0.3)',
              transform: 'translateZ(1px)',
            }}
          />
        </motion.div>

        {/* Ambient glow behind coin */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(184, 148, 31, 0.1) 0%, transparent 70%)',
            transform: 'translateZ(-15px)',
            filter: 'blur(25px)',
          }}
          animate={{
            opacity: [0.2, 0.35, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>
    </div>
  );
};

export default Logo3D;
