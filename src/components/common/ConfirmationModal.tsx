import React from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  answeredCount?: number;
  unansweredCount?: number;
  flaggedCount?: number;
  remainingTimeFormatted?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isWarning?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  answeredCount,
  unansweredCount,
  flaggedCount,
  remainingTimeFormatted,
  confirmLabel = 'Ha, yakunlash',
  cancelLabel = 'Yo‘q, davom ettirish',
  isWarning = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isWarning ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {message && <p className="text-xs text-slate-600 leading-relaxed">{message}</p>}

          {/* Test Statistics Summary Box */}
          {(answeredCount !== undefined || unansweredCount !== undefined) && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              {answeredCount !== undefined && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">Belgilangan</p>
                    <p className="font-bold text-slate-800">{answeredCount} ta savol</p>
                  </div>
                </div>
              )}

              {unansweredCount !== undefined && (
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">Belgilanmagan</p>
                    <p className="font-bold text-slate-800">{unansweredCount} ta savol</p>
                  </div>
                </div>
              )}

              {flaggedCount !== undefined && flaggedCount > 0 && (
                <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-semibold">{flaggedCount} ta savol qayta ko‘rib chiqishga belgilangan.</span>
                </div>
              )}

              {remainingTimeFormatted && (
                <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Qolgan vaqt:
                  </span>
                  <span className="font-bold text-blue-600 font-mono">{remainingTimeFormatted}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-all ${
              isWarning
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
