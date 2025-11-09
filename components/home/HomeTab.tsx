'use client';

import React, { memo, useMemo } from 'react';
import { WelcomeCard } from '@/components/common/WelcomeCard';
import { QuickActionCard } from '@/components/common/QuickActionCard';
import { Zap, Gamepad2, UserPlus, Target, TrendingUp, Bell } from 'lucide-react';

interface HomeTabProps {
  username?: string;
  address?: string;
  powerLevel?: number;
  powerStatus?: string;
  onNavigate: (tab: 'home' | 'power' | 'game' | 'friends' | 'profile') => void;
}

export const HomeTab = memo(function HomeTab({
  username,
  address,
  powerLevel = 78,
  powerStatus = 'ปกติ',
  onNavigate,
}: HomeTabProps) {
  // Missions data
  const missions = useMemo(() => [
    { id: 1, title: 'เช็คอินวันนี้', reward: '+5 แต้ม', progress: 100, completed: true },
    { id: 2, title: 'เล่นเกมครบ 3 รอบ', reward: '+10 แต้ม', progress: 66, completed: false },
    { id: 3, title: 'ชวนเพื่อนสมัคร', reward: '+20 แต้ม', progress: 0, completed: false },
  ], []);

  // Recent activities
  const activities = useMemo(() => [
    { id: 1, icon: '🎮', text: 'คุณเล่นเกม PowerQuiz ได้ 120 คะแนน', time: '2 ชั่วโมงที่แล้ว' },
    { id: 2, icon: '⚡', text: 'คุณได้รับพลังจากเพื่อน A', time: '5 ชั่วโมงที่แล้ว' },
  ], []);

  // Get power color based on level
  const getPowerColor = (level: number) => {
    if (level >= 80) return 'luminex-green';
    if (level >= 50) return 'luminex-cyan';
    return 'luminex-primary';
  };

  return (
    <div className="space-y-4">
      {/* Header with Notification */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-luminex-primary to-luminex-cyan flex items-center justify-center border-2 border-luminex-primary/50 flex-shrink-0">
            <span className="text-white text-lg font-semibold">
              {username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {username || address?.slice(0, 6) + '...' + address?.slice(-4) || 'User'} 👋
            </h2>
            <p className="text-sm text-gray-400">
              พร้อมปลดปล่อยพลังแล้วหรือยัง?
            </p>
          </div>
        </div>
        <button className="p-2 rounded-xl bg-bg-tertiary/50 border border-luminex-primary/20 hover:bg-bg-tertiary transition-colors">
          <Bell className="w-5 h-5 text-luminex-primary" />
        </button>
      </div>

      {/* Power Status Card - Large Card with Circular Gauge */}
      <div className="neon-card p-6">
        <div className="text-center">
          <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Power Level</h3>
          
          {/* Circular Gauge */}
          <div className="relative w-48 h-48 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(79, 70, 229, 0.2)"
                strokeWidth="8"
              />
              
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={powerLevel >= 80 ? '#22C55E' : powerLevel >= 50 ? '#22D3EE' : '#4F46E5'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - powerLevel / 100)}`}
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(79, 70, 229, 0.6))',
                  transition: 'stroke-dashoffset 1s ease-out',
                }}
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-4xl font-bold ${getPowerColor(powerLevel) === 'luminex-green' ? 'text-luminex-green' : getPowerColor(powerLevel) === 'luminex-cyan' ? 'text-luminex-cyan' : 'text-luminex-primary'}`}>
                {powerLevel}%
              </div>
              <div className="text-xs text-gray-400 mt-1">สถานะ: {powerStatus}</div>
            </div>
          </div>

          {/* Power Management Button */}
          <button
            onClick={() => onNavigate('power')}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              boxShadow: '0 0 20px rgba(79, 70, 229, 0.4)',
            }}
          >
            จัดการพลังงาน
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          <QuickActionCard
            title="เปิดโหมดเกม"
            description=""
            icon={Gamepad2}
            href="#"
            glowColor="purple"
            onClick={() => onNavigate('game')}
          />
          <QuickActionCard
            title="แนะนำเพื่อน"
            description=""
            icon={UserPlus}
            href="#"
            glowColor="green"
            onClick={() => onNavigate('friends')}
          />
          <QuickActionCard
            title="ดูภารกิจ"
            description=""
            icon={Target}
            href="#"
            glowColor="cyan"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Missions Section */}
      <div>
        <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-3">ภารกิจวันนี้</h3>
        <div className="space-y-3">
          {missions.map((mission) => (
            <div key={mission.id} className="neon-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {mission.completed ? (
                    <div className="w-5 h-5 rounded-full bg-luminex-green flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-luminex-primary/30" />
                  )}
                  <span className="text-sm font-medium text-white">{mission.title}</span>
                </div>
                <span className="text-sm font-semibold text-luminex-green">{mission.reward}</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-luminex-primary to-luminex-cyan rounded-full transition-all duration-500"
                  style={{ width: `${mission.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Activity ล่าสุด</h3>
        <div className="space-y-2">
          {activities.map((activity) => (
            <div key={activity.id} className="neon-card p-3 flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">{activity.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{activity.text}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

