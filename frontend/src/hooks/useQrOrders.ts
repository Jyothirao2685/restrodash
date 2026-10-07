'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export interface QrPendingOrderItem {
  id?: number | string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  special_instructions?: string | null;
  addons?: { name: string; quantity?: number; price?: number }[];
}

export interface QrPendingOrder {
  id: number;
  order_number: string;
  table_id: string | null;
  table?: { number: string; name?: string } | null;
  customer_name?: string | null;
  qr_customer_name?: string | null;
  qr_customer_phone?: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  created_at: string;
  items: QrPendingOrderItem[];
  special_instructions?: string | null;
}

export function playRestaurantChime() {
  try {
    const AudioCtx = typeof window !== 'undefined'
      ? (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : null;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.65);
  } catch {
    // AudioContext might be restricted until user gesture
  }
}

export function useQrOrders() {
  const [pendingOrders, setPendingOrders] = useState<QrPendingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const knownIdsRef = useRef<Set<number>>(new Set());

  const fetchPendingOrders = useCallback(async (isSilent = true) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get('/orders?approval_status=pending_approval');
      const orders: QrPendingOrder[] = res.data?.orders || [];

      let hasNew = false;
      for (const ord of orders) {
        if (!knownIdsRef.current.has(ord.id)) {
          hasNew = true;
          knownIdsRef.current.add(ord.id);
        }
      }

      if (hasNew && knownIdsRef.current.size > 0) {
        playRestaurantChime();
      }

      setPendingOrders(orders);
    } catch {
      // Ignore polling errors silently
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Poll every 6 seconds as a rock-solid fallback
  useEffect(() => {
    let ignore = false;
    api.get('/orders?approval_status=pending_approval')
      .then((res) => {
        if (!ignore) {
          const orders: QrPendingOrder[] = res.data?.orders || [];
          for (const ord of orders) {
            knownIdsRef.current.add(ord.id);
          }
          setPendingOrders(orders);
        }
      })
      .catch(() => {});

    const interval = setInterval(() => {
      fetchPendingOrders(true);
    }, 6000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [fetchPendingOrders]);

  // WebSocket real-time subscription
  useEffect(() => {
    let ws: WebSocket | null = null;
    let timer: NodeJS.Timeout | null = null;

    function connectWs() {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        ws = new WebSocket(`${protocol}//${host}/kds`);

        ws.onopen = () => {
          try {
            const token = localStorage.getItem('flo_token') || sessionStorage.getItem('flo_token');
            if (token) {
              ws?.send(JSON.stringify({ type: 'auth', token }));
            }
          } catch {}
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'qr_order_pending_approval') {
              playRestaurantChime();
              toast(`🔔 New QR Dine-In Order! Table ${data.order?.table_number || ''} (Order #${data.order?.order_number || ''})`, {
                duration: 5000,
                style: {
                  background: '#ea580c',
                  color: '#ffffff',
                  fontWeight: '600',
                  borderRadius: '12px',
                },
              });
              fetchPendingOrders(true);
            } else if (data.type === 'qr_order_approved') {
              fetchPendingOrders(true);
            }
          } catch {}
        };

        ws.onclose = () => {
          timer = setTimeout(connectWs, 5000);
        };
      } catch {}
    }

    connectWs();
    return () => {
      if (timer) clearTimeout(timer);
      if (ws) ws.close();
    };
  }, [fetchPendingOrders]);

  const approveOrder = useCallback(async (orderId: number) => {
    try {
      await api.post(`/orders/${orderId}/qr-approve`);
      toast.success('Order approved & sent to kitchen!');
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      return true;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to approve order';
      toast.error(msg);
      return false;
    }
  }, []);

  const rejectOrder = useCallback(async (orderId: number, reason?: string) => {
    try {
      await api.post(`/orders/${orderId}/qr-reject`, { reason });
      toast.success('Order rejected and cancelled');
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      return true;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to reject order';
      toast.error(msg);
      return false;
    }
  }, []);

  return {
    pendingOrders,
    loading,
    refresh: fetchPendingOrders,
    approveOrder,
    rejectOrder,
  };
}
