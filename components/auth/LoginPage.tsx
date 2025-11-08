'use client';

import React, { useState } from 'react';
import { TronShell, TronButton, TronInput, TronCard } from '@/components/tron';
import { LogIn, Lock, User, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onForgotPassword?: () => void;
  error?: string;
}

export function LoginPage({ onLogin, onForgotPassword, error }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TronShell showEnergyStream={true} className="bg-[#000000]">
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        {/* Grid background - subtle animated */}
        <div 
          className="fixed inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(0, 229, 255, 0.3) 1px, transparent 1px),
              linear-gradient(0deg, rgba(0, 229, 255, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            backgroundPosition: '0 0',
            animation: 'gridScroll 20s linear infinite',
          }}
        />

        <div className="w-full max-w-md relative z-10">
          {/* Access Point Header */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="w-20 h-20 mx-auto rounded-full border-4 border-tron-cyan/50 bg-tron-cyan/10 flex items-center justify-center">
                <Lock className="w-10 h-10 text-tron-cyan" style={{ filter: 'drop-shadow(0 0 15px rgba(0, 229, 255, 0.8))' }} />
              </div>
            </div>
            <h1 className="text-3xl font-orbitron font-bold text-tron-cyan mb-2 uppercase tracking-wider">
              ACCESS POINT
            </h1>
            <p className="text-gray-400 text-sm font-orbitron">
              Connect to the Grid
            </p>
          </div>

          {/* Login Card */}
          <TronCard glowColor="cyan" className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-tron-orange/10 border border-tron-orange/30 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-tron-orange flex-shrink-0" />
                  <p className="text-sm text-tron-orange font-orbitron">{error}</p>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-2">
                <label className="text-sm font-orbitron text-tron-cyan uppercase tracking-wide">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-tron-cyan/50">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent border-0 border-b-2 rounded-none text-white font-orbitron placeholder:text-gray-500 focus:outline-none transition-all duration-300"
                    style={{
                      borderBottomColor: focusedField === 'username' 
                        ? 'rgba(0, 229, 255, 1)' 
                        : 'rgba(0, 229, 255, 0.3)',
                      boxShadow: focusedField === 'username'
                        ? '0 4px 20px rgba(0, 229, 255, 0.4), inset 0 -2px 0 rgba(0, 229, 255, 0.8)'
                        : 'none',
                    }}
                    placeholder="Enter username"
                    required
                  />
                  {/* Animated underline glow */}
                  {focusedField === 'username' && (
                    <div 
                      className="absolute bottom-0 left-0 h-0.5 bg-tron-cyan"
                      style={{
                        width: '100%',
                        boxShadow: '0 0 10px rgba(0, 229, 255, 0.8)',
                        animation: 'pulse 2s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-orbitron text-tron-cyan uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-tron-cyan/50">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent border-0 border-b-2 rounded-none text-white font-orbitron placeholder:text-gray-500 focus:outline-none transition-all duration-300"
                    style={{
                      borderBottomColor: focusedField === 'password' 
                        ? 'rgba(0, 229, 255, 1)' 
                        : 'rgba(0, 229, 255, 0.3)',
                      boxShadow: focusedField === 'password'
                        ? '0 4px 20px rgba(0, 229, 255, 0.4), inset 0 -2px 0 rgba(0, 229, 255, 0.8)'
                        : 'none',
                    }}
                    placeholder="Enter password"
                    required
                  />
                  {/* Animated underline glow */}
                  {focusedField === 'password' && (
                    <div 
                      className="absolute bottom-0 left-0 h-0.5 bg-tron-cyan"
                      style={{
                        width: '100%',
                        boxShadow: '0 0 10px rgba(0, 229, 255, 0.8)',
                        animation: 'pulse 2s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Login Button - Chamfered Ghost Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden border-2 rounded-lg font-orbitron font-semibold uppercase tracking-wider transition-all duration-200 border-tron-cyan text-tron-cyan hover:bg-tron-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-base"
                style={{
                  background: 'transparent',
                  clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
                  boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
                  transform: 'translateZ(0)',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-tron-cyan border-t-transparent rounded-full animate-spin" />
                    CONNECTING...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5" />
                    LOGIN
                  </span>
                )}
              </button>

              {/* Forgot Password Link */}
              {onForgotPassword && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-tron-orange hover:text-tron-orange-bright font-orbitron text-sm uppercase tracking-wide transition-colors duration-200"
                    style={{
                      textShadow: '0 0 10px rgba(255, 107, 53, 0.6)',
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </form>
          </TronCard>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-gray-500 text-xs font-orbitron">
              Secure connection to the Grid
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gridScroll {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </TronShell>
  );
}
