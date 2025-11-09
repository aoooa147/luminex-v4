'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, HelpCircle, CheckCircle } from 'lucide-react';

export interface ErrorMessageProps {
  title: string;
  message: string;
  solution?: string;
  hint?: string;
  type?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
  className?: string;
}

export const ErrorMessage = memo(({
  title,
  message,
  solution,
  hint,
  type = 'error',
  onDismiss,
  className = '',
}: ErrorMessageProps) => {
  const colorClasses = {
    error: 'bg-red-500/20 border-red-500/50 text-red-300',
    warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  };

  const iconClasses = {
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  };

  const Icon = type === 'error' ? AlertCircle : type === 'warning' ? HelpCircle : CheckCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-4 rounded-xl border ${colorClasses[type]} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start space-x-3">
        <Icon className={`w-5 h-5 ${iconClasses[type]} flex-shrink-0 mt-0.5`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm mb-1">{title}</h4>
          <p className="text-sm mb-2">{message}</p>
          
          {solution && (
            <div className="mt-3 pt-3 border-t border-current/20">
              <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" aria-hidden="true" />
                Solution:
              </p>
              <p className="text-xs opacity-90">{solution}</p>
            </div>
          )}
          
          {hint && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <p className="text-xs font-semibold mb-1 flex items-center gap-1 opacity-80">
                <HelpCircle className="w-3 h-3" aria-hidden="true" />
                Hint:
              </p>
              <p className="text-xs opacity-75">{hint}</p>
            </div>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-current/60 hover:text-current transition-colors flex-shrink-0"
            aria-label="Dismiss error message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
});

ErrorMessage.displayName = 'ErrorMessage';

/**
 * Helper function to get error message with solution
 */
export function getErrorMessageWithSolution(
  error: any,
  defaultMessage: string = 'An error occurred'
): { message: string; solution?: string; hint?: string } {
  const errorMsg = String(error?.message || '').toLowerCase();
  const errorCode = String(error?.code || error?.error_code || '').toLowerCase();

  // Error messages with solutions
  const errorMap: Record<string, { message: string; solution?: string; hint?: string }> = {
    'insufficient_balance': {
      message: 'Insufficient balance',
      solution: 'Please add more tokens to your wallet and try again.',
      hint: 'You can check your balance in the wallet section.',
    },
    'insufficient wld balance': {
      message: 'Insufficient WLD balance',
      solution: 'Please add more WLD tokens to your wallet.',
      hint: 'You need WLD tokens to purchase Power Licenses.',
    },
    'please use world app to claim rewards': {
      message: 'World App is required',
      solution: 'Please open this app in World App to claim rewards.',
      hint: 'Make sure you are using the World App to interact with the blockchain.',
    },
    'world app is required': {
      message: 'World App is required',
      solution: 'Please open this app in World App to perform this action.',
      hint: 'World App is needed for blockchain transactions.',
    },
    'no rewards to claim': {
      message: 'No rewards available',
      solution: 'Stake more tokens to earn rewards.',
      hint: 'Rewards are calculated based on your staked amount and time.',
    },
    'claim rewards transaction failed': {
      message: 'Failed to claim rewards',
      solution: 'Please check your network connection and try again.',
      hint: 'Make sure you are connected to the internet and have sufficient gas fees.',
    },
    'transaction failed': {
      message: 'Transaction failed',
      solution: 'Please check your network connection and try again.',
      hint: 'The transaction may have failed due to network issues or insufficient gas.',
    },
    'network error': {
      message: 'Network error',
      solution: 'Please check your internet connection and try again.',
      hint: 'Make sure you are connected to a stable internet connection.',
    },
    'verification_failed': {
      message: 'Verification failed',
      solution: 'Please try again or contact support if the problem persists.',
      hint: 'This may be a temporary issue. Please wait a moment and try again.',
    },
    'invalid_reference': {
      message: 'Invalid reference',
      solution: 'Please refresh the page and try again.',
      hint: 'The reference may have expired. Please start the process again.',
    },
    'rate_limit': {
      message: 'Too many requests',
      solution: 'Please wait a moment before trying again.',
      hint: 'You are making requests too quickly. Please slow down.',
    },
  };

  // Check for exact match first
  if (errorMap[errorMsg]) {
    return errorMap[errorMsg];
  }

  // Check for partial match
  for (const [key, value] of Object.entries(errorMap)) {
    if (errorMsg.includes(key) || errorCode.includes(key)) {
      return value;
    }
  }

  // Default error message
  return {
    message: defaultMessage,
    solution: 'Please try again or contact support if the problem persists.',
    hint: 'If this error continues, please refresh the page.',
  };
}

