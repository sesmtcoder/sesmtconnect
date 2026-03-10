'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />,
    error: <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />,
};

const styles = {
    success: 'border-emerald-200 bg-emerald-50',
    error: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50',
    info: 'border-blue-200 bg-blue-50',
};

interface ToastContainerProps {
    toasts: ToastMessage[];
    onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-80">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ${styles[toast.type]}`}
        >
            {icons[toast.type]}
            <p className="flex-1 text-sm font-medium text-slate-800">{toast.message}</p>
            <button
                onClick={() => onRemove(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </motion.div>
    );
}
