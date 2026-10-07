'use client';

import { useState } from 'react';
import { X, Check, Utensils, Clock, User, AlertCircle, Ban } from 'lucide-react';
import type { QrPendingOrder } from '@/hooks/useQrOrders';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orders: QrPendingOrder[];
  onApprove: (orderId: number) => Promise<boolean>;
  onReject: (orderId: number, reason?: string) => Promise<boolean>;
}

export default function QrOrderApprovalModal({
  isOpen,
  onClose,
  orders,
  onApprove,
  onReject,
}: Props) {
  const currencyFmt = useFormatCurrency();
  const [processingId, setProcessingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      await onApprove(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt('Reason for rejection (optional):', 'Empty table / prank');
    if (reason === null) return; // User cancelled prompt
    setProcessingId(id);
    try {
      await onReject(id, reason || undefined);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card border border-border w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <h2 className="text-lg font-bold text-foreground">
              QR Dine-In Orders Pending Approval ({orders.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Utensils className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-base">No pending QR orders</p>
              <p className="text-sm">New orders scanned from table QR codes will appear here instantly.</p>
            </div>
          ) : (
            orders.map((order) => {
              const isWorking = processingId === order.id;
              const tableName = order.table?.number || order.table?.name || (order.table_id ? `Table #${order.table_id}` : 'Dine-In');

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 p-5 shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-sm font-bold bg-orange-500 text-white rounded-md">
                          {tableName}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          Order #{order.order_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {order.qr_customer_name && (
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <User size={13} /> {order.qr_customer_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-foreground">
                        {currencyFmt(order.total)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.items?.length || 0} item(s)
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-card rounded-lg border border-border/80 divide-y divide-border/60 mb-4 px-3 py-1">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-orange-600 dark:text-orange-400 min-w-[20px]">
                            {item.quantity}x
                          </span>
                          <div>
                            <span className="font-medium text-foreground">{item.product_name}</span>
                            {item.special_instructions && (
                              <p className="text-xs text-muted-foreground italic">
                                &ldquo;{item.special_instructions}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-muted-foreground font-medium text-xs">
                          {currencyFmt(item.total || item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 mb-4">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span><strong>Kitchen Note:</strong> {order.special_instructions}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => handleReject(order.id)}
                      className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Ban size={15} />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => handleApprove(order.id)}
                      className="px-5 py-2 text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check size={16} />
                      {isWorking ? 'Approving...' : 'Accept & Cook'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
