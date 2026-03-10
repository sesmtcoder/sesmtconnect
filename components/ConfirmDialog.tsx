'use client';

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-900/20',
    warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20',
    info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'
  };

  const iconStyles = {
    danger: 'text-red-600 bg-red-50',
    warning: 'text-amber-600 bg-amber-50',
    info: 'text-blue-600 bg-blue-50'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${iconStyles[variant]}`}>
                <AlertTriangle className="h-8 w-8" />
              </div>
              
              <h3 className="font-serif mb-2 text-xl font-bold text-slate-900">{title}</h3>
              <p className="mb-8 text-sm text-slate-500">{message}</p>

              <div className="flex w-full gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] ${variantStyles[variant]}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
