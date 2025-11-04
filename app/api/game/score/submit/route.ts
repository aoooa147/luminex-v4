import { NextRequest } from 'next/server'; 
import { readJSON, writeJSON } from '@/lib/game/storage'; 
import { verifyScoreSignature } from '@/lib/game/verify';

export const runtime = 'nodejs';

const WINDOW_MS=Number(process.env.GAME_SCORE_WINDOW_MS ?? 60000);
const MAX_SCORE_PER_SECOND = 5000;
const MAX_SCORE_PER_ACTION = 10000;
const MIN_GAME_DURATION_FOR_HIGH_SCORE = 10; // seconds
const HIGH_SCORE_THRESHOLD = 50000;

export async function POST(req: NextRequest){ 
  const { address, payload, sig } = await req.json();
  if(!address||!payload?.nonce) return Response.json({ok:false,error:'bad_payload'},{status:400});
  const { score, ts, nonce, gameDuration, actionsCount } = payload; 
  if(typeof score!=='number'||!ts||!nonce) return Response.json({ok:false,error:'bad_payload'},{status:400});
  
  // Enhanced anti-cheat validation
  const addressLower = (address as string).toLowerCase();
  
  // Validate nonce
  const nonces=readJSON<Record<string,string>>('nonces',{}); 
  const expected=nonces[addressLower]; 
  if(!expected||expected!==nonce) return Response.json({ok:false,error:'nonce_invalid'},{status:400});
  
  // Verify signature
  const ok=await verifyScoreSignature({ 
    address: address as `0x${string}`, 
    payload:{ address, score, ts, nonce }, 
    signature:sig as `0x${string}`
  }); 
  if(!ok) return Response.json({ok:false,error:'sig_invalid'},{status:400});
  
  // Check timestamp freshness
  const now=Date.now(); 
  if(Math.abs(now-Number(ts))>WINDOW_MS) return Response.json({ok:false,error:'stale'},{status:400});
  
  // Enhanced anti-cheat checks
  if (typeof gameDuration === 'number' && gameDuration > 0) {
    // Check 1: Score too high relative to game duration
    const scorePerSecond = score / gameDuration;
    if (scorePerSecond > MAX_SCORE_PER_SECOND) {
      console.warn(`[anti-cheat] ${addressLower}: Score too high per second: ${scorePerSecond.toFixed(2)}`);
      return Response.json({ok:false,error:'suspicious_score_rate'},{status:400});
    }
    
    // Check 2: High score with suspiciously short duration
    if (score > HIGH_SCORE_THRESHOLD && gameDuration < MIN_GAME_DURATION_FOR_HIGH_SCORE) {
      console.warn(`[anti-cheat] ${addressLower}: High score (${score}) in short duration (${gameDuration}s)`);
      return Response.json({ok:false,error:'suspicious_score_duration'},{status:400});
    }
  }
  
  // Check 3: Score too high relative to actions
  if (typeof actionsCount === 'number' && actionsCount > 0) {
    const scorePerAction = score / actionsCount;
    if (scorePerAction > MAX_SCORE_PER_ACTION) {
      console.warn(`[anti-cheat] ${addressLower}: Score per action too high: ${scorePerAction.toFixed(2)}`);
      return Response.json({ok:false,error:'suspicious_score_per_action'},{status:400});
    }
  }
  
  // Check 4: Score cap (existing check - will be applied later)
  const energies=readJSON<Record<string,{energy:number;max:number;day:string}>>('energies',{}); const today=new Date().toISOString().slice(0,10);
  if(!energies[address.toLowerCase()]||energies[address.toLowerCase()].day!==today){ const freePerDay=Number(process.env.GAME_ENERGY_FREE_PER_DAY ?? 5); energies[address.toLowerCase()]={energy:freePerDay,max:freePerDay,day:today}; }
  if(energies[address.toLowerCase()].energy<=0) return Response.json({ok:false,error:'no_energy'},{status:400});
  energies[address.toLowerCase()].energy-=1; writeJSON('energies',energies);
  // Apply score cap
  const capped=Math.max(0,Math.min(score,100000)); 
  const period=today;
  const scores=readJSON<any[]>('scores',[]); scores.push({address:address.toLowerCase(),score:capped,period,ts:Date.now()}); writeJSON('scores',scores);
  const board=readJSON<Record<string,Record<string,number>>>('leaderboards',{}); if(!board[period]) board[period]={}; board[period][address.toLowerCase()]=(board[period][address.toLowerCase()]||0)+capped; writeJSON('leaderboards',board);
  delete nonces[address.toLowerCase()]; writeJSON('nonces',nonces);
  return Response.json({ok:true,newEnergy:energies[address.toLowerCase()].energy});
}
