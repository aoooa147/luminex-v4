'use client';

/// <reference path="../luminex-unified-app.ts" />
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import dynamic from 'next/dynamic';
import { MiniKit, tokenToDecimals, Tokens } from '@worldcoin/minikit-js';
import { WORLD_APP_ID as ENV_WORLD_APP_ID, WORLD_ACTION as ENV_WORLD_ACTION, WALLET_RPC_URL, WALLET_CHAIN_ID, CONTRACT_RPC_URL, CONTRACT_CHAIN_ID, LUX_TOKEN_ADDRESS as LUX_TOKEN_ADDRESS_FROM_CONSTANTS, STAKING_CONTRACT_ADDRESS as STAKING_CONTRACT_ADDRESS_FROM_CONSTANTS, WLD_TOKEN_ADDRESS as WLD_TOKEN_ADDRESS_FROM_CONSTANTS, TREASURY_ADDRESS as TREASURY_ADDRESS_FROM_CONSTANTS } from '@/lib/utils/constants';
import { POWERS, BASE_APY, getPowerByCode, getPowerBoost, type PowerCode } from '@/lib/utils/powerConfig';
import { useMiniKit as useMiniKitVerify } from '@/hooks/useMiniKit';
const MiniKitPanel = dynamic(() => import('@/components/MiniKitPanel'), { ssr: false });
const GameLauncherCard = dynamic(() => import('@/components/game/GameLauncherCard'), { ssr: false });
import { 
  Wallet, Shield, Coins, TrendingUp, Settings, Gift, Users, Zap, Lock, Unlock, 
  AlertTriangle, ExternalLink, Copy, Check, Loader2, Clock, Star, Droplet,
  DollarSign, Eye, BarChart3, Flame, Trophy, Award, TrendingDown, Globe, 
  PiggyBank, CreditCard, Gem, Sparkles, Crown, Rocket, DollarSign as DollarIcon,
  Calendar, Timer, TrendingUp as TrendingIcon, Share2, UserPlus, QrCode, Gamepad2
} from "lucide-react";

const LOGO_URL = "https://i.postimg.cc/wvJqhSYW/Gemini-Generated-Image-ggu8gdggu8gdggu8-1.png";
const TOKEN_NAME = "LUX";
// Use TREASURY_ADDRESS from constants.ts (can be overridden by NEXT_PUBLIC_TREASURY_ADDRESS env variable)
const TREASURY_ADDRESS = TREASURY_ADDRESS_FROM_CONSTANTS; // Default: 0xdc6c9ac4c8ced68c9d8760c501083cd94dcea4e8

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

// Optimism Sepolia testnet RPC (legacy)
const RPC_URL = "https://sepolia.optimism.io";

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

// Language translations
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
    'referralDesc': 'Get 50 LUX for each friend you invite',
    'earnTogether': '💰 Earn More Together! 💰',
    'totalReferrals': 'Total Referrals',
    'totalEarnings': 'Total Earnings',
    'yourReferralCode': 'Your Referral Code',
    'shareCode': 'Share this code with friends',
    'shareLink': 'Share Link',
    'showQRCode': 'Show QR Code',
    'howItWorks': 'How It Works',
    'howItWorks1': 'Share your referral code with friends',
    'howItWorks2': 'Get 50 LUX when they sign up',
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
    'referralDesc': 'รับ 50 LUX สำหรับแต่ละคนที่คุณเชิญ',
    'earnTogether': '💰 ร่วมกันหารายได้มากขึ้น! 💰',
    'totalReferrals': 'เชิญเพื่อนทั้งหมด',
    'totalEarnings': 'รายได้รวม',
    'yourReferralCode': 'รหัสแนะนำของคุณ',
    'shareCode': 'แชร์รหัสนี้กับเพื่อน',
    'shareLink': 'แชร์ลิงก์',
    'showQRCode': 'แสดง QR Code',
    'howItWorks': 'วิธีการทำงาน',
    'howItWorks1': 'แชร์รหัสแนะนำของคุณกับเพื่อน',
    'howItWorks2': 'รับ 50 LUX เมื่อพวกเขาสมัคร',
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
    'referralDesc': '每邀请一位朋友即可获得 50 LUX',
    'earnTogether': '💰 一起赚更多！💰',
    'totalReferrals': '总推荐人数',
    'totalEarnings': '总收入',
    'yourReferralCode': '您的推荐代码',
    'shareCode': '与朋友分享此代码',
    'shareLink': '分享链接',
    'showQRCode': '显示二维码',
    'howItWorks': '如何运作',
    'howItWorks1': '与朋友分享您的推荐代码',
    'howItWorks2': '他们注册时您将获得 50 LUX',
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
    'referralDesc': '友人1人あたり50 LUXを獲得',
    'earnTogether': '💰 一緒にもっと稼ごう！💰',
    'totalReferrals': '紹介総数',
    'totalEarnings': '総収益',
    'yourReferralCode': '紹介コード',
    'shareCode': 'このコードを友人と共有',
    'shareLink': 'リンクを共有',
    'showQRCode': 'QRコードを表示',
    'howItWorks': '仕組み',
    'howItWorks1': '紹介コードを友人と共有',
    'howItWorks2': '登録で50 LUXを獲得',
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
    'referralDesc': 'Obtén 50 LUX por cada amigo que invites',
    'earnTogether': '💰 ¡Gana Más Juntos! 💰',
    'totalReferrals': 'Invitaciones Totales',
    'totalEarnings': 'Ganancias Totales',
    'yourReferralCode': 'Tu Código de Referido',
    'shareCode': 'Comparte este código con amigos',
    'shareLink': 'Compartir Enlace',
    'showQRCode': 'Mostrar Código QR',
    'howItWorks': 'Cómo Funciona',
    'howItWorks1': 'Comparte tu código de referido con amigos',
    'howItWorks2': 'Obtén 50 LUX cuando se registren',
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

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

const POOLS = [
  { id: 0, name: "Flexible", lockDays: 0, apy: 50, icon: Unlock, color: "from-blue-400 to-cyan-400", bgColor: "bg-blue-500/10", desc: "No lock required" },
  { id: 1, name: "30 Days", lockDays: 30, apy: 75, icon: Lock, color: "from-green-400 to-emerald-400", bgColor: "bg-green-500/10", desc: "Lock for 30 days" },
  { id: 2, name: "90 Days", lockDays: 90, apy: 125, icon: Lock, color: "from-purple-400 to-pink-400", bgColor: "bg-purple-500/10", desc: "Lock for 90 days" },
  { id: 3, name: "180 Days", lockDays: 180, apy: 175, icon: Lock, color: "from-orange-400 to-red-400", bgColor: "bg-orange-500/10", desc: "Lock for 180 days" },
  { id: 4, name: "365 Days", lockDays: 365, apy: 325, icon: Lock, color: "from-red-500 to-pink-500", bgColor: "bg-red-500/10", desc: "Maximum APY!" },
];

const MEMBERSHIP_TIERS = [
  { id: 'bronze', name: 'Bronze', apy: 75, price: '1 WLD', color: 'from-amber-700 to-orange-700', icon: '🥉' },
  { id: 'silver', name: 'Silver', apy: 125, price: '5 WLD', color: 'from-slate-400 to-gray-500', icon: '🥈' },
  { id: 'gold', name: 'Gold', apy: 175, price: '10 WLD', color: 'from-yellow-400 to-yellow-600', icon: '🥇' },
  { id: 'platinum', name: 'Platinum', apy: 325, price: '50 WLD', color: 'from-cyan-400 to-blue-400', sparkle: true, icon: '💎' },
  { id: 'diamond', name: 'Diamond', apy: 500, price: '200 WLD', color: 'from-indigo-400 to-purple-500', sparkle: true, icon: '👑' },
];

const useWorldID = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  const verifyProof = async () => {
    // World ID verification is handled by IDKitWidget
    // This function is not used but kept for compatibility
    setIsVerifying(true);
    setIsVerified(false);
    setIsVerifying(false);
  };

  return { isVerified, isVerifying, userAddress, verifyProof };
};

