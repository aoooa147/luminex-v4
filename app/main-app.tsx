'use client';

/// <reference path="../luminex-unified-app.ts" />
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { MiniKit, tokenToDecimals, Tokens } from '@worldcoin/minikit-js';
import { WORLD_APP_ID as ENV_WORLD_APP_ID, WORLD_ACTION as ENV_WORLD_ACTION, WALLET_RPC_URL, WALLET_CHAIN_ID, CONTRACT_RPC_URL, CONTRACT_CHAIN_ID, LUX_TOKEN_ADDRESS as LUX_TOKEN_ADDRESS_FROM_CONSTANTS, STAKING_CONTRACT_ADDRESS as STAKING_CONTRACT_ADDRESS_FROM_CONSTANTS, WLD_TOKEN_ADDRESS as WLD_TOKEN_ADDRESS_FROM_CONSTANTS, TREASURY_ADDRESS as TREASURY_ADDRESS_FROM_CONSTANTS, LANGUAGES, POOLS as POOLS_FROM_CONSTANTS, MEMBERSHIP_TIERS as MEMBERSHIP_TIERS_FROM_CONSTANTS, POOL_ICONS, POOL_COLORS, POOL_BG_COLORS, MEMBERSHIP_COLORS, MEMBERSHIP_SPARKLE, LOGO_URL as LOGO_URL_FROM_CONSTANTS, TOKEN_NAME as TOKEN_NAME_FROM_CONSTANTS } from '@/lib/utils/constants';
import { POWERS, BASE_APY, getPowerByCode, getPowerBoost, type PowerCode } from '@/lib/utils/powerConfig';
import { useMiniKit as useMiniKitVerify } from '@/hooks/useMiniKit';
import { registerServiceWorker, improveTouchInteractions } from '@/lib/utils/pwa';
// New custom hooks
import { useWallet } from '@/hooks/useWallet';
import { useStaking } from '@/hooks/useStaking';
import { usePower } from '@/hooks/usePower';
import { useReferral } from '@/hooks/useReferral';
import { useLanguage } from '@/hooks/useLanguage';
import { Toast, useToast } from '@/components/common/Toast';
const MiniKitPanel = dynamic(() => import('@/components/world/MiniKitPanel'), { ssr: false });
const GameLauncherCard = dynamic(() => import('@/components/game/GameLauncherCard'), { ssr: false });
import { 
  Wallet, Shield, Coins, TrendingUp, Settings, Gift, Users, Zap, Lock, Unlock, 
  AlertTriangle, ExternalLink, Copy, Check, Loader2, Clock, Star, Droplet,
  DollarSign, Eye, BarChart3, Flame, Trophy, Award, TrendingDown, Globe, 
  PiggyBank, CreditCard, Gem, Sparkles, Crown, Rocket, DollarSign as DollarIcon,
  Calendar, Timer, TrendingUp as TrendingIcon, Share2, UserPlus, QrCode, Gamepad2,
  X, MoreVertical
} from "lucide-react";
import QRCodeSVG from 'react-qr-code';
import Logo3D from '@/components/ui/Logo3D';
import WorldIDVerification from '@/components/world/WorldIDVerification';
// Lazy load tabs for better performance
const StakingTab = dynamic(() => import('@/components/staking/StakingTab'), { ssr: false });
const MembershipTab = dynamic(() => import('@/components/membership/MembershipTab'), { ssr: false });
const ReferralTab = dynamic(() => import('@/components/referral/ReferralTab'), { ssr: false });
const GameTab = dynamic(() => import('@/components/game/GameTab'), { ssr: false });
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
// Lazy load modals
const StakeModal = dynamic(() => import('@/components/modals/StakeModal'), { ssr: false });
const QRModal = dynamic(() => import('@/components/modals/QRModal'), { ssr: false });
import { TronShell, TronPanel } from '@/components/tron';
import { BroadcastMessage } from '@/components/common/BroadcastMessage';

const LOGO_URL = LOGO_URL_FROM_CONSTANTS;
const TOKEN_NAME = TOKEN_NAME_FROM_CONSTANTS;
// Use TREASURY_ADDRESS from constants.ts (can be overridden by NEXT_PUBLIC_TREASURY_ADDRESS env variable)
const TREASURY_ADDRESS = TREASURY_ADDRESS_FROM_CONSTANTS; // Default: 0xdc6c9ac4c8ced68c9d8760c501083cd94dcea4e8
// Admin wallet address - configure this in .env.local as NEXT_PUBLIC_ADMIN_WALLET_ADDRESS
const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || TREASURY_ADDRESS;

