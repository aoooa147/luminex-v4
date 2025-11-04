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
    let laneRotation = 0; // Track lane rotation for better distribution
    
    for(let t=1000;t<end;t+=step){
      // Main beat - rotate through lanes more evenly
      if(rng()<(0.85*P.density)) {
        const lane = laneRotation % LANES;
        arr.push({t, lane, id: `beat-${t}-${arr.length}`});
        laneRotation++;
      }
      
      // Syncopated beat - use different lane pattern
      if(rng()<(0.15*P.density)) {
        // Alternate between opposite lanes for variety
        const syncLane = (laneRotation + Math.floor(LANES/2)) % LANES;
        arr.push({t:t+Math.round(step/2), lane: syncLane, id: `beat-${t}-${arr.length+1}`});
      }
      
      // Add occasional multi-lane patterns for variety
      if(rng()<(0.2*P.density) && t > 5000) {
        // Sometimes add a simultaneous beat in adjacent lane
        const mainLane = laneRotation % LANES;
        const adjLane = (mainLane + 1) % LANES;
        if(rng() < 0.3) {
          arr.push({t: t + Math.round(step/4), lane: adjLane, id: `beat-${t}-${arr.length+2}`});
        }
      }
    }
    
    // Sort by time to ensure proper order
    arr.sort((a, b) => a.t - b.t);
    
    // Limit total beats but ensure good distribution
    return arr.slice(0, Math.floor(120*P.density));
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
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-white p-4 pb-6">
      <div className="max-w-4xl mx-auto space-y-4">
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
                <li>• กดปุ่ม L1-L4 เมื่อ beat มาถึงเส้นสีขาวด้านล่าง</li>
                <li>• กดให้ตรงกับ lane เพื่อคะแนนเพิ่มเติม</li>
                <li>• Perfect = คะแนนสูงสุด, Good = คะแนนปกติ</li>
                <li>• ทำ Combo ต่อเนื่องเพื่อ multiplier!</li>
              </ul>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {/* Game Area */}
            <div 
              ref={gameAreaRef}
              className="relative rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 border-2 border-purple-500/30 overflow-hidden shadow-2xl"
              style={{ height: '450px' }}
            >
              {/* Lane Background Colors */}
              {Array.from({length: LANES}).map((_, i) => (
                <div
                  key={`lane-bg-${i}`}
                  className="absolute top-0 bottom-0 opacity-20"
                  style={{ 
                    left: `${(i / LANES) * 100}%`,
                    width: `${100 / LANES}%`,
                    background: i % 2 === 0 
                      ? 'linear-gradient(to bottom, rgba(139, 92, 246, 0.1), transparent)'
                      : 'linear-gradient(to bottom, rgba(236, 72, 153, 0.1), transparent)'
                  }}
                />
              ))}

              {/* Hit Line */}
              <div 
                className="absolute left-0 right-0 h-2 bg-gradient-to-r from-transparent via-white to-transparent shadow-lg shadow-white/70 z-20 flex items-center"
                style={{ bottom: `${HIT_LINE_OFFSET}px` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse" />
                <div className="absolute left-0 right-0 text-center text-xs font-bold text-white drop-shadow-lg">
                  HIT HERE
                </div>
              </div>

              {/* Lane Dividers */}
              {Array.from({length: LANES - 1}).map((_, i) => (
                <div
                  key={`divider-${i}`}
                  className="absolute top-0 bottom-0 w-0.5 bg-white/20 z-10"
                  style={{ left: `${((i + 1) / LANES) * 100}%` }}
                />
              ))}

              {/* Lane Numbers at Top */}
              {Array.from({length: LANES}).map((_, i) => (
                <div
                  key={`lane-label-${i}`}
                  className="absolute top-2 text-xs font-bold text-white/60 bg-black/40 px-2 py-1 rounded z-10"
                  style={{ 
                    left: `${(i / LANES) * 100 + (100 / LANES / 2)}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  L{i+1}
                </div>
              ))}

              {/* Falling Beats */}
              <AnimatePresence>
                {visibleBeats.map((beat) => {
                  const y = getBeatPosition(beat);
                  if(y < -100 || y > 550) return null;
                  
                  const laneCenter = (beat.lane / LANES) * 100 + (100 / LANES / 2);
                  const distanceFromHitLine = Math.abs((gameAreaRef.current?.clientHeight || 450) - HIT_LINE_OFFSET - y);
                  const scale = distanceFromHitLine < 50 ? 1.3 : 1;
                  const opacity = distanceFromHitLine < 100 ? 1 : 0.7;
                  
                  return (
                    <motion.div
                      key={beat.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ 
                        opacity,
                        scale,
                        y: y,
                        x: `${laneCenter}%`,
                      }}
                      exit={{ opacity: 0, scale: 0.3 }}
                      transition={{ duration: 0.1 }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{ 
                        width: '64px',
                        height: '64px'
                      }}
                    >
                      {/* Beat Circle with Glow */}
                      <div 
                        className="w-full h-full rounded-full border-3 shadow-xl animate-pulse"
                        style={{
                          background: `radial-gradient(circle, rgba(${beat.lane % 2 === 0 ? '139, 92, 246' : '236, 72, 153'}, 1) 0%, rgba(${beat.lane % 2 === 0 ? '99, 102, 241' : '219, 39, 119'}, 0.8) 100%)`,
                          borderColor: 'rgba(255, 255, 255, 0.9)',
                          boxShadow: `0 0 20px rgba(${beat.lane % 2 === 0 ? '139, 92, 246' : '236, 72, 153'}, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.3)`
                        }}
                      >
                        {/* Inner pulse */}
                        <div 
                          className="absolute inset-2 rounded-full bg-white/40 animate-ping"
                          style={{ animationDuration: '1s' }}
                        />
                      </div>
                      
                      {/* Lane indicator trail */}
                      <div 
                        className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-8 bg-gradient-to-b opacity-50"
                        style={{
                          background: `linear-gradient(to bottom, rgba(${beat.lane % 2 === 0 ? '139, 92, 246' : '236, 72, 153'}, 0.8), transparent)`,
                          height: `${Math.min(distanceFromHitLine / 2, 40)}px`
                        }}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Hit Effects */}
              <AnimatePresence>
                {hitEffects.map((effect) => (
                  <motion.div
                    key={effect.id}
                    initial={{ opacity: 0, scale: 0.3, y: effect.y }}
                    animate={{ opacity: 1, scale: 1.8, y: effect.y - 60 }}
                    exit={{ opacity: 0, scale: 0.5, y: effect.y - 100 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
                    style={{ left: effect.x }}
                  >
                    <div className={`text-3xl font-black drop-shadow-2xl ${
                      effect.type === 'PERFECT' ? 'text-yellow-300 animate-pulse' :
                      effect.type === 'GOOD' ? 'text-green-300' :
                      'text-red-400'
                    }`}>
                      {effect.type === 'PERFECT' ? '✨ PERFECT! ✨' :
                       effect.type === 'GOOD' ? '✓ GOOD!' :
                       '✗ MISS'}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Lane Buttons - Right below game area */}
            <div className="grid grid-cols-4 gap-3 px-2">
              {Array.from({length:LANES}).map((_,i)=>(
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95, y: 0 }}
                  className="relative py-8 rounded-xl bg-gradient-to-b from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 font-bold text-xl shadow-2xl shadow-purple-500/40 active:shadow-inner border-2 border-white/20 transition-all duration-150"
                  onClick={()=>onTap(i)}
                >
                  {/* Button glow effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                  
                  {/* Lane number */}
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <span className="text-2xl">L{i+1}</span>
                    <span className="text-xs opacity-70">TAP</span>
                  </div>
                  
                  {/* Active indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-white/60 rounded-full" />
                </motion.button>
              ))}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 px-2">
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: combo.count > 0 ? 1.05 : 1 }}
                className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-3 text-center border-2 border-yellow-500/30 shadow-lg"
              >
                <div className="text-xs text-yellow-300/80 mb-1 font-semibold">🔥 COMBO</div>
                <div className="text-2xl font-black text-yellow-400">
                  {combo.count}x{combo.multiplier > 1 ? <span className="text-yellow-300"> (×{combo.multiplier})</span> : ''}
                </div>
              </motion.div>
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-3 text-center border-2 border-green-500/30 shadow-lg">
                <div className="text-xs text-green-300/80 mb-1 font-semibold">🎯 ACCURACY</div>
                <div className="text-2xl font-black text-green-400">{accuracyPercent}%</div>
              </div>
              <div className={`rounded-xl p-3 text-center border-2 shadow-lg ${
                lastHit === 'PERFECT' ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30' :
                lastHit === 'GOOD' ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30' :
                lastHit === 'MISS' ? 'bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/30' :
                'bg-zinc-900/60 border-zinc-800'
              }`}>
                <div className={`text-xs mb-1 font-semibold ${
                  lastHit === 'PERFECT' ? 'text-yellow-300/80' :
                  lastHit === 'GOOD' ? 'text-green-300/80' :
                  lastHit === 'MISS' ? 'text-red-300/80' :
                  'text-white/60'
                }`}>
                  LAST HIT
                </div>
                <div className={`text-2xl font-black ${
                  lastHit === 'PERFECT' ? 'text-yellow-300' :
                  lastHit === 'GOOD' ? 'text-green-400' :
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 font-medium shadow-lg" 
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

