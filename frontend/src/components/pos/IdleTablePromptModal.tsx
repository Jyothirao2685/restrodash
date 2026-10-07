'use client';

import { X, Clock, HelpCircle, CheckCircle2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IdleQrTable } from '@/hooks/useIdleQrTables';

interface Props {
  idleTables: IdleQrTable[];
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (tableId: string) => Promise<boolean>;
  onRelease: (tableId: string) => Promise<boolean>;
  loading: boolean;
}

export function IdleTablePromptModal({
  idleTables,
  isOpen,
  onClose,
  onSnooze,
  onRelease,
  loading,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-card rounded-2xl shadow-2xl border border-amber-300/40 dark:border-amber-700/40 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-500/10 border-b border-amber-200 dark:border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Dine-In Check-In Reminder
                <span className="text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">
                  {idleTables.length} {idleTables.length === 1 ? 'Table' : 'Tables'}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Guests scanned QR code &gt; 5 minutes ago but haven&apos;t ordered yet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {idleTables.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-foreground">All dining tables are active!</p>
              <p className="text-xs text-muted-foreground mt-1">No tables currently waiting for assistance.</p>
            </div>
          ) : (
            idleTables.map((table) => {
              const minutes = table.elapsed_minutes;
              return (
                <div
                  key={table.id}
                  className="rounded-xl border border-amber-200/80 dark:border-amber-800/40 bg-card p-4 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                        Table {table.number || table.name}
                      </span>
                      <h3 className="text-base font-bold text-foreground">
                        Browsing for {minutes} min{minutes !== 1 ? 's' : ''} without ordering
                      </h3>
                      {table.floor && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Location: {table.floor} {table.section ? `• ${table.section}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-semibold">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Check-In Needed
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
                    💡 <strong>Waiter tip:</strong> Approach Table {table.number || table.name} to see if guests have questions about the menu or prefer to order directly with you.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={async () => {
                        await onSnooze(table.id);
                        if (idleTables.length <= 1) onClose();
                      }}
                      className="border-amber-300 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium"
                    >
                      <Clock className="w-4 h-4 me-1.5" />
                      Still Deciding (+5m)
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={loading}
                      onClick={async () => {
                        await onRelease(table.id);
                        if (idleTables.length <= 1) onClose();
                      }}
                      className="font-medium bg-red-600 hover:bg-red-700"
                    >
                      <UserX className="w-4 h-4 me-1.5" />
                      Guests Left (Release)
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
          <Button variant="ghost" onClick={onClose} size="sm">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