// preserved original:
const WORLD_APP_ID /* original: app_0ebc1640de72f393da01afc094665266 */ = (ENV_WORLD_APP_ID || "app_0ebc1640de72f393da01afc094665266");
// preserved original:
const WORLD_ACTION /* original: luminexstaking */ = (ENV_WORLD_ACTION || "luminexstaking");

// Contract addresses - Update these with your deployed contract addresses
const LUX_TOKEN_ADDRESS = LUX_TOKEN_ADDRESS_FROM_CONSTANTS;
const STAKING_CONTRACT_ADDRESS = STAKING_CONTRACT_ADDRESS_FROM_CONSTANTS;
const WLD_TOKEN_ADDRESS = WLD_TOKEN_ADDRESS_FROM_CONSTANTS;

// Helper function to get RPC URL based on chain ID
const getRpcUrlForChainId = (chainId: number | null): string => {
  if (!chainId) {
    // Default to Worldchain mainnet for WLD
    return WALLET_RPC_URL;
  }
  
  // Map chain IDs to RPC URLs
  switch (chainId) {
    case 480: // Worldchain mainnet
      return WALLET_RPC_URL;
    case 10: // Optimism mainnet
      return CONTRACT_RPC_URL;
    case 11155420: // Optimism Sepolia
      return "https://sepolia.optimism.io";
    case 1: // Ethereum mainnet
      return "https://eth.llamarpc.com";
    default:
      console.warn(`⚠️ Unknown chain ID: ${chainId}, using Worldchain`);
      return WALLET_RPC_URL;
  }
};


// ERC20 ABI for balance checking and approvals
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Staking Contract ABI
const STAKING_ABI = [
  // View functions
  "function getUserStakeInfo(address user, uint8 poolId) external view returns (uint256 amount, uint256 lockPeriod, uint256 unlockTime, uint256 pendingRewards, bool isLP)",
  "function getPendingRewards(address user, uint8 poolId) external view returns (uint256)",
  "function totalStakedByUser(address user) external view returns (uint256)",
  "function referralCount(address user) external view returns (uint256)",
  "function stakes(address user, uint8 poolId) external view returns (uint256 amount, uint256 lockPeriod, uint256 startTime, uint256 unlockTime, uint256 lastRewardTime, uint256 accumulatedRewards, uint8 poolId, bool isLP)",
  // Write functions
  "function stake(uint8 poolId, uint256 amount, uint256 lockPeriod) external",
  "function withdraw(uint8 poolId, uint256 amount) external",
  "function claimRewards(uint8 poolId) external",
];

