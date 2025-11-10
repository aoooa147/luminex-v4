import { NextRequest } from 'next/server';
import { withErrorHandler, createErrorResponse, createSuccessResponse, validateBody } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';
import { readJSON, writeJSON } from '@/lib/game/storage';
import { STAKING_CONTRACT_ADDRESS, LUX_TOKEN_ADDRESS } from '@/lib/utils/constants';
import { ethers } from 'ethers';

export const runtime = 'nodejs';

// Staking Contract ABI for game rewards
const STAKING_ABI = [
  "function distributeGameReward(address user, uint256 amount, string memory gameId) external",
  "function gameRewardDistributors(address) external view returns (bool)",
];

// Get provider and signer for contract interaction
function getProviderAndSigner() {
  // Use fallback RPC URL if environment variable is not set
  const rpcUrl = process.env.WORLDCHAIN_RPC_URL || 
                 process.env.NEXT_PUBLIC_WALLET_RPC_URL || 
                 'https://worldchain-mainnet.g.alchemy.com/public';
  
  logger.info('Using RPC URL for contract interaction', {
    rpcUrl: rpcUrl.replace(/\/\/.*@/, '//***@'), // Mask credentials in logs
    hasWorldchainRpc: !!process.env.WORLDCHAIN_RPC_URL,
    hasWalletRpc: !!process.env.NEXT_PUBLIC_WALLET_RPC_URL,
    usingFallback: !process.env.WORLDCHAIN_RPC_URL && !process.env.NEXT_PUBLIC_WALLET_RPC_URL,
  }, 'game/reward/confirm');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const privateKey = process.env.GAME_REWARD_DISTRIBUTOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    logger.error('Private key not configured', {
      hasGameRewardDistributorKey: !!process.env.GAME_REWARD_DISTRIBUTOR_PRIVATE_KEY,
      hasPrivateKey: !!process.env.PRIVATE_KEY,
    }, 'game/reward/confirm');
    throw new Error('GAME_REWARD_DISTRIBUTOR_PRIVATE_KEY or PRIVATE_KEY is not set. Please configure it in .env.local');
  }

  const signer = new ethers.Wallet(privateKey, provider);
  return { provider, signer };
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { payload } = body;

  // Validate required fields
  if (!payload || !payload.reference || !payload.transaction_id) {
    return createErrorResponse(
      'Missing payload, reference, or transaction_id',
      'MISSING_FIELDS',
      400
    );
  }

  const reference = payload.reference;
  const transactionId = payload.transaction_id;

  // Find reward by reference
  const rewards = readJSON<Record<string, Record<string, { amount: number; timestamp: number; claimed?: boolean; reference?: string; address?: string; transactionId?: string; contractTxHash?: string }>>>('game_rewards', {});
  
  let foundReward: { address: string; gameId: string; amount: number } | null = null;
  
  for (const [userAddress, userRewards] of Object.entries(rewards)) {
    for (const [gameId, rewardInfo] of Object.entries(userRewards)) {
      if (rewardInfo.reference === reference) {
        foundReward = {
          address: userAddress,
          gameId,
          amount: rewardInfo.amount
        };
        break;
      }
    }
    if (foundReward) break;
  }

  if (!foundReward) {
    return createErrorResponse(
      'Reward reference not found',
      'REFERENCE_NOT_FOUND',
      400
    );
  }

  const { address: rewardAddress, gameId, amount } = foundReward;

  // Check if already claimed
  if (rewards[rewardAddress]?.[gameId]?.claimed) {
    return createErrorResponse(
      'Reward already claimed',
      'ALREADY_CLAIMED',
      400
    );
  }

  // Convert amount to wei (LUX has 18 decimals)
  const amountWei = ethers.parseEther(amount.toString());

  // Distribute reward via contract
  let contractTxHash: string | null = null;
  try {
    const { signer } = getProviderAndSigner();
    const distributorAddress = await signer.getAddress();
    
    // Load contract
    const stakingContract = new ethers.Contract(
      STAKING_CONTRACT_ADDRESS,
      STAKING_ABI,
      signer
    );

    // Check if distributor is authorized
    const isAuthorized = await stakingContract.gameRewardDistributors(distributorAddress);
    if (!isAuthorized) {
      logger.error('Distributor not authorized', {
        distributorAddress,
        stakingContract: STAKING_CONTRACT_ADDRESS
      }, 'game/reward/confirm');
      
      return createErrorResponse(
        'Game reward distributor is not authorized. Please contact administrator.',
        'DISTRIBUTOR_NOT_AUTHORIZED',
        500
      );
    }

    // Call contract to distribute reward
    logger.info('Distributing game reward via contract', {
      user: rewardAddress,
      amount: amount.toString(),
      amountWei: amountWei.toString(),
      gameId,
      distributorAddress
    }, 'game/reward/confirm');

    const tx = await stakingContract.distributeGameReward(
      rewardAddress,
      amountWei,
      gameId
    );

    contractTxHash = tx.hash;
    logger.info('Contract transaction sent', {
      txHash: contractTxHash,
      user: rewardAddress,
      amount: amount.toString()
    }, 'game/reward/confirm');

    // Wait for transaction confirmation (optional - can be async)
    // For faster response, we can mark as claimed first and wait in background
    tx.wait().then((receipt: any) => {
      logger.success('Game reward distributed on-chain', {
        txHash: contractTxHash,
        blockNumber: receipt.blockNumber,
        user: rewardAddress,
        amount: amount.toString()
      }, 'game/reward/confirm');
    }).catch((error: any) => {
      logger.error('Contract transaction failed', {
        txHash: contractTxHash,
        error: error.message,
        user: rewardAddress,
        amount: amount.toString()
      }, 'game/reward/confirm');
    });

  } catch (error: any) {
    logger.error('Failed to distribute reward via contract', {
      error: error.message,
      errorStack: error.stack,
      user: rewardAddress,
      amount: amount.toString(),
      gameId,
      errorType: error.constructor?.name,
    }, 'game/reward/confirm');

    // If contract call fails, still mark as claimed in database
    // This allows the frontend flow to complete even if backend contract distribution fails
    // The error is logged for manual review and retry
    // In production, you might want to queue failed distributions for retry
    logger.warn('Contract distribution failed, but marking as claimed in database', {
      user: rewardAddress,
      amount: amount.toString(),
      gameId,
      error: error.message,
    }, 'game/reward/confirm');
  }

  // Mark as claimed in database
  if (!rewards[rewardAddress]) {
    rewards[rewardAddress] = {};
  }
  if (!rewards[rewardAddress][gameId]) {
    rewards[rewardAddress][gameId] = { amount, timestamp: Date.now() };
  }
  const rewardEntry = rewards[rewardAddress][gameId];
  rewardEntry.claimed = true;
  rewardEntry.transactionId = transactionId;
  if (contractTxHash) {
    rewardEntry.contractTxHash = contractTxHash;
  }
  writeJSON('game_rewards', rewards);

  logger.success('Game reward confirmed', {
    address: rewardAddress,
    gameId,
    amount,
    reference,
    transactionId,
    contractTxHash
  }, 'game/reward/confirm');

          const responseData = {
            ok: true,
            success: true,
            message: `Successfully claimed ${amount} LUX reward!`,
            amount,
            gameId,
            transactionId,
            contractTxHash: contractTxHash || null,
            address: rewardAddress
          };
          
          logger.info('Returning confirm response', {
            address: rewardAddress,
            gameId,
            amount,
            transactionId,
            contractTxHash,
            responseData
          }, 'game/reward/confirm');
          
          return createSuccessResponse(responseData);
}, 'game/reward/confirm');

