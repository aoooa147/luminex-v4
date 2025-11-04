'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HUD from '@/components/game/HUD';

type Beat = { t: number, lane: number, id: string };
type Difficulty = 'EASY' | 'NORMAL' | 'HARD';
type HitType = 'PERFECT' | 'GOOD' | 'MISS' | null;
type Combo = { count: number; multiplier: number };

const DURATION = 45_000;
const LANES = 4;
const HIT_LINE_OFFSET = 100; // Distance from bottom where beats should be hit
const BEAT_SPEED = 2; // pixels per ms

const SONGS = [
  { id: 's1', title: 'Bangkok Night Ride', bpm: 105, url: '/audio/tuktuk-theme-1.wav', color: 'from-blue-500 to-purple-500' },
  { id: 's2', title: 'Soi Rhythm Rush', bpm: 120, url: '/audio/tuktuk-theme-2.wav', color: 'from-pink-500 to-orange-500' },
  { id: 's3', title: 'Temple Beat Drive', bpm: 135, url: '/audio/tuktuk-theme-3.wav', color: 'from-green-500 to-cyan-500' },
];

function xorshift32(seed: number) {
  let x = seed | 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}
function strToSeed(s: string) {
  let h = 2166136261 >>> 0;
  for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619); }
  return h >>> 0;
}
function todayKey(){ return new Date().toISOString().slice(0,10); }
function pickDifficulty(rand:()=>number): Difficulty { const r = rand(); return r<0.33?'EASY': r<0.7?'NORMAL':'HARD'; }
function diffParams(d: Difficulty){ 
  if(d==='EASY')return{windowPerfect:120,windowGood:240,density:1.0,scorePerfect:100,scoreGood:40,threshold:1000,rewardMul:1};
  if(d==='NORMAL')return{windowPerfect:90,windowGood:180,density:1.25,scorePerfect:120,scoreGood:50,threshold:1200,rewardMul:2};
  return{windowPerfect:70,windowGood:140,density:1.5,scorePerfect:140,scoreGood:60,threshold:1400,rewardMul:3}; 
}

