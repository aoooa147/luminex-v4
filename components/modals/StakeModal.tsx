'use client';

import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { TOKEN_NAME } from '@/lib/utils/constants';

interface StakeModalProps {
  showStakeModal: boolean;
  setShowStakeModal: (show: boolean) => void;
  isShowInput: boolean;
  setIsShowInput: (show: boolean) => void;
  stakeAmount: string;
  setStakeAmount: (amount: string) => void;
  balance: number;
  isStaking: boolean;
  handleStake: () => void;
}

const StakeModal = memo(({
  showStakeModal,
  setShowStakeModal,
  isShowInput,
  setIsShowInput,
  stakeAmount,
  setStakeAmount,
  balance,
  isStaking,
  handleStake,
}: StakeModalProps) => {
  // Memoize event handlers
  const handleClose = useCallback(() => {
    setShowStakeModal(false);
    setIsShowInput(false);
  }, [setShowStakeModal, setIsShowInput]);

  const handleMaxClick = useCallback(() => {
    setStakeAmount(balance.toString());
  }, [balance, setStakeAmount]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStakeAmount(e.target.value);
  }, [setStakeAmount]);
  return (
    <AnimatePresence>
      {showStakeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 w-full max-w-md border border-yellow-600/30 shadow-2xl"
            style={{ willChange: 'auto' }}
          >
            <h3 className="text-2xl font-bold text-white mb-4 text-center">Stake {TOKEN_NAME}</h3>
            {isShowInput && (
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">Amount to Stake</label>
                <div className="relative">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-yellow-600/40 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-yellow-500 text-lg"
                  />
                  <button
                    onClick={handleMaxClick}
                    aria-label="Set maximum stake amount"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold text-sm px-3 py-1 rounded-xl hover:from-yellow-400 hover:to-amber-500"
                    style={{
                      boxShadow: '0 2px 10px rgba(234, 179, 8, 0.3)'
                    }}
                  >
                    MAX
                  </button>
                </div>
              </div>
            )}
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                aria-label="Cancel staking"
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2.5 px-4 rounded-2xl text-sm"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStake}
                disabled={isStaking}
                aria-label={isStaking ? 'Staking in progress...' : 'Confirm stake'}
                aria-disabled={isStaking}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-2.5 px-4 rounded-2xl disabled:opacity-50 text-sm"
              >
                {isStaking ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" aria-hidden="true" />
                    Staking...
                  </>
                ) : (
                  'Confirm Stake'
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

StakeModal.displayName = 'StakeModal';

export default StakeModal;

