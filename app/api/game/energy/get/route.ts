import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/game/storage';
import { withErrorHandler, createErrorResponse, createSuccessResponse } from '@/lib/utils/apiHandler';
import { isValidAddress } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const address = req.nextUrl.searchParams.get('address')?.toLowerCase();

  if (!address || !isValidAddress(address)) {
    return createErrorResponse('Valid address is required', 'MISSING_ADDRESS', 400);
  }

  const freePerDay = Number(process.env.GAME_ENERGY_FREE_PER_DAY ?? 5);
  const energies = readJSON<Record<string, { energy: number; max: number; day: string }>>('energies', {});
  const today = new Date().toISOString().slice(0, 10);

  if (!energies[address] || energies[address].day !== today) {
    energies[address] = { energy: freePerDay, max: freePerDay, day: today };
    writeJSON('energies', energies);
  }

  logger.debug('Energy fetched', { address, energy: energies[address].energy }, 'game/energy/get');

  return NextResponse.json({ ok: true, ...energies[address] });
}, 'game/energy/get');