export default function TukTukBeatPage(){
  const [address,setAddress]=useState('');
  const [energy,setEnergy]=useState(0);
  const [score,setScore]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [combo, setCombo] = useState<Combo>({ count: 0, multiplier: 1 });
  const [lastHit, setLastHit] = useState<HitType>(null);
  const [accuracy, setAccuracy] = useState({ hits: 0, total: 0 });
  const [hitEffects, setHitEffects] = useState<Array<{ id: string; lane: number; type: HitType; x: number; y: number }>>([]);
  const startedAt=useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const bgmRef=useRef<HTMLAudioElement|null>(null);
  const hitRef=useRef<HTMLAudioElement|null>(null);
  const finishRef=useRef<HTMLAudioElement|null>(null);
  const perfectRef=useRef<HTMLAudioElement|null>(null);

  const seedKey = useMemo(()=>`${(address||'guest')}-${todayKey()}`,[address]);
  const rng = useMemo(()=>xorshift32(strToSeed(seedKey)),[seedKey]);
  const song = useMemo(()=>SONGS[Math.floor(rng()*SONGS.length)%SONGS.length],[rng]);
  const difficulty: Difficulty = useMemo(()=>pickDifficulty(rng),[rng]);
  const P = useMemo(()=>diffParams(difficulty),[difficulty]);

  const beats = useMemo<Beat[]>(()=>{
    const arr:Beat[]=[]; 
    const step = Math.round(60_000/song.bpm/2); 
    const end=DURATION-800;
    for(let t=1000;t<end;t+=step){
      if(rng()<(0.85*P.density)) arr.push({t, lane: Math.floor(rng()*LANES), id: `beat-${t}-${arr.length}`});
      if(rng()<(0.15*P.density)) arr.push({t:t+Math.round(step/2), lane: Math.floor(rng()*LANES), id: `beat-${t}-${arr.length+1}`});
    }
    return arr.slice(0, 120*P.density);
  },[song,rng,P]);

  const [secondsRemain,setSecondsRemain]=useState(Math.floor(DURATION/1000));
  const [visibleBeats, setVisibleBeats] = useState<Beat[]>([]);

  // Animation loop for beats and game state
  useEffect(()=>{
    if(!playing) return;
    let raf=0;
    const loop=()=>{
      if(!playing) return;
      const elapsed=performance.now()-startedAt.current;
      setSecondsRemain(Math.max(0,Math.floor((DURATION-elapsed)/1000)));
      
      // Update visible beats (beats that should be on screen)
      const gameAreaHeight = gameAreaRef.current?.clientHeight || 600;
      const visibleWindow = gameAreaHeight / BEAT_SPEED; // ms
      const visible = beats.filter(b => {
        const timeUntilHit = b.t - elapsed;
        return timeUntilHit > -500 && timeUntilHit < visibleWindow;
      });
      setVisibleBeats(visible);
      
      // Remove beats that are too old
      const hitBeats = beats.filter(b => elapsed > b.t + P.windowGood);
      if(hitBeats.length > 0) {
        setCombo(c => ({ count: 0, multiplier: 1 }));
        setAccuracy(a => ({ ...a, total: a.total + hitBeats.length }));
      }
      
      if(elapsed<DURATION) raf=requestAnimationFrame(loop); else finish();
    };
    raf=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(raf);
  },[playing, beats, P.windowGood]);

  useEffect(()=>{
    const a=sessionStorage.getItem('verifiedAddress')||localStorage.getItem('user_address')||localStorage.getItem('demo_address')||'';
    setAddress(a);
    if(a) loadEnergy(a);
  },[]);

  async function loadEnergy(addr:string){
    const r=await fetch(`/api/game/energy/get?address=${addr}`);
    const j=await r.json(); if(j.ok) setEnergy(j.energy);
  }

  function start(){
    if(!address) return alert('กรุณาเชื่อม Wallet ก่อน (ไปที่ /connect)');
    if(energy<=0) return alert('พลังงานหมด');
    setScore(0); 
    setCombo({ count: 0, multiplier: 1 });
    setAccuracy({ hits: 0, total: 0 });
    setLastHit(null);
    setHitEffects([]);
    setSecondsRemain(Math.floor(DURATION/1000));
    startedAt.current=performance.now(); 
    setPlaying(true);
    if(!bgmRef.current){ bgmRef.current=new Audio(song.url); bgmRef.current.loop=false; bgmRef.current.volume=0.9; }
    bgmRef.current.currentTime=0; bgmRef.current.play().catch(()=>{});
    if(!hitRef.current) hitRef.current=new Audio('/audio/tap.wav');
    if(!finishRef.current) finishRef.current=new Audio('/audio/finish.wav');
    if(!perfectRef.current) { perfectRef.current=new Audio('/audio/tap.wav'); perfectRef.current.volume=0.7; }
  }

  function addHitEffect(lane: number, type: HitType, x: number, y: number) {
    const id = `effect-${Date.now()}-${Math.random()}`;
    setHitEffects(prev => [...prev, { id, lane, type, x, y }]);
    setTimeout(() => {
      setHitEffects(prev => prev.filter(e => e.id !== id));
    }, 1000);
  }

  function onTap(lanePressed?:number){
    if(!playing || !gameAreaRef.current) return;
    
    const elapsed=performance.now()-startedAt.current;
    const gameAreaHeight = gameAreaRef.current.clientHeight;
    const hitY = gameAreaHeight - HIT_LINE_OFFSET;
    
    // Find nearest beat to current time
    let bestBeat: Beat | null = null;
    let bestDistance = Infinity;
    let hitType: HitType = null;
    
    for(const b of beats){
      const timeDiff = Math.abs(b.t - elapsed);
      const laneMatch = lanePressed !== undefined && lanePressed === b.lane;
      
      if(timeDiff < bestDistance && (lanePressed === undefined || laneMatch)) {
        bestDistance = timeDiff;
        bestBeat = b;
        
        if(timeDiff <= P.windowPerfect) {
          hitType = 'PERFECT';
        } else if(timeDiff <= P.windowGood) {
          hitType = 'GOOD';
        }
      }
    }
    
    if(bestBeat && hitType) {
      // Hit!
      const baseScore = hitType === 'PERFECT' ? P.scorePerfect : P.scoreGood;
      const laneBonus = (lanePressed !== undefined && lanePressed === bestBeat.lane) ? 10 : 0;
      const comboBonus = combo.multiplier > 1 ? baseScore * (combo.multiplier - 1) * 0.5 : 0;
      const points = Math.floor(baseScore + laneBonus + comboBonus);
      
      setScore(s => s + points);
      setCombo(c => {
        const newCount = c.count + 1;
        const newMultiplier = Math.min(Math.floor(newCount / 10) + 1, 5);
        return { count: newCount, multiplier: newMultiplier };
      });
      setAccuracy(a => ({ hits: a.hits + 1, total: a.total + 1 }));
      setLastHit(hitType);
      
      // Audio feedback
      if(hitType === 'PERFECT' && perfectRef.current) {
        try { perfectRef.current.currentTime=0; perfectRef.current.play(); } catch{}
      } else if(hitRef.current) {
        try { hitRef.current.currentTime=0; hitRef.current.play(); } catch{}
      }
      
      // Visual effect
      const laneWidth = (gameAreaRef.current?.clientWidth || 400) / LANES;
      const x = laneWidth * (lanePressed !== undefined ? lanePressed : bestBeat.lane) + laneWidth / 2;
      addHitEffect(lanePressed !== undefined ? lanePressed : bestBeat.lane, hitType, x, hitY);
      
      // Remove hit beat
      const newBeats = beats.filter(b => b.id !== bestBeat!.id);
      beats.length = 0;
      beats.push(...newBeats);
    } else {
      // Miss
      setScore(s => Math.max(0, s - 10));
      setCombo({ count: 0, multiplier: 1 });
      setAccuracy(a => ({ ...a, total: a.total + 1 }));
      setLastHit('MISS');
      
      if(lanePressed !== undefined) {
        const laneWidth = (gameAreaRef.current?.clientWidth || 400) / LANES;
        const x = laneWidth * lanePressed + laneWidth / 2;
        addHitEffect(lanePressed, 'MISS', x, hitY);
      }
    }
  }

  async function finish(){
    if(!playing) return; 
    setPlaying(false);
    try{ 
      if(finishRef.current) finishRef.current.play(); 
      if(bgmRef.current) bgmRef.current.pause(); 
    }catch{}
    const base={ address, score, ts: Date.now() };
    const {nonce}=await fetch('/api/game/score/nonce',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address})}).then(r=>r.json());
    const payload={...base, nonce};
    const sig='0x';
    await fetch('/api/game/score/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address,payload,sig})});
    const earned = score>=P.threshold ? P.rewardMul : 0;
    if(earned>0){ const key='luminex_tokens'; const cur=Number(localStorage.getItem(key)||'0'); localStorage.setItem(key,String(cur+earned)); }
    loadEnergy(address);
    
    const accuracyPercent = accuracy.total > 0 ? Math.round((accuracy.hits / accuracy.total) * 100) : 0;
    alert(`จบเกม!\n\nคะแนน: ${score.toLocaleString()}\nCombo สูงสุด: ${combo.count}x${combo.multiplier}\nความแม่นยำ: ${accuracyPercent}%\nเพลง: ${song.title}\nความยาก: ${difficulty}\nรางวัล: ${earned} token`);
  }

  function getBeatPosition(beat: Beat): number {
    if(!playing || !gameAreaRef.current) return -1000;
    const elapsed=performance.now()-startedAt.current;
    const gameAreaHeight = gameAreaRef.current.clientHeight;
    const timeUntilHit = beat.t - elapsed;
    const distanceFromHitLine = timeUntilHit * BEAT_SPEED;
    return gameAreaHeight - HIT_LINE_OFFSET - distanceFromHitLine;
  }

  const accuracyPercent = accuracy.total > 0 ? Math.round((accuracy.hits / accuracy.total) * 100) : 100;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-white p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent text-center">
          🎵 TukTuk Beat 🎵
        </h1>
        
        <HUD 
          energy={energy} 
          score={score} 
          secondsRemain={secondsRemain} 
          songTitle={`${song.title} · ${song.bpm} BPM`} 
          difficultyLabel={difficulty} 
          audioRef={bgmRef}
          combo={combo.count}
          accuracy={accuracyPercent}
        />

        {!playing ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className={`rounded-2xl p-6 bg-gradient-to-br ${song.color} border-2 border-white/20 shadow-2xl`}>
              <div className="text-center space-y-3">
                <div className="text-4xl mb-4">🎮</div>
                <h2 className="text-2xl font-bold text-white">พร้อมเล่นแล้ว!</h2>
                <div className="text-white/90 space-y-2">
                  <p>เพลง: <b>{song.title}</b> · {song.bpm} BPM</p>
                  <p>ความยาก: <b className="text-yellow-300">{difficulty}</b></p>
                  <p className="text-sm opacity-80">วันนี้: {todayKey()}</p>
                </div>
              </div>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-lg shadow-lg shadow-emerald-500/50" 
              onClick={start}
            >
              ▶ เริ่มเล่น
            </motion.button>

            <div className="rounded-xl p-4 bg-zinc-900/60 border border-zinc-800">
              <h3 className="font-bold mb-2">📖 วิธีเล่น:</h3>
              <ul className="text-sm space-y-1 text-white/80">
                <li>• กดปุ่มเมื่อ beat มาถึงเส้นสีขาวด้านล่าง</li>
                <li>• กดให้ตรงกับ lane เพื่อคะแนนเพิ่มเติม</li>
                <li>• Perfect = คะแนนสูงสุด, Good = คะแนนปกติ</li>
                <li>• ทำ Combo ต่อเนื่องเพื่อ multiplier!</li>
              </ul>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Game Area */}
            <div 
              ref={gameAreaRef}
              className="relative rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 border-2 border-purple-500/30 overflow-hidden"
              style={{ height: '500px' }}
            >
              {/* Hit Line */}
              <div 
                className="absolute left-0 right-0 h-1 bg-white/80 shadow-lg shadow-white/50 z-10"
                style={{ bottom: `${HIT_LINE_OFFSET}px` }}
              />

              {/* Lane Dividers */}
              {Array.from({length: LANES - 1}).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-white/10"
                  style={{ left: `${((i + 1) / LANES) * 100}%` }}
                />
              ))}

              {/* Falling Beats */}
              <AnimatePresence>
                {visibleBeats.map((beat) => {
                  const y = getBeatPosition(beat);
                  if(y < -50 || y > 550) return null;
                  
                  return (
                    <motion.div
                      key={beat.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        y: y,
                        x: `${(beat.lane / LANES) * 100 + (100 / LANES / 2)}%`,
                      }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2"
                    >
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white shadow-lg shadow-purple-500/50 animate-pulse" />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Hit Effects */}
              <AnimatePresence>
                {hitEffects.map((effect) => (
                  <motion.div
                    key={effect.id}
                    initial={{ opacity: 0, scale: 0.5, y: effect.y }}
                    animate={{ opacity: 1, scale: 1.5, y: effect.y - 50 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: effect.x }}
                  >
                    <div className={`text-2xl font-bold ${
                      effect.type === 'PERFECT' ? 'text-yellow-300' :
                      effect.type === 'GOOD' ? 'text-green-300' :
                      'text-red-400'
                    }`}>
                      {effect.type === 'PERFECT' ? 'PERFECT!' :
                       effect.type === 'GOOD' ? 'GOOD!' :
                       'MISS'}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Lane Buttons */}
            <div className="grid grid-cols-4 gap-3">
              {Array.from({length:LANES}).map((_,i)=>(
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="py-6 rounded-xl bg-gradient-to-b from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-bold text-lg shadow-lg shadow-indigo-500/30 active:shadow-inner"
                  onClick={()=>onTap(i)}
                >
                  L{i+1}
                </motion.button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
                <div className="text-xs text-white/60 mb-1">COMBO</div>
                <div className="text-xl font-bold text-yellow-400">{combo.count}x{combo.multiplier > 1 ? ` (×${combo.multiplier})` : ''}</div>
              </div>
              <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
                <div className="text-xs text-white/60 mb-1">ACCURACY</div>
                <div className="text-xl font-bold text-green-400">{accuracyPercent}%</div>
              </div>
              <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
                <div className="text-xs text-white/60 mb-1">LAST HIT</div>
                <div className={`text-xl font-bold ${
                  lastHit === 'PERFECT' ? 'text-yellow-300' :
                  lastHit === 'GOOD' ? 'text-green-300' :
                  lastHit === 'MISS' ? 'text-red-400' :
                  'text-white/40'
                }`}>
                  {lastHit || '-'}
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-red-700 hover:bg-red-600 font-medium" 
              onClick={finish}
            >
              ⏹ จบเกม
            </motion.button>
          </div>
        )}
      </div>
    </main>
  );
}

