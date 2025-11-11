import { STAKING_CONTRACT_NETWORK } from '@/lib/utils/constants';

let patched = false;

function toHexValue(v: any): string {
  if (v === undefined || v === null) return '0x0';
  if (typeof v === 'string') return v.startsWith('0x') ? v : ('0x' + BigInt(v).toString(16));
  try { return '0x' + BigInt(v).toString(16); } catch { return '0x0'; }
}

function normalizePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;

  // New format, ensure values normalized and network present
  if (Array.isArray(payload.actions)) {
    const network = payload.network || STAKING_CONTRACT_NETWORK || 'worldchain';
    const actions = payload.actions.map((a: any) => ({
      to: a?.to,
      value: toHexValue(a?.value ?? '0x0'),
      ...(a?.data && a?.data !== '0x' ? { data: a.data } : {}),
    }));
    // Return clean payload without any extra fields from original payload
    // This prevents formatPayload or other unwanted fields from being included
    return { network, actions };
  }

  // Legacy top-level { to, data, value }
  if ((payload as any).to || (payload as any).data || (payload as any).value) {
    const action: any = {
      to: (payload as any).to,
      value: toHexValue((payload as any).value ?? '0x0'),
    };
    if ((payload as any).data && (payload as any).data !== '0x') action.data = (payload as any).data;
    const network = (payload as any).network || STAKING_CONTRACT_NETWORK || 'worldchain';
    return { network, actions: [action] };
  }

  // Legacy { transaction: { to, data, value } }
  if (payload && typeof (payload as any).transaction === 'object') {
    const tx: any = (payload as any).transaction;
    const action: any = {
      to: tx?.to,
      value: toHexValue(tx?.value ?? '0x0'),
    };
    if (tx?.data && tx.data !== '0x') action.data = tx.data;
    const network = (payload as any).network || STAKING_CONTRACT_NETWORK || 'worldchain';
    return { network, actions: [action] };
  }

  // Legacy { transactions: [{ to, data, value }, ...] }
  if (Array.isArray((payload as any).transactions)) {
    const arr = (payload as any).transactions as any[];
    const actions = arr.map((tx: any) => ({
      to: tx?.to,
      value: toHexValue(tx?.value ?? '0x0'),
      ...(tx?.data && tx.data !== '0x' ? { data: tx.data } : {}),
    }));
    const network = (payload as any).network || STAKING_CONTRACT_NETWORK || 'worldchain';
    return { network, actions };
  }

  return payload;
}

export function applyMiniKitCompatShim() {
  if (typeof window === 'undefined') return;
  try {
    const mk: any = (window as any).MiniKit;
    if (!mk?.commandsAsync?.sendTransaction) return;
    if (patched) return;
    const original = mk.commandsAsync.sendTransaction.bind(mk.commandsAsync);
    mk.commandsAsync.sendTransaction = async function (payload: any) {
      const normalized = normalizePayload(payload);
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[MiniKit compat] sendTransaction normalized', {
            hadActions: Array.isArray(payload?.actions),
            hadTopLevel: !!(payload?.to || payload?.data || payload?.value),
            network: normalized?.network,
            actionsLen: Array.isArray(normalized?.actions) ? normalized.actions.length : undefined,
          });
        }
      } catch {}
      return await original(normalized);
    };
    patched = true;
    try { console.log('MiniKit sendTransaction compat shim active'); } catch {}
  } catch (e) {
    // no-op
  }
}
