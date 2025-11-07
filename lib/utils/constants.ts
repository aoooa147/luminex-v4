// App Constants
import { Lock, Unlock } from 'lucide-react';

export const LOGO_URL = "https://i.postimg.cc/wvJqhSYW/Gemini-Generated-Image-ggu8gdggu8gdggu8-1.png";
export const TOKEN_NAME = "LUX";
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Luminex";
// Treasury Address - where membership payments are sent
// You can override this with NEXT_PUBLIC_TREASURY_ADDRESS environment variable
export const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "0xdc6c9ac4c8ced68c9d8760c501083cd94dcea4e8";

// Languages
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

// World App Configuration
export const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID || ""; // set in .env.local
export const WORLD_ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION || "luminexstaking";
export const WORLD_API_KEY = process.env.WORLD_API_KEY || ""; // Backend API key for World App services

// World App Backend API URLs
export const WORLD_API_BASE_URL = "https://developer.worldcoin.org/api/v2";
export const WORLD_BACKEND_API_BASE_URL = "https://app-backend.worldcoin.dev/public/v1";

// Contract addresses
export const LUX_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_LUX_TOKEN || process.env.NEXT_PUBLIC_LUX_TOKEN_ADDRESS || "0x6289D5B756982bbc2535f345D9D68Cb50c853F35";
export const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT || process.env.NEXT_PUBLIC_STAKING_ADDRESS || "";
export const WLD_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_WLD_TOKEN_ADDRESS || "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";

// Network Configuration
// LUX and Staking Contract are on World Chain
export const LUX_TOKEN_NETWORK = 'worldchain' as const; // For sendTransaction network parameter
export const STAKING_CONTRACT_NETWORK = 'worldchain' as const; // For sendTransaction network parameter

export const WALLET_RPC_URL = process.env.NEXT_PUBLIC_WALLET_RPC_URL || "https://worldchain-mainnet.g.alchemy.com/public";
export const WALLET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_WALLET_CHAIN_ID || "480", 10);
export const CONTRACT_RPC_URL = process.env.NEXT_PUBLIC_CONTRACT_RPC_URL || "https://worldchain-mainnet.g.alchemy.com/public";
export const CONTRACT_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CONTRACT_CHAIN_ID || "480", 10);

// Uniswap / DEX Configuration for LUX/WLD Swap
export const UNISWAP_ROUTER_V2_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'; // Optimism Uniswap V2 Router
export const UNISWAP_ROUTER_V3_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Optimism Uniswap V3 Router
export const SUSHISWAP_ROUTER_ADDRESS = '0x6BBD584e2f4037b1b028B3ef2E6d198138BA6e24'; // Optimism SushiSwap Router

// LUX/WLD Liquidity Pool (if exists on Uniswap/SushiSwap)
export const LUX_WLD_LP_ADDRESS = process.env.NEXT_PUBLIC_LUX_WLD_LP_ADDRESS || '';

// Staking Pools
export const POOLS = [
  { id: 0, name: "Flexible", lockDays: 0, apy: 50, desc: "No lock required" },
  { id: 1, name: "30 Days", lockDays: 30, apy: 75, desc: "Lock for 30 days" },
  { id: 2, name: "90 Days", lockDays: 90, apy: 125, desc: "Lock for 90 days" },
  { id: 3, name: "180 Days", lockDays: 180, apy: 175, desc: "Lock for 180 days" },
  { id: 4, name: "365 Days", lockDays: 365, apy: 325, desc: "Maximum APY!" },
];

// Membership Tiers
export const MEMBERSHIP_TIERS = [
  { id: 'bronze', name: 'Bronze', apy: 75, price: '1 WLD', icon: '🥉' },
  { id: 'silver', name: 'Silver', apy: 125, price: '5 WLD', icon: '🥈' },
  { id: 'gold', name: 'Gold', apy: 175, price: '10 WLD', icon: '🥇' },
  { id: 'platinum', name: 'Platinum', apy: 325, price: '50 WLD', icon: '💎' },
  { id: 'diamond', name: 'Diamond', apy: 500, price: '200 WLD', icon: '👑' },
];

// Pool icons and colors (for UI styling)
export const POOL_ICONS = [Unlock, Lock, Lock, Lock, Lock] as const;
export const POOL_COLORS = [
  "from-blue-400 to-cyan-400",
  "from-green-400 to-emerald-400",
  "from-purple-400 to-pink-400",
  "from-orange-400 to-red-400",
  "from-red-500 to-pink-500",
] as const;
export const POOL_BG_COLORS = [
  "bg-blue-500/10",
  "bg-green-500/10",
  "bg-purple-500/10",
  "bg-orange-500/10",
  "bg-red-500/10",
] as const;

// Membership tier colors (for UI styling)
export const MEMBERSHIP_COLORS: Record<string, string> = {
  bronze: 'from-amber-700 to-orange-700',
  silver: 'from-slate-400 to-gray-500',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-cyan-400 to-blue-400',
  diamond: 'from-indigo-400 to-purple-500',
};

export const MEMBERSHIP_SPARKLE: Record<string, boolean> = {
  bronze: false,
  silver: false,
  gold: false,
  platinum: true,
  diamond: true,
};

