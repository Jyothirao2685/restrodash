'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Printer, Copy, RotateCcw, QrCode as QrIcon, Check, ExternalLink } from 'lucide-react';
import type { Table } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

interface Props {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TableQrModal({ table, isOpen, onClose }: Props) {
  const { currentTenant } = useAuthStore();
  const [qrData, setQrData] = useState<{
    qr_token: string;
    qr_url: string;
    qr_data_url: string;
    table_number: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const loading = !qrData;

  useEffect(() => {
    let ignore = false;
    if (table && isOpen) {
      api.get(`/tables/${table.id}/qr-code`)
        .then((res) => {
          if (!ignore) {
            setQrData(res.data);
          }
        })
        .catch(() => {
          if (!ignore) {
            toast.error('Failed to load table QR code');
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [table, isOpen]);

  if (!isOpen || !table) return null;

  const handleCopyLink = () => {
    if (!qrData?.qr_url) return;
    navigator.clipboard.writeText(qrData.qr_url);
    setCopied(true);
    toast.success('Ordering link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!confirm('Are you sure you want to regenerate the QR code? Any previously printed QR cards for this table will stop working.')) {
      return;
    }
    setRegenerating(true);
    try {
      await api.post(`/tables/${table.id}/regenerate-qr`);
      toast.success('QR token regenerated successfully');
      const refreshed = await api.get(`/tables/${table.id}/qr-code`);
      setQrData(refreshed.data);
    } catch {
      toast.error('Failed to regenerate QR code');
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const storeName = currentTenant?.business_name || 'FloCafe';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 font-bold text-base text-foreground">
            <QrIcon size={18} className="text-orange-600" />
            <span>Table {table.name || table.id} QR Code</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          {loading ? (
            <div className="py-12">
              <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Generating QR Code...</p>
            </div>
          ) : qrData ? (
            <>
              {/* Printable Table Card Preview */}
              <div
                id="printable-table-qr-card"
                className="w-64 p-5 rounded-2xl border-2 border-dashed border-orange-300 dark:border-orange-800 bg-white text-neutral-900 shadow-md flex flex-col items-center"
              >
                <p className="text-xs font-black uppercase tracking-wider text-orange-600 mb-1">
                  {storeName}
                </p>
                <h3 className="text-xl font-black mb-3">
                  Table {table.name || table.id}
                </h3>

                {/* QR Image */}
                <div className="bg-white p-2 rounded-xl shadow-xs border border-neutral-100">
                  <img
                    src={qrData.qr_data_url}
                    alt={`QR Code for Table ${table.name}`}
                    className="w-44 h-44 object-contain"
                  />
                </div>

                <p className="text-xs font-extrabold mt-3 text-neutral-800">
                  Scan to View Menu & Order
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Zero apps &bull; Zero OTP &bull; Instant Kitchen Prep
                </p>
              </div>

              {/* Action buttons */}
              <div className="w-full mt-5 space-y-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Printer size={16} />
                  Print QR Tent Card
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2 bg-muted/50 hover:bg-muted border border-border rounded-xl font-semibold text-xs text-foreground transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>

                  <a
                    href={qrData.qr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-muted/50 hover:bg-muted border border-border rounded-xl font-semibold text-xs text-foreground transition-colors flex items-center justify-center"
                    title="Open Menu in New Tab"
                  >
                    <ExternalLink size={14} />
                  </a>

                  <button
                    type="button"
                    disabled={regenerating}
                    onClick={handleRegenerate}
                    className="px-3 py-2 bg-muted/50 hover:bg-muted border border-border rounded-xl font-semibold text-xs text-muted-foreground hover:text-red-600 transition-colors flex items-center justify-center"
                    title="Regenerate QR Token (Invalidates old code)"
                  >
                    <RotateCcw size={14} className={regenerating ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-red-500 py-6">Could not load QR code.</p>
          )}
        </div>
      </div>
    </div>
  );
}
