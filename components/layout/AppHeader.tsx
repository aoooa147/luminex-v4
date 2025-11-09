'use client';

import React, { memo, useCallback, useMemo } from 'react';
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
  // Memoize computed values
  const activeLanguage = useMemo(() => 
    LANGUAGES.find(l => l.code === language) || LANGUAGES[0],
    [language]
  );

  const userName = useMemo(() => {
    const userName = userInfo?.name || userInfo?.username;
    if (userName && typeof userName === 'string') return userName;
    if (actualAddress && typeof actualAddress === 'string') {
      return `@${actualAddress.slice(0, 8)}...${actualAddress.slice(-6)}`;
    }
    return 'USER';
  }, [userInfo, actualAddress]);

  const yourBalanceText = useMemo(() => t('yourBalance'), [t]);

  // Memoize event handlers
  const handleLanguageMenuToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowLanguageMenu(!showLanguageMenu);
  }, [showLanguageMenu, setShowLanguageMenu]);

  const handleLanguageSelect = useCallback((langCode: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLanguage(langCode);
    localStorage.setItem('preferredLanguage', langCode);
    setShowLanguageMenu(false);
  }, [setLanguage, setShowLanguageMenu]);

  return (
    <div 
      className="relative z-10 overflow-visible" 
      style={{
        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(17, 24, 39, 0.8) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(234, 179, 8, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 30px rgba(234, 179, 8, 0.05), inset 0 1px 0 rgba(234, 179, 8, 0.1)'
      }}
    >
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <img src={LOGO_URL} alt="LUX" className="w-8 h-8 rounded-full ring-2 ring-purple-400/50" />
            <div>
              <h1 className="text-lg font-bold text-white">
                Luminex Staking
              </h1>
            </div>
          </div>
        </div>
        
        {/* User ID & Balance */}
        <div className="mt-2 space-y-1.5 overflow-visible">
          <div 
            className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 rounded-lg px-2.5 py-1.5 flex items-center justify-between backdrop-blur-lg border border-yellow-600/20 relative overflow-visible" 
            style={{
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(234, 179, 8, 0.1)'
            }}
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center" 
                style={{
                  boxShadow: '0 0 15px rgba(234, 179, 8, 0.4)'
                }}
              >
                <span className="text-white text-xs font-bold">U</span>
              </div>
              <span className="text-white text-sm font-medium">
                {userName}
              </span>
            </div>
            <div className="relative language-menu z-[9999]">
              <button
                type="button"
                onClick={handleLanguageMenuToggle}
                className="flex items-center space-x-1 bg-gradient-to-br from-purple-600/80 to-purple-800/80 rounded-lg px-3 py-1.5 border border-purple-400/30 hover:border-purple-400/50 transition-all cursor-pointer z-[9999] relative shadow-lg"
                style={{ userSelect: 'none', pointerEvents: 'auto' }}
              >
                <span className="text-white text-xs font-semibold whitespace-nowrap">
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
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-40 bg-black/95 backdrop-blur-xl rounded-xl border border-purple-400/30 shadow-2xl py-2 z-[9999]"
                  >
                    {LANGUAGES.map((lang) => (
                      <button
                        type="button"
                        key={lang.code}
                        onClick={handleLanguageSelect(lang.code)}
                        className={`w-full px-4 py-2 text-left hover:bg-purple-500/10 transition-colors flex items-center space-x-2 cursor-pointer ${
                          language === lang.code ? 'bg-purple-500/15 text-purple-300' : 'text-gray-300'
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
            className="flex items-center justify-between bg-black/40 rounded-lg px-2.5 py-1.5 backdrop-blur-lg border border-white/10 relative" 
            style={{ zIndex: 0 }}
          >
            <div className="flex items-center text-white">
              <div 
                className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center mr-1.5" 
                style={{
                  boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)'
                }}
              >
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-medium">{yourBalanceText}</span>
            </div>
            <div className="text-right">
              {!actualAddress ? (
                <div className="text-yellow-400 text-xs">Connect wallet</div>
              ) : isLoadingBalance ? (
                <div className="flex items-center justify-end space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  <span className="text-yellow-400 text-sm">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-pink-400 font-bold text-base">{formattedBalance} {TOKEN_NAME}</div>
                  <div className="text-green-400 font-bold text-xs">{formattedWldBalance} WLD</div>
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
