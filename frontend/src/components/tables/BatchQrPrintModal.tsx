'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Printer, QrCode } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

interface BatchTableQr {
  table_id: string;
  table_number: string;
  capacity?: number;
  floor?: string;
  qr_token: string;
  qr_url: string;
  qr_data_url: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function BatchQrPrintModal({ isOpen, onClose }: Props) {
  const { currentTenant } = useAuthStore();
  const [tables, setTables] = useState<BatchTableQr[] | null>(null);

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      api.get('/tables/qr-codes/batch')
        .then((res) => {
          if (!ignore) {
            setTables(res.data.tables || []);
          }
        })
        .catch((err) => {
          if (!ignore) {
            console.error('Failed to load batch QR codes:', err);
            toast.error('Failed to generate batch QR codes');
            setTables([]);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const loading = tables === null;
  const tableList = tables || [];

  const storeName = currentTenant?.business_name || 'Restro Dash';

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-specific style overrides */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #batch-qr-print-sheet, #batch-qr-print-sheet * {
            visibility: visible;
          }
          #batch-qr-print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0;
            margin: 0;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          .tent-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in print:p-0 print:bg-white print:static">
        <div className="bg-card border border-border w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
          {/* Header (hidden during print) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 print:hidden shrink-0">
            <div className="flex items-center gap-2">
              <QrCode size={20} className="text-foreground" />
              <div>
                <h3 className="font-bold text-base text-foreground">Print Table QR Tent Cards</h3>
                <p className="text-xs text-muted-foreground">
                  A4 layout (6 tent cards per page) with cutting guides
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrint}
                disabled={loading || tableList.length === 0}
                className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Printer size={15} />
                <span>Print All ({tableList.length} Cards)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
            {loading ? (
              <div className="py-20 text-center">
                <div className="h-8 w-8 border-3 border-neutral-900 dark:border-neutral-100 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">Generating QR codes for all tables...</p>
              </div>
            ) : tableList.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No active tables found to print.
              </div>
            ) : (
              <div
                id="batch-qr-print-sheet"
                className="grid grid-cols-2 gap-4 print:grid-cols-2 print:gap-3"
              >
                {tableList.map((t) => (
                  <div
                    key={t.table_id}
                    className="tent-card border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white text-neutral-900 rounded-xl p-5 flex flex-col items-center justify-between text-center relative print:border-neutral-400 print:text-black min-h-[290px]"
                  >
                    {/* Header */}
                    <div className="w-full border-b border-neutral-200 pb-2 mb-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                        {storeName}
                      </p>
                      <h4 className="text-xl font-extrabold tracking-tight mt-0.5">
                        TABLE {t.table_number}
                      </h4>
                      {t.floor && (
                        <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">
                          {t.floor}
                        </p>
                      )}
                    </div>

                    {/* QR Code */}
                    <div className="my-1 p-2 bg-white rounded-lg">
                      <img
                        src={t.qr_data_url}
                        alt={`QR Code Table ${t.table_number}`}
                        className="w-36 h-36 object-contain mx-auto"
                      />
                    </div>

                    {/* Footer instructions */}
                    <div className="w-full border-t border-neutral-200 pt-2 mt-1">
                      <p className="text-xs font-extrabold text-neutral-900">
                        SCAN TO VIEW MENU & ORDER
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        Camera scan &bull; No app download &bull; Instant kitchen prep
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
