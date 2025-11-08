'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle } from 'lucide-react';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | null;
}

interface ToastProps {
  toast: ToastState;
}

export const Toast = memo(({ toast }: ToastProps) => {
  return (
    <AnimatePresence>
      {toast.type && (
        <motion.div
          initial={{ opacity: 0, y: 100, x: '-50%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4`}
        >
          <div className={`rounded-2xl p-4 shadow-2xl backdrop-blur-xl border-2 ${
            toast.type === 'success'
              ? 'bg-gradient-to-r from-green-500/90 to-emerald-500/90 border-green-400/50'
              : 'bg-gradient-to-r from-red-600/90 to-red-800/90 border-red-500/50'
          }`}>
            <div className="flex items-center space-x-3">
              {toast.type === 'success' ? (
                <Check className="w-6 h-6 text-white" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-white" aria-hidden="true" />
              )}
              <span className="text-white font-semibold flex-1">{toast.message}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

Toast.displayName = 'Toast';

/**
 * Hook for managing toast notifications
 */
export function useToast() {
  const [toast, setToast] = React.useState<ToastState>({ message: '', type: null });
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = React.useCallback((message: string, type: 'success' | 'error') => {
    // Clear existing timeout if any
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setToast({ message, type });
    
    // Set new timeout and store reference
    timeoutRef.current = setTimeout(() => {
      setToast({ message: '', type: null });
      timeoutRef.current = null;
    }, 3000);
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return {
    toast,
    showToast,
  };
}