// Language translations - moved to lib/utils/translations.ts
// Import from translations.ts via useLanguage hook
const translations: Record<string, Record<string, string>> = {
  en: {
    // Header
    'appName': 'Luminex Staking',
    'premiumPlatform': 'Premium Staking Platform',
    'yourBalance': 'YOUR BALANCE:',
    
    // Staking tab
    'myCurrentMembership': 'My Current Membership:',
    'noMembership': 'No membership',
    'myStakingBalance': 'My Staking Balance:',
    'earnedInterest': 'Earned Interest:',
    'timeElapsed': 'Time elapsed',
    'staking': 'STAKING',
    'withdrawBalance': 'WITHDRAW BALANCE',
    'withdrawInterest': 'WITHDRAW INTEREST',
    'freeToken': 'FREE LUX HERE',
    
    // Membership tab
    'boostEarnings': '🚀 Boost your earnings! 🚀',
    'upgradeMembership': 'Upgrading your Membership gives you a much higher APY for your Staking ✨',
    'vipMemberships': 'VIP. MEMBERSHIPS',
    
    // Referral tab
    'inviteFriends': 'Invite Friends!',
    'referralDesc': 'Get 5 LUX for each friend you invite',
    'earnTogether': '💰 Earn More Together! 💰',
    'totalReferrals': 'Total Referrals',
    'totalEarnings': 'Total Earnings',
    'yourReferralCode': 'Your Referral Code',
    'shareCode': 'Share this code with friends',
    'shareLink': 'Share Link',
    'showQRCode': 'Show QR Code',
    'howItWorks': 'How It Works',
    'howItWorks1': 'Share your referral code with friends',
    'howItWorks2': 'Get 5 LUX when they sign up',
    'howItWorks3': 'Unlimited referrals!',
    
    // Toast messages
    'insufficientBalance': 'Insufficient balance',
    'noBalanceWithdraw': 'No balance to withdraw',
    'noInterestClaim': 'No interest to claim',
    'paymentFailed': 'Payment failed',
    'successfullyStaked': 'Successfully staked {amount} LUX!',
    'claimedRewards': 'Claimed {amount} LUX rewards!',
    'claimedInterest': 'Claimed {amount} LUX interest!',
    'withdrewBalance': 'Withdrew {amount} LUX!',
    'membershipActivated': '{tier} Membership activated!',
    
    // Footer
    'poweredBy': 'Powered by Worldcoin',
    'termsPrivacy': 'Terms & Privacy',
    
    // World App Required
    'worldAppRequired': 'World App Required',
    'openInWorldApp': 'This Mini App can only be used within the World App. Please open it in World App to continue.',
    'downloadWorldApp': 'Download World App from your app store and search for "Luminex" to find this Mini App.',
    'download': 'Download World App',
    
    // Verification
    'verifyHumanity': 'Verify Humanity',
    'verifyDesc': 'You must verify your humanity to access the application.',
    'verify': 'Verify',
  },
  th: {
    // Header
    'appName': 'Luminex Staking',
    'premiumPlatform': 'แพลตฟอร์มสเตคิ้งพรีเมียม',
    'yourBalance': 'ยอดเงินของคุณ:',
    
    // Staking tab
    'myCurrentMembership': 'สมาชิกภาพปัจจุบันของฉัน:',
    'noMembership': 'ไม่มีสมาชิกภาพ',
    'myStakingBalance': 'ยอดเงินสเตคของฉัน:',
    'earnedInterest': 'ดอกเบี้ยที่ได้รับ:',
    'timeElapsed': 'เวลาที่ผ่านไป',
    'staking': 'สเตค',
    'withdrawBalance': 'ถอนยอดเงิน',
    'withdrawInterest': 'ถอนดอกเบี้ย',
    'freeToken': 'รับ LUX ฟรี',
    
    // Membership tab
    'boostEarnings': '🚀 เพิ่มรายได้ของคุณ! 🚀',
    'upgradeMembership': 'อัปเกรดสมาชิกภาพของคุณเพื่อรับ APY ที่สูงขึ้นสำหรับการสเตคของคุณ ✨',
    'vipMemberships': 'สมาชิกภาพ VIP',
    
    // Referral tab
    'inviteFriends': 'เชิญเพื่อน!',
    'referralDesc': 'รับ 5 LUX สำหรับแต่ละคนที่คุณเชิญ',
    'earnTogether': '💰 ร่วมกันหารายได้มากขึ้น! 💰',
    'totalReferrals': 'เชิญเพื่อนทั้งหมด',
    'totalEarnings': 'รายได้รวม',
    'yourReferralCode': 'รหัสแนะนำของคุณ',
    'shareCode': 'แชร์รหัสนี้กับเพื่อน',
    'shareLink': 'แชร์ลิงก์',
    'showQRCode': 'แสดง QR Code',
    'howItWorks': 'วิธีการทำงาน',
    'howItWorks1': 'แชร์รหัสแนะนำของคุณกับเพื่อน',
    'howItWorks2': 'รับ 5 LUX เมื่อพวกเขาสมัคร',
    'howItWorks3': 'เชิญเพื่อนได้ไม่จำกัด!',
    
    // Toast messages
    'insufficientBalance': 'ยอดเงินไม่เพียงพอ',
    'noBalanceWithdraw': 'ไม่มียอดเงินที่จะถอน',
    'noInterestClaim': 'ไม่มีดอกเบี้ยที่จะรับ',
    'paymentFailed': 'การชำระเงินล้มเหลว',
    'successfullyStaked': 'สเตค {amount} LUX สำเร็จ!',
    'claimedRewards': 'รับ {amount} LUX แล้ว!',
    'claimedInterest': 'รับดอกเบี้ย {amount} LUX แล้ว!',
    'withdrewBalance': 'ถอน {amount} LUX แล้ว!',
    'membershipActivated': 'เปิดใช้งานสมาชิกภาพ {tier} แล้ว!',
    
    // Footer
    'poweredBy': 'ขับเคลื่อนโดย Worldcoin',
    'termsPrivacy': 'ข้อกำหนดและความเป็นส่วนตัว',
    
    // World App Required
    'worldAppRequired': 'ต้องใช้ World App',
    'openInWorldApp': 'แอปพลิเคชันย่อยนี้ใช้งานได้เฉพาะใน World App เท่านั้น กรุณาเปิดใน World App เพื่อใช้งานต่อ',
    'downloadWorldApp': 'ดาวน์โหลด World App จากแอปสโตร์ของคุณและค้นหา "Luminex" เพื่อหาแอปพลิเคชันย่อยนี้',
    'download': 'ดาวน์โหลด World App',
    
    // Verification
    'verifyHumanity': 'ยืนยันความเป็นมนุษย์',
    'verifyDesc': 'คุณต้องยืนยันความเป็นมนุษย์เพื่อเข้าถึงแอปพลิเคชัน',
    'verify': 'ยืนยัน',
  },
  zh: {
    // Header
    'appName': 'Luminex Staking',
    'premiumPlatform': '高级质押平台',
    'yourBalance': '您的余额:',
    
    // Staking tab
    'myCurrentMembership': '我的当前会员:',
    'noMembership': '无会员',
    'myStakingBalance': '我的质押余额:',
    'earnedInterest': '已赚利息:',
    'timeElapsed': '已用时间',
    'staking': '质押',
    'withdrawBalance': '提取余额',
    'withdrawInterest': '提取利息',
    'freeToken': '免费获得 LUX',
    
    // Membership tab
    'boostEarnings': '🚀 提高您的收益！🚀',
    'upgradeMembership': '升级您的会员身份可以获得更高的质押 APY ✨',
    'vipMemberships': 'VIP 会员',
    
    // Referral tab
    'inviteFriends': '邀请朋友！',
    'referralDesc': '每邀请一位朋友即可获得 5 LUX',
    'earnTogether': '💰 一起赚更多！💰',
    'totalReferrals': '总推荐人数',
    'totalEarnings': '总收入',
    'yourReferralCode': '您的推荐代码',
    'shareCode': '与朋友分享此代码',
    'shareLink': '分享链接',
    'showQRCode': '显示二维码',
    'howItWorks': '如何运作',
    'howItWorks1': '与朋友分享您的推荐代码',
    'howItWorks2': '他们注册时您将获得 5 LUX',
    'howItWorks3': '推荐人数无限制！',
    
    // Toast messages
    'insufficientBalance': '余额不足',
    'noBalanceWithdraw': '无余额可提取',
    'noInterestClaim': '无利息可领取',
    'paymentFailed': '支付失败',
    'successfullyStaked': '成功质押 {amount} LUX！',
    'claimedRewards': '已领取 {amount} LUX！',
    'claimedInterest': '已领取 {amount} LUX 利息！',
    'withdrewBalance': '已提取 {amount} LUX！',
    'membershipActivated': '已激活 {tier} 会员！',
    
    // Footer
    'poweredBy': '由 Worldcoin 提供支持',
    'termsPrivacy': '条款和隐私',
    
    // World App Required
    'worldAppRequired': '需要 World App',
    'openInWorldApp': '此小型应用只能在 World App 中使用。请在 World App 中打开它。',
    'downloadWorldApp': '从应用商店下载 World App 并搜索 "Luminex" 查找此小型应用',
    'download': '下载 World App',
    
    // Verification
    'verifyHumanity': '验证人类身份',
    'verifyDesc': '您必须验证人类身份才能访问该应用程序。',
    'verify': '验证',
  },
  ja: {
    // Header
    'appName': 'Luminex Staking',
    'premiumPlatform': 'プレミアムステーキングプラットフォーム',
    'yourBalance': '残高:',
    
    // Staking tab
    'myCurrentMembership': '現在のメンバーシップ:',
    'noMembership': 'メンバーシップなし',
    'myStakingBalance': 'ステーキング残高:',
    'earnedInterest': '獲得した利息:',
    'timeElapsed': '経過時間',
    'staking': 'ステーキング',
    'withdrawBalance': '残高引き出し',
    'withdrawInterest': '利息引き出し',
    'freeToken': 'LUX無料',
    
    // Membership tab
    'boostEarnings': '🚀 収益を増やしましょう！🚀',
    'upgradeMembership': 'メンバーシップをアップグレードすると、ステーキングのAPYが大幅に向上します ✨',
    'vipMemberships': 'VIPメンバーシップ',
    
    // Referral tab
    'inviteFriends': '友人を招待！',
    'referralDesc': '友人1人あたり5 LUXを獲得',
    'earnTogether': '💰 一緒にもっと稼ごう！💰',
    'totalReferrals': '紹介総数',
    'totalEarnings': '総収益',
    'yourReferralCode': '紹介コード',
    'shareCode': 'このコードを友人と共有',
    'shareLink': 'リンクを共有',
    'showQRCode': 'QRコードを表示',
    'howItWorks': '仕組み',
    'howItWorks1': '紹介コードを友人と共有',
    'howItWorks2': '登録で5 LUXを獲得',
    'howItWorks3': '紹介人数に制限なし！',
    
    // Toast messages
    'insufficientBalance': '残高不足',
    'noBalanceWithdraw': '引き出し可能な残高なし',
    'noInterestClaim': '受け取り可能な利息なし',
    'paymentFailed': '支払い失敗',
    'successfullyStaked': '{amount} LUXのステーキング成功！',
    'claimedRewards': '{amount} LUXを受け取りました！',
    'claimedInterest': '{amount} LUXの利息を受け取りました！',
    'withdrewBalance': '{amount} LUXを引き出しました！',
    'membershipActivated': '{tier}メンバーシップが有効化されました！',
    
    // Footer
    'poweredBy': 'Worldcoin提供',
    'termsPrivacy': '利用規約とプライバシー',
    
    // World App Required
    'worldAppRequired': 'World Appが必要です',
    'openInWorldApp': 'このミニアプリはWorld App内でのみ使用できます。続けるにはWorld Appで開いてください。',
    'downloadWorldApp': 'アプリストアからWorld Appをダウンロードし、"Luminex"を検索してください',
    'download': 'World Appをダウンロード',
    
    // Verification
    'verifyHumanity': '人間性を確認',
    'verifyDesc': 'アプリケーションにアクセスするには、人間性を確認する必要があります。',
    'verify': '確認',
  },
  es: {
    // Header
    'appName': 'Luminex Staking',
    'premiumPlatform': 'Plataforma de Staking Premium',
    'yourBalance': 'TU SALDO:',
    
    // Staking tab
    'myCurrentMembership': 'Mi Membresía Actual:',
    'noMembership': 'Sin membresía',
    'myStakingBalance': 'Mi Saldo de Staking:',
    'earnedInterest': 'Interés Ganado:',
    'timeElapsed': 'Tiempo transcurrido',
    'staking': 'STAKING',
    'withdrawBalance': 'RETIRAR SALDO',
    'withdrawInterest': 'RETIRAR INTERÉS',
    'freeToken': 'OBTENER LUX GRATIS',
    
    // Membership tab
    'boostEarnings': '🚀 ¡Aumenta tus ganancias! 🚀',
    'upgradeMembership': 'Actualizar tu Membresía te da un APY mucho más alto para tu Staking ✨',
    'vipMemberships': 'MEMBRESÍAS VIP',
    
    // Referral tab
    'inviteFriends': '¡Invita Amigos!',
    'referralDesc': 'Obtén 5 LUX por cada amigo que invites',
    'earnTogether': '💰 ¡Gana Más Juntos! 💰',
    'totalReferrals': 'Invitaciones Totales',
    'totalEarnings': 'Ganancias Totales',
    'yourReferralCode': 'Tu Código de Referido',
    'shareCode': 'Comparte este código con amigos',
    'shareLink': 'Compartir Enlace',
    'showQRCode': 'Mostrar Código QR',
    'howItWorks': 'Cómo Funciona',
    'howItWorks1': 'Comparte tu código de referido con amigos',
    'howItWorks2': 'Obtén 5 LUX cuando se registren',
    'howItWorks3': '¡Invitaciones ilimitadas!',
    
    // Toast messages
    'insufficientBalance': 'Saldo insuficiente',
    'noBalanceWithdraw': 'Sin saldo para retirar',
    'noInterestClaim': 'Sin interés para reclamar',
    'paymentFailed': 'Pago fallido',
    'successfullyStaked': '¡Hace staking de {amount} LUX exitosamente!',
    'claimedRewards': '¡Reclamaste {amount} LUX!',
    'claimedInterest': '¡Reclamaste {amount} LUX de interés!',
    'withdrewBalance': '¡Retiraste {amount} LUX!',
    'membershipActivated': '¡Membresía {tier} activada!',
    
    // Footer
    'poweredBy': 'Impulsado por Worldcoin',
    'termsPrivacy': 'Términos y Privacidad',
    
    // World App Required
    'worldAppRequired': 'World App Requerido',
    'openInWorldApp': 'Esta Mini App solo puede usarse dentro de World App. Abre en World App para continuar.',
    'downloadWorldApp': 'Descarga World App desde tu tienda de aplicaciones y busca "Luminex"',
    'download': 'Descargar World App',
    
    // Verification
    'verifyHumanity': 'Verificar Humanidad',
    'verifyDesc': 'Debes verificar tu humanidad para acceder a la aplicación.',
    'verify': 'Verificar',
  },
};

