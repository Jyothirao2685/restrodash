'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export interface IdleQrTable {
  id: string;
  number: string;
  name?: string;
  capacity: number;
  status: string;
  floor: string | null;
  section: string | null;
  qr_token: string;
  active_session_key: string | null;
  qr_session_started_at: string | null;
  elapsed_seconds: number;
  elapsed_minutes: number;
}

export function playCheckInChime() {
  try {
    const AudioCtx = typeof window !== 'undefined'
      ? (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : null;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // A softer double-chime (E5 -> G5) to indicate a friendly waiter check-in reminder
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
    gain2.gain.setValueAtTime(0.2, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export function useIdleQrTables() {
  const [idleTables, setIdleTables] = useState<IdleQrTable[]>([]);
  const [loading, setLoading] = useState(false);
  const knownIdleIdsRef = useRef<Set<string>>(new Set());

  const fetchIdleTables = useCallback(async () => {
    try {
      const res = await api.get('/tables/idle-qr');
      const tables: IdleQrTable[] = res.data?.idle_tables || [];
      setIdleTables(tables);

      // Check for any newly idle tables to alert waiter
      let hasNew = false;
      const currentIds = new Set<string>();
      for (const t of tables) {
        currentIds.add(t.id);
        if (!knownIdleIdsRef.current.has(t.id)) {
          hasNew = true;
        }
      }
      knownIdleIdsRef.current = currentIds;

      if (hasNew) {
        playCheckInChime();
      }
    } catch {
      // Silently ignore poll errors
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    api.get('/tables/idle-qr')
      .then((res) => {
        if (!ignore) {
          const tables: IdleQrTable[] = res.data?.idle_tables || [];
          for (const t of tables) {
            knownIdleIdsRef.current.add(t.id);
          }
          setIdleTables(tables);
        }
      })
      .catch(() => {});

    const interval = setInterval(() => {
      fetchIdleTables();
    }, 10000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [fetchIdleTables]);

  const releaseTable = useCallback(async (tableId: string) => {
    setLoading(true);
    try {
      await api.post(`/tables/${tableId}/release-qr-session`);
      toast.success('Table released and session cleared');
      setIdleTables((prev) => prev.filter((t) => t.id !== tableId));
      knownIdleIdsRef.current.delete(tableId);
      return true;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(errorMsg || 'Failed to release table');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const snoozePrompt = useCallback(async (tableId: string) => {
    setLoading(true);
    try {
      await api.post(`/tables/${tableId}/snooze-qr-prompt`);
      toast.success('Check-in snoozed for 5 minutes');
      setIdleTables((prev) => prev.filter((t) => t.id !== tableId));
      knownIdleIdsRef.current.delete(tableId);
      return true;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(errorMsg || 'Failed to snooze reminder');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    idleTables,
    loading,
    releaseTable,
    snoozePrompt,
    refetch: fetchIdleTables,
  };
}
