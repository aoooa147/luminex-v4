'use client';

import React, { useState, useEffect } from 'react';
import Logo3D from '@/components/ui/Logo3D';
import { TronShell } from '@/components/tron';

interface SplashScreenProps {
  onComplete: () => void;
  message?: string;
}

export function SplashScreen({ onComplete, message }: SplashScreenProps) {
  const [buildProgress, setBuildProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('INITIALIZING...');
  const [showLogo, setShowLogo] = useState(false);

  const messages = [
    'INITIALIZING...',
    'CONNECTING TO THE GRID...',
    'LOADING CORE SYSTEMS...',
    'SYNCHRONIZING DATA...',
    'READY',
  ];

  useEffect(() => {
    // Build-up animation sequence
    const sequence = async () => {
      // Phase 1: Build progress (0-100%)
      for (let i = 0; i <= 100; i += 2) {
        await new Promise((resolve) => setTimeout(resolve, 30));
        setBuildProgress(i);
        
        // Change message at specific progress points
        if (i === 20) setCurrentMessage('CONNECTING TO THE GRID...');
        if (i === 40) setCurrentMessage('LOADING CORE SYSTEMS...');
        if (i === 60) setCurrentMessage('SYNCHRONIZING DATA...');
        if (i === 80) setCurrentMessage('INITIALIZING...');
        if (i === 90) {
          setShowLogo(true);
          setCurrentMessage('READY');
        }
      }

      // Wait a bit before completing
      await new Promise((resolve) => setTimeout(resolve, 500));
      onComplete();
    };

    sequence();
  }, [onComplete]);

  return (
    <TronShell showEnergyStream={false} className="bg-[#000000]">
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
        {/* Electric Cyan lines converging from edges */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top line */}
          <div 
            className="absolute top-0 left-1/2 h-0.5 bg-gradient-to-r from-transparent via-tron-cyan to-transparent"
            style={{
              width: `${100 - buildProgress}%`,
              transform: 'translateX(-50%)',
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.8)',
              transition: 'width 0.3s ease-out',
            }}
          />
          
          {/* Bottom line */}
          <div 
            className="absolute bottom-0 left-1/2 h-0.5 bg-gradient-to-r from-transparent via-tron-cyan to-transparent"
            style={{
              width: `${100 - buildProgress}%`,
              transform: 'translateX(-50%)',
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.8)',
              transition: 'width 0.3s ease-out',
            }}
          />
          
          {/* Left line */}
          <div 
            className="absolute left-0 top-1/2 w-0.5 bg-gradient-to-b from-transparent via-tron-cyan to-transparent"
            style={{
              height: `${100 - buildProgress}%`,
              transform: 'translateY(-50%)',
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.8)',
              transition: 'height 0.3s ease-out',
            }}
          />
          
          {/* Right line */}
          <div 
            className="absolute right-0 top-1/2 w-0.5 bg-gradient-to-b from-transparent via-tron-cyan to-transparent"
            style={{
              height: `${100 - buildProgress}%`,
              transform: 'translateY(-50%)',
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.8)',
              transition: 'height 0.3s ease-out',
            }}
          />
        </div>

        {/* Logo with build-up effect */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div 
            className={`transition-opacity duration-500 ${showLogo ? 'opacity-100' : 'opacity-0'}`}
            style={{
              filter: showLogo ? 'drop-shadow(0 0 40px rgba(255, 26, 42, 0.8))' : 'none',
              transform: showLogo ? 'scale(1)' : 'scale(0.8)',
              transition: 'all 0.5s ease-out',
            }}
          >
            <Logo3D size={140} interactive={false} />
          </div>

          {/* Progress indicator */}
          <div className="mt-8 w-64">
            <div className="h-1 bg-black/50 rounded-full overflow-hidden border border-tron-red/30">
              <div 
                className="h-full bg-gradient-to-r from-tron-red to-tron-red-bright rounded-full transition-all duration-300"
                style={{
                  width: `${buildProgress}%`,
                  boxShadow: '0 0 10px rgba(255, 26, 42, 0.6)',
                }}
              />
            </div>
          </div>

          {/* Status message with blinking effect */}
          <div className="mt-6">
            <p 
              className="text-tron-red font-orbitron text-sm font-bold tracking-wider uppercase"
              style={{
                textShadow: '0 0 10px rgba(255, 26, 42, 0.8)',
                animation: 'blink 1.5s ease-in-out infinite',
              }}
            >
              {message || currentMessage}
            </p>
          </div>
        </div>

        {/* Grid background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(255, 26, 42, 0.1) 1px, transparent 1px),
              linear-gradient(0deg, rgba(255, 26, 42, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </TronShell>
  );
}
