export type PowerCode = 'spark' | 'nova' | 'quasar' | 'supernova' | 'singularity';

export type PowerLicense = {
  code: PowerCode;
  name: string;
  priceWLD: string; // Full price as string
  totalAPY: number; // Total APY (Base 50% + Power Boost)
};

export const POWERS: PowerLicense[] = [
  { code: 'spark', name: 'Spark', priceWLD: '1', totalAPY: 75 },
  { code: 'nova', name: 'Nova', priceWLD: '5', totalAPY: 125 },
  { code: 'quasar', name: 'Quasar', priceWLD: '10', totalAPY: 175 },
  { code: 'supernova', name: 'Supernova', priceWLD: '50', totalAPY: 325 },
  { code: 'singularity', name: 'Singularity', priceWLD: '200', totalAPY: 500 },
];

export const getPowerByCode = (code: PowerCode): PowerLicense | undefined => {
  return POWERS.find(p => p.code === code);
};

export const BASE_APY = 50;

export const getPowerBoost = (power: PowerLicense | null): number => {
  if (!power) return 0;
  return power.totalAPY - BASE_APY;
};
