'use client';

import React, { useState } from 'react';
import { TronShell } from '@/components/tron';
import { LogIn, Lock, User, Mail, Phone } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  error?: string;
}

export function LoginPage({ onLogin, onForgotPassword, onSignUp, error }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
    <TronShell showEnergyStream={false} className="bg-[#050816]">
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        {/* Background gradient with pattern */}
        <div 
          className="fixed inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(79, 70, 229, 0.1) 1px, transparent 1px),
              linear-gradient(0deg, rgba(79, 70, 229, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        <div className="w-full max-w-md relative z-10">
          {/* Luminex Branding */}
          <div className="text-center mb-8">
            {/* Logo - Lightning bolt in circle */}
            <div className="inline-block mb-4">
              <div 
                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-luminex-primary to-luminex-cyan flex items-center justify-center border-2 border-luminex-primary/50"
                style={{
                  boxShadow: '0 0 30px rgba(79, 70, 229, 0.5), inset 0 0 20px rgba(34, 211, 238, 0.2)',
                }}
              >
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8v8l10-12h-8V2z" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Luminex
            </h1>
            <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              Play. Power. Earn.
            </p>
          </div>

          {/* Login Card */}
          <div className="glass-tron p-8 rounded-2xl">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
              เข้าสู่ระบบ
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Email/Phone Input */}
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-luminex-primary/50">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-bg-tertiary/50 border-2 rounded-xl text-white placeholder:text-gray-500 focus:outline-none transition-all duration-200"
                    style={{
                      borderColor: focusedField === 'username' 
                        ? 'rgba(79, 70, 229, 0.6)' 
                        : 'rgba(79, 70, 229, 0.2)',
                      boxShadow: focusedField === 'username'
                        ? '0 0 20px rgba(79, 70, 229, 0.3)'
                        : 'none',
                    }}
                    placeholder="Email หรือ เบอร์โทร"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-luminex-primary/50">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr-4 py-3 bg-bg-tertiary/50 border-2 rounded-xl text-white placeholder:text-gray-500 focus:outline-none transition-all duration-200"
                    style={{
                      borderColor: focusedField === 'password' 
                        ? 'rgba(79, 70, 229, 0.6)' 
                        : 'rgba(79, 70, 229, 0.2)',
                      boxShadow: focusedField === 'password'
                        ? '0 0 20px rgba(79, 70, 229, 0.3)'
                        : 'none',
                    }}
                    placeholder="รหัสผ่าน"
                    required
                  />
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-luminex-primary/30 bg-bg-tertiary/50 text-luminex-primary focus:ring-2 focus:ring-luminex-primary focus:ring-offset-0"
                />
                <label htmlFor="remember" className="text-sm text-gray-400 cursor-pointer">
                  จำฉันไว้ในเครื่องนี้
                </label>
              </div>

              {/* Login Button - Primary Full Width */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                  boxShadow: '0 0 20px rgba(79, 70, 229, 0.4)',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5" />
                    เข้าสู่ระบบ
                  </span>
                )}
              </button>

              {/* Sign Up Button - Secondary Outline */}
              {onSignUp && (
                <button
                  type="button"
                  onClick={onSignUp}
                  className="w-full py-3 rounded-xl font-semibold border-2 transition-all duration-200"
                  style={{
                    borderColor: 'rgba(79, 70, 229, 0.5)',
                    color: '#6366F1',
                    background: 'transparent',
                  }}
                >
                  สมัครสมาชิก
                </button>
              )}

              {/* Forgot Password Link */}
              {onForgotPassword && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-sm text-gray-400 hover:text-luminex-primary transition-colors duration-200"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-gray-500 text-xs opacity-60" style={{ fontFamily: 'Inter, sans-serif' }}>
              Powered by Luminex System
            </p>
          </div>
        </div>
      </div>
    </TronShell>
  );
}

