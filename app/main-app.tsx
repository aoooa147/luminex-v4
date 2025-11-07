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
import StakingTab from '@/components/staking/StakingTab';
import MembershipTab from '@/components/membership/MembershipTab';
import ReferralTab from '@/components/referral/ReferralTab';
import GameTab from '@/components/game/GameTab';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import StakeModal from '@/components/modals/StakeModal';
import QRModal from '@/components/modals/QRModal';

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
        const MiniKit = (window as any).MiniKit;
        
        // Use MiniKit.commandsAsync.walletAuth (new API)
        if (MiniKit.commandsAsync?.walletAuth) {
          const nonce = crypto.randomUUID().replace(/-/g, '');
          const result = await MiniKit.commandsAsync.walletAuth({ nonce });
          const walletData = result.finalPayload;
          
          
        if (walletData?.address) {
            setWallet({ address: walletData.address });
    setIsConnected(true);
            
            // Try to get username from MiniKit.user.username first
            let foundUsername: string | null = null;
            try {
              if (MiniKit.user?.username) {
                foundUsername = MiniKit.user.username;
        } else {
              }
            } catch (e: any) {
            }
            
            // If not found, try getUserByAddress
            if (!foundUsername) {
              try {
                if (MiniKit.getUserByAddress) {
                  const worldIdUser = await MiniKit.getUserByAddress(walletData.address);
                  if (worldIdUser?.username) {
                    foundUsername = worldIdUser.username;
              } else {
                  }
              } else {
                }
              } catch (e: any) {
              }
            }
            
            // Try to extract user info from walletData if available
            if (walletData?.name || walletData?.username) {
              setUserInfo({ 
                name: walletData.name || foundUsername, 
                username: walletData.username || foundUsername
              });
            } else if (foundUsername) {
              setUserInfo({ name: foundUsername, username: foundUsername });
          } else {
              setUserInfo(null);
            }
            
            // Always use Worldchain for World App MiniKit
            
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
    try {
            // Ensure amount is a valid string first
      const amountStr = String(params.amount || '0').trim();
      
      const amount = parseFloat(amountStr);

      if (!amount || amount <= 0 || isNaN(amount)) {
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

const LuminexApp = () => {
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const { userAddress } = useWorldID();
  const { wallet, isConnected, connectWallet, requestPayment, provider, userInfo, setUserInfo, getSigner } = useMiniKit();
  const [activeTab, setActiveTab] = useState<'staking' | 'membership' | 'referral' | 'game'>('staking');
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [showQRModal, setShowQRModal] = useState(false);
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

  // Check if user is admin
  useEffect(() => {
    if (actualAddress) {
      const isAdminUser = actualAddress.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase();
      setIsAdmin(isAdminUser);
      console.log('🔍 Admin check:', {
        address: actualAddress,
        adminAddress: ADMIN_WALLET_ADDRESS,
        isAdmin: isAdminUser
      });
    } else {
      setIsAdmin(false);
    }
  }, [actualAddress]);

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
        showToast(`${translations[language].membershipActivated?.replace('{tier}', '5 LUX') || 'You received 5 LUX for using referral code!'}`, 'success');
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
      const lockPeriod = POOLS_FROM_CONSTANTS[selectedPool].lockDays * 24 * 60 * 60; // Convert days to seconds

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

  const currentPool = POOLS_FROM_CONSTANTS[selectedPool];
  const baseApy = BASE_APY; // Base APY is now 50% (from powerConfig)
  const powerBoost = currentPower ? getPowerBoost(getPowerByCode(currentPower.code) || null) : 0;
  const totalApy = currentPower ? currentPower.totalAPY : baseApy;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-y-auto">
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
      <AppHeader
        actualAddress={actualAddress}
        userInfo={userInfo}
        formattedBalance={formattedBalance}
        formattedWldBalance={formattedWldBalance}
        isLoadingBalance={isLoadingBalance}
        language={language}
        showLanguageMenu={showLanguageMenu}
        setShowLanguageMenu={setShowLanguageMenu}
        setLanguage={setLanguage}
        t={t}
      />

      {/* Main Content */}
      <div 
        className="relative max-w-md mx-auto px-4 py-2 pb-20 overflow-y-auto"
      >
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

          {activeTab === 'game' && (
            <GameTab />
          )}
        </AnimatePresence>
            </div>

      {/* Stake Modal */}
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

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
      />

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

      {/* QR Code Modal */}
      <QRModal
        showQRModal={showQRModal}
        setShowQRModal={setShowQRModal}
        safeReferralCode={safeReferralCode}
        showToast={showToast}
      />

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