const useMiniKit = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [userInfo, setUserInfo] = useState<{ name?: string; username?: string } | null>(null);

  const connectWallet = async () => {
    try {
      // Check if running in World App with MiniKit
      if (typeof window !== 'undefined' && (window as any).MiniKit) {
        console.log('🔗 Connecting to World App MiniKit wallet...');
        const MiniKit = (window as any).MiniKit;
        
        // Use MiniKit.commandsAsync.walletAuth (new API)
        if (MiniKit.commandsAsync?.walletAuth) {
          const nonce = crypto.randomUUID().replace(/-/g, '');
          const result = await MiniKit.commandsAsync.walletAuth({ nonce });
          const walletData = result.finalPayload;
          
          console.log('🔍 Wallet auth result:', { result, finalPayload: walletData });
          console.log('🔍 Full walletData object keys:', walletData ? Object.keys(walletData) : 'no data');
          
        if (walletData?.address) {
            console.log('🔍 Setting wallet state with address:', walletData.address);
            setWallet({ address: walletData.address });
    setIsConnected(true);
            
            // Try to get username from MiniKit.user.username first
            let foundUsername: string | null = null;
            console.log('🔍 Checking MiniKit.user:', MiniKit.user);
            console.log('🔍 Checking MiniKit methods:', Object.keys(MiniKit));
            try {
              if (MiniKit.user?.username) {
                foundUsername = MiniKit.user.username;
                console.log('✅ Found username from MiniKit.user.username:', foundUsername);
        } else {
                console.log('⚠️ MiniKit.user.username is empty or undefined');
              }
            } catch (e: any) {
              console.log('⚠️ MiniKit.user.username not available:', e?.message);
            }
            
            // If not found, try getUserByAddress
            if (!foundUsername) {
              console.log('🔍 Trying MiniKit.getUserByAddress for:', walletData.address);
              try {
                if (MiniKit.getUserByAddress) {
                  const worldIdUser = await MiniKit.getUserByAddress(walletData.address);
                  console.log('🔍 getUserByAddress result:', worldIdUser);
                  if (worldIdUser?.username) {
                    foundUsername = worldIdUser.username;
                    console.log('✅ Found username from MiniKit.getUserByAddress:', foundUsername);
              } else {
                    console.log('⚠️ getUserByAddress returned no username');
                  }
              } else {
                  console.log('⚠️ MiniKit.getUserByAddress method not available');
                }
              } catch (e: any) {
                console.log('⚠️ Error calling MiniKit.getUserByAddress:', e?.message);
              }
            }
            
            // Try to extract user info from walletData if available
            if (walletData?.name || walletData?.username) {
              setUserInfo({ 
                name: walletData.name || foundUsername, 
                username: walletData.username || foundUsername
              });
              console.log('✅ Found user info from walletData:', { name: walletData.name, username: walletData.username });
            } else if (foundUsername) {
              setUserInfo({ name: foundUsername, username: foundUsername });
              console.log('✅ Using username from MiniKit:', foundUsername);
          } else {
              setUserInfo(null);
              console.log('⚠️ No user info found in MiniKit');
            }
            
            // Always use Worldchain for World App MiniKit
            console.log('🔗 Using Worldchain RPC URL:', WALLET_RPC_URL);
            
            // Create provider for reading blockchain data from Worldchain
            const rpcProvider = new ethers.JsonRpcProvider(WALLET_RPC_URL);
            setProvider(rpcProvider);
            
            console.log('✅ Connected to wallet:', walletData.address, 'on Worldchain');
            console.log('✅ Wallet state will be updated. actualAddress should be:', walletData.address);
          } else {
            console.warn('⚠️ MiniKit walletAuth returned no address');
            console.warn('⚠️ Wallet data:', walletData);
        }
      } else {
          console.warn('⚠️ MiniKit.commandsAsync.walletAuth not available');
        }
      } else {
        // Only World App is supported
        console.warn('⚠️ MiniKit is not available. Please open this app in World App.');
      }
    } catch (error) {
      console.error('❌ Error connecting wallet:', error);
    }
  };

  const requestPayment = async (params: { amount: string; currency: string; description: string }) => {
    console.log("💳 Payment request:", params);
    console.log("🔍 DEBUG → params.amount:", params.amount, "type:", typeof params.amount);
    
    try {
            // Ensure amount is a valid string first
      const amountStr = String(params.amount || '0').trim();
      console.log("🔍 DEBUG → amountStr after String():", amountStr);
      
      const amount = parseFloat(amountStr);
      console.log("🔍 DEBUG → amount after parseFloat():", amount);

      if (!amount || amount <= 0 || isNaN(amount)) {
        console.error("❌ Invalid amount:", { amount, amountStr, original: params.amount });
        return { success: false, error: 'Invalid amount' };
      }

      // Preserve the original amount string format (don't use toString() which may lose precision)
      // This ensures "1" stays as "1", "5" stays as "5", etc.
      const validatedAmountStr = amountStr; // Use original string, already validated above

      // Check if running in World App with MiniKit
      const hasMiniKit = typeof window !== 'undefined' && (window as any).MiniKit?.commandsAsync?.pay;
      
      if (hasMiniKit) {
        // Use MiniKit pay API for World App
        console.log(`💸 Using MiniKit pay API: ${amount} ${params.currency} to ${TREASURY_ADDRESS}...`);
        
        try {
          // Generate payment reference - use validatedAmountStr to preserve exact format
          const referenceResponse = await fetch('/api/initiate-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: validatedAmountStr, symbol: params.currency || 'WLD' })
          });
          
          const referenceData = await referenceResponse.json();
          if (!referenceData.id) {
            return { success: false, error: 'Failed to generate payment reference' };
          }
          
                              const referenceId = referenceData.id;
          console.log('✅ Generated payment reference:', referenceId);

          // Validate referenceId
          if (!referenceId || typeof referenceId !== 'string' || referenceId.length < 8) {
            return { success: false, error: 'Invalid payment reference ID' };
          }

          // Validate TREASURY_ADDRESS
          const treasuryAddr = String(TREASURY_ADDRESS);
          if (!treasuryAddr || !treasuryAddr.startsWith('0x') || treasuryAddr.length !== 42) {
            console.error('❌ Invalid TREASURY_ADDRESS:', treasuryAddr);
            return { success: false, error: 'Invalid treasury address configuration' };
      }
      
          // Check for zero address (runtime check)
          const zeroAddress = '0x0000000000000000000000000000000000000000';
          if (treasuryAddr.toLowerCase() === zeroAddress.toLowerCase()) {
            console.error('❌ TREASURY_ADDRESS is zero address! Please configure NEXT_PUBLIC_TREASURY_ADDRESS correctly.');
            return { success: false, error: 'Treasury address not configured. Please set NEXT_PUBLIC_TREASURY_ADDRESS in environment variables.' };
          }

          console.log('✅ TREASURY_ADDRESS validated:', treasuryAddr);

                    // Call MiniKit pay API directly (cannot use hooks inside functions)
          // Note: MiniKit is already imported at the top of the file
          if (!MiniKit?.isInstalled() || !MiniKit?.commandsAsync?.pay) {
            return { success: false, error: 'MiniKit pay API not available' };
          }

          const tokenType = (params.currency || 'WLD').toUpperCase();

                    // Validate tokenType
          if (tokenType !== 'WLD' && tokenType !== 'USDC') {
            return { success: false, error: `Unsupported token: ${tokenType}. Only WLD and USDC are supported.` };
      }

          // Use validatedAmountStr (original string format) to preserve exact format
          const finalAmountStr = validatedAmountStr;
          console.log("🔍 DEBUG → finalAmountStr for MiniKit pay:", finalAmountStr, "original amount:", amount, "validatedAmountStr:", validatedAmountStr);                                             

          if (!finalAmountStr || isNaN(parseFloat(finalAmountStr)) || parseFloat(finalAmountStr) <= 0) {                                                        
            console.error("❌ Invalid finalAmountStr:", finalAmountStr);
            return { success: false, error: 'Invalid amount format' };
          }

          // Convert amount to decimals using tokenToDecimals() as per MiniKit documentation
          // WLD has 18 decimals, USDC has 6 decimals
          // Example: tokenToDecimals(1, Tokens.WLD) = 1000000000000000000 (1 * 10^18)
          const tokenSymbol = tokenType === 'WLD' ? Tokens.WLD : Tokens.USDC;
          const amountInDecimals = tokenToDecimals(parseFloat(finalAmountStr), tokenSymbol);
          const tokenAmountStr = amountInDecimals.toString();
          
          console.log("🔍 DEBUG → Amount conversion:", {
            humanReadable: finalAmountStr,
            tokenSymbol: tokenSymbol,
            amountInDecimals: amountInDecimals.toString(),
            tokenAmountStr: tokenAmountStr
          });

          // MiniKit v1.9.8+ requires tokens as TokensPayload array with symbol and token_amount
          // token_amount MUST be in smallest unit (decimals) as per documentation
          const payPayload = {
            reference: referenceId,
            to: treasuryAddr, // Use validated address
            tokens: [{
              symbol: tokenSymbol, // Tokens.WLD or Tokens.USDC (enum, not string)
              token_amount: tokenAmountStr // Amount in decimals (e.g., "1000000000000000000" for 1 WLD)
            }],
            description: params.description || `Payment of ${finalAmountStr} ${tokenType}`, // Required in v1.9.8+
          };

          console.log(`💳 Calling MiniKit pay:`, JSON.stringify(payPayload, null, 2));
          console.log(`🔍 DEBUG → amount about to pay:`, finalAmountStr, "in tokens:", payPayload.tokens[0].token_amount);
          console.log(`🔍 DEBUG → Full tokens array:`, JSON.stringify(payPayload.tokens, null, 2));
          console.log(`🔍 DEBUG → token_amount value:`, payPayload.tokens[0].token_amount, "type:", typeof payPayload.tokens[0].token_amount);
      
                        // Call MiniKit pay API - v1.9.8+ requires TokensPayload format     
            let payResult;
            try {
              payResult = await MiniKit.commandsAsync.pay(payPayload);
          } catch (payApiError: any) {
            console.error('❌ MiniKit.commandsAsync.pay() threw error:', payApiError);
            
            // Detect user cancellation from SDK error
            const msg = String(payApiError?.message || '').toLowerCase();
            const desc = String(payApiError?.description || '').toLowerCase();
            const code = String(payApiError?.code || payApiError?.error_code || '').toLowerCase();
            
            // Case: User cancelled/rejected/closed the payment window
            if (
              code.includes('user_rejected') || 
              code.includes('cancelled') || 
              code.includes('cancel') ||
              msg.includes('cancel') || 
              msg.includes('rejected') ||
              msg.includes('user') ||
              desc.includes('cancel') ||
              desc.includes('rejected')
            ) {
              return {
                success: false,
                error: 'user_cancelled',
                userCancelled: true
              };
            }
            
            return {
              success: false,
              error: payApiError?.message || payApiError?.description || 'Payment failed: MiniKit API error'                                                    
            };
          }

          const finalPayload = payResult?.finalPayload;
          console.log('✅ MiniKit pay result (finalPayload):', finalPayload);

          // Check if finalPayload exists
          if (!finalPayload) {
            console.error('❌ MiniKit pay did not return finalPayload');
            return { success: false, error: 'Payment failed: No transaction data received' };
          }
          console.log('📦 Final payload:', finalPayload);

                              // Check if finalPayload has error status or no transaction_id (user cancelled)
          const payloadAny = finalPayload as any;
          if (payloadAny?.status === 'error' || !payloadAny?.transaction_id) {
            console.error('❌ MiniKit pay returned error or no transaction_id:', finalPayload);
            
            // Check if it's user cancellation
            const msg = String(payloadAny?.description || payloadAny?.error_code || '').toLowerCase();
            if (
              msg.includes('cancel') || 
              msg.includes('rejected') ||
              msg.includes('user') ||
              !payloadAny?.transaction_id
            ) {
              return {
                success: false,
                error: 'user_cancelled',
                userCancelled: true
              };
            }
            
            return {
              success: false,
              error: payloadAny.description || payloadAny.error_code || 'Payment failed: MiniKit returned error'                                                
            };
          }

                    // Send finalPayload to confirm-payment API to get transaction details
          // This is the same pattern as MiniKitPanel.tsx
          try {
            const confirmResponse = await fetch('/api/confirm-payment', {       
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ payload: finalPayload })
            });
            const confirmData = await confirmResponse.json();
            console.log('📦 Confirm response:', confirmData);
      
            // Check if confirm-payment returned error
            if (!confirmData.success) {
              console.error('❌ Confirm-payment API error:', confirmData);      
              return {
                success: false,
                error: confirmData.error || 'Payment confirmation failed'       
              };
            }

            // Extract transaction_id from confirm-payment response
            const transactionId = confirmData?.transaction?.transaction_id;     

            if (!transactionId) {
              console.error('❌ No transaction_id in confirm response:', confirmData);
              
              // Check if it's user cancellation
              if (confirmData?.code === 'user_cancelled' || confirmData?.error?.includes('missing transaction_id')) {
                return { 
                  success: false, 
                  error: 'user_cancelled',
                  userCancelled: true
                };
              }
              
              return { success: false, error: 'Payment failed: No transaction ID received' };                                                                   
            }

            console.log('🔄 Starting polling for transaction:', transactionId);                                                                               

            // Poll for transaction confirmation
            let attempts = 0;
            const maxAttempts = 20;

            while (attempts < maxAttempts) {
                            const statusResponse = await fetch('/api/confirm-payment', {        
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  payload: {
                    transaction_id: transactionId,
                    reference: referenceId
                  }
                })
        });

              const statusData = await statusResponse.json();
              console.log(`🔄 Poll attempt ${attempts + 1}/${maxAttempts}:`, statusData);                                                                       

              if (statusData.success && statusData.transaction) {
                const status = statusData.transaction.transaction_status || statusData.transaction.status;                                                        
                console.log('📊 Transaction status:', status);

                if (status === 'confirmed' || status === 'mined') {
                  const txHash = statusData.transaction.transaction_hash || statusData.transaction?.transaction_hash || confirmData?.transaction?.transaction_hash;                                                                               
                  console.log('✅ Payment confirmed:', txHash);
        return { 
          success: true, 
          transactionHash: txHash,
                    transaction: statusData.transaction
        };
                }

                if (status === 'failed') {
                  return { success: false, error: 'Transaction failed on blockchain' };                                                                           
                }
              }

              // Wait before next attempt
              await new Promise(resolve => setTimeout(resolve, 1500));
              attempts++;
            }

              // If polling timed out, return the transaction_id anyway (transaction might be pending)                                                              
              console.log('⏱️ Polling timeout, returning pending transaction');   
              const txHash = confirmData?.transaction?.transaction_hash || transactionId;                                                                           
  return {
          success: true, 
                transactionHash: txHash || transactionId,
                transaction: confirmData?.transaction || { transaction_id: transactionId, status: 'pending' }                                                       
              };
            } catch (confirmError: any) {
              console.error('❌ Confirm-payment API call failed:', confirmError);
              return { success: false, error: 'Payment failed: Could not confirm transaction' };
            }
          } catch (payError: any) {
          console.error('❌ MiniKit pay error:', payError);
          return { success: false, error: payError.message || 'Payment failed' };
        }
      } else {
        // Only World App is supported
        return { success: false, error: 'Payment is only available in World App. Please open this app in World App.' };
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      return { success: false, error: error.message || 'Payment failed' };
    }
  };

  // Get signer for writing transactions
  const getSigner = async () => {
    if (typeof window !== 'undefined' && (window as any).MiniKit?.commandsAsync?.sendTransaction) {
      // Return a custom signer for MiniKit
  return {
        sendTransaction: async (tx: any) => {
          return await (window as any).MiniKit!.commandsAsync!.sendTransaction({
            to: tx.to,
            data: tx.data || '0x',
            value: tx.value?.toString() || '0'
          });
        }
      };
    } else if (typeof window !== 'undefined' && (window as any).ethereum && provider) {
      return await (provider as ethers.BrowserProvider).getSigner();
    }
    return null;
  };

  return { wallet, isConnected, connectWallet, requestPayment, provider, userInfo, setUserInfo, getSigner };
};