// Use POOLS from constants and add UI styling
const POOLS = POOLS_FROM_CONSTANTS.map((pool, index) => ({
  ...pool,
  icon: POOL_ICONS[index],
  color: POOL_COLORS[index],
  bgColor: POOL_BG_COLORS[index],
}));

// Use MEMBERSHIP_TIERS from constants and add UI styling
const MEMBERSHIP_TIERS = MEMBERSHIP_TIERS_FROM_CONSTANTS.map((tier) => ({
  ...tier,
  color: MEMBERSHIP_COLORS[tier.id],
  sparkle: MEMBERSHIP_SPARKLE[tier.id],
}));

// useWorldID and useMiniKit have been moved to hooks/useWallet.ts
// Use useWallet hook instead

const isWorldApp = () => {
  if (typeof window === 'undefined') return false;
  const hasMiniKit = !!(window as any).MiniKit;
  const ua = (navigator && navigator.userAgent) ? navigator.userAgent : '';
  const looksLikeWorldApp = /WorldApp|MiniApp|WorldAppWebView|WorldAppAndroid|WorldAppIOS/i.test(ua);
  const params = new URLSearchParams(window.location.search);
  const queryOverride = params.has('inapp') || params.get('inapp') === '1';
  const envOverride = (process.env.NEXT_PUBLIC_FORCE_INAPP || '').toString() === 'true';
  return hasMiniKit || looksLikeWorldApp || queryOverride || envOverride;
};

