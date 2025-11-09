import React, { useState, useCallback, useMemo, memo } from 'react';
import { useMiniKit } from '@/hooks/useMiniKit';
import { WORLD_APP_ID, WORLD_ACTION, TREASURY_ADDRESS, TOKEN_NAME, LOGO_URL, BRAND_NAME } from '@/lib/utils/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '@/lib/utils/i18n';

/**
 * MiniKitPanel
 * - Adds Verify / Wallet Auth / Pay→Confirm controls in a collapsible sheet
 * - Purely additive: does not remove/replace any index.tsx code
 * - Optimized with React.memo, useCallback, and useMemo
 */
const MiniKitPanel = memo(function MiniKitPanel() {
  const { ready, error, verify, walletAuth, pay } = useMiniKit();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState(WORLD_ACTION || 'luminexstaking');
  const [amount, setAmount] = useState('0.1');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState<'idle' | 'initiated' | 'pending' | 'confirmed' | 'failed' | 'cancelled'>('idle');
  const [isPolling, setIsPolling] = useState(false);
  const [pollDone, setPollDone] = useState(false);
  const [pollSuccess, setPollSuccess] = useState(false);
  const [pollStep, setPollStep] = useState(0);
  const pollMax = 20;

  // Memoize log function to avoid recreating on every render
  const log = useCallback((m: string) => {
    setLogs((old) => [m, ...old].slice(0, 120));
  }, []);

  // Memoize functions with useCallback to avoid recreating on every render
  const genReference = useCallback(async () => {
    const r = await fetch('/api/initiate-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, symbol: 'WLD' }) });
    const j = await r.json();
    const refId = j.id || '';
    setReference(refId);
    log('Generated reference: ' + refId);
    return refId; // ✅ Return reference ID to avoid React state update race condition
  }, [amount, log]);

  const doVerify = useCallback(async () => {
    try {
      setBusy(true);
      const payload = await verify(action);
      const r = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload, action }) });
      const j = await r.json();
      setResult(j);
      log('Verify response: ' + JSON.stringify(j));
    } catch (e: any) { log('Verify error: ' + e?.message); }
    finally { setBusy(false); }
  }, [action, verify, log]);

  const doWalletAuth = useCallback(async () => {
    try {
      setBusy(true);
      const payload = await walletAuth();
      const r = await fetch('/api/complete-siwe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload }) });
      const j = await r.json();
      setResult(j);
      log('WalletAuth response: ' + JSON.stringify(j));
    } catch (e: any) { log('WalletAuth error: ' + e?.message); }
    finally { setBusy(false); }
  }, [walletAuth, log]);

  const pollConfirm = useCallback(async (tx: string, ref: string, max=pollMax, interval=1500) => {
    setStep('pending');
    setIsPolling(true);
    setPollDone(false);
    setPollSuccess(false);
    setPollStep(0);
    for (let i=0;i<max;i++) {
      setPollStep(i+1);
      try {
        const r = await fetch('/api/confirm-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: { transaction_id: tx, reference: ref } }) });
        const j = await r.json();
        if (j?.success && (j?.transaction?.transaction_status === 'confirmed' || j?.transaction?.status === 'confirmed')) {
          log('Polling confirmed: ' + JSON.stringify(j));
          setResult(j);
          setPollSuccess(true);
          setIsPolling(false);
          setPollDone(true);
          setStep('confirmed');
          return true;
        }
      } catch(e:any) {
        log('Polling error: ' + e?.message);
      }
      await new Promise(r => setTimeout(r, interval));
    }
    setPollDone(true);
    setIsPolling(false);
    setStep('failed');
    return false;
  }, [log, pollMax]);

  const doPay = useCallback(async () => {
    setStep('initiated');
    try {
      setBusy(true);
      // ✅ Use local variable to avoid React state update race condition
      let ref = reference;
      if (!ref) {
        ref = await genReference(); // Get reference ID directly from function return
      }
      
      if (!ref || ref.length < 8) {
        throw new Error('Invalid reference ID: must be at least 8 characters');
      }
      
      log('Using reference: ' + ref);
      
      let payload: any = null;
      try {
        payload = await pay(ref, (TREASURY_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000', amount, 'WLD');
      } catch (e: any) {
        // Handle user cancellation - don't proceed to confirm-payment
        if (e?.type === 'user_cancelled') {
          log('User cancelled payment');
          setStep('cancelled');
          return; // ❌ Don't send to confirm-payment
        }
        throw e;
      }

      // Guard: No transaction_id = user cancelled/didn't confirm
      if (!payload?.transaction_id) {
        log('Payment not confirmed - no transaction_id');
        setStep('failed');
        return;
      }

      const r = await fetch('/api/confirm-payment', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ payload }) 
      });
      const j = await r.json();
      setResult(j);
      log('Confirm-payment response: ' + JSON.stringify(j));

      if (r.ok && j?.transaction?.transaction_id) {
        await pollConfirm(j.transaction.transaction_id, ref);
      } else {
        // Map backend error messages correctly
        const msg = (j?.error || '').toString().toLowerCase();
        const code = (j?.code || '').toString().toLowerCase();
        
        if (code === 'user_cancelled' || msg.includes('missing transaction_id')) {
          log('Payment cancelled by user');
          setStep('cancelled');
        } else if (msg.includes('insufficient_balance') || msg.includes('insufficient')) {
          log('Insufficient balance');
          setStep('failed');
        } else {
          log('Payment failed: ' + (j?.error || 'unknown'));
          setStep('failed');
        }
      }
    } catch (e: any) {
      log('Pay error: ' + e?.message);
      if (e?.type === 'user_cancelled') {
        setStep('cancelled');
      } else {
        setStep('failed');
      }
    } finally { 
      setBusy(false); 
    }
  }, [reference, amount, pay, log, genReference, pollConfirm]);

  // Memoize toggle handler
  const handleToggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  // Memoize input handlers
  const handleActionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAction(e.target.value);
  }, []);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  }, []);

  const handleReferenceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setReference(e.target.value);
  }, []);

  // Memoize computed values
  const progressWidth = useMemo(() => {
    return step === 'idle' ? '0%' : step === 'initiated' ? '33%' : step === 'pending' ? '66%' : step === 'confirmed' ? '100%' : '100%';
  }, [step]);

  const progressColor = useMemo(() => {
    return step === 'failed' ? 'bg-rose-500' : 'bg-indigo-500';
  }, [step]);

  const pollProgress = useMemo(() => {
    return (pollStep / pollMax) * 100;
  }, [pollStep, pollMax]);

  const logsText = useMemo(() => {
    return logs.join('\n');
  }, [logs]);

  const resultText = useMemo(() => {
    return JSON.stringify(result, null, 2);
  }, [result]);

  return (
    <>
      {/* Floating toggle button (non-intrusive) */}
      <button
        onClick={handleToggle}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        style={{ minHeight: 44 }}
      >
        {open ? t('close_panel') : t('open_panel')}
      </button>

      {/* Collapsible sheet */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur">
          <div className="max-w-screen-sm mx-auto p-4 space-y-4 text-white">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="logo" className="h-8 w-8 rounded-xl ring-1 ring-white/10" />
              <div className="text-sm">
                <div className="font-semibold">{BRAND_NAME || 'MiniKit Panel'}</div>
                <div className="opacity-70">App ID: <code>{WORLD_APP_ID || '(set in .env.local)'}</code></div>
                <div className="opacity-70">MiniKit installed? <b>{String(ready)}</b>{error ? ` / error: ${error}` : ''}</div>
              </div>
            </div>

            <div className="grid gap-3">
              <label className="text-sm">Action
                <input value={action} onChange={handleActionChange} className="mt-1 w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Amount ({TOKEN_NAME || 'WLD'})
                  <input value={amount} onChange={handleAmountChange} className="mt-1 w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2" />
                </label>
                <label className="text-sm">Reference
                  <input value={reference} onChange={handleReferenceChange} placeholder="auto-generated" className="mt-1 w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2" />
                </label>
              </div>
            </div>

{/* Stepper UI */}
<div className="w-full mb-2">
  <div className="flex items-center justify-between text-xs text-zinc-400">
    <div className={`flex items-center gap-2 ${step === 'initiated' || step === 'pending' || step === 'confirmed' ? 'text-indigo-300' : ''}`}>1. Initiated</div>
    <div className={`flex items-center gap-2 ${step === 'pending' || step === 'confirmed' ? 'text-indigo-300' : ''}`}>2. Pending</div>
    <div className={`flex items-center gap-2 ${step === 'confirmed' ? 'text-emerald-400' : step === 'failed' ? 'text-rose-400' : ''}`}>3. Confirmed</div>
  </div>
  <div className="relative mt-2 h-2 rounded-full bg-zinc-800 overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: progressWidth }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className={`h-2 ${progressColor}`}
    />
  </div>
  <AnimatePresence>
    {step === 'confirmed' && (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="mt-2 text-emerald-400 text-sm font-medium">
        {t('confirmed')}
      </motion.div>
    )}
    {step === 'failed' && (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="mt-2 text-rose-400 text-sm">
        {t('not_confirmed')}
      </motion.div>
    )}
  </AnimatePresence>
</div>

            <div className="flex flex-wrap gap-2">
            {/* Polling UI */}
            {isPolling && (
              <div className="w-full mt-3">
                <p className="text-sm text-zinc-400">{t('polling')}</p>
                <div className="w-full bg-zinc-800 border border-zinc-700 rounded-full h-2 mt-2 overflow-hidden">
                  <div className="h-2 bg-indigo-500 transition-all" style={{ width: `${pollProgress}%` }} />
                </div>
              </div>
            )}
            {pollDone && (
              <div className="w-full mt-3">
                {pollSuccess ? (
                  <div className="text-emerald-400 font-medium">{t('confirmed')}</div>
                ) : (
                  <div className="text-rose-400">{t('not_confirmed')}</div>
                )}
              </div>
            )}
            
              <button disabled={busy} onClick={doVerify} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">{t('verify')}</button>
              <button disabled={busy} onClick={doWalletAuth} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50">{t('wallet_auth')}</button>
              <button disabled={busy} onClick={genReference} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">{t('gen_ref')}</button>
              <button disabled={busy} onClick={doPay} className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50">{t('pay_confirm')}</button>
            </div>

            <div className="grid gap-2">
              <div>
                <div className="text-xs opacity-80 mb-1">{t('logs')}</div>
                <pre className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 min-h-[80px] text-xs overflow-auto">{logsText}</pre>
              </div>
              <div>
                <div className="text-xs opacity-80 mb-1">{t('result')}</div>
                <pre className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 min-h-[80px] text-xs overflow-auto">{resultText}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

MiniKitPanel.displayName = 'MiniKitPanel';

export default MiniKitPanel;
