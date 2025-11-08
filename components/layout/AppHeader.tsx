'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Loader2 } from 'lucide-react';
import { TOKEN_NAME, LOGO_URL, LANGUAGES } from '@/lib/utils/constants';

interface AppHeaderProps {
  actualAddress: string | null;
  userInfo: any;
  formattedBalance: string;
  formattedWldBalance: string;
  isLoadingBalance: boolean;
  language: string;
  showLanguageMenu: boolean;
  setShowLanguageMenu: (show: boolean) => void;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const AppHeader = memo(({
  actualAddress,
  userInfo,
  formattedBalance,
  formattedWldBalance,
  isLoadingBalance,
  language,
  showLanguageMenu,
  setShowLanguageMenu,
  setLanguage,
  t,
}: AppHeaderProps) => {
  const activeLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div 
      className="relative z-10 overflow-visible glass-tron" 
      style={{
        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 10, 15, 0.9) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 26, 42, 0.3)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 26, 42, 0.15), inset 0 1px 0 rgba(255, 26, 42, 0.1)'
      }}
    >
      <div className="max-w-md mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <img src={LOGO_URL} alt="LUX" className="w-8 h-8 rounded-full ring-2 ring-purple-400/50" />
            <div>
              <h1 className="text-lg font-bold font-orbitron text-tron-red neon-text">
                Luminex Staking
              </h1>
            </div>
          </div>
        </div>
        
        {/* User ID & Balance */}
        <div className="mt-2 space-y-1.5 overflow-visible">
          <div 
            className="bg-gradient-to-r from-tron-red/10 via-tron-red-bright/10 to-tron-red/10 rounded-lg px-2.5 py-1.5 flex items-center justify-between backdrop-blur-lg border border-tron-red/30 relative overflow-visible" 
            style={{
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 26, 42, 0.3), inset 0 1px 0 rgba(255, 26, 42, 0.1)'
            }}
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-8 bg-gradient-to-br from-tron-red to-tron-red-bright rounded-full flex items-center justify-center" 
                style={{
                  boxShadow: '0 0 15px rgba(255, 26, 42, 0.6)'
                }}
              >
                <span className="text-white text-xs font-bold font-orbitron">U</span>
              </div>
              <span className="text-tron-red text-sm font-medium font-orbitron">
                {(() => {
                  const userName = userInfo?.name || userInfo?.username;
                  if (userName && typeof userName === 'string') return userName;
                  if (actualAddress && typeof actualAddress === 'string') {
                    return `@${actualAddress.slice(0, 8)}...${actualAddress.slice(-6)}`;
                  }
                  return 'USER';
                })()}
              </span>
            </div>
            <div className="relative language-menu z-[9999]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowLanguageMenu(!showLanguageMenu);
                }}
                className="flex items-center space-x-1 bg-gradient-to-br from-tron-purple/80 to-tron-purple-dark/80 rounded-lg px-3 py-1.5 border border-tron-purple/30 hover:border-tron-purple/50 transition-all cursor-pointer z-[9999] relative shadow-lg"
                style={{ userSelect: 'none', pointerEvents: 'auto', boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)' }}
              >
                <span className="text-white text-xs font-semibold font-orbitron whitespace-nowrap">
                  {activeLanguage.code.toUpperCase()} {activeLanguage.code.toUpperCase()}
                </span>
                <svg 
                  className={`w-3 h-3 text-white/70 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Language Dropdown */}
              <AnimatePresence>
                {showLanguageMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-40 bg-bg-tertiary/95 backdrop-blur-xl rounded-xl border border-tron-purple/30 shadow-2xl py-2 z-[9999]"
                    style={{
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(168, 85, 247, 0.2)'
                    }}
                  >
                    {LANGUAGES.map((lang) => (
                      <button
                        type="button"
                        key={lang.code}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLanguage(lang.code);
                          localStorage.setItem('preferredLanguage', lang.code);
                          setShowLanguageMenu(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-tron-purple/10 transition-colors flex items-center space-x-2 cursor-pointer font-orbitron ${
                          language === lang.code ? 'bg-tron-purple/15 text-tron-purple' : 'text-gray-300'
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span className="text-sm font-medium">{lang.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div 
            className="flex items-center justify-between bg-bg-tertiary/80 rounded-lg px-2.5 py-1.5 backdrop-blur-lg border border-tron-red/30 relative" 
            style={{ 
              zIndex: 0,
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 26, 42, 0.2)'
            }}
          >
            <div className="flex items-center text-tron-red">
              <div 
                className="w-7 h-7 bg-gradient-to-br from-tron-red to-tron-red-bright rounded-lg flex items-center justify-center mr-1.5" 
                style={{
                  boxShadow: '0 0 10px rgba(255, 26, 42, 0.5)'
                }}
              >
                <Wallet className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[10px] font-medium font-orbitron">{t('yourBalance')}</span>
            </div>
            <div className="text-right">
              {!actualAddress ? (
                <div className="text-tron-red text-xs font-orbitron">Connect wallet</div>
              ) : isLoadingBalance ? (
                <div className="flex items-center justify-end space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-tron-red" />
                  <span className="text-tron-red text-sm font-orbitron">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-tron-red font-bold text-base font-orbitron">{formattedBalance} {TOKEN_NAME}</div>
                  <div className="text-tron-red-bright font-bold text-xs font-orbitron">{formattedWldBalance} WLD</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AppHeader.displayName = 'AppHeader';

export default AppHeader;