const LuminexApp = () => {
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'staking' | 'membership' | 'referral' | 'game'>('staking');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPool, setSelectedPool] = useState(0);
  const [stakeAmount, setStakeAmount] = useState('');
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [isShowInput, setIsShowInput] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Use custom hooks
  const walletHook = useWallet(verifiedAddress);
  const { toast, showToast } = useToast();
  const languageHook = useLanguage();
  
  // Extract values from hooks
  const {
    actualAddress,
    provider,
    userInfo,
    setUserInfo,
    balance,
    wldBalance,
    isLoadingBalance,
    formattedBalance,
    formattedWldBalance,
    fetchBalance: walletFetchBalance,
  } = walletHook;
  
  const { language, showLanguageMenu, setShowLanguageMenu, setLanguage: setLanguageHook, t, activeLanguage } = languageHook;

  // Use staking hook
  const stakingHook = useStaking(
    actualAddress,
    provider,
    selectedPool,
    (message) => showToast(message, 'success'),
    (message) => showToast(message, 'error')
  );

  const {
    stakedAmount,
    pendingRewards,
    timeElapsed,
    isStaking,
    isClaiming,
    isWithdrawing,
    isClaimingInterest,
    formattedStakedAmount,
    formattedPendingRewards,
    handleStake: handleStakeHook,
    handleClaimRewards,
    handleWithdrawBalance,
    handleClaimInterest,
    fetchStakingData,
  } = stakingHook;

  // Use power hook
  const powerHook = usePower(
    actualAddress,
    (message) => showToast(message, 'success'),
    (message) => showToast(message, 'error'),
    () => walletFetchBalance()
  );

  const {
    currentPower,
    isPurchasingPower,
    handlePurchasePower,
    fetchPowerStatus,
  } = powerHook;

  // Use referral hook
  const referralHook = useReferral(
    actualAddress,
    verified,
    language,
    (message) => showToast(message, 'success')
  );

  const {
    referralCode,
    safeReferralCode,
    safeTotalReferrals,
    safeTotalEarnings,
    copied,
    setCopied,
  } = referralHook;

  // Check if user is admin
  useEffect(() => {
    if (actualAddress) {
      const isAdminUser = actualAddress.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase();
      setIsAdmin(isAdminUser);
    } else {
      setIsAdmin(false);
    }
  }, [actualAddress]);

  // Wrapper for handleStake to handle modal state
  const handleStake = useCallback(async () => {
    if (!stakeAmount) {
      setIsShowInput(true);
      return;
    }
    await handleStakeHook(stakeAmount, selectedPool, balance);
    if (stakeAmount) {
      setShowStakeModal(false);
      setIsShowInput(false);
      setStakeAmount('');
    }
  }, [stakeAmount, selectedPool, balance, handleStakeHook]);

  useEffect(() => {
    // Get verified status and address from sessionStorage
    if (typeof window !== 'undefined') {
      // Register PWA service worker
      registerServiceWorker();
      // Improve mobile touch interactions
      improveTouchInteractions();

      // For World App: load verified status and address
      if (isWorldApp()) {
        const verifiedFromStorage = sessionStorage.getItem('verified');
        if (verifiedFromStorage === 'true') {
          setVerified(true);
        }
        
        const verifiedAddr = sessionStorage.getItem('verifiedAddress');
        if (verifiedAddr) {
          setVerifiedAddress(verifiedAddr);
        }
      }
      
      const userName = sessionStorage.getItem('userName');
      if (userName) {
        setUserInfo({ name: userName, username: userName });
      }
    }
  }, [setUserInfo]);


  // Initial loading screen - show before verification
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const hideLoading = () => {
      // Wait minimum 1.5 seconds for smooth UX
      timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 1500);
    };

    // Check if page is already loaded
    if (document.readyState === 'complete') {
      hideLoading();
    } else {
      // Wait for page to fully load
      window.addEventListener('load', hideLoading, { once: true });
    }
    
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('load', hideLoading);
    };
  }, []);

  // Show loading screen first
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden flex items-center justify-center">
        {/* Elegant gold background particles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/8 rounded-full blur-3xl"
            animate={{ 
              opacity: [0.1, 0.2, 0.1],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-amber-500/6 rounded-full blur-3xl"
            animate={{ 
              opacity: [0.08, 0.15, 0.08],
              scale: [1, 1.15, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-yellow-400/5 rounded-full blur-3xl"
            animate={{ 
              opacity: [0.05, 0.12, 0.05],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </div>
        
                  <div className="text-center relative z-10 max-w-md w-full px-4">      
            {/* Large Logo - 3D */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative inline-block mb-8 flex justify-center"
            >
              <Logo3D size={160} interactive={true} />
            </motion.div>
          
          {/* Gold spinner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="relative w-20 h-20 mx-auto mb-6"
          >
            <div className="absolute inset-0 border-4 border-yellow-600/30 border-t-yellow-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-0 border-4 border-transparent border-r-yellow-400/40 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
          </motion.div>
          
          {/* Loading text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-yellow-400/90 text-xl font-medium tracking-wide mb-4"
            style={{
              textShadow: '0 0 10px rgba(234, 179, 8, 0.5)'
            }}
          >
            Loading Luminex...
          </motion.p>
          
          {/* Animated dots */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex items-center justify-center gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-yellow-500 rounded-full"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.3, 1],
                  y: [0, -5, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

    // Require World App verification
  if (!verified && isWorldApp()) {
    return (
      <WorldIDVerification 
        onVerify={async () => {
          console.log('🔄 onVerify callback called');
          
          // Read verified address from sessionStorage after verification
          if (typeof window !== 'undefined') {
            const verifiedAddr = sessionStorage.getItem('verifiedAddress') || localStorage.getItem('user_address');
            console.log('📍 Verified address from storage:', verifiedAddr);
            
            if (verifiedAddr) {
              const normalizedAddr = verifiedAddr.toLowerCase();
              setVerifiedAddress(normalizedAddr);
              console.log('✅ Verified address set in state:', normalizedAddr);
            } else {
              console.warn('⚠️ No verified address found in storage');
            }
            
            const userName = sessionStorage.getItem('userName');
            if (userName) {
              setUserInfo({ name: userName, username: userName });
              console.log('✅ User name set:', userName);
            }
          }
          
          // Set verified state
          setVerified(true);
          console.log('✅ Verified status set to true');
          
          // Force wallet connection after verification
          // Wait a bit for state to update, then connect wallet
          setTimeout(async () => {
            console.log('🔌 Attempting to connect wallet after verification...');
            try {
              // Check if walletHook has connectWallet
              if (walletHook && walletHook.connectWallet) {
                await walletHook.connectWallet();
                console.log('✅ Wallet connected successfully after verification');
              } else {
                console.warn('⚠️ connectWallet function not available in walletHook');
              }
            } catch (err: any) {
              console.error('❌ Failed to connect wallet after verification:', err);
            }
          }, 300);
        }}
      />
    );
  }

  // Only World App is supported
  if (!verified && !isWorldApp()) {
    return (
      <TronShell showEnergyStream={false} className="bg-[#050505]">
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <TronPanel title={t('worldAppRequired') ?? 'World App Required'} padding="lg" className="max-w-md text-center">
            <p className="text-gray-300 mb-6 font-orbitron text-sm tracking-wide">
              {t('openInWorldApp') ?? 'This application only works in World App. Please open this app in World App to continue.'}
            </p>
            <TronPanel
              status="warning"
              padding="sm"
              className="bg-black/40 border-tron-orange/40 text-gray-200"
              title={t('downloadWorldApp') ?? 'Download World App'}
            >
              <p className="text-xs font-light tracking-widest text-gray-400">
                {t('download') ?? 'Download World App'}
              </p>
            </TronPanel>
          </TronPanel>
        </div>
      </TronShell>
    );
  }

  const currentPool = POOLS_FROM_CONSTANTS[selectedPool];
  const baseApy = BASE_APY; // Base APY is now 50% (from powerConfig)
  const powerBoost = currentPower ? getPowerBoost(getPowerByCode(currentPower.code) || null) : 0;
  const totalApy = currentPower ? currentPower.totalAPY : baseApy;

  return (
    <TronShell>
      <AppHeader
        actualAddress={actualAddress}
        userInfo={userInfo}
        formattedBalance={formattedBalance}
        formattedWldBalance={formattedWldBalance}
        isLoadingBalance={isLoadingBalance}
        language={language}
        showLanguageMenu={showLanguageMenu}
        setShowLanguageMenu={setShowLanguageMenu}
        setLanguage={setLanguageHook}
        t={t}
      />

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-24 pt-4">
        <BroadcastMessage />
        <AnimatePresence mode="wait">
          {activeTab === 'staking' && (
            <StakingTab
              selectedPool={selectedPool}
              setSelectedPool={setSelectedPool}
              currentPower={currentPower}
              totalApy={totalApy}
              baseApy={baseApy}
              powerBoost={powerBoost}
              actualAddress={actualAddress}
              STAKING_CONTRACT_ADDRESS={STAKING_CONTRACT_ADDRESS}
              formattedStakedAmount={formattedStakedAmount}
              formattedPendingRewards={formattedPendingRewards}
              timeElapsed={timeElapsed}
              setShowStakeModal={setShowStakeModal}
              handleClaimInterest={handleClaimInterest}
              handleWithdrawBalance={handleWithdrawBalance}
              setActiveTab={setActiveTab}
              isClaimingInterest={isClaimingInterest}
              isWithdrawing={isWithdrawing}
              pendingRewards={pendingRewards}
              stakedAmount={stakedAmount}
              t={t}
            />
          )}

          {activeTab === 'membership' && (
            <MembershipTab
              currentPower={currentPower}
              totalApy={totalApy}
              isPurchasingPower={isPurchasingPower}
              handlePurchasePower={handlePurchasePower}
            />
          )}

          {activeTab === 'referral' && (
            <ReferralTab
              safeTotalReferrals={safeTotalReferrals}
              safeTotalEarnings={safeTotalEarnings}
              safeReferralCode={safeReferralCode}
              referralCode={referralCode}
              copied={copied}
              setCopied={setCopied}
              setShowQRModal={setShowQRModal}
              t={t}
            />
          )}

          {activeTab === 'game' && <GameTab />}
        </AnimatePresence>
      </main>

      <StakeModal
        showStakeModal={showStakeModal}
        setShowStakeModal={setShowStakeModal}
        isShowInput={isShowInput}
        setIsShowInput={setIsShowInput}
        stakeAmount={stakeAmount}
        setStakeAmount={setStakeAmount}
        balance={balance}
        isStaking={isStaking}
        handleStake={handleStake}
      />

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />

      <Toast toast={toast} />

      <QRModal
        showQRModal={showQRModal}
        setShowQRModal={setShowQRModal}
        safeReferralCode={safeReferralCode}
        showToast={showToast}
      />
    </TronShell>
  );
};

export default LuminexApp;

// --- MiniKitPanel bootstrap (non-destructive) ---
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const id = '__minikit_panel__';
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
      }
      // use React 18 root
      const { createRoot } = await import('react-dom/client');
      // @ts-ignore
      const root = el.__root || createRoot(el);
      // @ts-ignore
      el.__root = root;
      root.render(<MiniKitPanel />);
    } catch (e) {
      // MiniKitPanel bootstrap error - silent error handling
    }
  })();
}