'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQrOrders, type QrPendingOrder } from '@/hooks/useQrOrders';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { parseDbTimestamp } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AUTO_ACCEPT_KEY = 'flo_qr_auto_accept_secs';

const HEADROOM_OPTIONS = [
  { label: '15s (Default)', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: 'Manual (No auto-accept)', value: 0 },
];

function playOrderChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Dual-tone restaurant bell chime (D5 -> A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.6);
  } catch {
    // Autoplay restrictions are ignored cleanly
  }
}

export default function IncomingQrOrdersBar() {
  const { pendingOrders, approveOrder, rejectOrder } = useQrOrders();
  const fmt = useFormatCurrency();

  const [autoAcceptSecs, setAutoAcceptSecs] = useState<number>(() => {
    if (typeof window === 'undefined') return 15;
    const saved = localStorage.getItem(AUTO_ACCEPT_KEY);
    if (!saved) return 15;
    const parsed = parseInt(saved, 10);
    if (isNaN(parsed) || (parsed > 0 && parsed < 15)) {
      localStorage.setItem(AUTO_ACCEPT_KEY, '15');
      return 15;
    }
    return parsed;
  });

  const [showConfig, setShowConfig] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const approvingIdsRef = useRef<Set<number>>(new Set());
  const chimedOrderIdsRef = useRef<Set<number>>(new Set());
  const firstSeenRef = useRef<Map<number, number>>(new Map());

  // Audio alert chime when new pending orders land
  useEffect(() => {
    let hasNew = false;
    for (const order of pendingOrders) {
      if (!chimedOrderIdsRef.current.has(order.id)) {
        chimedOrderIdsRef.current.add(order.id);
        hasNew = true;
      }
    }
    if (hasNew) {
      playOrderChime();
    }
  }, [pendingOrders]);

  // Tab title flash alert
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (pendingOrders.length === 0) {
      document.title = 'Restro Dash';
      return;
    }
    const interval = setInterval(() => {
      document.title = document.title.startsWith('🔔')
        ? `Restro Dash - Table ${pendingOrders[0].table?.number || ''}`
        : `🔔 (${pendingOrders.length}) NEW ORDER!`;
    }, 1000);

    return () => {
      clearInterval(interval);
      document.title = 'Restro Dash';
    };
  }, [pendingOrders]);

  const handleSetAutoAccept = (secs: number) => {
    setAutoAcceptSecs(secs);
    localStorage.setItem(AUTO_ACCEPT_KEY, String(secs));
    setShowConfig(false);
    toast.success(secs === 0 ? 'Auto-accept turned off (Manual mode)' : `Headroom set to ${secs} seconds`);
  };

  const handleApprove = useCallback(async (orderId: number) => {
    if (approvingId === orderId) return;
    setApprovingId(orderId);
    try {
      await approveOrder(orderId);
    } finally {
      setApprovingId(null);
    }
  }, [approveOrder, approvingId]);

  const handleReject = useCallback(async (orderId: number) => {
    if (rejectingId === orderId) return;
    setRejectingId(orderId);
    try {
      await rejectOrder(orderId, 'Cancelled by cashier during review');
    } finally {
      setRejectingId(null);
    }
  }, [rejectOrder, rejectingId]);

  // Timer ticker and auto-accept headroom check (runs inside setInterval callback)
  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);

      if (autoAcceptSecs > 0) {
        for (const order of pendingOrders) {
          if (!firstSeenRef.current.has(order.id)) {
            firstSeenRef.current.set(order.id, currentNow);
          }
          const firstSeenMs = firstSeenRef.current.get(order.id) || currentNow;
          const elapsed = Math.floor((currentNow - firstSeenMs) / 1000);
          if (elapsed >= autoAcceptSecs && !approvingIdsRef.current.has(order.id)) {
            approvingIdsRef.current.add(order.id);
            void handleApprove(order.id);
          }
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [autoAcceptSecs, pendingOrders, handleApprove]);

  if (pendingOrders.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-card border-b-2 border-foreground/30 text-foreground shrink-0 shadow-sm">
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-border bg-muted/60 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider uppercase text-foreground">
            Incoming Orders ({pendingOrders.length})
          </span>
          <span className="text-muted-foreground">· Review headroom before KOT dispatch</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="inline-flex items-center gap-1.5 px-2 py-1 border border-border bg-background text-foreground hover:bg-muted font-mono text-[11px] rounded-sm transition-colors"
            >
              <Settings2 size={12} />
              <span>Auto-Accept: {autoAcceptSecs > 0 ? `${autoAcceptSecs}s` : 'Manual'}</span>
            </button>

            {showConfig && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border shadow-md rounded-sm z-50 py-1 text-xs">
                <div className="px-2.5 py-1 text-[10px] uppercase font-mono text-muted-foreground border-b border-border">
                  Headroom Window
                </div>
                {HEADROOM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSetAutoAccept(opt.value)}
                    className={`w-full text-start px-2.5 py-1.5 font-mono text-xs hover:bg-muted flex items-center justify-between ${
                      autoAcceptSecs === opt.value ? 'font-bold text-foreground bg-muted/50' : 'text-muted-foreground'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {autoAcceptSecs === opt.value && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {pendingOrders.map((order: QrPendingOrder) => {
          const createdMs = parseDbTimestamp(order.created_at).getTime();
          const elapsedSecs = Math.max(0, Math.floor((now - createdMs) / 1000));
          const remainingSecs = autoAcceptSecs > 0 ? Math.max(0, autoAcceptSecs - elapsedSecs) : 0;
          const progressPercent = autoAcceptSecs > 0 ? (remainingSecs / autoAcceptSecs) * 100 : 0;
          const tableLabel = order.table?.number || order.table_id || 'Direct';
          const itemsSummary = (order.items || [])
            .map((item) => `${item.quantity}x ${item.product_name}`)
            .join(' · ');

          return (
            <div key={order.id} className="relative px-4 py-3 bg-card flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Progress indicator bar on bottom edge if auto-accept active */}
              {autoAcceptSecs > 0 && remainingSecs > 0 && (
                <div
                  className="absolute bottom-0 left-0 h-[2px] bg-foreground transition-all duration-500 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              )}

              {/* Order Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-bold uppercase px-1.5 py-0.5 border border-border bg-muted text-foreground rounded-sm">
                    Table {tableLabel}
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    #{order.order_number}
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {fmt(Number(order.total))}
                  </span>
                  {(order.qr_customer_name || order.customer_name) && (
                    <span className="text-xs text-muted-foreground">
                      ({order.qr_customer_name || order.customer_name}
                      {order.qr_customer_phone ? ` · ${order.qr_customer_phone}` : ''})
                    </span>
                  )}
                </div>

                <div className="mt-1 text-xs text-muted-foreground truncate font-mono">
                  {itemsSummary || 'No items listed'}
                </div>

                {order.special_instructions && (
                  <div className="mt-0.5 text-xs text-amber-700 dark:text-amber-300 font-mono italic truncate">
                    Note: &quot;{order.special_instructions}&quot;
                  </div>
                )}
              </div>

              {/* Headroom Status & Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {autoAcceptSecs > 0 && remainingSecs > 0 ? (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground px-2 py-1 border border-border/60 bg-muted/30 rounded-sm">
                    <Clock size={12} />
                    <span>Auto-accept in {remainingSecs}s</span>
                  </span>
                ) : autoAcceptSecs > 0 ? (
                  <span className="font-mono text-xs text-foreground px-2 py-1">
                    Accepting...
                  </span>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground px-2 py-1">
                    Manual Review
                  </span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReject(order.id)}
                  disabled={rejectingId === order.id || approvingId === order.id}
                  className="h-8 px-3 text-xs font-mono font-medium border-border text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm"
                  title="Reject and cancel this order"
                >
                  <X size={13} className="me-1" />
                  {rejectingId === order.id ? 'Cancelling...' : 'Cancel'}
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleApprove(order.id)}
                  disabled={approvingId === order.id || rejectingId === order.id}
                  className="h-8 px-3 text-xs font-mono font-bold bg-foreground text-background hover:bg-foreground/90 rounded-sm"
                  title="Accept order and print KOT ticket to kitchen"
                >
                  <Check size={13} className="me-1" />
                  {approvingId === order.id ? 'Sending...' : 'Accept → KOT'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