// Optimized formatNumber function with validation
const formatNumber = (num: number, decimals = 2) => {
  // Validate input for better performance
  if (isNaN(num) || !isFinite(num)) return '0.00';
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

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

const WorldIDVerification = ({ onVerify }: { onVerify: () => void }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleVerify = async () => {
    console.log('🔴 handleVerify called!');
    setIsVerifying(true);
    setVerifyError(null);
    
    try {
      // Check if running in World App with MiniKit
      const hasWindowMiniKit = typeof window !== 'undefined' && (window as any).MiniKit;
      console.log('🔄 Starting wallet authentication...', { hasWindowMiniKit });
      
      if (hasWindowMiniKit) {
        console.log('✅ Using MiniKit wallet auth for verification');
        const MiniKit = (window as any).MiniKit;
        
        // Use MiniKit.commandsAsync.walletAuth (new API)
        if (MiniKit.commandsAsync?.walletAuth) {
          const nonce = crypto.randomUUID().replace(/-/g, '');
          const result = await MiniKit.commandsAsync.walletAuth({ nonce });
          const walletData = result.finalPayload;
          console.log('✅ Wallet auth payload received:', walletData);
          console.log('✅ Full walletData keys:', Object.keys(walletData));
          
          // Send to backend for SIWE verification
          const res = await fetch('/api/complete-siwe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload: walletData })
          });
          
          const data = await res.json();
          console.log('✅ SIWE verification response:', data);
          console.log('✅ Full SIWE data keys:', Object.keys(data));
          
        if (data.status === 'ok' && data.isValid) {
          console.log('✅ Wallet authenticated successfully');
          console.log('✅ SIWE message data:', data.siweMessageData);
          console.log('✅ Full SIWE message data keys:', data.siweMessageData ? Object.keys(data.siweMessageData) : 'none');
          
          // Store verification status in sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('verified', 'true');
            if (walletData.address) {
              sessionStorage.setItem('verifiedAddress', walletData.address);
            }
            // Store chain ID if available
            if (data.siweMessageData?.chain_id) {
              sessionStorage.setItem('chainId', String(data.siweMessageData.chain_id));
            }
            
            // Try to extract and store user info if available
            if (walletData.name || walletData.username) {
              sessionStorage.setItem('userName', walletData.name || walletData.username || '');
              console.log('✅ Stored user name:', walletData.name || walletData.username);
            }
          }
          
          onVerify();
        } else {
          const errorMsg = data.message || 'Wallet authentication failed';
          throw new Error(errorMsg);
        }
        } else {
          console.warn('⚠️ MiniKit.commandsAsync.walletAuth not available');
          throw new Error('Wallet auth not available');
        }
      } else {
        // Fallback: Skip verification or show error
        console.warn('⚠️ MiniKit not available, skipping authentication');
        // For now, just proceed without verification
        onVerify();
      }
    } catch (error: any) {
      console.error('❌ Authentication error:', error);
      setVerifyError(error.message || 'Authentication failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden flex items-center justify-center p-4" style={{ willChange: 'auto' }}>
      {/* Luxurious geometric background pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{ 
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(234, 179, 8, 0.1) 35px, rgba(234, 179, 8, 0.1) 70px),
                          repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(217, 119, 6, 0.1) 35px, rgba(217, 119, 6, 0.1) 70px)`,
        transform: 'translateZ(0)'
      }}></div>
      
      {/* Elegant gold animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ transform: 'translateZ(0)', willChange: 'auto' }}>
        <motion.div 
          className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.1, 1],
            x: [0, 20, 0],
            y: [0, 15, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.08, 0.15, 0.08],
            scale: [1, 1.15, 1],
            x: [0, -25, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-yellow-400/6 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.05, 0.12, 0.05],
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
        />
        
        {/* Floating gold particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400/30 rounded-full blur-sm"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}
        
        {/* Luxurious gold accent lines with ornaments */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-600/40 via-yellow-500/50 via-yellow-600/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-600/40 via-yellow-500/50 via-yellow-600/40 to-transparent"></div>
        
        {/* Side accent lines */}
        <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-transparent via-yellow-600/30 to-transparent"></div>
        <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-yellow-600/30 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full">
        {/* Logo - Optimized */}
      <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-6"
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="relative inline-block w-36 h-36" style={{ transform: 'translateZ(0)' }}>
            {/* Luxurious multi-layer gold glow effects */}
            <motion.div
              className="absolute inset-0 blur-3xl bg-yellow-500/25 rounded-full"
              animate={{ 
                opacity: [0.2, 0.5, 0.2],
                scale: [1, 1.15, 1]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
            />
            <motion.div 
              className="absolute inset-0 blur-2xl bg-amber-500/20 rounded-full"
              animate={{ 
                opacity: [0.15, 0.3, 0.15],
                scale: [1.05, 1.1, 1.05]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            <div className="absolute inset-0 blur-xl bg-yellow-400/15 rounded-full"></div>
            
            {/* Decorative gold rings */}
            <motion.div
              className="absolute inset-[-10px] rounded-full border-2 border-yellow-600/20"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-[-20px] rounded-full border border-yellow-500/10"
              animate={{ rotate: [0, -360] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            />
            
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="relative w-full h-full flex items-center justify-center"
              style={{ willChange: 'transform' }}
            >
              <div className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl overflow-hidden" style={{ 
                transform: 'translateZ(0)', 
                boxShadow: '0 0 60px rgba(234, 179, 8, 0.5), 0 0 100px rgba(217, 119, 6, 0.3), inset 0 0 30px rgba(251, 191, 36, 0.1)'
              }}>
                {/* Luxurious multi-layer gold gradient border */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706, #92400e, #fbbf24)',
                    backgroundSize: '300% 300%',
                    padding: '5px'
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
                {/* Inner ornate border */}
                <div className="absolute inset-[5px] rounded-full border border-yellow-600/40" style={{ 
                  boxShadow: 'inset 0 0 20px rgba(234, 179, 8, 0.2), 0 0 10px rgba(251, 191, 36, 0.1)'
                }}></div>
                <div className="absolute inset-[8px] rounded-full bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center border border-yellow-700/40">
                  <img src={LOGO_URL} alt="Luminex Logo" className="w-full h-full object-cover rounded-full" loading="eager" style={{
                    filter: 'drop-shadow(0 0 10px rgba(234, 179, 8, 0.3))'
                  }} />
                </div>
                {/* Multi-layer inner gold glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-500/15 via-yellow-600/5 to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-radial from-yellow-400/10 via-transparent to-transparent pointer-events-none"></div>
                {/* Luxurious gold shimmer effects */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-500/20 via-transparent via-yellow-500/20 to-transparent"
                  animate={{ rotate: [360, 0] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                />
                {/* Corner ornaments */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-yellow-500/60 rounded-tl-full"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-yellow-500/60 rounded-tr-full"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-yellow-500/60 rounded-bl-full"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-yellow-500/60 rounded-br-full"></div>
              </div>
            </motion.div>
            {/* Luxurious ornate circuit rings */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 192 192" style={{ transformOrigin: 'center', transform: 'translateZ(0)' }}>
              {/* Outer ornate ring */}
              <motion.circle
                cx="96"
                cy="96"
                r="92"
                fill="none"
                stroke="url(#goldGradientOuter)"
                strokeWidth="2.5"
                strokeDasharray="16 8"
                opacity="0.7"
                style={{ transformOrigin: '96px 96px', willChange: 'transform' }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              />
              {/* Middle decorative ring */}
              <motion.circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke="url(#goldGradientMiddle)"
                strokeWidth="1.5"
                strokeDasharray="8 16"
                opacity="0.5"
                style={{ transformOrigin: '96px 96px', willChange: 'transform' }}
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              />
              {/* Inner accent ring */}
              <motion.circle
                cx="96"
                cy="96"
                r="84"
                fill="none"
                stroke="url(#goldGradientInner)"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.4"
                style={{ transformOrigin: '96px 96px', willChange: 'transform' }}
                animate={{ rotate: [0, -360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              {/* Decorative corner dots */}
              {[0, 90, 180, 270].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const x = 96 + 92 * Math.cos(rad);
                const y = 96 + 92 * Math.sin(rad);
                return (
                  <motion.circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3"
                    fill="url(#goldGradientOuter)"
                    animate={{ 
                      opacity: [0.4, 1, 0.4],
                      scale: [1, 1.3, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      delay: i * 0.5,
                      ease: "easeInOut" 
                    }}
                  />
                );
              })}
              <defs>
                <linearGradient id="goldGradientOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                  <stop offset="25%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="50%" stopColor="#d97706" stopOpacity="1" />
                  <stop offset="75%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="goldGradientMiddle" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.6" />
                </linearGradient>
                <linearGradient id="goldGradientInner" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-5xl font-black mt-6 relative"
            style={{ willChange: 'opacity' }}
          >
            <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 bg-clip-text text-transparent tracking-tight relative inline-block drop-shadow-lg">
            LUMINEX
            </span>
            {/* Elegant gold text glow effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-yellow-400/40 via-amber-400/50 to-yellow-400/40 blur-xl opacity-70 -z-10" style={{ transform: 'translateZ(0)' }}></span>
            {/* Gold text shadow */}
            <span className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 to-amber-600/20 blur-2xl -z-20" style={{ transform: 'translateZ(0)' }}></span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-transparent bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text font-bold text-sm tracking-[0.2em] uppercase mt-3"
            style={{ willChange: 'opacity', letterSpacing: '0.3em' }}
          >
            STAKING PLATFORM
          </motion.p>
        </motion.div>

                                                 {/* Luxurious Verification Card with Ornate Gold Accents */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl p-8 border-2 border-yellow-600/50 shadow-2xl overflow-hidden backdrop-blur-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(17, 24, 39, 0.95) 25%, rgba(0, 0, 0, 0.98) 50%, rgba(17, 24, 39, 0.95) 75%, rgba(0, 0, 0, 0.98) 100%)',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9), 0 0 60px rgba(234, 179, 8, 0.2), 0 0 100px rgba(217, 119, 6, 0.1), inset 0 1px 0 rgba(234, 179, 8, 0.15), inset 0 -1px 0 rgba(234, 179, 8, 0.1)',
            willChange: 'transform, opacity',
            transform: 'translateZ(0)'
          }}
        >
          {/* Luxurious multi-layer gold background effects */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-yellow-600/15 via-amber-600/8 to-transparent"
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute inset-0 bg-gradient-to-tl from-yellow-500/10 via-transparent to-amber-600/10"
            animate={{ opacity: [0.08, 0.18, 0.08] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-yellow-500/8 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.08),transparent_70%)]"></div>
          
          {/* Ornate gold corner accents with decorative elements */}
          <div className="absolute top-0 left-0 w-24 h-24">
            <div className="absolute top-0 left-0 w-full h-full border-t-2 border-l-2 border-yellow-600/40 rounded-tl-3xl"></div>
            <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-yellow-500/60"></div>
            <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-500/40 rounded-full"></div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24">
            <div className="absolute top-0 right-0 w-full h-full border-t-2 border-r-2 border-yellow-600/40 rounded-tr-3xl"></div>
            <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-yellow-500/60"></div>
            <div className="absolute top-4 right-4 w-2 h-2 bg-yellow-500/40 rounded-full"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-24 h-24">
            <div className="absolute bottom-0 left-0 w-full h-full border-b-2 border-l-2 border-yellow-600/40 rounded-bl-3xl"></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-yellow-500/60"></div>
            <div className="absolute bottom-4 left-4 w-2 h-2 bg-yellow-500/40 rounded-full"></div>
          </div>
          <div className="absolute bottom-0 right-0 w-24 h-24">
            <div className="absolute bottom-0 right-0 w-full h-full border-b-2 border-r-2 border-yellow-600/40 rounded-br-3xl"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-yellow-500/60"></div>
            <div className="absolute bottom-4 right-4 w-2 h-2 bg-yellow-500/40 rounded-full"></div>
          </div>
          
          {/* Decorative side borders */}
          <div className="absolute top-1/2 left-0 w-1 h-16 bg-gradient-to-b from-transparent via-yellow-600/30 to-transparent transform -translate-y-1/2"></div>
          <div className="absolute top-1/2 right-0 w-1 h-16 bg-gradient-to-b from-transparent via-yellow-600/30 to-transparent transform -translate-y-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <motion.div 
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.08, 1],
                  y: [0, -3, 0]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-yellow-600/60 overflow-hidden"
                style={{ 
                  willChange: 'transform', 
                  transform: 'translateZ(0)',
                  boxShadow: '0 15px 40px rgba(234, 179, 8, 0.4), 0 0 60px rgba(217, 119, 6, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2), inset 0 -2px 0 rgba(0, 0, 0, 0.2)'
                }}
              >
                {/* Luxurious multi-layer gold gradient background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-yellow-600 via-amber-600 to-yellow-700"
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 33%, #d97706 66%, #92400e 100%)',
                    backgroundSize: '200% 200%'
                  }}
                />
                {/* Inner ornate border */}
                <div className="absolute inset-1 border border-yellow-500/50 rounded-xl" style={{
                  boxShadow: 'inset 0 0 15px rgba(234, 179, 8, 0.3)'
                }}></div>
                {/* Multi-layer inner gold glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/50 via-yellow-500/30 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-radial from-white/40 via-transparent to-transparent"></div>
                {/* Luxurious gold shimmer effects */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent"
                  animate={{ y: ['-100%', '100%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 1 }}
                />
                {/* Decorative corner elements */}
                <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-yellow-400/60 rounded-tl"></div>
                <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-yellow-400/60 rounded-tr"></div>
                <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-yellow-400/60 rounded-bl"></div>
                <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-yellow-400/60 rounded-br"></div>
                <Shield className="w-10 h-10 text-black drop-shadow-lg relative z-10" style={{ 
                  filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6)), drop-shadow(0 0 15px rgba(234, 179, 8, 0.3))'
                }} />
              </motion.div>
            </div>
            
            <h2 className="text-3xl font-extrabold mb-4 text-center tracking-tight relative">
                <span className="relative z-10 bg-gradient-to-r from-yellow-300 via-yellow-400 via-yellow-500 via-amber-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg" style={{
                  textShadow: '0 0 20px rgba(234, 179, 8, 0.3), 0 0 40px rgba(217, 119, 6, 0.2)'
                }}>
              Verify Humanity
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-yellow-400/50 via-amber-400/60 to-yellow-400/50 blur-xl opacity-60 -z-10"></span>
                <span className="absolute inset-0 bg-gradient-to-r from-yellow-600/30 to-amber-600/30 blur-2xl opacity-40 -z-20"></span>
            </h2>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-600/40"></div>
              <p className="text-gray-300 mb-0 text-center leading-relaxed text-base font-medium">
              You must verify your humanity to access the application.
            </p>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-600/40"></div>
            </div>

            {verifyError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-center text-sm">
                {verifyError}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 20px 50px rgba(234, 179, 8, 0.6), 0 0 60px rgba(217, 119, 6, 0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full text-black font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 relative overflow-hidden group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-yellow-500/30"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #d97706 60%, #92400e 100%)',
                boxShadow: '0 15px 40px rgba(234, 179, 8, 0.5), 0 0 30px rgba(217, 119, 6, 0.4), 0 0 50px rgba(251, 191, 36, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 0 rgba(0, 0, 0, 0.2)',
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
            >
              {/* Background gradient layer */}
              <div 
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #d97706 60%, #92400e 100%)',
                  zIndex: 0
                }}
              />
              
              {/* Animated shimmer layer */}
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                style={{
                  background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                  zIndex: 1
                }}
              />
              
              {/* Hover overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-yellow-300/50 via-amber-300/50 to-yellow-300/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                style={{ zIndex: 2 }}
              />
              
              {/* Inner glow */}
              <div 
                className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-2xl pointer-events-none"
                style={{ zIndex: 3 }}
              />
              
              {/* Button content - always on top */}
              <span className="relative z-20 flex items-center justify-center space-x-3">
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin drop-shadow-lg" />
                    <span className="text-base font-extrabold tracking-wide drop-shadow-lg">Verifying...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 drop-shadow-md" />
                    <span className="text-base font-extrabold tracking-wide drop-shadow-md">Verify</span>
                  <motion.div
                      className="w-2 h-2 bg-black/40 rounded-full shadow-lg"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  </>
              )}
              </span>
            </motion.button>
          </div>
      </motion.div>

                                 {/* Luxurious Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-10 relative"
          style={{ willChange: 'opacity, transform' }}
        >
          {/* Decorative top line */}
          <div className="flex items-center justify-center mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent"></div>
            <div className="mx-3 w-1 h-1 bg-yellow-500/60 rounded-full"></div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent via-yellow-600/40 to-transparent"></div>
          </div>
          
          <div className="flex items-center justify-center space-x-3">
            <motion.div 
              className="relative"
              animate={{ 
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.3, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-2.5 h-2.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full shadow-lg" style={{
                boxShadow: '0 0 10px rgba(234, 179, 8, 0.6)'
              }}></div>
                  <motion.div
                className="absolute inset-0 bg-yellow-400 rounded-full blur-md"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                  />
      </motion.div>
        <motion.div
              className="relative"
              animate={{ 
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.3, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <div className="w-2.5 h-2.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full shadow-lg" style={{
                boxShadow: '0 0 10px rgba(234, 179, 8, 0.6)'
              }}></div>
              <motion.div
                className="absolute inset-0 bg-yellow-400 rounded-full blur-md"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const LuminexApp = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const { userAddress } = useWorldID();
  const { wallet, isConnected, connectWallet, requestPayment, provider, userInfo, setUserInfo, getSigner } = useMiniKit();
  const [activeTab, setActiveTab] = useState<'staking' | 'membership' | 'referral' | 'game'>('staking');
  const [selectedPool, setSelectedPool] = useState(0);
  const [stakeAmount, setStakeAmount] = useState('');
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClaimingInterest, setIsClaimingInterest] = useState(false);
  const [isShowInput, setIsShowInput] = useState(false);

  const [balance, setBalance] = useState(0);
  const [wldBalance, setWldBalance] = useState(0);
  const [stakedAmount, setStakedAmount] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [currentPower, setCurrentPower] = useState<{ code: PowerCode; name: string; totalAPY: number } | null>(null);
  const [isPurchasingPower, setIsPurchasingPower] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [referralCode, setReferralCode] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const [language, setLanguage] = useState('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Memoize translation function to avoid recreating on every render
  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>) => {
      let text = translations[language]?.[key] || translations['en'][key] || key;
      if (params) {
        Object.keys(params).forEach(param => {
          text = text.replace(`{${param}}`, String(params[param]));
        });
      }
      return text;
    };
  }, [language]);

  // Memoize active language metadata
  const activeLanguage = useMemo(() => {
    return LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  }, [language]);

  // Get the actual address to use (prioritize wallet, then verified address)
  const actualAddress = useMemo(
    () => {
      const addr = wallet?.address || verifiedAddress || userAddress || null;
      console.log('🔍 actualAddress calculated:', { 
        fromWallet: wallet?.address, 
        fromVerified: verifiedAddress, 
        fromUser: userAddress, 
        final: addr 
      });
      return addr;
    },
    [wallet?.address, verifiedAddress, userAddress]
  );

  // Refs to track fetch operations (avoids dependency loop)
  const balanceFetchInProgress = React.useRef(false);
  const stakingDataFetchInProgress = React.useRef(false);

  // Memoize formatted numbers to avoid recalculation on every render
  // Ensure all values are numbers and valid before formatting
  const formattedBalance = useMemo(() => {
    const val = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
    return formatNumber(val, 2);
  }, [balance]);
  
  const formattedWldBalance = useMemo(() => {
    const val = typeof wldBalance === 'number' && !isNaN(wldBalance) ? wldBalance : 0;
    return formatNumber(val, 4); // Use 4 decimal places for WLD
  }, [wldBalance]);
  
  const formattedStakedAmount = useMemo(() => {
    const val = typeof stakedAmount === 'number' && !isNaN(stakedAmount) ? stakedAmount : 0;
    return formatNumber(val, 2);
  }, [stakedAmount]);
  
  const formattedPendingRewards = useMemo(() => {
    const val = typeof pendingRewards === 'number' && !isNaN(pendingRewards) ? pendingRewards : 0;
    return formatNumber(val, 8);
  }, [pendingRewards]);
  
  // Safe referral code - ensure it's always a string
  const safeReferralCode = useMemo(() => {
    return typeof referralCode === 'string' && referralCode.length > 0 ? referralCode : 'LUX000000';
  }, [referralCode]);
  
  // Safe totals - ensure they're always numbers
  const safeTotalReferrals = useMemo(() => {
    return typeof totalReferrals === 'number' && !isNaN(totalReferrals) ? totalReferrals : 0;
  }, [totalReferrals]);
  
  const safeTotalEarnings = useMemo(() => {
    return typeof totalEarnings === 'number' && !isNaN(totalEarnings) ? totalEarnings : 0;
  }, [totalEarnings]);

  // Fetch WLD balance from World App (Worldchain only)
  const fetchBalance = useCallback(async () => {
    const addressToUse = actualAddress;
    
    if (!addressToUse) {
      console.log('⚠️ No address available for balance fetch');
      setBalance(0);
      setWldBalance(0);
      return;
    }
    
    // Prevent concurrent calls using ref
    if (balanceFetchInProgress.current) {
      console.log('⏳ Balance fetch already in progress, skipping...');
      return;
    }

    try {
      balanceFetchInProgress.current = true;
      setIsLoadingBalance(true);
      console.log('🔄 Fetching WLD balance from Worldchain for:', addressToUse);
      console.log('🔍 Config:', { 
        RPC_URL: WALLET_RPC_URL, 
        WLD_ADDRESS: WLD_TOKEN_ADDRESS,
        USER_ADDRESS: addressToUse 
      });
      
      // Only World App is supported
      const hasMiniKit = typeof window !== 'undefined' && (window as any).MiniKit;
      
      if (!hasMiniKit) {
        console.warn('⚠️ Not running in World App. Balance fetch requires World App.');
        setWldBalance(0);
        setBalance(0);
        return;
      }
      
      {
        // For World App: fetch real balance using server-side API
        console.log('📱 Running in World App, fetching WLD balance via API');
        console.log('🔍 Using API route for balance fetch');
        
        try {
          const response = await fetch('/api/wld-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: addressToUse }),
            cache: 'no-store' // Disable fetch caching for fresh balance data
          });
      
          const data = await response.json();
          console.log('🔍 API response:', data);
          
          if (data.success) {
            // Normalize the API response (handles both old and new formats)
            const balance = data.balance ?? data.formatted ?? 0;
            const rawBalance = data.rawBalance ?? data.raw ?? '0';
            const decimals = data.decimals ?? 18;
            
            console.log('🔍 Normalized API data:', { balance, rawBalance, decimals });
            
            setWldBalance(balance);
            setBalance(0); // LUX balance not used, set to 0
            console.log('✅ WLD Balance fetched via API:', balance, 'WLD');
            console.log('🔍 Raw balance (wei):', rawBalance, 'decimals:', decimals);
          } else {
            console.error('❌ API returned error:', data.error);
            // Fallback to direct RPC call
            console.log('🔄 Falling back to direct RPC call...');
            const worldchainProvider = new ethers.JsonRpcProvider(WALLET_RPC_URL);
            const wldContract = new ethers.Contract(WLD_TOKEN_ADDRESS, ERC20_ABI, worldchainProvider);
        const wldBalanceBN = await wldContract.balanceOf(addressToUse);
            const decimals = await wldContract.decimals().catch(() => 18);
            const wldBalanceFormatted = parseFloat(ethers.formatUnits(wldBalanceBN, decimals));
        setWldBalance(wldBalanceFormatted);
            setBalance(0);
            console.log('✅ WLD Balance fetched via fallback RPC:', wldBalanceFormatted);
          }
        } catch (apiError: any) {
          console.error('❌ Error calling API:', apiError);
          console.log('🔄 Falling back to direct RPC call...');
          
          try {
            // Fallback to direct RPC call
            const worldchainProvider = new ethers.JsonRpcProvider(WALLET_RPC_URL);
            const wldContract = new ethers.Contract(WLD_TOKEN_ADDRESS, ERC20_ABI, worldchainProvider);
        const wldBalanceBN = await wldContract.balanceOf(addressToUse);
            const decimals = await wldContract.decimals().catch(() => 18);
            const wldBalanceFormatted = parseFloat(ethers.formatUnits(wldBalanceBN, decimals));
        setWldBalance(wldBalanceFormatted);
            setBalance(0);
            console.log('✅ WLD Balance fetched via fallback RPC:', wldBalanceFormatted);
          } catch (fallbackError: any) {
            console.error('❌ Fallback RPC also failed:', fallbackError);
        setWldBalance(0);
            setBalance(0);
          }
        }
      }
      
      setIsLoadingBalance(false);
      balanceFetchInProgress.current = false;
    } catch (error: any) {
      console.error('❌ Error fetching WLD balance:', error);
      console.error('❌ Error details:', { 
        message: error?.message, 
        code: error?.code,
        data: error?.data 
      });
      setWldBalance(0);
      setBalance(0);
      setIsLoadingBalance(false);
      balanceFetchInProgress.current = false;
    }
  }, [actualAddress]); // Removed provider and isLoadingBalance from deps

  // Fetch staking data from blockchain
  const fetchStakingData = useCallback(async () => {
    const addressToUse = actualAddress;
    
    if (!provider || !addressToUse || !STAKING_CONTRACT_ADDRESS) {
      console.log('⚠️ Missing requirements for staking data fetch:', { 
        provider: !!provider, 
        address: addressToUse,
        stakingContract: STAKING_CONTRACT_ADDRESS 
      });
      // Reset to 0 if requirements not met (not mock data)
      if (!STAKING_CONTRACT_ADDRESS) {
        console.warn('⚠️ STAKING_CONTRACT_ADDRESS is not configured! Please set NEXT_PUBLIC_STAKING_ADDRESS environment variable.');
      }
      setStakedAmount(0);
      setPendingRewards(0);
      setTotalReferrals(0);
      setTotalEarnings(0);
      return;
    }

    // Prevent concurrent calls using ref
    if (stakingDataFetchInProgress.current) {
      console.log('⏳ Staking data fetch already in progress, skipping...');
      return;
    }

    try {
      stakingDataFetchInProgress.current = true;
      console.log('🔄 Fetching staking data from blockchain...');
      
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, provider);
      
      // Get total staked amount across all pools
      const totalStaked = await stakingContract.totalStakedByUser(addressToUse);
      const stakedFormatted = parseFloat(ethers.formatUnits(totalStaked, 18));
      setStakedAmount(stakedFormatted);
      
      // Get pending rewards from current selected pool
      const pendingRewardsBN = await stakingContract.getPendingRewards(addressToUse, selectedPool);
      const rewardsFormatted = parseFloat(ethers.formatUnits(pendingRewardsBN, 18));
      setPendingRewards(rewardsFormatted);
      
      // Get stake info to calculate time elapsed
      try {
        const stakeInfo = await stakingContract.getUserStakeInfo(addressToUse, selectedPool);
        if (stakeInfo.startTime && stakeInfo.startTime > 0n) {
          const startTime = Number(stakeInfo.startTime);
          const currentTime = Math.floor(Date.now() / 1000);
          const elapsed = currentTime - startTime;
          
          const days = Math.floor(elapsed / 86400);
          const hours = Math.floor((elapsed % 86400) / 3600);
          const minutes = Math.floor((elapsed % 3600) / 60);
          const seconds = elapsed % 60;
          
          setTimeElapsed({ days, hours, minutes, seconds });
        }
      } catch (error) {
        console.log('Could not fetch stake start time:', error);
      }
      
                         // Note: Referral stats are now fetched from API instead of blockchain
       // The blockchain referralCount may differ from API stats
       // We keep the API fetch in a separate useEffect for better separation of concerns
      
      console.log('✅ Staking data fetched:', { 
        staked: stakedFormatted, 
        rewards: rewardsFormatted,
      });
      
      stakingDataFetchInProgress.current = false;
    } catch (error) {
      console.error('❌ Error fetching staking data:', error);
      stakingDataFetchInProgress.current = false;
      // If contract doesn't exist or function fails, keep values at 0
    }
  }, [provider, actualAddress, selectedPool]);

  // Debounce function for fetch operations (define before use)
  const debounce = useCallback((fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }, []);

  // Debounced fetch staking data (avoid rapid consecutive calls)
  const debouncedFetchStakingData = useMemo(
    () => debounce(fetchStakingData, 1000),
    [fetchStakingData, debounce]
  );

  // Debounced fetch balance (avoid rapid consecutive calls)
  const debouncedFetchBalance = useMemo(
    () => debounce(fetchBalance, 1000),
    [fetchBalance, debounce]
  );

  // Fetch staking data when address or pool changes
  useEffect(() => {
    if (!actualAddress || !provider || !STAKING_CONTRACT_ADDRESS) return;
    
    // Initial fetch immediately
    fetchStakingData();
    
    // Refresh staking data every 30 seconds (use debounced version)
    const interval = setInterval(() => {
      debouncedFetchStakingData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [actualAddress, provider, selectedPool, fetchStakingData, debouncedFetchStakingData]);

  useEffect(() => {
    // Get verified status and address from sessionStorage
    if (typeof window !== 'undefined') {
      // For World App: load verified status and address
      if (isWorldApp()) {
        const verifiedFromStorage = sessionStorage.getItem('verified');
        if (verifiedFromStorage === 'true') {
          setVerified(true);
          console.log('✅ Loaded verified status from session (World App)');
        }
        
      const verifiedAddr = sessionStorage.getItem('verifiedAddress');
      if (verifiedAddr) {
        setVerifiedAddress(verifiedAddr);
        console.log('✅ Loaded verified address from session:', verifiedAddr);
      }
      } else {
        // Only World App is supported
        console.warn('⚠️ Not running in World App. Please open this app in World App.');
        // Don't set verified address or verified status - require World App
      }
      
      const userName = sessionStorage.getItem('userName');
      if (userName) {
        console.log('✅ Loaded user name from session:', userName);
        setUserInfo({ name: userName, username: userName });
    }
    
      // Load saved language preference from localStorage
      const savedLanguage = localStorage.getItem('preferredLanguage');
      if (savedLanguage && translations[savedLanguage]) {
        setLanguage(savedLanguage);
        console.log('✅ Loaded language from localStorage:', savedLanguage);
      } else {
    // Detect user's preferred language from browser
    const browserLang = navigator.language.slice(0, 2);
    if (translations[browserLang]) {
      setLanguage(browserLang);
          console.log('✅ Using browser language:', browserLang);
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-connect wallet after verification (call walletAuth every time)
  useEffect(() => {
    if (verified) {
      console.log('✅ User verified, auto-connecting wallet (calling walletAuth)...');
      connectWallet();
    }
  }, [verified]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch power status from API
  const fetchPowerStatus = useCallback(async () => {
    if (!actualAddress) {
      setCurrentPower(null);
      return;
    }

    try {
      const response = await fetch(`/api/power/active?userId=${actualAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      const data = await response.json();
      
      if (data.success && data.power) {
        setCurrentPower({
          code: data.power.code,
          name: data.power.name,
          totalAPY: data.power.totalAPY,
        });
        console.log('✅ Power status loaded:', data.power);
      } else {
        setCurrentPower(null);
        console.log('ℹ️ No power license found for address');
      }
    } catch (error: any) {
      console.error('❌ Error fetching power status:', error);
      setCurrentPower(null);
    }
  }, [actualAddress]);

  // Fetch referral stats from API
  const fetchReferralStats = useCallback(async () => {
    if (!actualAddress) {
      setTotalReferrals(0);
      setTotalEarnings(0);
      return;
    }

    try {
      const response = await fetch(`/api/referral/stats?address=${actualAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      const data = await response.json();
      
      if (data.success && data.stats) {
        setTotalReferrals(data.stats.totalReferrals || 0);
        setTotalEarnings(data.stats.totalEarnings || 0);
        console.log('✅ Referral stats loaded:', data.stats);
      } else {
        // If no stats found, set to 0
        setTotalReferrals(0);
        setTotalEarnings(0);
      }
    } catch (error) {
      console.error('❌ Error fetching referral stats:', error);
      setTotalReferrals(0);
      setTotalEarnings(0);
    }
  }, [actualAddress]);

  // Process referral code if user came from referral link
  const processReferralCode = useCallback(async (code: string) => {
    if (!actualAddress || !code) return;

    try {
      const response = await fetch('/api/process-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUserId: actualAddress,
          referrerCode: code
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Referral processed:', data);
        showToast(`${translations[language].membershipActivated?.replace('{tier}', '50 LUX') || 'You received 50 LUX for using referral code!'}`, 'success');
        // Refresh stats
        fetchReferralStats();
      } else {
        // Don't show error for already_referred - it's expected
        if (data.reason !== 'already_referred') {
          console.warn('⚠️ Referral processing failed:', data.reason || data.message);
        }
      }
    } catch (error) {
      console.error('❌ Error processing referral:', error);
    }
  }, [actualAddress, language]);

  // Check for referral code in URL or localStorage when user connects wallet
  useEffect(() => {
    if (actualAddress && verified) {
      // Check URL params
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      // Check localStorage (from invite page)
      const storedCode = localStorage.getItem('luminex_referral_code');
      
      const referralCodeToProcess = refCode || storedCode;
      
      if (referralCodeToProcess) {
        console.log('🔍 Found referral code:', referralCodeToProcess);
        processReferralCode(referralCodeToProcess);
        // Clear stored code
        if (storedCode) {
          localStorage.removeItem('luminex_referral_code');
        }
      }
    }
  }, [actualAddress, verified, processReferralCode]);

  // Set referral code from wallet address
  useEffect(() => {
    if (actualAddress && !referralCode) {
      setReferralCode(`LUX${actualAddress.slice(2, 8).toUpperCase()}`);
      console.log('✅ Generated referral code from address:', actualAddress);
    }
  }, [actualAddress, referralCode]);

  // Fetch referral stats when address is available
  useEffect(() => {
    if (actualAddress) {
      fetchReferralStats();
    }
  }, [actualAddress, fetchReferralStats]);

  // Fetch power status when address is available
  useEffect(() => {
    if (actualAddress) {
      fetchPowerStatus();
    }
  }, [actualAddress, fetchPowerStatus]);

  // Fetch balance when address is available
  useEffect(() => {
    if (!actualAddress) return;
    
    // Initial fetch immediately
    fetchBalance();
    
    // Refresh balance every 30 seconds (use debounced version to prevent rapid calls)
    const interval = setInterval(() => {
      debouncedFetchBalance();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [actualAddress, fetchBalance, debouncedFetchBalance]);

  // Close language menu when clicking outside
  useEffect(() => {
    if (!showLanguageMenu) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.language-menu')) {
        setShowLanguageMenu(false);
      }
    };
    
    // Add event listener after a small delay to avoid immediate closing
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showLanguageMenu]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (stakedAmount > 0) {
        setTimeElapsed(prev => {
          let { seconds, minutes, hours, days } = prev;
          seconds++;
          if (seconds >= 60) { seconds = 0; minutes++; }
          if (minutes >= 60) { minutes = 0; hours++; }
          if (hours >= 24) { hours = 0; days++; }
          return { days, hours, minutes, seconds };
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stakedAmount]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000);
  };

  // Helper function to send contract transaction via MiniKit
  const sendContractTransaction = async (
    to: string,
    data: string,
    description: string
  ): Promise<string> => {
    if (typeof window === 'undefined' || !(window as any).MiniKit) {
      throw new Error('MiniKit is not available. Please open this app in World App.');
    }

    const MiniKit = (window as any).MiniKit;
    if (!MiniKit.commandsAsync?.sendTransaction) {
      throw new Error('MiniKit sendTransaction is not available. Please update World App.');
    }

    try {
      console.log(`🔵 Sending transaction: ${description}`);
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        to: to as `0x${string}`,
        data: data as `0x${string}`,
        value: '0x0',
      });

      if (!finalPayload?.transaction_id) {
        throw new Error('Transaction failed: No transaction ID returned');
      }

      console.log('✅ Transaction sent:', finalPayload.transaction_id);
      return finalPayload.transaction_id;
    } catch (error: any) {
      console.error('❌ Transaction error:', error);
      if (error?.message?.includes('user_cancelled') || error?.message?.includes('cancel')) {
        throw new Error('Transaction cancelled by user');
      }
      throw new Error(error?.message || 'Transaction failed');
    }
  };

  const handleStake = async () => {
    if (!stakeAmount) {
      setIsShowInput(true);
      return;
    }
    if (!verified || !stakeAmount || !actualAddress) {
      showToast('Please connect wallet first', 'error');
      return;
    }
    if (Number(stakeAmount) > balance) {
      showToast('Insufficient balance', 'error');
      return;
    }
    if (!STAKING_CONTRACT_ADDRESS || !provider) {
      showToast('Staking contract not configured', 'error');
      return;
    }
    
    setIsStaking(true);
    try {
      const amount = Number(stakeAmount);
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      const lockPeriod = POOLS[selectedPool].lockDays * 24 * 60 * 60; // Convert days to seconds

      // Check if MiniKit is available
      const MiniKit = (window as any).MiniKit;
      if (!MiniKit || !MiniKit.isInstalled()) {
        throw new Error('Please use World App to stake tokens');
      }

      // Get provider for reading contract data
      if (!provider) {
        throw new Error('Provider not available');
      }

      // Get token contract interface for encoding
      const tokenContractInterface = new ethers.Interface(ERC20_ABI);
      const stakingContractInterface = new ethers.Interface(STAKING_ABI);

      // Check and approve if needed (read-only call)
      const tokenContractRead = new ethers.Contract(LUX_TOKEN_ADDRESS, ERC20_ABI, provider);
      const allowance = await tokenContractRead.allowance(actualAddress, STAKING_CONTRACT_ADDRESS);
      
      if (allowance < amountWei) {
        console.log('🔄 Approving token spending...');
        // Encode approve function call
        const approveData = tokenContractInterface.encodeFunctionData('approve', [STAKING_CONTRACT_ADDRESS, amountWei]);
        
        // Send transaction via MiniKit
        const approveResult = await MiniKit.commandsAsync.sendTransaction({
          to: LUX_TOKEN_ADDRESS,
          data: approveData,
          value: '0'
        });
        
        if (!approveResult?.finalPayload?.transaction_id) {
          throw new Error('Token approval failed');
        }
        console.log('✅ Token approved');
      }

      // Encode stake function call
      const stakeData = stakingContractInterface.encodeFunctionData('stake', [selectedPool, amountWei, lockPeriod]);
      
      // Stake tokens via MiniKit
      console.log(`🔄 Staking ${amount} ${TOKEN_NAME} to pool ${selectedPool}...`);
      const stakeResult = await MiniKit.commandsAsync.sendTransaction({
        to: STAKING_CONTRACT_ADDRESS,
        data: stakeData,
        value: '0'
      });

      if (!stakeResult?.finalPayload?.transaction_id) {
        throw new Error('Staking transaction failed');
      }
      
      console.log('✅ Staking transaction submitted:', stakeResult.finalPayload.transaction_id);

      // Wait a bit for transaction to be mined (MiniKit transactions are async)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Refresh data after successful transaction
      await Promise.all([
        fetchBalance().catch(err => console.error('Error refreshing balance:', err)),
        fetchStakingData().catch(err => console.error('Error refreshing staking data:', err))
      ]);

      setIsStaking(false);
      setShowStakeModal(false);
      setIsShowInput(false);
      showToast(`Successfully staked ${amount} ${TOKEN_NAME}!`, 'success');
    setStakeAmount('');
    } catch (error: any) {
      console.error('❌ Staking error:', error);
    setIsStaking(false);
      showToast(error?.message || 'Staking failed', 'error');
    }
  };

  const handleClaimRewards = async () => {
    if (pendingRewards === 0) {
      showToast('No rewards to claim', 'error');
      return;
    }
    if (!actualAddress || !STAKING_CONTRACT_ADDRESS || !provider) {
      showToast('Please connect wallet first', 'error');
      return;
    }

    setIsClaiming(true);
    try {
      // Check if MiniKit is available
      const MiniKit = (window as any).MiniKit;
      if (!MiniKit || !MiniKit.isInstalled()) {
        throw new Error('Please use World App to claim rewards');
      }

      // Get staking contract interface for encoding
      const stakingContractInterface = new ethers.Interface(STAKING_ABI);

      // Encode claimRewards function call
      const claimData = stakingContractInterface.encodeFunctionData('claimRewards', [selectedPool]);

      console.log(`🔄 Claiming rewards from pool ${selectedPool}...`);
      const claimResult = await MiniKit.commandsAsync.sendTransaction({
        to: STAKING_CONTRACT_ADDRESS,
        data: claimData,
        value: '0'
      });

      if (!claimResult?.finalPayload?.transaction_id) {
        throw new Error('Claim rewards transaction failed');
      }
      
      console.log('✅ Claim rewards transaction submitted:', claimResult.finalPayload.transaction_id);

      // Wait a bit for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Refresh data after successful transaction
      await Promise.all([
        fetchBalance().catch(err => console.error('Error refreshing balance:', err)),
        fetchStakingData().catch(err => console.error('Error refreshing staking data:', err))
      ]);

    setIsClaiming(false);
      const rewardsValue = typeof pendingRewards === 'number' && !isNaN(pendingRewards) ? pendingRewards : 0;
      showToast(`Claimed ${rewardsValue.toFixed(2)} ${TOKEN_NAME} rewards!`, 'success');
    } catch (error: any) {
      console.error('❌ Claim rewards error:', error);
      setIsClaiming(false);
      showToast(error?.message || 'Claim failed', 'error');
    }
  };

  const handleWithdrawBalance = async () => {
    if (stakedAmount === 0) {
      showToast('No balance to withdraw', 'error');
      return;
    }
    if (!actualAddress || !STAKING_CONTRACT_ADDRESS || !provider) {
      showToast('Please connect wallet first', 'error');
      return;
    }

    setIsWithdrawing(true);
    try {
      // Check if MiniKit is available
      const MiniKit = (window as any).MiniKit;
      if (!MiniKit || !MiniKit.isInstalled()) {
        throw new Error('Please use World App to withdraw balance');
      }

      // Get provider for reading contract data
      if (!provider) {
        throw new Error('Provider not available');
      }

      // Get staking contract for reading and encoding
      const stakingContractRead = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, provider);
      const stakingContractInterface = new ethers.Interface(STAKING_ABI);
      
      // Get user stake info to determine withdrawal amount
      const stakeInfo = await stakingContractRead.getUserStakeInfo(actualAddress, selectedPool);
      const amountWei = stakeInfo.amount; // Withdraw all staked amount

      if (amountWei === 0n) {
        throw new Error('No staked balance to withdraw');
      }

      // Encode withdraw function call
      const withdrawData = stakingContractInterface.encodeFunctionData('withdraw', [selectedPool, amountWei]);

      console.log(`🔄 Withdrawing from pool ${selectedPool}...`);
      const withdrawResult = await MiniKit.commandsAsync.sendTransaction({
        to: STAKING_CONTRACT_ADDRESS,
        data: withdrawData,
        value: '0'
      });

      if (!withdrawResult?.finalPayload?.transaction_id) {
        throw new Error('Withdrawal transaction failed');
      }
      
      console.log('✅ Withdrawal transaction submitted:', withdrawResult.finalPayload.transaction_id);

      // Wait a bit for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Refresh data after successful transaction
      await Promise.all([
        fetchBalance().catch(err => console.error('Error refreshing balance:', err)),
        fetchStakingData().catch(err => console.error('Error refreshing staking data:', err))
      ]);

      setIsWithdrawing(false);
      showToast(`Withdrew ${ethers.formatUnits(amountWei, 18)} ${TOKEN_NAME}!`, 'success');
    } catch (error: any) {
      console.error('❌ Withdraw error:', error);
      setIsWithdrawing(false);
      showToast(error?.message || 'Withdrawal failed', 'error');
    }
  };

  const handleClaimInterest = async () => {
    // Claim interest uses the same claimRewards function
    await handleClaimRewards();
  };



    const handlePurchasePower = async (targetCode: PowerCode) => {
    if (!actualAddress) {
      showToast('Please connect wallet first', 'error');
      return;
    }

    setIsPurchasingPower(true);
    try {
      // Step 1: Initialize power purchase
      const initResponse = await fetch('/api/power/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCode,
          userId: actualAddress,
        }),
      });

      const initData = await initResponse.json();

      if (!initData.success) {
        // Map error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          'insufficient_balance': 'Insufficient WLD balance',
          'invalid_reference': 'Invalid reference. Please try again.',
          'verification_failed': 'Transaction verification failed',
        };
        const errorMsg = errorMessages[initData.error] || initData.error || 'Failed to initialize power purchase';
        showToast(errorMsg, 'error');
        return;
      }

      const { reference, amountWLD, to, target } = initData;

      // Step 2: Pay with MiniKit
      if (!MiniKit.isInstalled()) {
        showToast('World App is required', 'error');
        return;
      }

      try {
        // Convert amount to decimals for MiniKit
        const tokenSymbol = Tokens.WLD;
        const amountInDecimals = tokenToDecimals(parseFloat(amountWLD), tokenSymbol);
        const tokenAmountStr = amountInDecimals.toString();

        const payPayload = {
          reference,
          to: to as `0x${string}`,
          tokens: [{
            symbol: tokenSymbol,
            token_amount: tokenAmountStr,
          }],
          description: `Purchase ${target.name} Power License`,
        };

        const { finalPayload } = await MiniKit.commandsAsync.pay(payPayload as any);

        // Check if user cancelled - finalPayload might not have transaction_id if cancelled
        const payloadAny = finalPayload as any;
        if (!payloadAny?.transaction_id) {
          // User cancelled
          setIsPurchasingPower(false);
          return;
        }

        // Step 3: Confirm power purchase
        const confirmResponse = await fetch('/api/power/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: finalPayload,
          }),
        });

        const confirmData = await confirmResponse.json();

        if (confirmData.success && confirmData.power) {
          // Update local state
          setCurrentPower({
            code: confirmData.power.code,
            name: confirmData.power.name,
            totalAPY: confirmData.power.totalAPY,
          });

          // Refresh balance and power status
        await fetchBalance();
          await fetchPowerStatus();
        
          showToast(`Activated ${confirmData.power.name.toUpperCase()} Power!`, 'success');
          console.log('✅ Power purchase confirmed:', confirmData);
      } else {
          // Map error codes
          const errorMessages: Record<string, string> = {
            'user_cancelled': 'ยกเลิกการชำระเงิน',
            'insufficient_balance': 'ยอด WLD ไม่พอ',
            'invalid_reference': 'รหัสอ้างอิงหมดอายุ/ไม่ถูกต้อง',
            'verification_failed': 'ยืนยันธุรกรรมไม่สำเร็จ',
            'draft_already_used': 'Transaction already processed',
          };
          const errorMsg = errorMessages[confirmData.error] || confirmData.error || 'ชำระเงินล้มเหลว';
          showToast(errorMsg, 'error');
        }
      } catch (payError: any) {
        // Detect user cancellation
        const msg = String(payError?.message || '').toLowerCase();
        const code = String(payError?.code || payError?.error_code || '').toLowerCase();
        
        if (
          code.includes('user_rejected') ||
          code.includes('cancelled') ||
          code.includes('cancel') ||
          msg.includes('cancel') ||
          msg.includes('rejected') ||
          msg.includes('user')
        ) {
          // User cancelled - don't show error
          setIsPurchasingPower(false);
          return;
        }

        showToast(payError?.message || 'Payment failed', 'error');
      }
    } catch (error: any) {
      console.error('❌ Power purchase error:', error);
      showToast(error.message || 'Failed to purchase power', 'error');
    } finally {
      setIsPurchasingPower(false);
    }
  };

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
          {/* Large Logo with glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative inline-block w-40 h-40 mb-8"
          >
            <motion.div 
              className="absolute inset-0 blur-3xl bg-yellow-500/30 rounded-full"
              animate={{ 
                opacity: [0.2, 0.5, 0.2],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative w-full h-full rounded-full flex items-center justify-center overflow-hidden border-4 border-yellow-600/50" style={{
              boxShadow: '0 0 60px rgba(234, 179, 8, 0.6), 0 0 100px rgba(217, 119, 6, 0.4)'
            }}>
              <img 
                src={LOGO_URL} 
                alt="Luminex Logo" 
                className="w-full h-full object-cover rounded-full" 
                loading="eager"
                fetchPriority="high"
              />
            </div>
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
  if (!verified && isWorldApp()) return <WorldIDVerification onVerify={() => setVerified(true)} />;

  // Only World App is supported
  if (!verified && !isWorldApp()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-yellow-400 mb-4">World App Required</h1>
          <p className="text-gray-300 mb-6">
            This application only works in World App. Please open this app in World App to continue.
          </p>
        </div>
      </div>
    );
  }

  const currentPool = POOLS[selectedPool];
  const baseApy = BASE_APY; // Base APY is now 50% (from powerConfig)
  const powerBoost = currentPower ? getPowerBoost(getPowerByCode(currentPower.code) || null) : 0;
  const totalApy = currentPower ? currentPower.totalAPY : baseApy;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Luxurious gold geometric background pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{ 
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(234, 179, 8, 0.08) 35px, rgba(234, 179, 8, 0.08) 70px),
                          repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(217, 119, 6, 0.08) 35px, rgba(217, 119, 6, 0.08) 70px)`,
        transform: 'translateZ(0)'
      }}></div>
      
      {/* Elegant gold animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/8 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.06, 0.12, 0.06],
            scale: [1, 1.1, 1],
            x: [0, 20, 0],
            y: [0, 15, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-amber-500/6 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.05, 0.1, 0.05],
            scale: [1, 1.15, 1],
            x: [0, -25, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-yellow-400/5 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.03, 0.08, 0.03],
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 overflow-visible" style={{
        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(17, 24, 39, 0.8) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(234, 179, 8, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 30px rgba(234, 179, 8, 0.05), inset 0 1px 0 rgba(234, 179, 8, 0.1)'
      }}>
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
            <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 rounded-lg px-2.5 py-1.5 flex items-center justify-between backdrop-blur-lg border border-yellow-600/20 relative overflow-visible" style={{
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(234, 179, 8, 0.1)'
            }}>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center" style={{
                  boxShadow: '0 0 15px rgba(234, 179, 8, 0.4)'
                }}>
                  <span className="text-white text-xs font-bold">U</span>
                </div>
                <span className="text-white text-sm font-medium">
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
                    console.log('Language button clicked!');
                    setShowLanguageMenu(!showLanguageMenu);
                  }}
                  className="flex items-center space-x-1 bg-black/40 rounded-lg px-2 py-1 border border-white/10 hover:border-yellow-500/50 transition-colors cursor-pointer z-[9999] relative"
                  style={{ userSelect: 'none', pointerEvents: 'auto' }}
                >
                  <span className="text-white text-xs font-semibold whitespace-nowrap">
                    {activeLanguage.flag} {activeLanguage.code.toUpperCase()}
                  </span>
                  <svg className={`w-3 h-3 text-white/70 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="absolute right-0 mt-2 w-40 bg-black/95 backdrop-blur-xl rounded-xl border border-yellow-600/30 shadow-2xl py-2 z-[9999]"
                    >
                      {LANGUAGES.map((lang) => (
                  <button
                          type="button"
                          key={lang.code}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Language selected:', lang.code);
                            setLanguage(lang.code);
                          // Save language preference to localStorage
                          localStorage.setItem('preferredLanguage', lang.code);
                            setShowLanguageMenu(false);
                          }}
                          className={`w-full px-4 py-2 text-left hover:bg-yellow-500/10 transition-colors flex items-center space-x-2 cursor-pointer ${
                            language === lang.code ? 'bg-yellow-500/15 text-yellow-400' : 'text-gray-300'
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

            <div className="flex items-center justify-between bg-black/40 rounded-lg px-2.5 py-1.5 backdrop-blur-lg border border-white/10 relative" style={{ zIndex: -1 }}>
              <div className="flex items-center text-white">
                <div className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center mr-1.5" style={{
                  boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)'
                }}>
                  <Wallet className="w-3.5 h-3.5" />
          </div>
                <span className="text-[10px] font-medium">{t('yourBalance')}</span>
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

      {/* Main Content */}
      <div className="relative max-w-md mx-auto px-4 py-2">
        <AnimatePresence mode="wait">
          {activeTab === 'staking' && (
              <motion.div
              key="staking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
                            className="space-y-2"
              style={{ willChange: 'transform, opacity' }}
            >
            {/* Pool Selection */}
              <div className="grid grid-cols-5 gap-1.5">
                {POOLS.map((pool) => {
                  const Icon = pool.icon;
                  return (
                    <motion.button
                      key={pool.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedPool(pool.id)}
                      className={`relative p-1.5 rounded-lg border-2 transition-all overflow-hidden ${                                                            
                        selectedPool === pool.id
                          ? 'border-yellow-500 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 shadow-lg shadow-yellow-500/20'                             
                          : 'border-white/10 bg-black/40 backdrop-blur-lg hover:border-white/20'                                                                
                      }`}
                      style={{ willChange: 'transform' }}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${pool.color} opacity-10`}></div>                                                     
                      <div className="relative">
                        <i
                          className={`flex justify-center mb-0.5 ${
                            selectedPool === pool.id ? 'text-yellow-400' : 'text-white/60'                                                                      
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </i>
                        <p className="text-white font-bold text-[9px] leading-tight">{pool.name}</p>                                                           
                        <p className={`text-[8px] font-semibold mt-0.5 ${selectedPool === pool.id ? 'text-yellow-400' : 'text-white/50'}`}>{pool.apy}%</p>      
                      </div>
                    </motion.button>
                  );
                })}
            </div>

                                                        {/* Staking Card */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl p-3 text-white overflow-hidden border border-yellow-600/20"
              >
                <div className="relative z-10 space-y-2">
                  {/* Power License Status */}
                  <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg border border-white/10">                                         
                    <div className="flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-white/80 text-[10px]">Power License:</span>                                                                           
                      <span className="text-white font-bold text-xs">
                          {currentPower ? currentPower.name : 'None'}
                            </span>
                  </div>
                    <div className="text-right">
                      <div className="text-yellow-300 font-bold text-xs">{totalApy}% Total APY</div>                                                            
                      <div className="text-white/60 text-[9px] mt-0.5">
                        Base {baseApy}% {powerBoost > 0 ? `+ ${powerBoost}%` : ''}                                                                              
                      </div>
                    </div>
                </div>

                  {/* Staking Balance */}
                  <div className="p-2 bg-black/40 rounded-lg border border-white/10">                                                                           
                    <p className="text-white/80 text-[10px] mb-1">{t('myStakingBalance')}</p>                                                                   
                      {!actualAddress || !STAKING_CONTRACT_ADDRESS ? (
                      <div className="flex items-center justify-center py-1">   
                          <span className="text-yellow-400 text-[10px] text-center">
                          {!actualAddress ? 'Connect wallet' : 'Contract not configured'}                                                                       
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Coins className="w-4 h-4 text-yellow-300" />
                          <span className="text-lg font-extrabold text-white">{formattedStakedAmount}</span>                                                    
                          <span className="text-white/60 text-xs">LUX</span>    
                            </div>
                        <TrendingUp className="w-4 h-4 text-green-300" />       
                        </div>
                      )}
                  </div>

                  {/* Earned Interest */}
                  <div className="p-2 bg-black/40 rounded-lg border border-white/10">                                                                           
                    <p className="text-white/80 text-[10px] mb-1">{t('earnedInterest')}</p>                                                                     
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-extrabold text-yellow-300">{formattedPendingRewards}</span>                                                 
                      <span className="text-white/60 text-xs">LUX</span>        
                    </div>
                  </div>

                  {/* Time Elapsed */}
                  {timeElapsed.days > 0 || timeElapsed.hours > 0 || timeElapsed.minutes > 0 ? (
                    <div className="flex items-center space-x-1.5 text-[10px] text-white/70 bg-white/5 rounded-lg px-2 py-1">
                    <Timer className="w-3 h-3 flex-shrink-0" />
                      <span className="font-mono">
                        {timeElapsed.days}D {timeElapsed.hours}H {timeElapsed.minutes}m
                      </span>
                  </div>
                  ) : null}
                </div>
              </motion.div>

                            {/* Action Buttons */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* STAKING Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowStakeModal(true)}
                    className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 text-xs shadow-lg"                                                                   
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>{t('staking')}</span>
                  </motion.button>

                  {/* Withdraw Interest */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClaimInterest}
                    disabled={isClaimingInterest || pendingRewards === 0}
                    className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 disabled:opacity-50 text-xs shadow-lg"
                  >
                    {isClaimingInterest ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <DollarIcon className="w-4 h-4" />
                        <span>{t('withdrawInterest')}</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Withdraw Balance */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleWithdrawBalance}
                  disabled={isWithdrawing || stakedAmount === 0}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 disabled:opacity-50 text-xs shadow-lg"
                >
                  {isWithdrawing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4" />
                      <span>{t('withdrawBalance')}</span>
                    </>
                  )}
                </motion.button>

                {/* Free Token Button */}
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 15px 35px rgba(147, 51, 234, 0.4)" }}                                                                
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('game')}
                  className="w-full text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 relative overflow-hidden group text-xs"       
                  style={{
                    background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #9333ea 100%)',                                                               
                    backgroundSize: '200% 100%',
                    boxShadow: '0 8px 25px rgba(147, 51, 234, 0.3), 0 0 15px rgba(236, 72, 153, 0.2)'                                                           
                  }}
                >
                                    <motion.div
                    className="absolute inset-0 rounded-lg"
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']      
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}                                                                              
                    style={{
                      background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #9333ea 100%)',                                                             
                      backgroundSize: '200% 100%'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/50 via-amber-400/50 to-yellow-400/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>                                               
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-lg"></div>                                            
                  <Gift className="w-4 h-4 relative z-10" />
                  <span className="text-xs relative z-10 font-extrabold">{t('freeToken')}</span>                                                              
                  <Sparkles className="w-3.5 h-3.5 relative z-10" />
                </motion.button>
              </div>
            </motion.div>
          )}
          
          {activeTab === 'membership' && (
            /* Membership Tab */
            <motion.div
              key="membership"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-sm">POWER LICENSES</span>
                    </div>
                {currentPower && (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                    <span className="text-base">⚡</span>
                    <span className="text-white font-bold text-xs">{currentPower.name}</span>
                    <span className="text-yellow-300 font-bold text-xs">{totalApy}%</span>
                </div>
                )}
                </div>

              {/* Power Tiers */}
                <div className="space-y-3">
                {POWERS.map((power, index) => {
                  const isOwned = currentPower?.code === power.code;
                  const canUpgrade = !currentPower || (getPowerByCode(currentPower.code) && parseFloat(getPowerByCode(currentPower.code)!.priceWLD) < parseFloat(power.priceWLD));
                  const isLower = currentPower && parseFloat(getPowerByCode(currentPower.code)!.priceWLD) > parseFloat(power.priceWLD);

                  return (
                    <motion.div
                      key={power.code}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        isOwned ? 'border-yellow-400 bg-yellow-500/10' : 'border-white/10 bg-black/20'
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className="text-lg">⚡</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-white font-bold text-base">{power.name}</span>
                            <span className="text-yellow-300 font-bold text-sm">{power.totalAPY}% APY</span>
                          </div>
                          <div className="text-white/70 text-xs">
                            +{power.totalAPY - BASE_APY}% Power Boost
                          </div>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: canUpgrade && !isPurchasingPower ? 1.05 : 1 }}
                        whileTap={{ scale: canUpgrade && !isPurchasingPower ? 0.95 : 1 }}
                        onClick={() => canUpgrade && !isPurchasingPower ? handlePurchasePower(power.code) : undefined}
                        disabled={!canUpgrade || isPurchasingPower || !!isLower}
                        className={`px-4 py-2 font-bold rounded-lg text-xs whitespace-nowrap ml-3 ${
                          isOwned
                            ? 'bg-yellow-400 text-black cursor-default'
                            : isLower || !canUpgrade
                            ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-400 text-white'
                        }`}
                      >
                        {isPurchasingPower ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isOwned ? (
                          '✓ Active'
                        ) : isLower ? (
                          '↓'
                        ) : !currentPower ? (
                          `${power.priceWLD} WLD`
                        ) : (
                          `+${(parseFloat(power.priceWLD) - parseFloat(getPowerByCode(currentPower.code)!.priceWLD)).toFixed(1)} WLD`
                        )}
                      </motion.button>
                    </motion.div>
                  );
                })}
                  </div>
            </motion.div>
          )}
          
          {activeTab === 'referral' && (
            /* Referral Tab */
            <motion.div
              key="referral"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* Hero Section */}
              <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl p-8 text-center overflow-hidden border-2 border-yellow-600/30" style={{
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(234, 179, 8, 0.1), inset 0 1px 0 rgba(234, 179, 8, 0.1)'
              }}>
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-transparent animate-pulse"></div>
                <div className="relative z-10">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="text-7xl mb-4"
                  >
                    🎁🎊
                  </motion.div>
                  <h1 className="text-2xl font-extrabold text-white mb-2">
                    Invite Friends!
                  </h1>
                  <p className="text-white/90 mb-1.5 text-sm">Get 50 {TOKEN_NAME} for each friend you invite</p>
                  <p className="text-yellow-300 font-bold text-base">💰 Earn More Together! 💰</p>
                    </div>
                  </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-2">
              <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl p-3 text-black font-bold" style={{
                    boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)',
                    willChange: 'transform'
                  }}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <UserPlus className="w-5 h-5" />
                  <div>
                      <p className="text-white/80 text-xs">Total Referrals</p>
                      <p className="text-xl font-extrabold">{safeTotalReferrals}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-3 text-white"
                  style={{ willChange: 'transform' }}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Coins className="w-5 h-5" />
                  <div>
                      <p className="text-white/80 text-xs">Total Earnings</p>
                      <p className="text-xl font-extrabold">{safeTotalEarnings}</p>
                  </div>
                </div>
              </motion.div>
              </div>

              {/* Referral Code */}
              <div className="bg-black/40 backdrop-blur-2xl rounded-2xl p-4 border border-white/10 shadow-2xl">
                <h2 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Your Referral Code
                </h2>
                
                <div className="relative">
              <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl p-3 border-2 border-yellow-500/40"
                    style={{ willChange: 'transform' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                        <p className="text-yellow-400 text-xs mb-1">Share this code with friends</p>
                        <p className="text-2xl font-extrabold text-white font-mono tracking-wider">{safeReferralCode}</p>
                  </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          navigator.clipboard.writeText(referralCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center" style={{
                          boxShadow: '0 0 15px rgba(234, 179, 8, 0.4)',
                          willChange: 'transform'
                        }}
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <Copy className="w-5 h-5 text-white" />
                        )}
                      </motion.button>
                </div>
              </motion.div>
                </div>

                {/* Share Buttons */}
                <div className="mt-4 space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      try {
                        const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID || '';
                        const inviteLink = `https://world.org/mini-app?app_id=${WORLD_APP_ID}&path=${encodeURIComponent(`/?ref=${safeReferralCode}`)}`;
                        if (navigator.share) {
                          await navigator.share({
                            title: 'Join Luminex Staking!',
                            text: `Use my referral code ${safeReferralCode} and get 50 LUX!`,
                            url: inviteLink,
                          });
                        } else {
                          await navigator.clipboard.writeText(inviteLink);
                          setCopied(true);
                          showToast('Link copied to clipboard!', 'success');
                          setTimeout(() => setCopied(false), 2000);
                        }
                      } catch (error) {
                        console.error('Error sharing:', error);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/30 text-sm"                                  
                  >
                    <Share2 className="w-5 h-5" />
                    <span>{translations[language].shareLink || 'Share Link'}</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      // TODO: Show QR code modal
                      showToast('QR Code feature coming soon!', 'success');
                    }}
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center space-x-2 text-sm" style={{                                                   
                      boxShadow: '0 4px 20px rgba(234, 179, 8, 0.4)'
                    }}
                  >
                    <QrCode className="w-5 h-5" />
                    <span>{translations[language].showQRCode || 'Show QR Code'}</span>
                  </motion.button>
                </div>
              </div>

              {/* Rewards Info */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-3 border border-yellow-400/30">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-yellow-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gift className="w-5 h-5 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1.5">How It Works</h3>
                    <ul className="space-y-1.5 text-white/80 text-xs">
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span>Share your referral code with friends</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span>Get 50 {TOKEN_NAME} when they sign up</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span>Unlimited referrals!</span>
                      </li>
                    </ul>
                  </div>
                </div>
                </div>
              </motion.div>
          )}

          {activeTab === 'game' && (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* Game Tab */}
              <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl p-8 text-center overflow-hidden border-2 border-yellow-600/30" style={{
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(234, 179, 8, 0.1), inset 0 1px 0 rgba(234, 179, 8, 0.1)'
              }}>
                                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-transparent animate-pulse"></div>
                <div className="relative z-10">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="text-7xl mb-4"
                  >
                    🎮
                  </motion.div>
                  <h1 className="text-2xl font-extrabold text-white mb-2">
                    Play & Earn!
                  </h1>
                  <p className="text-white/90 mb-2 text-lg">Play games and earn rewards</p>
                </div>
              </div>

              {/* Game Launcher */}
              <GameLauncherCard />
              </motion.div>
          )}
        </AnimatePresence>
            </div>

      {/* Stake Modal */}
      <AnimatePresence>
        {showStakeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowStakeModal(false); setIsShowInput(false); }}
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
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-yellow-600/40 rounded-2xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-yellow-500 text-lg"
                    />
                    <button
                      onClick={() => setStakeAmount(balance.toString())}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold text-sm px-3 py-1 rounded-xl hover:from-yellow-400 hover:to-amber-500" style={{
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
                  onClick={() => { setShowStakeModal(false); setIsShowInput(false); }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2.5 px-4 rounded-2xl text-sm"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStake}
                  disabled={isStaking}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-2.5 px-4 rounded-2xl disabled:opacity-50 text-sm"
                >
                  {isStaking ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-2xl border-t border-yellow-600/20 z-40" style={{
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5), 0 0 30px rgba(234, 179, 8, 0.05)'
      }}>
        <div className="max-w-md mx-auto px-4 py-3 flex justify-around">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('staking')}
            className={`flex flex-col items-center space-y-1 relative ${activeTab === 'staking' ? 'text-white' : 'text-gray-500'}`}
          >
            {activeTab === 'staking' && (
              <motion.div
                layoutId="activeTab"
                className="absolute -inset-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl blur"
              />
            )}
            <PiggyBank className="w-6 h-6 relative z-10" />
            <span className="text-xs font-bold relative z-10">Staking</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('membership')}
            className={`flex flex-col items-center space-y-1 relative ${activeTab === 'membership' ? 'text-white' : 'text-gray-500'}`}
          >
            {activeTab === 'membership' && (
              <motion.div
                layoutId="activeTab"
                className="absolute -inset-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl blur"
              />
            )}
            <Zap className="w-6 h-6 relative z-10" />
            <span className="text-xs font-bold relative z-10">Power</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('referral')}
            className={`flex flex-col items-center space-y-1 relative ${activeTab === 'referral' ? 'text-white' : 'text-gray-500'}`}
          >
            {activeTab === 'referral' && (
              <motion.div
                layoutId="activeTab"
                className="absolute -inset-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl blur"
              />
            )}
            <UserPlus className="w-6 h-6 relative z-10" />
            <span className="text-xs font-bold relative z-10">Referral</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('game')}
              className={`flex flex-col items-center space-y-1 relative ${activeTab === 'game' ? 'text-white' : 'text-gray-500'}`}
            >
              {activeTab === 'game' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -inset-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl blur"
                />
              )}
              <Gamepad2 className="w-6 h-6 relative z-10" />
              <span className="text-xs font-bold relative z-10">Game</span>
          </motion.button>
              </div>
            </div>

      {/* Toast Notification */}
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
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-white" />
                )}
                <span className="text-white font-semibold flex-1">{toast.message}</span>
          </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer for bottom nav */}
      <div className="h-16"></div>
    </div>
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
      console.error('MiniKitPanel bootstrap error:', e);
    }
  })();
}